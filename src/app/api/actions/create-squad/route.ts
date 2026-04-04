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
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import { SquadsClient } from "@/lib/squads";

const CONNECTION = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta"));

export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    title: "Deploy Keystone Multisig",
    icon: "https://keystone-treasury-os.vercel.app/logo.png",
    description: "Create a new Squads V4 multisig vault for your team instantly. Define your threshold and member list below.",
    label: "Create Squad",
    links: {
      actions: [
        {
          label: "Create Squad",
          href: "/api/actions/create-squad",
          type: "transaction",
          parameters: [
            {
              name: "members",
              label: "Member Pubkeys (comma separated)",
              required: true,
              type: "text",
            },
            {
              name: "threshold",
              label: "Signature Threshold (e.g. 2)",
              required: true,
              type: "number",
            }
          ]
        }
      ]
    }
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = async () => Response.json({}, { headers: ACTIONS_CORS_HEADERS });

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);

    // Get parameters from body (Action spec usually sends them here or in href template)
    // The @solana/actions SDK typically handles parameters in the body if name matches
    const data = (body as any).data || {};
    const membersStr = data.members || "";
    const threshold = parseInt(data.threshold || "1");

    if (!membersStr) {
      return Response.json({ error: "At least one member is required" }, { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    const memberPubkeys = membersStr.split(",").map((p: string) => new PublicKey(p.trim()));
    // Always include the creator as a member if not already there
    if (!memberPubkeys.some((m: PublicKey) => m.equals(account))) {
      memberPubkeys.push(account);
    }

    const memberObjects = memberPubkeys.map((key: PublicKey) => ({
      key,
      permissions: { mask: 7 }, // Full permissions for everyone added via Blink
    }));

    const squadsClient = new SquadsClient(CONNECTION, null);
    
    // Generate the createKey server-side for the transaction
    const createKey = Keypair.generate();

    const ix = await squadsClient.getCreateMultisigInstruction({
      members: memberObjects,
      threshold,
      createKey: createKey.publicKey,
      creator: account,
    });

    const transaction = new Transaction().add(ix);
    transaction.feePayer = account;
    transaction.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;

    // The server MUST sign with the createKey since it's a required signer for the PDA derivation/creation
    transaction.partialSign(createKey);

    const response: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Deploying your new ${threshold}-of-${memberObjects.length} multisig!`,
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Action error:", err);
    return Response.json({ error: "Failed to create transaction" }, { status: 500, headers: ACTIONS_CORS_HEADERS });
  }
};
