"use client";

import { SiteHeader } from "./site-header";
import { HeroSection } from "./hero-section";
import { ProblemSection } from "./problem-section";
import { PillarsSection } from "./pillars-section";
import { DemoSection } from "./demo-section";
import { DeepDiveSection } from "./deep-dive-section";
import { AtlasSection } from "./atlas-section";
import { HowItWorksSection } from "./how-it-works-section";
import { EcosystemSection } from "./ecosystem-section";
import { UseCasesSection } from "./use-cases-section";
import { CTASection } from "./cta-section";
import { SiteFooter } from "./site-footer";

export const HomeClient = () => {
  return (
    <div className="relative min-h-dvh w-full bg-[#0B0C10] text-white scroll-smooth motion-reduce:scroll-auto">
      {/* Skip to content for accessibility */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only fixed left-3 top-3 z-[100] rounded-md bg-[#0B0C10] px-3 py-1 text-sm shadow border border-white/10 text-white"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main role="main">
        <HeroSection />
        <ProblemSection />
        <PillarsSection />
        <DemoSection />
        <DeepDiveSection />
        <AtlasSection />
        <HowItWorksSection />
        <EcosystemSection />
        <UseCasesSection />
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
};
