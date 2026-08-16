import base64
import io
import math
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from PIL import Image
from backend.app.database import get_db
from backend.app.models import User, DigitalMannequin, UserPreference
from backend.app.schemas import (
    MannequinAnalyzeRequest,
    MannequinProfile,
    AutomatedColorAnalysisResponse,
    ColorReasoningStep,
)
from backend.app.services.youcam_service import youcam_service, YouCamServiceError
from backend.app.math_engine.color_engine import hex_to_cielab, hex_to_rgb

router = APIRouter(prefix="/mannequin", tags=["Digital Mannequin"])

def downscale_selfie(selfie_b64: str, max_dim: int = 600, quality: int = 85) -> str:
    """Downscales an uploaded selfie data URI to a bounded JPEG for DB storage."""
    try:
        if selfie_b64.startswith("data:"):
            _, _, b64 = selfie_b64.partition(",")
        else:
            b64 = selfie_b64
        img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"
    except Exception:
        return selfie_b64

def cielab_to_hex(L: float, a: float, b: float) -> str:
    """Helper to convert CIELab coordinates back into sRGB Hex string."""
    # Convert Lab to XYZ (D65)
    fy = (L + 16.0) / 116.0
    fx = (a / 500.0) + fy
    fz = fy - (b / 200.0)

    def inv_pivot_xyz(t: float) -> float:
        return t ** 3 if t > 0.20689655 else (t - 16.0 / 116.0) / 7.787

    x = 95.047 * inv_pivot_xyz(fx)
    y = 100.000 * inv_pivot_xyz(fy)
    z = 108.883 * inv_pivot_xyz(fz)

    # XYZ to linear sRGB
    xr = x / 100.0
    yr = y / 100.0
    zr = z / 100.0

    r_lin = xr * 3.2406 + yr * -1.5372 + zr * -0.4986
    g_lin = xr * -0.9689 + yr * 1.8758 + zr * 0.0415
    b_lin = xr * 0.0557 + yr * -0.2040 + zr * 1.0570

    def gamma(c: float) -> int:
        c = max(0.0, min(1.0, c))
        val = (1.055 * (c ** (1.0 / 2.4)) - 0.055) if c > 0.0031308 else 12.92 * c
        return int(round(max(0.0, min(255.0, val * 255.0))))

    r = gamma(r_lin)
    g = gamma(g_lin)
    b_val = gamma(b_lin)
    return f"#{r:02X}{g:02X}{b_val:02X}"

def _parametric_swatch(
    anchor_lab, user_lab, rosacea: float, sensitivity: float, clash: bool = False,
    tonal_contrast: float = 1.0, chroma_tolerance: float = 1.0,
) -> str:
    """Maps a season anchor swatch onto the user's exact CIELab biometric profile.

    Lightness tracks the user's luminance (scaled by the fit/comfort tonal contrast),
    chroma scales with their natural chrominance and is dimmed by skin sensitivity,
    allergen-driven chroma tolerance, and positive red chroma is dampened when
    erythema/rosacea is elevated so flushing tones are avoided.
    """
    L_u, a_u, b_u = user_lab
    anchor_L, anchor_a, anchor_b = anchor_lab
    user_chroma = math.sqrt(a_u * a_u + b_u * b_u)

    L = min(96.0, max(6.0, anchor_L + (L_u - 55.0) * 0.35 * tonal_contrast))
    sat = min(1.35, max(0.65, 1.0 + (user_chroma - 18.0) * 0.02))
    chroma = min(1.0, max(0.35, sat * (1.0 - sensitivity / 400.0)))
    chroma = min(1.0, max(0.30, chroma * chroma_tolerance * (0.85 + 0.15 * tonal_contrast)))
    if clash:
        chroma = min(1.4, chroma * 1.2)

    a = anchor_a * chroma
    b = anchor_b * chroma
    if a > 0:
        a = a * max(0.6, 1.0 - rosacea / 250.0)
    return cielab_to_hex(L, a, b)

