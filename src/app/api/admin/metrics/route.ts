import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { users, dcaBots, dcaExecutions, agentExecutions, agentApprovals, miniApps, userInstalledApps, 
         reviews, purchases, teams, teamMembers, teamInvitations, notificationPreferences, 
         alerts, monitors, rateLimits, knowledgeEntries, atlasSessions, foresightPredictions, 
         transactionCache, analyticsSnapshots, airdropClaims, runs } from "@/db/schema";
import { jwtVerify } from "jose";

// Force Node.js runtime for JWT and heavy aggregations
export const runtime = "nodejs";

// Use 60 second revalidation for the dashboard to keep it fresh but avoid DB spam
export const revalidate = 60; 

function getAdminToken(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    const siwsCookie = req.cookies.get("keystone-siws-session")?.value;
    if (siwsCookie) return siwsCookie;
    
    // Fallback for Better Auth / Neon Auth users
    const neonCookie = req.cookies.get("better-auth.session_token")?.value 
                    || req.cookies.get("__Secure-neon-auth.session_token")?.value
                    || req.cookies.get("neon-auth.session_token")?.value;
    if (neonCookie) return neonCookie;

    return null;
}

export async function GET(req: NextRequest) {
    try {
        if (!db) {
            return NextResponse.json({ error: "Database not configured" }, { status: 500 });
        }

        // verify admin status
        const token = getAdminToken(req);
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let decoded: any;
        try {
            const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
            if (!jwtSecret) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
            const secret = new TextEncoder().encode(jwtSecret);
            const result = await jwtVerify(token, secret);
            decoded = result.payload;
            
            // Check Live DB Role (JWT might be stale)
            const wallet = decoded.wallet || decoded.sub;
            const liveUser = await db.query.users.findFirst({
                where: (u, { eq }) => eq(u.walletAddress, wallet as string)
            });
            
            if (!liveUser || liveUser.role !== "admin") {
                return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Run all queries concurrently
        const [
            // Panel 1: User Growth
            totalUsersData,
            newUsers24hData,
            newUsers7dData,
            onboardingData,
            emailUsersData,
            
            // Panel 2: Revenue & Tiers
            tierBreakdownData,
            marketplaceRevenueData,
            marketplaceVolumeData,
            creatorPayoutsData,
            
            // Panel 3: AI Agents
            totalExecutionsData,
            executions24hData,
            executionsStatusData,
            totalGasAgentData,
            approvalsData,
            aiRunsData,

            // Panel 4: DCA Bots
            activeBotsData,
            botsStatusData,
            dcaVolumeData,
            dcaVolume24hData,
            dcaExecutions24hData,

            // Panel 5: Marketplace
            totalAppsData,
            publishedAppsData,
            totalInstallsData,
            activeInstallsData,
            
            // Panel 6: Teams
            totalTeamsData,
            vaultLinkedTeamsData,
            teamInvitesData,
            
            // Panel 7: On-Chain & Analytics
            txVolumeData,
            airdropClaimsData,
            
            // Panel 8: System Health
            monitorsData,
            rateLimitsData,
            atlasSessionsData,
            foresightData,
        ] = await Promise.all([
            // Panel 1: User Growth
            db!.select({ count: sql<number>`count(*)::int` }).from(users),
            db!.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`created_at >= ${oneDayAgo}`),
            db!.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`created_at >= ${sevenDaysAgo}`),
            db!.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`onboarding_completed = true`),
            db!.select({ count: sql<number>`count(*)::int` }).from(users).where(sql`email IS NOT NULL`),

            // Panel 2: Revenue & Tiers
            db!.select({ tier: users.tier, count: sql<number>`count(*)::int` }).from(users).groupBy(users.tier),
            db!.select({ rev: sql<number>`sum(keystone_fee)` }).from(purchases),
            db!.select({ vol: sql<number>`sum(amount_usdc)` }).from(purchases),
            db!.select({ payout: sql<number>`sum(creator_payout)` }).from(purchases),

            // Panel 3: AI Agents
            db!.select({ count: sql<number>`count(*)::int` }).from(agentExecutions),
            db!.select({ count: sql<number>`count(*)::int` }).from(agentExecutions).where(sql`created_at >= ${oneDayAgo}`),
            db!.select({ status: agentExecutions.status, count: sql<number>`count(*)::int` }).from(agentExecutions).groupBy(agentExecutions.status),
            db!.select({ gas: sql<number>`sum(actual_gas)` }).from(agentExecutions),
            db!.select({
                total: sql<number>`count(*)::int`, 
                approved: sql<number>`sum(case when approved = true then 1 else 0 end)::int` 
            }).from(agentApprovals),
            db!.select({ count: sql<number>`count(*)::int` }).from(runs),

            // Panel 4: DCA Bots
            db!.select({ count: sql<number>`count(*)::int` }).from(dcaBots).where(sql`status = 'active'`),
            db!.select({ status: dcaBots.status, count: sql<number>`count(*)::int` }).from(dcaBots).groupBy(dcaBots.status),
            db!.select({ vol: sql<number>`sum(total_invested)` }).from(dcaBots),
            db!.select({ vol: sql<number>`sum(payment_amount)` }).from(dcaExecutions).where(sql`executed_at >= ${oneDayAgo}`),
            db!.select({ count: sql<number>`count(*)::int` }).from(dcaExecutions).where(sql`executed_at >= ${oneDayAgo}`),

            // Panel 5: Marketplace
            db!.select({ count: sql<number>`count(*)::int` }).from(miniApps),
            db!.select({ count: sql<number>`count(*)::int` }).from(miniApps).where(sql`is_published = true`),
            db!.select({ count: sql<number>`sum(installs)::int` }).from(miniApps),
            db!.select({ count: sql<number>`count(*)::int` }).from(userInstalledApps).where(sql`uninstalled_at IS NULL`),

            // Panel 6: Teams
            db!.select({ count: sql<number>`count(*)::int` }).from(teams),
            db!.select({ count: sql<number>`count(*)::int` }).from(teams).where(sql`vault_address IS NOT NULL`),
            db!.select({
                total: sql<number>`count(*)::int`,
                accepted: sql<number>`sum(case when accepted_at IS NOT NULL then 1 else 0 end)::int`
            }).from(teamInvitations),

            // Panel 7: On-Chain & Analytics
            db!.select({
                txCount: sql<number>`count(*)::int`,
                usdVol: sql<number>`sum(value_usd)`
            }).from(transactionCache),
            db!.select({
                claims: sql<number>`count(*)::int`,
                claimedValue: sql<number>`sum(estimated_value)`
            }).from(airdropClaims).where(sql`status = 'claimed'`),

            // Panel 8: System Health
            db!.select({ count: sql<number>`count(*)::int` }).from(monitors).where(sql`active = true`),
            db!.select({ hits: sql<number>`sum(count)::int` }).from(rateLimits).where(sql`window_start >= ${oneDayAgo}`),
            db!.select({ count: sql<number>`count(*)::int` }).from(atlasSessions).where(sql`expires_at > ${now}`),
            db!.select({
                total: sql<number>`count(*)::int`,
                correct: sql<number>`sum(case when correct = true then 1 else 0 end)::int`,
                resolved: sql<number>`sum(case when resolved = true then 1 else 0 end)::int`
            }).from(foresightPredictions)
        ]);

        // Process data
        const totalUsers = totalUsersData[0]?.count || 0;
        const metrics = {
            users: {
                total: totalUsers,
                new24h: newUsers24hData[0]?.count || 0,
                new7d: newUsers7dData[0]?.count || 0,
                onboarded: onboardingData[0]?.count || 0,
                onboardingRate: totalUsers > 0 ? (onboardingData[0]?.count || 0) / totalUsers : 0,
                withEmail: emailUsersData[0]?.count || 0,
                emailRate: totalUsers > 0 ? (emailUsersData[0]?.count || 0) / totalUsers : 0,
            },
            revenue: {
                tiers: tierBreakdownData.reduce((acc, row) => ({ ...acc, [row.tier]: row.count }), {} as Record<string, number>),
                totalMarketplaceRev: marketplaceRevenueData[0]?.rev || 0,
                totalMarketplaceVol: marketplaceVolumeData[0]?.vol || 0,
                creatorPayouts: creatorPayoutsData[0]?.payout || 0,
            },
            ai: {
                totalExecutions: totalExecutionsData[0]?.count || 0,
                executions24h: executions24hData[0]?.count || 0,
                executionStatus: executionsStatusData.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {} as Record<string, number>),
                totalGas: totalGasAgentData[0]?.gas || 0,
                totalApprovals: approvalsData[0]?.total || 0,
                approvedCount: approvalsData[0]?.approved || 0,
                totalRuns: aiRunsData[0]?.count || 0,
            },
            dca: {
                activeBots: activeBotsData[0]?.count || 0,
                botsStatus: botsStatusData.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {} as Record<string, number>),
                totalInvested: dcaVolumeData[0]?.vol || 0,
                volume24h: dcaVolume24hData[0]?.vol || 0,
                executions24h: dcaExecutions24hData[0]?.count || 0,
            },
            marketplace: {
                totalApps: totalAppsData[0]?.count || 0,
                publishedApps: publishedAppsData[0]?.count || 0,
                totalInstalls: totalInstallsData[0]?.count || 0,
                activeInstalls: activeInstallsData[0]?.count || 0,
            },
            teams: {
                total: totalTeamsData[0]?.count || 0,
                vaultLinked: vaultLinkedTeamsData[0]?.count || 0,
                invitesTotal: teamInvitesData[0]?.total || 0,
                invitesAccepted: teamInvitesData[0]?.accepted || 0,
            },
            onchain: {
                txCount: txVolumeData[0]?.txCount || 0,
                usdVol: txVolumeData[0]?.usdVol || 0,
                airdropClaims: airdropClaimsData[0]?.claims || 0,
                airdropValue: airdropClaimsData[0]?.claimedValue || 0,
            },
            system: {
                activeMonitors: monitorsData[0]?.count || 0,
                rateLimitHits24h: rateLimitsData[0]?.hits || 0,
                activeAtlasSessions: atlasSessionsData[0]?.count || 0,
                foresightTotal: foresightData[0]?.total || 0,
                foresightCorrect: foresightData[0]?.correct || 0,
                foresightResolved: foresightData[0]?.resolved || 0,
                foresightAccuracy: (foresightData[0]?.resolved || 0) > 0 ? (foresightData[0]?.correct || 0) / foresightData[0]?.resolved : 0,
            },
            fetchedAt: new Date().toISOString()
        };

        return NextResponse.json(metrics);
    } catch (e: any) {
        console.error("Admin metrics API error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
