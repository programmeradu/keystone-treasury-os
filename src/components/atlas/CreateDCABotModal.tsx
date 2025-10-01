"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Bot, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CreateDCABotModalProps {
  onBotCreated?: () => void;
}

// Popular Solana tokens
const TOKENS = [
  { symbol: "SOL", mint: "So11111111111111111111111111111111111111112", name: "Solana" },
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", name: "USD Coin" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", name: "Bonk" },
  { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", name: "Jupiter" },
  { symbol: "ORCA", mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", name: "Orca" },
  { symbol: "RAY", mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", name: "Raydium" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily", description: "Execute once per day" },
  { value: "weekly", label: "Weekly", description: "Execute once per week" },
  { value: "biweekly", label: "Bi-weekly", description: "Execute every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Execute once per month" },
];

export function CreateDCABotModal({ onBotCreated }: CreateDCABotModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [botName, setBotName] = useState("");
  const [buyToken, setBuyToken] = useState("So11111111111111111111111111111111111111112"); // Default: SOL
  const [paymentToken, setPaymentToken] = useState("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Default: USDC
  const [amountUsd, setAmountUsd] = useState("100");
  const [frequency, setFrequency] = useState("weekly");
  const [maxSlippage, setMaxSlippage] = useState("0.5");
  const [walletAddress, setWalletAddress] = useState("");

  const handleCreate = async () => {
    setError("");
    setLoading(true);

    try {
      // Validation
      if (!botName.trim()) {
        throw new Error("Please enter a bot name");
      }

      if (!walletAddress.trim()) {
        throw new Error("Please enter your wallet address");
      }

      const amount = parseFloat(amountUsd);
      if (isNaN(amount) || amount < 1) {
        throw new Error("Amount must be at least $1");
      }

      const slippage = parseFloat(maxSlippage);
      if (isNaN(slippage) || slippage < 0.1 || slippage > 10) {
        throw new Error("Slippage must be between 0.1% and 10%");
      }

      if (buyToken === paymentToken) {
        throw new Error("Buy token and payment token must be different");
      }

      // Get token info
      const buyTokenInfo = TOKENS.find(t => t.mint === buyToken);
      const paymentTokenInfo = TOKENS.find(t => t.mint === paymentToken);

      if (!buyTokenInfo || !paymentTokenInfo) {
        throw new Error("Invalid token selection");
      }

      // Create bot
      const response = await fetch("/api/solana/dca-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: botName.trim(),
          buyTokenMint: buyToken,
          buyTokenSymbol: buyTokenInfo.symbol,
          paymentTokenMint: paymentToken,
          paymentTokenSymbol: paymentTokenInfo.symbol,
          amountUsd: amount,
          frequency,
          maxSlippage: slippage,
          walletAddress: walletAddress.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create bot");
      }

      toast.success("DCA Bot created successfully!");
      
      // Reset form
      setBotName("");
      setAmountUsd("100");
      setMaxSlippage("0.5");
      setWalletAddress("");
      
      // Close modal and refresh parent
      setOpen(false);
      if (onBotCreated) {
        onBotCreated();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create bot");
      toast.error(err.message || "Failed to create bot");
    } finally {
      setLoading(false);
    }
  };

  const buyTokenInfo = TOKENS.find(t => t.mint === buyToken);
  const paymentTokenInfo = TOKENS.find(t => t.mint === paymentToken);
  const frequencyInfo = FREQUENCIES.find(f => f.value === frequency);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Bot className="h-4 w-4 mr-2" />
          + Create New Bot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Create DCA Bot
          </DialogTitle>
          <DialogDescription>
            Set up automatic token purchases with dollar-cost averaging strategy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Bot Name */}
          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              placeholder="e.g., SOL Weekly Savings"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Buy Token */}
          <div className="space-y-2">
            <Label htmlFor="buyToken">Token to Buy</Label>
            <Select value={buyToken} onValueChange={setBuyToken} disabled={loading}>
              <SelectTrigger id="buyToken">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((token) => (
                  <SelectItem key={token.mint} value={token.mint}>
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Token */}
          <div className="space-y-2">
            <Label htmlFor="paymentToken">Pay With</Label>
            <Select value={paymentToken} onValueChange={setPaymentToken} disabled={loading}>
              <SelectTrigger id="paymentToken">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((token) => (
                  <SelectItem key={token.mint} value={token.mint}>
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount per Purchase (USD)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              disabled={loading}
              min="1"
              step="1"
            />
            <p className="text-xs text-muted-foreground">
              Minimum $1, recommended $10-$1000
            </p>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency} disabled={loading}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    <div>
                      <div className="font-medium">{freq.label}</div>
                      <div className="text-xs text-muted-foreground">{freq.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Slippage */}
          <div className="space-y-2">
            <Label htmlFor="slippage">Max Slippage (%)</Label>
            <Input
              id="slippage"
              type="number"
              placeholder="0.5"
              value={maxSlippage}
              onChange={(e) => setMaxSlippage(e.target.value)}
              disabled={loading}
              min="0.1"
              max="10"
              step="0.1"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 0.5% - 1% for liquid tokens
            </p>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="wallet">Your Wallet Address</Label>
            <Input
              id="wallet"
              placeholder="Enter your Solana wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This wallet will be used for all purchases
            </p>
          </div>

          {/* Summary */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Summary:</strong> Buy ${amountUsd} of {buyTokenInfo?.symbol} with{" "}
              {paymentTokenInfo?.symbol} {frequencyInfo?.label.toLowerCase()}.
              <br />
              <strong>Note:</strong> You'll need to manually approve each purchase for now.
            </AlertDescription>
          </Alert>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Bot"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
