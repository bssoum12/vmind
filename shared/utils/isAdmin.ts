export const ADMIN_ROLE_NAMES = new Set([
  'administrator',
  'administrators',
  'admin',
  'superusers',
  'superadmin',
]);

/**
 * Display-only helper to check if the current VMIND user holds one of the 5 platform admin roles.
 * Backend authorization remains the source of truth.
 */
export function isVmindAdmin(rolesOrUser: unknown): boolean {
  if (!rolesOrUser) return false;

  let rawRoles: unknown = rolesOrUser;
  if (typeof rolesOrUser === 'object' && !Array.isArray(rolesOrUser)) {
    const u = rolesOrUser as Record<string, unknown>;
    rawRoles = u.roles ?? u.role ?? u.role_name;
  }

  const list = Array.isArray(rawRoles)
    ? rawRoles
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];

  return list.some(
    (r) => typeof r === 'string' && ADMIN_ROLE_NAMES.has(r.trim().toLowerCase())
  );
}