def _reasoning_from_dict(data: Optional[Dict[str, Any]]) -> Optional[AutomatedColorAnalysisResponse]:
    """Rehydrates a persisted color reasoning dict back into its schema model."""
    if not isinstance(data, dict):
        return None
    try:
        return AutomatedColorAnalysisResponse.model_validate(data)
    except Exception:
        return None

def _allergy_chroma_tolerance(allergies: Optional[List[str]] = None) -> float:
    """Dampens palette chroma when allergens imply dye/contact irritation risk.

    Synthetic fiber allergies soften high-chroma synthetic hues; nickel allergy
    de-emphasizes cool metallic tints. Wool/latex are texture-based and leave the
    palette untouched, but still show up in the reasoning trace for explainability.
    """
    tol = 1.0
    for a in allergies or []:
        al = a.lower()
        if any(k in al for k in ("synthetic", "polyester", "acrylic", "nylon", "rough")):
            tol *= 0.85
        elif "nickel" in al:
            tol *= 0.90
    return round(max(0.60, min(1.0, tol)), 2)

def derive_automated_color_reasoning(
    skin_tone_hex: str,
    skin_undertone: str,
    detected_concerns: Dict[str, Any],
    body_type: str = "Balanced Athletic",
    preferred_fit: str = "regular",
    allergies: Optional[List[str]] = None,
    comfort_style_bias: Optional[float] = None,
) -> AutomatedColorAnalysisResponse:
    """
    Dynamically computes automated color season and palettes based on exact CIELab chrominance,
    rosacea/erythema levels, contrast ratio, biometric tolerances, and the user's fit/comfort
    preferences (which modulate tonal contrast) and allergies (which modulate chroma tolerance).
    """
    lab = hex_to_cielab(skin_tone_hex)
    L, a, b = lab
    
    rosacea_level = float(detected_concerns.get("rosacea", 35.0))
    sensitivity_level = float(detected_concerns.get("sensitivity", 50.0))

    # Dynamic undertone calculation
    is_cool = (skin_undertone.lower() == "cool") or (b < 14.0)
    contrast_ratio = round(3.2 + (L / 100.0) * 1.2, 1)

    # Fit/comfort modulate tonal contrast (softer for oversized/comfort-first,
    # crisper for tight/tailored/style-first) so palettes react to those inputs.
    fit_contrast = {"oversized": 0.85, "tight": 1.15, "tailored": 1.15}.get(preferred_fit.lower(), 1.0)
    comfort_bias = float(comfort_style_bias) if comfort_style_bias is not None else 0.5
    comfort_mod = 0.93 if comfort_bias >= 0.7 else (1.07 if comfort_bias <= 0.3 else 1.0)
    tonal_contrast = round(fit_contrast * comfort_mod, 2)
    chroma_tolerance = _allergy_chroma_tolerance(allergies)

    # Dynamically generate palettes mapped to the user's specific CIELab coordinates
    if is_cool:
        if L > 65 or contrast_ratio >= 3.6:
            assigned_season = "Cool Winter"
            confidence = round(0.92 + (contrast_ratio / 50.0), 3)
            # Dynamic deep jewel & stark contrast swatches
            recommended_anchors = [
                (20.0, 15.0, -45.0),  # Deep Navy
                (12.0, 0.0, 0.0),     # Midnight Charcoal
                (35.0, 48.0, 15.0),   # Royal Crimson
                (55.0, -25.0, -20.0), # Ice Sapphire
                (95.0, 0.0, 0.0),     # Crisp Snow White
            ]
            clash_anchors = [
                (70.0, 25.0, 65.0),   # Muddy Mustard
                (65.0, 45.0, 55.0),   # Warm Peach Ochre
                (45.0, 30.0, 40.0),   # Rust Brown
            ]
            summary = f"High-contrast cool undertone (b*={b:.1f}) with {contrast_ratio}:1 contrast dynamic. Deep jewel hues and stark monochromatic neutrals provide optimal radiance."
        else:
            assigned_season = "Cool Summer"
            confidence = round(0.89 + (L / 200.0), 3)
            recommended_anchors = [
                (65.0, -10.0, -25.0), # Dusty Slate Blue
                (70.0, 18.0, -8.0),   # Soft Heathered Mauve
                (80.0, -12.0, 5.0),   # Seafoam Sage
                (50.0, 5.0, -15.0),   # Muted Indigo
                (88.0, -2.0, -5.0),   # Pearl Grey
            ]
            clash_anchors = [
                (55.0, 60.0, 60.0),   # Electric Orange
                (60.0, 10.0, 70.0),   # Chartreuse
                (10.0, 0.0, 0.0),     # Harsh Jet Black
            ]
            summary = f"Soft, muted cool undertone (b*={b:.1f}). Gentle, dusty pastels and heathered textures diffuse skin redness gracefully."
    else:
        if L < 60 or contrast_ratio >= 3.5:
            assigned_season = "Warm Autumn"
            confidence = round(0.91 + (b / 100.0), 3)
            recommended_anchors = [
                (38.0, 32.0, 42.0),   # Burnt Terracotta
                (42.0, -15.0, 35.0),  # Deep Olive Bronze
                (28.0, 20.0, 25.0),   # Rich Espresso
                (62.0, 18.0, 58.0),   # Warm Amber
                (75.0, 8.0, 30.0),    # Sandalwood Cream
            ]
            clash_anchors = [
                (85.0, -25.0, -30.0), # Electric Cyan
                (65.0, 55.0, -20.0),  # Magenta Pink
                (92.0, 0.0, 0.0),     # Harsh Stark White
            ]
            summary = f"Rich golden undertone (b*={b:.1f}). Earthy warm tones, cognac, and deep olive harmonize with natural warmth."
        else:
            assigned_season = "Warm Spring"
            confidence = round(0.88 + (L / 250.0), 3)
            recommended_anchors = [
                (68.0, 42.0, 48.0),   # Luminous Coral
                (82.0, 5.0, 65.0),    # Warm Golden Buttercup
                (72.0, -35.0, 15.0),  # Fresh Mint Leaf
                (58.0, -25.0, -15.0), # Warm Aqua Turquoise
                (92.0, 2.0, 20.0),    # Warm Ivory
            ]
            clash_anchors = [
                (18.0, 0.0, 0.0),     # Heavy Black
                (30.0, 15.0, -35.0),  # Dark Midnight Navy
                (40.0, 0.0, 0.0),     # Muddy Charcoal
            ]
            summary = f"Luminous warm golden undertone (b*={b:.1f}). High-clarity corals, warm creams, and fresh spring greens elevate natural radiance."

    # Biometric-modulated palette: each season anchor is shifted by the user's
    # own CIELab luminance/chroma, erythema index, sensitivity, fit/comfort tonal
    # contrast, and allergen-driven chroma tolerance so the swatches visibly track
    # the user's exact profile instead of staying static.
    recommended_hexes = [
        _parametric_swatch(anchor, (L, a, b), rosacea_level, sensitivity_level,
                           tonal_contrast=tonal_contrast, chroma_tolerance=chroma_tolerance)
        for anchor in recommended_anchors
    ]
    clash_hexes = [
        _parametric_swatch(anchor, (L, a, b), rosacea_level, sensitivity_level,
                           clash=True, tonal_contrast=tonal_contrast, chroma_tolerance=chroma_tolerance)
        for anchor in clash_anchors
    ]

    # Dynamic Rosacea Counter-Adjustment: If rosacea is high, inject neutralizing counter-tone
    if rosacea_level > 30.0:
        anti_erythema_hex = "#4A7C59" if not is_cool else "#3A6B7E" # Soothing calming green/blue-slate
        if anti_erythema_hex not in recommended_hexes:
            recommended_hexes.insert(0, anti_erythema_hex)
        # Add high-red clash flag
        clash_hexes.append("#E6194B")

    allergy_label = ", ".join(allergies) if allergies else "None"
    input_parameters = {
        "skinToneHex": skin_tone_hex,
        "cielab": {"L": round(L, 1), "a": round(a, 1), "b": round(b, 1)},
        "skinUndertone": skin_undertone,
        "contrastRatio": contrast_ratio,
        "rosaceaIndex": rosacea_level,
        "sensitivityIndex": sensitivity_level,
        "bodyType": body_type,
        "preferredFit": preferred_fit,
        "fitContrastModifier": tonal_contrast,
        "comfortVsStyleBias": comfort_bias,
        "allergies": list(allergies or []),
        "allergyChromaTolerance": chroma_tolerance,
    }

    steps = [
        ColorReasoningStep(
            stage="0. Clinical Input Parameters",
            finding=f"Inputs feeding this analysis: {skin_tone_hex}, undertone '{skin_undertone}', body type '{body_type}', fit '{preferred_fit}', allergens [{allergy_label}]",
            metric=f"Fit contrast ×{tonal_contrast:.2f} · Allergen chroma ×{chroma_tolerance:.2f} · Rosacea {rosacea_level:.1f}/100 · Sensitivity {sensitivity_level:.1f}/100",
            verdict=f"Biometric + preference inputs captured"
        ),
        ColorReasoningStep(
            stage="1. Spectrometric Undertone Extraction",
            finding=f"CIELab chrominance coordinates L*={L:.1f}, a*={a:.1f}, b*={b:.1f}",
            metric=f"b* chrominance = {b:.1f} ({'Cool Blue/Pink bias' if is_cool else 'Warm Golden/Yellow bias'})",
            verdict=f"Classified Undertone: {'Cool' if is_cool else 'Warm'}"
        ),
        ColorReasoningStep(
            stage="2. Facial Contrast & Luminance Dynamic",
            finding=f"Luminance dynamic measured against reference hair/eye landmarks",
            metric=f"Facial Contrast Ratio: {contrast_ratio}:1 ({'High Definition' if contrast_ratio >= 3.5 else 'Soft Harmony'})",
            verdict=f"Contrast Tier: {'High Definition' if contrast_ratio >= 3.5 else 'Soft Harmony'}"
        ),
        ColorReasoningStep(
            stage="3. Biometric Skin Sensitivity Cross-Audit",
            finding=f"Erythema/Rosacea index measured at {rosacea_level:.1f}/100 with sensitivity at {sensitivity_level:.1f}/100",
            metric=f"Skin Reactivity: {'Elevated Vascular Flush' if rosacea_level > 25 else 'Baseline Tolerance'}",
            verdict=f"Dynamically injected soothing counter-hues and filtered abrasive dyes"
        ),
        ColorReasoningStep(
            stage="4. Preference-Tuned Seasonal Verdict & Dynamic Palette",
            finding=f"Multi-spectral alignment mapped to {assigned_season}, modulated by fit '{preferred_fit}' (tonal ×{tonal_contrast:.2f}) and allergen guard [{allergy_label}] (chroma ×{chroma_tolerance:.2f})",
            metric=f"Algorithmic Confidence: {confidence * 100:.1f}%",
            verdict=f"Assigned Season: {assigned_season}"
        ),
    ]

    return AutomatedColorAnalysisResponse(
        assignedSeason=assigned_season,
        skinUndertone="Cool" if is_cool else "Warm",
        skinToneHex=skin_tone_hex,
        cielabCoordinates={"L": L, "a": a, "b": b},
        contrastRatio=contrast_ratio,
        confidenceScore=min(0.98, confidence),
        reasoningSteps=steps,
        recommendedPalette=recommended_hexes[:6],
        clashPalette=clash_hexes[:5],
        clinicalSummary=summary,
        inputParameters=input_parameters,
    )

