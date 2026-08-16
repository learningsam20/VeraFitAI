import math
from typing import Tuple, List, Dict, Any

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Convert Hex color (#RRGGBB or RRGGBB) to (R, G, B) [0-255]."""
    hex_clean = hex_str.lstrip("#").strip()
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) != 6:
        return (44, 62, 80)  # Default fallback navy
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
        return (r, g, b)
    except ValueError:
        return (44, 62, 80)

def rgb_to_cielab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """
    Convert sRGB (0-255) to CIELab (L*, a*, b*) using standard D65 illuminant.
    """
    # 1. Linearize sRGB
    def pivot_rgb(n: float) -> float:
        n = n / 255.0
        return ((n + 0.055) / 1.055) ** 2.4 if n > 0.04045 else n / 12.92

    r_lin = pivot_rgb(r) * 100.0
    g_lin = pivot_rgb(g) * 100.0
    b_lin = pivot_rgb(b) * 100.0

    # 2. Convert to XYZ (D65)
    x = r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375
    y = r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750
    z = r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503041

    # D65 reference white
    x_ref = 95.047
    y_ref = 100.000
    z_ref = 108.883

    def pivot_xyz(n: float) -> float:
        return n ** (1.0 / 3.0) if n > 0.008856 else (7.787 * n) + (16.0 / 116.0)

    fx = pivot_xyz(x / x_ref)
    fy = pivot_xyz(y / y_ref)
    fz = pivot_xyz(z / z_ref)

    l_star = max(0.0, (116.0 * fy) - 16.0)
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return (round(l_star, 2), round(a_star, 2), round(b_star, 2))

def hex_to_cielab(hex_str: str) -> Tuple[float, float, float]:
    r, g, b = hex_to_rgb(hex_str)
    return rgb_to_cielab(r, g, b)

def calculate_delta_e(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    """Euclidean distance in CIELab space (CIE76)."""
    return math.sqrt(
        (lab1[0] - lab2[0]) ** 2 +
        (lab1[1] - lab2[1]) ** 2 +
        (lab1[2] - lab2[2]) ** 2
    )

# Curated Seasonal Color Palettes with characteristic hex codes and ideal tone matches
SEASONAL_PALETTES: Dict[str, Dict[str, Any]] = {
    "Cool Winter": {
        "undertone": "Cool",
        "contrast": "High",
        "ideal_colors": ["#000000", "#FFFFFF", "#1E3A8A", "#2C3E50", "#7E22CE", "#BE185D", "#0F766E", "#E11D48"],
        "description": "High contrast, vivid icy tones, pure black, navy, royal jewel hues.",
        "clash_colors": ["#D97706", "#B45309", "#854D0E", "#CA8A04"]  # Earthy mustard/orange
    },
    "Warm Autumn": {
        "undertone": "Warm",
        "contrast": "Rich",
        "ideal_colors": ["#78350F", "#9A3412", "#D97706", "#4D7C0F", "#B45309", "#A16207", "#854D0E", "#7C2D12"],
        "description": "Rich golden undertones, burnt terracotta, olive greens, mustard, and deep rust.",
        "clash_colors": ["#06B6D4", "#EC4899", "#818CF8", "#F43F5E"]  # Bright icy pastels
    },
    "Cool Summer": {
        "undertone": "Cool",
        "contrast": "Soft",
        "ideal_colors": ["#475569", "#64748B", "#93C5FD", "#F472B6", "#A78BFA", "#2DD4BF", "#E2E8F0", "#3B82F6"],
        "description": "Soft muted cool hues, slate grey, dusty rose, powder blue, and lavender.",
        "clash_colors": ["#EA580C", "#CA8A04", "#65A30D"]  # Electric orange/chartreuse
    },
    "Warm Spring": {
        "undertone": "Warm",
        "contrast": "Clear",
        "ideal_colors": ["#F59E0B", "#10B981", "#FB7185", "#38BDF8", "#F97316", "#84CC16", "#FDE047", "#065F46"],
        "description": "Clear, bright warm tones, coral, peach, fresh lime green, warm turquoise, and golden yellow.",
        "clash_colors": ["#334155", "#0F172A", "#475569"]  # Muddy dark greys
    }
}

def evaluate_color_harmony(garment_hex: str, color_season: str) -> Dict[str, Any]:
    """
    Evaluates color harmony between a garment hex color and the user's seasonal profile.
    Returns:
    - color_harmony_score (0.0 - 100.0)
    - diagnostics string
    - indicator (🟢, 🟡, 🔴)
    - closest_match_delta_e
    - season_palette_hex
    """
    season_data = SEASONAL_PALETTES.get(color_season, SEASONAL_PALETTES["Cool Winter"])
    palette_hexes = season_data["ideal_colors"]
    clash_hexes = season_data.get("clash_colors", [])

    garment_lab = hex_to_cielab(garment_hex)
    
    # Check minimum Delta E against ideal palette
    min_delta_e = float("inf")
    closest_ideal_hex = palette_hexes[0]
    for p_hex in palette_hexes:
        p_lab = hex_to_cielab(p_hex)
        d_e = calculate_delta_e(garment_lab, p_lab)
        if d_e < min_delta_e:
            min_delta_e = d_e
            closest_ideal_hex = p_hex

    # Check clash penalty
    min_clash_delta = float("inf")
    for c_hex in clash_hexes:
        c_lab = hex_to_cielab(c_hex)
        d_c = calculate_delta_e(garment_lab, c_lab)
        if d_c < min_clash_delta:
            min_clash_delta = d_c

    # Score calculation
    # Delta E < 15 is excellent match (score 90-100)
    # Delta E between 15 and 35 is acceptable (score 65-89)
    # Delta E > 35 is divergent (score < 65)
    base_score = max(0.0, 100.0 - (min_delta_e * 1.5))
    
    # Penalize if very close to clash colors
    if min_clash_delta < 20.0:
        base_score = max(35.0, base_score - 25.0)

    harmony_score = round(float(np_clip := max(15.0, min(98.5, base_score))), 1)

    # Diagnostic text & indicator
    if harmony_score >= 80.0:
        indicator = "🟢"
        diagnostic = f"{garment_hex.upper()} has high chromatic harmony with your {color_season} palette ({season_data['undertone']} undertones)."
    elif harmony_score >= 60.0:
        indicator = "🟡"
        diagnostic = f"{garment_hex.upper()} is neutral-compatible with your {color_season} profile, though subtle undertone contrast may occur."
    else:
        indicator = "🔴"
        diagnostic = f"{garment_hex.upper()} may clash with your natural {color_season} tones ({season_data['contrast']} contrast recommended)."

    return {
        "color_harmony_score": harmony_score,
        "color_diagnostics": diagnostic,
        "indicator": indicator,
        "closest_palette_match": closest_ideal_hex,
        "garment_lab": list(garment_lab),
        "season_palette_hex": palette_hexes,
        "delta_e": round(min_delta_e, 2),
        "color_season": color_season
    }
