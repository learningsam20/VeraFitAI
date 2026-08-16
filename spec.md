# VeraFit AI — Specification & Acceptance Criteria (`spec.md`)

## 1. Global System & UI Requirements

### Feature 1.1: Responsive Application Shell & Navigation
**Description:** The application must provide a responsive layout that adapts to mobile, tablet, and desktop viewports, featuring a collapsible sidebar and a top navigation header.
**Acceptance Criteria:**
* **Desktop (>1024px):** 
  * The left sidebar is visible and can be toggled between expanded (240px text+icon) and collapsed (64px icon-only).
  * Main content occupies the remaining viewport width.
* **Mobile (<768px):** 
  * The sidebar is hidden by default and accessible via a hamburger menu icon in the top header.
  * When opened, the sidebar renders as an off-canvas swipeable drawer (sheet).
* **Persistence:** The collapsed/expanded state of the sidebar on desktop is saved in `localStorage` and persists across page reloads.
* **Header Components:** The header must contain the VeraFit logo (geometric hanger), breadcrumbs mapping to the current route, the Mood Slider, the Theme Toggle, and a User Profile dropdown.

### Feature 1.2: System-Aware Dark & Light Theming
**Description:** The UI must support both light and dark modes with a seamless toggle and no unstyled flash on initial load.
**Acceptance Criteria:**
* The application defaults to the user's OS system preference (`prefers-color-scheme`).
* The Theme Toggle in the header allows the user to manually override the theme (Light/Dark).
* Theme preferences are stored in `localStorage` or a cookie.
* **Colors:** All Tailwind CSS classes must use semantic variables (e.g., `bg-background`, `text-primary`) configured for both dark and light palettes in `tailwind.config.js`.

### Feature 1.3: User Authentication
**Description:** Secure user access via standard OAuth and email providers.
**Acceptance Criteria:**
* Unauthenticated users attempting to access `/dashboard` or `/try-on` are redirected to `/login`.
* Users can sign in via Google OAuth or Magic Email Link.
* Upon successful authentication, a secure JWT session is established and the user is routed to the main Try-On Studio.
* The header displays the user's avatar; clicking it opens a dropdown with "Settings" and "Logout" options.

---

## 2. Core Intelligent Features (LangGraph Workflow)

### Feature 2.1: The Keep-Probability Score Engine
**Description:** The system aggregates outputs from multiple AI agents to calculate a single $0 - 100\%$ prediction score representing the likelihood a user will keep a garment.
**Acceptance Criteria:**
* The backend exposes a `POST /api/v1/analyze/keep-probability` endpoint that accepts the user ID, image base64, garment SKU, and garment metadata.
* The endpoint successfully triggers the LangGraph `StateGraph` workflow.
* The response payload strictly returns a combined score calculated from Fit Consistency, Color Harmony, and Fabric Safety, modulated by the user's mood and allergy data.
* The UI renders the score inside a prominent radial progress meter. The meter color dynamically changes: Red (<50%), Yellow (50-79%), Green (80%+).

### Feature 2.2: VTO Stress-Test (Fit Consistency)
**Description:** The VTO Agent generates multiple try-on images simultaneously to verify AI structural consistency.
**Acceptance Criteria:**
* The LangGraph VTO Node triggers three (3) parallel asynchronous calls to the YouCam Apparel VTO API.
* The Math Engine Node receives the three images, converts them to grayscale arrays, and calculates the Structural Similarity Index Measure (SSIM) between them.
* If the average SSIM is $<0.80$, the UI flags the fit as "Unstable" and reduces the Keep-Probability score proportionally.

### Feature 2.3: Color True-Match
**Description:** Validates if the garment's color aligns with the user's seasonal profile.
**Acceptance Criteria:**
* The LangGraph Color Node extracts the garment's hex code and compares its CIELab values against the user's saved `DigitalMannequin.colorSeason`.
* It assigns a score from 0-100 based on the color distance.
* The API returns a brief diagnostic string (e.g., "Mustard Yellow clashes with your Cool Winter undertones").
* The UI displays a `🟢`, `🟡`, or `🔴` status indicator next to the "Color Match" breakdown line item.

### Feature 2.4: Fabric-to-Skin Safety Check
**Description:** Identifies physical incompatibilities between the garment's material and the user's skin concerns or allergies.
**Acceptance Criteria:**
* The Fabric Agent cross-references the garment's `materials` array (e.g., `{"wool": 0.40}`) with the user's saved `allergies` array and active skin concerns (e.g., rosacea).
* If an allergy matches a garment material, a hard penalty multiplier ($0.40$) is applied to the Keep-Probability score.
* If active acne/rosacea is detected on the neck/jawline and the garment has a high collar made of synthetic material, a "Fabric Warning" string is appended to the API response.
* The UI clearly highlights any Fabric Warnings in an alert box (e.g., Shadcn UI `<Alert variant="destructive">`).

### Feature 2.5: AI X-Ray (Explainability Dashboard)
**Description:** A collapsible section that reveals the mathematical reasoning behind the Keep-Probability score to build user trust.
**Acceptance Criteria:**
* The UI includes a "View AI Diagnostics" toggle button below the Keep-Probability score.
* When expanded, it renders a 3-tab layout:
  * **Fit Tab:** Displays a React-Compare-Slider showing a side-by-side view of two of the generated VTO images, allowing the user to scrub back and forth to see the pixel variance.
  * **Color Tab:** Displays a color swatch of the garment next to the user's assigned seasonal color palette.
  * **Skin Tab:** Lists detected skin concerns and how they relate to the garment's fabric composition.

---

## 3. Personalization & User Data

### Feature 3.1: Digital Mannequin Onboarding
**Description:** A one-time setup wizard to collect baseline user data for the Keep-Probability algorithm.
**Acceptance Criteria:**
* The user can upload a baseline, well-lit selfie.
* The system utilizes YouCam Skin Analysis and Facial Color Tones APIs to automatically populate the user's `DigitalMannequin` database record with their skin tone, concerns, and color season.
* The user is presented with a checklist to manually select active allergies/sensitivities (e.g., Wool, Nickel, Synthetics).

### Feature 3.2: Contextual Mood Slider
**Description:** A real-time input that adjusts how strictly the AI scores formal vs. casual garments based on the user's current intent.
**Acceptance Criteria:**
* A horizontal slider is present in the global header with labels spanning from "Cozy/Relaxed" to "Sharp/Power".
* Adjusting the slider updates a global Zustand state `moodModifier` (ranging from -1.0 to 1.0).
* This modifier is included in the payload sent to `/api/v1/analyze/keep-probability`.
* The Synthesis Agent adjusts the Keep-Probability score dynamically (e.g., boosting a hoodie's score if the slider is set to "Cozy").

### Feature 3.3: Return/Keep Post-Mortem (Continuous Learning)
**Description:** A feedback mechanism for users to confirm or reject the AI's prediction, which recalibrates future scoring weights.
**Acceptance Criteria:**
* The UI provides a "History" page listing all past Try-On Sessions.
* Users can click a "Log Feedback" button on past items to indicate if they KEPT or RETURNED the item.
* If RETURNED, a modal prompts them for a reason (Fit, Fabric, Color, Quality).
* Submitting this form sends a `POST` request to `/api/v1/feedback/record`.
* The backend updates the user's `comfortVsStyleBias` or `historicalBias` in the `UserPreference` database table, ensuring subsequent predictions are weighted accordingly.