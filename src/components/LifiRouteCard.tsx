"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// Lightweight LI.FI route UI: chains + token + amount -> quote via our /api/bridge proxy
// Keeps to existing design system (small, subtle) and avoids heavy dependencies

const CHAINS = [
  { id: "ethereum", label: "Ethereum" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "base", label: "Base" },
  { id: "polygon", label: "Polygon" },
  { id: "bsc", label: "BNB Chain" },
];

const TOKENS = [
  { id: "ETH", label: "ETH" },
  { id: "USDC", label: "USDC" },
];

export function LifiRouteCard() {
  const [fromChain, setFromChain] = useState("ethereum");
  const [toChain, setToChain] = useState("base");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<any | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simData, setSimData] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const disabled = useMemo(() => !amount || Number(amount) <= 0 || fromChain === toChain, [amount, fromChain, toChain]);

  async function getQuote() {
    setLoading(true);
    setError(null);
    setRoute(null);
    try {
      // Use full token names, convert amount to smallest units (USDC:6, ETH:18)
      const fromTokenFull = token;
      const toTokenFull = token; // same token for bridge/swap
      const tokenDecimals = token === "ETH" ? 18 : 6;
      const amountWei = (BigInt(Number(amount)) * BigInt(10) ** BigInt(tokenDecimals)).toString();

      const res = await fetch(`/api/bridge/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain,
          toChain,
          fromToken: fromTokenFull,
          toToken: toTokenFull,
          fromAmount: amountWei,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch route");
      setRoute(data.data); // Assuming API returns {data: normalized}
    } catch (e: any) {
      setError(e?.message || "Failed to fetch route");
    } finally {
      setLoading(false);
    }
  }

  async function simulateRoute() {
    if (!route) return;
    setSimLoading(true);
    setSimError(null);
    setSimData(null);
    try {
      // Use route data to estimate gas via RPC (assume fromChain for simplicity)
      const chainForGas = fromChain; // Use fromChain for gas estimate
      const gasRes = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: chainForGas,
          jsonrpc: "2.0",
          method: "eth_estimateGas",
          params: [{ to: route.steps?.[0]?.to || "0x0000000000000000000000000000000000000000", value: "0x0", data: route.steps?.[0]?.action?.data || "0x" }],
          id: 85
        })
      });
      const gasJson = await gasRes.json();
      const gasEstimate = gasJson?.result ? parseInt(gasJson.result, 16) : 21000; // fallback

      // Project costs: get gas price + ETH USD (always use ETH for gas)
      const [gasPriceRes, priceRes] = await Promise.all([
        fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: chainForGas,
            jsonrpc: "2.0",
            method: "eth_gasPrice",
            params: [],
            id: 86
          })
        }),
        fetch("/api/price?ids=ethereum&vs_currencies=usd", { cache: "no-store" })
      ]);

      const gasPriceJson = await gasPriceRes.json();
      const priceJson = await priceRes.json();

      const gasPriceWei = gasPriceJson?.result ? parseInt(gasPriceJson.result, 16) : null;
      const ethUsd = priceJson?.ethereum?.usd;

      // Yields on toChain with token
      const yieldRes = await fetch(`/api/yields?asset=${token}&chain=${toChain}`);
      const yieldJson = await yieldRes.json();
      const topYield = yieldJson?.data?.[0]?.apy;

      if (gasEstimate && gasPriceWei && ethUsd) {
        const gasCostEth = (gasEstimate * gasPriceWei) / 1e18;
        const gasCostUsd = gasCostEth * ethUsd;
        // toAmount is in smallest units, convert back (assume toToken decimals)
        const toDecimals = token === "ETH" ? 18 : 6;
        const projectedOutput = route.toAmount ? (Number(route.toAmount) / (10 ** toDecimals)).toFixed(2) : null;

        setSimData({
          gasEstimate,
          gasCostEth: gasCostEth.toFixed(6),
          gasCostUsd: `$${gasCostUsd.toFixed(2)}`,
          projectedOutput: `${projectedOutput || '?'} ${token}`,
          riskSlippage: route.slippage ? `${route.slippage}%` : 'Low',
          altYield: topYield ? `${topYield.toFixed(2)}% on ${toChain}` : null
        });
      } else {
        throw new Error("Simulation incomplete - missing gas/price data");
      }
    } catch (e: any) {
      setSimError(e?.message || "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  }

  useEffect(() => {
    setError(null);
  }, [fromChain, toChain, token, amount]);

  return (
    <Card className="border-border/70 bg-background/60 supports-[backdrop-filter]:backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Bridge Route</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <div>
            <div className="mb-1 opacity-70">From</div>
            <Select value={fromChain} onValueChange={setFromChain}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="From" />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 opacity-70">To</div>
            <Select value={toChain} onValueChange={setToChain}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="To" />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 opacity-70">Token</div>
            <Select value={token} onValueChange={setToken}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 opacity-70">Amount</div>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              className="h-8"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={getQuote} disabled={disabled || loading} aria-disabled={disabled || loading}>
            {loading ? "Fetching…" : "Get Best Route"}
          </Button>
          {error && <span className="text-[11px] text-destructive">{error}</span>}
        </div>

        {route && (
          <div className="mt-3 text-xs">
            <Separator className="my-2" />
            <div className="opacity-70 mb-1">Top Route</div>
            <pre className="max-h-48 overflow-auto rounded-md border border-border/60 bg-background/60 p-2 whitespace-pre-wrap mb-2">
              {JSON.stringify(route, null, 2)}
            </pre>
            <Button size="sm" onClick={simulateRoute} disabled={simLoading} className="w-full" aria-disabled={simLoading}>
              {simLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "⚡ Simulate & Project"}
              {simLoading ? "Simulating…" : null}
            </Button>
            {simError && <span className="block mt-1 text-[11px] text-destructive">{simError}</span>}
            {simData && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] opacity-90">
                <div>Gas Est: {simData.gasEstimate} units</div>
                <div>Cost: {simData.gasCostUsd}</div>
                <div>Output: {simData.projectedOutput}</div>
                <div>Slippage: {simData.riskSlippage}</div>
                {simData.altYield && <div className="col-span-2">Post-op Yield: {simData.altYield}</div>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LifiRouteCard;