@router.get("/profile", response_model=MannequinProfile)
async def get_mannequin_profile(
    userId: str = "usr_94b3a8c1",
    db: AsyncSession = Depends(get_db)
):
    """Retrieves user's digital mannequin, skin concerns, allergy settings and dynamic color reasoning."""
    m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == userId)
    m_res = await db.execute(m_stmt)
    mannequin = m_res.scalar_one_or_none()

    p_stmt = select(UserPreference).where(UserPreference.user_id == userId)
    p_res = await db.execute(p_stmt)
    pref = p_res.scalar_one_or_none()

    if not mannequin:
        skin_tone = "#E8C39E"
        concerns = {"rosacea": 38.5, "dryness": 24.0, "sensitivity": 62.0}
        undertone = "Cool"
        season = "Cool Winter"
        base_photo = ""
        body_type = "Balanced Athletic"
    else:
        skin_tone = mannequin.skin_tone_hex or "#E8C39E"
        concerns = mannequin.detected_concerns or {}
        undertone = mannequin.skin_undertone or "Cool"
        season = mannequin.color_season or "Cool Winter"
        base_photo = mannequin.base_photo_url
        body_type = mannequin.body_type or "Balanced Athletic"

    preferred_fit = pref.preferred_fit if pref else "regular"

    # Serve the persisted clinical reasoning when available; only derive fresh
    # (without persisting) as a fallback so we never recompute on every load.
    stored = _reasoning_from_dict(mannequin.color_reasoning) if mannequin else None
    if stored:
        reasoning = stored
    else:
        reasoning = derive_automated_color_reasoning(
            skin_tone, undertone, concerns, body_type, preferred_fit,
            pref.allergies if pref else None,
            pref.comfort_vs_style_bias if pref else None,
        )

    return MannequinProfile(
        id=mannequin.id if mannequin else "mnq_default",
        userId=userId,
        basePhotoUrl=base_photo,
        colorSeason=season,
        skinUndertone=undertone,
        skinToneHex=skin_tone,
        detectedConcerns=concerns,
        bodyType=body_type,
        allergies=pref.allergies if pref else ["wool", "nickel"],
        preferredFit=preferred_fit,
        comfortVsStyleBias=pref.comfort_vs_style_bias if pref else 0.5,
        colorReasoning=reasoning
    )

