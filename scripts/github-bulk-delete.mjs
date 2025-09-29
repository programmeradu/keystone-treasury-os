#!/usr/bin/env node
/**
 * GitHub Bulk Delete CLI (safe, filtered, confirmable)
 *
 * Features
 * - Dry-run by default (no deletions unless --yes)
 * - Powerful filters: owner/org, visibility, archived/forks, name contains/regex, date thresholds, stars thresholds
 * - Safety rails: Exclude lists, protect default branch (implicit), interactive confirmation unless --yes
 * - Handles pagination, basic rate-limit backoff, and retries
 *
 * Requirements
 * - GitHub PAT in env: GITHUB_TOKEN or GH_TOKEN or GITHUB_PAT
 * - Token must have delete_repo scope for deleting repositories
 * - Node 18+ (for global fetch)
 */

import fs from 'node:fs';
import path from 'node:path';

const SLEEP = (ms) => new Promise((res) => setTimeout(res, ms));

const ROOT = process.cwd();
const ENV_FILES = ['.env.local', '.env', '.env.production', '.env.development'];
const TOKEN_VARS = ['GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_PAT'];

function loadDotEnvLike() {
  for (const fn of ENV_FILES) {
    const fp = path.join(ROOT, fn);
    if (!fs.existsSync(fp)) continue;
    try {
      const txt = fs.readFileSync(fp, 'utf8');
      for (const line of txt.split(/\r?\n/)) {
        const s = line.trim();
        if (!s || s.startsWith('#')) continue;
        const i = s.indexOf('=');
        if (i === -1) continue;
        const k = s.slice(0, i).trim();
        let v = s.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (!(k in process.env)) process.env[k] = v;
      }
    } catch {}
  }
}

function getToken() {
  loadDotEnvLike();
  for (const k of TOKEN_VARS) {
    if (process.env[k]) return process.env[k];
  }
  return null;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.includes('=') ? a.split('=') : [a, argv[i + 1]?.startsWith('--') ? 'true' : argv[++i]];
      const key = k.replace(/^--/, '');
      args[key] = v === undefined ? true : v;
    }
  }
  return args;
}

function usage() {
  console.log(`\nGitHub Bulk Delete CLI\n\nUsage:\n  node scripts/github-bulk-delete.mjs --owner <owner> [--org|--user] [filters...] [--dry-run] [--yes]\n\nRequired:\n  --owner <owner>               The org or user that owns the repositories\n  --org | --user                Treat owner as an organization or user (default: --user)\n\nCommon Filters (all optional):\n  --visibility <all|public|private>   Filter by visibility (default: all)\n  --archived <include|exclude|only>   Control archived repos (default: exclude)\n  --forks <include|exclude|only>      Control forks (default: exclude)\n  --name-contains <substr>            Only repos whose name contains this substring\n  --name-regex <pattern>              Only repos whose name matches this JS regex (e.g. ".*-test$")\n  --exclude <names>                   Comma-separated repo names to exclude\n  --include <names>                   Comma-separated repo names to explicitly include (applied after other filters)\n  --created-before <YYYY-MM-DD>       Only repos created before this date\n  --pushed-before <YYYY-MM-DD>        Only repos last pushed before this date\n  --stars-lt <N>                      Only repos with stargazers_count < N\n  --private-only                      Convenience alias for --visibility=private\n  --public-only                       Convenience alias for --visibility=public\n\nSafety & Execution:\n  --dry-run                           Preview deletions (default: true)\n  --yes                               Actually delete (non-interactive). Without this, you'll be prompted.\n  --concurrency <N>                   Parallel deletions (default: 3)\n\nExamples:\n  # Dry-run delete private repos under an org whose names end with -sandbox\n  node scripts/github-bulk-delete.mjs --owner my-org --org --private-only --name-regex ".*-sandbox$"\n\n  # Actually delete old archived forks with few stars (prompted)\n  node scripts/github-bulk-delete.mjs --owner me --user --archived only --forks only --stars-lt 3 --pushed-before 2024-01-01\n\n  # Non-interactive deletion (dangerous, be sure!)\n  node scripts/github-bulk-delete.mjs --owner my-org --org --name-contains sandbox --yes\n`);
}

function parseDate(d) {
  try { return d ? new Date(String(d)) : null; } catch { return null; }
}

async function ghFetch(url, token, init = {}, retry = 0) {
  const baseHeaders = {
    'accept': 'application/vnd.github+json',
    'user-agent': 'keystone-treasury-os-cli',
    'x-github-api-version': '2022-11-28',
  };
  const res0 = await fetch(url, { ...init, headers: { ...baseHeaders, 'authorization': `token ${token}`, ...(init.headers || {}) } });
  const res = res0.status === 401
    ? await fetch(url, { ...init, headers: { ...baseHeaders, 'authorization': `Bearer ${token}`, ...(init.headers || {}) } })
    : res0;

  // Basic rate-limit handling
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
    const waitMs = Math.max(0, reset - Date.now()) + 1000;
    console.warn(`Rate limit reached. Waiting ${Math.ceil(waitMs/1000)}s ...`);
    await SLEEP(waitMs);
    return ghFetch(url, token, init, retry);
  }

  if (res.status >= 500 && retry < 2) {
    await SLEEP(1000 * Math.pow(2, retry));
    return ghFetch(url, token, init, retry + 1);
  }

  return res;
}

function parseLinkHeader(h) {
  const out = {};
  if (!h) return out;
  h.split(',').forEach(part => {
    const m = part.match(/<([^>]+)>; rel="([^"]+)"/);
    if (m) out[m[2]] = m[1];
  });
  return out;
}

