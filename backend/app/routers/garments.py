import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import GarmentItem, DigitalMannequin, User, UserPreference
from backend.app.schemas import GarmentPayload, GarmentCompatibilityResponse, GarmentCompatibilityData
from backend.app.agents.compatibility import score_garment_compatibility
from backend.app.services.garment_images import menswear_image_url
from backend.app.config import settings

router = APIRouter(prefix="/garments", tags=["Garments"])

@router.get("", response_model=List[GarmentPayload])
async def list_garments(
    userId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Lists preloaded garment catalog for instant virtual try-on.

    When a ``userId`` is provided and that user is male, garment imagery is
    swapped to the men's product photos so the catalog reads gender-correctly.
    """
    is_male = False
    if userId:
        user_res = await db.execute(select(User).where(User.id == userId))
        user = user_res.scalar_one_or_none()
        is_male = bool(user and (user.gender or "").lower() == "male")

    stmt = select(GarmentItem)
    res = await db.execute(stmt)
    garments = res.scalars().all()

    return [
        GarmentPayload(
            sku=g.sku,
            name=g.name,
            colorHex=g.color_hex,
            materials=g.materials,
            category=g.category,
            brand=g.brand,
            price=g.price,
            imageUrl=menswear_image_url(g.category, g.color_hex, g.sku) if is_male else g.image_url,
            formalityIndex=g.formality_index
        )
        for g in garments
    ]

@router.get("/compatibility", response_model=GarmentCompatibilityResponse)
async def garment_compatibility(
    userId: str = "usr_94b3a8c1",
    db: AsyncSession = Depends(get_db)
):
    """
    Scores every catalog garment against the user's profile using the color,
    style/fit, and fabric-safety deterministic agents. Garments that clash with
    the user's color season, fit preference, or allergens are flagged
    `excluded` so the catalog UI can hide them by default with a
    "Show N Excluded" reveal option.
    """
    m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == userId)
    m_res = await db.execute(m_stmt)
    mannequin = m_res.scalar_one_or_none()

    p_stmt = select(UserPreference).where(UserPreference.user_id == userId)
    p_res = await db.execute(p_stmt)
    pref = p_res.scalar_one_or_none()

    color_season = mannequin.color_season if mannequin else "Cool Winter"
    preferred_fit = pref.preferred_fit if pref else "regular"
    allergies = list(pref.allergies or []) if pref else []
    concerns = mannequin.detected_concerns if mannequin else {}

    g_stmt = select(GarmentItem)
    g_res = await db.execute(g_stmt)
    garments = g_res.scalars().all()

    results = [
        GarmentCompatibilityData(
            **score_garment_compatibility(g, color_season, preferred_fit, allergies, concerns)
        )
        for g in garments
    ]
    results.sort(key=lambda r: (0 if r.verdict == "compatible" else 1, -r.colorScore))

    compatible_count = sum(1 for r in results if r.verdict == "compatible")

    return GarmentCompatibilityResponse(
        colorSeason=color_season,
        preferredFit=preferred_fit,
        allergies=allergies,
        compatibleCount=compatible_count,
        excludedCount=len(results) - compatible_count,
        results=results,
    )

@router.post("", response_model=GarmentPayload)
async def create_custom_garment(
    payload: GarmentPayload,
    db: AsyncSession = Depends(get_db)
):
    """Adds a custom garment (with custom materials and color hex) to the session catalogue."""
    sku = payload.sku or f"CUSTOM-{uuid.uuid4().hex[:6].upper()}"
    garment = GarmentItem(
        id=str(uuid.uuid4()),
        sku=sku,
        name=payload.name,
        category=payload.category,
        brand=payload.brand or "Custom Upload",
        price=payload.price or 99.0,
        color_hex=payload.colorHex,
        materials=payload.materials,
        image_url=payload.imageUrl or settings.DEFAULT_GARMENT_IMAGE_URL,
        description="Custom imported item for purchase certainty evaluation",
        formality_index=payload.formalityIndex or 0.0
    )
    db.add(garment)
    await db.commit()

    return GarmentPayload(
        sku=garment.sku,
        name=garment.name,
        colorHex=garment.color_hex,
        materials=garment.materials,
        category=garment.category,
        brand=garment.brand,
        price=garment.price,
        imageUrl=garment.image_url,
        formalityIndex=garment.formality_index
    )
