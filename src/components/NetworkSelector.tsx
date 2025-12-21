"use client";

import { useNetwork } from "@/lib/contexts/NetworkContext";

export function NetworkSelector() {
    const { network, setNetwork } = useNetwork();

    return (
        <button
            onClick={() => setNetwork(network === 'mainnet-beta' ? 'devnet' : 'mainnet-beta')}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${network === 'mainnet-beta' ? 'bg-primary/10 border-primary/20 hover:bg-primary/20' : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'}`}
        >
            <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${network === 'mainnet-beta' ? 'bg-primary' : 'bg-orange-500'}`} />
            <span className="text-xs font-medium text-foreground uppercase">{network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}</span>
        </button>
    );
}
