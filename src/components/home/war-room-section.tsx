"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { getAvatarUrl } from "@/lib/avatars";
import { Sparkles } from "@/components/icons";

/* ── Config ── */
const PHASE_DURATIONS = [3000, 5000, 3000, 5500, 3500];
const TOTAL_PHASES = 5;

/** Canonical USDC (Solana) icon — same source as in-app token metadata. */
const USDC_LOGO =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png";

/** Squads Protocol (multisig) — GitHub org avatar; destination row only, not signer avatars. */
const SQUADS_LOGO = "https://github.com/Squads-Protocol.png?size=128";

const signers = [
  { name: "Alex", role: "Admin", color: "#7c3aed" },
  { name: "Sarah", role: "Signer", color: "#60a5fa" },
  { name: "Mike", role: "Auditor", color: "#a78bfa" },
];

const commandText = "Transfer 150,000 USDC to 12 contributor wallets";

export function WarRoomSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [phase, setPhase] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [signedCount, setSignedCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timeout = setTimeout(() => {
      setPhase((p) => (p + 1) % TOTAL_PHASES);
    }, PHASE_DURATIONS[phase]);
    return () => clearTimeout(timeout);
  }, [inView, phase]);

  useEffect(() => {
    setTypedChars(0);
    setSignedCount(0);
  }, [phase]);

  useEffect(() => {
    if (phase !== 1) return;
    if (typedChars >= commandText.length) return;
    const timeout = setTimeout(() => setTypedChars((c) => c + 1), 55);
    return () => clearTimeout(timeout);
  }, [phase, typedChars]);

  useEffect(() => {
    if (phase !== 3) return;
    if (signedCount >= signers.length) return;
    const timeout = setTimeout(() => setSignedCount((c) => c + 1), 1000);
    return () => clearTimeout(timeout);
  }, [phase, signedCount]);

  return (
    <section
      id="war-room"
      className="relative border-t border-violet-200/35 scroll-mt-24 overflow-hidden"
      aria-labelledby="war-room-heading"
      ref={ref}
    >
      <div className="absolute inset-0 grid-pattern-marketing opacity-[0.22] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-violet-600 mb-6">
              Multiplayer Finance
            </p>
            <h2
              id="war-room-heading"
              className="text-3xl md:text-5xl font-bold text-slate-900 tracking-[-0.02em] leading-[1.1]"
            >
              No more blind signing.{" "}
              <span className="text-slate-400">Collaborate in real-time.</span>
            </h2>
            <p className="mt-6 text-base text-slate-500 leading-relaxed max-w-lg">
              dreyv brings your entire team into a shared context.
              Discuss, simulate, and approve together — Figma for finance.
            </p>

          </motion.div>

          {/* Cinematic Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            {/* Glow behind card */}
            <motion.div
              className="absolute -inset-4 rounded-3xl blur-[60px] pointer-events-none"
              animate={{
                backgroundColor:
                  phase === 4
                    ? "rgba(124, 58, 237, 0.12)"
                    : phase === 2
                    ? "rgba(124, 58, 237, 0.08)"
                    : "rgba(124, 58, 237, 0.04)",
              }}
              transition={{ duration: 1 }}
            />

            <div className="relative z-10 rounded-2xl border border-violet-200/45 bg-white/92 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(124,58,237,0.18)] overflow-hidden">

              {/* Card header — always visible */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-violet-200/35 bg-violet-50/30">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Emergency Payroll</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">#TXN-0847</div>
                </div>
                {/* Live presence dots — appear one by one in phase 0+ */}
                <div className="flex -space-x-2">
                  {signers.map((u, i) => (
                    <motion.div
                      key={u.name}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={phase >= 0 ? { scale: 1, opacity: 1 } : {}}
                      transition={{ delay: 0.3 + i * 0.3, type: "spring", stiffness: 300 }}
                      className="h-7 w-7 rounded-full border-2 border-white shadow-sm ring-1 ring-violet-200/50 overflow-hidden"
                    >
                      <img src={getAvatarUrl(u.name)} alt={u.name} className="h-full w-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-5 min-h-[340px] relative">
                <AnimatePresence>
                  {/* ── PHASE 0: CommandBar pill ── */}
                  {phase === 0 && (
                    <motion.div
                      key="p0"
                      className="absolute inset-0 flex items-center justify-center px-5"
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className="flex items-center gap-3 pl-4 pr-3 py-3 rounded-full bg-white/75 backdrop-blur-xl border border-violet-200/50 shadow-2xl"
                        animate={{
                          borderColor: ["rgba(196,181,253,0.55)", "rgba(124,58,237,0.45)", "rgba(196,181,253,0.55)"],
                          boxShadow: [
                            "0 4px 24px rgba(124,58,237,0.08)",
                            "0 4px 28px rgba(124,58,237,0.14), 0 0 24px rgba(167,139,250,0.1)",
                            "0 4px 24px rgba(124,58,237,0.08)",
                          ],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <motion.div
                          layoutId="star"
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Sparkles size={16} className="text-violet-600" />
                        </motion.div>
                        <span className="text-sm font-medium text-slate-500 mr-2">Ask dreyv...</span>
                        <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-slate-500 border-l border-violet-200/50 pl-3">
                          <span>⌘</span> K
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* ── PHASE 1: Expanded CommandBar with typewriter ── */}
                  {phase === 1 && (
                    <motion.div
                      key="p1"
                      className="absolute inset-0 px-5 py-5 flex flex-col"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="rounded-xl border border-violet-200/50 bg-white/70 backdrop-blur-xl overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-violet-200/35 bg-violet-50/25">
                          <motion.div layoutId="star">
                            <Sparkles size={16} className="text-violet-600" />
                          </motion.div>
                          <span className="text-sm text-slate-500">Ask dreyv</span>
                          <span className="ml-auto text-[9px] font-mono text-slate-400">ESC to close</span>
                        </div>

                        <div className="px-4 py-4">
                          <div className="text-sm text-slate-600 font-mono leading-relaxed">
                            {commandText.slice(0, typedChars)}
                            <span className="inline-block h-4 w-[2px] bg-violet-500 ml-0.5 align-middle animate-terminal-blink" />
                          </div>
                        </div>

                        {typedChars > 20 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-violet-200/35 overflow-hidden"
                          >
                            <div className="px-4 py-3 space-y-2">
                              <div className="text-[9px] text-slate-400 uppercase tracking-wider font-mono mb-2">Parsed Intent</div>
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-400">Action</span>
                                <span className="text-slate-500">Bulk Transfer</span>
                              </div>
                              {typedChars > 28 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center text-xs font-mono">
                                  <span className="text-slate-400">Amount</span>
                                  <div className="flex items-center gap-1.5">
                                    <img
                                      src={USDC_LOGO}
                                      alt=""
                                      className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-violet-200/50"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                    <span className="text-slate-500">150,000 USDC</span>
                                  </div>
                                </motion.div>
                              )}
                              {typedChars > 38 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between text-xs font-mono">
                                  <span className="text-slate-400">Recipients</span>
                                  <span className="text-slate-500">12 Wallets</span>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ── PHASE 2: Centered spinning star (loading) ── */}
                  {phase === 2 && (
                    <motion.div
                      key="p2"
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="relative flex items-center justify-center">
                        <motion.div
                          className="absolute rounded-full border border-violet-200/45"
                          style={{ width: 80, height: 80 }}
                          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                          className="absolute rounded-full border border-violet-400/20"
                          style={{ width: 80, height: 80 }}
                          animate={{ scale: [1, 2.2, 1], opacity: [0.15, 0, 0.15] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        />
                        <motion.div layoutId="star">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles size={36} className="text-violet-600 drop-shadow-[0_0_20px_rgba(124,58,237,0.35)]" />
                          </motion.div>
                        </motion.div>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-xs font-mono text-slate-400 tracking-wider uppercase mt-8"
                      >
                        Foresight simulating...
                      </motion.div>
                    </motion.div>
                  )}

                  {/* ── PHASE 3: Uniswap-style results + cursors ── */}
                  {phase === 3 && (
                    <motion.div
                      key="p3"
                      className="absolute inset-0 px-4 py-3 flex flex-col overflow-hidden"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                    >
                      <div className="rounded-xl border border-violet-200/45 bg-gradient-to-b from-violet-50/70 to-white/80 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200/35 bg-white/60">
                          <div className="flex items-center gap-2">
                            <Sparkles size={13} className="text-violet-600" />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-700 font-semibold">Transaction Preview</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">#TXN-0847</span>
                        </div>

                        <div className="px-4 pt-3 pb-2">
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Sending</div>
                          <div className="flex items-center justify-between rounded-lg bg-white/90 border border-violet-200/40 px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={USDC_LOGO}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover shadow-lg ring-1 ring-violet-200/40"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div>
                                <div className="text-slate-900 font-semibold text-sm">150,000</div>
                                <div className="text-[9px] text-slate-500 font-mono">USDC</div>
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">~$150,000</div>
                          </div>
                        </div>

                        <div className="flex justify-center py-0.5">
                          <div className="h-5 w-5 rounded-full bg-white/75 border border-violet-200/40 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                        </div>

                        <div className="px-4 pt-0.5 pb-2.5">
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">To</div>
                          <div className="flex items-center justify-between rounded-lg bg-white/90 border border-violet-200/40 px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={SQUADS_LOGO}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover ring-1 ring-violet-200/40 bg-white"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div>
                                <div className="text-slate-600 font-semibold text-sm">12 Wallets</div>
                                <div className="text-[9px] text-slate-400 font-mono">Contributor Payroll</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-4 py-2 border-t border-violet-200/35 text-[9px] font-mono text-slate-400">
                          <span>Gas ~$0.12</span>
                          <span className="text-violet-600/90">Foresight 5/5 </span>
                        </div>
                      </div>

                      {/* Approval rows + cursors */}
                      <div className="mt-2 space-y-1.5 relative flex-1">
                        {signers.map((u, i) => {
                          const hasSigned = i < signedCount;
                          return (
                            <motion.div
                              key={u.name}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.1 }}
                              className="flex items-center gap-2.5 rounded-lg bg-violet-50/70 border border-violet-200/40 px-3 py-2"
                            >
                              <div className="h-6 w-6 rounded-full shrink-0 overflow-hidden" style={{ border: hasSigned ? `2px solid ${u.color}` : "2px solid transparent" }}>
                                <img src={getAvatarUrl(u.name)} alt={u.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] text-slate-500 font-medium">{u.name}</span>
                                <span className="text-[8px] font-mono text-slate-400 ml-1">{u.role}</span>
                              </div>
                              <AnimatePresence mode="wait">
                                {hasSigned ? (
                                  <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }} className="px-2.5 py-1 rounded-md bg-violet-100 border border-violet-300/55 text-[9px] font-bold text-violet-600">
                                     Approved
                                  </motion.div>
                                ) : (
                                  <motion.div key="btn" className="px-2.5 py-1 rounded-md bg-violet-600 text-white text-[9px] font-bold" animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 2, repeat: Infinity }}>
                                    Approve
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}

                        {signers.map((u, i) => {
                          const hasSigned = i < signedCount;
                          const targetY = 4 + i * 38;
                          return (
                            <motion.div
                              key={`cursor-${u.name}`}
                              className="absolute z-20 pointer-events-none"
                              initial={{ right: -50, top: targetY, opacity: 0 }}
                              animate={
                                !hasSigned && i <= signedCount
                                  ? { right: 6, top: targetY, opacity: 1 }
                                  : hasSigned
                                  ? { right: 6, top: targetY, opacity: 0 }
                                  : { right: -50, top: targetY, opacity: 0 }
                              }
                              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                            >
                              <CursorSVG color={u.color} />
                              <div className="ml-3 -mt-1 px-1.5 py-0.5 rounded-full text-[7px] font-bold text-slate-900 shadow-lg whitespace-nowrap" style={{ backgroundColor: u.color }}>
                                {u.name}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      <div className="mt-1.5 h-0.5 rounded-full bg-white/75 overflow-hidden">
                        <motion.div className="h-full bg-violet-500 rounded-full" animate={{ width: `${(signedCount / 3) * 100}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    </motion.div>
                  )}

                  {/* ── PHASE 4: Confirmed ── */}
                  {phase === 4 && (
                    <motion.div
                      key="p4"
                      className="absolute inset-0 flex flex-col items-center justify-center text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, type: "spring" }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        className="h-16 w-16 rounded-full bg-violet-100 border-2 border-violet-400/45 flex items-center justify-center mb-5"
                      >
                        <motion.svg
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="w-8 h-8 text-violet-600"
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </motion.svg>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div className="text-lg font-bold text-slate-900 mb-1">Transaction Executed</div>
                        <div className="text-xs text-slate-500 font-mono">150,000 USDC → 12 wallets · 3/3 signatures</div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-5 flex items-center gap-4 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 text-violet-600/90">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                          Confirmed
                        </div>
                        <span className="text-slate-400">Block #247,891,024</span>
                        <span className="text-slate-400">0.8s finality</span>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-5 grid grid-cols-3 gap-6 text-[10px] font-mono">
                        {signers.map((u) => (
                          <div key={u.name} className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded-full overflow-hidden">
                              <img src={getAvatarUrl(u.name)} alt={u.name} className="h-full w-full object-cover" />
                            </div>
                            <span className="text-slate-600 text-[10px]">{u.name}</span>
                          </div>
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const CursorSVG = ({ color }: { color: string }) => (
  <svg
    width="18"
    height="24"
    viewBox="0 0 24 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-lg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.65376 12.3755H5.46026L5.31717 12.5076L0.500002 16.9516L0.500002 0.500002L12.5039 12.5039H5.65376V12.3755Z"
      fill={color}
    />
  </svg>
);
