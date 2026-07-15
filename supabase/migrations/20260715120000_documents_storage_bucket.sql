-- ============================================
-- Stockage réel des documents (Supabase Storage)
-- ============================================
-- Jusqu'ici l'application n'uploadait aucun fichier: le formulaire demandait
-- une URL saisie à la main. Cette migration crée le bucket `documents` et la
-- colonne `storage_path` qui référence le fichier uploadé.
--
-- Bucket PRIVÉ: les documents contiennent des jugements, certificats
-- médicaux et contrats (données personnelles). Un bucket public les rendrait
-- lisibles sans authentification par quiconque possède le lien. La lecture
-- passe donc par des URLs signées à durée limitée (createSignedUrl).
-- ============================================

-- --------------------------------------------
-- 1. Colonne storage_path
-- --------------------------------------------
-- `url` est conservée: elle porte les liens externes (Google Drive, etc.) et
-- les lignes historiques. Une ligne a soit storage_path (fichier uploadé),
-- soit url (lien externe). La lecture privilégie storage_path.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;

CREATE INDEX IF NOT EXISTS idx_documents_storage_path
  ON documents(storage_path) WHERE storage_path IS NOT NULL;

-- `url` était NOT NULL: impossible d'insérer un fichier uploadé sans inventer
-- une URL. On relâche la contrainte et on exige qu'au moins une source existe.
ALTER TABLE documents ALTER COLUMN url DROP NOT NULL;

UPDATE documents SET url = NULL WHERE btrim(url) = '';

-- NOT VALID: la contrainte s'applique aux insertions et mises à jour, mais
-- n'est pas vérifiée sur l'existant. Des lignes héritées peuvent n'avoir ni
-- fichier ni lien (url vide passée à NULL juste au-dessus); les valider
-- ferait échouer la migration entière au lieu de signaler ces quelques lignes.
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_source_check;
ALTER TABLE documents ADD CONSTRAINT documents_source_check
  CHECK (storage_path IS NOT NULL OR url IS NOT NULL) NOT VALID;

-- --------------------------------------------
-- 2. Bucket `documents`
-- --------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  26214400, -- 25 MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'video/mp4', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- --------------------------------------------
-- 3. Policies RLS sur storage.objects
-- --------------------------------------------
-- Le bucket étant privé, sans ces policies aucun utilisateur ne peut lire ni
-- écrire. Elles reprennent le modèle des policies de la table `documents`:
-- tout utilisateur authentifié a accès (l'app n'a pas de rôles par dossier).
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
CREATE POLICY "documents_storage_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;
CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'documents');
