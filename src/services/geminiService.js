// Uses native fetch — no SDK dependency, full control over API version & model.
// PER SPEC: Must use gemini-1.5-flash but API key forces 2.5-flash
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

const TIMEOUT_MS = 25_000;

/**
 * Builds the strict prompt for Gemini.
 */
function buildPrompt({ name, type, duration, attendees, team_size, budget_range }) {
  return `You are an expert event planner AI. Generate a comprehensive, detailed event plan.

EVENT DETAILS:
- Name: ${name}
- Type: ${type}
- Duration: ${duration}
- Attendees: ${attendees}
- Team Size: ${team_size}
- Budget Range: ${budget_range}

STRICT OUTPUT FORMAT RULES:

Return ONLY valid JSON.

plan MUST include ALL of the following fields and match this schema exactly:
- timeline (array of objects): { "time": "T-90 | Event Day 1 | etc", "activity": "string" }
- tasks (array of minimum 12 items): { "id": "string", "task": "string", "category": "Logistics | Marketing | Technical | Operations", "deadline": "must match a timeline time key", "priority": "High | Medium | Low" }
- promo (object): { "channels": ["string"], "strategy": "string" }
- risks (array of objects): { "issue": "string" }
- budget (array of objects): { "item": "string", "cost": "₹range" }

CRITICAL RULES:
1. CATEGORY LOCK: category MUST be one of exactly: "Logistics", "Marketing", "Technical", "Operations"
2. TIMELINE FLEXIBILITY: Generate a realistic timeline for this event type. Use logical strings for the 'time' field (e.g. "T-90", "T-7", "Event Day - Day 1", "T+7").
3. DO NOT OMIT ANY FIELD.
4. DO NOT ADD EXTRA FIELDS like title or summary.
5. DEADLINE STRICT MATCH: Every task.deadline MUST EXACTLY match one of the timeline.time values. No variations allowed.

EXAMPLE OUTPUT:
{
  "plan": {
    "timeline": [
      {
        "time": "T-90",
        "activity": "Define event objectives, core theme, and secure initial budget approval."
      },
      {
        "time": "Event Day - Day 1",
        "activity": "Event opening, session monitoring, attendee support."
      }
    ],
    "tasks": [
      {
        "id": "task-log-001",
        "task": "Finalize virtual event platform contract and setup.",
        "category": "Logistics",
        "deadline": "T-75",
        "priority": "High"
      }
    ],
    "promo": {
      "channels": [
        "LinkedIn",
        "Twitter"
      ],
      "strategy": "A phased digital marketing strategy leveraging thought leadership content from speakers."
    },
    "risks": [
      {
        "issue": "Low attendee registration due to competitive events or lack of perceived value."
      }
    ],
    "budget": [
      {
        "item": "Virtual Event Platform Subscription",
        "cost": "₹15000-₹30000"
      }
    ]
  }
}
`;
}

/**
 * Calls Gemini REST API directly with a 15-second AbortSignal timeout.
 * @param {object} eventData
 * @returns {Promise<string>} Raw text from Gemini
 */
export async function callGemini(eventData) {
  const prompt = buildPrompt(eventData);
  const url = `${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1, // Lower temperature for more consistent JSON
          maxOutputTokens: 4096,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Gemini API call timed out after 15 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini HTTP ${response.status}: ${errBody}`);
  }

  const rawData = await response.text();
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    throw new Error('Failed to parse Gemini API response JSON. Raw output: ' + rawData);
  }

  // Extract text from Gemini response structure
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty or unexpected response structure');
  }

  return text;
}
