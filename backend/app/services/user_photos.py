"""Real profile photo pools for demo users.

Every demo user gets a distinct, real Unsplash photo so the fitting room,
avatar, and VTO source photo differ per user instead of reusing a single shared
default. Photos are gender-aware:

- Avatars use headshots (face only), one pool per gender.
- Mannequins / VTO sources use full-length photos so the garment draping
  renders on a whole-body photo; the skin analysis still only needs the face,
  which is cropped from the full-length image.

All URLs below were verified to resolve (HTTP 200).
"""
from typing import Optional

_HEADSHOT_TMPL = "https://images.unsplash.com/{photo_id}?w=150&auto=format&fit=crop&q=80"
_FULLBODY_TMPL = "https://images.unsplash.com/{photo_id}?w=600&auto=format&fit=crop&q=80"

# --------------------------------------------------------------------------
# Headshot pools (gender-specific)
# --------------------------------------------------------------------------
FEMALE_FACE_POOL = [
    "photo-1534528741775-53994a69daeb",
    "photo-1573496359142-b8d87734a5a2",
    "photo-1494790108377-be9c29b29330",
    "photo-1438761681033-6461ffad8d80",
    "photo-1544005313-94ddf0286df2",
    "photo-1580489944761-15a19d654956",
    "photo-1573497019940-1c28c88b4f3e",
]
MALE_FACE_POOL = [
    "photo-1492562080023-ab3db95bfbce",
    "photo-1504257432389-52343af06ae3",
    "photo-1472099645785-5658abf4ff4e",
    "photo-1570295999919-56ceb5ecca61",
    "photo-1521119989659-a83eee488004",
    "photo-1519345182560-3f2917c472ef",
    "photo-1519085360753-af0119f7cbe7",
]

# --------------------------------------------------------------------------
# Full-length photo pools (gender-specific, for mannequins & VTO draping)
# --------------------------------------------------------------------------
FEMALE_FULLBODY_POOL = [
    "photo-1490481651871-ab68de25d43d",
    "photo-1515886657613-9f3515b0c78f",
    "photo-1539109136881-3be0616acf4b",
    "photo-1445205170230-053b83016050",
    "photo-1483985988355-763728e1935b",
    "photo-1434389677669-e08b4cac3105",
    "photo-1469334031218-e382a71b716b",
    "photo-1524504388940-b1c1722653e1",
    "photo-1550614000-4895a10e1bfd",
]
MALE_FULLBODY_POOL = [
    "photo-1506629082955-511b1aa562c8",
    "photo-1617137968427-85924c800a22",
    "photo-1516826957135-700dedea698c",
    "photo-1534751516642-a1af1ef26a56",
    "photo-1541101767792-f9b2b1c4f127",
    "photo-1593030761757-71fae45fa0e7",
    "photo-1600486913747-55e5470d6f40",
]

_KNOWN_FULLBODY_IDS = set(FEMALE_FULLBODY_POOL + MALE_FULLBODY_POOL)
_KNOWN_FACE_IDS = set(FEMALE_FACE_POOL + MALE_FACE_POOL)

# Headshot ids that were previously in the pools (and may still be stored on
# existing mannequins/avatars) with their known gender.
_LEGACY_FACE_GENDER = {
    "photo-1507003211169-0a1dd7228f2d": "female",
    "photo-1500648767791-00dcc994a43e": "female",
    "photo-1547425260-76bcadfb4f2c": "male",
    "photo-1554151228-14d9def656e4": "female",
    "photo-1560250097-0b93528c311a": "male",
    "photo-1506794778202-cad84cf45f1d": "male",
    "photo-1522202176988-66273c2fd55f": "male",
}

# Explicit pool positions for the demo cohort so each user gets a distinct photo
# (indices are within their gender pool; sums-of-char codes collided before).
_COHORT_INDEX = {
    "usr_94b3a8c1": 0,
    "usr_astrid_holm": 1,
    "usr_camilla_rossi": 2,
    "usr_sofia_berg": 3,
    "usr_lars_hedlund": 0,
    "usr_marco_bellini": 1,
}


def _cohort_index(user_id: str, pool_size: int) -> int:
    if user_id in _COHORT_INDEX:
        return _COHORT_INDEX[user_id] % pool_size
    return sum(ord(c) for c in user_id) % pool_size


def normalize_gender(gender: Optional[str]) -> str:
    """Maps a gender string to 'male', 'female', or 'neutral'."""
    g = (gender or "").lower()
    if g in ("male", "m", "man", "men"):
        return "male"
    if g in ("female", "f", "woman", "women"):
        return "female"
    return "neutral"


def face_photo_url(user_id: Optional[str], gender: Optional[str] = None) -> str:
    """Deterministically resolves a distinct gender-appropriate headshot."""
    uid = user_id or "usr_94b3a8c1"
    g = normalize_gender(gender)
    pool = MALE_FACE_POOL if g == "male" else FEMALE_FACE_POOL if g == "female" else FEMALE_FACE_POOL + MALE_FACE_POOL
    return _HEADSHOT_TMPL.format(photo_id=pool[_cohort_index(uid, len(pool))])


def fullbody_photo_url(user_id: Optional[str], gender: Optional[str] = None) -> str:
    """Deterministically resolves a distinct gender-appropriate full-body photo."""
    uid = user_id or "usr_94b3a8c1"
    g = normalize_gender(gender)
    pool = FEMALE_FULLBODY_POOL if g == "female" else MALE_FULLBODY_POOL if g == "male" else FEMALE_FULLBODY_POOL + MALE_FULLBODY_POOL
    return _FULLBODY_TMPL.format(photo_id=pool[_cohort_index(uid, len(pool))])


def _photo_id_from_url(url: Optional[str]) -> Optional[str]:
    """Extracts the Unsplash photo id from a URL, ignoring query params."""
    if not url:
        return None
    start = url.find("photo-")
    if start == -1:
        return None
    tok = url[start:]
    end = tok.find("?")
    if end == -1:
        end = len(tok)
    return tok[:end]


def is_known_fullbody_url(url: Optional[str]) -> bool:
    return _photo_id_from_url(url) in _KNOWN_FULLBODY_IDS


def is_known_face_url(url: Optional[str]) -> bool:
    pid = _photo_id_from_url(url)
    return pid in _KNOWN_FACE_IDS or pid in _LEGACY_FACE_GENDER


def gender_of_photo_url(url: Optional[str]) -> Optional[str]:
    """Returns the gender of a pool URL, or None if it's not from our pools."""
    pid = _photo_id_from_url(url)
    if pid is None:
        return None
    if pid in FEMALE_FACE_POOL + FEMALE_FULLBODY_POOL:
        return "female"
    if pid in MALE_FACE_POOL + MALE_FULLBODY_POOL:
        return "male"
    return _LEGACY_FACE_GENDER.get(pid)


# Backwards-compatible alias kept for any external callers.
def distinct_user_photo_url(user_id: Optional[str]) -> str:
    return face_photo_url(user_id, "female")
