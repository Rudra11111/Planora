import { nanoid } from 'nanoid';

/**
 * Generates a purely random nanoid.
 * @param {number} [length=12] - Minimum 10 per spec.
 * @returns {string}
 */
export function generateToken(length = 12) {
  return nanoid(length);
}
