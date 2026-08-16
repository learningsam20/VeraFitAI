# =============================================================================
# VeraFit AI — Purchase Certainty Engine
# Single-container image: built React SPA served by the FastAPI backend.
#
#   Stage 1: build the frontend (Vite / React / TS)
#   Stage 2: runtime image with Python backend + bundled frontend
#
# Build:
#   docker build -t verafit:latest .
#   docker build --build-arg NEXT_PUBLIC_API_URL=/api/v1 -t verafit:latest .
# Run:
#   docker run -p 5194:5194 -v verafit-data:/app/data -e SECRET_KEY=... verafit:latest
# =============================================================================

# ------------------------------------------------------------------ Stage 1 --
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Only the pieces Vite needs to resolve dependencies are copied first so the
# layer is cached across builds.
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./

# API base URL baked into the SPA at build time. Default to a same-origin path
# so the container can serve UI + API on one port behind a load balancer.
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# ------------------------------------------------------------------ Stage 2 --
FROM python:3.14-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# OS deps required by OpenCV / scikit-image runtime wheels.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Backend Python dependencies (cached layer).
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Application source.
COPY backend/ backend/
COPY scripts/ scripts/

# Built SPA from Stage 1.
COPY --from=frontend-build /app/dist frontend/dist/

# SQLite data + config templates.
COPY data/ data/
COPY .env.example .env.example

# Non-root runtime user; SQLite lives in /app/data (mount a volume here).
RUN mkdir -p /app/data /app/logs && chmod -R u+rwX /app/data /app/logs

EXPOSE 5194

# uvicorn serves the FastAPI app, which also statically serves frontend/dist.
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "5194", "--workers", "1"]
