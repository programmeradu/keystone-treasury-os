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
import { WarRoomSection } from "./war-room-section";
import { TrustSection } from "./trust-section";
import { CTASection } from "./cta-section";
import { SiteFooter } from "./site-footer";

export const HomeClient = () => {
  return (
    <div className="relative min-h-dvh w-full bg-[var(--keystone-void)] text-white scroll-smooth motion-reduce:scroll-auto">
      {/* Shared ambient gradient mesh - covers header + hero seamlessly */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] h-[700px] w-[700px] rounded-full bg-keystone-green/[0.07] blur-[150px] animate-drift-slow" />
        <div className="absolute top-[20%] right-[-5%] h-[600px] w-[600px] rounded-full bg-aurora-violet/[0.05] blur-[130px] animate-drift-reverse" />
        <div className="absolute top-[40%] left-[50%] h-[400px] w-[400px] rounded-full bg-cyan-500/[0.03] blur-[100px] animate-drift-diagonal" />
        <div className="absolute inset-0 noise-overlay opacity-[0.018]" />
        <div className="absolute inset-0 grid-pattern opacity-40" />
      </div>

      {/* Skip to content for accessibility */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only fixed left-3 top-3 z-[100] rounded-md bg-[var(--keystone-void)] px-3 py-1 text-sm shadow border border-white/10 text-white"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main role="main">
        <HeroSection />
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
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
};
