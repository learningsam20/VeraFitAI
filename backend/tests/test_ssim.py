import pytest
import numpy as np
from backend.app.math_engine.ssim_calculator import compute_multi_vto_ssim, cv2_to_base64

def test_ssim_calculator_identical_images():
    # Create test 512x512 image
    img = np.ones((512, 512, 3), dtype=np.uint8) * 150
    b64 = cv2_to_base64(img)

    # With identical images, SSIM must be 1.0 and fit score 100.0
    res = compute_multi_vto_ssim([b64, b64, b64])
    assert res["average_ssim"] == 1.0
    assert res["fit_score"] == 100.0
    assert res["variance"] == 0.0
    assert res["is_unstable"] is False

def test_ssim_calculator_divergent_images():
    # Create two slightly different images
    img1 = np.ones((512, 512, 3), dtype=np.uint8) * 100
    img2 = np.ones((512, 512, 3), dtype=np.uint8) * 180
    b64_1 = cv2_to_base64(img1)
    b64_2 = cv2_to_base64(img2)

    res = compute_multi_vto_ssim([b64_1, b64_2, b64_1])
    assert res["average_ssim"] < 1.0
    assert "diff_heatmap_b64" in res
