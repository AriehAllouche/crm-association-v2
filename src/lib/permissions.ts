import type { UserRole } from '../types';

export interface Permission {
  module: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  presidente: [
    { module: 'dashboard', action: 'read' },
    { module: 'animaux', action: 'read' },
    { module: 'signalements', action: 'read' },
    { module: 'familles_accueil', action: 'read' },
    { module: 'adoptions', action: 'read' },
    { module: 'veterinaires', action: 'read' },
    { module: 'documents', action: 'read' },
    { module: 'justice', action: 'read' },
    { module: 'pensions', action: 'read' },
    { module: 'transports', action: 'read' },
    { module: 'enqueteurs', action: 'read' },
    { module: 'registre', action: 'read' },
    { module: 'import', action: 'read' },
    { module: 'taches', action: 'read' },
    { module: 'presidente', action: 'read' },
    { module: 'finances', action: 'read' },
    { module: 'utilisateurs', action: 'read' },
  ],
  admin: [
    { module: 'dashboard', action: 'read' },
    { module: 'animaux', action: 'read' },
    { module: 'signalements', action: 'read' },
    { module: 'familles_accueil', action: 'read' },
    { module: 'adoptions', action: 'read' },
    { module: 'veterinaires', action: 'read' },
    { module: 'documents', action: 'read' },
    { module: 'justice', action: 'read' },
    { module: 'pensions', action: 'read' },
    { module: 'transports', action: 'read' },
    { module: 'enqueteurs', action: 'read' },
    { module: 'registre', action: 'read' },
    { module: 'import', action: 'read' },
    { module: 'taches', action: 'read' },
    { module: 'presidente', action: 'read' },
    { module: 'finances', action: 'read' },
    { module: 'utilisateurs', action: 'admin' },
    { module: 'parametres', action: 'admin' },
  ],
  enqueteur: [
    { module: 'dashboard', action: 'read' },
    { module: 'signalements', action: 'read' },
    { module: 'signalements', action: 'write' },
    { module: 'animaux', action: 'read' },
    { module: 'justice', action: 'read' },
    { module: 'justice', action: 'write' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
  referent_fa: [
    { module: 'dashboard', action: 'read' },
    { module: 'familles_accueil', action: 'read' },
    { module: 'familles_accueil', action: 'write' },
    { module: 'animaux', action: 'read' },
    { module: 'adoptions', action: 'read' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
  veterinaire: [
    { module: 'dashboard', action: 'read' },
    { module: 'animaux', action: 'read' },
    { module: 'animaux', action: 'write' },
    { module: 'veterinaires', action: 'read' },
    { module: 'veterinaires', action: 'write' },
    { module: 'documents', action: 'read' },
    { module: 'documents', action: 'write' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
  educateur: [
    { module: 'dashboard', action: 'read' },
    { module: 'animaux', action: 'read' },
    { module: 'animaux', action: 'write' },
    { module: 'comportement', action: 'read' },
    { module: 'comportement', action: 'write' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
  communication: [
    { module: 'dashboard', action: 'read' },
    { module: 'animaux', action: 'read' },
    { module: 'adoptions', action: 'read' },
    { module: 'documents', action: 'read' },
    { module: 'documents', action: 'write' },
    { module: 'communication', action: 'read' },
    { module: 'communication', action: 'write' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
  tresorier: [
    { module: 'dashboard', action: 'read' },
    { module: 'finances', action: 'read' },
    { module: 'finances', action: 'write' },
    { module: 'depenses', action: 'read' },
    { module: 'depenses', action: 'write' },
    { module: 'dons', action: 'read' },
    { module: 'dons', action: 'write' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
  benevole: [
    { module: 'dashboard', action: 'read' },
    { module: 'animaux', action: 'read' },
    { module: 'signalements', action: 'read' },
    { module: 'familles_accueil', action: 'read' },
    { module: 'adoptions', action: 'read' },
    { module: 'taches', action: 'read' },
    { module: 'taches', action: 'write' },
  ],
};

export function hasPermission(role: UserRole, module: string, action: Permission['action']): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(
    (p) => p.module === module && (p.action === action || p.action === 'admin')
  );
}

export function hasAnyPermission(role: UserRole, module: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some((p) => p.module === module);
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
