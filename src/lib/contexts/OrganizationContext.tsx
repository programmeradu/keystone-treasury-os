"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

interface Organization {
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgAvatar: string | null;
  orgTier: string;
  role: string;
}

interface OrganizationContextValue {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  switchOrg: (slug: string) => void;
  createOrg: (name: string) => Promise<string | null>;
  refresh: () => void;
}

const OrganizationCtx = createContext<OrganizationContextValue>({
  organizations: [],
  activeOrg: null,
  isLoading: true,
  switchOrg: () => {},
  createOrg: async () => null,
  refresh: () => {},
});

export function useOrganization() {
  return useContext(OrganizationCtx);
}

const ACTIVE_ORG_KEY = "keystone_active_org";

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchOrgs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/organizations");
      if (!res.ok) return;
      const data = await res.json();
      setOrganizations(data.organizations || []);

      // Restore active org from localStorage
      const saved = localStorage.getItem(ACTIVE_ORG_KEY);
      const orgs = data.organizations || [];
      if (saved && orgs.some((o: Organization) => o.orgSlug === saved)) {
        setActiveSlug(saved);
      } else if (orgs.length > 0) {
        setActiveSlug(orgs[0].orgSlug);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchOrgs();
    }
  }, [fetchOrgs]);

  const switchOrg = useCallback((slug: string) => {
    setActiveSlug(slug);
    localStorage.setItem(ACTIVE_ORG_KEY, slug);
  }, []);

  const createOrg = useCallback(async (name: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const slug = data.organization?.slug;
      fetchedRef.current = false;
      fetchOrgs();
      if (slug) switchOrg(slug);
      return slug;
    } catch {
      return null;
    }
  }, [fetchOrgs, switchOrg]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    fetchOrgs();
  }, [fetchOrgs]);

  const activeOrg = organizations.find((o) => o.orgSlug === activeSlug) || null;

  return (
    <OrganizationCtx.Provider value={{ organizations, activeOrg, isLoading, switchOrg, createOrg, refresh }}>
      {children}
    </OrganizationCtx.Provider>
  );
}
