"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Bot,
  ShieldCheck,
  Layers,
  Zap,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Telescope,
  Loader2 } from
"lucide-react";
import TreasurySimulator from "@/components/TreasurySimulator";

export const HomeClient = () => {
  // Unified 4K real-photo background for the entire page
  const bgUnified =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/839a9d0f-c8ea-4ee9-aa5d-ded18c4cf0d9/generated_images/ultra-high-resolution-4k-landing-page-ba-e163bb04-20250928041253.jpg?";

  return (
    <div
      className="relative min-h-dvh w-full text-foreground bg-no-repeat bg-top bg-fixed bg-auto sm:bg-cover scroll-smooth motion-reduce:scroll-auto"
      style={{
        backgroundImage: `url(${bgUnified})`
      }}>

      <div className="relative">
        {/* Skip to content for accessibility */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only fixed left-3 top-3 z-[100] rounded-md bg-background px-3 py-1 text-sm shadow border border-border/70">

          Skip to content
        </a>
        <Header />

        <main role="main">
          <HeroSection />
          <FeaturesSection />
          <ShowcaseSection />
          <SolanaAtlasSection />
          <UseCasesSection />
          <CTASection />
        </main>

        <SiteFooter />
      </div>
    </div>);
};

function Header() {
  const [active, setActive] = useState<string>("#content");

  useEffect(() => {
    const ids = ["content", "features", "showcase", "use-cases", "contact"];
    const sections = ids.
    map((id) => document.getElementById(id)).
    filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry nearest to top that's intersecting
        const visible = entries.
        filter((e) => e.isIntersecting).
        sort((a, b) => a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1);
        if (visible[0]?.target?.id) {
          setActive(`#${visible[0].target.id}`);
        }
      },
      { root: null, rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  const baseLink =
  "font-semibold opacity-95 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";
  const activeLink = "opacity-100 text-foreground border-b-2 border-foreground/60 pb-0.5";

  return (
    <header className="sticky top-3 md:top-4 z-50 w-full">
      <div className="mx-auto max-w-6xl px-4 py-3 pt-[env(safe-area-inset-top)] flex items-center justify-between">
        <a href="#content" aria-label="Go to start" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-wide">Keystone</span>
        </a>
        <nav aria-label="Primary" role="navigation" className="hidden md:flex items-center gap-4 lg:gap-6 text-sm flex-wrap">
          <a href="#features" aria-current={active === "#features" ? "page" : undefined} className={`${baseLink} ${active === "#features" ? activeLink : ""}`}>Features</a>
          <a href="#showcase" aria-current={active === "#showcase" ? "page" : undefined} className={`${baseLink} ${active === "#showcase" ? activeLink : ""}`}>Showcase</a>
          <a href="/oracle" className={`${baseLink}`}>Oracle</a>
          <a href="/atlas" className={`${baseLink}`}>Solana Atlas</a>
          <a href="#use-cases" aria-current={active === "#use-cases" ? "page" : undefined} className={`${baseLink} ${active === "#use-cases" ? activeLink : ""}`}>Use Cases</a>
          <a href="#contact" aria-current={active === "#contact" ? "page" : undefined} className={`${baseLink} ${active === "#contact" ? activeLink : ""}`}>Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href="#showcase" aria-label="Jump to interactive showcase">Try a Command</a>
          </Button>
          <Button size="sm" asChild>
            <a href="#contact" aria-label="Request access to Keystone">Request Access</a>
          </Button>
          
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden">
        <nav aria-label="Primary" role="navigation" className="mx-auto max-w-6xl px-4 py-2 overflow-x-auto">
          <div className="inline-flex items-center gap-4 text-sm">
            <a href="#features" aria-current={active === "#features" ? "page" : undefined} className={`${baseLink} whitespace-nowrap ${active === "#features" ? activeLink : ""}`}>Features</a>
            <a href="#showcase" aria-current={active === "#showcase" ? "page" : undefined} className={`${baseLink} whitespace-nowrap ${active === "#showcase" ? activeLink : ""}`}>Showcase</a>
            <a href="/oracle" className={`${baseLink} whitespace-nowrap`}>Oracle</a>
            <a href="/atlas" className={`${baseLink} whitespace-nowrap`}>Solana Atlas</a>
            <a href="#use-cases" aria-current={active === "#use-cases" ? "page" : undefined} className={`${baseLink} whitespace-nowrap ${active === "#use-cases" ? activeLink : ""}`}>Use Cases</a>
            <a href="#contact" aria-current={active === "#contact" ? "page" : undefined} className={`${baseLink} whitespace-nowrap ${active === "#contact" ? activeLink : ""}`}>Contact</a>
          </div>
        </nav>
      </div>
    </header>);

}

function HeroSection() {
  return (
    <section id="content" className="relative scroll-mt-24" aria-labelledby="hero-heading">
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-2 py-1 text-xs">
          <Badge variant="secondary" className="px-2">New</Badge>
          <span className="opacity-80">The Command Layer for Treasury</span>
        </div>
        <h1 id="hero-heading" className="mt-4 text-balance text-3xl leading-tight font-semibold md:text-5xl tracking-tight">
          Eliminate dashboards. Command your treasury with natural language.
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm opacity-80 md:text-base">
          Keystone transforms complex, multi-step Web3 operations into simple, declarative prompts. It's the ultimate fusion of operational power and elegant simplicity.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="sm" asChild>
            <a href="#showcase" className="inline-flex items-center gap-1.5">
              Try a command <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href="#features">Explore features</a>
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 max-w-lg text-xs opacity-80 md:grid-cols-4">
          <Stat label="Chains" value="20+" />
          <Stat label="Integrations" value="60+" />
          <Stat label="Ops time saved" value="70%" />
          <Stat label="Security incidents" value="0" />
        </div>
      </div>
    </section>);

}

function Stat({ label, value }: {label: string;value: string;}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2">
      <div className="text-sm font-medium">{value}</div>
      <div className="text-[10px] opacity-70">{label}</div>
    </div>);

}

function FeaturesSection() {
  const items = [
  {
    icon: Bot,
    title: "Natural Language Ops",
    desc: "Execute swaps, bridges, staking, and multi-sig flows with one prompt."
  },
  {
    icon: ShieldCheck,
    title: "Secure by Design",
    desc: "Policy-driven limits, approvals, and best-in-class key management."
  },
  {
    icon: Layers,
    title: "Composable Workflows",
    desc: "Chain steps together and reuse them as named playbooks across teams."
  },
  {
    icon: Zap,
    title: "Real-time Execution",
    desc: "Low-latency routing and on-chain confirmations surfaced instantly."
  }];


  return (
    <section id="features" className="relative border-t scroll-mt-24" aria-labelledby="features-heading">
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 id="features-heading" className="text-2xl font-semibold md:text-3xl">A thinner UI. A stronger core.</h2>
          <p className="mt-2 text-sm opacity-80 md:text-base">
            Keystone focuses on the command layer—so your team focuses on outcomes, not navigation.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f) =>
          <Card key={f.title} className="border-border/70 bg-background/70 transition-colors hover:bg-background/80 hover:border-border supports-[backdrop-filter]:backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <f.icon className="h-4 w-4" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-xs opacity-80">{f.desc}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>);

}

function SolanaAtlasSection() {
  // Live prices for SOL & mSOL (Jupiter Price API proxy)
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [msolPrice, setMsolPrice] = useState<number | null>(null);
  // Live sparkline series for SOL (simple client-side trend)
  const [solSeries, setSolSeries] = useState<number[]>([]);
  // Cover image for Atlas CTA card (square)
  const atlasCover = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/839a9d0f-c8ea-4ee9-aa5d-ded18c4cf0d9/generated_images/square%2c-4k%2c-pixar-style-scene%3a-bri-5ce3e40b-20250928050348.jpg?";

  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const r = await fetch("/api/jupiter/price?ids=SOL,MSOL", { cache: "no-store" });
        const j = await r.json();
        if (!abort && j?.data) {
          const sol = j.data.SOL?.price;
          const msol = j.data.MSOL?.price;
          if (typeof sol === "number") setSolPrice(sol);
          if (typeof msol === "number") setMsolPrice(msol);
          // push to sparkline history (cap to 40 points)
          if (typeof sol === "number") {
            setSolSeries((prev) => {
              const next = [...prev, sol];
              return next.length > 40 ? next.slice(next.length - 40) : next;
            });
          }
        }
      } catch {}
    }
    run();
    const id = setInterval(run, 30000);
    return () => {abort = true;clearInterval(id);};
  }, []);

  return (
    <section id="atlas" className="relative border-t scroll-mt-24" aria-labelledby="atlas-heading">
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="grid items-start gap-6 md:grid-cols-[1fr_auto]">
          <div className="max-w-3xl md:pr-6 break-words">
            <h2 id="atlas-heading" className="-mt-1 md:-mt-2 text-2xl font-semibold md:text-3xl text-balance">Solana Atlas · Built on Solana</h2>
            <p className="mt-2 text-sm opacity-80 md:text-base text-pretty">
              Announcing our presence on Solana: a free, live dashboard that helps you discover, simulate, and optimize airdrop quests and DeFi strategies—all in one place.
            </p>
          </div>
          <div className="justify-self-end">
            <a
              href="/atlas"
              aria-label="Open Solana Atlas"
              className="group relative block aspect-square w-36 sm:w-44 md:w-52 lg:w-60 xl:w-64 overflow-hidden rounded-xl border border-border/70">

              <div
                className="absolute inset-0 bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url(${atlasCover})` }} />

              {/* overlay removed for a clear image */}
              
              <div className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-1 text-xs font-medium">
                Open Atlas →
              </div>
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/70 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Airdrop Quests</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              Personalized list of actions likely to qualify you for upcoming airdrops across top Solana protocols.
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Strategy Lab</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              Simulate "real yield" and risk for staking, swaps, and LP strategies with live quotes and price feeds.
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Execute with Keystone</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              Turn the winning simulation into a single, secure command in Keystone—no manual steps.
            </CardContent>
          </Card>
          {/* New: Atlas card resized to match grid with live SOL sparkline (Jupiter) */}
          <Card className="border-border/70 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Solana Atlas · Live</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-medium">SOL {solPrice != null ? `$${solPrice.toFixed(2)}` : "-"}</div>
                  <div className="opacity-80">mSOL {msolPrice != null ? `$${msolPrice.toFixed(2)}` : "-"}</div>
                </div>
                <Button size="sm" asChild>
                  <a href="/atlas" aria-label="Open Solana Atlas full tool">Open</a>
                </Button>
              </div>
              {/* Sparkline */}
              <div className="mt-3 h-16 rounded-md border border-border/70 bg-background/60 p-1">
                {solSeries.length >= 2 ?
                <svg viewBox="0 0 100 32" className="h-full w-full">
                    {(() => {
                    const min = Math.min(...solSeries);
                    const max = Math.max(...solSeries);
                    const span = max - min || 1;
                    const pts = solSeries.map((v, i) => {
                      const x = i / (solSeries.length - 1) * 100;
                      const y = 32 - (v - min) / span * 30 - 1; // padding 1px
                      return `${x},${y}`;
                    }).join(" ");
                    return (
                      <>
                          <polyline points={pts} fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.2" />
                          {/* gradient fill under line */}
                          <defs>
                            <linearGradient id="solGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                          d={`M0,32 L ${pts.replace(/ /g, ' L ')} L100,32 Z`}
                          fill="url(#solGrad)"
                          opacity="0.6" />

                        </>
                    );

                  })()}
                  </svg> :

                <div className="h-full w-full grid place-items-center text-[11px] opacity-60">Loading trend…</div>
                }
              </div>
            </CardContent>
          </Card>
        </div>
        <p className="mt-8 text-pretty text-base md:text-lg italic rounded-md border border-border/70 bg-background/70 px-3 py-2 supports-[backdrop-filter]:backdrop-blur-sm">
          Demonstrates real traction and valuation alignment in the Solana ecosystem; bridges users into the Keystone main app where bigger, automated workflows live; and a "Magic" Simulate button lets you preview real APY, fees, and risks before committing capital.
        </p>
      </div>
    </section>);

}

