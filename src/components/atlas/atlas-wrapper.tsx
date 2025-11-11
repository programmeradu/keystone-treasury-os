"use client";

import dynamic from 'next/dynamic';

// Import AtlasClient dynamically with ssr: false to avoid indexedDB errors from wallet adapters
const AtlasClientDynamic = dynamic(
  () => import('@/components/atlas/atlas-client').then((mod) => ({ default: mod.AtlasClient })),
  { ssr: false, loading: () => <div className="min-h-screen flex items-center justify-center">Loading Atlas...</div> }
);

export function AtlasWrapper() {
  return <AtlasClientDynamic />;
}
