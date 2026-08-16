"""Deterministic, aligned product images for the garment catalog.

Every garment gets a unique JPEG illustration matching its category and
color_hex, embedded as a data:image/jpeg URI. No external hosting is needed
and the YouCam upload path (image/jpeg) is unchanged.
"""
import base64
import io

from PIL import Image, ImageDraw

W, H = 600, 800
BG = (238, 240, 245)


def _hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb)


def _mix(rgb, other, t):
    return tuple(int(c * (1 - t) + o * t) for c, o in zip(rgb, other))


def _round_rect(d, box, r, fill, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def _draw_tee(d, base):
    dark = _shade(base, 0.82)
    light = _shade(base, 1.12)
    outline = _shade(base, 0.7)
    d.polygon([(250, 300), (350, 300), (380, 330), (380, 560), (220, 560), (220, 330)], fill=base, outline=outline)
    d.polygon([(250, 300), (220, 330), (140, 340), (130, 420), (180, 430), (238, 380)], fill=dark, outline=outline)
    d.polygon([(350, 300), (380, 330), (460, 340), (470, 420), (420, 430), (362, 380)], fill=light, outline=outline)
    d.arc([235, 255, 365, 335], 180, 360, fill=outline, width=10)
    d.arc([243, 268, 357, 320], 180, 360, fill=_mix(base, (255, 255, 255), 0.25), width=6)
    d.line([(222, 552), (378, 552)], fill=dark, width=5)


def _draw_knit(d, base):
    dark = _shade(base, 0.82)
    light = _shade(base, 1.12)
    outline = _shade(base, 0.7)
    d.polygon([(235, 300), (160, 330), (120, 520), (135, 560), (185, 540), (235, 400)], fill=dark, outline=outline)
    d.polygon([(365, 300), (440, 330), (480, 520), (465, 560), (415, 540), (365, 400)], fill=light, outline=outline)
    d.polygon([(250, 280), (350, 280), (385, 320), (385, 560), (215, 560), (215, 320)], fill=base, outline=outline)
    for y in range(330, 560, 16):
        d.line([(218, y), (382, y)], fill=_mix(base, dark, 0.5), width=2)
    d.rounded_rectangle([258, 220, 342, 290], radius=20, fill=base, outline=outline, width=4)
    d.rounded_rectangle([266, 228, 334, 282], radius=14, fill=_mix(base, dark, 0.25))
    d.line([(217, 552), (383, 552)], fill=dark, width=5)


def _draw_shirt(d, base):
    dark = _shade(base, 0.82)
    light = _shade(base, 1.12)
    outline = _shade(base, 0.7)
    white = _mix(base, (255, 255, 255), 0.55)
    d.polygon([(235, 300), (150, 330), (115, 500), (135, 540), (185, 520), (235, 400)], fill=dark, outline=outline)
    d.polygon([(365, 300), (450, 330), (485, 500), (465, 540), (415, 520), (365, 400)], fill=light, outline=outline)
    d.rectangle([135, 500, 185, 540], fill=white, outline=outline, width=3)
    d.rectangle([415, 500, 465, 540], fill=white, outline=outline, width=3)
    d.polygon([(245, 285), (355, 285), (385, 320), (385, 560), (215, 560), (215, 320)], fill=base, outline=outline)
    d.polygon([(258, 268), (300, 300), (342, 268), (322, 252), (278, 252)], fill=white, outline=outline)
    d.line([(300, 300), (300, 545)], fill=white, width=6)
    for by in range(340, 540, 40):
        d.ellipse([294, by - 5, 306, by + 5], fill=dark)


def _draw_outerwear(d, base):
    dark = _shade(base, 0.82)
    light = _shade(base, 1.12)
    outline = _shade(base, 0.7)
    lining = _mix(base, (30, 41, 59), 0.35)
    d.polygon([(240, 280), (150, 320), (115, 520), (140, 560), (195, 535), (240, 410)], fill=dark, outline=outline)
    d.polygon([(360, 280), (450, 320), (485, 520), (460, 560), (405, 535), (360, 410)], fill=light, outline=outline)
    d.polygon([(235, 255), (355, 255), (390, 320), (390, 590), (345, 600), (300, 560), (255, 600), (210, 590), (210, 320)], fill=base, outline=outline)
    d.line([(300, 300), (300, 560)], fill=lining, width=8)
    d.polygon([(235, 255), (300, 320), (300, 380), (255, 420), (210, 320)], fill=_mix(base, dark, 0.35), outline=outline)
    d.polygon([(355, 255), (300, 320), (300, 380), (345, 420), (390, 320)], fill=_mix(base, light, 0.4), outline=outline)
    d.polygon([(225, 470), (295, 470), (290, 505), (230, 505)], fill=dark, outline=outline)
    d.polygon([(375, 470), (305, 470), (310, 505), (370, 505)], fill=dark, outline=outline)


def _draw_dress(d, base):
    dark = _shade(base, 0.82)
    light = _shade(base, 1.12)
    outline = _shade(base, 0.7)
    d.polygon([(245, 380), (355, 380), (430, 660), (360, 700), (300, 690), (240, 700), (170, 660)], fill=base, outline=outline)
    d.polygon([(245, 260), (355, 260), (375, 380), (225, 380)], fill=base, outline=outline)
    d.line([(245, 260), (240, 235)], fill=dark, width=10)
    d.line([(355, 260), (360, 235)], fill=dark, width=10)
    d.arc([245, 235, 355, 295], 180, 360, fill=outline, width=8)
    d.line([(228, 378), (372, 378)], fill=dark, width=5)
    d.line([(260, 470), (250, 600)], fill=_mix(base, dark, 0.45), width=4)
    d.line([(300, 460), (300, 660)], fill=_mix(base, dark, 0.3), width=4)
    d.line([(340, 470), (350, 600)], fill=_mix(base, dark, 0.45), width=4)


def _draw_bottoms(d, base):
    dark = _shade(base, 0.82)
    light = _shade(base, 1.12)
    outline = _shade(base, 0.7)
    d.polygon([(225, 300), (375, 300), (375, 560), (315, 560), (315, 660), (285, 660), (285, 560), (225, 560)], fill=base, outline=outline)
    d.line([(225, 300), (375, 300)], fill=dark, width=8)
    d.line([(300, 300), (300, 548)], fill=_mix(base, dark, 0.4), width=3)
    d.polygon([(225, 300), (300, 300), (300, 380), (225, 460)], fill=dark, outline=outline)
    d.polygon([(375, 300), (300, 300), (300, 380), (375, 460)], fill=light, outline=outline)
    d.line([(228, 552), (312, 552)], fill=dark, width=4)
    d.line([(288, 552), (372, 552)], fill=dark, width=4)


def _draw_garment(category, base):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    _round_rect(d, (40, 40, W - 40, H - 40), 36, _mix(BG, base, 0.06))
    cat = category.lower()
    if "bottom" in cat or "pant" in cat or "trouser" in cat or "short" in cat:
        _draw_bottoms(d, base)
    elif "dress" in cat or "gown" in cat:
        _draw_dress(d, base)
    elif "outerwear" in cat or "jacket" in cat or "coat" in cat or "blazer" in cat:
        _draw_outerwear(d, base)
    elif "knit" in cat or "sweater" in cat or "turtleneck" in cat or "mockneck" in cat or "crewneck" in cat:
        _draw_knit(d, base)
    elif "tshirt" in cat or "tee" in cat or "camisole" in cat:
        _draw_tee(d, base)
    else:
        _draw_shirt(d, base)
    d.ellipse([235, 690, 365, 700], fill=_mix(BG, (0, 0, 0), 0.12))
    return img


def garment_image_data_uri(category: str, color_hex: str) -> str:
    """Return a data:image/jpeg URI of an aligned illustration for a garment.

    Kept for backward compatibility; the catalog now prefers real fabric photos
    via :func:`real_garment_image_url`.
    """
    base = _hex_to_rgb(color_hex)
    img = _draw_garment(category, base)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"

# Curated real-fabric product photo pools (Unsplash photo IDs) keyed by garment
# category. These are verified against the images already served by the app
# (calendar recommendations, VTO fallbacks) so they render reliably.
_REAL_FABRIC_PHOTO_POOLS: dict = {
    "tops": [
        "photo-1598554747436-c9293d6a588f",
        "photo-1602810318383-e386cc2a3ccf",
        "photo-1521572267360-ee0c2909d518",
    ],
    "tops_knitwear": [
        "photo-1602810318383-e386cc2a3ccf",
        "photo-1598554747436-c9293d6a588f",
        "photo-1521572267360-ee0c2909d518",
    ],
    "dresses": [
        "photo-1620799140408-edc6dcb6d633",
        "photo-1583496661160-fb5886a0aaaa",
    ],
    "outerwear": [
        "photo-1541099649105-f69ad21f3246",
        "photo-1594633312681-425c7b97ccd1",
    ],
    "bottoms": [
        "photo-1594633312681-425c7b97ccd1",
        "photo-1541099649105-f69ad21f3246",
    ],
    "default": ["photo-1576566588028-4147f3842f27"],
}

_FABRIC_URL_TMPL = "https://images.unsplash.com/{photo_id}?w=600&auto=format&fit=crop&q=80"


# Curated menswear product photo pools (verified Unsplash photo IDs) keyed by
# the same categories as the women's pools. Used to show gender-appropriate
# garment imagery to male shoppers.
_MENSWEAR_PHOTO_POOLS: dict = {
    "tops": [
        "photo-1603252109303-2751441dd157",
        "photo-1618354691373-d851c5c3a990",
        "photo-1622445275576-721325763afe",
        "photo-1596755094514-f87e34085b2c",
    ],
    "tops_knitwear": [
        "photo-1564564295391-7f24f26f568b",
        "photo-1622445275576-721325763afe",
        "photo-1618354691373-d851c5c3a990",
    ],
    "dresses": [
        "photo-1603252109303-2751441dd157",
        "photo-1564564295391-7f24f26f568b",
    ],
    "outerwear": [
        "photo-1602293589930-45aad59ba3ab",
        "photo-1551537482-f2075a1d41f2",
        "photo-1592878904946-b3cd8ae243d0",
    ],
    "bottoms": [
        "photo-1583743814966-8936f5b7be1a",
        "photo-1592878904946-b3cd8ae243d0",
    ],
    "default": ["photo-1603252109303-2751441dd157"],
}


def _pick_pool(category: str, pools: dict, fallback: str) -> list:
    cat = str(category or "").lower()
    pool = pools.get(cat)
    if not pool:
        if any(k in cat for k in ("bottom", "pant", "trouser", "jean", "short", "skirt")):
            pool = pools["bottoms"]
        elif any(k in cat for k in ("dress", "gown", "jumpsuit", "romper")):
            pool = pools["dresses"]
        elif any(k in cat for k in ("outer", "jacket", "coat", "blazer")):
            pool = pools["outerwear"]
        elif any(k in cat for k in ("knit", "sweater", "turtleneck", "mockneck", "crewneck")):
            pool = pools["tops_knitwear"]
        else:
            pool = pools[fallback]
    return pool


def real_garment_image_url(category: str, color_hex: str, sku: str) -> str:
    """Deterministically resolves a real fabric product photo for a garment.

    Picks a verified Unsplash garment photo from the pool matching the category,
    seeded by the garment SKU + color so the same SKU always shows the same photo
    while different garments get visually distinct images.
    """
    pool = _pick_pool(category, _REAL_FABRIC_PHOTO_POOLS, "tops")
    seed = f"{sku}|{color_hex}"
    idx = sum(ord(c) for c in seed) % len(pool)
    return _FABRIC_URL_TMPL.format(photo_id=pool[idx])


def menswear_image_url(category: str, color_hex: str, sku: str) -> str:
    """Resolves a gender-appropriate men's product photo for a garment.

    Mirrors :func:`real_garment_image_url` but from the men's photo pools so a
    male shopper sees the same SKU rendered on men's clothing imagery. Dresses
    and gowns are inherently womenswear, so those keep the women's photo.
    """
    cat = str(category or "").lower()
    if any(k in cat for k in ("dress", "gown", "jumpsuit", "romper")):
        return real_garment_image_url(category, color_hex, sku)
    pool = _pick_pool(category, _MENSWEAR_PHOTO_POOLS, "tops")
    seed = f"{sku}|{color_hex}|mens"
    idx = sum(ord(c) for c in seed) % len(pool)
    return _FABRIC_URL_TMPL.format(photo_id=pool[idx])
