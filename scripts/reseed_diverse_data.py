import asyncio
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from backend.app.database import AsyncSessionLocal, init_db, engine, Base
from backend.app.models import User, DigitalMannequin, UserPreference, TryOnSession, FeedbackLog, GarmentItem
from backend.app.config import settings
from backend.app.services.garment_images import real_garment_image_url, menswear_image_url
from backend.app.services.user_photos import face_photo_url, fullbody_photo_url
from sqlalchemy import select, delete

# scripts/reseed_diverse_data.py -> repo root
ROOT_DIR = Path(__file__).resolve().parent.parent

async def seed_diverse_data():
    await init_db()

    async with AsyncSessionLocal() as session:
        # Clear existing try_on_sessions and feedback_logs to purge repetitive merino turtlenecks
        await session.execute(delete(FeedbackLog))
        await session.execute(delete(TryOnSession))
        await session.commit()

        # Diverse user definitions
        users_data = [
            {
                "id": "usr_94b3a8c1",
                "email": "elena.vance@veniceluxury.it",
                "name": "Elena Vance",
                "gender": "female",
                "season": "Cool Winter",
                "undertone": "Cool",
                "skin_hex": "#E8C39E",
                "concerns": {"rosacea": 38.5, "sensitivity": 45.0}
            },
            {
                "id": "usr_astrid_holm",
                "email": "astrid.holm@nordicweaves.se",
                "name": "Astrid Holm",
                "gender": "female",
                "season": "Warm Autumn",
                "undertone": "Warm",
                "skin_hex": "#D8A47F",
                "concerns": {"oiliness": 40.0, "acne": 10.0}
            },
            {
                "id": "usr_camilla_rossi",
                "email": "camilla.rossi@milanluxury.it",
                "name": "Camilla Rossi",
                "gender": "female",
                "season": "Cool Winter",
                "undertone": "Cool",
                "skin_hex": "#F0D5BE",
                "concerns": {"rosacea": 25.0}
            },
            {
                "id": "usr_lars_hedlund",
                "email": "lars.hedlund@stockholmdesign.se",
                "name": "Lars Hedlund",
                "gender": "male",
                "season": "Warm Autumn",
                "undertone": "Warm",
                "skin_hex": "#E2B38A",
                "concerns": {"sensitivity": 65.0}
            },
            {
                "id": "usr_sofia_berg",
                "email": "sofia.berg@gothenburg.se",
                "name": "Sofia Berg",
                "gender": "female",
                "season": "Cool Summer",
                "undertone": "Cool",
                "skin_hex": "#F4D9C8",
                "concerns": {"rosacea": 18.0}
            },
            {
                "id": "usr_marco_bellini",
                "email": "marco.bellini@firenze.it",
                "name": "Marco Bellini",
                "gender": "male",
                "season": "Deep Autumn",
                "undertone": "Warm",
                "skin_hex": "#C98E64",
                "concerns": {"sensitivity": 30.0}
            }
        ]

        for u in users_data:
            existing = await session.get(User, u["id"])
            if not existing:
                user = User(
                    id=u["id"],
                    email=u["email"],
                    name=u["name"],
                    avatar_url=face_photo_url(u["id"], u.get("gender")),
                    gender=u.get("gender", "female")
                )
                session.add(user)
                mannequin = DigitalMannequin(
                    user_id=u["id"],
                    base_photo_url=fullbody_photo_url(u["id"], u.get("gender")),
                    color_season=u["season"],
                    skin_undertone=u["undertone"],
                    skin_tone_hex=u["skin_hex"],
                    detected_concerns=u["concerns"],
                    body_type="Balanced Athletic"
                )
                session.add(mannequin)
                pref = UserPreference(
                    user_id=u["id"],
                    allergies=["wool", "rough_synthetic"] if "hedlund" in u["id"] or "vance" in u["id"] else [],
                    preferred_fit="regular",
                    comfort_vs_style_bias=0.6
                )
                session.add(pref)

        await session.commit()

        # Diverse catalog of garment sessions
        garment_templates = [
            # Venice Luxury Atelier garments
            {
                "sku": "TOP-SLK-001",
                "name": "Midnight Mulberry Silk Blouse",
                "vendor": "vendor_venice",
                "user_id": "usr_94b3a8c1",
                "price": 110.0,
                "color_hex": "#1C2D42",
                "material": {"silk": 1.0},
                "fit_score": 96.0,
                "color_score": 98.0,
                "fabric_score": 95.0,
                "keep_score": 96.4,
                "action": "KEPT",
                "reason": None,
                "note": "Exquisite drape, zero static, perfectly complements cool winter undertones."
            },
            {
                "sku": "DRS-CRP-002",
                "name": "Emerald Crepe Evening Gown",
                "vendor": "vendor_venice",
                "user_id": "usr_camilla_rossi",
                "price": 145.0,
                "color_hex": "#0D5C3A",
                "material": {"viscose_crepe": 0.85, "silk": 0.15},
                "fit_score": 93.0,
                "color_score": 94.0,
                "fabric_score": 90.0,
                "keep_score": 92.5,
                "action": "KEPT",
                "reason": None,
                "note": "Flawless structured waist and vibrant jewel tone."
            },
            {
                "sku": "BLZ-CSH-003",
                "name": "Structured Cashmere-Wool Blazer",
                "vendor": "vendor_venice",
                "user_id": "usr_marco_bellini",
                "price": 185.0,
                "color_hex": "#2B2B2B",
                "material": {"cashmere": 0.70, "wool": 0.30},
                "fit_score": 85.0,
                "color_score": 90.0,
                "fabric_score": 82.0,
                "keep_score": 86.0,
                "action": "RETURNED",
                "reason": "FIT_TOO_TIGHT",
                "note": "Slight shoulder taper restriction during formal dinner agenda."
            },
            {
                "sku": "TOP-SAT-004",
                "name": "Champagne Silk Camisole",
                "vendor": "vendor_venice",
                "user_id": "usr_94b3a8c1",
                "price": 78.0,
                "color_hex": "#F5E6C8",
                "material": {"silk": 0.95, "elastane": 0.05},
                "fit_score": 98.0,
                "color_score": 91.0,
                "fabric_score": 98.0,
                "keep_score": 95.8,
                "action": "KEPT",
                "reason": None,
                "note": "Ultra-soft hypoallergenic base layer."
            },
            {
                "sku": "DRS-SLK-005",
                "name": "Venetian Velvet Cocktail Wrap",
                "vendor": "vendor_venice",
                "user_id": "usr_camilla_rossi",
                "price": 160.0,
                "color_hex": "#581825",
                "material": {"silk_velvet": 0.80, "cupro": 0.20},
                "fit_score": 89.0,
                "color_score": 96.0,
                "fabric_score": 84.0,
                "keep_score": 90.0,
                "action": "KEPT",
                "reason": None,
                "note": "Lush sheen and deep burgundy tone for gala event."
            },

            # Nordic Organic Weaves garments
            {
                "sku": "TOP-LNN-001",
                "name": "Seafoam Pure French Linen Tunic",
                "vendor": "vendor_nordic",
                "user_id": "usr_astrid_holm",
                "price": 89.0,
                "color_hex": "#4A7C72",
                "material": {"french_linen": 1.0},
                "fit_score": 94.0,
                "color_score": 95.0,
                "fabric_score": 96.0,
                "keep_score": 94.8,
                "action": "KEPT",
                "reason": None,
                "note": "Breathable relaxed silhouette for warm autumn lifestyle."
            },
            {
                "sku": "SWT-COT-002",
                "name": "Oatmeal Organic Cotton Crewneck",
                "vendor": "vendor_nordic",
                "user_id": "usr_sofia_berg",
                "price": 75.0,
                "color_hex": "#D9CBB6",
                "material": {"organic_cotton": 0.95, "hemp": 0.05},
                "fit_score": 98.0,
                "color_score": 96.0,
                "fabric_score": 99.0,
                "keep_score": 97.6,
                "action": "KEPT",
                "reason": None,
                "note": "Exceptionally soft unbleached cotton knit."
            },
            {
                "sku": "TOP-WOL-003",
                "name": "Merino Wool Ribbed Turtleneck",
                "vendor": "vendor_nordic",
                "user_id": "usr_lars_hedlund",
                "price": 92.0,
                "color_hex": "#4A3B32",
                "material": {"merino_wool": 0.85, "polyamide": 0.15},
                "fit_score": 72.0,
                "color_score": 88.0,
                "fabric_score": 45.0,
                "keep_score": 58.4,
                "action": "RETURNED",
                "reason": "FABRIC_ITCHY",
                "note": "Triggered neck friction and skin itch sensitivity."
            },
            {
                "sku": "JKT-SHP-004",
                "name": "Recycled Wool Chore Overshirt",
                "vendor": "vendor_nordic",
                "user_id": "usr_astrid_holm",
                "price": 120.0,
                "color_hex": "#5C4A3E",
                "material": {"recycled_wool": 0.60, "organic_cotton": 0.40},
                "fit_score": 79.0,
                "color_score": 90.0,
                "fabric_score": 75.0,
                "keep_score": 81.0,
                "action": "KEPT",
                "reason": None,
                "note": "Comfortable overshirt layer for transitional weather."
            },
            {
                "sku": "PNT-LNN-005",
                "name": "Sandstone Relaxed Linen Trousers",
                "vendor": "vendor_nordic",
                "user_id": "usr_lars_hedlund",
                "price": 95.0,
                "color_hex": "#C8B29B",
                "material": {"french_linen": 0.90, "cotton": 0.10},
                "fit_score": 92.0,
                "color_score": 93.0,
                "fabric_score": 94.0,
                "keep_score": 93.0,
                "action": "KEPT",
                "reason": None,
                "note": "Effortless casual fit with optimal airflow."
            },
            {
                "sku": "DRS-SYN-006",
                "name": "Crimson Crepe Slip Dress",
                "vendor": "vendor_venice",
                "user_id": "usr_astrid_holm",
                "price": 98.0,
                "color_hex": "#A81C2E",
                "material": {"polyester_crepe": 1.0},
                "fit_score": 78.0,
                "color_score": 52.0,
                "fabric_score": 68.0,
                "keep_score": 62.8,
                "action": "RETURNED",
                "reason": "COLOR_UNFLATTERING",
                "note": "Strong chromatic clash against warm autumn undertones."
            }
        ]

        now = datetime.utcnow()

        # Upsert catalog garments for every session SKU so retail prices resolve
        # from the real DB when computing saved-merchandise analytics.
        sku_category = {
            "TOP": "tops", "SWT": "tops", "DRS": "dresses",
            "BLZ": "outerwear", "JKT": "outerwear", "PNT": "bottoms",
        }
        for template in garment_templates:
            sku = template["sku"]
            g_stmt = select(GarmentItem).where(GarmentItem.sku == sku)
            g_res = await session.execute(g_stmt)
            garment = g_res.scalar_one_or_none()
            category = sku_category.get(sku.split("-")[0], "tops")
            brand = "Venice Luxury Atelier" if template["vendor"] == "vendor_venice" else "Nordic Organic Weaves"
            if not garment:
                garment = GarmentItem(
                    id=str(uuid.uuid4()),
                    sku=sku,
                    name=template["name"],
                    category=category,
                    brand=brand,
                    price=template["price"],
                    color_hex=template["color_hex"],
                    materials=template["material"],
                    image_url=real_garment_image_url(category, template["color_hex"], template["sku"]),
                    description=template["note"],
                    formality_index=0.6
                )
                session.add(garment)
            else:
                garment.name = template["name"]
                garment.category = category
                garment.brand = brand
                garment.price = template["price"]
                garment.color_hex = template["color_hex"]
                garment.materials = template["material"]
                garment.image_url = real_garment_image_url(category, template["color_hex"], template["sku"])
                session.add(garment)

        # Also upsert the base catalog (seed_garments.json) so every SKU the UI
        # can recommend (calendar, admin inventory, clusters) exists in the DB.
        base_catalog_path = ROOT_DIR / "data" / "seed_garments.json"
        if base_catalog_path.exists():
            try:
                base_catalog = json.loads(base_catalog_path.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"[Reseed] Error reading base catalog: {e}")
                base_catalog = []
            for g_data in base_catalog:
                sku = g_data["sku"]
                g_stmt = select(GarmentItem).where(GarmentItem.sku == sku)
                g_res = await session.execute(g_stmt)
                garment = g_res.scalar_one_or_none()
                img = g_data.get("image_url") or settings.DEFAULT_GARMENT_IMAGE_URL
                if img.startswith("data:image"):
                    img = real_garment_image_url(g_data.get("category", "tops"), g_data.get("color_hex", "#2C3E50"), sku)
                if not garment:
                    garment = GarmentItem(
                        id=str(uuid.uuid4()),
                        sku=sku,
                        name=g_data["name"],
                        category=g_data["category"],
                        brand=g_data.get("brand", "VeraFit Collection"),
                        price=g_data.get("price", 99.0),
                        color_hex=g_data["color_hex"],
                        materials=g_data["materials"],
                        image_url=img,
                        description=g_data.get("description", ""),
                        formality_index=g_data.get("formality_index", 0.0)
                    )
                    session.add(garment)
                else:
                    garment.price = g_data.get("price", garment.price)
                    if not garment.image_url or garment.image_url.startswith("data:image"):
                        garment.image_url = img
                    session.add(garment)

        # Seed 40 rich historical try-ons across the past 24 hours
        for idx in range(40):
            template = garment_templates[idx % len(garment_templates)]
            hours_ago = (idx * 0.5) % 24
            session_time = now - timedelta(hours=hours_ago, minutes=(idx * 7) % 60)

            session_id = f"sess_seed_{idx:03d}"
            sku_prefix = template["sku"].split("-")[0]
            if template["user_id"] in ("usr_lars_hedlund", "usr_marco_bellini"):
                render_img = menswear_image_url(
                    sku_category.get(sku_prefix, "tops"), template["color_hex"], template["sku"]
                )
            else:
                render_img = real_garment_image_url(
                    sku_category.get(sku_prefix, "tops"), template["color_hex"], template["sku"]
                )
            try_on = TryOnSession(
                id=session_id,
                user_id=template["user_id"],
                garment_sku=template["sku"],
                garment_name=template["name"],
                garment_material=template["material"],
                garment_color_hex=template["color_hex"],
                rendered_vto_url=render_img,
                vto_renders=[render_img, render_img, render_img],
                diff_heatmap_url=None,
                fit_repeatability_score=template["fit_score"],
                color_harmony_score=template["color_score"],
                fabric_safety_score=template["fabric_score"],
                keep_probability_score=template["keep_score"],
                verdict="STRONG_BUY" if template["keep_score"] >= 80 else ("LEAN_BUY" if template["keep_score"] >= 70 else "HIGH_RETURN_RISK"),
                diagnostics={
                    "ssimVariance": 0.04,
                    "deltaE": 2.1,
                    "skinToneMatch": "OPTIMAL",
                    "agendaFit": "Evening Gala"
                },
                ai_explanation=f"Evaluated {template['name']} ({template['sku']}) with {template['keep_score']}% style certainty.",
                created_at=session_time
            )
            session.add(try_on)

            if template["action"]:
                feedback = FeedbackLog(
                    id=f"fb_seed_{idx:03d}",
                    user_id=template["user_id"],
                    session_id=session_id,
                    action_taken=template["action"],
                    return_reason=template["reason"],
                    user_notes=template["note"],
                    created_at=session_time + timedelta(minutes=15)
                )
                session.add(feedback)

        await session.commit()
        print("✅ Successfully reseeded database with diverse multi-vendor garments and return reasons!")

if __name__ == "__main__":
    asyncio.run(seed_diverse_data())
