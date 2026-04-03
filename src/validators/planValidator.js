/** @type {readonly string[]} */
export const VALID_CATEGORIES = Object.freeze([
  'Logistics',
  'Marketing',
  'Technical',
  'Operations',
]);

/**
 * Ensures strict top-level validity of the JSON output matching spec
 * @param {unknown} parsed
 * @returns {{ valid: boolean; reason?: string }}
 */
export function validateTopLevel(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, reason: 'Response is not an object' };
  }

  const { plan } = parsed;
  if (!plan || typeof plan !== 'object') {
    return { valid: false, reason: '`plan` must be an object' };
  }

  // Ensure arrays/objects exist on `plan` BEFORE checking their shapes
  if (!Array.isArray(plan.timeline)) return { valid: false, reason: '`plan.timeline` must be an array' };
  if (!Array.isArray(plan.tasks)) return { valid: false, reason: '`plan.tasks` must be an array' };
  if (!plan.promo || typeof plan.promo !== 'object' || Array.isArray(plan.promo)) return { valid: false, reason: '`plan.promo` must be an object' };
  if (!Array.isArray(plan.risks)) return { valid: false, reason: '`plan.risks` must be an array' };
  if (!Array.isArray(plan.budget)) return { valid: false, reason: '`plan.budget` must be an array' };

  return { valid: true };
}

/**
 * Validates tasks inside plan.tasks specifically according to strict schema
 * @param {unknown[]} tasks
 * @returns {{ valid: boolean; reason?: string }}
 */
export function validateTasks(tasks) {
  if (tasks.length < 12) {
    return { valid: false, reason: `Minimum 12 tasks required, got ${tasks.length}` };
  }

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];

    if (!t || typeof t !== 'object') {
      return { valid: false, reason: `Task[${i}] must be an object` };
    }

    // Category lock
    if (!VALID_CATEGORIES.includes(t.category)) {
      return {
        valid: false,
        reason: `Task[${i}] has invalid category: "${t.category}". Must be one of ${VALID_CATEGORIES.join(', ')}`,
      };
    }

    // priority lock according to generic expectation
    const validPriorities = ['High', 'Medium', 'Low'];
    if (!validPriorities.includes(t.priority)) {
      return { valid: false, reason: `Task[${i}] has invalid priority: "${t.priority}". Must be High | Medium | Low` };
    }

    // field integrity (non-empty strings)
    for (const field of ['id', 'task', 'deadline']) {
      if (typeof t[field] !== 'string' || t[field].trim() === '') {
        return { valid: false, reason: `Task[${i}].${field} must be a non-empty string` };
      }
    }
  }

  return { valid: true };
}

/**
 * Deterministic post-parse structural guard.
 * Ensures timeline has enough entries and every category meets the minimum count.
 * Throw-based so it can be used inside a try/catch in the route.
 * @param {object} plan
 * @throws {Error}
 */
export function validatePlanStructure(plan) {
  if (!Array.isArray(plan.timeline) || plan.timeline.length < 5) {
    throw new Error('Invalid timeline: must have at least 5 step-by-step entries');
  }

  if (!Array.isArray(plan.tasks) || plan.tasks.length < 12) {
    throw new Error(`Insufficient tasks: minimum 12 required, got ${plan.tasks?.length ?? 0}`);
  }

  /** @type {Record<string, number>} */
  const categoryCount = {
    Logistics: 0,
    Marketing: 0,
    Technical: 0,
    Operations: 0,
  };

  for (const t of plan.tasks) {
    if (!VALID_CATEGORIES.includes(t.category)) {
      throw new Error(`Invalid category found: "${t.category}"`);
    }
    categoryCount[t.category]++;
  }

  for (const key of VALID_CATEGORIES) {
    if (categoryCount[key] < 2) {
      throw new Error(`Too few tasks in category "${key}": minimum 2 required, got ${categoryCount[key]}`);
    }
  }
}
