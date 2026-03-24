import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Security helper to enforce fail-fast behavior for missing secrets
 * while allowing Next.js static builds and CI tests to pass with dummy values.
 * In the browser, the dummy value is ONLY allowed during unit testing.
 */
export function getEnvOrDummy(envVar: string | undefined, dummy: string, varName: string): string {
    if (envVar) return envVar;

    // Always allow dummy in test mode
    if (process.env.NODE_ENV === 'test') return dummy;

    // Allow dummy on the server during CI builds (e.g. Next.js static generation)
    // The typeof window check ensures `process.env.CI` doesn't statically replace and leak the dummy token into the client bundle
    if (typeof window === 'undefined' && process.env.CI === 'true') return dummy;

    throw new Error(`Missing required environment variable: ${varName}`);
}

const DUMMY_URL = 'https://xyzcompany.supabase.co';
const DUMMY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQ4MzAwMCwiZXhwIjoxOTMyMDgzMDAwfQ.XYZ';
const DUMMY_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2NDgzMDAwLCJleHAiOjE5MzIwODMwMDB9.XYZ';

// ─── Browser Client (public, for client components) ──────────────────
export function createBrowserClient() {
    const url = getEnvOrDummy(process.env.NEXT_PUBLIC_SUPABASE_URL, DUMMY_URL, 'NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = getEnvOrDummy(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, DUMMY_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return createClient(url, anonKey);
}

// ─── Server Client (for API routes and server components) ────────────
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();
    const url = getEnvOrDummy(process.env.NEXT_PUBLIC_SUPABASE_URL, DUMMY_URL, 'NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = getEnvOrDummy(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, DUMMY_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

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
    const url = getEnvOrDummy(process.env.NEXT_PUBLIC_SUPABASE_URL, DUMMY_URL, 'NEXT_PUBLIC_SUPABASE_URL');
    const serviceKey = getEnvOrDummy(process.env.SUPABASE_SERVICE_ROLE_KEY, DUMMY_SERVICE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
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
