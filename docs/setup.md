# VeraFit AI — Setup Guide

Run the VeraFit Purchase Certainty Engine locally, in Docker, or on AWS.

---

## 0. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.13+ (3.14 recommended) | backend venv |
| Node.js | 18+ | frontend build |
| npm | 9+ | |
| Docker | 20+ | optional (container run) |
| AWS CLI v2 | latest | optional (AWS deploy) |
| Ollama | optional | local LLM (`granite4.1:3b` used in dev) |

A **YouCam API key** is optional: `YOUCAM_MOCK_FALLBACK=true` (the default in `.env.example`) produces deterministic local VTO renders so the app runs fully offline.

---

## 1. Clone & configure

```bash
git clone <your-repo-url> youcam
cd youcam
cp .env.example .env
```

Edit `.env` as needed. Key values:

```ini
ENVIRONMENT=development
SECRET_KEY=<generate-a-random-one>          # `python -c "import secrets;print(secrets.token_hex(32))"`
DATABASE_URL=sqlite+aiosqlite:///./data/verafit.db
YOUCAM_API_KEY=
YOUCAM_API_URL=https://yce-api-01.makeupar.com
YOUCAM_MOCK_FALLBACK=true                    # false uses the live YouCam API
NEXT_PUBLIC_API_URL=http://localhost:5194/api/v1
LLM_MODEL=ollama/granite4.1:3b               # or gpt-4o + OPENAI_API_KEY
OLLAMA_API_BASE=http://localhost:11434
```

---

## 2. Run locally (backend + frontend)

### 2.1 Backend (FastAPI on `:5194`)

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 5194
```

- API base: `http://127.0.0.1:5194/api/v1`
- Swagger UI: `http://127.0.0.1:5194/docs`
- Health: `http://127.0.0.1:5194/health`

The first start auto-creates `data/verafit.db` and seeds users, mannequins, preferences, and the garment catalog.

### 2.2 Frontend (Vite on `:5193`)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5193  (note: Vite binds IPv6 — use localhost)
```

Open `http://localhost:5193`, pick a persona from the header (Elena / Astrid / Lars for shoppers; Marcus / Freja for merchant admins), and run a fit stress-test in **Fitting Room**.

### 2.3 One-shot convenience scripts

| Script | Purpose |
|---|---|
| `scripts/start.sh` | start backend + frontend (background) |
| `scripts/stop.sh` / `scripts/kill_all.sh` | stop services / hard kill |
| `scripts/restart.sh` | restart backend + frontend |
| `scripts/test.sh` | **10 pytest** + `npm run typecheck` |
| `scripts/seed_db.py` | re-seed / repair DB state |
| `scripts/generate_garment_images.py` | regenerate gender-aware catalog imagery |

> ⚠️ **`scripts/reseed_diverse_data.py` wipes `TryOnSession` and `FeedbackLog` rows.** It is a demo-data reset tool — do not run against data you want to keep.

---

## 3. Run with Docker (single container)

```bash
docker compose up -d --build
# UI + API → http://localhost:5194   Swagger → http://localhost:5194/docs
docker compose logs -f verafit
```

Manual build:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=/api/v1 -t verafit:latest .
docker run -p 5194:5194 -v verafit-data:/app/data -e SECRET_KEY=... verafit:latest
```

The image bundles the built SPA (`frontend/dist`) and serves it from the same port as the API.

---

## 4. Deploy to AWS

Requires the AWS CLI to be authenticated.

```bash
./scripts/deploy.sh                          # default: ECS Fargate + ALB
DEPLOY_TARGET=ec2 ./scripts/deploy.sh        # EC2 + docker compose
AWS_REGION=eu-west-1 ./scripts/deploy.sh
```

Fargate flow: build & push to **ECR** → provision SG / ALB / target group / task (env from `.env`) → create **ECS service** → prints the ALB URL. Health check uses `/health`.

EC2 flow: launches an Ubuntu 24.04 instance with Docker installed via user-data, copies `docker-compose.yml` + `.env`, and runs `docker compose up -d`; the app is reachable on `http://<public-ip>:5194`.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend can't reach API | `NEXT_PUBLIC_API_URL` in `.env` must match the running backend host/port; restart frontend after changing it |
| `localhost:5193` refused | Vite binds IPv6 — use `http://localhost:5193` (not `127.0.0.1`) |
| YouCam tasks hang/fail | set `YOUCAM_MOCK_FALLBACK=true`; check `YOUCAM_API_KEY` |
| LLM verdict errors | set `OLLAMA_API_BASE` or a provider key matching `LLM_MODEL` |
| Stale personas/data after code changes | `scripts/seed_db.py`, then restart backend (seeding runs at startup) |
| Ports already in use | `scripts/kill_all.sh` then restart |

---

## 6. Environment reference

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | surfaced in `/health` |
| `BACKEND_HOST` / `BACKEND_PORT` | `0.0.0.0` / `5194` | uvicorn bind |
| `FRONTEND_PORT` | `5193` | Vite dev port |
| `SECRET_KEY` | dev-only | token signing — **set a strong value in production** |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/verafit.db` | SQLite (CWD-relative to repo root) |
| `YOUCAM_API_KEY` / `YOUCAM_API_URL` / `YOUCAM_MOCK_FALLBACK` | — / `yce-api-01.makeupar.com` / `true` | VTO provider |
| `LLM_MODEL` | `gpt-4o` | LiteLLM model string |
| `OLLAMA_API_BASE` | `http://localhost:11434` | local LLM endpoint |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | — | LiteLLM provider keys |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5194/api/v1` | frontend → API base (baked at build) |
| `DEFAULT_*_URL` | Unsplash | fallback imagery |
| `DEFAULT_WEIGHT_*` | fit .45 / color .30 / fabric .25 | score weights |
| `ALLERGY_PENALTY_MULTIPLIER` | `0.40` | fabric-safety penalty |
