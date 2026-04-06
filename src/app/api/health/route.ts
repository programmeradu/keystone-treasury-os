import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "keystone-treasury-os",
    version: process.env.npm_package_version || "1.0.0",
  });
}
