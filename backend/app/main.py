import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.database import init_db, AsyncSessionLocal
from backend.app.services.seed_data import seed_database
from backend.app.routers import analyze, feedback, mannequin, garments, history, admin_portal, insights

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verafit")

# Built frontend (frontend/dist) served by the same container in production /
# Docker deployments. Skipped when no build exists (plain API-only runs).
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database and pre-seeding catalog...")
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    logger.info("VeraFit backend ready.")
    yield
    logger.info("Shutting down VeraFit backend...")

app = FastAPI(
    title="VeraFit AI — Purchase Certainty Engine",
    description="Multi-agent LangGraph system with SSIM Fit Stress-Testing, CIELab Color Harmony, and Fabric-to-Skin Safety auditing.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
api_v1_prefix = "/api/v1"
app.include_router(analyze.router, prefix=api_v1_prefix)
app.include_router(feedback.router, prefix=api_v1_prefix)
app.include_router(mannequin.router, prefix=api_v1_prefix)
app.include_router(garments.router, prefix=api_v1_prefix)
app.include_router(history.router, prefix=api_v1_prefix)
app.include_router(insights.router, prefix=api_v1_prefix)
app.include_router(admin_portal.router, prefix=api_v1_prefix)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "verafit-ai-backend",
        "environment": settings.ENVIRONMENT,
        "llm_model": settings.LLM_MODEL
    }

@app.get("/")
async def root():
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {
        "message": "Welcome to VeraFit AI API",
        "docs": "/docs",
        "api_v1": "/api/v1"
    }


# Serve the built SPA (production / Docker) as a single deployment. Registered
# after all API routes so /api/v1/*, /health and /docs take precedence.
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="spa-assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and str(candidate).startswith(str(FRONTEND_DIST)) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
