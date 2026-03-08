import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Browser Client (public, for client components) ──────────────────
export function createBrowserClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured.');
    }

    return createClient(url, anonKey);
}

// ─── Server Client (for API routes and server components) ────────────
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured.');
    }

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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured.');
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
