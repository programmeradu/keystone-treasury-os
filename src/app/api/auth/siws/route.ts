import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createSupabaseServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * POST /api/auth/siws
 * Sign In With Solana:
 *   1. Verify ed25519 signature against the wallet's public key
 *   2. Upsert user in Neon `users` table
 *   3. Mint a Supabase custom JWT via admin.auth.admin.generateLink or signInWithIdToken
 *   4. Set session cookie (handled by Supabase SSR)
 */
export async function POST(request: NextRequest) {
    try {
        const { message, signature, walletAddress } = await request.json();

        if (!message || !signature || !walletAddress) {
            return NextResponse.json(
                { error: 'Missing message, signature, or walletAddress' },
                { status: 400 }
            );
        }

        // ─── Step 1: Verify ed25519 signature ──────────────────────────
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(walletAddress);

        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // ─── Step 2: Verify nonce freshness (from message) ─────────────
        const timestampMatch = message.match(/Timestamp:\s*(.+)/);
        if (timestampMatch) {
            const messageTime = new Date(timestampMatch[1]).getTime();
            const now = Date.now();
            const FIVE_MINUTES = 5 * 60 * 1000;
            if (Math.abs(now - messageTime) > FIVE_MINUTES) {
                return NextResponse.json(
                    { error: 'Message expired. Please try again.' },
                    { status: 401 }
                );
            }
        }

        // ─── Step 3: Upsert user in Neon ───────────────────────────────
        if (db) {
            const existing = await db
                .select()
                .from(users)
                .where(eq(users.walletAddress, walletAddress))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(users).values({
                    walletAddress,
                    role: 'user',
                    displayName: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
                });
            } else {
                await db
                    .update(users)
                    .set({ lastLoginAt: new Date() })
                    .where(eq(users.walletAddress, walletAddress));
            }
        }

        // ─── Step 4: Create Supabase Auth session ──────────────────────
        const admin = createAdminClient();

        // Email-based strategy: use wallet as deterministic email
        const email = `${walletAddress}@keystone.wallet`;
        const password = `siws_${walletAddress}_${process.env.JWT_SECRET || 'keystone'}`;

        // Try sign in first, create if user doesn't exist
        let authResult = await admin.auth.signInWithPassword({ email, password });

        if (authResult.error) {
            // User doesn't exist yet — create
            const signUp = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    wallet_address: walletAddress,
                    auth_method: 'siws',
                },
            });

            if (signUp.error) {
                return NextResponse.json(
                    { error: `Auth creation failed: ${signUp.error.message}` },
                    { status: 500 }
                );
            }

            // Now sign in
            authResult = await admin.auth.signInWithPassword({ email, password });
            if (authResult.error) {
                return NextResponse.json(
                    { error: `Auth sign-in failed: ${authResult.error.message}` },
                    { status: 500 }
                );
            }

            // Update Neon user with Supabase UID
            if (db && signUp.data.user) {
                await db
                    .update(users)
                    .set({ supabaseUserId: signUp.data.user.id })
                    .where(eq(users.walletAddress, walletAddress));
            }
        }

        const session = authResult.data.session;
        if (!session) {
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        // ─── Step 5: Set cookies via Supabase SSR ──────────────────────
        const supabase = await createSupabaseServerClient();
        await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        });

        return NextResponse.json({
            user: {
                id: session.user.id,
                walletAddress,
                email: session.user.email,
            },
            accessToken: session.access_token,
        });
    } catch (err: any) {
        console.error('[SIWS] Auth error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/auth/siws
 * Get current session from Supabase cookies.
 */
export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            return NextResponse.json({ user: null });
        }

        return NextResponse.json({
            user: {
                id: session.user.id,
                walletAddress: session.user.user_metadata?.wallet_address,
                email: session.user.email,
            },
        });
    } catch {
        return NextResponse.json({ user: null });
    }
}

/**
 * DELETE /api/auth/siws
 * Sign out — clear Supabase session + cookies.
 */
export async function DELETE() {
    try {
        const supabase = await createSupabaseServerClient();
        await supabase.auth.signOut();
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