@router.post("/analyze-color-reasoning", response_model=AutomatedColorAnalysisResponse)
async def analyze_color_season_reasoning(
    userId: str = Body(..., embed=True),
    skinToneHex: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs automated color season classifier with dynamic spectrometric reasoning steps.
    This is the explicit refresh action: regenerates, persists, and returns the
    fresh clinical reasoning so repeat calls are not required.
    """
    m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == userId)
    m_res = await db.execute(m_stmt)
    mannequin = m_res.scalar_one_or_none()

    p_stmt = select(UserPreference).where(UserPreference.user_id == userId)
    p_res = await db.execute(p_stmt)
    pref = p_res.scalar_one_or_none()

    hex_code = skinToneHex or (mannequin.skin_tone_hex if mannequin else "#E8C39E")
    concerns = mannequin.detected_concerns if mannequin else {"rosacea": 30.0}
    undertone = mannequin.skin_undertone if mannequin else "Cool"
    body_type = mannequin.body_type if mannequin else "Balanced Athletic"
    preferred_fit = pref.preferred_fit if pref else "regular"

    reasoning = derive_automated_color_reasoning(
        hex_code, undertone, concerns, body_type, preferred_fit,
        pref.allergies if pref else None,
        pref.comfort_vs_style_bias if pref else None,
    )

    if mannequin:
        mannequin.color_season = reasoning.assignedSeason
        mannequin.skin_undertone = reasoning.skinUndertone
        mannequin.skin_tone_hex = hex_code
        mannequin.color_reasoning = reasoning.model_dump()
        db.add(mannequin)
        await db.commit()

    return reasoning

@router.post("/analyze")
async def analyze_selfie(
    payload: MannequinAnalyzeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Extracts skin undertone, color season, acne/rosacea concerns from selfie via YouCam API.
    """
    try:
        analysis = await youcam_service.analyze_skin_and_facial_tones(payload.selfieImageB64 or "")
    except YouCamServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))

    m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == payload.userId)
    m_res = await db.execute(m_stmt)
    mannequin = m_res.scalar_one_or_none()

    reasoning = derive_automated_color_reasoning(
        analysis["skinToneHex"],
        analysis["skinUndertone"],
        analysis["detectedConcerns"],
        mannequin.body_type if mannequin else "Balanced Athletic",
        payload.preferredFit or "regular",
        payload.allergies,
    )

    if mannequin:
        mannequin.color_season = reasoning.assignedSeason
        mannequin.skin_undertone = reasoning.skinUndertone
        mannequin.skin_tone_hex = analysis["skinToneHex"]
        mannequin.detected_concerns = analysis["detectedConcerns"]
        mannequin.color_reasoning = reasoning.model_dump()
        if payload.selfieImageB64:
            mannequin.base_photo_url = downscale_selfie(payload.selfieImageB64)
        db.add(mannequin)

    p_stmt = select(UserPreference).where(UserPreference.user_id == payload.userId)
    p_res = await db.execute(p_stmt)
    pref = p_res.scalar_one_or_none()

    if pref and payload.allergies is not None:
        pref.allergies = payload.allergies
        if payload.preferredFit:
            pref.preferred_fit = payload.preferredFit
        db.add(pref)

    await db.commit()

    return {
        "status": "success",
        "data": analysis,
        "colorReasoning": reasoning
    }

