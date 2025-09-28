import { NextRequest } from "next/server";
import archiver from "archiver";
import { Readable, PassThrough } from "node:stream";

export const dynamic = "force-dynamic"; // Always generate fresh zip

export async function GET(_req: NextRequest) {
  const projectRoot = process.cwd();

  // Create a PassThrough stream to pipe the archive into the Response
  const stream = new PassThrough();

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("warning", (err) => {
    if ((err as any).code === "ENOENT") {
      // log non-blocking warnings if needed
      console.warn("archiver warning:", err.message);
    } else {
      stream.emit("error", err);
    }
  });
  archive.on("error", (err) => {
    stream.emit("error", err);
  });

  // Pipe archive data to the stream
  archive.pipe(stream);

  // Add all files except heavy/runtime artifacts and secrets
  archive.glob("**/*", {
    cwd: projectRoot,
    dot: true, // include dotfiles like .eslintrc etc. (but exclude env below)
    ignore: [
      "node_modules/**",
      ".next/**",
      ".turbo/**",
      ".git/**",
      "**/.DS_Store",
      "**/Thumbs.db",
      "**/*.log",
      "**/.pnpm-store/**",
      "**/.cache/**",
      "**/.vercel/**",
      "**/.swc/**",
      "**/.env",
      "**/.env.*",
      "**/*.zip",
    ],
  });

  // Finalize the archive (no more entries)
  void archive.finalize();

  const fileName = `project-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;

  // Convert Node stream to Web ReadableStream for Response compatibility
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  const headers = new Headers({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename=\"${fileName}\"`,
    "Cache-Control": "no-store",
  });

  // Log stream errors for observability (Response is already initiated)
  stream.on("error", (err) => {
    console.error("Zip streaming failed:", err);
    try { archive.abort(); } catch {}
  });

  return new Response(webStream, { headers, status: 200 });
}