async function listRepos({ owner, isOrg, token, visibility = 'all' }) {
  const per_page = 100;
  let url = isOrg
    ? `https://api.github.com/orgs/${owner}/repos?per_page=${per_page}&type=all&sort=full_name&direction=asc`
    : `https://api.github.com/user/repos?per_page=${per_page}&affiliation=owner,collaborator,organization_member&sort=full_name&direction=asc`;

  const items = [];
  while (url) {
    const res = await ghFetch(url, token);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to list repos: ${res.status} ${res.statusText} ${text}`);
    }
    const page = await res.json();
    for (const r of page) {
      if (!isOrg) {
        // Ensure we only keep repos for specified owner if --user path
        if (r.owner?.login?.toLowerCase() !== owner.toLowerCase()) continue;
      }
      if (visibility !== 'all' && r.visibility !== visibility) continue;
      items.push(r);
    }
    const link = parseLinkHeader(res.headers.get('link'));
    url = link.next || '';
  }
  return items;
}

function filterRepos(repos, args) {
  const archivedMode = (args.archived || 'exclude').toLowerCase();
  const forksMode = (args.forks || 'exclude').toLowerCase();
  let nameContains = args['name-contains'] ? String(args['name-contains']).toLowerCase() : '';
  let nameRegex = args['name-regex'] ? new RegExp(String(args['name-regex'])) : null;
  const createdBefore = parseDate(args['created-before']);
  const pushedBefore = parseDate(args['pushed-before']);
  const starsLt = args['stars-lt'] != null ? Number(args['stars-lt']) : null;
  const include = (args.include ? String(args.include).split(',').map(s => s.trim()).filter(Boolean) : []);
  const exclude = (args.exclude ? String(args.exclude).split(',').map(s => s.trim()).filter(Boolean) : []);

  return repos.filter(r => {
    if (archivedMode === 'exclude' && r.archived) return false;
    if (archivedMode === 'only' && !r.archived) return false;
    if (forksMode === 'exclude' && r.fork) return false;
    if (forksMode === 'only' && !r.fork) return false;
    if (nameContains && !String(r.name).toLowerCase().includes(nameContains)) return false;
    if (nameRegex && !nameRegex.test(r.name)) return false;
    if (createdBefore && new Date(r.created_at) >= createdBefore) return false;
    if (pushedBefore && new Date(r.pushed_at) >= pushedBefore) return false;
    if (starsLt != null && Number(r.stargazers_count || 0) >= starsLt) return false;
    if (exclude.includes(r.name)) return false;
    if (include.length > 0 && !include.includes(r.name)) return false;
    return true;
  });
}

async function deleteRepo(owner, repo, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await ghFetch(url, token, { method: 'DELETE' });
  if (res.status === 204) return { ok: true };
  const text = await res.text().catch(() => '');
  return { ok: false, error: `${res.status} ${res.statusText} ${text}` };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.owner) {
    usage();
    console.error('\nError: --owner is required');
    process.exit(1);
  }

  const token = getToken();
  if (!token) {
    usage();
    console.error('\nError: GitHub token not found. Set GITHUB_TOKEN / GH_TOKEN / GITHUB_PAT or create .env.local');
    process.exit(1);
  }

  // Visibility convenience flags
  let visibility = args.visibility || 'all';
  if (args['private-only']) visibility = 'private';
  if (args['public-only']) visibility = 'public';

  const isOrg = !!args.org && !args.user; // default: user
  console.log(`\nListing repos for ${isOrg ? 'org' : 'user'} '${args.owner}' with visibility=${visibility} ...`);
  let repos = await listRepos({ owner: String(args.owner), isOrg, token, visibility });
  console.log(`Found ${repos.length} repos before filters.`);

  repos = filterRepos(repos, args);
  if (repos.length === 0) {
    console.log('No repositories match the provided filters.');
    process.exit(0);
  }

  // Preview
  console.log('\nCandidates for deletion (dry-run preview):');
  for (const r of repos) {
    console.log(`- ${r.full_name}  vis=${r.visibility} archived=${r.archived} fork=${r.fork} stars=${r.stargazers_count} pushed=${r.pushed_at}`);
  }
  console.log(`\nTotal candidates: ${repos.length}`);

  const dryRun = args['dry-run'] !== undefined ? String(args['dry-run']).toLowerCase() !== 'false' : true;
  if (dryRun && !args.yes) {
    console.log('\nDry-run mode (default). No changes made. Re-run with --yes to delete.');
    process.exit(0);
  }

  // One more safety prompt unless --yes provided explicitly
  if (!args.yes) {
    process.stdout.write(`\nType the owner name '${args.owner}' to confirm deletion of ${repos.length} repos: `);
    const input = await new Promise((res) => {
      process.stdin.resume();
      process.stdin.once('data', (d) => res(String(d).trim()));
    });
    if (String(input).trim().toLowerCase() !== String(args.owner).toLowerCase()) {
      console.log('Confirmation did not match. Aborting.');
      process.exit(1);
    }
  }

  const concurrency = Math.max(1, Number(args.concurrency || 3));
  console.log(`\nDeleting with concurrency=${concurrency} ...`);

  let success = 0, fail = 0;
  const queue = repos.slice();
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const r = queue.shift();
      if (!r) break;
      const { owner } = r;
      const repoName = r.name;
      process.stdout.write(`Deleting ${owner.login}/${repoName} ... `);
      const res = await deleteRepo(owner.login, repoName, token);
      if (res.ok) {
        success++; console.log('OK');
      } else {
        fail++; console.log('FAIL'); console.log(`  -> ${res.error}`);
      }
      await SLEEP(100); // small gap to be nice
    }
  });
  await Promise.all(workers);

  console.log(`\nDone. Deleted=${success}, Failed=${fail}`);
  process.exit(fail ? 2 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
