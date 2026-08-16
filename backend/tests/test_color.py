import pytest
from backend.app.math_engine.color_engine import hex_to_rgb, rgb_to_cielab, evaluate_color_harmony

def test_hex_to_rgb():
    assert hex_to_rgb("#FFFFFF") == (255, 255, 255)
    assert hex_to_rgb("#000000") == (0, 0, 0)
    assert hex_to_rgb("#1E3A8A") == (30, 58, 138)

def test_cielab_conversion():
    # White: L* should be ~100
    lab = rgb_to_cielab(255, 255, 255)
    assert 99.0 <= lab[0] <= 100.0

    # Black: L* should be 0
    lab_black = rgb_to_cielab(0, 0, 0)
    assert lab_black[0] == 0.0

def test_color_harmony_cool_winter():
    # Navy (#2C3E50) aligns well with Cool Winter
    res = evaluate_color_harmony("#2C3E50", "Cool Winter")
    assert res["color_harmony_score"] >= 80.0
    assert res["indicator"] == "🟢"

def test_color_harmony_clash():
    # Warm mustard / amber (#D97706) clashes with Cool Winter
    res = evaluate_color_harmony("#D97706", "Cool Winter")
    assert res["color_harmony_score"] < 75.0
