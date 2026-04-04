import { NextResponse } from 'next/server';
import { upsertTaskUpdate } from '../../../services/dbService.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const VALID_STATUSES = ['pending', 'done', 'failed'];

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, task_id, status, note } = body;

    // Field Integrity Guard
    if (!token || !task_id || !status) {
      return NextResponse.json({ error: 'Missing required fields: token, task_id, status' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400, headers: CORS_HEADERS });
    }

    if (token === 'demo-token') {
      return NextResponse.json({ success: true, task_id, status }, { status: 200, headers: CORS_HEADERS });
    }

    // 1. Look up plan_id from token
    let plan_id;
    try {
      const dbPlan = await getPlanByToken(token);
      plan_id = dbPlan.id;
    } catch (err) {
      return NextResponse.json({ error: 'Plan not found for this token' }, { status: 404, headers: CORS_HEADERS });
    }

    // 2. Perform the update using the real plan_id
    try {
      await upsertTaskUpdate({ plan_id, task_id, status, note });
    } catch (dbErr) {
      console.error('[Task Update error]:', dbErr.message);
      return NextResponse.json({ error: 'Database update failed.' }, { status: 500, headers: CORS_HEADERS });
    }

    return NextResponse.json({ success: true, task_id, status }, { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('[Task Update Route Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
