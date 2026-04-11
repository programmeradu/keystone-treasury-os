import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * GET /api/organizations
 * Returns all organizations the user belongs to.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const memberships = await db
      .select({
        orgId: orgMembers.orgId,
        role: orgMembers.role,
        joinedAt: orgMembers.joinedAt,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgAvatar: organizations.avatarUrl,
        orgTier: organizations.tier,
        orgCreatedAt: organizations.createdAt,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .where(eq(orgMembers.userId, user.id));

    return NextResponse.json({ organizations: memberships });
  } catch (err) {
    console.error('[Org API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

/**
 * POST /api/organizations
 * Create a new organization. Body: { name, slug? }
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // Generate slug from name if not provided
    const slug = body.slug
      ? String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `-${Date.now().toString(36).slice(-4)}`;

    // Check slug uniqueness
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Organization slug already taken' }, { status: 409 });
    }

    // Create org
    const [org] = await db.insert(organizations).values({
      name,
      slug,
      avatarUrl: body.avatarUrl || null,
      createdBy: user.id,
    }).returning();

    // Add creator as owner
    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.id,
      role: 'owner',
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (err) {
    console.error('[Org API] POST error:', err);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
