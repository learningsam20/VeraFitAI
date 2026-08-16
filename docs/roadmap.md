# VeraFit AI — Product & Engineering Roadmap

> Status legend: ✅ done · 🟡 in progress · 🔲 planned

---

## M1 — Core Purchase Certainty Engine (✅ shipped)

- Multi-agent LangGraph workflow: VTO + Color + Fabric + Personalization + Purchase-History → Synthesis
- SSIM fit stress-testing (3 parallel renders → variance + diff heatmap), CIELab ΔE color harmony, fabric-to-skin allergen audit
- Weighted `keep_probability` score, STRONG_BUY / CONSIDER_CAUTION / HIGH_RETURN_RISK verdicts, natural-language AI explanation (LiteLLM, Ollama-capable)
- Digital mannequin calibration (color season + skin concerns), garment catalog, feedback loop (keep / purchase / return)
- **Gender-aware fidelity:** distinct gender pools for avatars and full-body mannequin photos; men's garment imagery for male shoppers; every persona has a real, distinct full-body photo used as the VTO source

## M2 — Merchant (B2B) Analytics (✅ shipped)

- Vendor-isolated Admin dashboard: Marcus Vance (Venice Luxury Atelier) vs Freja Lindqvist (Nordic Organic Weaves) see only **their** fleet
- Real-time pulse, vendor clusters + fleet KPIs, 7-day demand trends, master-data + fabric-material config
- Supplier defect analytics, AI-efficacy tracking, inventory clearance audits + advice, agent analytics, cohort analytics, B2B report
- SKU-prefix vendor resolver keeps every derived metric isolated end-to-end

## M3 — Packaging & Delivery (✅ shipped)

- Single-container image (SPA served by FastAPI), `docker compose`, health check
- AWS deployment via `scripts/deploy.sh` (ECS Fargate + ALB or EC2)
- Documentation (architecture / setup / roadmap), presentation, MIT license

---

## M4 — Hardening & Scale (🟡 next)

- **Real authentication:** JWT login for shoppers and merchant admins (replaces demo persona switcher)
- **DB migration tooling** (Alembic) + Postgres option; SQLite → managed DB for concurrency
- **Object storage:** user photos / VTO renders to S3 (no more base64 in SQLite)
- **HTTPS/TLS** in front of the ALB (ACM + listener :443); production LLM keys via Secrets Manager
- **CI/CD:** GitHub Actions → build, test, push to ECR, deploy (blue/green)
- **Multi-worker uvicorn + queue** for long-running YouCam tasks (task status endpoints)

## M5 — Deeper Prediction (🔲 planned)

- **Auto-calibration on device:** use phone camera + flash to derive color season & skin concerns without manual setup
- **Generative fit simulation:** multiple body scans → drape prediction per size (beyond 2D SSIM)
- **Fabric knowledge base:** grow the fiber ↔ skin-irritation matrix; tie warnings to certified eco/safety standards
- **Purchase history on more signals:** price sensitivity, size-fit drift, returns-per-category
- **Generative garment visualization** (AI-rendered garment on the mannequin) where YouCam VTO is unavailable

## M6 — Network Effects & Enterprise (🔲 planned)

- **VeraFit Marketplace:** anonymized fleet intelligence shared across brands; "what keeps best" as a sellable signal
- **Return-insurance scoring** for checkout partners (predict return likelihood at SKU level)
- **Supply-chain tie-in:** surface high-return-risk SKUs to merchandising + buying teams pre-purchase
- **Multi-language + PWA** for global shopper rollout
- **Whitelabel B2B portal** per retailer with custom weighting presets

---

## Demo & GTM Milestones

- 🟡 Video walkthrough (see README) + PDF pitch deck (`docs/presentation.html` → print to PDF)
- 🔲 Public demo environment on AWS (single click via `scripts/deploy.sh`)
- 🔲 Pilot with 1–2 merchants: measure return-rate reduction as the north-star KPI

---

## North-Star Metrics

| Metric | Why |
|---|---|
| Return rate (before → after VeraFit) | direct value proof for merchants |
| Keep-probability prediction accuracy | model quality vs shopper feedback |
| AI-efficacy (predicted vs realized) | trust in the dashboard |
| Fleet-level return-risk reduction | network-effect story |
