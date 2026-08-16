import pytest
from backend.app.agents.workflow import run_verafit_workflow
from backend.app.agents.state import GraphState
from backend.app.config import settings

@pytest.mark.asyncio
async def test_full_langgraph_workflow_execution(monkeypatch):
    # Exercise the full workflow with the mock VTO renderer (the real YouCam API
    # is not reachable in CI/dev). Runtime behavior is governed by YOUCAM_MOCK_FALLBACK.
    monkeypatch.setattr(settings, "YOUCAM_MOCK_FALLBACK", True)
    initial_state: GraphState = {
        "user_id": "usr_94b3a8c1",
        "user_image_b64": None,
        "garment_id": "GAR-1021",
        "garment_name": "Organic Heavyweight Boxy Tee",
        "garment_image_b64": None,
        "garment_material": {"organic_cotton": 1.0},
        "garment_color_hex": "#1E3A8A",
        "garment_category": "tops",
        "mood_modifier": -0.4,
        "allergies": ["wool"],
        "preferred_fit": "oversized",
        "color_season": "Cool Winter",
        "skin_concerns": {"rosacea": 20.0},
        "historical_bias": {},
        "vto_renders": [],
        "fit_repeatability_score": 0.0,
        "ssim_variance": 0.0,
        "pairwise_ssim": [],
        "diff_heatmap_b64": "",
        "is_fit_unstable": False,
        "color_harmony_score": 0.0,
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

    final_state = await run_verafit_workflow(initial_state)

    assert len(final_state["vto_renders"]) == 3
    assert final_state["fit_repeatability_score"] > 0
    assert final_state["color_harmony_score"] > 0
    assert final_state["fabric_safety_score"] > 0
    assert 0.0 <= final_state["keep_probability"] <= 100.0
    assert final_state["verdict"] in ["STRONG_BUY", "CONSIDER_CAUTION", "HIGH_RETURN_RISK"]
    assert len(final_state["ai_explanation"]) > 0
