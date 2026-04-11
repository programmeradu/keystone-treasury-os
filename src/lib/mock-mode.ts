/**
 * Check if mock mode is enabled.
 * Mock mode is ONLY allowed in non-production environments.
 * Even if MOCK_MODE=true is set in production, this returns false.
 */
export function isMockMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return String(process.env.MOCK_MODE || "").toLowerCase() === "true";
}
