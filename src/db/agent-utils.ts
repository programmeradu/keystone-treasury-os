import { db } from "@/db";
import { agentExecutions, agentApprovals } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ExecutionStatus } from "@/lib/agents";

// Database guard
function ensureDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export interface CreateExecutionInput {
  id: string;
  userId: string;
  walletAddress: string;
  strategy: string;
  input: Record<string, any>;
}

export interface UpdateExecutionInput {
  status?: string;
  progress?: number;
  result?: Record<string, any>;
  error?: string;
  actualGas?: number;
  transactionSignature?: string;
  completedAt?: number;
  duration?: number;
}

/**
 * Create a new execution record
 */
export async function createExecution(input: CreateExecutionInput) {
  const database = ensureDb();
  const now = Date.now();
  
  return database.insert(agentExecutions).values({
    id: input.id,
    userId: input.userId,
    walletAddress: input.walletAddress,
    strategy: input.strategy,
    input: input.input,
    status: ExecutionStatus.PENDING,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update execution status and progress
 */
export async function updateExecution(
  executionId: string,
  updates: UpdateExecutionInput
) {
  const database = ensureDb();
  const now = Date.now();
  
  return database
    .update(agentExecutions)
    .set({
      ...updates,
      updatedAt: now,
      startedAt: updates.status === ExecutionStatus.RUNNING ? now : undefined,
    })
    .where(eq(agentExecutions.id, executionId));
}

/**
 * Get execution by ID
 */
export async function getExecution(executionId: string) {
  const database = ensureDb();
  const result = await database
    .select()
    .from(agentExecutions)
    .where(eq(agentExecutions.id, executionId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get execution history for a user
 */
export async function getExecutionHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const database = ensureDb();
  return database
    .select()
    .from(agentExecutions)
    .where(eq(agentExecutions.userId, userId))
    .orderBy(desc(agentExecutions.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get execution statistics for a user
 */
export async function getExecutionStats(userId: string) {
  const database = ensureDb();
  const result = await database
    .select({
      total: sql<number>`COUNT(*)`,
      successful: sql<number>`SUM(CASE WHEN status = ${ExecutionStatus.SUCCESS} THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = ${ExecutionStatus.FAILED} THEN 1 ELSE 0 END)`,
      totalGas: sql<number>`SUM(COALESCE(actual_gas, 0))`,
      avgDuration: sql<number>`AVG(COALESCE(duration, 0))`,
    })
    .from(agentExecutions)
    .where(eq(agentExecutions.userId, userId));
  
  return result[0] || {
    total: 0,
    successful: 0,
    failed: 0,
    totalGas: 0,
    avgDuration: 0,
  };
}

/**
 * Get strategy statistics for a user
 */
export async function getStrategyStats(userId: string) {
  const database = ensureDb();
  return database
    .select({
      strategy: agentExecutions.strategy,
      total: sql<number>`COUNT(*)`,
      successful: sql<number>`SUM(CASE WHEN status = ${ExecutionStatus.SUCCESS} THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = ${ExecutionStatus.FAILED} THEN 1 ELSE 0 END)`,
      totalGas: sql<number>`SUM(COALESCE(actual_gas, 0))`,
    })
    .from(agentExecutions)
    .where(eq(agentExecutions.userId, userId))
    .groupBy(agentExecutions.strategy)
    .orderBy(desc(sql<number>`COUNT(*)`));
}

/**
 * Create an approval request
 */
export async function createApproval(input: {
  id: string;
  executionId: string;
  userId: string;
  walletAddress: string;
  message: string;
  details?: Record<string, any>;
  estimatedFee?: number;
  riskLevel?: string;
}) {
  const database = ensureDb();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes
  
  return database.insert(agentApprovals).values({
    id: input.id,
    executionId: input.executionId,
    userId: input.userId,
    walletAddress: input.walletAddress,
    message: input.message,
    details: input.details,
    estimatedFee: input.estimatedFee,
    riskLevel: input.riskLevel,
    expiresAt,
    createdAt: now,
  });
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(userId: string) {
  const database = ensureDb();
  return database
    .select()
    .from(agentApprovals)
    .where(
      and(
        eq(agentApprovals.userId, userId),
        sql`${agentApprovals.approved} IS NULL`
      )
    )
    .orderBy(desc(agentApprovals.createdAt));
}

/**
 * Respond to an approval
 */
export async function respondToApproval(
  approvalId: string,
  approved: boolean,
  signature?: string,
  rejectionReason?: string
) {
  const database = ensureDb();
  return database
    .update(agentApprovals)
    .set({
      approved,
      signature,
      rejectionReason,
      respondedAt: Date.now(),
    })
    .where(eq(agentApprovals.id, approvalId));
}

/**
 * Get approval by ID
 */
export async function getApproval(approvalId: string) {
  const database = ensureDb();
  const result = await database
    .select()
    .from(agentApprovals)
    .where(eq(agentApprovals.id, approvalId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get approval by execution ID
 */
export async function getApprovalByExecutionId(executionId: string) {
  const database = ensureDb();
  const result = await database
    .select()
    .from(agentApprovals)
    .where(eq(agentApprovals.executionId, executionId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Clean up expired approvals
 */
export async function cleanupExpiredApprovals() {
  const database = ensureDb();
  const now = Date.now();
  
  return database
    .delete(agentApprovals)
    .where(sql`${agentApprovals.expiresAt} < ${now} AND ${agentApprovals.approved} IS NULL`);
}
