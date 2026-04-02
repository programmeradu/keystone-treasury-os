import { describe, expect, it } from "vitest";
import { evaluateSandboxPlan } from "./sandbox-runner";

describe("sandbox dynamic tool runner", () => {
  it("blocks without approval token", () => {
    const result = evaluateSandboxPlan({
      draftId: "draft_1",
      name: "Test",
      objective: "Test objective",
      steps: [{ tool: "navigate", input: { path: "/app" } }],
    });
    expect(result.accepted).toBe(false);
  });

  it("blocks non-allowlisted tools even with token", () => {
    process.env.DYNAMIC_TOOL_APPROVAL_TOKEN = "ok";
    const result = evaluateSandboxPlan({
      draftId: "draft_1",
      name: "Test",
      objective: "Test objective",
      approvalToken: "ok",
      steps: [{ tool: "execute_swap", input: {} }],
    });
    expect(result.accepted).toBe(false);
  });
});