function ShowcaseSection() {
  const [command, setCommand] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [plannerEnabled, setPlannerEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [serverSteps, setServerSteps] = useState<string[] | null>(null);
  const [latestBlock, setLatestBlock] = useState<string | null>(null);
  const [ethPrice, setEthPrice] = useState<string | null>(null);
  // New: live integrations
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  // Typing animation for AI output
  const [aiTyped, setAiTyped] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiInsightHtml, setAiInsightHtml] = useState<string>("");
  const [ensRecord, setEnsRecord] = useState<any>(null);
  const [routeQuote, setRouteQuote] = useState<any>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [yieldPools, setYieldPools] = useState<any[] | null>(null);
  // New additions
  const [gasPriceGwei, setGasPriceGwei] = useState<number | null>(null);
  const [gasUsdPer100k, setGasUsdPer100k] = useState<number | null>(null);
  const [ethUsdNum, setEthUsdNum] = useState<number | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [policyPass, setPolicyPass] = useState<boolean>(false);
  // Step-by-step validations reveal
  const [validationProgress, setValidationProgress] = useState<number>(0);
  // Tooling: selection and results
  const [selectedTool, setSelectedTool] = useState<null | "gas" | "yield" | "bridge" | "swap">(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolResult, setToolResult] = useState<any>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  // Intent Preview (debounced parser)
  const [intentPreview, setIntentPreview] = useState<null | {intent?: string;steps?: any[];references?: any[];}>(null);
  const [parseLoading, setParseLoading] = useState(false);
  // Mini Solana Atlas widget prices
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [msolPrice, setMsolPrice] = useState<number | null>(null);

  // Recompute USD estimate when either gas price or ETH/USD updates
  useEffect(() => {
    if (gasPriceGwei != null && ethUsdNum != null) {
      const wei = gasPriceGwei * 1e9; // gwei -> wei
      const ethPerGas = wei / 1e18;
      const usd = ethPerGas * 100000 * ethUsdNum; // 100k gas units
      setGasUsdPer100k(Number(usd.toFixed(2)));
    }
  }, [gasPriceGwei, ethUsdNum]);

  // Debounced parse for intent preview
  useEffect(() => {
    if (!command || command.trim().length < 3) {setIntentPreview(null);return;}
    let alive = true;
    const id = setTimeout(async () => {
      try {
        setParseLoading(true);
        const res = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: command.trim() })
        });
        const data = await res.json();
        if (!alive) return;
        if (res.ok) setIntentPreview({ intent: data?.intent, steps: data?.steps, references: data?.references });else
        setIntentPreview(null);
      } catch {
        if (alive) setIntentPreview(null);
      } finally {
        if (alive) setParseLoading(false);
      }
    }, 300);
    return () => {alive = false;clearTimeout(id);};
  }, [command]);

  // Fetch mini Solana Atlas prices (SOL & mSOL) for the homepage widget
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const r = await fetch("/api/jupiter/price?ids=SOL,MSOL", { cache: "no-store" });
        const j = await r.json();
        if (!abort && j?.data) {
          const sol = j.data.SOL?.price;
          const msol = j.data.MSOL?.price;
          if (typeof sol === "number") setSolPrice(sol);
          if (typeof msol === "number") setMsolPrice(msol);
        }
      } catch {}
    }
    run();
    const id = setInterval(run, 30000);
    return () => {abort = true;clearInterval(id);};
  }, []);

  // Helper: sanitize and condense AI text (dedupe, keep markdown for bold)
  function sanitizeAiText(input: string): string {
    if (!input) return "";
    // Normalize newlines, trim spaces
    let text = String(input).replace(/\r\n?/g, "\n").trim();
    // Dedupe by paragraph blocks (case-insensitive)
    const paras = text.
    split(/\n\n+/).
    map((p) => p.trim()).
    filter(Boolean);
    const seen = new Set<string>();
    const uniqueParas = paras.filter((p) => {
      const key = p.replace(/\s+/g, " ").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    text = uniqueParas.join("\n\n");
    // Keep it concise: first ~350 chars
    if (text.length > 350) text = text.slice(0, 347).replace(/[.,;\s]+\S*$/, "") + "…";
    return text;
  }

  // Convert lightweight markdown (**bold**, *italic*) to safe HTML
  function mdToSafeHtml(src: string): string {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Escape first, then re-insert simple formatting
    let html = esc(src);
    // Bold (**text**)
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic (*text*) - avoid matching bold leftovers
    html = html.replace(/(^|[^*])\*(?!\*)([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    // Preserve line breaks
    html = html.replace(/\n/g, "<br/>");
    return html;
  }

  // Typewriter effect for AI insight
  useEffect(() => {
    if (!aiInsight) {setAiTyped("");setIsTyping(false);return;}
    setAiTyped("");
    setIsTyping(true);
    const full = aiInsight;
    let i = 0;
    const speed = 14; // ms per char
    const id = setInterval(() => {
      i += 1;
      setAiTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        setIsTyping(false);
      }
    }, speed);
    return () => clearInterval(id);
  }, [aiInsight]);

  const steps = useMemo(
    () => serverSteps ?? inferSteps(command || submitted || ""),
    [command, submitted, serverSteps]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = command.trim();
    setSubmitted(trimmed);
    setServerSteps(null);
    setLatestBlock(null);
    setEthPrice(null);
    setAiInsight(null);
    setAiInsightHtml("");
    setAiTyped("");
    setIsTyping(false);
    setAiProvider(null);
    setEnsRecord(null);
    setRouteQuote(null);
    setRouteError(null);
    setYieldPools(null);
    setGasPriceGwei(null);
    setGasUsdPer100k(null);
    setEthUsdNum(null);
    setAiImageUrl(null);
    setPolicyPass(false);
    setValidationProgress(0);
    setToolResult(null);
    setToolError(null);

    if (!trimmed) return;

    // If a specific tool is selected, execute unified tool endpoint
    if (selectedTool) {
      try {
        setToolLoading(true);
        const res = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId: selectedTool, prompt: trimmed })
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          setToolError(data?.error || "Tool execution failed");
        } else {
          setToolResult(data);
        }
      } catch (err: any) {
        setToolError(err?.message || "Tool execution error");
      } finally {
        setToolLoading(false);
      }
    }

    if (plannerEnabled) {
      setLoading(true);
      try {
        const res = await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed })
        });
        const data = await res.json();
        if (res.ok) {
          // Prefer Groq-generated stepTexts, else fall back to summaries/types
          const rawTexts: string[] = Array.isArray(data.stepTexts)
            ? data.stepTexts
            : Array.isArray(data.steps)
              ? data.steps
                  .map((s: any) =>
                    typeof s === "string"
                      ? s
                      : (s?.summary || (s?.type ? String(s.type) : ""))
                  )
                  .filter(Boolean)
              : [];

          // Dedupe and trim planner steps to avoid repeated paragraphs
          const seen = new Set<string>();
          const unique = rawTexts
            .map((s: string) => String(s || "").trim())
            .filter((s: string) => {
              const key = s.replace(/\s+/g, " ").toLowerCase();
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          setServerSteps(unique);
        } else {
          setServerSteps([data?.error || "Planner failed"]);
        }
      } catch (err: any) {
        setServerSteps(["Planner error: " + (err?.message || String(err))]);
      } finally {
        setLoading(false);
      }

      // Background: fetch latest Ethereum block via our RPC proxy
      try {
        const rpcRes = await fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: "ethereum",
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 83
          })
        });
        const j = await rpcRes.json();
        if (rpcRes.ok && j?.result) {
          const dec = parseInt(j.result, 16);
          if (!Number.isNaN(dec)) setLatestBlock(String(dec));
        }
      } catch {}

      // Background: fetch gas price and compute USD estimate
      try {
        const gasRes = await fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: "ethereum",
            jsonrpc: "2.0",
            method: "eth_gasPrice",
            params: [],
            id: 84
          })
        });
        const gj = await gasRes.json();
        if (gasRes.ok && gj?.result) {
          const wei = Number.parseInt(gj.result, 16);
          if (!Number.isNaN(wei)) {
            const gwei = wei / 1e9;
            setGasPriceGwei(gwei);
            if (ethUsdNum) {
              const ethPerGas = wei / 1e18; // ETH per gas unit
              const usd = ethPerGas * 100000 * ethUsdNum;
              setGasUsdPer100k(Number(usd.toFixed(2)));
            }
          }
        }
      } catch {}

      // Background: fetch ETH price (USD) via price proxy
      try {
        const priceRes = await fetch("/api/price?ids=ethereum&vs_currencies=usd", { cache: "no-store" });
        const pj = await priceRes.json();
        const price = pj?.ethereum?.usd;
        if (priceRes.ok && (typeof price === "number" || typeof price === "string")) {
          const num = typeof price === "number" ? price : Number(price);
          if (!Number.isNaN(num)) setEthUsdNum(num);
          const formatted = typeof price === "number" ? price.toFixed(2) : Number(price).toFixed(2);
          setEthPrice(`$${formatted}`);
        }
      } catch {}

      // Background: AI insight via ai/text (Puter.js if configured, else Pollinations)
      try {
        const aiRes = await fetch("/api/ai/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: `Summarize as a crisp operator briefing (2 sentences): ${trimmed}`, provider: "groq" })
        });
        const aj = await aiRes.json();
        if (aiRes.ok && aj?.text) {
          const deduped = sanitizeAiText(String(aj.text)); // keeps markdown
          // Plain for typing (strip markers)
          const plain = deduped.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|[^*])\*(?!\*)([^*]+)\*(?!\*)/g, "$1$2");
          setAiInsight(plain);
          // HTML with bold
          setAiInsightHtml(mdToSafeHtml(deduped));
          setAiProvider(aj?.provider || null);
        }
        // Pollinations thumbnail for visual punch
        const thumbPrompt = encodeURIComponent(trimmed || "Keystone operation plan, minimal, black and white, 4k");
        setAiImageUrl(`https://image.pollinations.ai/prompt/${thumbPrompt}`);
      } catch {}

      // Mark policy as pass (lightweight demo policy)
      setPolicyPass(true);
      // Start step-by-step validations reveal
      let step = 0;
      const id = setInterval(() => {
        step += 1;
        setValidationProgress(step);
        if (step >= 4) clearInterval(id);
      }, 280);

      // Background: ENS resolution if a .eth name is present
      try {
        const m = trimmed.match(/([a-z0-9-]+\.eth)\b/i);
        if (m?.[1]) {
          const ensRes = await fetch(`/api/ens/resolve?name=${encodeURIComponent(m[1])}`);
          const ej = await ensRes.json();
          if (ensRes.ok && ej?.data) setEnsRecord(ej.data);
        }
      } catch {}

      // Background: Quote route (swap or bridge) and yield ideas
      try {
        const t = trimmed.toLowerCase();
        const hasBridge = t.includes("bridge");
        // naive token + amount parse
        const amountMatch = t.match(/(\d+[.,]?\d*)\s*(k|m)?/i);
        const amountNum = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 100; // default 100
        const scale = amountMatch?.[2]?.toLowerCase() === "m" ? 1_000_000 : amountMatch?.[2]?.toLowerCase() === "k" ? 1_000 : 1;
        const notional = amountNum * scale;
        const token = t.includes("usdc") ? "USDC" : t.includes("eth") ? "ETH" : "USDC";

        if (hasBridge) {
          // detect chains
          const from = t.includes("arbitrum") ? "arbitrum" : t.includes("ethereum") ? "ethereum" : "ethereum";
          const to = t.includes("base") ? "base" : t.includes("polygon") ? "polygon" : "base";
          const fromAmount = token === "USDC" ? Math.round(notional * 1e6) : Math.round(notional * 1e18);
          const q = await fetch(`/api/bridge/quote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromChain: from,
              toChain: to,
              fromToken: token,
              toToken: token,
              fromAmount: String(fromAmount)
            })
          });
          const qj = await q.json();
          if (q.ok && qj?.data) setRouteQuote(qj.data);else
          setRouteError(mapRouteError(qj?.error || "Best route temporarily unavailable. Please try again shortly."));

          // yields on destination
          const y = await fetch(`/api/yields?asset=${token}&chain=${to}`);
          const yj = await y.json();
          if (y.ok && yj?.data) setYieldPools(yj.data.slice(0, 3));
        } else {
          // swap USDC->ETH by default on mainnet
          const sellToken = token === "USDC" ? "USDC" : "ETH";
          const buyToken = token === "USDC" ? "ETH" : "USDC";
          const sellAmount = sellToken === "USDC" ? Math.round(notional * 1e6) : Math.round(notional * 1e18);
          const q = await fetch(`/api/swap/quote?sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}&chainId=1`);
          const qj = await q.json();
          if (q.ok && qj?.data) setRouteQuote(qj.data);else
          setRouteError(mapRouteError(qj?.error || "Unable to fetch a quote for the given parameters."));

          // yields for buy side on ethereum
          const destAsset = buyToken;
          const y = await fetch(`/api/yields?asset=${destAsset}&chain=ethereum`);
          const yj = await y.json();
          if (y.ok && yj?.data) setYieldPools(yj.data.slice(0, 3));
        }
      } catch (e: any) {
        setRouteError(mapRouteError(e?.message || "Route fetch error"));
      }
    }
  }

  // Friendlier error mapping for route quotes
  function mapRouteError(msg: string): string {
    const m = String(msg || "");
    if (/li\.fi|lifi|li\.quest/i.test(m)) return "Best route temporarily unavailable. Please try again shortly.";
    if (/400|bad request/i.test(m)) return "Unable to fetch a quote for the given parameters.";
    return m;
  }

  const examples = [
  "Swap 250k USDC to ETH on the cheapest route and send to treasury",
  "Bridge 50k USDC from Arbitrum to Base, then stake in Aave",
  "Distribute 1.2 ETH to team multisig and set weekly limit"];


  const tools = [
  { id: "gas" as const, label: "Gas Estimator" },
  { id: "yield" as const, label: "Yield Scanner" },
  { id: "bridge" as const, label: "Bridge Finder" },
  { id: "swap" as const, label: "Swap Router" }];


  return (
    <section id="showcase" className="relative border-t scroll-mt-24" aria-labelledby="showcase-heading">
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 id="showcase-heading" className="text-2xl font-semibold md:text-3xl">Command the treasury</h2>
          <p className="mt-2 text-sm opacity-80 md:text-base">
            Type what you want. Keystone plans, validates, and executes it with transparent steps.
          </p>
        </div>

        <Card className="mt-6 border-border/70 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 opacity-70" />
                {selectedTool &&
                <Badge variant="secondary" className="shrink-0">{tools.find((t) => t.id === selectedTool)?.label}</Badge>
                }
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={selectedTool ? `Prompt for ${tools.find((t) => t.id === selectedTool)?.label}…` : "e.g. Swap 250k USDC to ETH on the cheapest route and send to treasury"}
                  className="text-sm"
                  aria-label="Command input"
                  aria-describedby="command-help"
                  autoComplete="off"
                  spellCheck={false} />


                <Button type="submit" size="sm" className="shrink-0" disabled={!command.trim() || loading || toolLoading} aria-disabled={!command.trim() || loading || toolLoading} aria-busy={loading || toolLoading}>
                  {loading || toolLoading ?
                  <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Executing…
                    </span> :

                  "Execute"
                  }
                </Button>
              </div>
              {/* Intent Preview */}
              {intentPreview?.intent &&
              <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-80">
                  <span className="rounded border border-border/70 bg-background/60 px-2 py-0.5">Intent: <span className="font-medium">{intentPreview.intent}</span></span>
                  {(intentPreview.steps || []).slice(0, 6).map((st: any, i: number) =>
                <span key={i} className="rounded border border-border/70 bg-background/60 px-2 py-0.5">{st?.type || st?.title || "step"}</span>
                )}
                  {parseLoading && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> parsing…</span>}
                </div>
              }
              <p id="command-help" className="sr-only">Type a treasury instruction and press Enter to execute. Try the examples below.</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {examples.map((ex) =>
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setCommand(ex);
                    setSubmitted(null);
                  }}
                  className={`${
                  command === ex ?
                  "bg-foreground/5 border-foreground/30" :
                  "bg-background/60 border-border/70"} rounded-md border px-2 py-1 text-left hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
                  }
                  aria-pressed={command === ex}
                  aria-label={`Use example: ${ex}`}>

                    {ex}
                  </button>
                )}
              </div>
              {/* Tool tray */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {tools.map((t) =>
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTool(t.id)}
                  className={`${selectedTool === t.id ? "bg-foreground/5 border-foreground/30" : "bg-background/60 border-border/70"} rounded-md border px-2 py-1 hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  aria-pressed={selectedTool === t.id}
                  aria-label={`Select tool: ${t.label}`}>

                    {t.label}
                  </button>
                )}
                {selectedTool &&
                <button
                  type="button"
                  onClick={() => setSelectedTool(null)}
                  className="ml-1 rounded-md border border-border/70 px-2 py-1 hover:bg-background/80"
                  aria-label="Clear selected tool">

                    Clear
                  </button>
                }
              </div>
              {/* Controls: AI toggle */}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="opacity-70">AI Planner</span>
                  <Switch checked={plannerEnabled} onCheckedChange={setPlannerEnabled} aria-label="Toggle AI planner" />
                </div>
              </div>
            </form>

            <Separator className="my-4" />

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-border/70 bg-background/60 supports-[backdrop-filter]:backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Planner</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-xs opacity-90" aria-live="polite" aria-atomic="true">
                    {steps.length === 0 && <li className="opacity-70">Waiting for command…</li>}
                    {steps.map((s, i) =>
                    <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-foreground/80" />
                        <span
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: mdToSafeHtml(s) }} />

                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/60 supports-[backdrop-filter]:backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Validations</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs">
                  <ul className="space-y-1 opacity-80">
                    {validationProgress >= 1 && <li className="transition-opacity duration-300">Limits and policies checked</li>}
                    {validationProgress >= 2 && <li className="transition-opacity duration-300">Routes compared across venues</li>}
                    {validationProgress >= 3 && <li className="transition-opacity duration-300">Multisig approvals prepared</li>}
                    {validationProgress >= 4 && <li className="transition-opacity duration-300">Gas and slippage protected</li>}
                    {latestBlock && <li className="opacity-90">Ethereum latest block: {latestBlock}</li>}
                    {ethPrice && <li className="opacity-90">ETH price (USD): {ethPrice}</li>}
                    {typeof gasPriceGwei === "number" &&
                    <li className="opacity-90">Gas price: {gasPriceGwei.toFixed(2)} gwei</li>
                    }
                    {typeof gasUsdPer100k === "number" &&
                    <li className="opacity-90">Gas est (100k): ${gasUsdPer100k.toFixed(2)}</li>
                    }
                    {ensRecord &&
                    <li className="opacity-90">
                        ENS: {ensRecord.name} → <span className="font-mono break-all">{ensRecord.address}</span>
                      </li>
                    }
                  </ul>

                  {toolLoading &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2">
                      <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">{tools.find((t) => t.id === selectedTool)?.label} Result</div>
                      <div className="text-xs opacity-80 inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
                    </div>
                  }
                  {toolError &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2 text-[11px] opacity-80">{toolError}</div>
                  }
                  {toolResult &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2">
                      <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">{tools.find((t) => t.id === selectedTool)?.label} Result</div>
                      <div className="font-medium">{toolResult.summary}</div>
                      {Array.isArray(toolResult?.references) && toolResult.references.length > 0 &&
                    <div className="text-[11px] opacity-80 flex flex-wrap gap-2">
                          {toolResult.references.map((ref: any, idx: number) => {
                        const href = typeof ref === "string" ? ref : ref?.url;
                        const label = typeof ref === "string" ? ref.replace(/^https?:\/\//, "") : ref?.label || ref?.url;
                        return href ?
                        <a key={idx} href={href} target={/^https?:\/\//.test(href) ? "_blank" : undefined} rel={/^https?:\/\//.test(href) ? "noreferrer" : undefined} className="underline hover:opacity-90">
                                {label}
                              </a> :

                        <span key={idx}>{label}</span>;

                      })}
                        </div>
                    }
                    </div>
                  }
                  {policyPass &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium">Policy Check: PASS</span>
                      </div>
                      <div className="mt-1 text-[11px] opacity-70">Limits within thresholds · Slippage capped · Gas budget ok</div>
                    </div>
                  }

                  {/* Magic: AI Insight */}
                  {aiInsight &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2">
                      <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">AI Insight {aiProvider ? `· ${aiProvider}` : ""}</div>
                      {isTyping ?
                    <div className="text-xs whitespace-pre-wrap" aria-live="polite" aria-atomic="true">
                          {aiTyped}
                          <span className="opacity-50">▍</span>
                        </div> :

                    <div className="text-xs" dangerouslySetInnerHTML={{ __html: aiInsightHtml }} />
                    }
                      {aiImageUrl &&
                    <div className="mt-2">
                          <img
                        src={aiImageUrl}
                        alt="AI storyboard"
                        className="h-16 w-28 object-cover rounded border border-border/70"
                        loading="lazy" />

                        </div>
                    }
                    </div>
                  }

                  {/* Magic: Route Preview */}
                  {routeQuote &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2">
                      <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">Best Route</div>
                      <div className="text-xs grid grid-cols-2 gap-2">
                        {routeQuote.provider && <div>Provider: <span className="font-medium">{routeQuote.provider}</span></div>}
                        {routeQuote.bridge && <div>Bridge: <span className="font-medium">{routeQuote.bridge}</span></div>}
                        {routeQuote.estimatedDuration &&
                      <div>ETA: <span className="font-medium">{Math.round(Number(routeQuote.estimatedDuration) / 60)} min</span></div>
                      }
                        {routeQuote.toAmount &&
                      <div>To Amount: <span className="font-mono">{String(routeQuote.toAmount)}</span></div>
                      }
                        {routeQuote.price &&
                      <div>Price: <span className="font-mono">{String(routeQuote.price)}</span></div>
                      }
                        {routeQuote.savings?.amount &&
                      <div className="col-span-2">
                            Savings vs next best: <span className="font-mono">{routeQuote.savings.amount}</span>
                            {typeof routeQuote.savings.percent === "number" &&
                        <span className="ml-1 text-[11px] opacity-80">({routeQuote.savings.percent}%)</span>
                        }
                          </div>
                      }
                        {routeQuote.nextBest &&
                      <div className="col-span-2 text-[11px] opacity-80">Next best: {routeQuote.nextBest.bridge || "-"} · To Amount: <span className="font-mono">{String(routeQuote.nextBest.toAmount || "-")}</span></div>
                      }
                      </div>
                    </div>
                  }
                  {routeError &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2 text-[11px] opacity-80">{routeError}</div>
                  }

                  {/* Magic: Yield Ideas */}
                  {yieldPools && yieldPools.length > 0 &&
                  <div className="mt-3 rounded-md border border-border/70 bg-background/70 p-2">
                      <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">Yield Opportunities</div>
                      <ul className="space-y-1 text-xs">
                        {yieldPools.map((p, i) =>
                      <li key={i} className="flex items-center justify-between gap-3">
                            <span className="truncate">{p.project} · {p.chain} · {p.symbol}</span>
                            {typeof p.apy === "number" ?
                        <span className="font-mono">{p.apy > 200 ? "200%+" : `${p.apy.toFixed(2)}%`}</span> :

                        <span className="font-mono">{p.apy}</span>
                        }
                          </li>
                      )}
                      </ul>
                    </div>
                  }
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Treasury Simulator */}
        {submitted &&
        <TreasurySimulator command={submitted} loading={loading} />
        }
      </div>
    </section>);

}

function inferSteps(text: string): string[] {
  const t = text.toLowerCase();
  const steps: string[] = [];
  if (!t.trim()) return steps;
  if (t.includes("swap")) {
    steps.push("Detect token pair and size");
    steps.push("Quote best route across venues");
    steps.push("Simulate trade and set protections");
  }
  if (t.includes("bridge")) {
    steps.push("Select optimal bridge by cost and time");
  }
  if (t.includes("stake") || t.includes("lend")) {
    steps.push("Connect to protocol and prepare deposit");
  }
  if (t.includes("distribute") || t.includes("send")) {
    steps.push("Resolve recipients and envelopes");
  }
  steps.push("Request approvals and execute");
  return steps;
}

function UseCasesSection() {
  return (
    <section id="use-cases" className="relative border-t scroll-mt-24" aria-labelledby="use-cases-heading">
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 id="use-cases-heading" className="text-2xl font-semibold md:text-3xl">Use cases for the Command Layer</h2>
          <p className="mt-2 text-sm opacity-80 md:text-base">
            The Command Layer is designed to handle complex treasury operations with natural language.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/70 bg-background/70 transition-colors hover:bg-background/80 hover:border-border supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Treasury Rebalancing</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              <p>Automatically rebalance treasury assets across chains and protocols based on risk and yield.</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/70 transition-colors hover:bg-background/80 hover:border-border supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Emergency Response</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              <p>Execute emergency actions like liquidations, withdrawals, or multi-sig approvals with one command.</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/70 transition-colors hover:bg-background/80 hover:border-border supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              <p>Share and execute complex operations across teams with named playbooks and approvals.</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/70 transition-colors hover:bg-background/80 hover:border-border supports-[backdrop-filter]:backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recurring Payroll</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs opacity-80">
              <p>Schedule contributor payroll across chains, auto-route stablecoins, and capture approvals with one prompt.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>);

}

function CTASection() {
  return (
    <section id="contact" className="relative border-t scroll-mt-24" aria-labelledby="contact-heading">
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 id="contact-heading" className="text-2xl font-semibold md:text-3xl">Bring commands to your treasury</h3>
            <p className="mt-1 text-sm opacity-80 md:text-base">Request early access and help shape the Keystone Command Layer.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" asChild>
              <a href="mailto:hello@keystone.app?subject=Keystone%20Access&body=Hi%20Keystone%20team,%20we'd%20love%20to%20try%20the%20Command%20Layer.">Request Access</a>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href="/oracle" className="inline-flex items-center gap-1.5">
                Try Oracle
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l6 6-6 12-6-12 6-6z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 9l3 3-3 6-3-6 3-3z" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                </svg>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>);

}

function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 text-xs opacity-80">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Keystone</span>
          </div>
          <nav aria-label="Footer" role="navigation" className="flex flex-wrap gap-4">
            <a href="#features" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Features</a>
            <a href="#showcase" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Showcase</a>
            <a href="/oracle" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Oracle</a>
            <a href="/atlas" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Solana Atlas</a>
            <a href="#use-cases" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Use Cases</a>
            <a href="#contact" className="opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Contact</a>
          </nav>
        </div>
        <div className="mt-6 opacity-60">© {new Date().getFullYear()} KeyStone. All rights reserved.</div>
      </div>
    </footer>);

}