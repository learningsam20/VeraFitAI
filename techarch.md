Here is the comprehensive specification, technical architecture, and implementation blueprint formatted as a Markdown document ready to feed directly into an AI coding agent.

---

# VeraFit AI — Product Specification & Technical Architecture

## 1. Executive Summary & System Overview

**VeraFit** is a multi-agent e-commerce purchase certainty engine that converts generative Virtual Try-On (VTO) outputs into a deterministic, personalized **Keep-Probability Score ($0 - 100\%$)**.

Instead of treating VTO as an unverified visual preview, VeraFit uses a multi-agent **LangGraph** pipeline to:

1. **Stress-test fit consistency** across multiple VTO generations using pixel-level Structural Similarity Index Measure (SSIM).
2. **Evaluate color harmony** against the shopper's calibrated CIELab skin/hair/eye tones.
3. **Audit fabric-to-skin compatibility** by cross-referencing garment material composition against detected skin concerns and user sensitivities.
4. **Hyper-personalize scoring** using historical feedback loops (returns/keeps), style preferences, allergy filters, and real-time mood/context sliders.

---

## 2. Tech Stack Architecture

### Frontend

* **Framework:** Next.js (App Router) / React with TypeScript
* **Styling:** Tailwind CSS + Radix UI / Shadcn UI components
* **State Management:** Zustand (client state) + TanStack Query (server state & caching)
* **Theming:** `next-themes` (Dark/Light mode with system-preference detection and zero-flash load)
* **Icons:** Lucide React
* **Image Canvas / Diffing Visuals:** HTML5 Canvas / Fabric.js / React-Compare-Slider

### Backend & Agent Orchestration

* **Framework:** Python (FastAPI) with asynchronous endpoints
* **Agent Framework:** **LangGraph** (StateGraph execution with parallel node branching)
* **Computer Vision / Image Math:** OpenCV (`cv2`), `scikit-image` (`structural_similarity`), NumPy
* **Third-Party APIs:** YouCam APIs (Apparel VTO, Facial Color Tones, Skin Analysis)
* **LLM Engine (Synthesis & Explanation):** LangChain / OpenAI API (GPT-4o or Claude 3.5 Sonnet)

### Database & Authentication

* **Database:** PostgreSQL (via Prisma ORM / SQLAlchemy)
* **Cache & Message Broker:** Redis (for session-level VTO caching and rate-limiting)

---
* **Auth:** NextAuth.js / Supabase Auth (supporting OAuth2 Google/GitHub, email magic links, and JWT sessions)

## 3. LangGraph Multi-Agent Architecture

```
                       ┌───────────────────────┐
                       │      User Input       │
                       │ (Image, Garment, SKU) │
                       └───────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
        ┌───────────────────────┐     ┌───────────────────────┐
        │       VTO Agent       │     │  Color Harmony Agent  │
        │ (Fires 3x Concurrent) │     │ (Facial Tones + Lab)  │
        └───────────┬───────────┘     └───────────┬───────────┘
                    ▼                             │
        ┌───────────────────────┐                 │
        │      Math Engine      │                 │
        │ (OpenCV / SSIM Calc)  │                 │
        └───────────┬───────────┘                 │
                    │                             │
                    ├─────────────────────────────┤
                    │                             │
                    ▼                             ▼
        ┌───────────────────────┐     ┌───────────────────────┐
        │ Fabric Safety Agent   │     │ Personalization Agent │
        │ (Skin vs. Materials)  │     │ (History + Mood/Bias) │
        └───────────┬───────────┘     └───────────┬───────────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                       ┌───────────────────────┐
                       │    Synthesis Agent    │
                       │ (Master Score + LLM)  │
                       └───────────┬───────────┘
                                   ▼
                       ┌───────────────────────┐
                       │  Keep-Probability API │
                       └───────────────────────┘

```

### Shared State Schema (`GraphState`)

