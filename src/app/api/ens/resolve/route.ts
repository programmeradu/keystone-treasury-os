import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing required param: name" }, { status: 400 });
  }

  const url = `https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`;
  try {
    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) {
      return NextResponse.json(
        { error: `ENS resolve error: ${r.status} ${r.statusText}` },
        { status: r.status }
      );
    }
    const data = await r.json();
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Network error" }, { status: 500 });
  }
}