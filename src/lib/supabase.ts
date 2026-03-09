import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Browser Client (public, for client components) ──────────────────
export function createBrowserClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQ4MzAwMCwiZXhwIjoxOTMyMDgzMDAwfQ.XYZ';
    return createClient(url, anonKey);
}

// ─── Server Client (for API routes and server components) ────────────
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQ4MzAwMCwiZXhwIjoxOTMyMDgzMDAwfQ.XYZ';

    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // Called from Server Component — cookie setting is no-op
                }
            },
        },
    });
}

// ─── Admin Client (service role — server-only, bypasses RLS) ─────────
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        if (process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build') {
            return createClient(url, 'build_placeholder', {
                auth: { autoRefreshToken: false, persistSession: false },
            });
        }
        throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    }
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

// ─── Storage Helpers ─────────────────────────────────────────────────
export const STORAGE_BUCKETS = {
    APP_SCREENSHOTS: 'app-screenshots',
    APP_EXPORTS: 'app-exports',
    AVATARS: 'avatars',
} as const;

/**
 * Upload a file to Supabase Storage.
 */
export async function uploadToStorage(
    bucket: string,
    path: string,
    file: Blob | Buffer,
    contentType = 'image/png'
) {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
        .from(bucket)
        .upload(path, file, {
            contentType,
            upsert: true,
        });
    if (error) throw error;
    const { data: urlData } = admin.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
}
