import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createPostResponse,
} from "@solana/actions";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  clusterApiUrl,
} from "@solana/web3.js";
import { SquadsClient } from "@/lib/squads";

const CONNECTION = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta"));

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const vault = searchParams.get("vault");
  const txIndex = searchParams.get("tx");

  if (!vault || !txIndex) {
    return Response.json({ error: "Missing vault or tx parameter" }, { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const payload: ActionGetResponse = {
    title: "Execute Keystone Proposal",
    icon: "https://keystone-treasury-os.vercel.app/logo.png",
    description: `Execute proposal #${txIndex} for multisig ${vault.slice(0, 4)}...${vault.slice(-4)}. Only possible if quorum is reached.`,
    label: "Execute",
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = async () => Response.json({}, { headers: ACTIONS_CORS_HEADERS });

export const POST = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const vault = searchParams.get("vault")!;
    const txIndex = parseInt(searchParams.get("tx")!);
    const type = searchParams.get("type"); // 'config' or null (vault)

    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);

    const squadsClient = new SquadsClient(CONNECTION, null);
    
    let transaction: Transaction | VersionedTransaction;

    if (type === "config") {
      const ix = squadsClient.getConfigExecuteInstruction(vault, txIndex, account);
      transaction = new Transaction().add(ix);
      transaction.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;
      transaction.feePayer = account;
    } else {
      const executeRes = await squadsClient.getExecuteInstruction(vault, txIndex, account);
      const latestBlockhash = await CONNECTION.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: account,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [executeRes.instruction],
      }).compileToV0Message(executeRes.lookupTableAccounts ?? []);
      transaction = new VersionedTransaction(messageV0);
    }

    const response: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Executing proposal #${txIndex}`,
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Action error:", err);
    return Response.json({ error: "Failed to create transaction" }, { status: 500, headers: ACTIONS_CORS_HEADERS });
  }
};
