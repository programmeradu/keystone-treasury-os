"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string;
  avatarSeed: string;
  walletAddress: string;
  role: string;
  tier: string;
  tierExpiresAt: string | null;
  onboardingCompleted: boolean;
  organizationName: string | null;
  createdAt: string;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'email' | 'avatarSeed' | 'organizationName'>>) => Promise<boolean>;
  refresh: () => void;
}

/**
 * Hook for fetching and updating the user profile from the DB-backed API.
 * Replaces localStorage-based profile management.
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCount = useRef(0);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/user/profile");
      if (res.status === 401) {
        // Not authenticated — this is expected for non-logged-in users
        setProfile(null);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch profile: ${res.status}`);
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      setError(msg);
      console.error("[useProfile] Fetch error:", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch once on mount
    if (fetchCount.current === 0) {
      fetchCount.current++;
      fetchProfile();
    }
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, 'displayName' | 'email' | 'avatarSeed' | 'organizationName'>>): Promise<boolean> => {
      try {
        setError(null);
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Update failed: ${res.status}`);
        }
        const data = await res.json();
        if (data.user) {
          setProfile((prev) => (prev ? { ...prev, ...data.user } : data.user));
        }
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update profile";
        setError(msg);
        console.error("[useProfile] Update error:", msg);
        return false;
      }
    },
    []
  );

  const refresh = useCallback(() => {
    fetchCount.current = 0;
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, error, updateProfile, refresh };
}
