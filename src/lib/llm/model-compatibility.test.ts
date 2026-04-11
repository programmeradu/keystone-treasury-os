import { describe, expect, it } from "vitest";
import { estimateCompatibilityBudget, profileTargetChars } from "./model-compatibility";

describe("model compatibility budgets", () => {
  it("returns known model budget", () => {
    expect(estimateCompatibilityBudget("groq/llama-3.3-70b-versatile")).toBeGreaterThan(20000);
  });

  it("returns fallback budget for unknown models", () => {
    expect(estimateCompatibilityBudget("unknown/model")).toBe(16000);
  });

  it("profiles are ordered by expected size", () => {
    expect(profileTargetChars("short")).toBeLessThan(profileTargetChars("medium"));
    expect(profileTargetChars("medium")).toBeLessThan(profileTargetChars("long"));
  });
});
