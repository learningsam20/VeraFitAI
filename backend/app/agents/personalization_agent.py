from typing import Dict, Any
from backend.app.agents.state import GraphState

async def personalization_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    Adjusts weights and calculates score delta based on:
    - Contextual Mood Slider (-1.0 Cozy/Relaxed to +1.0 Structured/Power)
    - User's preferred fit (regular, oversized, tight/tailored)
    - User's comfort-vs-style bias (0.0 pure style -> 1.0 pure comfort)
    - User's historical return/keep feedback bias
    """
    mood_modifier = state.get("mood_modifier", 0.0)  # -1.0 to 1.0
    garment_category = (state.get("garment_category") or "tops").lower()
    preferred_fit = (state.get("preferred_fit") or "regular").lower()
    comfort_style_bias = state.get("comfort_style_bias", 0.5)
    historical_bias = state.get("historical_bias", {})

    # Mood Scalar: modulates overall purchase intent
    # Scaled within [0.92, 1.08]
    mood_scalar = 1.0 + (mood_modifier * 0.05)

    # Personalization delta from past return reasons
    personalization_delta = 0.0

    # If user historically returns items due to FABRIC_ITCHY, add a slight penalty to wool/synthetics
    fabric_return_count = historical_bias.get("FABRIC_ITCHY_count", 0)
    if fabric_return_count > 0:
        personalization_delta -= min(8.0, fabric_return_count * 2.0)

    # If user historically keeps items with high color harmony, reward color match
    color_keep_count = historical_bias.get("COLOR_KEPT_count", 0)
    if color_keep_count > 0:
        personalization_delta += min(5.0, color_keep_count * 1.5)

    # --- Preferred fit alignment -------------------------------------------
    if preferred_fit in ("tight", "tailored"):
        if mood_modifier >= 0.3:
            personalization_delta += 3.0
        if garment_category.startswith("tops_shirts") or "dress" in garment_category:
            personalization_delta += 1.5
        if mood_modifier <= -0.3:
            personalization_delta -= 2.0  # tailored preference clashes with cozy context
    elif preferred_fit == "oversized":
        if mood_modifier <= -0.2:
            personalization_delta += 3.0
        if "knit" in garment_category or "tshirt" in garment_category or "loungewear" in garment_category:
            personalization_delta += 1.5
        if mood_modifier >= 0.5:
            personalization_delta -= 2.0  # oversized preference fights high-formality contexts

    # --- Comfort vs style bias alignment -----------------------------------
    if comfort_style_bias is None:
        comfort_style_bias = historical_bias.get("comfort_bias", 0.5)
    comfort_bias = float(comfort_style_bias)

    if comfort_bias >= 0.7:
        # Pure-comfort shopper: reward low-stimulus and soft-fabric categories
        if mood_modifier <= 0:
            personalization_delta += 3.0
        if "knit" in garment_category or "tshirt" in garment_category or "loungewear" in garment_category:
            personalization_delta += 2.0
        if garment_category.startswith("tops_shirts") and mood_modifier >= 0.4:
            personalization_delta -= 1.5  # structured tailoring traded off for comfort
    elif comfort_bias <= 0.3:
        # Pure-style shopper: reward structured, tailored, high-formality pieces
        if mood_modifier >= 0.4:
            personalization_delta += 3.0
        if garment_category.startswith("tops_shirts") or "dress" in garment_category:
            personalization_delta += 2.0
        if ("knit" in garment_category or "tshirt" in garment_category) and mood_modifier >= 0.4:
            personalization_delta -= 1.5  # cozy casual reads under-styled for high-formality
    # Comfort/Style mid-range (0.3 < bias < 0.7): balanced, no additional shaping

    # Keep the combined personalization delta within a sane scoring range
    personalization_delta = max(-10.0, min(10.0, personalization_delta))

    return {
        "personalization_delta": round(personalization_delta, 2),
        "mood_scalar": round(mood_scalar, 3),
        "fit_profile": preferred_fit,
        "comfort_style_bias": round(comfort_bias, 2)
    }
