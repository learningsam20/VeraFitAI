from typing import Dict, Any, List
from backend.app.agents.state import GraphState
from backend.app.config import settings

# Allergen keywords mapping
ALLERGEN_MAP = {
    "wool": ["wool", "merino", "cashmere", "alpaca", "mohair", "angora"],
    "synthetics": ["polyester", "nylon", "acrylic", "polyamide", "spandex", "polyurethane"],
    "latex": ["latex", "rubber", "elastodiene"],
    "nickel": ["metallic_threads", "metallic", "lurex"],
    "silk": ["silk", "mulberry_silk"]
}

# Friction / Breathability impact of materials on sensitive skin
FABRIC_PROFILES = {
    "wool": {"friction": 0.75, "breathability": 0.70, "roughness": 0.65},
    "merino_wool": {"friction": 0.45, "breathability": 0.85, "roughness": 0.35},
    "cashmere": {"friction": 0.20, "breathability": 0.90, "roughness": 0.15},
    "polyester": {"friction": 0.60, "breathability": 0.30, "roughness": 0.50},
    "nylon": {"friction": 0.55, "breathability": 0.35, "roughness": 0.45},
    "polyamide": {"friction": 0.50, "breathability": 0.40, "roughness": 0.40},
    "cotton": {"friction": 0.15, "breathability": 0.95, "roughness": 0.10},
    "organic_cotton": {"friction": 0.10, "breathability": 0.98, "roughness": 0.05},
    "linen": {"friction": 0.35, "breathability": 0.95, "roughness": 0.40},
    "silk": {"friction": 0.05, "breathability": 0.90, "roughness": 0.05},
    "viscose": {"friction": 0.25, "breathability": 0.75, "roughness": 0.20},
    "elastane": {"friction": 0.30, "breathability": 0.50, "roughness": 0.25}
}

async def fabric_safety_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    Evaluates physical fabric-to-skin compatibility:
    - Checks registered user allergies against garment materials.
    - Evaluates fabric friction against active skin conditions (rosacea, eczema, sensitivity).
    - Applies hard allergy multiplier if conflict is detected.
    """
    materials = state.get("garment_material", {})
    user_allergies = [a.lower().strip() for a in state.get("allergies", [])]
    skin_concerns = state.get("skin_concerns", {})
    category = state.get("garment_category", "tops").lower()

    allergy_detected = False
    allergy_reasons = []
    fabric_warnings = []
    
    # 1. Direct Allergy Matching
    for mat_name, percentage in materials.items():
        if percentage <= 0:
            continue
        mat_clean = mat_name.lower().replace(" ", "_")
        
        for user_allergy in user_allergies:
            # Check direct or mapped match
            keywords = ALLERGEN_MAP.get(user_allergy, [user_allergy])
            if any(kw in mat_clean for kw in keywords):
                allergy_detected = True
                allergy_reasons.append(f"Allergy trigger: {mat_name.replace('_', ' ').title()} ({int(percentage * 100)}%) matches your recorded '{user_allergy}' sensitivity.")

    allergy_multiplier = settings.ALLERGY_PENALTY_MULTIPLIER if allergy_detected else 1.0

    # 2. Skin Concern Friction & Trapped Heat Scoring
    rosacea_score = skin_concerns.get("rosacea", 0.0)
    sensitivity_score = skin_concerns.get("sensitivity", 0.0)
    acne_score = skin_concerns.get("acne", 0.0)

    # Calculate weighted friction and breathability indices
    total_friction = 0.0
    total_breathability = 0.0
    total_weight = 0.0

    for mat_name, pct in materials.items():
        mat_key = mat_name.lower().replace(" ", "_")
        profile = FABRIC_PROFILES.get(mat_key, {"friction": 0.4, "breathability": 0.6, "roughness": 0.3})
        total_friction += profile["friction"] * pct
        total_breathability += profile["breathability"] * pct
        total_weight += pct

    if total_weight > 0:
        avg_friction = total_friction / total_weight
        avg_breathability = total_breathability / total_weight
    else:
        avg_friction = 0.3
        avg_breathability = 0.8

    # Base fabric safety score
    base_fabric_score = 100.0

    # Penalties for sensitive skin + high friction
    if rosacea_score > 25.0 and avg_friction > 0.40:
        penalty = (rosacea_score / 100.0) * (avg_friction * 35.0)
        base_fabric_score -= penalty
        fabric_warnings.append(f"Friction alert: Elevated fabric roughness ({int(avg_friction * 100)}%) may aggravate facial/neck rosacea.")

    # Penalties for low breathability + acne/sensitivity
    if (acne_score > 20.0 or sensitivity_score > 40.0) and avg_breathability < 0.50:
        penalty = ((sensitivity_score + acne_score) / 200.0) * ((1.0 - avg_breathability) * 30.0)
        base_fabric_score -= penalty
        fabric_warnings.append(f"Heat retention: Synthetic blend ({int((1.0 - avg_breathability) * 100)}% low-breathability) can trap moisture against sensitive skin.")

    if allergy_detected:
        fabric_warnings.extend(allergy_reasons)
        base_fabric_score = min(base_fabric_score, 45.0)

    fabric_safety_score = round(max(10.0, min(100.0, base_fabric_score)), 1)

    return {
        "fabric_safety_score": fabric_safety_score,
        "fabric_warnings": fabric_warnings,
        "allergy_multiplier": allergy_multiplier,
        "allergy_detected": allergy_detected
    }
