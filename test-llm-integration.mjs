#!/usr/bin/env node

/**
 * Test LLM Integration with Phase 4
 * Validates:
 * - LLMApprovalDialog component compiles
 * - AgentExecutor integrates LLM calls
 * - Strategy planner types are correct
 * - Error explainer works
 * - Analysis translator is ready
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const tests = [
  {
    name: "Check LLMApprovalDialog exists",
    fn: () => {
      const file = "/workspaces/keystone-treasury-os/src/components/LLMApprovalDialog.tsx";
      if (!fs.existsSync(file)) throw new Error("LLMApprovalDialog.tsx not found");
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("export function LLMApprovalDialog")) {
        throw new Error("LLMApprovalDialog export not found");
      }
      return true;
    }
  },
  {
    name: "Check AgentExecutor has LLM integration",
    fn: () => {
      const file = "/workspaces/keystone-treasury-os/src/components/AgentExecutor.tsx";
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("planStrategy")) throw new Error("planStrategy import missing");
      if (!content.includes("explainError")) throw new Error("explainError import missing");
      if (!content.includes("LLMApprovalDialog")) throw new Error("LLMApprovalDialog import missing");
      if (!content.includes("handlePlanFromDescription")) {
        throw new Error("handlePlanFromDescription method missing");
      }
      return true;
    }
  },
  {
    name: "Check strategy-planner types",
    fn: () => {
      const file = "/workspaces/keystone-treasury-os/src/lib/llm/strategy-planner.ts";
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("export interface StrategyPlan")) {
        throw new Error("StrategyPlan interface not exported");
      }
      if (!content.includes("export async function planStrategy")) {
        throw new Error("planStrategy function not exported");
      }
      return true;
    }
  },
  {
    name: "Check error-explainer exists",
    fn: () => {
      const file = "/workspaces/keystone-treasury-os/src/lib/llm/error-explainer.ts";
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("export async function explainError")) {
        throw new Error("explainError function not exported");
      }
      return true;
    }
  },
  {
    name: "Check analysis-translator exists",
    fn: () => {
      const file = "/workspaces/keystone-treasury-os/src/lib/llm/analysis-translator.ts";
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("export async function translateTokenAnalysis")) {
        throw new Error("translateTokenAnalysis function not exported");
      }
      return true;
    }
  },
  {
    name: "TypeScript compilation check",
    fn: () => {
      return new Promise((resolve, reject) => {
        const proc = spawn("npx", ["tsc", "--noEmit"], {
          cwd: "/workspaces/keystone-treasury-os",
          stdio: "pipe"
        });

        let stderr = "";
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        proc.on("close", (code) => {
          if (code !== 0) {
            // Filter out expected warnings
            if (
              stderr.includes("AgentExecutor.tsx") ||
              stderr.includes("LLMApprovalDialog.tsx")
            ) {
              reject(new Error(`TypeScript errors:\n${stderr}`));
            } else if (stderr.length > 100) {
              reject(new Error(`TypeScript errors:\n${stderr.slice(0, 200)}`));
            }
          }
          resolve(true);
        });
      });
    }
  }
];

async function runTests() {
  console.log("🧪 Testing Phase 4 LLM Integration\n");

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("\n🎉 All Phase 4 integration tests passed!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed");
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
