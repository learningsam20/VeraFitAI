import os
import json
from typing import Dict, Any, List, Optional, TypedDict
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, START, END
from backend.app.config import settings
from backend.app.models import User, DigitalMannequin, UserPreference, TryOnSession, GarmentItem
from backend.app.agents.history_agent import (
    build_purchase_history,
    purchase_history_analyzer_node,
)
from backend.app.agents.compatibility import scan_catalog_compatibility


# ------------------------------------------------------------------
# Recommendation workflow state
# ------------------------------------------------------------------

class RecommendationState(TypedDict):
    mode: str                        # "user" | "b2b"
    user_id: Optional[str]
    vendor_id: Optional[str]
    db: Any
    digest: Dict[str, Any]
    report: Dict[str, Any]


def _vendor_matches(sku: str, vendor_id: Optional[str]) -> bool:
    if not vendor_id:
        return True
    if vendor_id == "vendor_venice":
        return any(k in sku for k in ("SLK", "CRP", "CSH", "SAT", "SYN"))
    if vendor_id == "vendor_nordic":
        return any(k in sku for k in ("LNN", "COT", "WOL", "OVR", "SHP"))
    return True


def _pct(count: int, total: int) -> float:
    return round((count / total) * 100.0, 1) if total else 0.0


def _avg(values: List[float]) -> float:
    return round(sum(values) / len(values), 1) if values else 0.0


# ------------------------------------------------------------------
# Node 1: Deterministic profile/cohort aggregation
# ------------------------------------------------------------------

async def _load_user_profile(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == user_id)
    m_res = await db.execute(m_stmt)
    mannequin = m_res.scalar_one_or_none()

    p_stmt = select(UserPreference).where(UserPreference.user_id == user_id)
    p_res = await db.execute(p_stmt)
    pref = p_res.scalar_one_or_none()

    return {
        "colorSeason": mannequin.color_season if mannequin else "Cool Winter",
        "skinUndertone": mannequin.skin_undertone if mannequin else "Cool",
        "skinToneHex": mannequin.skin_tone_hex if mannequin else "#E8C39E",
        "bodyType": mannequin.body_type if mannequin else "Balanced",
        "concerns": dict(mannequin.detected_concerns or {}) if mannequin else {},
        "preferredFit": pref.preferred_fit if pref else "regular",
        "comfortVsStyleBias": pref.comfort_vs_style_bias if pref and pref.comfort_vs_style_bias is not None else 0.5,
        "allergies": list(pref.allergies or []) if pref else [],
    }


async def _aggregate_user(state: RecommendationState) -> Dict[str, Any]:
    db: AsyncSession = state["db"]
    user_id = state["user_id"]

    user_stmt = select(User).where(User.id == user_id)
    u_res = await db.execute(user_stmt)
    user = u_res.scalar_one_or_none()

    profile = await _load_user_profile(db, user_id)
    history = await build_purchase_history(db, user_id)

    analyzer = await purchase_history_analyzer_node({
        "purchase_history": history,
        "historical_bias": {},
        "skin_concerns": profile["concerns"],
        "color_season": profile["colorSeason"],
    })

    sessions = history.get("sessions") or []
    kept = [s for s in sessions if s.get("action") == "KEPT"]
    returned = [s for s in sessions if s.get("action") == "RETURNED"]
    total = len(sessions)

    catalog = await scan_catalog_compatibility(
        db,
        color_season=profile["colorSeason"],
        preferred_fit=profile["preferredFit"],
        allergies=profile["allergies"],
        concerns=profile["concerns"],
    )
    compatible = [c for c in catalog if c["verdict"] == "compatible"]
    excluded = [c for c in catalog if c["verdict"] == "excluded"]
    top_picks = sorted(compatible, key=lambda c: (c["colorScore"] + c["fabricScore"]) / 2.0, reverse=True)[:5]

    excluded_reasons: Dict[str, int] = {}
    for c in excluded:
        for r in c["reasons"]:
            key = r.split("(")[0].split(" —")[0][:60]
            excluded_reasons[key] = excluded_reasons.get(key, 0) + 1

    digest = {
        "mode": "user",
        "user": {
            "id": user_id,
            "name": user.name if user else user_id,
        },
        "profile": profile,
        "history": {
            "totalSessions": total,
            "keptCount": len(kept),
            "returnedCount": len(returned),
            "pendingCount": max(total - len(kept) - len(returned), 0),
            "keepRatePct": _pct(len(kept), total),
            "returnRatePct": _pct(len(returned), total),
            "avgKeepScore": _avg([float(s.get("keepScore") or 0.0) for s in sessions]),
            "avgFitScore": _avg([float(s.get("fitScore") or 0.0) for s in sessions]),
            "avgColorScore": _avg([float(s.get("colorScore") or 0.0) for s in sessions]),
            "avgFabricScore": _avg([float(s.get("fabricScore") or 0.0) for s in sessions]),
        },
        "learnings": analyzer.get("purchase_learnings", []),
        "recommendations": analyzer.get("purchase_recommendations", []),
        "historyDelta": analyzer.get("purchase_history_delta", 0.0),
        "catalog": {
            "compatibleCount": len(compatible),
            "excludedCount": len(excluded),
            "excludedReasons": excluded_reasons,
            "topPicks": [
                {
                    "sku": c["garment"].sku,
                    "name": c["garment"].name,
                    "colorScore": c["colorScore"],
                    "fabricScore": c["fabricScore"],
                    "styleScore": c["styleScore"],
                }
                for c in top_picks
            ],
        },
    }
    return {"digest": digest}


