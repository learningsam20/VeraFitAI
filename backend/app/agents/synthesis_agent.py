import os
from typing import Dict, Any
from backend.app.agents.state import GraphState
from backend.app.config import settings

async def synthesis_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    Computes the master Keep-Probability score using the multi-factor weighted equation:
    K = Clamp( [(w_fit * S_fit) + (w_color * S_color) + (w_fabric * S_fabric) + Delta_pers] * M_allergy * M_mood, 0, 100 )
    and synthesizes natural language AI explanation using LiteLLM (supporting OpenAI, Ollama, Gemini, Claude, etc.).
    """
    s_fit = state.get("fit_repeatability_score", 90.0)
    s_color = state.get("color_harmony_score", 85.0)
    s_fabric = state.get("fabric_safety_score", 80.0)
    delta_pers = state.get("personalization_delta", 0.0)
    delta_history = state.get("purchase_history_delta", 0.0)
    m_allergy = state.get("allergy_multiplier", 1.0)
    m_mood = state.get("mood_scalar", 1.0)

    w_fit = settings.DEFAULT_WEIGHT_FIT
    w_color = settings.DEFAULT_WEIGHT_COLOR
    w_fabric = settings.DEFAULT_WEIGHT_FABRIC

    # Master calculation
    weighted_sum = (w_fit * s_fit) + (w_color * s_color) + (w_fabric * s_fabric) + delta_pers + delta_history
    raw_score = weighted_sum * m_allergy * m_mood
    keep_probability = round(float(max(0.0, min(100.0, raw_score))), 1)

    # Verdict assignment
    if keep_probability >= 80.0:
        verdict = "STRONG_BUY"
    elif keep_probability >= 50.0:
        verdict = "CONSIDER_CAUTION"
    else:
        verdict = "HIGH_RETURN_RISK"

    # Breakdown metrics dictionary
    breakdown_metrics = {
        "fitRepeatability": s_fit,
        "colorHarmony": s_color,
        "fabricSafety": s_fabric,
        "personalizationDelta": delta_pers,
        "purchaseHistoryDelta": delta_history,
        "allergyMultiplier": m_allergy,
        "moodScalar": m_mood
    }

    # Generate synthesis explanation with LiteLLM
    ai_explanation = await _generate_explanation(
        state=state,
        keep_probability=keep_probability,
        verdict=verdict
    )

    return {
        "keep_probability": keep_probability,
        "verdict": verdict,
        "breakdown_metrics": breakdown_metrics,
        "natural_language_verdict": verdict.replace("_", " ").title(),
        "ai_explanation": ai_explanation
    }

async def _generate_explanation(state: GraphState, keep_probability: float, verdict: str) -> str:
    garment_name = state.get("garment_name", "this garment")
    s_fit = state.get("fit_repeatability_score", 90.0)
    s_color = state.get("color_harmony_score", 85.0)
    color_diag = state.get("color_diagnostics", "")
    warnings = state.get("fabric_warnings", [])
    allergy_hit = state.get("allergy_detected", False)
    is_unstable = state.get("is_fit_unstable", False)
    color_season = state.get("color_season", "Cool Winter")

    # Check if LiteLLM should be called (if any provider key or Ollama is configured)
    has_provider = bool(
        settings.OPENAI_API_KEY or
        settings.ANTHROPIC_API_KEY or
        settings.GEMINI_API_KEY or
        settings.GROQ_API_KEY or
        settings.OPENROUTER_API_KEY or
        "ollama" in settings.LLM_MODEL.lower()
    )

    if has_provider:
        try:
            import litellm
            
            # Forward environment keys to litellm
            if settings.OPENAI_API_KEY:
                os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
            if settings.ANTHROPIC_API_KEY:
                os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
            if settings.GEMINI_API_KEY:
                os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
            if settings.GROQ_API_KEY:
                os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY
            if settings.OPENROUTER_API_KEY:
                os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY

            kwargs: Dict[str, Any] = {
                "model": settings.LLM_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are VeraFit's AI fashion purchase certainty engine. Synthesize an authoritative, 2-3 sentence verdict for the user analyzing fit stability, color harmony, and fabric comfort."
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Item: {garment_name}\n"
                            f"Keep Probability: {keep_probability}% ({verdict})\n"
                            f"Fit Repeatability (SSIM): {s_fit}% (Unstable: {is_unstable})\n"
                            f"Color Harmony: {s_color}% ({color_diag})\n"
                            f"Color Season: {color_season}\n"
                            f"Fabric Warnings: {warnings}\n"
                            f"Allergy Triggered: {allergy_hit}\n"
                            f"Provide a concise, direct, helpful analysis."
                        )
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 150
            }

            if "ollama" in settings.LLM_MODEL.lower():
                kwargs["api_base"] = settings.OLLAMA_API_BASE

            response = await litellm.acompletion(**kwargs)
            if response and response.choices and response.choices[0].message.content:
                return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[SynthesisAgent] LiteLLM call failed: {e}. Falling back to deterministic explanation.")

    # High-fidelity deterministic explainable verdict
    explanation_parts = [
        f"This item has a {keep_probability}% Keep Probability ({verdict.replace('_', ' ').title()})."
    ]

    # Fit summary
    if s_fit >= 90.0:
        explanation_parts.append(f"Structural drape is highly stable across 3 AI simulations ({s_fit}% repeatability).")
    elif s_fit >= 75.0:
        explanation_parts.append(f"Drape consistency is moderate ({s_fit}% repeatability); minor variance detected at the hemline.")
    else:
        explanation_parts.append(f"High generative variance detected ({s_fit}% repeatability) — structural fit may feel unpredictable.")

    # Color summary
    if s_color >= 80.0:
        explanation_parts.append(f"The shade provides flattering chromatic harmony with your natural {color_season} tones.")
    else:
        explanation_parts.append(f"The tone presents a high contrast differential against your {color_season} palette.")

    # Fabric / Allergy notes
    if allergy_hit:
        explanation_parts.append("CRITICAL: Detected material allergy conflict will likely cause significant skin irritation.")
    elif warnings:
        explanation_parts.append(f"Note: {warnings[0]}")
    else:
        explanation_parts.append("Fabric composition is gentle and fully compatible with your skin profile.")

    # Purchase history signal
    learnings = state.get("purchase_learnings", [])
    if learnings:
        top_signal = learnings[0].get("signal", "")
        if top_signal:
            explanation_parts.append(f"Purchase-history signal: {top_signal}.")

    return " ".join(explanation_parts)
