import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models import User, DigitalMannequin, UserPreference, TryOnSession, GarmentItem
from backend.app.schemas import (
    KeepProbabilityRequest,
    KeepProbabilityResponse,
    KeepProbabilityResponseData,
    KeepScores,
    DiagnosticsData,
    KeepProbabilityRunRequest
)
from backend.app.agents.workflow import run_verafit_workflow
from backend.app.agents.state import GraphState
from backend.app.agents.history_agent import build_purchase_history
from backend.app.services.youcam_service import YouCamServiceError
from backend.app.services.garment_images import menswear_image_url
from backend.app.config import settings

router = APIRouter(prefix="/analyze", tags=["Analyze"])

@router.post("/keep-probability", response_model=KeepProbabilityResponse)
async def analyze_keep_probability(
    payload: KeepProbabilityRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes multi-agent LangGraph workflow to evaluate purchase certainty:
    1. VTO Agent (3 parallel renders)
    2. Math Engine (SSIM calculation & diff heatmap)
    3. Color Harmony Agent (CIELab Delta E & seasonal match)
    4. Fabric Safety Agent (Allergens & skin conditions)
    5. Personalization Agent (Historical feedback & Mood slider)
    6. Synthesis Agent (Master score formula & LiteLLM verdict)
    """
    return await run_keep_probability_analysis(
        user_id=payload.userId,
        garment={
            "sku": payload.garment.sku,
            "name": payload.garment.name,
            "colorHex": payload.garment.colorHex,
            "materials": payload.garment.materials,
            "category": payload.garment.category,
            "imageUrl": payload.garment.imageUrl,
        },
        mood_modifier=payload.context.moodSlider if payload.context else 0.0,
        user_image_b64=payload.userImageB64,
        db=db
    )

@router.post("/run", response_model=KeepProbabilityResponse)
async def analyze_keep_probability_by_sku(
    payload: KeepProbabilityRunRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Frontend-friendly entrypoint that resolves a garment by SKU from the catalog
    and runs the multi-agent LangGraph keep-probability workflow.
    """
    garment = await _resolve_garment_by_sku(payload.garmentSku, db)
    if garment is None:
        raise HTTPException(status_code=404, detail=f"Garment SKU {payload.garmentSku} not found in catalog.")

    return await run_keep_probability_analysis(
        user_id=payload.userId,
        garment={
            "sku": garment.sku,
            "name": garment.name,
            "colorHex": garment.color_hex,
            "materials": garment.materials,
            "category": garment.category,
            "imageUrl": garment.image_url,
        },
        mood_modifier=payload.moodModifier or 0.0,
        user_image_b64=payload.userImageB64,
        db=db
    )

async def _resolve_garment_by_sku(sku: str, db: AsyncSession):
    stmt = select(GarmentItem).where(GarmentItem.sku == sku)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def run_keep_probability_analysis(
    user_id: str,
    garment: dict,
    mood_modifier: float,
    user_image_b64,
    db: AsyncSession,
) -> KeepProbabilityResponse:
    
    # Fetch User Profile & Preferences from database
    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    mannequin = None
    if user:
        mannequin_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == user_id)
        m_res = await db.execute(mannequin_stmt)
        mannequin = m_res.scalar_one_or_none()

    # Male shoppers get the men's version of the garment photo so the VTO drapes
    # gender-appropriate clothing imagery onto their (full-body) photo.
    if user and (user.gender or "").lower() == "male":
        garment["imageUrl"] = menswear_image_url(
            garment.get("category", ""), garment.get("colorHex", "#2C3E50"), garment.get("sku", "")
        )

    # Use the user's own mannequin photo (their full-body/selfie upload) as the
    # VTO source when no in-session photo was provided, so the garment is draped
    # on each user's actual photo instead of a shared generic default.
    if not user_image_b64:
        if mannequin and mannequin.base_photo_url:
            user_image_b64 = mannequin.base_photo_url
        else:
            user_image_b64 = settings.DEFAULT_MANNEQUIN_PHOTO_URL

    allergies = ["wool", "nickel"]
    preferred_fit = "regular"
    comfort_style_bias = 0.5
    color_season = "Cool Winter"
    skin_concerns = {"rosacea": 38.5, "sensitivity": 62.0}
    historical_bias = {}

    if user:
        if mannequin:
            color_season = mannequin.color_season or color_season
            skin_concerns = mannequin.detected_concerns or skin_concerns

        pref_stmt = select(UserPreference).where(UserPreference.user_id == user_id)
        p_res = await db.execute(pref_stmt)
        pref = p_res.scalar_one_or_none()
        if pref:
            allergies = pref.allergies or allergies
            preferred_fit = pref.preferred_fit or preferred_fit
            comfort_style_bias = pref.comfort_vs_style_bias if pref.comfort_vs_style_bias is not None else comfort_style_bias
            historical_bias = pref.historical_bias or historical_bias

    # Build Initial LangGraph State
    purchase_history = await build_purchase_history(db, user_id)

    initial_state: GraphState = {
        "user_id": user_id,
        "user_image_b64": user_image_b64,
        "garment_id": garment["sku"],
        "garment_name": garment["name"],
        "garment_image_b64": garment.get("imageUrl"),
        "garment_material": garment["materials"],
        "garment_color_hex": garment["colorHex"],
        "garment_category": garment.get("category", "tops"),
        "mood_modifier": mood_modifier or 0.0,
        "allergies": allergies,
        "preferred_fit": preferred_fit,
        "comfort_style_bias": comfort_style_bias,
        "color_season": color_season,
        "skin_concerns": skin_concerns,
        "historical_bias": historical_bias,
        "purchase_history": purchase_history,
        "vto_renders": [],
        "fit_repeatability_score": 0.0,
        "ssim_variance": 0.0,
        "pairwise_ssim": [],
        "diff_heatmap_b64": "",
        "is_fit_unstable": False,
        "color_harmony_score": 0.0,
        "color_diagnostics": "",
        "color_indicator": "🟢",
        "closest_palette_match": "",
        "garment_lab": [],
        "season_palette_hex": [],
        "fabric_safety_score": 0.0,
        "fabric_warnings": [],
        "allergy_multiplier": 1.0,
        "allergy_detected": False,
        "personalization_delta": 0.0,
        "mood_scalar": 1.0,
        "purchase_learnings": [],
        "purchase_recommendations": [],
        "purchase_history_delta": 0.0,
        "keep_probability": 0.0,
        "verdict": "STRONG_BUY",
        "breakdown_metrics": {},
        "natural_language_verdict": "",
        "ai_explanation": ""
    }

    # Execute LangGraph Multi-Agent Workflow
    try:
        final_state = await run_verafit_workflow(initial_state)
    except YouCamServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))

    session_id = f"ses_{uuid.uuid4().hex[:10]}"
    renders = final_state.get("vto_renders", [])
    best_vto_render = renders[0] if renders else ""

    # Persist session in database
    session_record = TryOnSession(
        id=session_id,
        user_id=user_id,
        garment_sku=garment["sku"],
        garment_name=garment["name"],
        garment_material=garment["materials"],
        garment_color_hex=garment["colorHex"],
        rendered_vto_url=best_vto_render,
        vto_renders=renders,
        diff_heatmap_url=final_state.get("diff_heatmap_b64", ""),
        fit_repeatability_score=final_state.get("fit_repeatability_score", 0.0),
        color_harmony_score=final_state.get("color_harmony_score", 0.0),
        fabric_safety_score=final_state.get("fabric_safety_score", 0.0),
        keep_probability_score=final_state.get("keep_probability", 0.0),
        verdict=final_state.get("verdict", "STRONG_BUY"),
        diagnostics={
            "colorSeason": final_state.get("color_season"),
            "colorMatchReason": final_state.get("color_diagnostics"),
            "garmentLab": final_state.get("garment_lab"),
            "seasonPaletteHex": final_state.get("season_palette_hex"),
            "fabricWarnings": final_state.get("fabric_warnings", []),
            "ssimVariance": final_state.get("ssim_variance", 0.0),
            "pairwiseSsim": final_state.get("pairwise_ssim", []),
            "allergyDetected": final_state.get("allergy_detected", False),
            "moodDeltaApplied": final_state.get("personalization_delta", 0.0),
            "fitProfile": preferred_fit,
            "comfortStyleBias": comfort_style_bias,
            "purchaseHistoryDelta": final_state.get("purchase_history_delta", 0.0),
            "purchaseLearnings": final_state.get("purchase_learnings", []),
            "purchaseRecommendations": final_state.get("purchase_recommendations", [])
        },
        ai_explanation=final_state.get("ai_explanation", "")
    )
    db.add(session_record)
    await db.commit()

    return KeepProbabilityResponse(
        status="success",
        data=KeepProbabilityResponseData(
            sessionId=session_id,
            keepProbability=final_state.get("keep_probability", 0.0),
            verdict=final_state.get("verdict", "STRONG_BUY"),
            scores=KeepScores(
                fitRepeatability=final_state.get("fit_repeatability_score", 0.0),
                colorHarmony=final_state.get("color_harmony_score", 0.0),
                fabricSafety=final_state.get("fabric_safety_score", 0.0)
            ),
            bestVtoRenderUrl=best_vto_render,
            allVtoRenders=renders,
            diagnostics=DiagnosticsData(
                colorSeason=final_state.get("color_season", "Cool Winter"),
                colorMatchReason=final_state.get("color_diagnostics", ""),
                garmentLab=final_state.get("garment_lab"),
                seasonPaletteHex=final_state.get("season_palette_hex"),
                fabricWarnings=final_state.get("fabric_warnings", []),
                ssimVariance=final_state.get("ssim_variance", 0.0),
                pairwiseSsim=final_state.get("pairwise_ssim", []),
                diffHeatmapB64=final_state.get("diff_heatmap_b64", ""),
                allergyDetected=final_state.get("allergy_detected", False),
                moodDeltaApplied=final_state.get("personalization_delta", 0.0)
            ),
            aiExplanation=final_state.get("ai_explanation", "")
        )
    )
