#!/usr/bin/env node
/**
 * Pre-push secret scan (lightweight)
 * - Scans changes between upstream and HEAD (if upstream exists), else scans the last commit.
 * - Looks for common secret patterns and blocks the push if found.
 * - Set ALLOW_PUSH_WITH_SECRETS=true to bypass (not recommended).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BYPASS = String(process.env.ALLOW_PUSH_WITH_SECRETS || '').toLowerCase() === 'true';

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/g, // GitHub classic PAT
  /github_pat_[A-Za-z0-9_\-]{20,}/g, // GitHub fine-grained PAT
  /gsk_[A-Za-z0-9]{20,}/g, // Groq
  /re_[A-Za-z0-9_\-]{20,}/g, // Resend
  /sk-[A-Za-z0-9]{20,}/g, // Generic sk- style
];

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.zip', '.gz', '.tgz', '.bz2']);

function getChangedFiles() {
  try {
    const upstream = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (upstream) {
      const out = execSync(`git diff --name-only ${upstream}..HEAD`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const files = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (files.length) return files;
    }
  } catch {}
  // Fallback to last commit files
  try {
    const out = execSync('git show --pretty= --name-only HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function isTextFile(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (BINARY_EXTS.has(ext)) return false;
  return true;
}

function mask(s) {
  if (s.length <= 8) return `${s[0]}***${s.at(-1)}`;
  return `${s.slice(0, 4)}***${s.slice(-4)}`;
}

function main() {
  if (BYPASS) {
    console.warn('[pre-push-scan] Bypassed via ALLOW_PUSH_WITH_SECRETS=true');
    process.exit(0);
  }
  const files = getChangedFiles();
  if (!files.length) process.exit(0);

  const offenders = [];
  for (const rel of files) {
    if (!rel || rel.startsWith('.git/')) continue;
    // Block real env files but allow the template
    if (rel === '.env' || (rel.startsWith('.env.') && rel !== '.env.example')) {
      offenders.push({ file: rel, match: '.env file should never be committed (commit .env.example only)' });
      continue;
    }
    if (!isTextFile(rel)) continue;
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) continue;
    let txt = '';
    try { txt = fs.readFileSync(fp, 'utf8'); } catch { continue; }
    for (const re of SECRET_PATTERNS) {
      const m = txt.match(re);
      if (m && m.length) {
        offenders.push({ file: rel, match: mask(m[0]) });
      }
    }
  }

  if (offenders.length) {
    console.error('\nPush blocked: Potential secrets detected in recent changes:');
    for (const o of offenders) console.error(`  - ${o.file}: ${o.match}`);
    console.error('\nIf these are false positives, set ALLOW_PUSH_WITH_SECRETS=true to bypass (not recommended).');
    process.exit(1);
  }
}

main();
