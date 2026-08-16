from typing import Dict, Any
from backend.app.agents.state import GraphState
from backend.app.services.youcam_service import youcam_service
from backend.app.math_engine.ssim_calculator import compute_multi_vto_ssim

async def vto_fit_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    1. Triggers 3 parallel VTO rendering simulations.
    2. Runs Math Engine SSIM calculations across the 3 renders.
    3. Detects fit instability and generates difference heatmaps.
    """
    user_image = state.get("user_image_b64")
    garment_image = state.get("garment_image_b64")
    garment_color = state.get("garment_color_hex", "#2C3E50")
    garment_name = state.get("garment_name", "Garment")
    garment_category = state.get("garment_category", "auto")

    # Generate 3 parallel VTO renders
    renders = await youcam_service.generate_vto_renders(
        user_image_b64=user_image,
        garment_image_b64=garment_image,
        garment_color_hex=garment_color,
        garment_name=garment_name,
        num_simulations=3,
        garment_category=garment_category,
    )

    # Compute SSIM metrics
    ssim_results = compute_multi_vto_ssim(renders)

    return {
        "vto_renders": renders,
        "fit_repeatability_score": ssim_results["fit_score"],
        "ssim_variance": ssim_results["variance"],
        "pairwise_ssim": ssim_results["pairwise_scores"],
        "diff_heatmap_b64": ssim_results["diff_heatmap_b64"],
        "is_fit_unstable": ssim_results["is_unstable"]
    }
