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

export async function GET() {
  const token = getToken();
  if (!token) {
    return NextResponse.json(
      { error: "GitHub token not configured on server" },
      { status: 500 }
    );
  }
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `GitHub error: ${res.status} ${res.statusText} ${text}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json({ login: data.login, id: data.id, name: data.name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Network error" }, { status: 502 });
  }
}
