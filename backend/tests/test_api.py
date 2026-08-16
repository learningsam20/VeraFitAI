import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.database import init_db, AsyncSessionLocal
from backend.app.services.seed_data import seed_database
from backend.app.config import settings

@pytest.mark.asyncio
async def test_health_and_root_endpoints():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_analyze_and_feedback_flow(monkeypatch):
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)

    # Tests exercise the full scoring workflow with the mock VTO renderer
    # enabled, independent of the .env runtime flag (real YouCam API is not
    # reachable in CI/dev). Runtime behavior is governed by YOUCAM_MOCK_FALLBACK.
    monkeypatch.setattr(settings, "YOUCAM_MOCK_FALLBACK", True)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test Analyze Keep-Probability
        payload = {
            "userId": "usr_94b3a8c1",
            "garment": {
                "sku": "GAR-8842",
                "name": "Merino Wool Ribbed Turtleneck",
                "colorHex": "#2C3E50",
                "materials": {"merino_wool": 0.85, "polyamide": 0.15},
                "category": "tops_knitwear"
            },
            "context": {
                "moodSlider": 0.2,
                "eventContext": "business_casual"
            }
        }
        res = await client.post("/api/v1/analyze/keep-probability", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]
        session_id = data["sessionId"]
        assert "keepProbability" in data
        assert "scores" in data
        assert "bestVtoRenderUrl" in data

        # 2. Test Feedback Record
        fb_payload = {
            "userId": "usr_94b3a8c1",
            "sessionId": session_id,
            "action": "RETURNED",
            "reason": "FABRIC_ITCHY",
            "details": "Neck area had slight itchiness from wool content"
        }
        fb_res = await client.post("/api/v1/feedback/record", json=fb_payload)
        assert fb_res.status_code == 200
        assert fb_res.json()["status"] == "success"

        # 3. Test History
        hist_res = await client.get("/api/v1/history?userId=usr_94b3a8c1")
        assert hist_res.status_code == 200
        history_list = hist_res.json()
        assert len(history_list) >= 1
        assert any(item["sessionId"] == session_id for item in history_list)
