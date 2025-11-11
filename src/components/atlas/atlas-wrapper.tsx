"use client";

import { useEffect, useState, type ComponentType } from "react";

// Client-only wrapper that loads heavy wallet/provider modules after mount
export function AtlasWrapper() {
  const [Inner, setInner] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ SolanaProviders }, { AtlasClient }] = await Promise.all([
          import("@/components/providers/solana-provider"),
          import("@/components/atlas/atlas-client"),
        ]);
        if (cancelled) return;
        const Comp: ComponentType = () => (
          <SolanaProviders>
            <AtlasClient />
          </SolanaProviders>
        );
        setInner(() => Comp);
      } catch {
        // no-op; UI can remain blank if client load fails
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!Inner) return null;
  const Render = Inner as ComponentType;
  return <Render />;
}
