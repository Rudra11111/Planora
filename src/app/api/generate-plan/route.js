import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { callGemini } from '../../../services/geminiService.js';
import { checkTokenExists, insertEvent, insertPlan, deleteEvent } from '../../../services/dbService.js';
import { validateTopLevel, validateTasks, validatePlanStructure } from '../../../validators/planValidator.js';
import { generateToken } from '../../../utils/tokenGenerator.js';

function validatePlan(plan) {
  if (!plan) return false;

  const { timeline, tasks } = plan;

  if (!Array.isArray(timeline) || timeline.length < 5) return false;
  if (!Array.isArray(tasks) || tasks.length < 12) return false;

  const categories = ["Logistics", "Marketing", "Technical", "Operations"];

  const count = {
    Logistics: 0,
    Marketing: 0,
    Technical: 0,
    Operations: 0,
  };

  // 🔥 CRITICAL: Build valid timeline reference
  const timelineSet = new Set(
    timeline.map(t => t.time)
  );

  for (const t of tasks) {
    // ❌ Invalid category
    if (!categories.includes(t.category)) return false;

    // ❌ DEADLINE MUST MATCH TIMELINE EXACTLY
    if (!timelineSet.has(t.deadline)) return false;

    count[t.category]++;
  }

  // ❌ Ensure minimum tasks per category
  for (const cat of categories) {
    if (count[cat] < 2) return false;
  }

  return true;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, type, duration, attendees, team_size, budget_range } = body;

    // Field Integrity (Ensure strings / numbers are valid types and strings are non-empty)
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof type !== 'string' || !type.trim() ||
      typeof duration !== 'number' ||
      typeof attendees !== 'number' ||
      typeof team_size !== 'number' ||
      typeof budget_range !== 'string' || !budget_range.trim()
    ) {
      return NextResponse.json({ error: 'Missing or invalid required fields (name, type, duration, attendees, team_size, budget_range)' }, { status: 400 });
    }

    // AUTO RETRY LOOP
    let parsed;
    let attempts = 0;

    while (attempts < 3) {
      let rawText;
      try {
        rawText = await callGemini({ name, type, duration, attendees, team_size, budget_range });
      } catch (err) {
        console.error('[Gemini] Call failed:', err.message);
        if (err.message.includes('429') || err.message.includes('Quota exceeded')) {
          let retryAfter = 45;
          const match = err.message.match(/retry in ([\d\.]+)s/);
          if (match) retryAfter = Math.ceil(parseFloat(match[1]));
          return NextResponse.json({ error: 'RATE_LIMIT', retry_after: retryAfter }, { status: 429 });
        }
        // If it's a timeout or other non-quota error, we still try next loops
        attempts++;
        continue;
      }

      try {
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

        // 🔥 unwrap Gemini structure
        if (parsed.plan) {
          parsed = parsed.plan;
        }

        if (validatePlan(parsed)) break;
      } catch (e) {
        // ignore and retry
      }

      attempts++;
    }

    // ❌ FINAL FAILURE
    if (!parsed || !validatePlan(parsed)) {
      return NextResponse.json(
        { error: "AI failed after retries" },
        { status: 500 }
      );
    }

    const plan = parsed;

    plan.promo = plan.promo || { channels: [], strategy: "" };
    plan.risks = plan.risks || [];
    plan.budget = plan.budget || [];

    // Strip undocumented keys directly
    delete plan.title;
    delete plan.summary;

    // 🔴 TASK ID NORMALIZATION
    plan.tasks = plan.tasks.map((t, i) => ({
      ...t,
      id: crypto.randomUUID() || t.id || `task-${i}`,
    }));

    // DETERMINISTIC POST-PARSE STRUCTURAL GUARD
    try {
      validatePlanStructure(plan);
    } catch (err) {
      return NextResponse.json({ error: `Plan structure rejection: ${err.message}` }, { status: 500 });
    }

    // RULE 6: TOKEN GENERATION
    let shareToken;
    attempts = 0;
    while (attempts < 10) {
      const candidate = generateToken(12);
      try {
        const exists = await checkTokenExists(candidate);
        if (!exists) {
          shareToken = candidate;
          break;
        }
      } catch (e) {
        return NextResponse.json({ error: 'Token uniqueness check failed' }, { status: 500 });
      }
      attempts++;
    }
    if (!shareToken) return NextResponse.json({ error: 'Token collision unresolved' }, { status: 500 });

    // RULE 7: PSEUDO-ATOMIC DB
    let eventId;
    try {
      eventId = await insertEvent({ 
        name, 
        type, 
        duration: String(duration), 
        attendees, 
        team_size, 
        budget_range 
      });
    } catch (err) {
      return NextResponse.json({ error: 'DB insert failure (event)' }, { status: 500 });
    }

    let planId;
    try {
      planId = await insertPlan({
        event_id: eventId,
        share_token: shareToken,
        plan_data: plan
      });
    } catch (err) {
      // RULE 8: ROLLBACK LOGIC
      await deleteEvent(eventId);
      return NextResponse.json({ error: 'DB insert failure (plan)' }, { status: 500 });
    }

    // RULE 9: FINAL RESPONSE GUARD
    const finalPayload = {
      plan,
      token: shareToken,
      plan_id: planId
    };

    if (!finalPayload.plan || !finalPayload.token || !finalPayload.plan_id) {
      return NextResponse.json({ error: 'Final payload is missing fields' }, { status: 500 });
    }

    // RULE 10: LOGGING & DEBUG
    console.log("[Generate Plan] Success! UUID:", planId, "Token:", shareToken);

    return NextResponse.json(finalPayload, { status: 200 });
  } catch (error) {
    console.error('Unhandled Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error?.message + ' | ' + error?.stack }, { status: 500 });
  }
}
