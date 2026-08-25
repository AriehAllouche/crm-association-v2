/*
# PHÉNIX — Système de permissions par module

## Description
Remplace le système de rôle unique (champ `role` sur `profiles`) par un système de permissions individuelles.
Chaque compte possède une liste de permissions cochables indépendamment, permettant de cumuler plusieurs casquettes.
Des préréglages (presets) permettent d'appliquer un ensemble de permissions en un clic lors de la création d'un compte.
Le champ `role` existant est conservé pour compatibilité mais n'est plus utilisé pour l'affichage conditionnel.

## Nouvelles tables
1. `user_permissions` — Permissions individuelles par compte (une ligne par permission active)
   - `id` (uuid, PK)
   - `user_id` (uuid, FK → profiles, NOT NULL, unique avec permission)
   - `permission` (text, NOT NULL — valeur parmi la liste autorisée)
   - `created_at` (timestamptz)

2. `role_presets` — Préréglages de permissions (table de référence, insérée par l'application)
   Non nécessaire en base: les préréglages sont gérés côté application (constantes TypeScript).
   On utilise une fonction `apply_preset(p_user_id, preset_name)` qui insère les permissions correspondantes.

## Fonctions
- `has_permission(p_user_id uuid, p_permission text) RETURNS boolean` — vérifie si un utilisateur a une permission donnée (soit directe, soit via acces_total)
- `get_user_permissions(p_user_id uuid) RETURNS text[]` — retourne toutes les permissions effectives d'un utilisateur
- `apply_role_preset(p_user_id uuid, p_preset text) RETURNS void` — applique un préréglage de permissions

## Sécurité
- RLS activée sur `user_permissions`
- SELECT: tout utilisateur authentifié peut voir les permissions (nécessaire pour l'affichage conditionnel)
- INSERT/UPDATE/DELETE: uniquement les utilisateurs ayant la permission `administration` ou `acces_total`
- Vérification via la fonction `has_permission` dans les politiques RLS

## Notes importantes
- Le champ `profiles.role` est conservé pour compatibilité ascendante mais n'est plus la source de vérité.
- La source de vérité pour les permissions est la table `user_permissions`.
- Un utilisateur avec `acces_total` a automatiquement toutes les permissions (vérifié dans la fonction).
- Les préréglages sont définis côté application et appliqués via la fonction `apply_role_preset`.
*/

-- ============================================
-- 1. TABLE user_permissions
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN (
    'acces_total',
    'administration',
    'animaux_lecture',
    'animaux_gestion',
    'sante',
    'comportement',
    'justice',
    'familles_accueil',
    'signalements',
    'communication',
    'finances',
    'transports',
    'statistiques'
  )),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Index pour rechercher rapidement les permissions d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_perm ON user_permissions(permission);

-- ============================================
-- 2. FONCTION has_permission
-- ============================================
CREATE OR REPLACE FUNCTION has_permission(p_user_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = p_user_id
    AND permission = p_permission
  ) OR EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = p_user_id
    AND permission = 'acces_total'
  );
$$;

-- ============================================
-- 3. FONCTION get_user_permissions
-- ============================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE
      WHEN EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = p_user_id AND permission = 'acces_total'
      ) THEN ARRAY[
        'acces_total','administration','animaux_lecture','animaux_gestion',
        'sante','comportement','justice','familles_accueil','signalements',
        'communication','finances','transports','statistiques'
      ]
      ELSE ARRAY(
        SELECT permission FROM user_permissions WHERE user_id = p_user_id
      )
    END,
    ARRAY[]::text[]
  );
$$;

-- ============================================
-- 4. FONCTION apply_role_preset
-- ============================================
CREATE OR REPLACE FUNCTION apply_role_preset(p_user_id uuid, p_preset text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- D'abord, supprimer toutes les permissions existantes pour cet utilisateur
  DELETE FROM user_permissions WHERE user_id = p_user_id;

  -- Puis insérer les permissions selon le préréglage
  CASE p_preset
    WHEN 'presidente' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'acces_total');
    WHEN 'administrateur' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'acces_total'), (p_user_id, 'administration');
    WHEN 'responsable_fa' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'familles_accueil'), (p_user_id, 'animaux_lecture');
    WHEN 'responsable_veto' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'sante'), (p_user_id, 'animaux_lecture');
    WHEN 'responsable_comm' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'communication'), (p_user_id, 'animaux_lecture');
    WHEN 'enqueteur' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'signalements'), (p_user_id, 'justice'), (p_user_id, 'animaux_lecture');
    WHEN 'educateur' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'comportement'), (p_user_id, 'animaux_lecture');
    WHEN 'tresorier' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'finances');
    WHEN 'benevole' THEN
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'animaux_lecture');
    ELSE
      -- Préréglage inconnu: par défaut benevole
      INSERT INTO user_permissions (user_id, permission)
      VALUES (p_user_id, 'animaux_lecture');
  END CASE;
END;
$$;

-- ============================================
-- 5. POLITIQUES RLS sur user_permissions
-- ============================================
DROP POLICY IF EXISTS "user_perms_select_authenticated" ON user_permissions;
CREATE POLICY "user_perms_select_authenticated" ON user_permissions FOR SELECT
  TO authenticated USING (true);

-- Seuls les administrateurs peuvent gérer les permissions
DROP POLICY IF EXISTS "user_perms_insert_admin" ON user_permissions;
CREATE POLICY "user_perms_insert_admin" ON user_permissions FOR INSERT
  TO authenticated WITH CHECK (
    has_permission(auth.uid(), 'administration')
  );

DROP POLICY IF EXISTS "user_perms_update_admin" ON user_permissions;
CREATE POLICY "user_perms_update_admin" ON user_permissions FOR UPDATE
  TO authenticated USING (
    has_permission(auth.uid(), 'administration')
  ) WITH CHECK (
    has_permission(auth.uid(), 'administration')
  );

DROP POLICY IF EXISTS "user_perms_delete_admin" ON user_permissions;
CREATE POLICY "user_perms_delete_admin" ON user_permissions FOR DELETE
  TO authenticated USING (
    has_permission(auth.uid(), 'administration')
  );

-- ============================================
-- 6. Mise à jour des politiques RLS sur profiles
-- pour permettre aux administrateurs de modifier tous les profils
-- ============================================
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (
    auth.uid() = id OR has_permission(auth.uid(), 'administration')
  ) WITH CHECK (
    auth.uid() = id OR has_permission(auth.uid(), 'administration')
  );

-- ============================================
-- 7. Mise à jour du trigger handle_new_user
-- pour appliquer le préréglage "benevole" par défaut
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Appliquer le préréglage "benevole" par défaut
  PERFORM apply_role_preset(NEW.id, 'benevole');

  RETURN NEW;
END;
$$;
