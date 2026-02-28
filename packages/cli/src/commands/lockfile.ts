/**
 * Pinned Import Maps — Enforce ?external=react,react-dom for esm.sh.
 * Prevents Dependency Hell, reduces bundle ~1MB.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface LockfileValidationResult {
  ok: boolean;
  errors: { package: string; message: string; fix?: string }[];
}

const ESM_SH_REGEX = /^https:\/\/esm\.sh\//;
const EXTERNAL_PARAM = "external=react,react-dom";

export function validateLockfile(dir: string = "."): LockfileValidationResult {
  const targetDir = path.resolve(process.cwd(), dir);
  const lockPath = path.join(targetDir, "keystone.lock.json");
  const errors: LockfileValidationResult["errors"] = [];

  if (!fs.existsSync(lockPath)) {
    return { ok: true, errors: [] };
  }

  const raw = fs.readFileSync(lockPath, "utf-8");
  let data: { packages?: Record<string, { url?: string }> };
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, errors: [{ package: "lockfile", message: "Invalid JSON" }] };
  }

  const packages = data.packages ?? {};
  const skipPackages = new Set(["react", "react-dom", "react-dom/client", "@keystone-os/sdk"]);
  for (const [name, pkg] of Object.entries(packages)) {
    if (skipPackages.has(name)) continue;
    const url = (pkg as { url?: string }).url;
    if (!url || typeof url !== "string") continue;

    if (url.startsWith("blob:") || url.startsWith("file:")) continue;
    if (!ESM_SH_REGEX.test(url)) continue;

    if (!url.includes("?")) {
      errors.push({
        package: name,
        message: `esm.sh URL must include ?external=react,react-dom`,
        fix: `${url}?external=react,react-dom`,
      });
    } else if (!url.includes(EXTERNAL_PARAM) && !url.includes("external=")) {
      const sep = url.includes("?") ? "&" : "?";
      errors.push({
        package: name,
        message: `esm.sh URL must include external=react,react-dom`,
        fix: `${url}${sep}external=react,react-dom`,
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
