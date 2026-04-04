import { NextResponse } from 'next/server';
import { getPlanByToken, updatePlanData } from '../../../services/dbService.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, task } = body;

    if (!token || !task) {
      return NextResponse.json({ error: 'Missing token or task data' }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Fetch the existing plan by token
    const data = await getPlanByToken(token);
    if (!data) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404, headers: CORS_HEADERS });
    }

    const plan_id = data.id;
    const plan_data = data.plan_data;

    // 2. Append the new task to the local tasks array
    const updatedTasks = [...(plan_data.tasks || []), task];
    const updatedPlanData = {
      ...plan_data,
      tasks: updatedTasks
    };

    // 3. Update the database
    await updatePlanData(plan_id, updatedPlanData);

    return NextResponse.json({ success: true, task }, { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    console.error('[Add Task Route Error]:', err.message);
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500, headers: CORS_HEADERS });
  }
}
