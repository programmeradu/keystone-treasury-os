"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogoFilled } from "@/components/icons";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Platform", href: "#pillars" },
  { label: "Features", href: "#deep-dive" },
  { label: "Atlas", href: "#atlas" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-[#0B0C10]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#content" className="flex items-center gap-2.5 group" aria-label="Keystone Home">
            <LogoFilled size={28} />
            <span className="text-base font-semibold tracking-wide text-white group-hover:text-[#36e27b] transition-colors">
              Keystone
            </span>
          </a>

          {/* Desktop Nav */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/80 hover:text-white hover:bg-white/[0.06]"
            >
              <a href="/atlas">Try Atlas</a>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-[#36e27b] text-[#0B0C10] hover:bg-[#36e27b]/90 font-semibold shadow-[0_0_20px_rgba(54,226,123,0.25)]"
            >
              <a href="/app">Open App</a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/[0.06]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0B0C10]/95 backdrop-blur-xl border-t border-white/[0.06]"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Button variant="ghost" size="sm" asChild className="justify-center text-white/80">
                  <a href="/atlas">Try Atlas</a>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="justify-center bg-[#36e27b] text-[#0B0C10] hover:bg-[#36e27b]/90 font-semibold"
                >
                  <a href="/app">Open App</a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
