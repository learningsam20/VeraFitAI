from typing import Dict, Any
from backend.app.agents.state import GraphState
from backend.app.math_engine.color_engine import evaluate_color_harmony

async def color_harmony_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    Evaluates CIELab chromatic harmony between garment color and user's color season.
    """
    garment_hex = state.get("garment_color_hex", "#2C3E50")
    color_season = state.get("color_season", "Cool Winter")

    result = evaluate_color_harmony(garment_hex=garment_hex, color_season=color_season)

    return {
        "color_harmony_score": result["color_harmony_score"],
        "color_diagnostics": result["color_diagnostics"],
        "color_indicator": result["indicator"],
        "closest_palette_match": result["closest_palette_match"],
        "garment_lab": result["garment_lab"],
        "season_palette_hex": result["season_palette_hex"]
    }
