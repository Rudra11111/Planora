import { NextResponse } from 'next/server';
import { upsertTaskUpdate } from '../../../services/dbService.js';

const VALID_STATUSES = ['pending', 'done', 'failed'];

export async function POST(req) {
  try {
    const body = await req.json();
    const { plan_id, task_id, status, note } = body;

    // Field Integrity Guard
    if (!plan_id || !task_id || !status) {
      return NextResponse.json({ error: 'Missing required fields: plan_id, task_id, status' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    try {
      await upsertTaskUpdate({ plan_id, task_id, status, note });
    } catch (dbErr) {
      console.error('[Task Update error]:', dbErr.message);
      // Might be a missing plan_id
      return NextResponse.json({ error: 'Database update failed. Ensure plan_id is valid.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, task_id, status }, { status: 200 });

  } catch (err) {
    console.error('[Task Update Route Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
