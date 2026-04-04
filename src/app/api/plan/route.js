import { NextResponse } from 'next/server';
import { getPlanByToken, getTaskUpdates } from '../../../services/dbService.js';
import { fallbackPlan } from '../../../utils/demoData.js';
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
    
    // 🧱 SCOPE FILTER HELPER
    const applyScopeFilter = (planData, targetScope) => {
      if (!planData || targetScope === 'full') return planData;
      
      const filtered = { ...planData };
      if (Array.isArray(filtered.tasks)) {
        filtered.tasks = filtered.tasks.filter(t => 
          String(t.category || '').toLowerCase() === targetScope
        );
      }
      
      // 🔒 Scrub sensitive data for restricted views
      delete filtered.budget;
      delete filtered.promo;
      delete filtered.risks;
      return filtered;
    };

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!ALLOWED_SCOPES.includes(scope)) {
      return NextResponse.json({ error: `Invalid scope. Allowed: ${ALLOWED_SCOPES.join(', ')}` }, { status: 400, headers: CORS_HEADERS });
    }

    if (token === 'demo-token') {
      const plan = applyScopeFilter(fallbackPlan(), scope);
      return NextResponse.json({
        plan_id: 'demo-id',
        token: 'demo-token',
        event: { name: 'Sample Event (Demo)', type: 'conference' },
        plan,
        scope: scope
      }, { status: 200, headers: CORS_HEADERS });
    }

    // 1. Fetch from DB
    let dbPlan;
    try {
      dbPlan = await getPlanByToken(token);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 404, headers: CORS_HEADERS });
    }

    let planData = { ...dbPlan.plan_data };

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

    // 3. Apply Server-Side Scope Filtering
    planData = applyScopeFilter(planData, scope);

    return NextResponse.json({
      plan_id: dbPlan.id,
      token: dbPlan.share_token,
      event: dbPlan.events,
      plan: planData,
      scope: scope
    }, { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('[Fetch Plan Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
