# Planora: Complete User Experience Walkthrough

This document outlines the complete sequence of user interactions on the frontend, mapping directly to the capabilities of the Planora backend we have engineered.

---

## 1. Event Creation (The Landing Stage)
**The user arrives at the Planora app to construct a new event plan.**

* **The Interface:** A sleek, minimal landing page presents a dynamic input form (or a multi-step wizard).
* **The Inputs Needed:**
  * Event Name *(e.g., "TechVision Summit")*
  * Event Type *(e.g., "Corporate Conference")*
  * Duration *(e.g., 2 Days)*
  * Expected Attendees *(e.g., 300)*
  * Team Size *(e.g., 15)*
  * Budget Range *(e.g., "₹500000 - ₹800000")*
* **The Interaction:** The user hits **"Generate Master Plan"**. The interface immediately locks into a wait state.

---

## 2. The Wait State (AI Processing)
**Because the Gemini AI securely processes and validates complex operations matching our strict rules, the generation takes ~15 seconds.**

* **The Interface:** An immersive loading screen.
* **The Experience:** Instead of a frozen spinner, the UI cycles through progress text to mask the delay:
  * *"Analyzing Constraints..."*
  * *"Structuring Timeline..."*
  * *"Balancing Budget Priorities..."*
* **Behind the Scenes:** The backend strictly queries the AI to ensure a minimum of 12 categorized tasks, an exact step-by-step timeline, fixes currency encodings, and safely saves the result into the Supabase DB—returning a unique `token`.

---

## 3. The Master Dashboard (The Director's View)
**Upon successful generation, the backend returns the data and the user is routed to `planora.com/plan/[token]`. This is the Master View.**

* **The Timeline Visualizer:** A vertical or horizontal stepper explicitly defining the final 8 days: `T-7` through `Event Day`.
* **The Kanban Task Board:** A premium, drag-and-drop-style board displaying all tasks simultaneously.
  * Columns are explicitly separated by our locked categories: **Logistics, Marketing, Technical, Operations**.
  * Tasks are color-coded by Priority (High/Medium/Low).
* **The Peripheral Widgets:**
  * **Budget Ledger:** A clean grid showing specific itemized costs (e.g., Venue, Catering).
  * **Risk Mitigation:** Alert-style cards showing potential failure points.
  * **Promo Strategy:** A text block supplemented by pill-badges for marketing channels.

---

## 4. Domain-Specific Sharing (The Vendor/Team View)
**The event director needs to send the plan to the lighting crew and the catering vendor, but doesn't want them seeing the overall budget or marketing strategy.**

* **The Interaction:** The user clicks a **"Share"** button on the master dashboard. 
* **Generating Links:** The UI provides an option to share the "Full Plan" or a "Filtered Plan". The user selects "Logistics".
* **The Shared Link:** The UI generates a link using query parameters: 
  `https://yourdomain.com/plan/[token]?view=logistics`
* **Receiving the Link:** When the Logistics Manager opens this link on their phone/computer:
  1. The UI parses the `token` and retrieves the plan from Supabase.
  2. The UI parses the `?view=logistics` rule.
  3. **The Kanban Board morphs**: The Marketing, Technical, and Operations columns disappear. Only the Logistics tasks are shown.
  4. **The Peripherals hide**: The Budget and Marketing Strategy widgets are masked to protect sensitive information.
  5. **Read-Only Mode**: Everything lands in a clean, non-editable state, ensuring the external vendor can only observe their dependencies.
