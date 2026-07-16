import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Permission, RBACRole } from '../types';

export function usePermissions() {
  const { profile } = useAuth();

  const permissions = useMemo(() => {
    if (!profile) return [];
    // Les permissions seront chargées depuis le profile étendu
    return (profile as any).permissions || [];
  }, [profile]);

  const roles = useMemo(() => {
    if (!profile) return [];
    // Les rôles seront chargés depuis le profile étendu
    return (profile as any).roles || [];
  }, [profile]);

  const hasPermission = (permissionName: string): boolean => {
    return permissions.some((p: Permission) => p.name === permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some((name) => hasPermission(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every((name) => hasPermission(name));
  };

  const hasRole = (roleName: RBACRole): boolean => {
    return roles.some((r: any) => r.name === roleName);
  };

  const hasAnyRole = (roleNames: RBACRole[]): boolean => {
    return roleNames.some((name) => hasRole(name));
  };

  const hasResourceAccess = (resource: string, action: string): boolean => {
    return permissions.some(
      (p: Permission) => p.resource === resource && p.action === action
    );
  };

  const canRead = (resource: string): boolean => {
    return hasResourceAccess(resource, 'read');
  };

  const canWrite = (resource: string): boolean => {
    return hasResourceAccess(resource, 'write');
  };

  const canDelete = (resource: string): boolean => {
    return hasResourceAccess(resource, 'delete');
  };

  const canManage = (resource: string): boolean => {
    return hasResourceAccess(resource, 'manage');
  };

  const isSystemAdmin = (): boolean => {
    return hasRole('president') || hasRole('administrator');
  };

  const isActive = (): boolean => {
    return profile?.status === 'active';
  };

  const isPending = (): boolean => {
    return profile?.status === 'pending';
  };

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasResourceAccess,
    canRead,
    canWrite,
    canDelete,
    canManage,
    isSystemAdmin,
    isActive,
    isPending,
  };
}
