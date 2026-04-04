export function fallbackPlan() {
  return {
    timeline: [
      { "time": "T-30", "activity": "Define objectives, establish core team, and finalize budget." },
      { "time": "T-21", "activity": "Venue selection and initial vendor outreach." },
      { "time": "T-14", "activity": "Launch marketing campaign and open registration." },
      { "time": "T-7", "activity": "Finalize catering, A/V arrangements, and team briefing." },
      { "time": "Event Day", "activity": "Execution of event opening, sessions, and closure." }
    ],
    tasks: [
      { "id": "task-0", "task": "Secure initial venue deposit", "category": "Logistics", "deadline": "T-30", "priority": "High" },
      { "id": "task-1", "task": "Finalize attendee registration form", "category": "Operations", "deadline": "T-21", "priority": "Medium" },
      { "id": "task-2", "task": "Social media launch blitz", "category": "Marketing", "deadline": "T-14", "priority": "High" },
      { "id": "task-3", "task": "Initial A/V tech check", "category": "Technical", "deadline": "T-14", "priority": "High" },
      { "id": "task-4", "task": "Distribute final schedule to volunteers", "category": "Operations", "deadline": "T-7", "priority": "Medium" },
      { "id": "task-5", "task": "Final catering headcount confirmation", "category": "Logistics", "deadline": "T-7", "priority": "High" },
      { "id": "task-6", "task": "Post-event follow up email series setup", "category": "Marketing", "deadline": "Event Day", "priority": "Medium" },
      { "id": "task-7", "task": "Backup hardware on-site verification", "category": "Technical", "deadline": "Event Day", "priority": "High" },
      { "id": "task-8", "task": "Coordinate arrival of physical assets", "category": "Logistics", "deadline": "T-30", "priority": "Medium" },
      { "id": "task-9", "task": "Prepare event signage and print collateral", "category": "Marketing", "deadline": "T-21", "priority": "Medium" },
      { "id": "task-10", "task": "Set up dedicated event Wi-Fi", "category": "Technical", "deadline": "T-14", "priority": "High" },
      { "id": "task-11", "task": "Prepare on-site emergency contact list", "category": "Operations", "deadline": "T-7", "priority": "High" }
    ],
    promo: { "channels": ["LinkedIn", "Twitter", "Email"], "strategy": "A three-phase approach focusing on awareness, conversion, and community engagement." },
    risks: [
      { "issue": "Technical failure of core virtual or A/V presentation platform." },
      { "issue": "Low attendee turnout due to overlapping industry conferences." }
    ],
    budget: [
      { "item": "Venue & Infrastructure", "cost": "₹150000 - ₹250000" },
      { "item": "Marketing & Advertising", "cost": "₹50000 - ₹80000" }
    ]
  };
}
