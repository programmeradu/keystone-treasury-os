import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

/**
 * GET /api/auth/nonce
 * Generate a random nonce for SIWS message construction.
 * The frontend builds a message like:
 *   "Sign in to Keystone\nNonce: <nonce>\nTimestamp: <iso>"
 * and asks the wallet to sign it.
 */
export async function GET() {
    const nonce = randomBytes(32).toString('hex');
    return NextResponse.json({ nonce }, {
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}
