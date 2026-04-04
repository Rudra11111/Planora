import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (URL or Key)');
  }

  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Checks if a share_token already exists in the plans table.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function checkTokenExists(token) {
  const { data, error } = await getSupabase()
    .from('plans')
    .select('id')
    .eq('share_token', token)
    .maybeSingle();

  if (error) throw new Error(`Token check failed: ${error.message}`);
  return data !== null;
}

/**
 * Inserts a new event record.
 * @param {{ name, type, duration, attendees, team_size, budget_range }} payload
 * @returns {Promise<string>} The new event UUID
 */
export async function insertEvent(payload) {
  const { data, error } = await getSupabase()
    .from('events')
    .insert({
      name:         payload.name,
      type:         payload.type,
      duration:     payload.duration,
      attendees:    payload.attendees,
      team_size:    payload.team_size   ?? null,
      budget_range: payload.budget_range ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Event insert failed: ${error?.message ?? 'No data returned'}`);
  }

  return data.id;
}

/**
 * Inserts a new plan record.
 * @param {{ event_id: string, share_token: string, plan_data: object }} payload
 * @returns {Promise<string>} The new plan UUID
 */
export async function insertPlan(payload) {
  const { data, error } = await getSupabase()
    .from('plans')
    .insert({
      event_id:    payload.event_id,
      share_token: payload.share_token,
      plan_data:   payload.plan_data,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Plan insert failed: ${error?.message ?? 'No data returned'}`);
  }

  return data.id;
}

/**
 * Rollback helper — deletes an event record by ID.
 * Called when plan insert fails to maintain atomicity.
 * @param {string} eventId
 */
export async function deleteEvent(eventId) {
  const { error } = await getSupabase()
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    // Log but don't throw — rollback is best-effort, original error takes priority
    console.error(`[Rollback] Failed to delete orphaned event ${eventId}:`, error.message);
  } else {
    console.warn(`[Rollback] Deleted orphaned event ${eventId}`);
  }
}

/**
 * Fetches a plan and its associated event by token.
 * @param {string} token 
 * @returns {Promise<any>}
 */
export async function getPlanByToken(token) {
  const { data, error } = await getSupabase()
    .from('plans')
    .select(`
      id,
      share_token,
      plan_data,
      events (
        name,
        type
      )
    `)
    .eq('share_token', token)
    .single();

  if (error || !data) {
    throw new Error(`Plan not found or DB error: ${error?.message || 'No data'}`);
  }

  return data;
}

/**
 * Fetches task updates for a given plan.
 * @param {string} planId
 * @returns {Promise<any[]>}
 */
export async function getTaskUpdates(planId) {
  const { data, error } = await getSupabase()
    .from('task_updates')
    .select('task_id, status, note, updated_at')
    .eq('plan_id', planId);

  if (error) {
    console.error(`[DB Error] fetching task updates for ${planId}:`, error.message);
    return []; // Return empty array on failure so plan still loads
  }

  return data || [];
}

/**
 * Upserts a task status.
 * @param {{ plan_id: string, task_id: string, status: string, note?: string }} payload
 * @returns {Promise<boolean>}
 */
export async function upsertTaskUpdate(payload) {
  const { plan_id, task_id, status, note } = payload;
  
  const { error } = await getSupabase()
    .from('task_updates')
    .upsert({
      plan_id,
      task_id,
      status,
      note: note || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'plan_id, task_id' });

  if (error) {
    throw new Error(`Failed to upsert task update: ${error.message}`);
  }

  return true;
}

/**
 * Updates the plan_data for a given plan ID.
 * @param {string} planId
 * @param {object} updatedPlanData
 * @returns {Promise<boolean>}
 */
export async function updatePlanData(planId, updatedPlanData) {
  const { error } = await getSupabase()
    .from('plans')
    .update({ plan_data: updatedPlanData })
    .eq('id', planId);

  if (error) {
    throw new Error(`Failed to update plan data: ${error.message}`);
  }

  return true;
}

