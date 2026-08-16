from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.agents.history_agent import (
    build_purchase_history,
    purchase_history_analyzer_node,
    _fiber_family,
)
from backend.app.agents.recommendation_agent import run_recommendation_workflow
from backend.app.schemas import (
    LearningsResponse,
    PurchaseLearningItem,
    PurchaseRecommendation,
    FiberAffinity,
    ProfileReportResponse,
)

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.get("/learnings", response_model=LearningsResponse)
async def get_purchase_history_learnings(
    userId: str = Query("usr_94b3a8c1"),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs the purchase-history analyzer agent over the user's try-on/purchase
    history and returns evidence-backed learnings and personalized
    recommendations.
    """
    aggregate = await build_purchase_history(db, userId)

    # Execute the same LangGraph node used by the keep-probability workflow,
    # supplying the aggregate (plus empty prefs/concerns: the node degrades
    # gracefully without them).
    result = await purchase_history_analyzer_node({
        "purchase_history": aggregate,
        "historical_bias": {},
        "skin_concerns": {},
        "color_season": "",
    })

    sessions = aggregate.get("sessions") or []
    kept = [s for s in sessions if s.get("action") == "KEPT"]
    returned = [s for s in sessions if s.get("action") == "RETURNED"]
    total = len(sessions)

    # Fiber affinity breakdown (reuse the same normalizer for consistency)
    fiber_stats = {}
    for s in sessions:
        for mat_key, _ in (s.get("materials") or {}).items():
            fam = _fiber_family(mat_key)
            st = fiber_stats.setdefault(fam, {
                "kept": 0, "returned": 0, "total": 0, "keep_scores": [], "fabric_scores": [],
            })
            st["total"] += 1
            st["keep_scores"].append(float(s.get("keepScore") or 0.0))
            st["fabric_scores"].append(float(s.get("fabricScore") or 0.0))
            if s.get("action") == "KEPT":
                st["kept"] += 1
            elif s.get("action") == "RETURNED":
                st["returned"] += 1

    affinities = [
        FiberAffinity(
            fiber=fam,
            kept=st["kept"],
            returned=st["returned"],
            total=st["total"],
            avgKeepScore=round(sum(st["keep_scores"]) / max(st["total"], 1), 1),
            avgFabricSafety=round(sum(st["fabric_scores"]) / max(st["total"], 1), 1),
        )
        for fam, st in sorted(fiber_stats.items(), key=lambda x: -x[1]["total"])
    ]

    return LearningsResponse(
        userId=userId,
        totalSessions=total,
        keptCount=len(kept),
        returnedCount=len(returned),
        pendingCount=max(total - len(kept) - len(returned), 0),
        averageKeepProbability=round(
            sum(float(s.get("keepScore") or 0.0) for s in sessions) / max(total, 1), 1
        ),
        keepRate=round((len(kept) / max(total, 1)) * 100.0, 1),
        returnRate=round((len(returned) / max(total, 1)) * 100.0, 1),
        fiberAffinities=affinities,
        learnings=[PurchaseLearningItem(**l) for l in result["purchase_learnings"]],
        recommendations=[PurchaseRecommendation(**r) for r in result["purchase_recommendations"]],
    )

@router.get("/profile-report", response_model=ProfileReportResponse)
async def get_profile_report(
    userId: str = Query("usr_94b3a8c1"),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs the AI recommendation LangGraph agent: the deterministic aggregation
    node consumes the purchase-history analyzer, color/style/fabric compatibility
    agents, and the user's mannequin/preferences, then the AI node turns the
    resulting digest into a comprehensive shopper profile report.
    """
    return await run_recommendation_workflow(db, user_id=userId)
