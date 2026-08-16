import json
import uuid
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from backend.app.models import User, DigitalMannequin, UserPreference, GarmentItem, TryOnSession
from backend.app.config import settings
from backend.app.services.garment_images import real_garment_image_url
from backend.app.services.user_photos import (
    face_photo_url,
    fullbody_photo_url,
    gender_of_photo_url,
    is_known_face_url,
    is_known_fullbody_url,
    normalize_gender,
)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = ROOT_DIR / "data"
GARMENTS_FILE = DATA_DIR / "seed_garments.json"
USERS_FILE = DATA_DIR / "seed_users.json"

DEFAULT_USER_ID = "usr_94b3a8c1"

# Gender for the known demo cohort (matches reseed_diverse_data.py personas).
USER_GENDER = {
    "usr_94b3a8c1": "female",      # Elena Vance (default shopper)
    "usr_astrid_holm": "female",   # Astrid Holm
    "usr_camilla_rossi": "female", # Camilla Rossi
    "usr_lars_hedlund": "male",    # Lars Hedlund
    "usr_sofia_berg": "female",    # Sofia Berg
    "usr_marco_bellini": "male",   # Marco Bellini
}

# Display names matching the frontend personas (seed_users.json used a generic
# "Alex Morgan" for the default shopper).
PERSONA_NAMES = {
    "usr_94b3a8c1": "Elena Vance",
    "usr_astrid_holm": "Astrid Holm",
    "usr_camilla_rossi": "Camilla Rossi",
    "usr_lars_hedlund": "Lars Hedlund",
    "usr_sofia_berg": "Sofia Berg",
    "usr_marco_bellini": "Marco Bellini",
}

