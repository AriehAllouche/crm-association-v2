-- Migration RBAC - Création des tables pour la gestion des rôles et permissions
-- Exécuter ce script dans Supabase SQL Editor

-- 1. Création de la table roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Création de la table permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Création de la table user_roles (relation many-to-many entre users et roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, role_id)
);

-- 4. Création de la table role_permissions (relation many-to-many entre roles et permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 5. Mise à jour de la table profiles pour ajouter le champ status
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS motivation TEXT;

-- 6. Création des indexes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- 7. Création de la fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Application des triggers pour updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Création d'une vue pour simplifier les requêtes de permissions utilisateur
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    ur.user_id,
    p.name as permission_name,
    p.resource,
    p.action,
    r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- 10. Politiques RLS (Row Level Security) pour Supabase

-- Activer RLS sur les tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Politiques pour roles (lecture publique pour tous les authentifiés)
CREATE POLICY "Roles are viewable by authenticated users" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system admins can insert roles" ON roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );

CREATE POLICY "Only system admins can update roles" ON roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );

-- Politiques pour permissions (lecture publique pour tous les authentifiés)
CREATE POLICY "Permissions are viewable by authenticated users" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system admins can manage permissions" ON permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );

-- Politiques pour user_roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System admins can view all user roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );

CREATE POLICY "System admins can assign roles" ON user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );

CREATE POLICY "System admins can remove roles" ON user_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );

-- Politiques pour role_permissions
CREATE POLICY "Role permissions are viewable by authenticated users" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system admins can manage role permissions" ON role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.status = 'active'
            AND EXISTS (
                SELECT 1 FROM user_roles 
                JOIN roles ON user_roles.role_id = roles.id
                WHERE user_roles.user_id = auth.uid()
                AND roles.name IN ('president', 'administrator')
            )
        )
    );
