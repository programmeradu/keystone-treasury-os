import { NextResponse } from "next/server";

/**
 * Standardized API error response format.
 * All API routes should use this for consistent error responses:
 *   { error: { code: string, message: string } }
 */
export function apiError(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}

// Common error responses
export const errors = {
  unauthorized: () => apiError("UNAUTHORIZED", "Authentication required", 401),
  forbidden: (msg = "You don't have access to this resource") =>
    apiError("FORBIDDEN", msg, 403),
  notFound: (resource = "Resource") =>
    apiError("NOT_FOUND", `${resource} not found`, 404),
  badRequest: (msg: string) => apiError("BAD_REQUEST", msg, 400),
  conflict: (msg: string) => apiError("CONFLICT", msg, 409),
  rateLimited: (retryAfter?: number) => {
    const res = apiError("RATE_LIMITED", "Too many requests. Please try again later.", 429);
    if (retryAfter) {
      res.headers.set("Retry-After", String(retryAfter));
    }
    return res;
  },
  serviceUnavailable: (service = "Service") =>
    apiError("SERVICE_UNAVAILABLE", `${service} is temporarily unavailable`, 503),
  internal: (msg = "An unexpected error occurred") =>
    apiError("INTERNAL_ERROR", msg, 500),
} as const;
