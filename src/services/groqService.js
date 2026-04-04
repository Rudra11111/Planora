const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant'; // Direct replacement for decommissioned llama3-8b-8192
const TIMEOUT_MS = 25_000;

/**
 * Builds the chat messages for Groq.
 */
function buildMessages({ name, type, duration, attendees, team_size, budget_range, summary }) {
  const summaryLine = summary && summary.trim() 
    ? `- Event Context / Summary: ${summary.trim()}`
    : '';

  return [
    {
      role: 'system',
      content: `You are an expert event planner AI. Generate a comprehensive, detailed event plan.
      
STRICT OUTPUT FORMAT RULES:
Return ONLY valid JSON. Avoid any preamble, conversational filler, or wrap-around text.

plan MUST include ALL of the following fields and match this schema exactly:
- timeline (array of objects): { "time": "T-90 | Event Day 1 | etc", "activity": "string" }
- tasks (array of EXACTLY 20 items): { "id": "string", "task": "string", "category": "Logistics | Marketing | Technical | Operations", "deadline": "must match a timeline.time key", "priority": "High | Medium | Low" }
- promo (object): { "channels": ["string"], "strategy": "string" }
- risks (array of objects): { "issue": "string" }
- budget (array of objects): { "item": "string", "cost": "₹range" }

CRITICAL VALIDATION RULES:
1. CATEGORY LOCK: category MUST be one of exactly: "Logistics", "Marketing", "Technical", "Operations"
2. TASK VOLUME: Generate exactly 20 tasks, with 5 tasks in each of the 4 categories.
3. DEADLINE STRICT MATCH: Every single task.deadline MUST EXACTLY match one of the timeline.time values. No variations allowed.
4. CURRENCY: All costs must be in INR using the ₹ symbol.
5. ZERO OMISSION: Do not omit any field or subfield. Do not add extra top-level fields.`
    },
    {
      role: 'user',
      content: `Generate a plan for:
- Name: ${name}
- Type: ${type}
- Duration: ${duration}
- Attendees: ${attendees}
- Team Size: ${team_size}
- Budget Range: ${budget_range}
${summaryLine}`
    }
  ];
}

/**
 * Calls Groq Cloud API directly with a 25-second AbortSignal timeout.
 * @param {object} eventData
 * @returns {Promise<string>} Raw JSON text from Groq
 */
export async function callGroq(eventData) {
  const messages = buildMessages(eventData);
  const apiKey = process.env.GROQ_API_KEY;
  
  console.log(`[Groq] Using API Key starting with: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT_FOUND'}`);
  console.log('🚀 CALLING GROQ NOW');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages,
        model: MODEL,
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Groq API call timed out after 25 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    const errBody = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Groq returned an empty or unexpected response structure');
  }

  return text;
}
