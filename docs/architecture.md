# VeraFit AI — System Architecture

> **One-liner:** VeraFit is a multi-agent "Purchase Certainty Engine" that predicts *before checkout* whether a shopper will keep or return a garment — by stress-testing fit, color harmony, and fabric-to-skin safety on a digital mannequin of the actual user.

---

## 1. High-Level Overview

```
┌──────────────────────────────┐      ┌───────────────────────────────┐
│  React SPA (Vite)            │      │  FastAPI Backend              │
│  ─────────────────────────   │  →   │  ───────────────────────────  │
│  FittingRoom · Calendar      │      │  /api/v1/* routers            │
│  Mannequin · History         │      │  ───────────────────────────   │
│  Learnings · Admin           │      │  LangGraph multi-agent graph   │
│                              │      │  ├─ VTO Agent (YouCam API)    │
│  Auth = demo personas        │      │  ├─ Color Agent (CIELab ΔE)   │
│  (shoppers + merchant admins)│      │  ├─ Fabric Safety Agent        │
│                              │      │  ├─ Personalization Agent     │
└──────────────────────────────┘      │  ├─ Purchase History Agent    │
                                      │  └─ Synthesis Agent (LiteLLM) │
                                      │  ───────────────────────────   │
                                      │  SQLite (aiosqlite) → verafit.db│
                                      └───────────────────────────────┘
```

**Deployment topology:** a single container image (React SPA built into `frontend/dist` and statically served by FastAPI) runs behind one port (`5194`). `docker compose` runs it locally or on a VM; `scripts/deploy.sh` deploys the same image to AWS (ECS Fargate + ALB, or EC2 + docker compose).

---

## 2. Repository Layout

```
youcam/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, SPA static serving
│   │   ├── config.py            # pydantic-settings, .env loading
│   │   ├── database.py          # SQLAlchemy async engine + init
│   │   ├── models.py            # User, DigitalMannequin, UserPreference,
│   │   │                        #   TryOnSession, FeedbackLog, GarmentItem
│   │   ├── schemas.py           # request/response Pydantic models
│   │   ├── agents/              # LangGraph multi-agent workflow
│   │   │   ├── workflow.py      # graph topology: 5 parallel agents → synthesis
│   │   │   ├── state.py         # GraphState TypedDict (shared contract)
│   │   │   ├── vto_agent.py     # YouCam virtual try-on (3 parallel renders)
│   │   │   ├── color_agent.py   # seasonal color harmony
│   │   │   ├── fabric_agent.py  # fabric-to-skin / allergen audit
│   │   │   ├── personalization_agent.py
│   │   │   ├── history_agent.py # purchase-history signals & deltas
│   │   │   ├── synthesis_agent.py
│   │   │   └── compatibility.py # vendor fleet clustering helpers
│   │   ├── math_engine/         # deterministic scoring kernels
│   │   │   ├── ssim_calculator.py   # SSIM variance + diff heatmap
│   │   │   └── color_engine.py      # CIELab ΔE + palette matching
│   │   ├── routers/             # REST API v1
│   │   │   ├── analyze.py       # POST /analyze/keep-probability, /analyze/run
│   │   │   ├── garments.py      # catalog + compatibility
│   │   │   ├── mannequin.py     # profile, color analysis, calibration
│   │   │   ├── feedback.py      # record / purchase / return
│   │   │   ├── history.py       # user history + merchant analytics
│   │   │   ├── insights.py      # learnings + profile report
│   │   │   └── admin_portal.py  # B2B merchant dashboard (vendor-scoped)
│   │   └── services/
│   │       ├── youcam_service.py   # YouCam REST client + mock fallback
│   │       ├── seed_data.py        # DB seeding + persona/photo backfill
│   │       ├── garment_images.py   # gender-aware catalog imagery pools
│   │       └── user_photos.py      # gender/full-body Unsplash pools
│   └── tests/                   # pytest (10 tests) + fixtures
├── frontend/
│   └── src/
│       ├── pages/               # FittingRoom, Calendar, History, Learnings,
│       │                        #   Mannequin, Admin
│       ├── components/tryon/    # VTO slider, garment selector, score cards
│       ├── stores/              # zustand: authStore (personas), tryOnStore
│       └── lib/api.ts           # typed API client (garments, analyze, …)
├── scripts/                     # seed, test, start/stop/restart, deploy.sh
├── data/verafit.db              # SQLite database
├── docs/                        # architecture, setup, roadmap, presentation
├── assets/                      # diagrams & imagery for README / presentation
├── Dockerfile · docker-compose.yml
└── .env / .env.example
```

---

## 3. The Multi-Agent LangGraph Workflow

Every "Keep Probability" request runs a compiled LangGraph (`StateGraph`). Five **domain agents run concurrently** from `START`; all converge into a single **Synthesis Agent**:

```
                    ┌─────────────────────────────────────────────┐
   START ──────────►│  VTO Agent      → renders 3 try-on images    │
      │             │  Color Agent     → CIELab ΔE vs color season │
      │             │  Fabric Agent    → allergen / skin audit     │
      │             │  Personalization → history + mood modifier   │
      │             │  History Agent   → purchase-learnings + delta│
      │             └───────────────────────┬─────────────────────┘
      │                                     │ (all five edges)
      ▼                                     ▼
   Synthesis Agent ──► keep_probability · verdict · AI explanation · persisted session
```

