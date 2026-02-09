"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass } from "lucide-react";
import { LogoFilled } from "@/components/icons";

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="contact"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#36e27b]/[0.04] rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative text-center max-w-3xl mx-auto"
        >
          <LogoFilled size={40} className="mx-auto mb-6 opacity-60" />

          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Ready to command{" "}
            <span className="bg-gradient-to-r from-[#36e27b] to-[#36e27b]/60 bg-clip-text text-transparent">
              your treasury?
            </span>
          </h2>

          <p className="mt-5 text-white/50 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Join treasury teams building on Keystone. Open the app to explore or request
            enterprise access for your organization.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="bg-[#36e27b] text-[#0B0C10] hover:bg-[#36e27b]/90 font-semibold shadow-[0_0_30px_rgba(54,226,123,0.25)] hover:shadow-[0_0_40px_rgba(54,226,123,0.35)] transition-all"
            >
              <a href="/app" className="inline-flex items-center gap-2">
                Open App <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] hover:border-white/20"
            >
              <a href="/atlas" className="inline-flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Explore Atlas
              </a>
            </Button>
          </div>

          <p className="mt-6 text-xs text-white/25">
            Non-custodial. Simulation-first. Your keys, your control.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
