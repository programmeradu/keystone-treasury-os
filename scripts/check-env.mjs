#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CANDIDATE_FILES = ['.env.local', '.env', '.env.production', '.env.development'];
const VAR_NAMES = ['GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_PAT'];

function mask(val) {
  if (!val) return '';
  const s = String(val);
  if (s.length <= 6) return '*'.repeat(s.length);
  return `${s.slice(0,4)}...${s.slice(-2)}`;
}

function parseEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      map[key] = value;
    }
    return map;
  } catch {
    return null;
  }
}

function checkProcessEnv() {
  const results = {};
  for (const name of VAR_NAMES) {
    if (process.env[name]) {
      results[name] = process.env[name];
    }
  }
  return results;
}

function checkEnvFiles() {
  const findings = [];
  for (const fname of CANDIDATE_FILES) {
    const p = path.join(ROOT, fname);
    if (fs.existsSync(p)) {
      const parsed = parseEnvFile(p) || {};
      const matches = {};
      for (const name of VAR_NAMES) {
        if (parsed[name]) matches[name] = parsed[name];
      }
      findings.push({ file: fname, vars: matches });
    }
  }
  return findings;
}

const procVars = checkProcessEnv();
const fileVars = checkEnvFiles();

const summary = {
  cwd: ROOT,
  processVars: Object.fromEntries(Object.entries(procVars).map(([k,v]) => [k, mask(v)])),
  files: fileVars.map(f => ({ file: f.file, vars: Object.fromEntries(Object.entries(f.vars).map(([k,v]) => [k, mask(v)])) })),
};

console.log(JSON.stringify(summary, null, 2));
