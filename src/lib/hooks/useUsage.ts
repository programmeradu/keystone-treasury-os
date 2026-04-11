"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TierLimits } from "@/lib/tier-config";

interface UsageMetric {
  current: number;
  limit: number;
  percent: number;
}

interface UsageData {
  tier: string;
  tierLabel: string;
  tierExpiresAt: string | null;
  isExpired: boolean;
  usage: {
    agentRuns: UsageMetric;
    teamMembers: UsageMetric;
    apiCallsPerHour: { limit: number };
  };
  limits: TierLimits;
  features: TierLimits["features"];
}

interface UseUsageReturn {
  data: UsageData | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useUsage(): UseUsageReturn {
  const [data, setData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/user/usage");
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchUsage();
    }
  }, [fetchUsage]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    fetchUsage();
  }, [fetchUsage]);

  return { data, isLoading, refresh };
}
