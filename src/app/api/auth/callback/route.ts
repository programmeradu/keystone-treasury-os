/**
 * GET /api/auth/callback
 * 
 * OAuth callback handler for Supabase social login (Google, Discord).
 * After Supabase completes the OAuth flow, it redirects here with a code.
 * We exchange the code for a session and sync the user to Neon.
 */

import { sanitizeRedirect } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = sanitizeRedirect(searchParams.get('next'));

    if (!code) {
        // No code — redirect to auth page with error
        return NextResponse.redirect(`${origin}/auth?error=missing_code`);
    }

    try {
        const supabase = await createSupabaseServerClient();

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('[OAuth Callback] Exchange error:', error);
            return NextResponse.redirect(`${origin}/auth?error=exchange_failed`);
        }

        // ─── Sync social user to Neon ──────────────────────────────────
        if (db && data.user) {
            const supabaseId = data.user.id;
            const email = data.user.email;
            const provider = data.user.app_metadata?.provider || 'oauth';
            const displayName =
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                email?.split('@')[0] ||
                'User';
            const avatarUrl = data.user.user_metadata?.avatar_url;

            // Check if a Neon user already exists with this Supabase ID
            const existing = await db
                .select()
                .from(users)
                .where(eq(users.supabaseUserId, supabaseId))
                .limit(1);

            if (existing.length === 0) {
                // Create new Neon user for this social login
                await db.insert(users).values({
                    walletAddress: `social_${supabaseId}`, // placeholder until wallet linked
                    supabaseUserId: supabaseId,
                    displayName,
                    role: 'user',
                });
            } else {
                // Update last login
                await db
                    .update(users)
                    .set({
                        lastLoginAt: new Date(),
                        displayName, // refresh display name from provider
                    })
                    .where(eq(users.supabaseUserId, supabaseId));
            }
        }

        return NextResponse.redirect(`${origin}${next}`);
    } catch (err: any) {
        console.error('[OAuth Callback] Error:', err);
        return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
    }
}
