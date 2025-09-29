import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getToken(): string | null {
  return (
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_PAT ||
    null
  );
}

function isEnabled() {
  return String(process.env.GITHUB_DELETE_ENABLED || "").toLowerCase() === "true";
}

function parseLinkHeader(h: string | null) {
  const out: Record<string, string> = {};
  if (!h) return out;
  h.split(",").forEach((part) => {
    const m = part.match(/<([^>]+)>; rel="([^"]+)"/);
    if (m) out[m[2]] = m[1];
  });
  return out;
}

export async function GET(req: Request) {
  const token = getToken();
  if (!token) return NextResponse.json({ error: "GitHub token not configured on server" }, { status: 500 });
  if (!isEnabled()) return NextResponse.json({ error: "GitHub cleanup is disabled. Set GITHUB_DELETE_ENABLED=true on server." }, { status: 403 });

  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  const org = url.searchParams.get("org") === "true";
  const visibility = url.searchParams.get("visibility") || "all"; // all|public|private
  const q = url.searchParams.get("q")?.toLowerCase() || "";
  const page = Number(url.searchParams.get("page") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") || 50)));

  if (!owner) return NextResponse.json({ error: "owner is required" }, { status: 400 });

  let api = org
    ? `https://api.github.com/orgs/${owner}/repos?per_page=${perPage}&type=all&sort=full_name&direction=asc&page=${page}`
    : `https://api.github.com/user/repos?per_page=${perPage}&affiliation=owner,collaborator,organization_member&sort=full_name&direction=asc&page=${page}`;

  try {
    const res = await fetch(api, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `GitHub error: ${res.status} ${res.statusText} ${text}` }, { status: 502 });
    }
    const link = parseLinkHeader(res.headers.get("link"));
    const data = await res.json();
    let repos = Array.isArray(data) ? data : [];
    if (!org) {
      repos = repos.filter((r) => String(r.owner?.login || "").toLowerCase() === String(owner).toLowerCase());
    }
    if (visibility !== "all") repos = repos.filter((r) => r.visibility === visibility);
    if (q) repos = repos.filter((r) => String(r.name).toLowerCase().includes(q));
    const out = repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      visibility: r.visibility,
      fork: r.fork,
      archived: r.archived,
      stargazers_count: r.stargazers_count,
      pushed_at: r.pushed_at,
      html_url: r.html_url,
      owner: { login: r.owner?.login },
    }));
    return NextResponse.json({ page, perPage, hasNext: !!link.next, items: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Network error" }, { status: 502 });
  }
}
