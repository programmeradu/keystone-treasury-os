"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Urbanist } from "next/font/google";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, ArrowRight } from "lucide-react";
import { marketingPrimaryCtaSm } from "./marketing-styles";

const wordmark = Urbanist({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
  adjustFontFallback: true,
});

const navLinks = [
  { label: "Platform", href: "/#pillars" },
  { label: "Features", href: "/#deep-dive" },
  { label: "Atlas", href: "/#atlas" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Use Cases", href: "/#use-cases" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-transparent bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65 marketing-shadow-float">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 md:h-[4.25rem] items-center justify-between">
          <a
            href="/#content"
            className="flex items-center group rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/40"
            aria-label="dreyv home"
          >
            <span
              className={cn(
                wordmark.className,
                "text-xl font-semibold tracking-tight text-violet-700 lowercase leading-none group-hover:text-violet-600 transition-colors antialiased",
              )}
            >
              dreyv
            </span>
          </a>

          <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5 font-inter-label">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-violet-700 rounded-lg hover:bg-violet-50/80 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 font-inter-label">
            <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-violet-700 hover:bg-violet-50/60">
              <a href="/atlas">Try Atlas</a>
            </Button>
            <a href="/auth?redirect=/app" className={marketingPrimaryCtaSm}>
              <span className="relative font-semibold tracking-wide">Get started</span>
              <ArrowRight className="relative h-3.5 w-3.5 text-white/90 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-violet-700 rounded-lg hover:bg-violet-50/80"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-t border-violet-200/40 font-inter-label"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-violet-700 rounded-lg hover:bg-violet-50/80 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Button variant="ghost" size="sm" asChild className="justify-center text-slate-700">
                  <a href="/atlas">Try Atlas</a>
                </Button>
                <a
                  href="/auth?redirect=/app"
                  onClick={() => setMobileOpen(false)}
                  className={`${marketingPrimaryCtaSm} justify-center w-full`}
                >
                  <span className="relative font-semibold tracking-wide">Get started</span>
                  <ArrowRight className="relative h-3.5 w-3.5 text-white/90 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
