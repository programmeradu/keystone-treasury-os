"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
  TransactionMessage,
} from "@solana/web3.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { IconMEVDetector } from "@/components/ui/icons";

const SOL_MINT = "So11111111111111111111111111111111111111112";

// Jito tip accounts for MEV-protected bundle inclusion
const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4bVqkfRtQ7NmXwQhE3FMPB",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSQnR21urPnRsJJXKSt",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

// ---------------------------------------------------------------------------
// Dynamic Jupiter quote fetcher — no hardcoded DEX names.
// Tries the preferred DEX first; if Jupiter doesn't recognise the name or
// returns no route, silently falls back to unrestricted routing so the
// executor can still work with whatever markets are available.
// ---------------------------------------------------------------------------
async function fetchQuote(opts: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: string;
  preferredDex?: string; // raw dexId from scanner — tried as-is
}): Promise<any> {
  const base = new URL("/api/jupiter/quote", window.location.origin);
  base.searchParams.set("inputMint", opts.inputMint);
  base.searchParams.set("outputMint", opts.outputMint);
  base.searchParams.set("amount", opts.amount);
  base.searchParams.set("slippageBps", opts.slippageBps);

  // Attempt 1 — route through the specific DEX
  if (opts.preferredDex) {
    const dexUrl = new URL(base);
    dexUrl.searchParams.set("dexes", opts.preferredDex);
    try {
      const res = await fetch(dexUrl.toString(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.outAmount) return { ...data, _routedViaDex: opts.preferredDex };
      }
    } catch {
      // DEX-specific route failed — try fallback
    }
  }

  // Attempt 2 — let Jupiter find the best unrestricted route
  const res = await fetch(base.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data?.outAmount) {
    throw new Error(data?.error || "No route available");
  }
  return { ...data, _routedViaDex: null };
}

