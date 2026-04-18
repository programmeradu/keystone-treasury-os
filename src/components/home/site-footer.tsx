"use client";

import { DreyvLogoLight } from "@/components/brand/dreyv-logo-light";
import { FaDiscord, FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa6";
import { marketingSectionDivider } from "./marketing-styles";

const productLinks = [
  { label: "Pricing", href: "/pricing" },
  {
    label: "Guide: Intent-driven treasury",
    href: "/guides/intent-driven-treasury-solana",
  },
  { label: "Get started (free)", href: "/auth?redirect=/app" },
  { label: "App dashboard", href: "/app" },
  { label: "Treasury Hub", href: "/app/treasury" },
  { label: "dreyv Studio", href: "/app/studio" },
  { label: "Marketplace", href: "/app/marketplace" },
  { label: "Analytics", href: "/app/analytics" },
];

const toolLinks = [
  { label: "Solana Atlas", href: "/atlas" },
  { label: "Strategy Lab", href: "/atlas" },
  { label: "Airdrop Scout", href: "/atlas" },
  { label: "MEV Scanner", href: "/atlas" },
];

const companyLinks = [
  { label: "About", href: "/#content" },
  { label: "Documentation", href: "/#deep-dive" },
  { label: "Contact", href: "/#contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Refunds", href: "/legal/refunds" },
  { label: "Cookie Policy", href: "/legal/cookies" },
];

export function SiteFooter() {
  return (
    <footer className={`${marketingSectionDivider} bg-marketing-bg-low/80 backdrop-blur-sm font-inter-label`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-1">
            <a
              href="/#content"
              className="flex items-center overflow-visible mb-4 w-full max-w-[372px] rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/40"
              aria-label="dreyv home"
            >
              <DreyvLogoLight variant="footer" className="hover:opacity-90 transition-opacity" />
            </a>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Treasury command layer for Solana teams — intent, simulation, readable impact, then multisig sign.
              Non-custodial. StaUniverse.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-600 hover:text-violet-700 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Free Tools
            </h4>
            <ul className="space-y-2.5">
              {toolLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-600 hover:text-violet-700 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-600 hover:text-violet-700 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-600 hover:text-violet-700 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={`mt-12 pt-6 ${marketingSectionDivider} flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} dreyv. All rights reserved.
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div
              className="rounded-xl border border-violet-200/50 bg-gradient-to-b from-white/85 to-violet-50/40 p-2 shadow-[0_2px_14px_-4px_rgba(91,33,182,0.18)] backdrop-blur-sm ring-1 ring-violet-100/40 dark:border-violet-500/20 dark:from-slate-900/80 dark:to-violet-950/30 dark:ring-violet-500/10"
            >
              <a
                href="https://www.producthunt.com/products/dreyv?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-dreyv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 rounded-lg transition-[opacity,transform] hover:opacity-95 active:scale-[0.99]"
                aria-label="dreyv on Product Hunt — featured badge"
              >
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1126334&theme=dark&t=1776453903138"
                  alt="dreyv - Manage your web3 treasury like you are texting your friend. | Product Hunt"
                  width={250}
                  height={54}
                  className="h-auto w-[250px] max-w-full rounded-md"
                />
              </a>
            </div>

            <a target="_blank" href="https://thankjohn.com"><img src="https://thankjohn.com/badge.png" alt="THANK JOHN AI Tools" height="54" /></a>

          <div className="flex items-center gap-4">
            <a
              href="https://x.com/dreyvapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="dreyv on X"
              className="text-slate-400 hover:text-violet-600 transition-colors"
            >
              <FaTwitter size={14} />
            </a>
            <a
              href="https://www.linkedin.com/company/dreyv/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="dreyv on LinkedIn"
              className="text-slate-400 hover:text-violet-600 transition-colors"
            >
              <FaLinkedin size={14} />
            </a>
            <a
              href="https://discord.gg/keystone"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="dreyv Discord"
              className="text-slate-400 hover:text-violet-600 transition-colors"
            >
              <FaDiscord size={14} />
            </a>
            <a
              href="https://github.com/keystone-org"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="dreyv on GitHub"
              className="text-slate-400 hover:text-violet-600 transition-colors"
            >
              <FaGithub size={14} />
            </a>
          </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
