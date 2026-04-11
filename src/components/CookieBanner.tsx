"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "keystone-cookie-consent";

export function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent) {
            setVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(CONSENT_KEY, "accepted");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4">
            <div className="max-w-lg mx-auto bg-card border border-border rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <p className="text-xs text-muted-foreground flex-1">
                    We use essential cookies for authentication.{" "}
                    <Link href="/legal/cookies" className="text-primary hover:underline">
                        Learn more
                    </Link>
                </p>
                <button
                    onClick={accept}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors shrink-0"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
