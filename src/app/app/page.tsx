// Minimal Server Component for the dedicated MVP portal
import { KeystoneApp } from "./app-client";
import Link from "next/link";

export const metadata = {
  title: "KeyStone App — Command Layer",
  description:
    "Execute treasury operations via natural language in the KeyStone Command Layer.",
};

export default function AppPortalPage() {
  return (
    <div className="min-h-dvh w-full">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-semibold tracking-tight">
            KeyStone
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Home
          </Link>
        </div>
      </header>
      <main>
        <KeystoneApp />
      </main>
    </div>
  );
}