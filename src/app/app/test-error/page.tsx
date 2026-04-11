"use client";

import { useEffect } from "react";

export default function TestErrorTrigger() {
    useEffect(() => {
        // We throw in a useEffect to intentionally trip the client-side error boundary
        throw new Error("Manual diagnostics trigger initialized by administrator.");
    }, []);

    return null;
}
