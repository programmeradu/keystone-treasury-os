/**
 * Neon Database Branching — AI Sandbox Isolation
 *
 * Lifecycle:
 * 1. TRIGGER:  Studio opens → createSandboxBranch()
 * 2. ISOLATE:  AI code runs against branch connection string
 * 3. VERIFY:   Security scan runs on branch data
 * 4. CLEANUP:  deleteBranch() after publish or discard
 */

const NEON_API = 'https://console.neon.tech/api/v2';

interface NeonBranch {
    id: string;
    name: string;
    project_id: string;
    parent_id: string;
    created_at: string;
    current_state: string;
}

interface BranchEndpoint {
    host: string;
    id: string;
}

function getHeaders() {
    const apiKey = process.env.NEON_API_KEY;
    if (!apiKey) throw new Error('NEON_API_KEY not set');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
    };
}

/**
 * Create an ephemeral branch (zero-copy clone of main).
 * Used when The Architect AI starts a sandbox dry run.
 */
export async function createSandboxBranch(
    label?: string
): Promise<{ branch: NeonBranch; connectionUrl: string }> {
    const projectId = process.env.NEON_PROJECT_ID;
    if (!projectId) throw new Error('NEON_PROJECT_ID not set');

    const branchName = label || `sandbox-${Date.now().toString(36)}`;

    // Create branch
    const res = await fetch(`${NEON_API}/projects/${projectId}/branches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            branch: { name: branchName },
            endpoints: [{ type: 'read_write' }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Neon branch creation failed: ${err}`);
    }

    const data = await res.json();
    const branch: NeonBranch = data.branch;
    const endpoints: BranchEndpoint[] = data.endpoints || [];

    // Get connection string
    const connectionUrl = await getBranchConnectionString(projectId, branch.id);

    return { branch, connectionUrl };
}

/**
 * Get the connection string for a Neon branch.
 */
export async function getBranchConnectionString(
    projectId: string,
    branchId: string
): Promise<string> {
    // Get the endpoint for this branch
    const res = await fetch(
        `${NEON_API}/projects/${projectId}/branches/${branchId}/endpoints`,
        { headers: getHeaders() }
    );

    if (!res.ok) throw new Error('Failed to get branch endpoints');

    const data = await res.json();
    const endpoint = data.endpoints?.[0];

    if (!endpoint) throw new Error('No endpoint found for branch');

    // Get connection URI
    const connRes = await fetch(
        `${NEON_API}/projects/${projectId}/connection_uri?branch_id=${branchId}&endpoint_id=${endpoint.id}&database_name=neondb&role_name=neondb_owner`,
        { headers: getHeaders() }
    );

    if (!connRes.ok) throw new Error('Failed to get connection URI');

    const connData = await connRes.json();
    return connData.uri;
}

/**
 * Delete a sandbox branch after publish or discard.
 * Instantly wipes all hallucinated data and schema changes.
 */
export async function deleteSandboxBranch(branchId: string): Promise<void> {
    const projectId = process.env.NEON_PROJECT_ID;
    if (!projectId) throw new Error('NEON_PROJECT_ID not set');

    const res = await fetch(
        `${NEON_API}/projects/${projectId}/branches/${branchId}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Branch deletion failed: ${err}`);
    }
}

/**
 * List all active sandbox branches (for admin/cleanup).
 */
export async function listSandboxBranches(): Promise<NeonBranch[]> {
    const projectId = process.env.NEON_PROJECT_ID;
    if (!projectId) throw new Error('NEON_PROJECT_ID not set');

    const res = await fetch(
        `${NEON_API}/projects/${projectId}/branches`,
        { headers: getHeaders() }
    );

    if (!res.ok) throw new Error('Failed to list branches');

    const data = await res.json();
    return (data.branches || []).filter(
        (b: NeonBranch) => b.name.startsWith('sandbox-')
    );
}
