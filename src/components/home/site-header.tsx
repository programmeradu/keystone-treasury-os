"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogoFilled } from "@/components/icons";
import { Menu, X, ArrowRight } from "lucide-react";

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
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/#content" className="flex items-center gap-2.5 group" aria-label="dreyv home">
            <LogoFilled size={28} />
            <span className="text-base font-semibold tracking-wide text-white group-hover:text-dreyv-green transition-colors">
              dreyv
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
            <a
              href="/auth?redirect=/app"
              className="group relative inline-flex items-center gap-2 font-semibold text-xs px-4 py-2 rounded-lg overflow-hidden transition-all duration-300"
            >
              {/* Metallic keystone-green gradient background */}
              <span className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent" />
              <span className="absolute inset-0 bg-gradient-to-br from-[#5aff9d] via-[#36e27b] to-[#1a9c4e]" />
              {/* Shine highlight */}
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              {/* Inner shadow for depth */}
              <span className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(0,0,0,0.3)]" />
              {/* Border */}
              <span className="absolute inset-0 rounded-lg border border-white/20" />
              {/* Content */}
              <span className="relative text-black font-semibold tracking-wide">Get started</span>
              <ArrowRight className="relative h-3 w-3 text-black/70 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-black" />
            </a>
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
            className="md:hidden bg-dreyv-void/95 backdrop-blur-xl border-t border-white/[0.06]"
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
                <a
                  href="/auth?redirect=/app"
                  className="group relative inline-flex items-center justify-center gap-2 font-semibold text-xs px-4 py-2.5 rounded-lg overflow-hidden transition-all duration-300"
                >
                  {/* Metallic keystone-green gradient background */}
                  <span className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent" />
                  <span className="absolute inset-0 bg-gradient-to-br from-[#5aff9d] via-[#36e27b] to-[#1a9c4e]" />
                  {/* Shine highlight */}
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  {/* Inner shadow for depth */}
                  <span className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(0,0,0,0.3)]" />
                  {/* Border */}
                  <span className="absolute inset-0 rounded-lg border border-white/20" />
                  {/* Content */}
                  <span className="relative text-black font-semibold tracking-wide">Get started</span>
                  <ArrowRight className="relative h-3 w-3 text-black/70 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-black" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
