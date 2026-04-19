"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Urbanist } from "next/font/google";
import { Menu, LayoutDashboard, TrendingUp, Shield, Radar, Compass, History, FlaskConical, Settings, ChevronDown, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-notifications";
import { useAtlasCommand } from "@/hooks/use-atlas-command";
import { useAtlasData } from "@/hooks/use-atlas-data";

const wordmark = Urbanist({ subsets: ["latin"], weight: "600", display: "swap", adjustFontFallback: true });

const navIcons: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard className="h-[18px] w-[18px]" />,
  "market-pulse-card": <TrendingUp className="h-[18px] w-[18px]" />,
  "token-intel-section": <Shield className="h-[18px] w-[18px]" />,
  "mev-scanner-card": <Radar className="h-[18px] w-[18px]" />,
  "yield-section": <Compass className="h-[18px] w-[18px]" />,
  "time-machine-section": <History className="h-[18px] w-[18px]" />,
  "strategy-lab": <FlaskConical className="h-[18px] w-[18px]" />,
};

const navGroups = [
  { label: "COMMAND CENTER", items: [
    { id: "overview", label: "Overview", href: "/atlas" },
    { id: "market-pulse-card", label: "Market Pulse", href: "/atlas#market-pulse-card" },
    { id: "token-intel-section", label: "Token Intel", href: "/atlas#token-intel-section" },
    { id: "mev-scanner-card", label: "MEV Detector", href: "/atlas#mev-scanner-card" },
  ]},
  { label: "EXPLORE", items: [
    { id: "yield-section", label: "Opportunities", href: "/atlas#yield-section" },
    { id: "time-machine-section", label: "Time Machine", href: "/atlas#time-machine-section" },
    { id: "strategy-lab", label: "Strategy Lab", href: "/atlas/strategy-lab" },
  ]},
];

/**
 * Local regex fallback parser — works when LLM API is down.
 */
function regexFallbackParse(text: string): { tool_id: string; parameters: Record<string, any> } | null {
  const lower = text.toLowerCase().trim();
  const amtMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
  const amt = amtMatch ? Number(amtMatch[1]) : undefined;

  if (/\b(stake|staking)\b/.test(lower)) {
    let provider = "marinade";
    if (/\bjito\b/.test(lower)) provider = "jito";
    else if (/\bblaze\b|\bbsol\b/.test(lower)) provider = "blazestake";
    return { tool_id: "stake_sol", parameters: { amount: amt, provider } };
  }
  if (/\b(swap|buy|sell|convert|trade)\b/.test(lower)) {
    const swapMatch = lower.match(/(\d+(?:\.\d+)?)\s*(\w+)\s*(?:to|for|into|→)\s*(\w+)/);
    if (swapMatch) return { tool_id: "swap_tokens", parameters: { amount: Number(swapMatch[1]), input_token: swapMatch[2], output_token: swapMatch[3] } };
    const buyMatch = lower.match(/buy\s+(\d+(?:\.\d+)?)\s*(\w+)\s*(?:with|using)?\s*(\w+)?/);
    if (buyMatch) return { tool_id: "swap_tokens", parameters: { amount: Number(buyMatch[1]), input_token: buyMatch[3] || "SOL", output_token: buyMatch[2] } };
    return { tool_id: "swap_tokens", parameters: { amount: amt, input_token: "SOL", output_token: "USDC" } };
  }
  if (/\b(lp|liquidity|pool)\b/.test(lower)) return { tool_id: "provide_liquidity", parameters: { amount: amt } };
  if (/\b(price|how much|worth|cost)\b/.test(lower)) {
    const tokenMatch = lower.match(/(?:price\s+(?:of\s+)?|how much (?:is )?|worth of )(\w+)/);
    return { tool_id: "price_check", parameters: { token: tokenMatch ? tokenMatch[1].toUpperCase() : "SOL" } };
  }
  if (/\b(balance|portfolio|holdings|what do i have)\b/.test(lower)) return { tool_id: "show_portfolio", parameters: {} };
  if (/\b(market|overview|pulse|trend)\b/.test(lower)) return { tool_id: "market_overview", parameters: {} };
  if (/\b(airdrop|quest)\b/.test(lower)) return { tool_id: "scan_airdrops", parameters: {} };
  if (/\bmev\b/.test(lower)) return { tool_id: "scan_mev", parameters: {} };
  if (/\bdca\b/.test(lower)) return { tool_id: "create_dca_bot", parameters: {} };
  if (/\b(rug|scam|safe|audit)\b/.test(lower)) {
    const mintMatch = lower.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return { tool_id: "rug_pull_detector", parameters: { mint_address: mintMatch ? mintMatch[1] : undefined } };
  }
  if (/\brebalanc/.test(lower)) return { tool_id: "portfolio_rebalancer", parameters: {} };
  if (/\bfee\b/.test(lower)) return { tool_id: "fee_saver_insights", parameters: {} };
  if (/\b(time machine|transaction|tx|lookup)\b/.test(lower)) {
    const sigMatch = lower.match(/([1-9A-HJ-NP-Za-km-z]{64,88})/);
    return { tool_id: "transaction_time_machine", parameters: { signature: sigMatch ? sigMatch[1] : undefined } };
  }
  if (/\bcopy\b/.test(lower)) return { tool_id: "copy_trader", parameters: {} };
  if (/\blab\b|\bstrategy\b/.test(lower)) return { tool_id: "navigate_to_tab", parameters: { tab_id: "lab" } };
  if (/\bquest\b|\btool\b/.test(lower)) return { tool_id: "navigate_to_tab", parameters: { tab_id: "quests" } };

  return null;
}

