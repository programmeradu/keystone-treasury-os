/**
 * RBAC permission checking for team roles.
 * Role hierarchy: owner > admin > signer > viewer
 */

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  signer: 1,
  admin: 2,
  owner: 3,
};

export type TeamRole = 'viewer' | 'signer' | 'admin' | 'owner';

export const VALID_ROLES: TeamRole[] = ['viewer', 'signer', 'admin', 'owner'];

export function isValidRole(role: string): role is TeamRole {
  return VALID_ROLES.includes(role as TeamRole);
}

export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? -1;
}

/**
 * Check if role A has at least the same permissions as role B.
 */
export function hasMinRole(userRole: string, requiredRole: TeamRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Permission matrix — what each role can do.
 */
const PERMISSIONS: Record<string, TeamRole> = {
  view: 'viewer',
  execute: 'signer',
  sign: 'signer',
  manage_team: 'admin',
  manage_settings: 'admin',
  transfer_ownership: 'owner',
};

export function hasPermission(userRole: string, action: keyof typeof PERMISSIONS): boolean {
  const required = PERMISSIONS[action];
  if (!required) return false;
  return hasMinRole(userRole, required);
}
