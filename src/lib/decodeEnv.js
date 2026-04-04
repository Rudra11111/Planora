/**
 * decodeEnv.js
 * Decodes Base64-obfuscated environment variables at runtime.
 *
 * All sensitive values in .env are stored as Base64 strings.
 * This function decodes them back to plaintext before use.
 *
 * To encode a new key value, run in your terminal:
 *   node -e "console.log(Buffer.from('YOUR_ACTUAL_KEY').toString('base64'))"
 * Then store the output in .env as:
 *   GEMINI_API_KEY=<base64_output>
 */
export function decodeEnv(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(`[Planora] Missing environment variable: ${name}`);
  try {
    return Buffer.from(raw, 'base64').toString('utf-8');
  } catch {
    // Fallback: return as-is for non-secret values like PORT
    return raw;
  }
}
