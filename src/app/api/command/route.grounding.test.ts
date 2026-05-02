import { describe, expect, it } from "vitest";
import {
  buildBudgetedMessagesWithCap,
  classifyEvidenceNeed,
  evaluateGroundingGate,
  validateNavigationPath,
} from "./route.grounding";

describe("command grounding helpers", () => {
  it("classifies db and navigation prompts", () => {
    expect(classifyEvidenceNeed("open studio app link for project x")).toBe("navigation_required");
    expect(classifyEvidenceNeed("what is the saved appId in db")).toBe("db_required");
  });

  it("validates studio deep links and blocks invalid routes", () => {
    const ok = validateNavigationPath("/app/studio?appId=app_abc");
    expect(ok.success).toBe(true);
    const bad = validateNavigationPath("/app/studio/foo");
    expect(bad.success).toBe(false);
  });

  it("enforces grounding gate conditions", () => {
    expect(evaluateGroundingGate("db_required", { lookupSuccess: false, navigationSuccess: true }).allowed).toBe(false);
    expect(evaluateGroundingGate("navigation_required", { lookupSuccess: true, navigationSuccess: true }).allowed).toBe(true);
  });

  it("reduces oversized message context deterministically", () => {
    const long = [{ role: "user", content: "x".repeat(5000) }, { role: "assistant", content: "y".repeat(5000) }];
    const reduced = buildBudgetedMessagesWithCap(long, 1000);
    expect(reduced.reduced).toBe(true);
    expect(reduced.messages.length).toBeGreaterThan(0);
  });
});
