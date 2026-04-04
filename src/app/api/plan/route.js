import { NextResponse } from 'next/server';
import { getPlanByToken, getTaskUpdates } from '../../../services/dbService.js';
import { VALID_CATEGORIES } from '../../../validators/planValidator.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const ALLOWED_SCOPES = [...VALID_CATEGORIES.map(c => c.toLowerCase()), "full"];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    // Ensure backwards compatibility with old spec ?scope=logistics
    const scopeParam = searchParams.get('scope') || 'full';
    const scope = scopeParam.toLowerCase();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!ALLOWED_SCOPES.includes(scope)) {
      return NextResponse.json({ error: `Invalid scope. Allowed: ${ALLOWED_SCOPES.join(', ')}` }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Fetch from DB
    let dbPlan;
    try {
      dbPlan = await getPlanByToken(token);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 404, headers: CORS_HEADERS });
    }

    const planData = dbPlan.plan_data;

    // 2. Fetch task states & merge
    const taskUpdates = await getTaskUpdates(dbPlan.id);
    const updateMap = taskUpdates.reduce((acc, update) => {
      acc[update.task_id] = update;
      return acc;
    }, {});

    if (Array.isArray(planData.tasks)) {
      planData.tasks = planData.tasks.map(t => {
        const override = updateMap[t.id];
        return {
          ...t,
          status: override?.status || 'pending',
          note: override?.note || null
        };
      });
    }

    // 3. Strict Server-Side Scope Filtering
    if (scope !== 'full') {
      // Filter tasks strictly by matching lowercase category
      if (Array.isArray(planData.tasks)) {
        planData.tasks = planData.tasks.filter(t => t.category.toLowerCase() === scope);
      }
      
      // Permanently SCRUB sensitive data from backend response
      delete planData.budget;
      delete planData.promo;
      delete planData.risks;
    }

    return NextResponse.json({
      plan_id: dbPlan.id,
      token: dbPlan.share_token,
      event: dbPlan.events, // e.g. name, type
      plan: planData,
      scope: scope
    }, { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('[Fetch Plan Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
