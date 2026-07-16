-- Seed Data RBAC - Données initiales pour les rôles et permissions
-- Exécuter ce script après la migration 001_rbac_tables.sql

-- 1. Insertion des rôles par défaut
INSERT INTO roles (name, description, is_system_role) VALUES
('president', 'Présidente - Accès total (Super-Admin)', FALSE),
('administrator', 'Administrateur - Gestion technique', FALSE),
('fa_manager', 'Responsable FA - Gestion familles d''accueil', FALSE),
('veterinary_manager', 'Responsable vétérinaire - Pôle santé', FALSE),
('communication_manager', 'Responsable communication - Fiches adoption', FALSE),
('investigator', 'Enquêteur - Signalements maltraitance', FALSE),
('educator', 'Éducateur - Comportement animaux', FALSE),
('treasurer', 'Trésorier - Comptabilité et finances', FALSE)
ON CONFLICT (name) DO NOTHING;

-- 2. Insertion des permissions par ressource
INSERT INTO permissions (name, description, resource, action) VALUES
-- Dashboard
('dashboard.view', 'Voir le tableau de bord', 'dashboard', 'read'),
('dashboard.manage', 'Gérer le tableau de bord', 'dashboard', 'manage'),

-- Animaux
('animals.read', 'Voir les fiches animaux', 'animals', 'read'),
('animals.write', 'Créer/modifier fiches animaux', 'animals', 'write'),
('animals.delete', 'Supprimer des animaux', 'animals', 'delete'),

-- Santé
('health.read', 'Voir les suivis médicaux', 'health', 'read'),
('health.write', 'Créer/modifier suivis médicaux', 'health', 'write'),
('health.manage', 'Gérer les stocks médicaments', 'health', 'manage'),

-- Familles d'Accueil
('families.read', 'Voir les familles d''accueil', 'families', 'read'),
('families.write', 'Créer/modifier familles d''accueil', 'families', 'write'),
('families.manage', 'Gérer les contrats et placements', 'families', 'manage'),

-- Communication
('communication.read', 'Voir les fiches adoption', 'communication', 'read'),
('communication.write', 'Créer/modifier fiches adoption', 'communication', 'write'),
('communication.publish', 'Publier sur les réseaux sociaux', 'communication', 'publish'),

-- Enquêtes
('investigations.read', 'Voir les signalements', 'investigations', 'read'),
('investigations.write', 'Créer/modifier enquêtes', 'investigations', 'write'),
('investigations.manage', 'Gérer les pré-visites', 'investigations', 'manage'),

-- Éducation
('education.read', 'Voir les fiches comportement', 'education', 'read'),
('education.write', 'Créer/modifier suivis éducatifs', 'education', 'write'),

-- Finance
('finance.read', 'Voir la comptabilité', 'finance', 'read'),
('finance.write', 'Créer/modifier écritures', 'finance', 'write'),
('finance.manage', 'Gérer les factures et dons', 'finance', 'manage'),

-- Administration
('admin.users', 'Gérer les utilisateurs', 'admin', 'users'),
('admin.roles', 'Gérer les rôles et permissions', 'admin', 'roles'),
('admin.approve', 'Approuver les nouveaux inscrits', 'admin', 'approve'),
('admin.settings', 'Configurer l''application', 'admin', 'settings')
ON CONFLICT (name) DO NOTHING;

-- 3. Attribution des permissions aux rôles

-- Présidente (toutes les permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'president'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Administrateur (toutes les permissions sauf décisions financières suprêmes si applicable)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'administrator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Responsable FA (uniquement familles d'accueil + dashboard view)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'fa_manager'
AND p.name IN (
    'dashboard.view',
    'animals.read',
    'animals.write',
    'families.read',
    'families.write',
    'families.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Responsable vétérinaire (uniquement santé + dashboard view + animaux read/write)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'veterinary_manager'
AND p.name IN (
    'dashboard.view',
    'animals.read',
    'animals.write',
    'health.read',
    'health.write',
    'health.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Responsable communication (uniquement communication + dashboard view + animaux read)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'communication_manager'
AND p.name IN (
    'dashboard.view',
    'animals.read',
    'animals.write',
    'communication.read',
    'communication.write',
    'communication.publish'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Enquêteur (uniquement enquêtes + dashboard view + animaux read)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'investigator'
AND p.name IN (
    'dashboard.view',
    'animals.read',
    'animals.write',
    'investigations.read',
    'investigations.write',
    'investigations.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Éducateur (uniquement éducation + dashboard view + animaux read)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'educator'
AND p.name IN (
    'dashboard.view',
    'animals.read',
    'animals.write',
    'education.read',
    'education.write'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Trésorier (uniquement finance + dashboard view)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'treasurer'
AND p.name IN (
    'dashboard.view',
    'finance.read',
    'finance.write',
    'finance.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Création du compte Arieh comme administrateur système
-- Note: Cette partie doit être adaptée selon votre configuration Supabase
-- Vous devrez peut-être créer d'abord l'utilisateur dans auth.users puis lier son profile

-- Exemple de commande pour créer le profile d'Arieh (à adapter après création de l'utilisateur auth)
-- INSERT INTO profiles (id, email, full_name, role, status, active)
-- VALUES ('UUID_DARIEH', 'arieh@example.com', 'Arieh', 'admin', 'active', true);

-- Attribution du rôle administrator à Arieh
-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT 'UUID_DARIEH', id, 'UUID_DARIEH' FROM roles WHERE name = 'administrator';
