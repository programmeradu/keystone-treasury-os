"use client";

import { SiteHeader } from "./site-header";
import { HeroSection } from "./hero-section";
import { WhatIsDreyvSection } from "./what-is-dreyv-section";
import { ProblemSection } from "./problem-section";
import { PillarsSection } from "./pillars-section";
import { DemoSection } from "./demo-section";
import { DeepDiveSection } from "./deep-dive-section";
import { AtlasSection } from "./atlas-section";
import { HowItWorksSection } from "./how-it-works-section";
import { EcosystemSection } from "./ecosystem-section";
import { UseCasesSection } from "./use-cases-section";
import { WarRoomSection } from "./war-room-section";
import { TrustSection } from "./trust-section";
import { FaqSection } from "./faq-section";
import { CTASection } from "./cta-section";
import { SiteFooter } from "./site-footer";

export const HomeClient = () => {
  return (
    <div className="dreyv-marketing-root relative min-h-dvh w-full scroll-smooth motion-reduce:scroll-auto font-manrope">
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-14%] left-[-12%] h-[640px] w-[640px] rounded-full bg-violet-400/[0.11] blur-[130px] animate-drift-slow" />
        <div className="absolute top-[22%] right-[-8%] h-[520px] w-[520px] rounded-full bg-fuchsia-400/[0.09] blur-[120px] animate-drift-reverse" />
        <div className="absolute top-[48%] left-[42%] h-[380px] w-[380px] rounded-full bg-violet-300/[0.07] blur-[100px] animate-drift-diagonal" />
        <div className="absolute inset-0 noise-overlay opacity-[0.028]" />
        <div className="absolute inset-0 grid-pattern-marketing opacity-[0.65]" />
      </div>

      <a
        href="#content"
        className="sr-only focus:not-sr-only fixed left-3 top-3 z-[100] rounded-xl bg-white px-3 py-2 text-sm marketing-shadow-float border border-violet-200/40 text-marketing-fg"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main role="main">
        <HeroSection />
        <WhatIsDreyvSection />
        <ProblemSection />
        <PillarsSection />
        <DemoSection />
        <EcosystemSection />
        <DeepDiveSection />
        <AtlasSection />
        <HowItWorksSection />
        <UseCasesSection />
        <WarRoomSection />
        <TrustSection />
        <FaqSection />
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
};
