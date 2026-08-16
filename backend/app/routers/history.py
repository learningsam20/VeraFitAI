from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import TryOnSession, FeedbackLog, GarmentItem
from backend.app.config import settings
from backend.app.schemas import (
    HistoryItemResponse,
    MerchantAnalyticsResponse,
    ReasonDistribution,
    SkuReturnRisk,
)

router = APIRouter(prefix="/history", tags=["History"])

@router.get("", response_model=List[HistoryItemResponse])
async def get_user_history(
    userId: Optional[str] = Query(None, description="Filter strictly to current user. If omitted or 'all' (admin mode), returns all sessions."),
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches past try-on sessions, calculated scores, and feedback logs.
    Strictly filters by userId for end-user shoppers.
    """
    stmt = (
        select(TryOnSession)
        .options(selectinload(TryOnSession.feedback))
        .order_by(desc(TryOnSession.created_at))
        .limit(limit)
    )
    if userId and userId != "all":
        stmt = stmt.where(TryOnSession.user_id == userId)

    res = await db.execute(stmt)
    sessions = res.scalars().all()

    # Resolve each session's garment image so past try-ons show the actual
    # garment (not a shared placeholder or synthetic PIL render). Seeded/legacy
    # sessions store the generic default URL or a data: URI as their render.
    skus = {s.garment_sku for s in sessions}
    garment_stmt = select(GarmentItem.sku, GarmentItem.image_url).where(GarmentItem.sku.in_(skus))
    garment_res = await db.execute(garment_stmt)
    garment_images = {sku: url for sku, url in garment_res.all()}

    def resolve_render_url(session) -> str:
        url = session.rendered_vto_url
        if not url or url == settings.DEFAULT_GARMENT_IMAGE_URL or url.startswith("data:image"):
            return garment_images.get(session.garment_sku, url)
        return url

    items = []
    for s in sessions:
        items.append(
            HistoryItemResponse(
                id=s.id,
                sessionId=s.id,
                userId=s.user_id,
                garmentSku=s.garment_sku,
                garmentName=s.garment_name,
                garmentColorHex=s.garment_color_hex,
                garmentMaterial=s.garment_material or {},
                renderedVtoUrl=resolve_render_url(s),
                fitRepeatabilityScore=s.fit_repeatability_score,
                colorHarmonyScore=s.color_harmony_score,
                fabricSafetyScore=s.fabric_safety_score,
                keepProbabilityScore=s.keep_probability_score,
                verdict=s.verdict or "STRONG_BUY",
                aiExplanation=s.ai_explanation or "",
                createdAt=s.created_at,
                actionTaken=s.feedback.action_taken if s.feedback else None,
                returnReason=s.feedback.return_reason if s.feedback else None
            )
        )
    return items

@router.get("/admin-analytics", response_model=MerchantAnalyticsResponse)
async def get_merchant_fleet_analytics(
    db: AsyncSession = Depends(get_db)
):
    """
    B2B Merchant Analytics: Aggregates return rate reductions, reason breakdown distributions,
    and high-risk SKU fleet telemetry across all shoppers.
    """
    # Total sessions
    total_stmt = select(func.count(TryOnSession.id))
    total_res = await db.execute(total_stmt)
    total_count = total_res.scalar() or 0

    # Average keep probability
    avg_stmt = select(func.avg(TryOnSession.keep_probability_score))
    avg_res = await db.execute(avg_stmt)
    avg_keep_prob = avg_res.scalar() or 0.0

    # Feedback / return data
    fb_stmt = (
        select(TryOnSession, FeedbackLog)
        .join(FeedbackLog, FeedbackLog.session_id == TryOnSession.id)
    )
    fb_res = await db.execute(fb_stmt)
    feedback_rows = fb_res.all()

    kept_count = sum(1 for _, fb in feedback_rows if fb.action_taken == "KEPT")
    returned_count = sum(1 for _, fb in feedback_rows if fb.action_taken == "RETURNED")

    # Return reason distribution (real DB only)
    reasons_list = []
    if returned_count > 0:
        reason_stmt = select(FeedbackLog.return_reason, func.count(FeedbackLog.id)).group_by(FeedbackLog.return_reason)
        reason_res = await db.execute(reason_stmt)
        reason_rows = [(r or "OTHER", c) for r, c in reason_res.all()]

        reason_labels = {
            "FABRIC_ITCHY": "Fabric & Sensory Irritation",
            "FIT_TOO_TIGHT": "Fit Inconsistency / Tight Tension",
            "COLOR_UNFLATTERING": "Seasonal Undertone Color Clash",
            "POOR_QUALITY": "Drape/Texture Quality Discrepancy",
        }
        for code, count in reason_rows:
            reasons_list.append(
                ReasonDistribution(
                    reason=code,
                    count=count,
                    percentage=round((count / returned_count) * 100.0, 1),
                    description=reason_labels.get(code, code.replace("_", " ").title())
                )
            )

    # Per-SKU risk metrics from real sessions + feedback
    sku_sessions = {}
    for s, fb in feedback_rows:
        entry = sku_sessions.setdefault(s.garment_sku, {"kept": 0, "returned": 0, "total": 0, "scores": []})
        entry["total"] += 1
        entry["scores"].append(s.keep_probability_score or 0.0)
        if fb.action_taken == "KEPT":
            entry["kept"] += 1
        elif fb.action_taken == "RETURNED":
            entry["returned"] += 1

    garment_stmt = select(GarmentItem.sku, GarmentItem.name).where(GarmentItem.sku.in_(list(sku_sessions.keys())))
    garment_res = await db.execute(garment_stmt)
    garment_names = {sku: name for sku, name in garment_res.all()}

    skus_list = []
    for sku, stats in sku_sessions.items():
        keep_rate = round((stats["kept"] / max(stats["total"], 1)) * 100, 1)
        return_share = stats["returned"] / max(stats["total"], 1)
        if return_share >= 0.5:
            risk_level = "HIGH"
            driver = "Returned by majority of try-ons"
        elif return_share > 0.25:
            risk_level = "MODERATE"
            driver = "Elevated return behavior"
        else:
            risk_level = "LOW"
            driver = "Low return behavior"
        skus_list.append(
            SkuReturnRisk(
                sku=sku,
                name=garment_names.get(sku, sku),
                totalTryOns=stats["total"],
                keepRate=keep_rate,
                returnRiskLevel=risk_level,
                primaryReturnDriver=driver
            )
        )
    skus_list.sort(key=lambda x: (-x.totalTryOns, x.keepRate))

    return_rate = round((returned_count / max(total_count, 1)) * 100.0, 1)
    return MerchantAnalyticsResponse(
        totalSessionsAnalyzed=total_count,
        fleetAverageKeepProbability=round(avg_keep_prob, 1),
        estimatedReturnRateReductionPct=round((kept_count / max(total_count, 1)) * 100.0, 1),
        savedReturnCostDollars=round(kept_count * 110.0, 2),
        returnReasonBreakdown=reasons_list,
        highRiskSkus=skus_list,
        agentReliabilityIndex=round((kept_count / max(kept_count + returned_count, 1)) * 100.0, 1)
    )
