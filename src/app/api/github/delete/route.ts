import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getToken(): string | null {
  const candidates = [process.env.GITHUB_TOKEN, process.env.GH_TOKEN, process.env.GITHUB_PAT];
  for (const v of candidates) {
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

function isEnabled() {
  return String(process.env.GITHUB_DELETE_ENABLED || "").toLowerCase() === "true";
}

async function hasDeleteRepoScope(token: string): Promise<{ ok: boolean; scopes: string }> {
  let res = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `token ${token}`,
      "user-agent": "keystone-treasury-os",
      "x-github-api-version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (res.status === 401) {
    res = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "keystone-treasury-os",
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
  }
  const scopes = res.headers.get("x-oauth-scopes") || "";
  if (!scopes) return { ok: true, scopes }; // fine-grained PATs often omit this header; allow and rely on per-call auth
  const has = scopes.split(/\s*,\s*/).some((s) => s.toLowerCase() === "delete_repo");
  return { ok: has, scopes };
}

async function ghDelete(owner: string, repo: string, token: string) {
  let res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    method: "DELETE",
    headers: {
      accept: "application/vnd.github+json",
      // Use 'token' scheme for PATs
      authorization: `token ${token}`,
      "user-agent": "keystone-treasury-os",
      "x-github-api-version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (res.status === 401) {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: "DELETE",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "keystone-treasury-os",
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
  }
  if (res.status === 204) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, error: `${res.status} ${res.statusText} ${text}` };
}

export async function POST(req: Request) {
  const token = getToken();
  if (!token) return NextResponse.json({ error: "GitHub token not configured on server" }, { status: 500 });
  if (!isEnabled()) return NextResponse.json({ error: "GitHub cleanup is disabled. Set GITHUB_DELETE_ENABLED=true on server." }, { status: 403 });

  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm");
  if (confirm !== "true") {
    return NextResponse.json({ error: "Missing confirm=true" }, { status: 400 });
  }

  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const items: Array<{ owner: string; repo: string }> = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return NextResponse.json({ error: "No items provided" }, { status: 400 });

  // Limit batch size for safety
  if (items.length > 200) return NextResponse.json({ error: "Too many items; max 200 per request" }, { status: 400 });

  // Preflight: if classic PAT without delete_repo, fail fast with clear message
  try {
    const scopeCheck = await hasDeleteRepoScope(token);
    if (!scopeCheck.ok) {
      return NextResponse.json(
        { error: "GitHub token missing delete_repo scope. Create a classic PAT with delete_repo or a fine-grained token with Administration: Read & write for targeted repos.", scopes: scopeCheck.scopes },
        { status: 403 }
      );
    }
  } catch {}

  const results = [] as Array<{ owner: string; repo: string; ok: boolean; error?: string }>;
  for (const it of items) {
    if (!it?.owner || !it?.repo) {
      results.push({ owner: it?.owner || "", repo: it?.repo || "", ok: false, error: "Invalid item" });
      continue;
    }
    const r = await ghDelete(it.owner, it.repo, token);
    results.push({ owner: it.owner, repo: it.repo, ok: r.ok, error: r.ok ? undefined : r.error });
  }
  const okCount = results.filter(r => r.ok).length;
  return NextResponse.json({ deleted: okCount, results });
}
