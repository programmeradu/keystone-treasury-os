import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers.
 * Checks database connectivity and returns service status.
 */
export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Check database connectivity
  const dbStart = Date.now();
  try {
    if (db) {
      await db.execute(sql`SELECT 1`);
      checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
    } else {
      checks.database = { status: "unavailable", error: "No database connection" };
    }
  } catch (err: any) {
    checks.database = { status: "unhealthy", latencyMs: Date.now() - dbStart, error: err.message };
  }

  // Check required env vars
  const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.config = missingEnvVars.length === 0
    ? { status: "healthy" }
    : { status: "degraded", error: `Missing: ${missingEnvVars.join(", ")}` };

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      service: "keystone-treasury-os",
      version: process.env.npm_package_version || "1.0.0",
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