async def _aggregate_b2b(state: RecommendationState) -> Dict[str, Any]:
    db: AsyncSession = state["db"]
    vendor_id = state["vendor_id"]

    users_res = await db.execute(select(User))
    users = users_res.scalars().all()
    user_ids = [u.id for u in users]

    mannequins, prefs = [], []
    if user_ids:
        mannequins = (await db.execute(
            select(DigitalMannequin).where(DigitalMannequin.user_id.in_(user_ids))
        )).scalars().all()
        prefs = (await db.execute(
            select(UserPreference).where(UserPreference.user_id.in_(user_ids))
        )).scalars().all()

    sessions_res = await db.execute(
        select(TryOnSession).options(selectinload(TryOnSession.feedback))
    )
    sessions = [s for s in sessions_res.scalars().all() if _vendor_matches(s.garment_sku, vendor_id)]

    # Cohort profile distribution
    season_counts: Dict[str, int] = {}
    allergy_counts: Dict[str, int] = {}
    fit_counts: Dict[str, int] = {}
    concern_sums: Dict[str, float] = {}
    concern_counts: Dict[str, int] = {}
    for m in mannequins:
        season_counts[m.color_season or "Unspecified"] = season_counts.get(m.color_season or "Unspecified", 0) + 1
        concerns = m.detected_concerns or {}
        if isinstance(concerns, dict):
            for k, v in concerns.items():
                if isinstance(v, (int, float)):
                    concern_sums[k] = concern_sums.get(k, 0.0) + float(v)
                    concern_counts[k] = concern_counts.get(k, 0) + 1
    for p in prefs:
        fit_counts[p.preferred_fit or "regular"] = fit_counts.get(p.preferred_fit or "regular", 0) + 1
        for a in (p.allergies or []):
            if isinstance(a, str):
                allergy_counts[a.lower()] = allergy_counts.get(a.lower(), 0) + 1

    # Cohort behavior + agent score averages
    kept = [s for s in sessions if s.feedback and s.feedback.action_taken == "KEPT"]
    returned = [s for s in sessions if s.feedback and s.feedback.action_taken == "RETURNED"]
    total = len(sessions)

    reason_counts: Dict[str, int] = {}
    for s in returned:
        reason = s.feedback.return_reason or "UNSPECIFIED"
        reason_counts[reason] = reason_counts.get(reason, 0) + 1

    sku_stats: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        st = sku_stats.setdefault(s.garment_sku, {"sku": s.garment_sku, "sessions": 0, "kept": 0, "returned": 0, "score_sum": 0.0})
        st["sessions"] += 1
        st["score_sum"] += s.keep_probability_score or 0.0
        if s.feedback and s.feedback.action_taken == "KEPT":
            st["kept"] += 1
        elif s.feedback and s.feedback.action_taken == "RETURNED":
            st["returned"] += 1

    skus = set(s.garment_sku for s in sessions)
    sku_meta = {}
    if skus:
        g_res = await db.execute(select(GarmentItem).where(GarmentItem.sku.in_(skus)))
        for g in g_res.scalars().all():
            sku_meta[g.sku] = {"name": g.name, "price": g.price or 0.0}

    top_skus = sorted(
        [
            {
                "sku": st["sku"],
                "name": sku_meta.get(st["sku"], {}).get("name", st["sku"]),
                "sessions": st["sessions"],
                "kept": st["kept"],
                "returned": st["returned"],
                "returnRatePct": _pct(st["returned"], st["sessions"]),
                "avgKeepScore": round(st["score_sum"] / st["sessions"], 1) if st["sessions"] else 0.0,
            }
            for st in sku_stats.values()
        ],
        key=lambda r: -r["sessions"],
    )[:10]

    # Reuse the purchase-history analyzer over the aggregated cohort sessions
    aggregate_history = {
        "user_id": "cohort",
        "total_sessions": total,
        "sessions": [
            {
                "sku": s.garment_sku,
                "name": s.garment_name,
                "materials": dict(s.garment_material or {}),
                "colorHex": s.garment_color_hex,
                "fitScore": s.fit_repeatability_score,
                "colorScore": s.color_harmony_score,
                "fabricScore": s.fabric_safety_score,
                "keepScore": s.keep_probability_score,
                "verdict": s.verdict,
                "action": s.feedback.action_taken if s.feedback else None,
                "returnReason": s.feedback.return_reason if s.feedback else None,
            }
            for s in sessions
        ],
    }
    analyzer = await purchase_history_analyzer_node({
        "purchase_history": aggregate_history,
        "historical_bias": {},
        "skin_concerns": {k: round(v / max(concern_counts[k], 1), 1) for k, v in concern_sums.items()},
        "color_season": max(season_counts, key=season_counts.get) if season_counts else "Cool Winter",
    })

    dominant_fit = max(fit_counts, key=fit_counts.get) if fit_counts else "regular"
    catalog = await scan_catalog_compatibility(
        db,
        color_season=max(season_counts, key=season_counts.get) if season_counts else "Cool Winter",
        preferred_fit=dominant_fit,
        allergies=[a for a, _ in sorted(allergy_counts.items(), key=lambda kv: -kv[1])][:3],
        concerns={k: round(v / max(concern_counts[k], 1), 1) for k, v in concern_sums.items()},
    )
    compatible = [c for c in catalog if c["verdict"] == "compatible"]

    digest = {
        "mode": "b2b",
        "merchant": {
            "vendorId": vendor_id or "all_vendors",
            "totalUsers": len(user_ids),
        },
        "cohort": {
            "totalSessions": total,
            "keptCount": len(kept),
            "returnedCount": len(returned),
            "returnRatePct": _pct(len(returned), total),
            "avgKeepScore": round(sum(s.keep_probability_score or 0.0 for s in sessions) / max(total, 1), 1),
            "avgFitScore": round(sum(s.fit_repeatability_score or 0.0 for s in sessions) / max(total, 1), 1),
            "avgColorScore": round(sum(s.color_harmony_score or 0.0 for s in sessions) / max(total, 1), 1),
            "avgFabricScore": round(sum(s.fabric_safety_score or 0.0 for s in sessions) / max(total, 1), 1),
            "seasonDistribution": season_counts,
            "fitPreferenceDistribution": fit_counts,
            "allergyPrevalence": allergy_counts,
            "avgConcerns": {k: round(v / max(concern_counts[k], 1), 1) for k, v in concern_sums.items()},
            "returnReasons": reason_counts,
            "topSkus": top_skus,
            "catalogCompatibleSkus": len(compatible),
            "catalogTotalSkus": len(catalog),
        },
        "learnings": analyzer.get("purchase_learnings", []),
        "recommendations": analyzer.get("purchase_recommendations", []),
        "historyDelta": analyzer.get("purchase_history_delta", 0.0),
    }
    return {"digest": digest}


