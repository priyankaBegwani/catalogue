import { UserProfile, RolePermissions } from '../lib/api';

/**
 * Check if user has a specific permission
 */
export const hasPermission = (
  user: UserProfile | null,
  module: keyof RolePermissions,
  action: string
): boolean => {
  if (!user || !user.user_roles || !user.user_roles.permissions) {
    return false;
  }

  const modulePermissions = user.user_roles.permissions[module] as any;
  if (!modulePermissions) {
    return false;
  }

  return modulePermissions[action] === true;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  user: UserProfile | null,
  permissions: Array<{ module: keyof RolePermissions; action: string }>
): boolean => {
  return permissions.some(({ module, action }) => hasPermission(user, module, action));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
  user: UserProfile | null,
  permissions: Array<{ module: keyof RolePermissions; action: string }>
): boolean => {
  return permissions.every(({ module, action }) => hasPermission(user, module, action));
};

/**
 * Check if user is admin
 */
export const isAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false;
  
  // Check new role system only (old role field has been removed)
  return user.user_roles?.role_name === 'Admin';
};

/**
 * Get user's role name
 */
export const getUserRoleName = (user: UserProfile | null): string => {
  if (!user) return 'Unknown';
  
  // Get role name from new role system
  return user.user_roles?.role_name || 'Unknown';
};

/**
 * Get all permissions for a user
 */
export const getUserPermissions = (user: UserProfile | null): RolePermissions | null => {
  if (!user || !user.user_roles) {
    return null;
  }
  
  return user.user_roles.permissions;
};
