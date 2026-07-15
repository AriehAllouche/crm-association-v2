-- ============================================
-- FIX: Schéma de la table documents + colonne folder
-- ============================================
-- Contexte:
-- La colonne `folder` n'a jamais été créée en base. La migration qui
-- l'ajoutait (003_documents_folders.sql, un ALTER TABLE) a été supprimée
-- et la colonne a été déplacée dans le CREATE TABLE IF NOT EXISTS de
-- 001_initial_schema.sql. La table existant déjà, ce CREATE est un no-op:
-- la colonne n'a donc jamais été ajoutée -> tout INSERT contenant `folder`
-- échoue avec PGRST204 "column folder ... does not exist".
--
-- Cette migration est idempotente et fonctionne quel que soit le schéma
-- réellement en place (001 historique, 001 corrigé, ou phenix_core).
-- ============================================

-- --------------------------------------------
-- 1. Colonnes canoniques (ajoutées si absentes)
-- --------------------------------------------
ALTER TABLE documents ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS module_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS type_document text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS nom_fichier text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder text DEFAULT 'Général';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS taille bigint;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- --------------------------------------------
-- 2. Reprise des données des colonnes héritées
-- --------------------------------------------
-- L'ancien schéma utilisait titre/fichier_url/type/date_document.
-- On récupère les données avant de neutraliser ces colonnes.
-- SQL dynamique: les colonnes héritées peuvent ne pas exister.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'titre'
  ) THEN
    EXECUTE 'UPDATE documents SET nom_fichier = titre WHERE nom_fichier IS NULL AND titre IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'fichier_url'
  ) THEN
    EXECUTE 'UPDATE documents SET url = fichier_url WHERE url IS NULL AND fichier_url IS NOT NULL';
  END IF;

  -- `type` (ancien) -> `type_document` (canonique), avec correspondance des valeurs.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'type'
  ) THEN
    EXECUTE $sql$
      UPDATE documents SET type_document = CASE type
        WHEN 'medical'     THEN 'certificat'
        WHEN 'judiciaire'  THEN 'jugement'
        WHEN 'contrat'     THEN 'contrat'
        WHEN 'administratif' THEN 'autre'
        ELSE 'autre'
      END
      WHERE type_document IS NULL AND type IS NOT NULL
    $sql$;
  END IF;
END $$;

-- Les colonnes héritées ne sont plus jamais renseignées par l'application.
-- Si l'une d'elles est restée NOT NULL, toute insertion échoue (23502): on
-- relâche la contrainte sur chacune, qu'elle existe ou non.
DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY['titre', 'fichier_url', 'type', 'date_document'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = col
    ) THEN
      EXECUTE format('ALTER TABLE documents ALTER COLUMN %I DROP NOT NULL', col);
    END IF;
  END LOOP;
END $$;

-- --------------------------------------------
-- 3. Valeurs par défaut sur les lignes existantes
-- --------------------------------------------
UPDATE documents SET folder = 'Général' WHERE folder IS NULL OR btrim(folder) = '';
UPDATE documents SET module = 'animal' WHERE module IS NULL;
UPDATE documents SET type_document = 'autre' WHERE type_document IS NULL;
UPDATE documents SET nom_fichier = 'Document sans nom' WHERE nom_fichier IS NULL;

-- --------------------------------------------
-- 4. Contraintes canoniques
-- --------------------------------------------
-- `url` reste nullable: la migration suivante introduit les fichiers uploadés,
-- qui portent un `storage_path` et n'ont pas d'URL.
ALTER TABLE documents ALTER COLUMN nom_fichier SET NOT NULL;
ALTER TABLE documents ALTER COLUMN folder SET DEFAULT 'Général';

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_module_check;
ALTER TABLE documents ADD CONSTRAINT documents_module_check
  CHECK (module IN ('animal', 'signalement', 'famille_accueil', 'adoption', 'veterinaire',
                    'justice', 'pension', 'transport', 'communication', 'autre'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_document_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_document_check
  CHECK (type_document IN ('contrat', 'facture', 'devis', 'certificat', 'jugement',
                           'photo', 'video', 'compte_rendu', 'carte', 'autre'));

-- --------------------------------------------
-- 5. Index
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);
CREATE INDEX IF NOT EXISTS idx_documents_animal ON documents(animal_id);
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(module, module_id);

-- --------------------------------------------
-- 6. RLS (au cas où la table préexistait sans policies)
-- --------------------------------------------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_authenticated" ON documents;
CREATE POLICY "documents_select_authenticated" ON documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_insert_authenticated" ON documents;
CREATE POLICY "documents_insert_authenticated" ON documents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "documents_update_authenticated" ON documents;
CREATE POLICY "documents_update_authenticated" ON documents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "documents_delete_authenticated" ON documents;
CREATE POLICY "documents_delete_authenticated" ON documents FOR DELETE
  TO authenticated USING (true);
