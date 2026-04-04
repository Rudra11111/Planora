# Lovable Frontend Master Prompt: Planora Premium UI

**Context:**
You are building the React frontend for "Planora," a high-end, AI-powered event planning application. The backend (Next.js API routes) is completely built, validated, and strict about data shapes. 

Your objective is to generate an **incredibly premium, editorial-style React frontend** that feels like a professional architect's tool. Focus on high-end SaaS aesthetics using **Stitches (CSS-in-JS)** and **Framer Motion**.

---

## 🎨 Design System: "The Architectural Blueprint"

### Colors & Base
- **Base Layer:** Off-white Base `#F9F9F7`
- **Grid Layer:** Light grid lines `#EFEFEF` rotated at `-6deg`, scaled to `1.2` for depth.
- **Surface Layer:** Single center floating card in pure white with a large soft shadow and `16px` border radius.
- **Palette:** 
  - Primary Text: `#1A1A1A`
  - Secondary/Muted Text: `#707070`
  - Input Background: `#F5F5F3` (recessed feel)
  - CTA/Action Buttons: Dark Charcoal / Black

### Typography
- **Serif (Headings):** Use *Playfair Display* or *Instrument Serif* for "Planora" logo and main page headings ("Draft Your Next Blueprint").
- **Sans-Serif (Body):** Use *Inter* or *Geist* for all functional text. 
- **Labels:** ALL CAPS with spaced lettering (`letter-spacing: 0.1em`).

### UI Elements
- **Inputs:** No borders. Soft rounded corners (`8px`). Visual depth via inner shadows.
- **Buttons:** Dark solid blocks. Bold text with an arrow icon (`→`). Hover should have a slight lift (`y: -2`) and scale (`scale: 1.02`).

---

## 🔌 Backend API Specification
The backend is live at: `https://planora-rejmffw6d-rudra11111s-projects.vercel.app` (or use local `/api/*`).

### 1. Generate Plan (`POST /api/generate-plan`)
- **Payload:**
  ```json
  {
    "name": "string",
    "type": "string",
    "duration": number_or_string,
    "attendees": number_or_string,
    "team_size": number_or_string,
    "budget_range": "string"
  }
  ```
- **Response:** `{ "plan": {...}, "token": "string", "plan_id": "uuid" }`
- **Wait State:** Takes ~20s. Use a center **Orbital Rotating Animation** with dynamic text: *"Analyzing constraints..."*, *"Structuring timeline..."*, *"Balancing categories..."*.

### 2. Fetch Plan (`GET /api/plan?token=[token]&scope=[scope]`)
- **Query Params:** `token` (required), `scope` (optional: `logistics`, `marketing`, `technical`, `operations`, `full`).
- **Response:**
  ```json
  {
    "plan_id": "uuid",
    "token": "token",
    "event": { "name": "string", "type": "string" },
    "plan": { "timeline": [...], "tasks": [...], "promo": {...}, "risks": [...], "budget": [...] },
    "scope": "full"
  }
  ```
- **Note:** If `scope` is NOT `full`, the backend explicitly scrubs `budget`, `promo`, and `risks`. Handle null/missing fields gracefully for scoped views.

### 3. Update Task Status (`POST /api/task-update`)
- **Payload:** `{ "plan_id": "uuid", "task_id": "string", "status": "pending|done|failed", "note": "string" }`
- **Response:** `{ "success": true, "task_id": "string", "status": "string" }`

---

## 🏗 Component Layouts

### Landing Page
- Floating Card in the center of the tilted grid. 
- Multi-step form for inputting event details.
- Decisive "Generate Blueprint →" button.

### Dashboard (Results)
- **Left: Vertical Timeline**: A clean, spaced vertical stepper matching `plan.timeline`.
- **Right: Kanban Task Board**: Columns for `Logistics`, `Marketing`, `Technical`, and `Operations`.
- **Task Cards**: Minimal design. Top border color accent based on `priority` (High: Red, Medium: Amber, Low: Blue).
- **Interactive Tasks**: Clicking a task allows toggling status (`done`/`failed`), which triggers the `POST /api/task-update`.

### Peripheral Widgets
- **Ledger-style Budget**: Clean rows with the `₹` symbol (already provided by API).
- **Marketing Pill Tags**: For `promo.channels`.
- **Risk Cards**: Minimalist warning cards using glassmorphism.

---

## 💡 Implementation Notes for Lovable
- **Micro-interactions:** Focus heavily on button lifts, smooth hover transitions, and expand/collapse animations for Kanban cards.
- **State:** Use React Context or Zustand to hold the generated Plan result across views.
- **Navigation:** Use URL search params (`?token=xyz`) for sharing and persisted views.
- **Gated Views:** If the `scope` is restricted, show "Restricted Access" placeholders for domain boundaries that don't match the current scope.

**Goal:** Clean, high-end, and decisive. Remove the unnecessary, polish what remains.