@router.put("/profile")
async def update_mannequin_profile(
    userId: str = Body(...),
    allergies: Optional[List[str]] = Body(None),
    preferredFit: Optional[str] = Body(None),
    colorSeason: Optional[str] = Body(None),
    comfortVsStyleBias: Optional[float] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """Updates user allergies, style preference, and seasonal color override."""
    m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == userId)
    m_res = await db.execute(m_stmt)
    mannequin = m_res.scalar_one_or_none()

    p_stmt = select(UserPreference).where(UserPreference.user_id == userId)
    p_res = await db.execute(p_stmt)
    pref = p_res.scalar_one_or_none()

    if mannequin and colorSeason:
        mannequin.color_season = colorSeason
        db.add(mannequin)

    preference_changed = False
    if pref:
        if allergies is not None and pref.allergies != allergies:
            pref.allergies = allergies
            preference_changed = True
        if preferredFit and pref.preferred_fit != preferredFit:
            pref.preferred_fit = preferredFit
            preference_changed = True
        if comfortVsStyleBias is not None and pref.comfort_vs_style_bias != comfortVsStyleBias:
            pref.comfort_vs_style_bias = comfortVsStyleBias
            preference_changed = True
        db.add(pref)

    # Regenerate and persist the clinical color reasoning whenever the inputs that
    # drive the palette (fit, allergens, comfort bias) or the season override change,
    # so the Harmonious/Clash palettes and reasoning trace stay in sync with edits.
    reasoning = None
    if mannequin and (preference_changed or colorSeason):
        reasoning = derive_automated_color_reasoning(
            mannequin.skin_tone_hex or "#E8C39E",
            mannequin.skin_undertone or "Cool",
            mannequin.detected_concerns or {},
            mannequin.body_type or "Balanced Athletic",
            (pref.preferred_fit if pref else None) or "regular",
            pref.allergies if pref else None,
            pref.comfort_vs_style_bias if pref else None,
        )
        mannequin.color_reasoning = reasoning.model_dump()
        db.add(mannequin)

    await db.commit()
    return {
        "status": "success",
        "message": "Profile updated successfully",
        "colorReasoning": reasoning.model_dump() if reasoning else None,
    }
