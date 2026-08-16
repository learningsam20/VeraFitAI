import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import UserPreference, FeedbackLog, TryOnSession
from backend.app.schemas import (
    FeedbackRecordRequest,
    FeedbackRecordResponse,
    PurchaseItemRequest,
    PurchaseItemResponse,
    ReturnItemRequest,
    ReturnItemResponse,
)

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("/record", response_model=FeedbackRecordResponse)
async def record_feedback(
    payload: FeedbackRecordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records return or keep action for continuous learning:
    - Saves feedback log in database.
    - Recalibrates user preference bias vectors (e.g., FABRIC_ITCHY_count, COLOR_KEPT_count).
    """
    # 1. Check if session exists
    session_stmt = select(TryOnSession).where(TryOnSession.id == payload.sessionId)
    session_res = await db.execute(session_stmt)
    session = session_res.scalar_one_or_none()

    # 2. Check or create feedback log
    fb_stmt = select(FeedbackLog).where(FeedbackLog.session_id == payload.sessionId)
    fb_res = await db.execute(fb_stmt)
    fb_log = fb_res.scalar_one_or_none()

    if not fb_log:
        fb_log = FeedbackLog(
            id=str(uuid.uuid4()),
            user_id=payload.userId,
            session_id=payload.sessionId,
            action_taken=payload.action,
            return_reason=payload.reason,
            user_notes=payload.details
        )
        db.add(fb_log)
    else:
        fb_log.action_taken = payload.action
        fb_log.return_reason = payload.reason
        fb_log.user_notes = payload.details

    # 3. Update UserPreference dynamic historical bias
    pref_stmt = select(UserPreference).where(UserPreference.user_id == payload.userId)
    pref_res = await db.execute(pref_stmt)
    user_pref = pref_res.scalar_one_or_none()

    if user_pref:
        bias_dict = dict(user_pref.historical_bias or {})
        if payload.action == "RETURNED" and payload.reason:
            key = f"{payload.reason}_count"
            bias_dict[key] = bias_dict.get(key, 0) + 1
            if payload.reason == "FABRIC_ITCHY":
                # Shift bias slightly towards comfort
                user_pref.comfort_vs_style_bias = min(1.0, user_pref.comfort_vs_style_bias + 0.05)
        elif payload.action == "KEPT":
            bias_dict["KEPT_count"] = bias_dict.get("KEPT_count", 0) + 1
            if session and session.color_harmony_score >= 80:
                bias_dict["COLOR_KEPT_count"] = bias_dict.get("COLOR_KEPT_count", 0) + 1

        user_pref.historical_bias = bias_dict
        db.add(user_pref)

    await db.commit()

    return FeedbackRecordResponse(
        status="success",
        message="Continuous learning feedback recorded and preference bias recalibrated.",
        updatedBias=user_pref.historical_bias if user_pref else {}
    )

@router.post("/purchase", response_model=PurchaseItemResponse)
async def purchase_item(
    payload: PurchaseItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Directly commits a customer purchase into the database:
    - Sets or creates a TryOnSession and FeedbackLog with action_taken='KEPT'
    - Updates user historical preference bias
    - Immediately reflects across B2B merchant telemetry and fleet unit sales.
    """
    from backend.app.models import GarmentItem

    session_id = payload.sessionId
    session = None

    if session_id:
        session_stmt = select(TryOnSession).where(TryOnSession.id == session_id)
        session_res = await db.execute(session_stmt)
        session = session_res.scalar_one_or_none()

    if not session:
        # Create a new verified purchase session
        garment_stmt = select(GarmentItem).where(GarmentItem.sku == payload.garmentSku)
        garment_res = await db.execute(garment_stmt)
        garment = garment_res.scalar_one_or_none()

        garment_name = payload.garmentName or (garment.name if garment else "Tailored Garment")
        garment_color = garment.color_hex if garment else "#1E3A8A"
        materials = garment.materials if garment else {"silk": 1.0}
        image_url = garment.image_url if garment else ""

        session_id = str(uuid.uuid4())
        session = TryOnSession(
            id=session_id,
            user_id=payload.userId,
            garment_sku=payload.garmentSku,
            garment_name=garment_name,
            garment_material=materials,
            garment_color_hex=garment_color,
            rendered_vto_url=image_url,
            vto_renders=[image_url],
            fit_repeatability_score=94.5,
            color_harmony_score=96.0,
            fabric_safety_score=98.0,
            keep_probability_score=95.8,
            verdict="STRONG_BUY",
            ai_explanation=f"Direct purchase recorded for {garment_name}. Optimal CIELab skin harmony and low friction profile.",
            diagnostics={
                "colorSeason": "Cool Winter",
                "colorMatchReason": "Harmonious High-Contrast Match",
                "allergyDetected": False,
                "frictionCoefficient": 0.12
            }
        )
        db.add(session)

    # Record or update FeedbackLog to KEPT
    fb_stmt = select(FeedbackLog).where(FeedbackLog.session_id == session_id)
    fb_res = await db.execute(fb_stmt)
    fb_log = fb_res.scalar_one_or_none()

    if not fb_log:
        fb_log = FeedbackLog(
            id=str(uuid.uuid4()),
            user_id=payload.userId,
            session_id=session_id,
            action_taken="KEPT",
            return_reason=None,
            user_notes=payload.notes or "Purchased & Added to Personal Wardrobe"
        )
        db.add(fb_log)
    else:
        fb_log.action_taken = "KEPT"
        fb_log.return_reason = None
        fb_log.user_notes = payload.notes or "Purchased & Added to Personal Wardrobe"

    # Recalibrate user preference bias
    pref_stmt = select(UserPreference).where(UserPreference.user_id == payload.userId)
    pref_res = await db.execute(pref_stmt)
    user_pref = pref_res.scalar_one_or_none()

    if user_pref:
        bias_dict = dict(user_pref.historical_bias or {})
        bias_dict["KEPT_count"] = bias_dict.get("KEPT_count", 0) + 1
        bias_dict["PURCHASES_count"] = bias_dict.get("PURCHASES_count", 0) + 1
        user_pref.historical_bias = bias_dict
        db.add(user_pref)

    await db.commit()

    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    return PurchaseItemResponse(
        status="success",
        message=f"Purchase confirmed for SKU {payload.garmentSku}. Saved to database.",
        sessionId=session_id,
        actionTaken="KEPT",
        orderId=order_id
    )

@router.post("/return", response_model=ReturnItemResponse)
async def return_item(
    payload: ReturnItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Records a return with its reason for a previously purchased/kept try-on
    session (no payment involved in the demo flow). The captured reason feeds
    the fleet return-reason analytics, and the historical preference bias is
    recalibrated exactly like the generic feedback endpoint.
    """
    session_stmt = select(TryOnSession).where(TryOnSession.id == payload.sessionId)
    session_res = await db.execute(session_stmt)
    session = session_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail=f"Try-on session {payload.sessionId} not found.")

    fb_stmt = select(FeedbackLog).where(FeedbackLog.session_id == payload.sessionId)
    fb_res = await db.execute(fb_stmt)
    fb_log = fb_res.scalar_one_or_none()

    if not fb_log:
        fb_log = FeedbackLog(
            id=str(uuid.uuid4()),
            user_id=payload.userId,
            session_id=payload.sessionId,
            action_taken="RETURNED",
            return_reason=payload.reason,
            user_notes=payload.details
        )
        db.add(fb_log)
    else:
        fb_log.action_taken = "RETURNED"
        fb_log.return_reason = payload.reason
        fb_log.user_notes = payload.details

    pref_stmt = select(UserPreference).where(UserPreference.user_id == payload.userId)
    pref_res = await db.execute(pref_stmt)
    user_pref = pref_res.scalar_one_or_none()

    if user_pref:
        bias_dict = dict(user_pref.historical_bias or {})
        if payload.reason:
            key = f"{payload.reason}_count"
            bias_dict[key] = bias_dict.get(key, 0) + 1
        if payload.reason == "FABRIC_ITCHY":
            user_pref.comfort_vs_style_bias = min(1.0, (user_pref.comfort_vs_style_bias or 0.5) + 0.05)
        user_pref.historical_bias = bias_dict
        db.add(user_pref)

    await db.commit()

    return ReturnItemResponse(
        status="success",
        message=f"Return recorded for session {payload.sessionId} with reason '{payload.reason}'.",
        sessionId=payload.sessionId,
        actionTaken="RETURNED",
        returnReason=payload.reason,
        updatedBias=user_pref.historical_bias if user_pref else {}
    )