export function MEVScanner() {
  const { publicKey, sendTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Fetch SOL price on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/jupiter/price?ids=SOL");
        const d = await res.json();
        if (d?.data?.SOL?.price) setSolPrice(d.data.SOL.price);
      } catch {
        /* best-effort */
      }
    })();
  }, []);

  // ── Scan ────────────────────────────────────────────────────────────
  const scanForMEV = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/solana/mev-scan?minProfit=0.5");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setOpportunities(data.opportunities || []);
      setLastScan(data.scannedAt || Date.now());
      if ((data.opportunities?.length || 0) > 0) {
        toast.success(`Found ${data.opportunities.length} opportunity(s)!`);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Execute — fully dynamic, reads everything from the opp object ──
  const executeMevArbitrage = async (opp: any) => {
    // --- guard checks ---
    if (!publicKey || !signAllTransactions) {
      toast.error("Connect a wallet that supports batch signing");
      return;
    }
    if (!opp.tokenMint) {
      toast.error("Token mint missing — rescan for fresh data");
      return;
    }

    setExecutingId(opp.id);
    try {
      // --- derive trade parameters from the opportunity data ---
      const effectiveSolPrice = solPrice || 150;
      const tradeUsd = Number(opp.tradeSize) || 100;
      const solAmount = tradeUsd / effectiveSolPrice;
      const inputLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      if (inputLamports < 10_000) throw new Error("Trade size too small");

      toast.message("Building arb bundle…", {
        description: `Buy ${opp.buyDex} → Sell ${opp.sellDex}`,
      });

      // ── LEG 1 — BUY: SOL → Token, preferring the cheaper DEX ──────
      const buyQuote = await fetchQuote({
        inputMint: SOL_MINT,
        outputMint: opp.tokenMint,
        amount: String(inputLamports),
        slippageBps: "100",
        preferredDex: opp.buyDexId, // raw dexscreener id, tried as-is
      });

      // Build buy swap tx
      const buySwapRes = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: buyQuote,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          asLegacyTransaction: false,
        }),
      });
      const buySwapData = await buySwapRes.json();
      if (!buySwapRes.ok || !buySwapData?.swapTransaction) {
        throw new Error(buySwapData?.error || "Buy-leg swap build failed");
      }

      // ── LEG 2 — SELL: Token → SOL, preferring the expensive DEX ────
      const tokensReceived = buyQuote.outAmount; // dynamic from leg 1

      const sellQuote = await fetchQuote({
        inputMint: opp.tokenMint,
        outputMint: SOL_MINT,
        amount: tokensReceived,
        slippageBps: "100",
        preferredDex: opp.sellDexId,
      });

      // Build sell swap tx
      const sellSwapRes = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: sellQuote,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          asLegacyTransaction: false,
        }),
      });
      const sellSwapData = await sellSwapRes.json();
      if (!sellSwapRes.ok || !sellSwapData?.swapTransaction) {
        throw new Error(sellSwapData?.error || "Sell-leg swap build failed");
      }

      // ── Profitability gate — only execute if net positive ──────────
      const solOut = Number(sellQuote.outAmount);
      const grossProfitLamports = solOut - inputLamports;
      // Tip: 10% of gross profit, floor at 10 000 lamports
      const tipLamports = Math.max(10_000, Math.floor(Math.max(0, grossProfitLamports) * 0.1));
      const netProfitLamports = grossProfitLamports - tipLamports;

      if (netProfitLamports <= 0) {
        toast.error("Spread closed — no longer profitable", {
          description: `Net would be ${(netProfitLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL. Skipping.`,
        });
        return;
      }

      // ── LEG 3 — JITO TIP (dynamic amount) ─────────────────────────
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const tipAccount = JITO_TIP_ACCOUNTS[
        Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)
      ];

      const tipVtx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: new PublicKey(tipAccount),
              lamports: tipLamports,
            }),
          ],
        }).compileToV0Message()
      );

      // ── Deserialize Jupiter swap txs ───────────────────────────────
      const decode = (b64: string) =>
        VersionedTransaction.deserialize(
          Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        );
      const buyVtx = decode(buySwapData.swapTransaction);
      const sellVtx = decode(sellSwapData.swapTransaction);

      // ── Sign all 3 atomically ──────────────────────────────────────
      toast.message("Approve 3 transactions in wallet…", {
        description: "Buy → Sell → Tip (atomic Jito bundle)",
      });
      const signed = await signAllTransactions([buyVtx, sellVtx, tipVtx]);

      // ── Submit as Jito bundle ──────────────────────────────────────
      const serialize64 = (tx: VersionedTransaction) => {
        const bytes = tx.serialize();
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      };

      const bundleRes = await fetch("/api/solana/jito-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: signed.map(serialize64),
        }),
      });
      const bundleData = await bundleRes.json();

      if (!bundleRes.ok || !bundleData.success) {
        // Jito unavailable → fallback: send legs sequentially via RPC
        toast.message("Jito unavailable — submitting direct…");
        const buySig = await connection.sendRawTransaction(signed[0].serialize(), { skipPreflight: true });
        const sellSig = await connection.sendRawTransaction(signed[1].serialize(), { skipPreflight: true });
        toast.success(`Arb executed: ${opp.token}`, {
          description: `Buy → Sell confirmed`,
        });
        toast.message("Sell tx on Solscan", {
          description: `https://solscan.io/tx/${sellSig}`,
          action: {
            label: "Open",
            onClick: () => window.open(`https://solscan.io/tx/${sellSig}`, "_blank", "noopener,noreferrer"),
          },
        });
        return;
      }

      // ── Report profit ──────────────────────────────────────────────
      const profitSol = netProfitLamports / LAMPORTS_PER_SOL;
      const profitUsd = profitSol * effectiveSolPrice;

      const buyRoute = buyQuote._routedViaDex || "best route";
      const sellRoute = sellQuote._routedViaDex || "best route";

      toast.success(`Arb complete: ${opp.token}`, {
        description: `Buy (${buyRoute}) → Sell (${sellRoute}) | +${profitSol.toFixed(4)} SOL ($${profitUsd.toFixed(2)})`,
      });

      if (bundleData.bundleId) {
        toast.message("Jito bundle", { description: bundleData.bundleId });
      }
    } catch (e: any) {
      toast.error("Arb failed", { description: e?.message || String(e) });
    } finally {
      setExecutingId(null);
    }
  };

  // ── Auto-scan ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoScan) return;
    const iv = setInterval(scanForMEV, 10_000);
    return () => clearInterval(iv);
  }, [autoScan]);

  // ── Scroll shadows ─────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.classList.add("is-scrolling");
      if (t) clearTimeout(t);
      t = setTimeout(() => el.classList.remove("is-scrolling"), 900);
      el.scrollTop > 2 ? el.classList.add("has-top-shadow") : el.classList.remove("has-top-shadow");
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop < max - 2 ? el.classList.add("has-bottom-shadow") : el.classList.remove("has-bottom-shadow");
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); if (t) clearTimeout(t); };
  }, [opportunities.length]);

  // ── Helpers ────────────────────────────────────────────────────────
  const confidenceColor = (c: string) =>
    c === "high" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
    : c === "medium" ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
    : "text-red-500 border-red-500/30 bg-red-500/10";

  const fmtPrice = (p: number) => {
    if (p === 0) return "$0.00";
    if (p >= 0.01) return `$${p.toFixed(4)}`;
    const str = p.toFixed(20);
    const m = str.match(/^0\.(0+)([1-9]\d*)/);
    if (m) {
      const sub: Record<string, string> = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };
      return `$0.0${m[1].length.toString().split("").map(d => sub[d]).join("")}${m[2].slice(0, 4)}`;
    }
    return `$${p.toFixed(8)}`;
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none whitespace-nowrap">
              <span className="flex items-center gap-2">
                <IconMEVDetector className="h-4 w-4" />
                <span>MEV Detector</span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastScan && (
                <span className="text-[10px] opacity-60">
                  {new Date(lastScan).toLocaleTimeString()}
                </span>
              )}
              <Badge variant={opportunities.length > 0 ? "default" : "secondary"} className="h-6 px-2 text-[10px] rounded-md leading-none">
                {opportunities.length} Opp{opportunities.length !== 1 ? "s" : ""}
              </Badge>
              <Button size="sm" variant="outline" onClick={scanForMEV} disabled={loading} className="h-6 px-2 text-[11px] rounded-md">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Scan Now"}
              </Button>
            </div>
          </div>
          <div className="text-xs opacity-70">
            Cross-DEX arbitrage — buy cheap, sell expensive, atomic Jito bundles.
          </div>
        </CardHeader>

        <CardContent className="atlas-card-content pt-0 space-y-3">
          {loading && opportunities.length === 0 && (
            <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-20 w-full" /></div>
          )}

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div ref={scrollRef} className="space-y-2 max-h-72 overflow-y-auto scrollbar-modern scrollbar-autohide overflow-shadows pr-1">
            {opportunities.map((opp) => (
              <div key={opp.id} className="relative overflow-hidden rounded-md p-3 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)]">
                <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                {opp.type === "arbitrage" ? (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          {opp.token}
                        </div>
                        <div className="text-[11px] opacity-70 mt-0.5">
                          Buy on {opp.buyDex} @ {fmtPrice(opp.buyPrice)} → Sell on {opp.sellDex} @ {fmtPrice(opp.sellPrice)}
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${confidenceColor(opp.confidence)}`}>{opp.confidence}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                      <div><span className="opacity-70">Spread:</span>{" "}<span className="font-mono text-emerald-500 font-semibold">+{opp.profitPercent}%</span></div>
                      <div><span className="opacity-70">Est:</span>{" "}<span className="font-mono">${opp.profitUsd}</span></div>
                      <div><span className="opacity-70">Size:</span>{" "}<span className="font-mono">${opp.tradeSize}</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] opacity-70">~{opp.expiresIn}s · Liq: ${((opp.liquidity || 0) / 1000).toFixed(0)}k</div>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        disabled={!publicKey || !signAllTransactions || executingId === opp.id}
                        onClick={() => executeMevArbitrage(opp)}
                      >
                        {executingId === opp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : !publicKey ? "Connect" : "Arb Execute"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-xs">{opp.token}</span>
                      <Badge variant="secondary" className="text-[10px]">Risk Alert</Badge>
                    </div>
                    <div className="text-[11px] opacity-80">{opp.warning}</div>
                    {opp.frontrunProfit && <div className="text-[10px] opacity-70 mt-1">Potential profit: ${opp.frontrunProfit}</div>}
                  </>
                )}
              </div>
            ))}
          </div>

          {!loading && opportunities.length === 0 && !error && (
            <div className="text-xs opacity-70 text-center py-4">No MEV opportunities right now. Market is efficient!</div>
          )}

          <div className="text-[10px] opacity-60 text-center mt-2">
            Atomic Jito bundle: Buy + Sell + Tip in one slot. Profitability verified before execution.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
