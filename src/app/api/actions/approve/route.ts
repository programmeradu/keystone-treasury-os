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
    title: "Approve Keystone Proposal",
    icon: "https://keystone-treasury-os.vercel.app/logo.png", // Replace with real URL if possible
    description: `Vote to approve proposal #${txIndex} for multisig ${vault.slice(0, 4)}...${vault.slice(-4)}.`,
    label: "Approve",
    links: {
      actions: [
        {
          label: "Approve",
          href: `/api/actions/approve?vault=${vault}&tx=${txIndex}&action=Approve`,
          type: "transaction"
        },
        {
          label: "Reject",
          href: `/api/actions/approve?vault=${vault}&tx=${txIndex}&action=Reject`,
          type: "transaction"
        }
      ]
    }
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = async () => Response.json({}, { headers: ACTIONS_CORS_HEADERS });

export const POST = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const vault = searchParams.get("vault")!;
    const txIndex = parseInt(searchParams.get("tx")!);
    const voteAction = (searchParams.get("action") || "Approve") as "Approve" | "Reject";

    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);

    // Initialize SquadsClient (no wallet needed as we just want the instruction)
    const squadsClient = new SquadsClient(CONNECTION, null);
    
    // Get the vote instruction
    const ix = squadsClient.getVoteInstruction(vault, txIndex, voteAction, account);

    const transaction = new Transaction().add(ix);
    transaction.feePayer = account;
    transaction.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;

    const response: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Voted ${voteAction} on proposal #${txIndex}`,
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Action error:", err);
    return Response.json({ error: "Failed to create transaction" }, { status: 500, headers: ACTIONS_CORS_HEADERS });
  }
};
