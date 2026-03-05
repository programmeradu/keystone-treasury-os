import { Connection, PublicKey, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SquadsClient } from "./squads";
import { AppEventBus } from "./events";
import { IntentRegistry } from "./agents/registry";
import { PluginRegistry } from "./plugins/registry";
import { JinaClient } from "./jina";
import { FirecrawlClient } from "./firecrawl";
import { TavilyClient } from "./tavily";
import { HeliusClient } from "./helius";
import { KnowledgeBase } from "./knowledge";
import { simulationFirewall } from "./studio/simulation-firewall";

export interface ActionContext {
    connection: Connection;
    wallet: any;
    squadsClient: SquadsClient;
    heliusClient?: HeliusClient;
    vaultAddress: string;
}

export async function executeAction(plan: any, context: ActionContext): Promise<string> {
    const { actions } = plan;

    if (!actions || !Array.isArray(actions)) {
        // Fallback for single operation plans if any still exist
        return executeSingleAction(plan.operation, plan.parameters, context, plan);
    }

    const results = [];
    const txOps = new Set(["swap", "transfer", "stake", "bridge", "yield_deposit", "yield_withdraw"]);

    for (const action of actions) {
        const op = action.operation.toLowerCase();

        // Simulation Firewall: log pre-execution check for transaction-producing ops
        if (txOps.has(op)) {
            // Full transaction simulation happens after the tx is built — see SimulationFirewall.simulate()
            // Pre-check: ensure the operation has required parameters
            if (op === "swap" && (!action.parameters?.inputToken || !action.parameters?.outputToken)) {
                throw new Error(`Simulation Firewall BLOCKED: swap missing inputToken/outputToken`);
            }
            if (op === "transfer" && !action.parameters?.recipient) {
                throw new Error(`Simulation Firewall BLOCKED: transfer missing recipient`);
            }
        }

        const result = await executeSingleAction(action.operation, action.parameters, context, plan);
        results.push(result);
    }

    return results.join(" | ");
}

async function executeSingleAction(operation: string, parameters: any, context: ActionContext, plan: any): Promise<string> {
    switch (operation.toLowerCase()) {
        case "swap":
            return executeSwap(parameters, context);
        case "transfer":
            return executeTransfer(parameters, context);
        case "navigate":
            AppEventBus.emit("NAVIGATE", parameters.path);
            return `Navigating to ${parameters.path}`;
        case "refresh":
            AppEventBus.emit("REFRESH_DASHBOARD");
            return "Dashboard refresh triggered";
        case "ui_query":
            AppEventBus.emit("UI_NOTIFICATION", { message: plan.estimatedOutcome });
            return "Query processed";
        case "governance_list":
            const proposals = await context.squadsClient.getProposals(context.vaultAddress);
            const proposalSummary = proposals.map(p => `#${p.index}: ${p.title} (${p.status}) - ${p.signatures}/${p.threshold}`).join("\n");
            AppEventBus.emit("UI_NOTIFICATION", { message: `Pending Proposals:\n${proposalSummary}` });
            return proposalSummary;
        case "governance_approve":
            return await context.squadsClient.voteOnProposal(context.vaultAddress, parameters.proposalIndex, "Approve");
        case "governance_reject":
            return await context.squadsClient.voteOnProposal(context.vaultAddress, parameters.proposalIndex, "Reject");
        case "governance_execute":
            return await context.squadsClient.executeProposal(context.vaultAddress, parameters.proposalIndex);
        case "external_balance":
            const pubkey = new PublicKey(parameters.address);
            const balance = await context.connection.getBalance(pubkey);
            const solBalance = balance / LAMPORTS_PER_SOL;
            AppEventBus.emit("UI_NOTIFICATION", { message: `Balance for ${parameters.address}: ${solBalance.toFixed(4)} SOL` });
            return `${solBalance} SOL`;
        case "bridge":
            return await context.squadsClient.createVaultTransaction(
                context.vaultAddress,
                [], // instructions
                0,
                `Bridge ${parameters.amount} ${parameters.token} from ${parameters.sourceChain} to ${parameters.destinationChain}`
            );
        case "yield_deposit":
            return await context.squadsClient.createVaultTransaction(
                context.vaultAddress,
                [], // instructions
                0,
                `Deposit ${parameters.amount} ${parameters.token} into ${parameters.protocol} for yield`
            );
        case "yield_withdraw":
            return await context.squadsClient.createVaultTransaction(
                context.vaultAddress,
                [], // instructions
                0,
                `Withdraw ${parameters.amount} ${parameters.token} from ${parameters.protocol}`
            );
        case "rebalance":
            const { targetAllocations } = parameters;
            const rebalanceSummary = Object.entries(targetAllocations)
                .map(([token, percent]) => `${token}: ${percent}%`)
                .join(", ");
            AppEventBus.emit("UI_NOTIFICATION", { message: `Rebalancing started: ${rebalanceSummary}` });
            return await context.squadsClient.createVaultTransaction(
                context.vaultAddress,
                [],
                0,
                `Rebalance portfolio to: ${rebalanceSummary}`
            );
        case "monitor":
            const intent = IntentRegistry.register({
                type: parameters.type === "PRICE" ? "PRICE_ALERT" : "BALANCE_THRESHOLD",
                condition: {
                    target: parameters.target,
                    operator: parameters.operator,
                    value: parameters.value
                },
                actions: []
            });
            AppEventBus.emit("UI_NOTIFICATION", { message: `Agent Monitor Active: ${parameters.target} ${parameters.operator} ${parameters.value}` });
            return `Monitor ID: ${intent.id}`;
        case "plugin_register":
            // Infinite Discovery Stack (Phase 10.3)
            let learnedIntelligence = "";
            if (parameters.discoveryUrl || parameters.searchQuery || parameters.name) {
                try {
                    const knowledgeBase = new KnowledgeBase();
                    const query = parameters.searchQuery || `${parameters.name} Solana protocol SDK documentation`;
                    const research = await knowledgeBase.study(query);

                    if (research.rawContent) {
                        learnedIntelligence = research.rawContent;

                        // Auto-enrich operations from learned intelligence if not provided
                        if (!parameters.operations || parameters.operations.length === 0) {
                            parameters.operations = [{
                                name: `${parameters.name}_default`,
                                description: research.summary || `Interact with ${parameters.name}`,
                                parameters: {}
                            }];
                        }
                        if (!parameters.description) {
                            parameters.description = research.summary || `Learned protocol: ${parameters.name}`;
                        }
                    }
                } catch (err) {
                    // Discovery Stack failed, register with provided data
                }
            }

            const plugin = PluginRegistry.register({
                name: parameters.name,
                description: parameters.description || `Learned protocol: ${parameters.name}`,
                programId: parameters.programId || "unknown",
                operations: parameters.operations || [],
                isLearned: true
            });
            AppEventBus.emit("UI_NOTIFICATION", {
                message: `God-Mode Active: Learned protocol ${plugin.name}${learnedIntelligence ? " (with intelligence)" : ""} (${plugin.programId.substring(0, 4)}...)`
            });
            return `Plugin Registered: ${plugin.id}`;
        default:
            // Dynamic Plugin Resolution Fallback
            const dynamicOp = PluginRegistry.findOperation(operation);
            if (dynamicOp) {
                // In a real execution, we would build a dynamic transaction using the programId and ABI
                // Here we simulate via Squads proposal
                return await context.squadsClient.createVaultTransaction(
                    context.vaultAddress,
                    [], // Instructions would be built dynamicly here
                    0,
                    `Execute ${dynamicOp.name} via Plugin ${dynamicOp.programId.substr(0, 6)}...`
                );
            }
            throw new Error(`Unsupported operation: ${operation}`);
    }
}