def load_seed_garments():
    if GARMENTS_FILE.exists():
        try:
            with open(GARMENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[SeedData] Error reading {GARMENTS_FILE}: {e}")
    return []

def load_seed_users():
    if USERS_FILE.exists():
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[SeedData] Error reading {USERS_FILE}: {e}")
    return []

async def _ensure_user_gender_column(db: AsyncSession):
    """Lightweight SQLite migration: adds the users.gender column if missing."""
    try:
        await db.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR DEFAULT 'female'"))
        await db.commit()
    except Exception:
        await db.rollback()


async def seed_database(db: AsyncSession, force_reset: bool = False):
    """Populates initial demo user, mannequin, preferences, and garments from data folder."""
    await _ensure_user_gender_column(db)

    user_seeds = load_seed_users()
    garment_seeds = load_seed_garments()

    # 1. Seed Users, Mannequins & Preferences
    for u_entry in user_seeds:
        u_data = u_entry["user"]
        user_stmt = select(User).where(User.id == u_data["id"])
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        gender = USER_GENDER.get(u_data["id"], u_data.get("gender", "female"))

        if not user:
            user = User(
                id=u_data["id"],
                email=u_data["email"],
                name=u_data.get("name"),
                avatar_url=face_photo_url(u_data["id"], gender),
                gender=gender,
            )
            db.add(user)
            await db.flush()
        elif force_reset:
            user.email = u_data["email"]
            user.name = u_data.get("name")
            user.avatar_url = face_photo_url(u_data["id"], gender)
            user.gender = gender
            db.add(user)

        # Mannequin (prefer a gender-appropriate full-body photo so garment
        # draping renders on a whole-body shot; ignore headshot URLs).
        m_data = u_entry.get("mannequin", {})
        m_stmt = select(DigitalMannequin).where(DigitalMannequin.user_id == user.id)
        m_res = await db.execute(m_stmt)
        mannequin = m_res.scalar_one_or_none()
        m_photo = m_data.get("base_photo_url") or ""
        if not m_photo or is_known_face_url(m_photo):
            m_photo = fullbody_photo_url(user.id, gender)
        if not mannequin:
            mannequin = DigitalMannequin(
                id=str(uuid.uuid4()),
                user_id=user.id,
                base_photo_url=m_photo,
                color_season=m_data.get("color_season", "Cool Winter"),
                skin_undertone=m_data.get("skin_undertone", "Cool"),
                skin_tone_hex=m_data.get("skin_tone_hex", "#E8C39E"),
                detected_concerns=m_data.get("detected_concerns", {}),
                body_type=m_data.get("body_type", "Balanced Athletic")
            )
            db.add(mannequin)
        elif force_reset:
            mannequin.base_photo_url = m_photo
            mannequin.color_season = m_data.get("color_season", mannequin.color_season)
            mannequin.skin_undertone = m_data.get("skin_undertone", mannequin.skin_undertone)
            mannequin.skin_tone_hex = m_data.get("skin_tone_hex", mannequin.skin_tone_hex)
            mannequin.detected_concerns = m_data.get("detected_concerns", mannequin.detected_concerns)
            db.add(mannequin)

        # Preferences
        p_data = u_entry.get("preferences", {})
        p_stmt = select(UserPreference).where(UserPreference.user_id == user.id)
        p_res = await db.execute(p_stmt)
        pref = p_res.scalar_one_or_none()
        if not pref:
            pref = UserPreference(
                id=str(uuid.uuid4()),
                user_id=user.id,
                allergies=p_data.get("allergies", ["wool", "nickel"]),
                preferred_fit=p_data.get("preferred_fit", "regular"),
                comfort_vs_style_bias=p_data.get("comfort_vs_style_bias", 0.6),
                theme_preference=p_data.get("theme_preference", "dark"),
                historical_bias=p_data.get("historical_bias", {})
            )
            db.add(pref)
        elif force_reset:
            pref.allergies = p_data.get("allergies", pref.allergies)
            pref.preferred_fit = p_data.get("preferred_fit", pref.preferred_fit)
            pref.comfort_vs_style_bias = p_data.get("comfort_vs_style_bias", pref.comfort_vs_style_bias)
            pref.historical_bias = p_data.get("historical_bias", pref.historical_bias)
            db.add(pref)

    # 2. Seed Garments
    for g_data in garment_seeds:
        g_stmt = select(GarmentItem).where(GarmentItem.sku == g_data["sku"])
        g_res = await db.execute(g_stmt)
        garment = g_res.scalar_one_or_none()
        if not garment:
            garment = GarmentItem(
                id=str(uuid.uuid4()),
                sku=g_data["sku"],
                name=g_data["name"],
                category=g_data["category"],
                brand=g_data.get("brand", "VeraFit Collection"),
                price=g_data.get("price", 99.0),
                color_hex=g_data["color_hex"],
                materials=g_data["materials"],
                image_url=g_data.get("image_url") or real_garment_image_url(g_data["category"], g_data["color_hex"], g_data["sku"]),
                description=g_data.get("description", ""),
                formality_index=g_data.get("formality_index", 0.0)
            )
            db.add(garment)
        elif force_reset:
            garment.name = g_data["name"]
            garment.category = g_data["category"]
            garment.brand = g_data.get("brand", garment.brand)
            garment.price = g_data.get("price", garment.price)
            garment.color_hex = g_data["color_hex"]
            garment.materials = g_data["materials"]
            garment.image_url = g_data.get("image_url") or real_garment_image_url(g_data["category"], g_data["color_hex"], g_data["sku"])
            garment.description = g_data.get("description", garment.description)
            garment.formality_index = g_data.get("formality_index", garment.formality_index)
            db.add(garment)

    # Backfill: replace synthetic PIL data-URI garment images with real fabric
    # product photos so the marketplace shows actual fabrics instead of flat
    # vector illustrations (runs on every boot; only touches data: URIs).
    existing_garments = (await db.execute(select(GarmentItem))).scalars().all()
    for g in existing_garments:
        if g.image_url and g.image_url.startswith("data:image"):
            g.image_url = real_garment_image_url(g.category, g.color_hex, g.sku)
            db.add(g)

    # Backfill: ensure every user has a gender, a gender-appropriate headshot
    # avatar, and a gender-appropriate full-body mannequin photo so the fitting
    # room / VTO drapes garments on each user's own whole-body photo. User
    # uploaded selfies (data: URIs) and custom photo URLs are never overwritten.
    m_res = await db.execute(
        select(DigitalMannequin, User).join(User, DigitalMannequin.user_id == User.id)
    )
    for mannequin, user in m_res.all():
        gender = normalize_gender(USER_GENDER.get(user.id) or getattr(user, "gender", None))
        if gender == "neutral":
            gender = "female"

        if (user.gender or "") != gender:
            user.gender = gender
            db.add(user)

        # Align persona display names so the DB (fleet/admin/history) matches
        # the frontend demo personas.
        persona_name = PERSONA_NAMES.get(user.id)
        if persona_name and (user.name or "") != persona_name:
            user.name = persona_name
            db.add(user)

        # Avatar: assign each known cohort user a distinct, gender-appropriate
        # headshot (reassigning pool photos fixes historic duplicates). Custom
        # avatars and uploaded selfies (data: URIs) are never overwritten.
        if (
            (user.id in USER_GENDER and is_known_face_url(user.avatar_url))
            or not user.avatar_url
            or user.avatar_url == settings.DEFAULT_AVATAR_URL
            or (gender_of_photo_url(user.avatar_url) or None) not in (None, gender)
        ):
            user.avatar_url = face_photo_url(user.id, gender)
            db.add(user)

        # Mannequin photo: full-body, gender-appropriate. For the known cohort,
        # always set the user's deterministic full-body pick so photos stay
        # distinct per user. Uploaded selfies (data: URIs) and custom photo
        # URLs that aren't from our pools are never overwritten.
        url = mannequin.base_photo_url or ""
        if user.id in USER_GENDER:
            if not url.startswith("data:") and (is_known_face_url(url) or is_known_fullbody_url(url)):
                mannequin.base_photo_url = fullbody_photo_url(user.id, gender)
                db.add(mannequin)
        elif (
            not url
            or url == settings.DEFAULT_MANNEQUIN_PHOTO_URL
            or is_known_face_url(url)
            or (gender_of_photo_url(url) or None) not in (None, gender)
        ):
            mannequin.base_photo_url = fullbody_photo_url(user.id, gender)
            db.add(mannequin)

    await db.commit()
