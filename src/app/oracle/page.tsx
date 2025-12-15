"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Script from "next/script";
// ... existing imports ...

export default function ChainFlowOracle() {
  const router = useRouter();
  // ... existing state ...

  // ... all existing functions ...

  return (
    <>
      <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      {/* ... rest of existing JSX ... */}
    </>
  );
}