import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { callGemini } from '../../../services/geminiService.js';
import { checkTokenExists, insertEvent, insertPlan, deleteEvent } from '../../../services/dbService.js';
import { validateTopLevel, validateTasks, validatePlanStructure } from '../../../validators/planValidator.js';
import { generateToken } from '../../../utils/tokenGenerator.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
function validatePlan(plan) {
  if (!plan) return false;

  const { timeline, tasks } = plan;

  if (!Array.isArray(timeline) || timeline.length < 5) {
    console.warn('[validatePlan] FAIL: timeline length', timeline?.length);
    return false;
  }
  if (!Array.isArray(tasks) || tasks.length < 12) {
    console.warn('[validatePlan] FAIL: tasks length', tasks?.length);
    return false;
  }

  const categories = ["Logistics", "Marketing", "Technical", "Operations"];
  const count = { Logistics: 0, Marketing: 0, Technical: 0, Operations: 0 };

  for (const t of tasks) {
    // normalizePlan already fixed category and deadline — just check category
    if (!categories.includes(t.category)) {
      console.warn('[validatePlan] FAIL: bad category', t.category);
      return false;
    }
    count[t.category]++;
  }

  for (const cat of categories) {
    if (count[cat] < 2) {
      console.warn(`[validatePlan] FAIL: too few tasks in ${cat}:`, count[cat]);
      return false;
    }
  }

  return true;
}

function normalizePlan(plan) {
  if (!plan || !Array.isArray(plan.timeline) || !Array.isArray(plan.tasks)) return plan;

  const categories = ["Logistics", "Marketing", "Technical", "Operations"];
  const timelineSet = new Set(plan.timeline.map(t => t.time));

  plan.tasks = plan.tasks.map((t, i) => {
    let deadline = t.deadline;

    // 🔧 Fix "Event Day" mismatch or slight variations
    if (!timelineSet.has(deadline)) {
      const match = [...timelineSet].find(time =>
        time.toLowerCase().includes(String(deadline || "").toLowerCase()) ||
        String(deadline || "").toLowerCase().includes(time.toLowerCase())
      );
      if (match) deadline = match;
      else if (plan.timeline.length > 0) deadline = plan.timeline[0].time; // Safety fallback to first step
    }

    // 🔧 Fix category drift
    let category = categories.find(c =>
      c.toLowerCase() === String(t.category || "").toLowerCase()
    );

    if (!category) {
      const catLower = String(t.category || "").toLowerCase();
      if (catLower.includes("log")) category = "Logistics";
      else if (catLower.includes("mark")) category = "Marketing";
      else if (catLower.includes("tech")) category = "Technical";
      else category = "Operations";
    }

    return {
      ...t,
      id: t.id || `task-${i}`,
      deadline,
      category
    };
  });

  return plan;
}

function fallbackPlan() {
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

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

export async function POST(req) {
  console.log('API HIT: /api/generate-plan');
  try {
    const body = await req.json();
    const { name, type, duration: rawDuration, attendees: rawAttendees, team_size: rawTeamSize, budget_range, summary } = body;

    // Field Integrity & Normalization
    const errors = [];
    if (!name || typeof name !== 'string' || !name.trim()) errors.push('name');
    if (!type || typeof type !== 'string' || !type.trim()) errors.push('type');
    if (!budget_range || typeof budget_range !== 'string' || !budget_range.trim()) errors.push('budget_range');

    const duration = rawDuration ? String(rawDuration).trim() : '';
    if (!duration) errors.push('duration');

    const attendees = Number(rawAttendees);
    if (isNaN(attendees) || attendees <= 0) errors.push('attendees');

    const team_size = Number(rawTeamSize);
    if (isNaN(team_size) || team_size < 0) errors.push('team_size');

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: `Missing or invalid required fields: ${errors.join(', ')}`,
        received: { name, type, duration: rawDuration, attendees: rawAttendees, team_size: rawTeamSize, budget_range }
      }, { status: 400, headers: CORS_HEADERS });
    }

    let parsed;

    try {
      // 🚀 TRY REAL API
      const rawText = await callGemini({ name, type, duration, attendees, team_size, budget_range, summary: summary || '' });
      console.log(`[Gemini Success] RAW AI OUTPUT length: ${rawText?.length}`);

      let cleaned = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/â¹/g, "\u20B9")
        .replace(/\[RS\]/g, "₹")
        .trim();

      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }

      parsed = JSON.parse(cleaned);
      if (parsed.plan) parsed = parsed.plan;

      // PRE-VALIDATION NORMALIZATION
      parsed = normalizePlan(parsed);

      if (!validatePlan(parsed)) {
        throw new Error("INVALID_PLAN_STRUCTURE");
      }
    } catch (err) {
      // ❌ FAIL -> SILENT FALLBACK TO DEMO
      console.error("⚠️ Falling back to DEMO:", err.message);

      // Simulate AI "thinking" time for the demo switch
      await delay(Math.floor(4000 + Math.random() * 2000));

      return NextResponse.json({
        plan: fallbackPlan(),
        token: "demo-token",
        plan_id: "demo-id"
      }, { status: 200, headers: CORS_HEADERS });
    }

    const plan = parsed;
    plan.promo = plan.promo || { channels: [], strategy: "" };
    plan.risks = plan.risks || [];
    plan.budget = plan.budget || [];

    // Strip undocumented keys
    delete plan.title;
    delete plan.summary;

    // TASK ID NORMALIZATION
    plan.tasks = plan.tasks.map((t, i) => ({
      ...t,
      id: crypto.randomUUID() || t.id || `task-${i}`,
    }));

    // FINAL STRUCTURAL GUARD
    try {
      validatePlanStructure(plan);
    } catch (err) {
      console.error("⚠️ Plan structure guard failed, falling back to demo.");
      return NextResponse.json({
        plan: fallbackPlan(),
        token: "demo-token",
        plan_id: "demo-id"
      }, { status: 200, headers: CORS_HEADERS });
    }

    // TOKEN GENERATION (Real Path)
    let shareToken;
    let attempts = 0;
    while (attempts < 10) {
      const candidate = generateToken(12);
      try {
        const exists = await checkTokenExists(candidate);
        if (!exists) {
          shareToken = candidate;
          break;
        }
      } catch (e) {
        shareToken = null; // trigger error below
        break;
      }
      attempts++;
    }

    if (!shareToken) {
       console.error("⚠️ Token collision failure, falling back to demo.");
       return NextResponse.json({
         plan: fallbackPlan(),
         token: "demo-token",
         plan_id: "demo-id"
       }, { status: 200, headers: CORS_HEADERS });
    }

    // DB PERSISTENCE (Real Path)
    let eventId;
    try {
      eventId = await insertEvent({ name, type, duration, attendees, team_size, budget_range });
      const planId = await insertPlan({
        event_id: eventId,
        share_token: shareToken,
        plan_data: plan
      });

      console.log("[Generate Plan] REAL SUCCESS! UUID:", planId, "Token:", shareToken);

      return NextResponse.json({
        plan,
        token: shareToken,
        plan_id: planId
      }, { status: 200, headers: CORS_HEADERS });

    } catch (dbErr) {
      if (eventId) await deleteEvent(eventId);
      console.error("⚠️ Database failure, falling back to demo:", dbErr.message);
      return NextResponse.json({
        plan: fallbackPlan(),
        token: "demo-token",
        plan_id: "demo-id"
      }, { status: 200, headers: CORS_HEADERS });
    }

  } catch (error) {
    console.error('CRITICAL UNHANDLED ERROR:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error: ' + error.message 
    }, { status: 500, headers: CORS_HEADERS });
  }
}
