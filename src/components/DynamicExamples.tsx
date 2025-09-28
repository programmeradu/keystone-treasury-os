import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface DynamicExamplesProps {
  onExampleSelect: (example: string) => void;
}

export function DynamicExamples({ onExampleSelect }: DynamicExamplesProps) {
  const [examples, setExamples] = useState<string[]>([
    "Bridge 100k USDC from ETH to Base, stake in Aave at current APY, then vest 20% linearly over 6 months to DAO treasury",
    "Swap 50 ETH to USDC on Polygon, bridge to Arbitrum, lend in Compound for 3 months projection",
    "Rebalance 200k treasury: 50% stake in Pendle on Base, 30% bridge to Optimism for Morpho yields"
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshExamples = async () => {
      if (typeof window !== 'undefined' && (window as any).puter?.ai) {
        setLoading(true);
        try {
          const response = await (window as any).puter.ai.chat(
            "Generate 3 fresh, diverse natural language examples for Web3 treasury simulations. Include varied actions (bridge, swap, stake, lend, rebalance, vest), realistic amounts (e.g., 50k USDC, 200 ETH, 1M DAI), chains (ETH, Base, Arbitrum, Polygon, Optimism, Solana), protocols (Aave, Yearn, Morpho, Pendle, Compound, GMX, Drift), and timeframes (3 months, 12 months, cliff vesting). Keep each under 120 chars, varied scenarios for DAOs/treasuries.",
            { model: 'gpt-4o-mini', temperature: 0.8 } // Creative but controlled
          );
          // Robust parsing: Extract prompts from response (handle lists, numbers)
          const lines = response.split('\n').filter((line: string) => line.trim() && line.includes(' '));
          const newExamples = lines.slice(0, 3).map((line: string) => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
          if (newExamples.length >= 2) { // Fallback if incomplete
            setExamples(newExamples);
          }
        } catch (err) {
          console.warn('Puter.js example gen failed:', err); // Graceful degrade
        } finally {
          setLoading(false);
        }
      }
    };

    refreshExamples(); // Run on mount/refresh

    // Re-run on visibility change (e.g., tab refresh) for "every refresh" feel
    const handleVisibility = () => document.visibilityState === 'visible' && refreshExamples();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {loading ? (
        <div className="px-3 py-1 rounded-md border border-border/70 bg-background/60 text-muted-foreground">
          Generating fresh examples...
        </div>
      ) : (
        examples.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onExampleSelect(ex)}
            className="px-3 py-1 rounded-md border border-border/70 bg-background/60 hover:bg-background/80 text-left transition-colors"
          >
            {ex.length > 80 ? `${ex.substring(0, 80)}...` : ex}
          </button>
        ))
      )}
    </div>
  );
}