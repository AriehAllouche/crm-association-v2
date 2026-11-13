-- Migration: Ajout des rôles étendus et initialisation Admin
-- Description: 
-- 1. Met à jour le CHECK constraint de profiles pour inclure tous les rôles
-- 2. Met à jour le trigger handle_new_user pour assigner 'benevole' par défaut
-- 3. Initialise l'utilisateur arieh.data@gmail.com en tant qu'admin

-- ============================================
-- 1. AJOUT DE LA COLONNE ACTIVE SI ELLE N'EXISTE PAS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================
-- 2. MISE À JOUR DU CHECK CONSTRAINT SUR PROFILES
-- ============================================

-- Supprimer l'ancien constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Ajouter le nouveau constraint avec tous les rôles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'admin', 
  'presidente', 
  'benevole', 
  'enqueteur', 
  'referent_fa', 
  'responsable_veterinaire', 
  'responsable_communication', 
  'educateur', 
  'tresorier'
));

-- ============================================
-- 2. MISE À JOUR DU TRIGGER handle_new_user
-- ============================================

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Créer la nouvelle fonction avec rôle par défaut 'benevole'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'benevole'  -- Rôle par défaut pour les nouveaux utilisateurs
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 3. INITIALISATION DE L'ADMIN arieh.data@gmail.com
-- ============================================

-- Cette fonction doit être exécutée manuellement après la création de l'utilisateur dans Supabase Auth
-- Elle met à jour le rôle de l'utilisateur admin en base de données

-- Note: Pour que cela fonctionne, l'utilisateur arieh.data@gmail.com doit d'abord être créé
-- dans Supabase Auth (via l'interface d'administration ou l'API)

-- Script de mise à jour du rôle admin (à exécuter après création de l'utilisateur):
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur admin par son email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'arieh.data@gmail.com';
  
  -- Si l'utilisateur existe, mettre à jour son profil
  IF admin_user_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET role = 'admin',
        active = true
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Utilisateur arih.data@gmail.com configuré en tant qu''admin';
  ELSE
    RAISE NOTICE 'Utilisateur arih.data@gmail.com non trouvé dans auth.users. Veuillez le créer d''abord dans Supabase Auth.';
  END IF;
END $$;

-- ============================================
-- 4. CRÉATION D'UNE FONCTION POUR MISE À JOUR MANUELLE DES RÔLES
-- ============================================

-- Fonction utilitaire pour mettre à jour le rôle d'un utilisateur par email
CREATE OR REPLACE FUNCTION update_user_role(user_email text, new_role text)
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Vérifier que le rôle est valide
  IF new_role NOT IN (
    'admin', 'presidente', 'benevole', 'enqueteur', 'referent_fa', 
    'responsable_veterinaire', 'responsable_communication', 'educateur', 'tresorier'
  ) THEN
    RAISE EXCEPTION 'Rôle invalide: %', new_role;
  END IF;
  
  -- Récupérer l'ID utilisateur
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé: %', user_email;
  END IF;
  
  -- Mettre à jour le profil
  UPDATE public.profiles 
  SET role = new_role,
      updated_at = now()
  WHERE id = user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant pour permettre aux admins d'utiliser cette fonction
GRANT EXECUTE ON FUNCTION update_user_role(text, text) TO authenticated;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

