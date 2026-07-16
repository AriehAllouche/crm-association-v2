-- Script pour promouvoir des utilisateurs existants en administrateurs
-- Exécutez ce script dans le SQL Editor de Supabase

-- Étape 1: Récupérer les IDs des utilisateurs existants
-- Remplacez les emails par vos vrais emails
-- SELECT id, email, full_name FROM profiles WHERE email IN ('email1@example.com', 'email2@example.com');

-- Étape 2: Mettre à jour le statut des utilisateurs en 'active'
UPDATE profiles 
SET status = 'active', active = true 
WHERE email IN ('email1@example.com', 'email2@example.com');

-- Étape 3: Attribuer le rôle administrator aux utilisateurs
-- Remplacez les emails par vos vrais emails
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
  p.id,
  r.id,
  p.id
FROM profiles p
CROSS JOIN roles r
WHERE p.email IN ('email1@example.com', 'email2@example.com')
AND r.name = 'administrator'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Étape 4: Vérification
-- Vérifiez que les utilisateurs ont bien le rôle administrator
SELECT 
  p.email,
  p.full_name,
  p.status,
  r.name as role_name
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE p.email IN ('email1@example.com', 'email2@example.com');

-- Alternative: Si vous connaissez directement les IDs des utilisateurs
-- Remplacez USER_ID_1 et USER_ID_2 par les UUIDs réels

-- UPDATE profiles 
-- SET status = 'active', active = true 
-- WHERE id IN ('USER_ID_1', 'USER_ID_2');

-- INSERT INTO user_roles (user_id, role_id, assigned_by)
-- SELECT 
--   p.id,
--   r.id,
--   p.id
-- FROM profiles p
-- CROSS JOIN roles r
-- WHERE p.id IN ('USER_ID_1', 'USER_ID_2')
-- AND r.name = 'administrator'
-- ON CONFLICT (user_id, role_id) DO NOTHING;
