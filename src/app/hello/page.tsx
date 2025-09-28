import dynamic from "next/dynamic";
const DownloadProjectButton = dynamic(
  () => import("./download-button").then((m) => m.DownloadProjectButton),
  { ssr: false }
);

export default function HelloPage() {
  return (
    <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
      {/* Debug marker to ensure latest build is loaded */}
      <div id="debug-marker" className="text-xs text-muted-foreground">hello-page v3</div>
      {/* Plain fallback link placed first to guarantee visibility */}
      <a
        id="download-zip-plain"
        href="/api/download-project"
        className="block rounded-md border border-border px-4 py-2 text-blue-700 underline hover:no-underline"
      >
        Download ZIP (plain link)
      </a>
      {/* Extra ultra-plain link with no classes for visibility */}
      <p><a id="download-zip-ultraplain" href="/api/download-project">DOWNLOAD ZIP (ultra-plain)</a></p>
      <div className="text-xl">hello world</div>
      {/* Client button (hydration-independent via dynamic import off) */}
      <DownloadProjectButton />
      {/* Server-rendered fallback link in case client hydration fails */}
      <a
        id="download-zip-primary"
        href="/api/download-project"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-white shadow-lg transition hover:bg-emerald-700"
      >
        <span className="material-symbols-outlined text-[20px]">download</span>
        Download (ZIP)
      </a>
    </div>
  );
}