import pytest
from backend.app.agents.fabric_agent import fabric_safety_agent_node
from backend.app.agents.state import GraphState

@pytest.mark.asyncio
async def test_fabric_allergy_penalty():
    # User with wool allergy testing a garment with 85% merino wool
    state: GraphState = {
        "user_id": "usr_test",
        "user_image_b64": None,
        "garment_id": "GAR-8842",
        "garment_name": "Wool Turtleneck",
        "garment_image_b64": None,
        "garment_material": {"merino_wool": 0.85, "polyamide": 0.15},
        "garment_color_hex": "#2C3E50",
        "garment_category": "tops",
        "mood_modifier": 0.0,
        "allergies": ["wool"],
        "preferred_fit": "regular",
        "color_season": "Cool Winter",
        "skin_concerns": {"rosacea": 30.0},
        "historical_bias": {},
        "vto_renders": [],
        "fit_repeatability_score": 90.0,
        "ssim_variance": 0.01,
        "pairwise_ssim": [],
        "diff_heatmap_b64": "",
        "is_fit_unstable": False,
        "color_harmony_score": 85.0,
        "color_diagnostics": "",
        "color_indicator": "🟢",
        "closest_palette_match": "",
        "garment_lab": [],
        "season_palette_hex": [],
        "fabric_safety_score": 0.0,
        "fabric_warnings": [],
        "allergy_multiplier": 1.0,
        "allergy_detected": False,
        "personalization_delta": 0.0,
        "mood_scalar": 1.0,
        "keep_probability": 0.0,
        "verdict": "STRONG_BUY",
        "breakdown_metrics": {},
        "natural_language_verdict": "",
        "ai_explanation": ""
    }

    res = await fabric_safety_agent_node(state)
    assert res["allergy_detected"] is True
    assert res["allergy_multiplier"] == 0.40
    assert len(res["fabric_warnings"]) > 0
    assert res["fabric_safety_score"] <= 45.0
