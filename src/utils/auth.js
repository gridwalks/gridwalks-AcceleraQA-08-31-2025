export function hasAdminRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.some(r => ['admin', 'administrator'].includes(r.toLowerCase()));
}
