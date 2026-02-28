/**
 * Gatekeeper Security Pipeline — AST/pattern scan + lockfile verification.
 * Runs before publish to enforce Glass Safety Standard and pinned imports.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { runValidate, type ValidateResult } from "./validate.js";
import { validateLockfile, type LockfileValidationResult } from "./lockfile.js";

const EXTRA_FORBIDDEN = [
  { pattern: /\binnerHTML\s*=/g, msg: "innerHTML assignment is blocked (XSS risk)." },
  { pattern: /\bdangerouslySetInnerHTML\b/g, msg: "dangerouslySetInnerHTML requires explicit allowlist." },
  { pattern: /\bwindow\.solana\b/g, msg: "Direct window.solana access is blocked. Use useTurnkey() from SDK." },
  { pattern: /\bwindow\.ethereum\b/g, msg: "Direct window.ethereum access is blocked. Use SDK hooks." },
];

export interface GatekeeperResult {
  ok: boolean;
  securityScore: number;
  validate: ValidateResult;
  lockfile: LockfileValidationResult;
  errors: { file: string; line: number; message: string }[];
}

export function runGatekeeper(dir: string = "."): GatekeeperResult {
  const targetDir = path.resolve(process.cwd(), dir);
  const validate = runValidate(dir);
  const lockfile = validateLockfile(dir);

  const errors: GatekeeperResult["errors"] = [
    ...validate.errors.map((e) => ({ file: e.file, line: e.line, message: e.message })),
    ...lockfile.errors.map((e) => ({ file: "keystone.lock.json", line: 1, message: `${e.package}: ${e.message}` })),
  ];

  const files = ["App.tsx", "app.tsx"];
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    for (const { pattern, msg } of EXTRA_FORBIDDEN) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        errors.push({ file, line: lineNum, message: msg });
      }
    }
  }

  const totalErrors = errors.length;
  const securityScore = Math.max(0, Math.min(100, 100 - totalErrors * 10));

  return {
    ok: totalErrors === 0,
    securityScore,
    validate,
    lockfile,
    errors,
  };
}