### 3.1 Agent responsibilities

| Agent | Input | Output | Engine |
|---|---|---|---|
| **VTO** | user photo + garment image | 3 rendered images, SSIM variance, diff heatmap, `is_fit_unstable` | YouCam API (`cloth-v4`) or local mock |
| **Color** | garment hex, user color season, skin concerns | CIELab ΔE, harmony score, closest palette match | `math_engine/color_engine.py` |
| **Fabric** | garment material map, allergies, skin concerns | safety score, warnings, allergy multiplier (`0.40` when triggered) | rules on material/allergy matrix |
| **Personalization** | preferred fit, comfort-vs-style bias, mood slider | `personalization_delta`, `mood_scalar` (0.90–1.10) | linear adjustment |
| **History** | aggregated `TryOnSession` + `FeedbackLog` | evidence-backed learnings, recommendations, `purchase_history_delta` | aggregation + heuristics |
| **Synthesis** | all agent outputs | master score, verdict, natural-language explanation | weighted formula + LiteLLM |

### 3.2 Master score formula

```
keep_probability =
     0.45 × fit_repeatability   (SSIM consistency across 3 renders)
   + 0.30 × color_harmony       (CIELab ΔE vs seasonal palette)
   + 0.25 × fabric_safety       (allergen & skin-concern audit)
   +  personalization_delta + purchase_history_delta
   ×  mood_scalar
   (× 0.40 allergy multiplier when a flagged allergen is present)
```

Verdicts: **STRONG_BUY** (≥ 70), **CONSIDER_CAUTION** (40–69), **HIGH_RETURN_RISK** (< 40). Every run is persisted as a `TryOnSession`; shopper feedback (keep / return / purchase) closes the loop.

---

## 4. Data Model

```
User ──┬── DigitalMannequin        (photo, color season, detected concerns)
       ├── UserPreference          (allergies, fit, comfort-vs-style bias)
       ├── TryOnSession            (scores, renders, diagnostics, verdict)
       ├── FeedbackLog             (kept / returned / purchased)
       └── GarmentItem             (catalog: sku, materials, color, category)
```

`gender` on `User` drives gender-appropriate photo pools and men's garment imagery; `vendor_id` scopes merchant analytics so each vendor's Admin dashboard only sees its own fleet.

---

## 5. Identity & Personas

Demo authentication is a frontend persona switcher (zustand + localStorage), not real auth.

| Role | Persona | Profile |
|---|---|---|
| Shopper | Elena Vance | Luxury apparel, Cool Winter, rosacea-prone, wool + nickel allergies |
| Shopper | Astrid Holm | Eco-naturalist, Warm Autumn, eczema-prone, synthetics/latex/wool allergies |
| Shopper | Lars Hedlund | Minimalist menswear, Warm Autumn, sensitive skin |
| Merchant Admin | Marcus Vance | Venice Luxury Atelier (Italy) — `vendor_venice` |
| Merchant Admin | Freja Lindqvist | Nordic Organic Weaves & WFH Collective (Sweden) — `vendor_nordic` |

---

## 6. API Surface (v1)

| Area | Endpoints |
|---|---|
| Analyze | `POST /analyze/keep-probability`, `POST /analyze/run` (by SKU) |
| Garments | `GET/POST /garments`, `GET /garments/compatibility?userId=` |
| Mannequin | `GET /mannequin/profile`, `POST /mannequin/analyze*`, `PUT /mannequin/profile` |
| Feedback | `POST /feedback/record`, `/purchase`, `/return` |
| History | `GET /history`, `GET /history/admin-analytics` |
| Insights | `GET /insights/learnings`, `GET /insights/profile-report` |
| Admin (vendor-scoped) | clusters, `fleet-7day-trends`, master-data (+materials), supplier-analytics, ai-efficacy, session-analytics, inventory-clearance-audit + advice, agent-analytics, cohort-analytics, b2b-report |

Every admin endpoint honors `?vendorId=`; SKU-prefix mapping (`SLK/CRP/CSH/SAT/SYN` → Venice, `LNN/OVR/WOL/COT/SHP` → Nordic) keeps all derived metrics vendor-isolated.

---

## 7. Infrastructure & Deployment

- **Dev:** `scripts/start.sh` → backend (uvicorn, `:5194`) + frontend (Vite, `:5193`); `scripts/test.sh` → pytest + typecheck.
- **Docker:** multi-stage `Dockerfile` (Node build → Python runtime); `docker compose up -d --build` → single container on `:5194` serving SPA + API + `/docs`.
- **AWS:** `scripts/deploy.sh` → build/push to ECR, then either **Fargate** (ECS + ALB + CloudWatch) or **EC2** (user-data Docker + compose). Health check: `/health`.
- **Config:** 100% env-driven (`config.py`, root `.env`). Secrets (`YOUCAM_API_KEY`, LLM keys, `SECRET_KEY`) never committed.
