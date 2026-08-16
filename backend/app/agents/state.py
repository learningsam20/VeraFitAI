from typing import TypedDict, List, Dict, Optional, Any

class GraphState(TypedDict):
    # Inputs
    user_id: str
    user_image_b64: Optional[str]
    garment_id: str
    garment_name: str
    garment_image_b64: Optional[str]
    garment_material: Dict[str, float]  # e.g., {"merino_wool": 0.85, "polyamide": 0.15}
    garment_color_hex: str
    garment_category: str
    mood_modifier: float  # -1.0 (Cozy/Relaxed) to +1.0 (Structured/Power)
    
    # User Profile Context
    allergies: List[str]  # e.g., ["wool", "nickel", "synthetics"]
    preferred_fit: str    # "oversized", "tailored", "regular"
    comfort_style_bias: float  # 0.0 (pure style/tailoring) to 1.0 (pure comfort)
    color_season: str     # "Cool Winter", "Warm Autumn", etc.
    skin_concerns: Dict[str, float]  # {"rosacea": 38.5, "sensitivity": 62.0}
    historical_bias: Dict[str, Any]
    purchase_history: Dict[str, Any]  # Aggregated try-on/purchase sessions + feedback
    
    # Intermediate Agent Artifacts
    vto_renders: List[str]            # 3 base64 generated images
    fit_repeatability_score: float    # 0.0 - 100.0 (SSIM variance)
    ssim_variance: float
    pairwise_ssim: List[float]
    diff_heatmap_b64: str
    is_fit_unstable: bool
    
    color_harmony_score: float        # 0.0 - 100.0
    color_diagnostics: str
    color_indicator: str
    closest_palette_match: str
    garment_lab: List[float]
    season_palette_hex: List[str]
    
    fabric_safety_score: float        # 0.0 - 100.0
    fabric_warnings: List[str]
    allergy_multiplier: float         # 0.40 or 1.0
    allergy_detected: bool
    
    personalization_delta: float      # Score adjustment from user history
    mood_scalar: float                # Dynamic modifier from slider (0.90 - 1.10)

    # Purchase History Analyzer Agent Outputs
    purchase_learnings: List[Dict[str, Any]]       # Evidence-backed signals
    purchase_recommendations: List[Dict[str, Any]] # Personalized next actions
    purchase_history_delta: float                   # Score adjustment from history patterns
    
    # Final Output
    keep_probability: float           # 0.0 - 100.0
    verdict: str                      # "STRONG_BUY", "CONSIDER_CAUTION", "HIGH_RETURN_RISK"
    breakdown_metrics: Dict[str, float]
    natural_language_verdict: str
    ai_explanation: str
