"use client";

import { LogoFilled } from "@/components/icons";
import { FaDiscord, FaGithub, FaTwitter } from "react-icons/fa6";

const productLinks = [
  { label: "Pricing", href: "/pricing" },
  {
    label: "Guide: Command-Ops",
    href: "/guides/command-ops-for-web3-treasuries",
  },
  { label: "App Dashboard", href: "/app" },
  { label: "Treasury Hub", href: "/app/treasury" },
  { label: "Keystone Studio", href: "/app/studio" },
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
  { label: "About", href: "#content" },
  { label: "Documentation", href: "#deep-dive" },
  { label: "Contact", href: "#contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Refunds", href: "/legal/refunds" },
  { label: "Cookie Policy", href: "/legal/cookies" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="#content" className="flex items-center gap-2 mb-4">
              <LogoFilled size={22} />
              <span className="text-sm font-semibold text-white">Keystone</span>
            </a>
            <p className="text-xs text-white/30 leading-relaxed max-w-xs">
              The Sovereign OS for digital assets. Command your treasury with
              natural language. Built on Solana.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
              Free Tools
            </h4>
            <ul className="space-y-2.5">
              {toolLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Keystone. All rights reserved.
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/Keystone_OS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-keystone-green transition-colors"
            >
              <FaTwitter size={14} />
            </a>
            <a
              href="https://discord.gg/keystone"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-keystone-green transition-colors"
            >
              <FaDiscord size={14} />
            </a>
            <a
              href="https://github.com/keystone-org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-keystone-green transition-colors"
            >
              <FaGithub size={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