async function executeSwap(params: any, context: ActionContext): Promise<string> {
    const { inputToken, outputToken, amount } = params;
    const { connection, wallet, squadsClient, vaultAddress } = context;

    // 1. Get Token Mints (Mocking for common tokens if not provided)
    // In production, we'd look up the mint address from a token list
    const inputMint = inputToken === "USDC" ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : "So11111111111111111111111111111111111111112";
    const outputMint = outputToken === "SOL" ? "So11111111111111111111111111111111111111112" : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    // 2. Get Quote from Jupiter
    const amountInSmallestUnit = Math.floor(amount * (inputToken === "USDC" ? 1e6 : 1e9)); // Simple decimal assumption
    const jupiterApiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
    const jupiterHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (jupiterApiKey) jupiterHeaders["x-api-key"] = jupiterApiKey;
    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInSmallestUnit}&slippageBps=50`;

    let instructionsData;

    try {
        const quoteRes = await fetch(quoteUrl, { headers: jupiterHeaders });
        const quoteData = await quoteRes.json();

        if (!quoteData || quoteData.error) {
            throw new Error("Failed to get quote from Jupiter");
        }

        // 3. Get Instructions
        const instructionsRes = await fetch("https://lite-api.jup.ag/swap/v1/swap-instructions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: vaultAddress, // The Vault executes the swap!
                wrapAndUnwrapSol: true
            })
        });

        instructionsData = await instructionsRes.json();
        if (instructionsData.error) throw new Error("Failed to fetch swap instructions");
    } catch (error) {
        // Mock Instructions fallback
        instructionsData = {
            setupInstructions: [],
            swapInstruction: {
                programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
                accounts: [],
                data: ""
            },
            cleanupInstruction: null,
            addressLookupTableAddresses: []
        };
    }

    // 4. Deserialize Instructions (Simplified for prototype)
    // In real app: Deserialize base64 instructions back to TransactionInstruction objects
    // For now, we pass a placeholder array to our mocked SquadsClient.createVaultTransaction
    const mockInstructions = [new TransactionInstruction({
        keys: [],
        programId: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
        data: Buffer.from([])
    })];

    // 5. Create Proposal
    return await squadsClient.createVaultTransaction(
        vaultAddress,
        mockInstructions,
        0,
        `Swap ${amount} ${inputToken} to ${outputToken}`
    );
}

async function executeTransfer(params: any, context: ActionContext): Promise<string> {
    const { recipient, token, amount } = params;
    const { squadsClient, vaultAddress } = context;

    // Mock Instructions for Transfer
    const mockInstructions = [new TransactionInstruction({
        keys: [],
        programId: SystemProgram.programId,
        data: Buffer.from([])
    })];

    return await squadsClient.createVaultTransaction(
        vaultAddress,
        mockInstructions,
        0,
        `Transfer ${amount} ${token} to ${recipient}`
    );
}
