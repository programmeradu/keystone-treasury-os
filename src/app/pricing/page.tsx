import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/home/site-header";
import { SiteFooter } from "@/components/home/site-footer";
import { CheckCircle2, Cpu, Shield, User } from "lucide-react";

export const metadata: Metadata = {
    title: "Pricing",
    description:
        "Dreyv plans — Free, Mini, and Max. Subscribe via FastSpring; taxes calculated at checkout where applicable.",
    alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
    return (
        <div className="relative min-h-dvh w-full bg-[var(--keystone-void)] text-white scroll-smooth">
            <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] h-[700px] w-[700px] rounded-full bg-keystone-green/[0.07] blur-[150px]" />
                <div className="absolute top-[20%] right-[-5%] h-[600px] w-[600px] rounded-full bg-aurora-violet/[0.05] blur-[130px]" />
                <div className="absolute inset-0 noise-overlay opacity-[0.018]" />
            </div>

            <SiteHeader />

            <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
                        Dreyv // Pricing
                    </p>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
                        Plans for every squad
                    </h1>
                    <p className="text-sm text-white/50 leading-relaxed">
                        All paid plans are billed securely through{" "}
                        <span className="text-white/70">FastSpring</span> (merchant of record). Checkout displays your
                        total including applicable taxes.{" "}
                        <Link href="/legal/refunds" className="text-keystone-green hover:underline">
                            Refund policy
                        </Link>
                        .
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 border border-keystone-green/30 bg-keystone-green/10 flex items-center justify-center rounded-lg">
                                <User className="text-keystone-green" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Base</h2>
                                <p className="text-[10px] uppercase text-white/40">Free forever</p>
                            </div>
                        </div>
                        <div className="text-3xl font-black mb-6">
                            $0<span className="text-xs text-white/40 ml-1 font-bold">/mo</span>
                        </div>
                        <ul className="space-y-3 flex-1 mb-8 text-xs font-bold uppercase text-white/50">
                            {[
                                "1 Multisig vault",
                                "Up to 3 team members",
                                "Basic command prompts",
                                "Standard security routing",
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-keystone-green shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/auth?redirect=/app"
                            className="block text-center w-full py-2.5 rounded-xl border border-white/15 text-[10px] font-black uppercase text-white/70 hover:bg-white/5 transition-colors"
                        >
                            Get started
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-6 flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.12)]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 border border-amber-500/30 bg-amber-500/10 flex items-center justify-center rounded-lg">
                                <Shield className="text-amber-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Mini</h2>
                                <p className="text-[10px] uppercase text-amber-200/60">Growing squads</p>
                            </div>
                        </div>
                        <div className="text-3xl font-black mb-1">
                            $49<span className="text-xs text-white/40 ml-1 font-bold">/mo</span>
                        </div>
                        <p className="text-[10px] text-white/45 uppercase font-bold mb-6">Excludes tax · shown at checkout</p>
                        <ul className="space-y-3 flex-1 mb-8 text-xs font-bold uppercase text-white/60">
                            {[
                                "Up to 5 multisig vaults",
                                "10 team members / vault",
                                "Advanced DCA & AI",
                                "Custom webhooks",
                                "Priority finality",
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/auth?redirect=/app/billing"
                            className="block text-center w-full py-2.5 rounded-xl bg-amber-500 text-amber-950 text-[10px] font-black uppercase hover:bg-amber-400 transition-colors"
                        >
                            Upgrade — sign in
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-sky-500/40 bg-sky-500/[0.06] p-6 flex flex-col shadow-[0_0_30px_rgba(14,165,233,0.12)]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 border border-sky-500/30 bg-sky-500/10 flex items-center justify-center rounded-lg">
                                <Cpu className="text-sky-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Max</h2>
                                <p className="text-[10px] uppercase text-sky-200/60">Enterprise nexus</p>
                            </div>
                        </div>
                        <div className="text-3xl font-black mb-1">
                            $199<span className="text-xs text-white/40 ml-1 font-bold">/mo</span>
                        </div>
                        <p className="text-[10px] text-white/45 uppercase font-bold mb-6">Excludes tax · shown at checkout</p>
                        <ul className="space-y-3 flex-1 mb-8 text-xs font-bold uppercase text-white/60">
                            {[
                                "Unlimited vaults",
                                "Unlimited team",
                                "Dedicated compute",
                                "Whiteglove integration",
                                "Dedicated RPCs",
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/auth?redirect=/app/billing"
                            className="block text-center w-full py-2.5 rounded-xl bg-sky-500 text-sky-950 text-[10px] font-black uppercase hover:bg-sky-400 transition-colors"
                        >
                            Upgrade — sign in
                        </Link>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
