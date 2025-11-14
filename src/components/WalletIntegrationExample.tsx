"use client";

/**
 * Complete Wallet Integration Example
 * Shows how to use wallet transaction layer with agents
 */

import React, { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletTransaction } from "@/hooks/use-wallet-transaction";
import { WalletSigningDialog } from "@/components/WalletSigningDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Zap, ArrowRightLeft, Coins } from "lucide-react";
import { toastNotifications } from "@/lib/toast-notifications";

export function WalletIntegrationExample() {
  const wallet = useWallet();
  const walletTx = useWalletTransaction();

  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Example: Execute a token swap
   */
  const handleSwap = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toastNotifications.executionFailed("Wallet", "Please connect your wallet first");
      return;
    }

    setIsExecuting(true);
    try {
      toastNotifications.executionStarted("Token Swap");

      // Build swap transaction
      const { tx, estimatedFee } = await walletTx.buildSwapTransaction({
        inMint: "EPjFWdd5Au", // USDC
        outMint: "So11111111", // SOL
        amount: 100, // 100 USDC
        slippage: 0.5
      });

      // Request approval
      const approval = walletTx.requestApproval({
        type: "swap",
        description: "Swap 100 USDC for SOL",
        estimatedFee: estimatedFee || 0.005,
        riskLevel: "low",
        metadata: {
          inputAmount: 100,
          inputToken: "USDC",
          outputToken: "SOL",
          slippage: "0.5%"
        }
      });

      setSelectedApproval({ ...approval, tx });

      toastNotifications.approvalRequested("Swap Transaction");
    } catch (error: any) {
      toastNotifications.executionFailed("Swap", error.message);
    } finally {
      setIsExecuting(false);
    }
  }, [wallet.connected, wallet.publicKey, walletTx]);

  /**
   * Example: Execute SOL staking
   */
  const handleStake = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toastNotifications.executionFailed("Wallet", "Please connect your wallet first");
      return;
    }

    setIsExecuting(true);
    try {
      toastNotifications.executionStarted("SOL Staking");

      // Build stake transaction
      const { tx, estimatedFee } = await walletTx.buildStakeTransaction({
        amount: 10, // 10 SOL
        stakePool: "Stake11111111111111111111111111111111111111"
      });

      // Request approval
      const approval = walletTx.requestApproval({
        type: "yield",
        description: "Stake 10 SOL for yield",
        estimatedFee: estimatedFee || 0.005,
        riskLevel: "low",
        metadata: {
          amount: 10,
          token: "SOL",
          expectedAPY: "5-6%"
        }
      });

      setSelectedApproval({ ...approval, tx });

      toastNotifications.approvalRequested("SOL Staking Transaction");
    } catch (error: any) {
      toastNotifications.executionFailed("Staking", error.message);
    } finally {
      setIsExecuting(false);
    }
  }, [wallet.connected, wallet.publicKey, walletTx]);

  /**
   * Handle approval confirmation
   */
  const handleApprove = useCallback(async () => {
    if (!selectedApproval) return;

    try {
      const result = await walletTx.signAndSend(
        selectedApproval.tx,
        selectedApproval.id
      );

      if (result.confirmed) {
        toastNotifications.executionSuccess(
          "Transaction",
          `Confirmed: ${result.signature?.slice(0, 8)}...`
        );
        setSelectedApproval(null);
      } else {
        toastNotifications.executionFailed(
          "Transaction",
          result.error || "Transaction failed"
        );
      }
    } catch (error: any) {
      toastNotifications.executionFailed(
        "Signing",
        error.message
      );
    }
  }, [selectedApproval, walletTx]);

  /**
   * Handle approval rejection
   */
  const handleReject = useCallback(() => {
    toastNotifications.executionFailed(
      "Transaction",
      "Transaction rejected"
    );
    setSelectedApproval(null);
  }, []);

  if (!wallet.connected) {
    return (
      <div className="space-y-6 p-6 bg-slate-900 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-white font-semibold">Wallet Not Connected</p>
            <p className="text-slate-400 text-sm">
              Please connect your Solana wallet to proceed
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-400" />
            Wallet Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Status:</span>
            <span className="text-green-400 font-semibold">Connected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Address:</span>
            <span className="text-white font-mono text-sm">
              {wallet.publicKey?.toBase58().slice(0, 8)}...
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Swap Card */}
        <Card className="bg-slate-800 border-slate-700 hover:border-blue-600 transition-colors">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <ArrowRightLeft className="w-5 h-5 text-blue-400" />
              Token Swap
            </CardTitle>
            <CardDescription>
              Swap tokens via Jupiter DEX with best rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded bg-slate-700/50 text-sm text-slate-300">
                Swap 100 USDC for SOL with 0.5% slippage protection
              </div>
              <Button
                onClick={handleSwap}
                disabled={isExecuting || walletTx.loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isExecuting || walletTx.loading ? "Building..." : "Start Swap"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staking Card */}
        <Card className="bg-slate-800 border-slate-700 hover:border-green-600 transition-colors">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Coins className="w-5 h-5 text-green-400" />
              Stake SOL
            </CardTitle>
            <CardDescription>
              Earn yield by staking SOL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded bg-slate-700/50 text-sm text-slate-300">
                Stake 10 SOL to earn 5-6% APY
              </div>
              <Button
                onClick={handleStake}
                disabled={isExecuting || walletTx.loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isExecuting || walletTx.loading ? "Building..." : "Start Staking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {walletTx.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-200 font-semibold">Error</p>
              <p className="text-red-300 text-sm">{walletTx.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {walletTx.pendingApprovals.length > 0 && (
        <Card className="bg-yellow-500/10 border border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-200 text-lg">
              Pending Approvals ({walletTx.pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-yellow-200">
              {walletTx.pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex justify-between">
                  <span>{approval.description}</span>
                  <span className="text-yellow-100">◎{approval.estimatedFee.toFixed(6)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Signing Dialog */}
      <WalletSigningDialog
        isOpen={!!selectedApproval}
        approval={selectedApproval}
        tx={selectedApproval?.tx}
        isLoading={walletTx.signing}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

export default WalletIntegrationExample;
