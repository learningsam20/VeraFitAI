from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.agents.state import GraphState
from backend.app.models import TryOnSession

# ---------------------------------------------------------------
# Aggregate builder (shared by the /analyze workflow and /insights)
# ---------------------------------------------------------------

async def build_purchase_history(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Loads the user's try-on/purchase sessions with feedback into an aggregate."""
    stmt = (
        select(TryOnSession)
        .options(selectinload(TryOnSession.feedback))
        .where(TryOnSession.user_id == user_id)
        .order_by(TryOnSession.created_at.desc())
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    session_rows = []
    for s in sessions:
        session_rows.append({
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
        })

    return {
        "user_id": user_id,
        "total_sessions": len(session_rows),
        "sessions": session_rows,
    }


# ---------------------------------------------------------------
# Fiber family normalizer (e.g. "merino_wool" -> "wool")
# ---------------------------------------------------------------

def _fiber_family(material_key: str) -> str:
    key = material_key.strip().lower().replace(" ", "_")
    tokens = [t for t in key.split("_") if t]
    return tokens[-1] if tokens else key


# ---------------------------------------------------------------
# LangGraph Agent Node
# ---------------------------------------------------------------

async def purchase_history_analyzer_node(state: GraphState) -> Dict[str, Any]:
    """
    Analyzes the user's purchase history and preference signals to surface
    evidence-backed learnings and recommendations, and returns a bounded
    score delta applied at synthesis time.

    Signals mined (deterministic, explainable):
    - Keep/return behavior ratios and average keep probability.
    - Fiber family affinities (kept vs returned + return reasons).
    - Fit learnings from FIT_TOO_TIGHT returns.
    - Color learnings from COLOR_UNFLATTERING returns vs high-harmony keeps.
    - Skin-sensitivity cross-audit from fabric safety averages + concerns.
    """
    history = state.get("purchase_history") or {}
    sessions: List[Dict[str, Any]] = history.get("sessions") or []
    preferences = state.get("historical_bias") or {}
    skin_concerns = state.get("skin_concerns") or {}
    color_season = state.get("color_season") or "Cool Winter"

    learnings: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

    total = len(sessions)
    kept = [s for s in sessions if s.get("action") == "KEPT"]
    returned = [s for s in sessions if s.get("action") == "RETURNED"]
    acted = len(kept) + len(returned)

    avg_keep = round(
        sum(float(s.get("keepScore") or 0.0) for s in sessions) / max(total, 1), 1
    )

    if total == 0:
        recommendations.append({
            "title": "Build your taste profile",
            "detail": "No try-on history yet. Run a few keep-probability analyses so the purchase-history analyzer can calibrate your fabric, fit, and color affinities.",
            "action": "analyze_first",
        })
        return {
            "purchase_learnings": learnings,
            "purchase_recommendations": recommendations,
            "purchase_history_delta": 0.0,
        }

    # ---- Behavior signals -------------------------------------
    keep_rate = round((len(kept) / max(total, 1)) * 100.0, 1)
    return_rate = round((len(returned) / max(total, 1)) * 100.0, 1)
    learnings.append({
        "category": "behavior",
        "signal": f"{keep_rate}% keep rate across {total} try-ons",
        "insight": (
            f"You have kept {len(kept)} and returned {len(returned)} items. "
            f"Average keep probability is {avg_keep}%."
        ),
        "evidence": f"{len(kept)} KEPT / {len(returned)} RETURNED / {max(total - acted, 0)} pending",
        "impact": round(min(6.0, (len(kept) - len(returned)) * 0.8), 1),
    })

    # ---- Fiber affinities -------------------------------------
    fiber_stats: Dict[str, Dict[str, Any]] = {}
    for s in sessions:
        for mat_key, pct in (s.get("materials") or {}).items():
            fam = _fiber_family(mat_key)
            st = fiber_stats.setdefault(fam, {
                "kept": 0, "returned": 0, "total": 0,
                "keep_scores": [], "fabric_scores": [], "reasons": {},
            })
            st["total"] += 1
            st["keep_scores"].append(float(s.get("keepScore") or 0.0))
            st["fabric_scores"].append(float(s.get("fabricScore") or 0.0))
            if s.get("action") == "KEPT":
                st["kept"] += 1
            elif s.get("action") == "RETURNED":
                st["returned"] += 1
                reason = s.get("returnReason") or "OTHER"
                st["reasons"][reason] = st["reasons"].get(reason, 0) + 1

    safe_fibers = []
    risky_fibers = []
    for fam, st in fiber_stats.items():
        avg_fabric = round(sum(st["fabric_scores"]) / max(st["total"], 1), 1)
        if st["returned"] > 0 and st["reasons"].get("FABRIC_ITCHY", 0) > 0:
            risky_fibers.append((fam, st, avg_fabric))
        elif st["kept"] > 0 and st["kept"] >= st["returned"] and avg_fabric >= 80.0:
            safe_fibers.append((fam, st, avg_fabric))

    if risky_fibers:
        worst = max(risky_fibers, key=lambda x: x[1]["reasons"].get("FABRIC_ITCHY", 0))
        fam, st, avg_fabric = worst
        learnings.append({
            "category": "fabric",
            "signal": f"{fam} triggers sensory irritation",
            "insight": (
                f"{fam.upper()} items were returned for fabric/sensory irritation "
                f"({st['reasons'].get('FABRIC_ITCHY', 0)} return(s), avg fabric safety {avg_fabric}%). "
                f"Likely tied to your skin sensitivity index of {skin_concerns.get('sensitivity', 'n/a')}."
            ),
            "evidence": f"FIBER: {fam} — avg fabric safety {avg_fabric}%",
            "impact": -6.0,
        })
        recommendations.append({
            "title": f"Avoid {fam} — switch to low-friction fibers",
            "detail": (
                f"Prioritize silk, organic cotton, or pure linen over {fam} to avoid "
                f"sensory irritation, especially for close-to-skin silhouettes."
            ),
            "action": "avoid_fiber",
        })

    if safe_fibers:
        best = max(safe_fibers, key=lambda x: x[1]["kept"])
        fam, st, avg_fabric = best
        learnings.append({
            "category": "fabric",
            "signal": f"{fam} is your high-affinity fiber",
            "insight": (
                f"You kept {st['kept']} item(s) in {fam} with an average fabric safety "
                f"of {avg_fabric}% — a strong comfort signature to lean into."
            ),
            "evidence": f"FIBER: {fam} — {st['kept']} kept / {st['returned']} returned",
            "impact": 4.0,
        })

    # ---- Fit learnings ----------------------------------------
    fit_returns = [s for s in returned if s.get("returnReason") == "FIT_TOO_TIGHT"]
    if fit_returns:
        learnings.append({
            "category": "fit",
            "signal": "Structured fits read too restrictive",
            "insight": (
                f"{len(fit_returns)} item(s) came back for fit tightness. "
                f"Prefer relaxed, regular, or oversized silhouettes for future purchases."
            ),
            "evidence": f"{len(fit_returns)} × FIT_TOO_TIGHT return",
            "impact": -3.0,
        })
        recommendations.append({
            "title": "Choose relaxed or regular fits",
            "detail": "Your history shows sensitivity to tight tailoring. Opt for relaxed cuts and breathable drapes to raise fit repeatability.",
            "action": "fit_preference",
        })

    # ---- Color learnings --------------------------------------
    color_returns = [s for s in returned if s.get("returnReason") == "COLOR_UNFLATTERING"]
    high_harmony_keeps = [s for s in kept if (s.get("colorScore") or 0.0) >= 80.0]
    if color_returns:
        learnings.append({
            "category": "color",
            "signal": "Off-palette tones cause color returns",
            "insight": (
                f"{len(color_returns)} item(s) returned as COLOR_UNFLATTERING. "
                f"Your calibrated season is {color_season} — stick to its harmonious "
                f"swatches to avoid chrominance clash."
            ),
            "evidence": f"{len(color_returns)} × COLOR_UNFLATTERING — season: {color_season}",
            "impact": -3.0,
        })
        recommendations.append({
            "title": f"Shop the {color_season} palette",
            "detail": "Filter catalog color suggestions against your season palette to maximize color-harmony keep rates.",
            "action": "season_filter",
        })
    elif high_harmony_keeps:
        learnings.append({
            "category": "color",
            "signal": f"{color_season} tones validate well",
            "insight": (
                f"{len(high_harmony_keeps)} kept item(s) scored 80%+ color harmony — "
                f"your {color_season} classification is a reliable buying filter."
            ),
            "evidence": f"{len(high_harmony_keeps)} keeps ≥80% harmony",
            "impact": 3.0,
        })

    # ---- Sensitivity cross-audit --------------------------------
    sensitivity = float(skin_concerns.get("sensitivity") or 0.0)
    fabric_warn_count = preferences.get("FABRIC_ITCHY_count", 0)
    if sensitivity >= 55.0 or fabric_warn_count > 0:
        learnings.append({
            "category": "behavior",
            "signal": "Elevated skin-sensitivity profile",
            "insight": (
                f"Sensitivity index {sensitivity}/100 with {fabric_warn_count} fabric-itch "
                f"signal(s). Favor hypoallergenic, low-friction natural fibers and "
                f"seamless construction."
            ),
            "evidence": f"sensitivity={sensitivity} · FABRIC_ITCHY_count={fabric_warn_count}",
            "impact": -2.0,
        })
        recommendations.append({
            "title": "Prioritize hypoallergenic fabrics",
            "detail": "Add silk, organic cotton, or linen filtering to your defaults given your sensitivity profile.",
            "action": "hypoallergenic_filter",
        })

    # ---- Bounded delta for synthesis ----------------------------
    delta = 0.0
    for l in learnings:
        delta += float(l.get("impact") or 0.0)
    # Reward strong affinity / penalize returns modestly
    delta += (len(kept) - len(returned)) * 0.5
    delta = round(max(-6.0, min(6.0, delta)), 1)

    if not recommendations:
        recommendations.append({
            "title": "Keep leaning into your proven matches",
            "detail": "Your history shows stable, high-compatibility purchases. Maintain the current fabric, fit, and palette direction.",
            "action": "maintain",
        })

    return {
        "purchase_learnings": learnings,
        "purchase_recommendations": recommendations,
        "purchase_history_delta": delta,
    }