async def aggregate_profile_node(state: RecommendationState) -> Dict[str, Any]:
    if state.get("mode") == "b2b":
        return await _aggregate_b2b(state)
    return await _aggregate_user(state)


# ------------------------------------------------------------------
# Node 2: AI recommendation + comprehensive report
# ------------------------------------------------------------------

def _has_llm_provider() -> bool:
    return bool(
        settings.OPENAI_API_KEY
        or settings.ANTHROPIC_API_KEY
        or settings.GEMINI_API_KEY
        or settings.GROQ_API_KEY
        or settings.OPENROUTER_API_KEY
        or "ollama" in settings.LLM_MODEL.lower()
    )


def _forward_env_keys() -> None:
    if settings.OPENAI_API_KEY:
        os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
    if settings.ANTHROPIC_API_KEY:
        os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
    if settings.GEMINI_API_KEY:
        os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
    if settings.GROQ_API_KEY:
        os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY
    if settings.OPENROUTER_API_KEY:
        os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY


def _compact_digest(digest: Dict[str, Any]) -> Dict[str, Any]:
    """Keeps only the key figures so the reasoning model can finish within budget."""
    if digest.get("mode") == "b2b":
        cohort = digest.get("cohort", {})
        return {
            "mode": "b2b",
            "merchant": digest.get("merchant"),
            "cohort": {
                "totalSessions": cohort.get("totalSessions"),
                "keptCount": cohort.get("keptCount"),
                "returnedCount": cohort.get("returnedCount"),
                "returnRatePct": cohort.get("returnRatePct"),
                "avgKeepScore": cohort.get("avgKeepScore"),
                "avgFitScore": cohort.get("avgFitScore"),
                "avgColorScore": cohort.get("avgColorScore"),
                "avgFabricScore": cohort.get("avgFabricScore"),
                "seasonDistribution": cohort.get("seasonDistribution"),
                "fitPreferenceDistribution": cohort.get("fitPreferenceDistribution"),
                "allergyPrevalence": cohort.get("allergyPrevalence"),
                "avgConcerns": cohort.get("avgConcerns"),
                "returnReasons": dict(list((cohort.get("returnReasons") or {}).items())[:4]),
                "topSkus": (cohort.get("topSkus") or [])[:5],
            },
            "learnings": [{"signal": l.get("signal", "")} for l in digest.get("learnings", [])][:5],
            "recommendations": [{"title": r.get("title", "")} for r in digest.get("recommendations", [])][:4],
        }
    profile = digest.get("profile", {})
    history = digest.get("history", {})
    return {
        "mode": "user",
        "profile": {
            "colorSeason": profile.get("colorSeason"),
            "skinUndertone": profile.get("skinUndertone"),
            "bodyType": profile.get("bodyType"),
            "concerns": profile.get("concerns"),
            "preferredFit": profile.get("preferredFit"),
            "comfortVsStyleBias": profile.get("comfortVsStyleBias"),
            "allergies": profile.get("allergies"),
        },
        "history": history,
        "learnings": digest.get("learnings", [])[:8],
        "recommendations": digest.get("recommendations", [])[:5],
        "catalog": digest.get("catalog", {}),
    }


