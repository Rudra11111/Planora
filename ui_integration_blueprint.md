# Planora UI Generation & Integration Blueprint

This document serves as the canonical reference for the frontend phase of Planora. It builds directly upon our highly deterministic, AI-driven backend architecture that strictly enforces task volumes, timeline granularity, and schema integrity.

## 📝 1. Backend Data Context

The frontend must interface with our Next.js API route: `POST /api/generate-plan`.

### Request Payload
```json
{
  "name": "TechVision Summit 2026",
  "type": "Corporate Conference",
  "duration": 2,               // Number
  "attendees": 300,            // Number
  "team_size": 15,             // Number
  "budget_range": "500000-800000"
}
```

### Response Payload (Guaranteed Shape)
Thanks to the backend structural guards, the frontend can **safely assume** this exact shape without defensive null-checking every field:
```json
{
  "plan": {
    "timeline": [ 
      { "time": "T-7" /* exactly these keys down to Event Day */, "activity": "string" } 
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
    "promo": { "channels": ["string"], "strategy": "string" },
    "risks": [{ "issue": "string" }],
    "budget": [{ "item": "string", "cost": "₹range" }]
  },
  "token": "abcdef123456",
  "plan_id": "supabse-uuid"
}
```

> [!IMPORTANT]
> **Key Context**: The backend will guarantee a minimum of **12 tasks** (min 3 per category) and exactly **8 step-by-step timeline entries** (T-7 through Event Day).

---

## 🚀 Phase 1: Input Form & State Management

**Goal:** Create a polished, validated input interface to gather parameters and handle the long-running AI request (15-20s).

**Action Items:**
1. **Build a Multi-Step or Grid Form:** 
   - Inputs: Event Name, Event Type (dropdown), Duration (number), Expected Attendees (number), Managing Team Size (number), Budget Range (text).
   - Validation: All fields must be non-empty strings/numbers to prevent HTTP 400 errors.
2. **Handle the "Wait State":**
   - The Gemini AI call takes between 10–25 seconds.
   - Implement an immersive loading state (e.g., Skeleton loaders, or a progress stepper: "Analyzing Requirements..." ➔ "Structuring Timeline..." ➔ "Balancing Budget...").
3. **Error Handling (Crucial):**
   - Must catch and display `HTTP 500` / `HTTP 429` errors smoothly (e.g., "AI is currently at capacity, retrying in X seconds" or "Validation failed").

---

## 🎨 Phase 2: Plan Generation & Task Visualization

**Goal:** Provide an incredibly premium, dynamic way to interact with the generated content. 

**Action Items:**
1. **The Timeline View:**
   - Map the `plan.timeline` array into a visually distinct vertical or horizontal stepper. 
   - Because the backend ensures exact `T-7` through `Event Day` keys, the UI can confidently render these with accompanying icons.
2. **The Task Board (Kanban / Filtered List):**
   - Because we are guaranteed at least 12 tasks across 4 strict categories (`Logistics`, `Marketing`, `Technical`, `Operations`), a Kanban board separated by category is perfect here.
   - Color code priorities (High = Red, Medium = Yellow, Low = Green/Blue).
   - Provide a filter to view tasks by "Deadline" (e.g. "What is due on T-4?").

---

## 📊 Phase 3: Peripherals (Budget, Risks, & Promo)

**Goal:** Display the supplementary event metrics clearly and concisely.

**Action Items:**
1. **Budget Breakdown:**
   - Render `plan.budget` as a clean data table or a modern ledger grid.
   - *(Note: The backend actively resolves Mojibake currency encoding, so the `₹` symbol will arrive cleanly.)*
2. **Risk Mitigation:**
   - Render `plan.risks` as alert-style cards (using orange/yellow warnings) to highlight that these are potential blockers.
3. **Promo Strategy:**
   - Map `plan.promo.channels` into pill/badge tags.
   - Display `plan.promo.strategy` as a neat summary block.

---

## 🔗 Phase 4: Routing & Sharing (Token Integration & Scopes)

**Goal:** Securely use `scope` filtering on the backend and implement an Access Gated UI.

**Action Items:**
1. **Client Routing to Scoped Links:**
   - Link format should be: `https://yourdomain.com/plan/[token]?scope=logistics`
   - The backend `GET /api/plan` will automatically SCRUB budget/promo/risks and unrelated tasks if `scope !== full`.
2. **Access Control UI (Lazy Loading Domains):**
   - **Default State**: Do NOT render tasks inside the Domain cards (Logistics, Marketing etc). Show only the Category Title and Task Count.
   - **Interaction**: Expand card on click to reveal tasks.
   - **Access Gate Logic**:
     ```javascript
     const [activeDomain, setActiveDomain] = useState(null);
     
     // inside domain card render:
     if (scope !== 'full' && scope !== task.category.toLowerCase()) {
        return <div className="restricted-badge">Restricted Access</div>;
     }
     ```
3. **Task Status Interaction**:
   - The backend now enforces task states with `POST /api/task-update` (`plan_id`, `task_id`, `status: pending|done|failed`).
   - Add status checkboxes explicitly tied to this endpoint.

> [!CAUTION]
> **Data Security Constraint**: The frontend MUST NEVER decide visibility of sensitive data (like budgets). Rely entirely on the backend `scope` parameter doing the filtering BEFORE the JSON is sent to the client.