```python
from typing import TypedDict, List, Dict, Optional, Any

class GraphState(TypedDict):
    # Inputs
    user_id: str
    user_image_b64: str
    garment_id: str
    garment_image_b64: str
    garment_material: Dict[str, float]  # e.g., {"wool": 0.40, "polyester": 0.60}
    garment_color_hex: str
    mood_modifier: float  # -1.0 (Cozy/Relaxed) to +1.0 (Structured/Power)
    
    # User Profile Context
    allergies: List[str]  # e.g., ["wool_sensitive", "nickel", "synthetic_chafing"]
    preferred_fit: str    # "oversized", "tailored", "regular"
    color_season: str     # "Cool Winter", "Warm Autumn", etc.
    historical_bias: Dict[str, float]
    
    # Intermediate Agent Artifacts
    vto_renders: List[str]            # 3 base64 generated images
    fit_repeatability_score: float    # 0.0 - 100.0 (SSIM variance)
    color_harmony_score: float        # 0.0 - 100.0
    color_diagnostics: str
    fabric_safety_score: float        # 0.0 - 100.0
    fabric_warnings: List[str]
    personalization_delta: float      # Score adjustment from user history
    
    # Final Output
    keep_probability: float           # 0.0 - 100.0
    breakdown_metrics: Dict[str, float]
    natural_language_verdict: str

```

---

## 4. Master Scoring Algorithm & Mathematical Formulations

The **Keep-Probability Score ($K$)** is computed via a multi-factor weighted equation combined with hard penalty multipliers:

$$K = \text{Clamp}\left( \Big[ (w_{\text{fit}} \cdot S_{\text{fit}}) + (w_{\text{color}} \cdot S_{\text{color}}) + (w_{\text{fabric}} \cdot S_{\text{fabric}}) + \Delta_{\text{pers}} \Big] \times M_{\text{allergy}} \times M_{\text{mood}}, \; 0, \; 100 \right)$$

### Factor Breakdown:

1. **Fit Repeatability ($S_{\text{fit}}$):**

$$\text{SSIM}_{\text{avg}} = \frac{\text{SSIM}(I_1, I_2) + \text{SSIM}(I_2, I_3) + \text{SSIM}(I_1, I_3)}{3}$$


$$S_{\text{fit}} = \text{SSIM}_{\text{avg}} \times 100$$


2. **Color Harmony ($S_{\text{color}}$):** Derived from Euclidean distance in CIELab color space between the garment dominant color and the user's seasonal color palette.
3. **Fabric Safety ($S_{\text{fabric}}$):** Baseline of $100\%$, penalized by active skin severity scores (e.g., YouCam Rosacea Score $\times$ % Synthetic rough fibers).
4. **Allergy Multiplier ($M_{\text{allergy}}$):**
* $0.40$ if user has registered allergy to garment material (hard penalty).
* $1.00$ if no allergy conflict.


5. **Mood / Context Scalar ($M_{\text{mood}}$):** Dynamic scalar between $0.90$ and $1.10$ based on current daily style slider (e.g., Casual/Comfort vs. High Formality).
6. **Weights:** Standard defaults: $w_{\text{fit}} = 0.45$, $w_{\text{color}} = 0.30$, $w_{\text{fabric}} = 0.25$ (dynamically tuned by the personalization feedback loop).

---

## 5. Database Schema & Data Models

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id               String            @id @default(uuid())
  email            String            @unique
  name             String?
  avatarUrl        String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  mannequin        DigitalMannequin?
  preferences      UserPreference?
  tryOnSessions    TryOnSession[]
  feedbackHistory  FeedbackLog[]
}

