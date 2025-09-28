"use client";

import { useState } from "react";

export const DownloadProjectButton = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/download-project", {
        method: "GET",
        headers: {
          // Ensure no caching
          "Cache-Control": "no-store",
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed with ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `project-${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3" data-style="clay">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[20px]">download</span>
        {loading ? "Preparing ZIP…" : "Download Entire Project (ZIP)"}
      </button>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">This will include all source files and configs, excluding node_modules and build artifacts.</p>
      )}
    </div>
  );
};

export default DownloadProjectButton;