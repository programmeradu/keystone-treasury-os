"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TeamMember {
  id: number;
  userId: string;
  walletAddress: string;
  role: string;
  status: string;
  displayName: string | null;
  avatarUrl: string | null;
  acceptedAt: string | null;
  invitedAt: string | null;
}

interface Team {
  teamId: string;
  teamName: string;
  role: string;
  status: string;
  vaultAddress: string | null;
  teamCreatedAt: string;
}

interface UseTeamReturn {
  teams: Team[];
  activeTeam: Team | null;
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  createTeam: (name: string, vaultAddress?: string) => Promise<string | null>;
  fetchMembers: (teamId: string) => void;
  changeRole: (teamId: string, userId: string, role: string) => Promise<boolean>;
  removeMember: (teamId: string, userId: string) => Promise<boolean>;
  refresh: () => void;
}

export function useTeam(): UseTeamReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/team/my-teams");
      if (res.status === 401) { setTeams([]); return; }
      if (!res.ok) throw new Error("Failed to fetch teams");
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTeams();
    }
  }, [fetchTeams]);

  const fetchMembers = useCallback(async (teamId: string) => {
    try {
      const res = await fetch(`/api/team/${teamId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    }
  }, []);

  const createTeam = useCallback(async (name: string, vaultAddress?: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, vaultAddress }),
      });
      if (!res.ok) throw new Error("Failed to create team");
      const data = await res.json();
      fetchedRef.current = false;
      fetchTeams();
      return data.team?.id || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
      return null;
    }
  }, [fetchTeams]);

  const changeRole = useCallback(async (teamId: string, userId: string, role: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/team/${teamId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to change role");
      }
      fetchMembers(teamId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
      return false;
    }
  }, [fetchMembers]);

  const removeMember = useCallback(async (teamId: string, userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/team/${teamId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }
      fetchMembers(teamId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
      return false;
    }
  }, [fetchMembers]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    fetchTeams();
  }, [fetchTeams]);

  const activeTeam = teams.length > 0 ? teams[0] : null;

  return { teams, activeTeam, members, isLoading, error, createTeam, fetchMembers, changeRole, removeMember, refresh };
}
