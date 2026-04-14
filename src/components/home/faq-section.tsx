"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { HOME_FAQ_ITEMS } from "@/lib/seo/home-faq";

export function FaqSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="faq"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="faq-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-dreyv-green/40 mb-5">
            FAQ
          </p>
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">
            Questions treasury teams ask
          </h2>
          <p className="mt-4 text-white/30 text-sm md:text-base leading-relaxed">
            Straight answers about custody, multisig, chains, and how simulation fits into signing.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3">
          {HOME_FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 * i }}
            >
              <details className="group rounded-xl border border-white/[0.06] bg-white/[0.02] open:bg-white/[0.03] open:border-dreyv-green/20">
                <summary className="cursor-pointer list-none px-5 py-4 text-left text-sm font-medium text-white/90 flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span className="text-dreyv-green/60 text-lg leading-none shrink-0 group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-white/40 leading-relaxed border-t border-white/[0.04] pt-3">
                  {item.answer}
                </div>
              </details>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
