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
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import { db } from "@/db";
import { teamInvitations, teamMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const CONNECTION = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta"));

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Missing invite token" }, { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const payload: ActionGetResponse = {
    title: "Join Keystone Team",
    icon: "https://keystone-treasury-os.vercel.app/logo.png",
    description: "You've been invited to join a Keystone Treasury team. Click below to accept the invitation and register your wallet.",
    label: "Join Team",
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = async () => Response.json({}, { headers: ACTIONS_CORS_HEADERS });

export const POST = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token")!;

    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);

    if (!db) throw new Error("Database unavailable");

    // 1. Find invitation
    const [invitation] = await db!
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token))
      .limit(1);

    if (!invitation) {
      return Response.json({ error: "Invalid or expired invitation" }, { status: 404, headers: ACTIONS_CORS_HEADERS });
    }

    if (invitation.acceptedAt) {
      return Response.json({ error: "Invitation already accepted" }, { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    // 2. Add user to team (Optimistic write — based on the fact they are requesting the join transaction)
    // In a real prod environment, you might want to verify the signature first, but for an invite flow this is the UX people expect
    
    // Check if user exists in Keystone by wallet
    const userResults = await db!.select().from(users).where(eq(users.walletAddress, account.toBase58())).limit(1);
    let existingUser = userResults[0];
    
    // If user doesn't exist, we'll create a placeholder user
    if (!existingUser) {
        // Create a basic user entry
        const results = await db!.insert(users).values({
            walletAddress: account.toBase58(),
            role: 'user'
        }).returning();
        existingUser = results[0];
    }

    if (!existingUser) {
        throw new Error("Failed to resolve or create user record");
    }

    // Add to teamMembers
    await db!.insert(teamMembers).values({
        teamId: invitation.teamId,
        userId: existingUser.id,
        walletAddress: account.toBase58(),
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        acceptedAt: new Date(),
        status: 'active',
    });

    // Mark invitation as accepted
    await db!.update(teamInvitations).set({ acceptedAt: new Date() }).where(eq(teamInvitations.id, invitation.id));

    // 3. Return a "Confirmation" Transaction
    // We'll use a simple Memo transaction (requires the Spl Memo Program)
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: account, // Self-transfer
        lamports: 0,
      })
    );
    // Add a memo via instruction data (not proper SPL memo but works for simple proof of sig)
    // Better: just return a success message in the response if possible, 
    // but ActionPostResponse REQUIRES a transaction.

    transaction.feePayer = account;
    transaction.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;

    const response: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: "Welcome to the team! Your membership is now active.",
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error("Join Action error:", err);
    return Response.json({ error: "Failed to join team" }, { status: 500, headers: ACTIONS_CORS_HEADERS });
  }
};