export function AtlasShell({ children, activeSection }: { children: React.ReactNode, activeSection: string }) {
  const router = useRouter();
  const { publicKey, wallet, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { dispatch } = useAtlasCommand();
  const { solBalance } = useAtlasData();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdText, setCmdText] = useState("");
  const [cmdLoading, setCmdLoading] = useState(false);

  const handleBottomSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = cmdText.trim();
    if (!text) return;

    setCmdLoading(true);
    try {
      let command: { tool_id: string; parameters: Record<string, any> } | null = null;
      try {
        const response = await fetch("/api/ai/parse-atlas-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (response.ok) {
          const parsed = await response.json();
          if (parsed && parsed.tool_id && parsed.tool_id !== "unknown") {
            command = parsed;
          }
        }
      } catch {}

      if (!command) command = regexFallbackParse(text);

      if (command && command.tool_id) {
        const lowerText = text.toLowerCase();
        const isStrategizing = /\b(strategize|compare|simulate|options|plan|best way|how to|think|analysis)\b/.test(lowerText);
        command.parameters = { ...command.parameters, _isStrategizing: isStrategizing };
        dispatch(command);
      } else {
        toast.error("Sorry, I couldn't understand that command. Try: 'swap 10 SOL to USDC', 'stake 5 SOL with Jito', or 'show SOL price'.");
      }
    } catch (error: any) {
      toast.error("Error processing command", { description: error.message });
    } finally {
      setCmdLoading(false);
      setCmdText("");
    }
  };

  const handleNavClick = (href: string) => {
    setSidebarOpen(false);
    if (href.startsWith("/atlas#")) {
      const id = href.split("#")[1];
      if (window.location.pathname === "/atlas") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push(href);
      }
    } else {
      router.push(href);
    }
  };

  return (
    <div className="h-full flex overflow-hidden transition-colors duration-300">
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-40 w-64 flex-shrink-0 border-r border-slate-200 atlas-sidebar flex flex-col justify-between h-full transition-transform duration-200`}>
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2 group rounded-lg">
              <span className={`${wordmark.className} text-xl font-semibold tracking-tight text-violet-700 lowercase leading-none group-hover:text-violet-600 transition-colors antialiased`}>dreyv</span>
              <span className="text-xs text-slate-400 font-medium">atlas</span>
            </Link>
          </div>
          <nav className="p-4 space-y-1">
            {navGroups.map((g) => (
              <div key={g.label}>
                <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">{g.label}</p>
                {g.items.map((item) => (
                  <button key={item.id} onClick={() => handleNavClick(item.href)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeSection === item.id ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <span className="mr-3">{navIcons[item.id]}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-200">
          {publicKey ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center">
                    {wallet?.adapter?.icon ? (
                      <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-6 h-6 rounded-full mr-2 bg-white object-cover shadow-sm" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-purple-400 mr-2 flex items-center justify-center text-[10px] text-white font-bold">DR</div>
                    )}
                    <span className="font-mono text-xs">{publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={async () => { await navigator.clipboard.writeText(publicKey.toBase58()); toast.success("Address copied"); }}>Copy address</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`https://solscan.io/address/${publicKey.toBase58()}`, "_blank", "noopener,noreferrer")}>View on Solscan</DropdownMenuItem>
                <DropdownMenuItem onClick={() => disconnect?.()}>Disconnect</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button onClick={() => setVisible(true)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-purple-400 mr-2 flex items-center justify-center text-[10px] text-white font-bold">DR</div>
                <span>Select Wallet</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
          <div className="mt-2 flex justify-around">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="h-16 flex-shrink-0 flex items-center px-4 sm:px-6 lg:px-8 border-b border-slate-200/50 atlas-header z-20">
          <button className="md:hidden mr-4 text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 flex justify-center max-w-3xl mx-auto">
            <form onSubmit={handleBottomSubmit} className="w-full relative group">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <Sparkles className="text-violet-500/70 h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <Input value={cmdText} onChange={(e) => setCmdText(e.target.value)}
                className="block w-full pl-9 sm:pl-11 pr-12 sm:pr-20 py-2 sm:py-2.5 border border-slate-200 rounded-full leading-5 bg-white/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-xs sm:text-sm transition-all shadow-sm group-hover:shadow backdrop-blur-sm"
                placeholder="Ask Atlas... (e.g., 'Swap 10 SOL')" />
              <div className="hidden sm:flex absolute inset-y-0 right-12 pr-2 items-center pointer-events-none">
                <span className="text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">⌘K</span>
              </div>
              <div className="absolute inset-y-0 right-0 pr-1 sm:pr-2 flex items-center">
                <Button type="submit" size="icon" variant="ghost" disabled={cmdLoading} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-colors">
                  {cmdLoading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
            </form>
          </div>
          <div className="ml-4 flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Solana: Live
            </div>
            {solBalance != null && publicKey && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {solBalance.toFixed(3)} SOL
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
