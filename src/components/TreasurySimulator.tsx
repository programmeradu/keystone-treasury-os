import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, TrendingUp, Calendar, Shield, Layers, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
interface SimulationData {
  vesting?: { schedule: string; projection: number[]; risks: string[] };
  yield?: { apy: number; compound: number[]; il: number };
  risk?: { volatility: number; gas: number; slippage: number };
  rebalance?: { from: string; to: string; value: number; cost: number };
}

// Parse command for sim types (simple keyword matching)
function parseCommand(command: string): { type: 'vesting' | 'yield' | 'risk' | 'rebalance' | 'none'; params: any } {
  const lower = command.toLowerCase();
  if (lower.includes('vest') || lower.includes('vesting')) {
    return { type: 'vesting', params: { amount: extractAmount(lower), duration: extractDuration(lower) || 12 } };
  } else if (lower.includes('stake') || lower.includes('yield') || lower.includes('farm')) {
    return { type: 'yield', params: { amount: extractAmount(lower), apy: extractAPY(lower) || 5 } };
  } else if (lower.includes('risk') || lower.includes('simulate')) {
    return { type: 'risk', params: { amount: extractAmount(lower) } };
  } else if (lower.includes('rebalance') || lower.includes('swap')) {
    return { type: 'rebalance', params: { from: extractAsset(lower, 'from'), to: extractAsset(lower, 'to'), amount: extractAmount(lower) } };
  }
  return { type: 'none', params: {} };
}

function extractAmount(text: string): number {
  const match = text.match(/(\\d+(?:\\.\\d+)?)(k|m)?/i);
  if (!match) return 100000;
  let amt = parseFloat(match[1]);
  if (match[2]?.toLowerCase() === 'k') amt *= 1000;
  if (match[2]?.toLowerCase() === 'm') amt *= 1000000;
  return amt;
}

function extractDuration(text: string): number | null {
  const match = text.match(/(\\d+)(months?|years?)/i);
  return match ? parseInt(match[1]) * (match[2].toLowerCase().includes('year') ? 12 : 1) : null;
}

function extractAPY(text: string): number | null {
  const match = text.match(/(\\d+)%?\\s*apy/i);
  return match ? parseFloat(match[1]) : null;
}

function extractAsset(text: string, dir: 'from' | 'to'): string {
  const assets = { usdc: 'USDC', eth: 'ETH', dai: 'DAI' };
  const key = Object.keys(assets).find(k => text.includes(k) && text.includes(dir === 'from' ? 'from' : 'to'));
  return key ? assets[key as keyof typeof assets] : 'USDC';
}

// Mock vesting projection (linear release)
function generateVestingProjection(amount: number, months: number): number[] {
  return Array.from({ length: Math.ceil(months / 3) }, (_, i) => amount * (i + 1) / Math.ceil(months / 3));
}

// Mock yield projection (compounding)
function generateYieldProjection(amount: number, apy: number, periods: number = 12): number[] {
  const monthlyRate = apy / 100 / 12;
  return Array.from({ length: periods }, (_, i) => amount * Math.pow(1 + monthlyRate, i + 1));
}

// Mock risk scores (0-100)
function generateRisks(amount: number): { volatility: number; gas: number; slippage: number } {
  return {
    volatility: Math.min(80, amount / 10000),
    gas: 20 + Math.random() * 30,
    slippage: 0.5 + Math.random() * 1.5
  };
}

// Mock rebalance
function generateRebalance(from: string, to: string, amount: number): { from: string; to: string; value: number; cost: number } {
  return { from, to, value: amount * 0.99, cost: amount * 0.005 };
}

export default function TreasurySimulator({ command, loading }: { command?: string; loading: boolean }) {
  const [simData, setSimData] = useState<SimulationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    if (!command || loading) {
      setSimData(null);
      setError(null);
      return;
    }
    try {
      const { type, params } = parseCommand(command);
      let data: SimulationData = {};
      switch (type) {
        case 'vesting':
          data.vesting = {
            schedule: `Linear over ${params.duration} months`,
            projection: generateVestingProjection(params.amount, params.duration),
            risks: ['Cliff: 3 months', 'Lockup: Full amount secured']
          };
          break;
        case 'yield':
          const proj = generateYieldProjection(params.amount, params.apy, 12);
          data.yield = {
            apy: params.apy,
            compound: proj,
            il: Math.random() * 2 // mock IL
          };
          break;
        case 'risk':
          data.risk = generateRisks(params.amount);
          break;
        case 'rebalance':
          data.rebalance = generateRebalance(params.from, params.to, params.amount);
          break;
        default:
          throw new Error('Unsupported simulation type');
      }
      setSimData(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [command, loading]);

  if (loading) {
    return (
      <Card className="border-border/70 bg-background/60">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Treasury Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-4">
            Loading simulation...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  if (!simData) return null;

  return null;
}