"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Vote, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface Proposal {
  id: string;
  title: string;
  protocol: string;
  status: "active" | "passed" | "rejected" | "pending";
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endsAt: string;
  description?: string;
  quorumReached: boolean;
}

export function GovernanceDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">("active");

  const fetchProposals = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/solana/governance?status=${filterStatus}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch governance proposals");
      }
      
      setProposals(data.proposals || []);
      if (data.proposals?.length > 0 && !selectedProposal) {
        setSelectedProposal(data.proposals[0].id);
      }
    } catch (e: any) {
      setError(e.message || String(e));
      toast.error("Failed to load governance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedProposal(null);
    fetchProposals();
  }, [filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "passed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    }
  };

  const calculateTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff < 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const selectedProposalData = proposals.find(p => p.id === selectedProposal);

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <Vote className="h-4 w-4" />
                <span>🗳️ Governance Dashboard</span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
                DAOs
              </Badge>
              <Button size="sm" variant="outline" onClick={fetchProposals} disabled={loading} className="h-6 px-2 text-[11px] rounded-md">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
          <div className="text-xs opacity-70">
            Track active governance proposals across Solana DAOs and vote with your tokens.
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterStatus === "all" ? "default" : "secondary"}
              onClick={() => setFilterStatus("all")}
              className="h-7 px-3 text-[11px]"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterStatus === "active" ? "default" : "secondary"}
              onClick={() => setFilterStatus("active")}
              className="h-7 px-3 text-[11px]"
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={filterStatus === "closed" ? "default" : "secondary"}
              onClick={() => setFilterStatus("closed")}
              className="h-7 px-3 text-[11px]"
            >
              Closed
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && proposals.length === 0 && (
            <div className="text-xs opacity-70 text-center py-4">
              No proposals found for the selected filter.
            </div>
          )}

          {!loading && !error && proposals.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Proposals List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {proposals.map((proposal) => (
                  <button
                    key={proposal.id}
                    onClick={() => setSelectedProposal(proposal.id)}
                    className={`relative overflow-hidden w-full text-left rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)] ${
                      selectedProposal === proposal.id ? "bg-muted/50 border border-border" : ""
                    }`}
                  >
                    <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium line-clamp-1">{proposal.title}</span>
                      <Badge className={`text-[10px] ${getStatusColor(proposal.status)}`}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] opacity-70">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {proposal.protocol}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {calculateTimeRemaining(proposal.endsAt)}
                      </span>
                    </div>
                    {/* Vote bar */}
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${proposal.totalVotes > 0 ? (proposal.votesFor / proposal.totalVotes) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* Proposal Details */}
              <div className="space-y-2 text-xs">
                {selectedProposalData ? (
                  <>
                    <div className="rounded-md p-3 bg-muted/30">
                      <div className="font-medium mb-2">{selectedProposalData.title}</div>
                      <div className="space-y-1 opacity-80">
                        <div className="flex justify-between">
                          <span>Protocol:</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {selectedProposalData.protocol}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge className={`text-[10px] ${getStatusColor(selectedProposalData.status)}`}>
                            {selectedProposalData.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Ends:</span>
                          <span>{calculateTimeRemaining(selectedProposalData.endsAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Voting Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md p-2 bg-emerald-500/10 border border-emerald-500/30">
                        <div className="text-[10px] opacity-70">For</div>
                        <div className="font-mono text-sm font-bold text-emerald-500">
                          {selectedProposalData.votesFor.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-md p-2 bg-red-500/10 border border-red-500/30">
                        <div className="text-[10px] opacity-70">Against</div>
                        <div className="font-mono text-sm font-bold text-red-500">
                          {selectedProposalData.votesAgainst.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Quorum Status */}
                    <div className={`rounded-md p-2 ${selectedProposalData.quorumReached ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                      <div className="flex items-center justify-between">
                        <span>Quorum Status</span>
                        <Badge variant={selectedProposalData.quorumReached ? "default" : "secondary"} className="text-[10px]">
                          {selectedProposalData.quorumReached ? "Reached" : "Not Reached"}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedProposalData.description && (
                      <div className="rounded-md p-2 bg-muted/30 text-[11px] opacity-80 line-clamp-3">
                        {selectedProposalData.description}
                      </div>
                    )}

                    {/* Vote Button */}
                    {selectedProposalData.status === "active" && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => toast.info("Voting integration coming soon!", { description: "Connect your wallet and visit the protocol's governance portal." })}
                      >
                        <Vote className="h-4 w-4 mr-2" />
                        Vote on Proposal
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-xs opacity-70 text-center py-8">
                    Select a proposal to view details
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
