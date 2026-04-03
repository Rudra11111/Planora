# Lovable Frontend AI Prompt: Planora UI

**Context for Lovable:**
You are building the frontend for "Planora," an AI-powered event planning web application. The backend (Next.js API route) is completely built, highly deterministic, and strict about its data shapes. 

I am using **Lovable** for the frontend UI generation and **Stitches** (or standard CSS-in-JS/Tailwind if preferred by Lovable's engine) for UI styling and development.

Your objective is to generate an incredibly premium, dynamic, and responsive React frontend that interfaces with my existing backend. 

---

## 🛠 Tech Stack Requirements
- **Framework:** React / Next.js (mapped to my existing backend)
- **Styling:** Stitches (CSS-in-JS) for premium, dynamic, and theme-able UI development.
- **Animations:** Framer Motion (glassmorphism overlays, fluid transitions, hover effects).
- **Icons:** Lucide React.
- **State Management:** React Context or Zustand for holding the generated Plan payload.

---

## 🔌 The Backend Connection

The frontend revolves around a single POST request to `http://localhost:3000/api/generate-plan`.
You must build a fetch request that posts the following payload:

```json
{
  "name": "TechVision Summit 2026",
  "type": "Corporate Conference",
  "duration": 2,
  "attendees": 300,
  "team_size": 15,
  "budget_range": "500000-800000"
}
```

The response is 100% strictly guaranteed to look exactly like this. You do NOT need excessive null checks:

```json
{
  "plan": {
    "timeline": [ 
      { "time": "T-7", "activity": "string" }, 
      { "time": "T-6", "activity": "string" } 
      // ... goes sequentially down to "Event Day" (exactly 8 steps always)
    ],
    "tasks": [
      {
        "id": "uuid-string",
        "task": "string",
        "category": "Logistics | Marketing | Technical | Operations",
        "deadline": "T-7",
        "priority": "High | Medium | Low"
      }
    ],
    "promo": { "channels": ["string", "string"], "strategy": "string" },
    "risks": [{ "issue": "string" }],
    "budget": [{ "item": "string", "cost": "₹range" }]
  },
  "token": "abcdef123456",
  "plan_id": "supabse-uuid"
}
```

---

## 🏗 Phase 1: The Input & Wait State (Landing Page)
1. **Hero Section:** A dark-mode, premium glassmorphism landing page.
2. **The Form:** An interactive grid or multi-step wizard asking for Name, Type, Duration, Attendees, Team Size, and Budget.
3. **The Loading State (CRITICAL):** The backend API takes about 15-20 seconds to return data. 
   - *Design Required:* An engaging, Stitches-styled animated loading sequence (e.g., spinning orbital rings or a text cycler saying "Analyzing constraints...", "Balancing budget...", "Structuring timeline...").
   - Catch `HTTP 429` limits gracefully. The backend will accurately return `{ error: "RATE_LIMIT", retry_after: 45 }`. Use the `retry_after` value to render a real-time countdown timer before letting the user retry.

---

## 🎨 Phase 2: The Plan Visualizer (Results Page)
Once the JSON returns, route to the dashboard viewing mode.

1. **The Timeline (Vertical Stepper):**
   - Render the `plan.timeline` array. Since it is strictly 8 steps ("T-7" down to "Event Day"), render this as a fixed timeline on the left rail of the screen.
2. **The Kanban Board (Tasks):**
   - We are guaranteed a minimum of **12 tasks** spread across **Logistics, Marketing, Technical, and Operations** (min 3 each).
   - *Design Required:* A gorgeous Kanban-style board using Stitches. Columns represent Categories. Color-code tasks by Priority (High = Accent Red, Low = Muted Blue).
3. **Widgets (Budget, Risks, Promo):**
   - Build a masonry grid of cards for the peripheral data.
   - Render the **Promo Strategy** with pill tags targeting `channels`.
   - Render the **Budget** with Stitches-styled ledger rows (the `₹` rupee symbol comes pre-formatted and clean from the backend).
   - Render the **Risks** with warning-style glass cards.

---

## 🔗 Phase 3: Sharing, Persistence & Access Control
1. **Fetching & Scope Constraints:** 
   - The user visits `/plan/[token]?scope=logistics`.
   - You must fetch data using `GET /api/plan?token=[token]&scope=[scope]`.
   - The backend handles all data validation and scrubbing. If the scope is not `full`, the backend explicitly deletes the `budget`, `promo`, and `risks` nodes automatically, so do NOT expect those keys to exist on scoped views.
2. **Access Control UI (Lazy Loading Domains):**
   - **Default State**: Do NOT render task items blindly inside Domain boundary cards. Show only the Category Title and Task Count initially.
   - **Interaction**: Expand card on click to reveal tasks.
   - **Access Gate Logic**:
     ```javascript
     const [activeDomain, setActiveDomain] = useState(null);
     
     // inside domain card render:
     if (scope !== 'full' && scope !== task.category.toLowerCase()) {
        return <div className="text-red-500 font-bold">Restricted Access</div>;
     }
     ```
3. **Task Status Interaction**:
   - The UI must render interactive checkboxes mapping to task progress.
   - You must push changes using `POST /api/task-update` sending payload `{ plan_id, task_id, status: 'pending'|'done'|'failed', note: 'optional string' }`.
4. **Share Link Generation:** 
   - Include a sleek "Copy Plan Link" menu in the UI generating links representing scopes. E.g. `https://yourdomain.com/plan/[token]?scope=logistics`.

**Final instruction to Lovable:** Focus intensely on premium UI aesthetics using Stitches. The backend holds ultimate authority perfectly scaling JSON scopes—so focus generation strictly on perfect interactive UX layouts (lazy loading, gated renders, smooth transitions).