model DigitalMannequin {
  id                 String   @id @default(uuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  basePhotoUrl       String
  colorSeason        String   // "Warm Spring", "Cool Winter", etc.
  skinUndertone      String   // "Cool", "Warm", "Neutral"
  detectedConcerns   Json     // {"rosacea": 42, "acne": 15, "sensitivity": 60}
  bodyType           String?  // Proportions map
  updatedAt          DateTime @updatedAt
}

model UserPreference {
  id                 String   @id @default(uuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  allergies          String[] // ["wool", "polyester", "latex", "nickel"]
  preferredFit       String   @default("regular") // "tight", "regular", "oversized"
  comfortVsStyleBias Float    @default(0.5)       // 0.0 (Pure Style) to 1.0 (Pure Comfort)
  themePreference    String   @default("system")  // "light", "dark", "system"
}

model TryOnSession {
  id                     String        @id @default(uuid())
  userId                 String
  user                   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  garmentSku             String
  garmentName            String
  garmentMaterial        Json          // {"cotton": 0.7, "wool": 0.3}
  garmentColorHex        String
  renderedVtoUrl         String
  fitRepeatabilityScore  Float
  colorHarmonyScore      Float
  fabricSafetyScore      Float
  keepProbabilityScore   Float
  aiExplanation          String
  createdAt              DateTime      @default(now())
  
  feedback               FeedbackLog?
}

model FeedbackLog {
  id               String       @id @default(uuid())
  userId           String
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionId        String       @unique
  session          TryOnSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  actionTaken      String       // "KEPT", "RETURNED", "ABANDONED_CART"
  returnReason     String?      // "FIT_TOO_TIGHT", "FABRIC_ITCHY", "COLOR_UNFLATTERING", "POOR_QUALITY"
  userNotes        String?
  createdAt        DateTime     @default(now())
}

```

---

## 6. API Specifications (FastAPI)

### `POST /api/v1/analyze/keep-probability`

Evaluates an item through the LangGraph pipeline.

**Request Payload:**

```json
{
  "userId": "usr_94b3a8c1",
  "userImageB64": "data:image/jpeg;base64,...",
  "garment": {
    "sku": "GAR-8842",
    "name": "Merino Wool Ribbed Turtleneck",
    "colorHex": "#2C3E50",
    "materials": {
      "merino_wool": 0.85,
      "polyamide": 0.15
    },
    "category": "tops_knitwear"
  },
  "context": {
    "moodSlider": 0.2,
    "eventContext": "business_casual"
  }
}

```

**Response Payload:**

```json
{
  "status": "success",
  "data": {
    "sessionId": "ses_4810283",
    "keepProbability": 84.5,
    "verdict": "STRONG_BUY",
    "scores": {
      "fitRepeatability": 94.2,
      "colorHarmony": 88.0,
      "fabricSafety": 68.0
    },
    "bestVtoRenderUrl": "https://cdn.verafit.ai/renders/ses_4810283_final.webp",
    "diagnostics": {
      "colorSeason": "Cool Winter",
      "colorMatchReason": "Navy #2C3E50 aligns with your high-contrast undertones.",
      "fabricWarnings": [
        "Contains 85% Merino Wool. Minor friction alert for mild neck rosacea."
      ],
      "ssimVariance": 0.058
    },
    "aiExplanation": "This item has an 84.5% Keep Probability. The structural drape is highly stable across 3 AI simulations (94.2% repeatability). While the navy tone perfectly matches your Cool Winter palette, take note of the high wool content if your neck is currently sensitive."
  }
}

```

### `POST /api/v1/feedback/record`

Ingests user actions (returns/keeps) to update personal preference vectors.

**Request Payload:**

```json
{
  "userId": "usr_94b3a8c1",
  "sessionId": "ses_4810283",
  "action": "RETURNED",
  "reason": "FABRIC_ITCHY",
  "details": "Neck area flared up within 30 minutes."
}

```

---

## 7. UI/UX Specifications & Responsive Layout System

### Global Shell & Layout Structure

* **App Header:**
* **Brand Favicon & Icon:** Minimalist geometric hanger logo with verification checkmark.
* **Breadcrumbs / Active View Title:** Clear navigational context.
* **Context Mood Slider:** Instant toggle for daily shopping intent (e.g., *Relaxed / Casual $\longleftrightarrow$ Sharp / Power*).
* **Theme Switcher:** Animated sun/moon icon toggle with smooth CSS transitions.
* **User Avatar & Auth Dropdown:** Shows profile status and quick logout/settings.


* **Collapsible Left Sidebar:**
* **Desktop:** Expandable (240px) and Collapsible (64px icon-only) with persistent state stored in `localStorage`.
* **Mobile:** Off-canvas drawer (sheet overlay) toggled via standard hamburger button with touch-swipe dismissal.
* **Navigation Links:**
1. 🛍️ **Try-On & Predict (Live Studio)**
2. 👤 **Digital Mannequin (Skin & Color Profile)**
3. 🛡️ **Allergy & Fabric Safe-List**
4. 📊 **Purchase History & Return Insights**
5. 🔬 **AI X-Ray (Debug & Diagnostics Inspector)**





```
+-----------------------------------------------------------------------------------+
| [=] VeraFit Icon  | View: Live Try-On Studio | [Mood: Cozy <> Sharp] | [Theme] [User] |
+-----------+-----------------------------------------------------------------------+
| (Sidebar) | (Main Content Area - Responsive Grid)                                 |
|           |                                                                       |
| [Try-On]  |  +---------------------------+  +-----------------------------------+  |
| [Profile] |  |                           |  | Keep Probability: 84.5%           |  |
| [SafeList]|  |   VTO Render Preview      |  | [===========O===]                 |  |
| [History] |  |   (Side-by-side or        |  |                                   |  |
| [AI X-Ray]|  |    interactive slider)    |  | Fit Score: 94.2%                  |  |
|           |  |                           |  | Color Harmony: 88.0%              |  |
|           |  |                           |  | Fabric Safety: 68.0% (Warning)   |  |
|           |  +---------------------------+  +-----------------------------------+  |
|           |                                                                       |
|           |  [ View AI Diagnostics & X-Ray Math V ]                               |
+-----------+-----------------------------------------------------------------------+

```

### Breakpoints & Mobile Responsiveness

* **Mobile (< 768px):** Single-column stacked layout. The VTO preview takes 100% width on top, followed by the Keep Probability score card and expandable diagnostic tabs. Sidebar converts to a bottom navigation bar or swipe-out modal drawer.
* **Tablet (768px - 1024px):** 2-column balanced layout with compact sidebar.
* **Desktop (> 1024px):** Full multi-column dashboard with side-by-side VTO comparison, interactive SSIM heatmap inspector, and full telemetry sidebar.

---

## 8. Implementation Steps for Coding Agent

```bash
# 1. Project Initialization
npx create-next-app@latest verafit-frontend --typescript --tailwind --app --eslint
pip install fastapi uvicorn langgraph langchain-openai httpx opencv-python scikit-image numpy pydantic prisma

# 2. Key Directories to Create
mkdir -p backend/app/agents
mkdir -p backend/app/math_engine
mkdir -p backend/app/routers
mkdir -p frontend/src/components/layout
mkdir -p frontend/src/components/tryon
mkdir -p frontend/src/components/diagnostics
mkdir -p frontend/src/hooks
mkdir -p frontend/src/stores

```

### Development Execution Order:

1. **Database & Schema Setup:** Execute Prisma migrations with the `User`, `DigitalMannequin`, `TryOnSession`, and `FeedbackLog` models.
2. **LangGraph Backend Implementation:**
* Build `agents/vto_agent.py` to handle async concurrent requests.
* Build `math_engine/ssim_calculator.py` to decode image arrays and output matrix similarity.
* Build `agents/color_agent.py` and `agents/fabric_agent.py`.
* Compile the `StateGraph` in `agents/workflow.py`.


3. **FastAPI Endpoints:** Connect the compiled workflow to `/api/v1/analyze/keep-probability`.
4. **Frontend Architecture:**
* Implement `next-themes` provider and dark/light CSS root variables in `globals.css`.
* Implement collapsible Sidebar with mobile sheet fallback in `components/layout/sidebar.tsx`.
* Implement the Keep-Probability radial progress meter and "AI X-Ray" interactive diff viewer.


5. **Feedback Loop Integration:** Add return/keep post-mortem modal that sends calibration data to `/api/v1/feedback/record`.