def _extract_json_block(text: str) -> Optional[Dict[str, Any]]:
    """Robustly pulls the first balanced top-level JSON object out of a model reply."""
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].lstrip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass
    start = cleaned.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(cleaned)):
            ch = cleaned[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = cleaned[start:i + 1]
                    try:
                        parsed = json.loads(candidate)
                        return parsed if isinstance(parsed, dict) else None
                    except json.JSONDecodeError:
                        break
        start = cleaned.find("{", start + 1)
    return None


async def _call_report_llm(mode: str, digest: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Calls the configured LLM and parses a JSON report. Returns None on any failure."""
    if not _has_llm_provider():
        return None
    if mode == "user":
        system = (
            "You are VeraFit's AI fashion concierge. Given the deterministic agent digest below, "
            "produce a STRICT JSON object with exactly these keys: "
            "summary (string, 2-3 sentence comprehensive profile report), "
            "profileInsights (array of strings), "
            "recommendations (array of objects {title, detail, priority (high|medium|low), action, skus (array)}), "
            "catalogAdvice (string). No markdown, no prose outside the JSON."
        )
    else:
        system = (
            "You are VeraFit's B2B merchant intelligence strategist. Given the aggregated cohort digest "
            "below (computed by deterministic agents over the merchant's users), produce a STRICT JSON "
            "object with exactly these keys: "
            "summary (string, 2-3 sentence fleet-level report), "
            "insights (array of strings), "
            "recommendations (array of objects {title, detail, priority (high|medium|low), action, skus (array)}), "
            "inventoryAdvice (string). No markdown, no prose outside the JSON."
        )
    try:
        import litellm
        _forward_env_keys()
        kwargs: Dict[str, Any] = {
            "model": settings.LLM_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(_compact_digest(digest))},
            ],
            "temperature": 0.2,
            "max_tokens": 4000,
            # Hard wall-clock bound: the local 30B reasoning model can run away
            # into long thinking chains; if it can't finish in time we fall back
            # to the instant deterministic report.
            "timeout": 300,
        }
        if "ollama" in settings.LLM_MODEL.lower():
            kwargs["api_base"] = settings.OLLAMA_API_BASE
            # muse-glimmer is a reasoning model: it fills a thinking block first,
            # so give it room to finish and emit the final JSON answer.
            kwargs["num_ctx"] = 8192
        response = await litellm.acompletion(**kwargs)
        message = response.choices[0].message
        content = (message.content or "").strip()
        # Reasoning models may emit only a thinking block; look for JSON inside it.
        if not content and getattr(message, "thinking", None):
            content = message.thinking or ""
        parsed = _extract_json_block(content)
        return parsed
    except Exception as e:
        print(f"[RecommendationAgent] LLM call failed: {e}. Falling back to deterministic report.")
        return None


def _build_user_report(digest: Dict[str, Any]) -> Dict[str, Any]:
    profile = digest["profile"]
    history = digest["history"]
    learnings = digest.get("learnings", [])
    recommendations = digest.get("recommendations", [])
    catalog = digest.get("catalog", {})

    summary = (
        f"{profile['colorSeason']} profile ({profile['skinUndertone']} undertone, "
        f"skin {profile['skinToneHex']}), {profile['preferredFit']}-fit preference with a "
        f"{profile['comfortVsStyleBias']:.2f} comfort-vs-style bias. History spans "
        f"{history['totalSessions']} try-ons at a {history['keepRatePct']}% keep rate "
        f"(avg keep score {history['avgKeepScore']}%). "
    )
    if catalog.get("excludedCount"):
        summary += (
            f"{catalog['excludedCount']} of {catalog['compatibleCount'] + catalog['excludedCount']} "
            f"catalog garments are filtered out for color/style/fabric incompatibility, "
            f"leaving {catalog['compatibleCount']} compatible options."
        )
    else:
        summary += "All catalog garments are compatible with your profile."

    profile_insights = [
        f"{profile['colorSeason']} — {profile['skinUndertone']} undertones favor "
        f"their seasonal palette for the strongest chromatic harmony."
    ]
    if profile["allergies"]:
        profile_insights.append(
            f"Allergen guard active for: {', '.join(profile['allergies'])} — matching fabrics are hard-excluded."
        )
    if float(profile["concerns"].get("rosacea", 0.0)) > 25.0:
        profile_insights.append("Elevated rosacea index: low-friction, breathable natural fibers are prioritized.")
    profile_insights.extend(l.get("signal", "") for l in learnings[:3])

    recs = [
        {
            "title": r.get("title", "Recommendation"),
            "detail": r.get("detail", ""),
            "priority": "high" if r.get("action") in ("avoid_fiber", "hypoallergenic_filter") else "medium",
            "action": r.get("action"),
            "skus": [],
        }
        for r in recommendations
    ]
    for pick in catalog.get("topPicks", []):
        recs.append({
            "title": f"Top pick: {pick['name']}",
            "detail": f"{pick['sku']} — color {pick['colorScore']}/100, fabric {pick['fabricScore']}/100.",
            "priority": "high",
            "action": "catalog_pick",
            "skus": [pick["sku"]],
        })

    catalog_advice = (
        f"Shop from {catalog['compatibleCount']} compatible catalog options. "
        f"Most common exclusions: "
        + ("; ".join(f"{k} ({v})" for k, v in list(catalog.get("excludedReasons", {}).items())[:3]))
        if catalog.get("excludedReasons")
        else "Full catalog available."
    )

    return {
        "llmGenerated": False,
        "summary": summary,
        "profileInsights": profile_insights,
        "recommendations": recs,
        "catalogAdvice": catalog_advice,
        "agentDigest": digest,
    }


def _build_b2b_report(digest: Dict[str, Any]) -> Dict[str, Any]:
    cohort = digest["cohort"]
    learnings = digest.get("learnings", [])
    recommendations = digest.get("recommendations", [])

    top = cohort.get("topSkus", [])
    risky = [t for t in top if t.get("returnRatePct", 0.0) >= 40.0][:3]

    summary = (
        f"{cohort['totalSessions']} sessions across {digest['merchant']['totalUsers']} users "
        f"at a {cohort['returnRatePct']}% return rate (avg keep score {cohort['avgKeepScore']}%). "
        f"Fleet agent averages — fit {cohort['avgFitScore']}%, color {cohort['avgColorScore']}%, "
        f"fabric {cohort['avgFabricScore']}%."
    )

    insights = [l.get("signal", "") for l in learnings[:4]]
    if cohort.get("allergyPrevalence"):
        top_allergy = max(cohort["allergyPrevalence"], key=cohort["allergyPrevalence"].get)
        insights.append(
            f"Leading allergen in cohort: {top_allergy} ({cohort['allergyPrevalence'][top_allergy]} shoppers)."
        )
    if risky:
        insights.append(
            f"High-return SKUs need attention: {', '.join(f'{t['name']} ({t['returnRatePct']}%)' for t in risky)}."
        )

    recs = [
        {
            "title": r.get("title", "Recommendation"),
            "detail": r.get("detail", ""),
            "priority": "high",
            "action": r.get("action"),
            "skus": [],
        }
        for r in recommendations[:5]
    ]
    for t in risky:
        recs.append({
            "title": f"De-stock / remarket {t['name']}",
            "detail": f"{t['sku']} returns at {t['returnRatePct']}% — apply clearance or fabric reformulation review.",
            "priority": "high",
            "action": "de_stock",
            "skus": [t["sku"]],
        })

    inventory_advice = (
        f"Prioritize SKUs with return rates below 40% and fabric safety above 80. "
        f"{cohort['catalogCompatibleSkus']} of {cohort['catalogTotalSkus']} catalog garments align "
        f"with the cohort's dominant profile."
    )

    return {
        "llmGenerated": False,
        "summary": summary,
        "insights": insights,
        "recommendations": recs,
        "inventoryAdvice": inventory_advice,
        "agentDigest": digest,
    }


async def ai_recommendation_node(state: RecommendationState) -> Dict[str, Any]:
    digest = state["digest"]
    mode = state["mode"]

    llm_report = await _call_report_llm(mode, digest)
    if llm_report:
        base = {
            "llmGenerated": True,
            "agentDigest": digest,
        }
        base.update(llm_report)
        report = base
    else:
        report = _build_user_report(digest) if mode == "user" else _build_b2b_report(digest)

    return {"report": report}


# ------------------------------------------------------------------
# Workflow assembly
# ------------------------------------------------------------------

def build_recommendation_graph():
    builder = StateGraph(RecommendationState)
    builder.add_node("aggregate_profile", aggregate_profile_node)
    builder.add_node("ai_recommendation", ai_recommendation_node)
    builder.add_edge(START, "aggregate_profile")
    builder.add_edge("aggregate_profile", "ai_recommendation")
    builder.add_edge("ai_recommendation", END)
    return builder.compile()


recommendation_workflow = build_recommendation_graph()


async def run_recommendation_workflow(
    db: AsyncSession,
    user_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Runs the recommendation LangGraph for a shopper (user_id) or a B2B merchant cohort (vendor_id)."""
    mode = "b2b" if not user_id else "user"
    final_state = await recommendation_workflow.ainvoke({
        "mode": mode,
        "user_id": user_id,
        "vendor_id": vendor_id,
        "db": db,
        "digest": {},
        "report": {},
    })
    report = final_state.get("report", {})
    report["status"] = "success"
    if mode == "user":
        report["userId"] = user_id
        report["vendorId"] = None
    else:
        report["vendorId"] = vendor_id or "all_vendors"
        report["userId"] = None
    return report
