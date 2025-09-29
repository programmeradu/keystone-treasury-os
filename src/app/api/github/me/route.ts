import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getToken(): { token: string; source: string } | null {
  const candidates: Array<[string, string | undefined]> = [
    ["GITHUB_TOKEN", process.env.GITHUB_TOKEN],
    ["GH_TOKEN", process.env.GH_TOKEN],
    ["GITHUB_PAT", process.env.GITHUB_PAT],
  ];
  for (const [source, value] of candidates) {
    if (value && String(value).trim()) {
      return { token: String(value).trim(), source };
    }
  }
  return null;
}

export async function GET() {
  const tok = getToken();
  if (!tok) {
    return NextResponse.json(
      { error: "GitHub token not configured on server" },
      { status: 500 }
    );
  }
  try {
    const mask = (t: string) => (t.length <= 10 ? `${t[0]}***${t.slice(-1)}` : `${t.slice(0, 6)}***${t.slice(-4)}`);
    const fingerprint = mask(tok.token);
    let res = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        // Use the 'token' scheme for PATs to avoid 'Bad credentials' issues
        authorization: `token ${tok.token}`,
        "user-agent": "keystone-treasury-os",
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (res.status === 401) {
      // Retry with Bearer as a fallback for some PAT configurations
      res = await fetch("https://api.github.com/user", {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${tok.token}`,
          "user-agent": "keystone-treasury-os",
          "x-github-api-version": "2022-11-28",
        },
        cache: "no-store",
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `GitHub error: ${res.status} ${res.statusText} ${text}` , tokenSource: tok.source, tokenFingerprint: fingerprint },
        { status: 502 }
      );
    }
    const oauthScopes = res.headers.get("x-oauth-scopes") || "";
    const data = await res.json();
    return NextResponse.json({ login: data.login, id: data.id, name: data.name, tokenSource: tok.source, tokenFingerprint: fingerprint, oauthScopes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Network error" }, { status: 502 });
  }
}
