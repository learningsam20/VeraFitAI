from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.math_engine.color_engine import evaluate_color_harmony
from backend.app.agents.fabric_agent import ALLERGEN_MAP, FABRIC_PROFILES
from backend.app.models import GarmentItem
from backend.app.schemas import GarmentPayload


def _style_compatibility(preferred_fit: Optional[str], formality_index: float) -> Tuple[float, Optional[str]]:
    """Scores fit-preference vs garment formality. Returns (score, exclusion_reason_or_None)."""
    fit = (preferred_fit or "regular").lower()
    formality = formality_index or 0.0
    if fit in ("tight", "tailored"):
        if formality >= 0.6:
            return 90.0, None
        if formality <= 0.35:
            return 55.0, f"Tailored-fit preference: too casual for structured dressing (formality {formality:.1f})."
        return 75.0, None
    if fit == "oversized":
        if formality <= 0.4:
            return 90.0, None
        if formality >= 0.7:
            return 50.0, f"Oversized-fit preference: too formal for relaxed silhouettes (formality {formality:.1f})."
        return 75.0, None
    return 85.0, None


def _fabric_compatibility(
    materials: Dict[str, float],
    allergies: Optional[List[str]],
    concerns: Dict[str, Any],
) -> Tuple[float, List[str], bool]:
    """Scores fabric-to-skin safety. Returns (score, reasons, excluded)."""
    reasons: List[str] = []
    allergy_detected = False
    for mat_name, pct in (materials or {}).items():
        if pct <= 0:
            continue
        mat_clean = mat_name.lower().replace(" ", "_")
        for allergy in allergies or []:
            al = allergy.lower().strip()
            keywords = ALLERGEN_MAP.get(al, [al])
            if any(kw in mat_clean for kw in keywords):
                allergy_detected = True
                reasons.append(
                    f"Contains {mat_name.replace('_', ' ').title()} — matches your {allergy} allergy."
                )

    total_friction = total_breath = total_w = 0.0
    for mat_name, pct in (materials or {}).items():
        key = mat_name.lower().replace(" ", "_")
        profile = FABRIC_PROFILES.get(key, {"friction": 0.4, "breathability": 0.6, "roughness": 0.3})
        total_friction += profile["friction"] * pct
        total_breath += profile["breathability"] * pct
        total_w += pct
    if total_w > 0:
        avg_friction = total_friction / total_w
        avg_breath = total_breath / total_w
    else:
        avg_friction, avg_breath = 0.3, 0.8

    score = 100.0
    rosacea = float(concerns.get("rosacea", 0.0))
    sensitivity = float(concerns.get("sensitivity", 0.0))
    acne = float(concerns.get("acne", 0.0))

    if rosacea > 25.0 and avg_friction > 0.40:
        score -= (rosacea / 100.0) * (avg_friction * 35.0)
        reasons.append(f"Rough fabric may aggravate rosacea (friction {int(avg_friction * 100)}%).")
    if (acne > 20.0 or sensitivity > 40.0) and avg_breath < 0.50:
        score -= ((sensitivity + acne) / 200.0) * ((1.0 - avg_breath) * 30.0)
        reasons.append("Low breathability may trap moisture against sensitive skin.")
    if allergy_detected:
        score = min(score, 45.0)

    score = round(max(10.0, min(100.0, score)), 1)
    excluded = allergy_detected or score < 55.0
    return score, reasons, excluded


def score_garment_compatibility(
    garment: GarmentItem,
    color_season: str,
    preferred_fit: Optional[str],
    allergies: Optional[List[str]],
    concerns: Dict[str, Any],
) -> Dict[str, Any]:
    """Runs the color/style/fabric deterministic agents over one catalog garment."""
    color = evaluate_color_harmony(garment.color_hex, color_season)
    color_score = float(color["color_harmony_score"])

    reasons: List[str] = []
    excluded = False
    if color_score < 60.0:
        excluded = True
        reasons.append(color["color_diagnostics"])

    style_score, style_reason = _style_compatibility(preferred_fit, garment.formality_index or 0.0)
    if style_reason:
        excluded = True
        reasons.append(style_reason)

    fabric_score, fabric_reasons, fabric_excluded = _fabric_compatibility(
        garment.materials, allergies, concerns
    )
    if fabric_excluded:
        excluded = True
        reasons.extend(fabric_reasons)

    return {
        "garment": GarmentPayload(
            sku=garment.sku,
            name=garment.name,
            colorHex=garment.color_hex,
            materials=garment.materials,
            category=garment.category,
            brand=garment.brand,
            price=garment.price,
            imageUrl=garment.image_url,
            formalityIndex=garment.formality_index,
        ),
        "colorScore": color_score,
        "colorIndicator": color["indicator"],
        "colorDiagnostic": color["color_diagnostics"],
        "styleScore": style_score,
        "fabricScore": fabric_score,
        "verdict": "excluded" if excluded else "compatible",
        "reasons": reasons,
    }


async def scan_catalog_compatibility(
    db: AsyncSession,
    color_season: str = "Cool Winter",
    preferred_fit: Optional[str] = "regular",
    allergies: Optional[List[str]] = None,
    concerns: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Scores every catalog garment against the supplied profile context."""
    stmt = select(GarmentItem)
    res = await db.execute(stmt)
    garments = res.scalars().all()
    concerns = concerns or {}
    return [
        score_garment_compatibility(g, color_season, preferred_fit, allergies, concerns)
        for g in garments
    ]
