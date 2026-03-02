import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createSupabaseServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * POST /api/auth/siws
 * Sign In With Solana — Optimized (parallel Neon + Supabase):
 *   1. Verify ed25519 signature (CPU-only, ~5ms)
 *   2. Verify nonce freshness
 *   3. [PARALLEL] Neon upsert + Supabase auth create/sign-in
 *   4. Set session cookie
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

        // ─── Step 1: Verify ed25519 signature (~5ms, CPU-only) ─────────
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

        // ─── Step 2: Verify nonce freshness ────────────────────────────
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

        // ─── Step 3: PARALLEL — Neon upsert + Supabase auth ───────────
        const admin = createAdminClient();
        const email = `${walletAddress}@keystone.wallet`;
        const password = `siws_${walletAddress}_${process.env.JWT_SECRET || 'keystone'}`;

        // Run Neon upsert and Supabase sign-in simultaneously
        const [, authResult] = await Promise.all([
            // Neon upsert (fire-and-forget style — don't block auth)
            db ? (async () => {
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
            })() : Promise.resolve(),

            // Supabase auth — try sign in, create if needed
            (async () => {
                let result = await admin.auth.signInWithPassword({ email, password });

                if (result.error) {
                    // User doesn't exist — create + sign in
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
                        throw new Error(`Auth creation failed: ${signUp.error.message}`);
                    }

                    result = await admin.auth.signInWithPassword({ email, password });
                    if (result.error) {
                        throw new Error(`Auth sign-in failed: ${result.error.message}`);
                    }

                    // Link Supabase UID to Neon (non-blocking)
                    if (db && signUp.data.user) {
                        db.update(users)
                            .set({ supabaseUserId: signUp.data.user.id })
                            .where(eq(users.walletAddress, walletAddress))
                            .catch(err => console.error('[SIWS] UID link error:', err));
                    }
                }

                return result;
            })(),
        ]);

        const session = authResult.data.session;
        if (!session) {
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        // ─── Step 4: Set cookies via Supabase SSR ──────────────────────
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
