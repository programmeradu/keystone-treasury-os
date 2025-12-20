"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { useBroadcastEvent, useEventListener } from "@/liveblocks.config";
import { AppEventBus } from "@/lib/events";

export function useSquadsMultisig(vaultAddress: string) {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const broadcast = useBroadcastEvent();

    const fetchProposals = async () => {
        if (!vaultAddress) return;
        setLoading(true);
        try {
            const client = new SquadsClient(connection, wallet);
            const data = await client.getProposals(vaultAddress);
            setProposals(data);
        } catch (error) {
            console.error("Failed to fetch proposals", error);
        } finally {
            setLoading(false);
        }
    };

    // Listen for signature events from others
    useEventListener(({ event }) => {
        if (event.type === "PROPOSAL_SIGNED") {
            AppEventBus.emit("UI_NOTIFICATION", {
                message: `📢 ${event.payload.signer} just signed Proposal #${event.payload.proposalId}`,
            });
            fetchProposals(); // Refresh to show new signature count
        }
    });

    const signProposal = async (proposalId: number) => {
        if (!wallet.publicKey) return;

        try {
            const client = new SquadsClient(connection, wallet);
            // In a real app, this would be a real transaction
            const sig = await client.voteOnProposal(vaultAddress, proposalId, "Approve");

            // Broadcast to others
            broadcast({
                type: "PROPOSAL_SIGNED",
                payload: {
                    proposalId,
                    signer: wallet.publicKey.toBase58().substring(0, 4) + "...",
                },
            });

            AppEventBus.emit("UI_NOTIFICATION", {
                message: "✅ You signed the proposal. Syncing with team...",
            });

            await fetchProposals();
            return sig;
        } catch (error) {
            console.error("Signing failed", error);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, [vaultAddress]);

    return {
        proposals,
        loading,
        refresh: fetchProposals,
        signProposal
    };
}
