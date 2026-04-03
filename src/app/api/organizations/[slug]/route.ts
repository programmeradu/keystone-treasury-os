import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, orgMembers, orgVaults } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * GET /api/organizations/[slug]
 * Get org details + vaults. Must be a member.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { slug } = await params;

  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify membership
    const [membership] = await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, user.id)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get vaults
    const vaults = await db
      .select()
      .from(orgVaults)
      .where(eq(orgVaults.orgId, org.id));

    // Get members
    const members = await db
      .select({
        userId: orgMembers.userId,
        role: orgMembers.role,
        joinedAt: orgMembers.joinedAt,
      })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, org.id));

    return NextResponse.json({
      organization: org,
      membership,
      vaults,
      members,
    });
  } catch (err) {
    console.error('[Org API] GET detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}

/**
 * PUT /api/organizations/[slug]
 * Update org details. Owner/Admin only. Body: { name?, avatarUrl? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { slug } = await params;

  try {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Check admin role
    const [membership] = await db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, user.id)))
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = String(body.name).trim();
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl || null;

    if (Object.keys(updates).length > 0) {
      await db.update(organizations).set(updates).where(eq(organizations.id, org.id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Org API] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
