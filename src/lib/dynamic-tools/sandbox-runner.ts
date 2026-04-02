export type SandboxRiskLevel = "low" | "medium" | "high";

export interface SandboxExecutionPolicy {
  maxRuntimeMs: number;
  maxNetworkCalls: number;
  allowedHosts: string[];
  allowEnvAccess: false;
  allowFilesystemWrite: false;
}

export interface SandboxExecutionRequest {
  draftId: string;
  name: string;
  objective: string;
  approvalToken?: string;
  steps: Array<{ tool: string; input?: Record<string, unknown> }>;
}

export interface SandboxExecutionResult {
  approved: boolean;
  accepted: boolean;
  riskLevel: SandboxRiskLevel;
  policy: SandboxExecutionPolicy;
  blockedReason?: string;
  executionPlan?: Array<{ step: number; tool: string; status: "accepted_for_execution" }>;
}

const DEFAULT_POLICY: SandboxExecutionPolicy = {
  maxRuntimeMs: 5_000,
  maxNetworkCalls: 3,
  allowedHosts: ["api.jup.ag", "lite-api.jup.ag", "api.dexscreener.com", "api.github.com"],
  allowEnvAccess: false,
  allowFilesystemWrite: false,
};

const ALLOWED_TOOLS = new Set([
  "get_project_by_id",
  "get_project_by_name",
  "list_recent_projects",
  "get_studio_project_link",
  "navigate",
  "mcp_verify",
]);

export function evaluateSandboxPlan(req: SandboxExecutionRequest): SandboxExecutionResult {
  const approved = !!req.approvalToken && req.approvalToken === process.env.DYNAMIC_TOOL_APPROVAL_TOKEN;
  if (!approved) {
    return {
      approved: false,
      accepted: false,
      riskLevel: "high",
      policy: DEFAULT_POLICY,
      blockedReason: "Approval token missing or invalid.",
    };
  }

  const invalidTools = req.steps.filter((s) => !ALLOWED_TOOLS.has(s.tool));
  if (invalidTools.length > 0) {
    return {
      approved: true,
      accepted: false,
      riskLevel: "high",
      policy: DEFAULT_POLICY,
      blockedReason: `Non-allowlisted tools requested: ${invalidTools.map((x) => x.tool).join(", ")}`,
    };
  }

  return {
    approved: true,
    accepted: true,
    riskLevel: "low",
    policy: DEFAULT_POLICY,
    executionPlan: req.steps.map((s, i) => ({
      step: i + 1,
      tool: s.tool,
      status: "accepted_for_execution",
    })),
  };
}
