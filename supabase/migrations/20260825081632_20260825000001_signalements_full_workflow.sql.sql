/*
# Module Signalements — workflow complet, timeline, photos, notifications

## 1. Colonnes ajoutées à `signalements`
- `espece` (text) — espèce concernée (chien, chat, lapin, cheval, autre)
- `nombre_animaux` (int, default 1) — nombre d'animaux concernés
- `animaux_visibles` (bool, default false) — animaux visibles sur place ?
- `danger_immediat` (bool, default false) — danger immédiat ?
- `presence_enfants` (bool, default false) — présence d'enfants ?
- `animal_blesse` (bool, default false) — animal blessé ?
- `animal_mort` (bool, default false) — animal mort ?
- `urgence_calculee` (text) — urgence déduite automatiquement (rouge/orange/jaune/vert)
- `responsable_id` (uuid) — responsable de dossier (peut différer de l'enquêteur)
- `priorite` (int, default 0) — priorité 1-5
- `date_prevue_traitement` (date) — date prévue de traitement
- `transmission_ddpp` (bool, default false)
- `transmission_police` (bool, default false)
- `transmission_gendarmerie` (bool, default false)
- `date_cloture` (timestamptz) — date de clôture
- `motif_cloture` (text) — motif de clôture / sans suite

Le statut existant passe de 4 valeurs à un workflow complet:
  nouveau → affecte → en_enquete → transmission → animal_pris_en_charge → cloture / sans_suite

## 2. Nouvelle table `signalement_events`
Timeline horodatée de chaque action sur un signalement.
- id, signalement_id (FK), type (text), titre, description, auteur_id (FK profiles),
  donnees (jsonb pour stocker des données contextuelles), created_at

## 3. Nouvelle table `signalement_comments`
Commentaires internes, visibles uniquement par les bénévoles ayant accès au module.
- id, signalement_id (FK), auteur_id (FK profiles), contenu, created_at

## 4. Nouvelle table `signalement_photos`
Photos et vidéos uploadés via Supabase Storage.
- id, signalement_id (FK), url (text), type_media (photo/video), description, created_at

## 5. Nouvelle table `notifications`
Notifications internes à l'application.
- id, user_id (FK profiles), type, titre, message, signalement_id (FK nullable),
  lu (bool, default false), created_at

## 6. Sécurité
- RLS activée sur toutes les nouvelles tables
- Policies CRUD pour `authenticated` (l'app a un écran de connexion)
- Storage bucket `signalements` pour les photos/vidéos
*/

-- =====================================================
-- 1. Ajouter colonnes à signalements
-- =====================================================
DO $$ BEGIN
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS espece text;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS nombre_animaux int DEFAULT 1;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS animaux_visibles boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS danger_immediat boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS presence_enfants boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS animal_blesse boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS animal_mort boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS urgence_calculee text;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS responsable_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS priorite int DEFAULT 0;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS date_prevue_traitement date;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS transmission_ddpp boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS transmission_police boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS transmission_gendarmerie boolean DEFAULT false;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS date_cloture timestamptz;
  ALTER TABLE signalements ADD COLUMN IF NOT EXISTS motif_cloture text;
END $$;

-- =====================================================
-- 2. Table signalement_events (timeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS signalement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  type text NOT NULL,
  titre text NOT NULL,
  description text,
  auteur_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  donnees jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signalement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_signalement_events" ON signalement_events;
CREATE POLICY "select_signalement_events" ON signalement_events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_signalement_events" ON signalement_events;
CREATE POLICY "insert_signalement_events" ON signalement_events FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_signalement_events" ON signalement_events;
CREATE POLICY "update_signalement_events" ON signalement_events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_signalement_events" ON signalement_events;
CREATE POLICY "delete_signalement_events" ON signalement_events FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_signalement_events_signalement ON signalement_events(signalement_id);
CREATE INDEX IF NOT EXISTS idx_signalement_events_created ON signalement_events(created_at);

-- =====================================================
-- 3. Table signalement_comments
-- =====================================================
CREATE TABLE IF NOT EXISTS signalement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  contenu text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signalement_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_signalement_comments" ON signalement_comments;
CREATE POLICY "select_signalement_comments" ON signalement_comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_signalement_comments" ON signalement_comments;
CREATE POLICY "insert_signalement_comments" ON signalement_comments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_signalement_comments" ON signalement_comments;
CREATE POLICY "update_signalement_comments" ON signalement_comments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_signalement_comments" ON signalement_comments;
CREATE POLICY "delete_signalement_comments" ON signalement_comments FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_signalement_comments_signalement ON signalement_comments(signalement_id);

-- =====================================================
-- 4. Table signalement_photos
-- =====================================================
CREATE TABLE IF NOT EXISTS signalement_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  url text NOT NULL,
  type_media text NOT NULL DEFAULT 'photo',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signalement_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_signalement_photos" ON signalement_photos;
CREATE POLICY "select_signalement_photos" ON signalement_photos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_signalement_photos" ON signalement_photos;
CREATE POLICY "insert_signalement_photos" ON signalement_photos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_signalement_photos" ON signalement_photos;
CREATE POLICY "update_signalement_photos" ON signalement_photos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_signalement_photos" ON signalement_photos;
CREATE POLICY "delete_signalement_photos" ON signalement_photos FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_signalement_photos_signalement ON signalement_photos(signalement_id);

-- =====================================================
-- 5. Table notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  titre text NOT NULL,
  message text,
  signalement_id uuid REFERENCES signalements(id) ON DELETE CASCADE,
  lu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE (lu = false);

-- =====================================================
-- 6. Storage bucket pour les photos de signalements
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
SELECT 'signalements', 'signalements', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'signalements');

DROP POLICY IF EXISTS "public_read_signalements_bucket" ON storage.objects;
CREATE POLICY "public_read_signalements_bucket" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'signalements');

DROP POLICY IF EXISTS "auth_upload_signalements_bucket" ON storage.objects;
CREATE POLICY "auth_upload_signalements_bucket" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signalements');

DROP POLICY IF EXISTS "auth_update_signalements_bucket" ON storage.objects;
CREATE POLICY "auth_update_signalements_bucket" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'signalements') WITH CHECK (bucket_id = 'signalements');

DROP POLICY IF EXISTS "auth_delete_signalements_bucket" ON storage.objects;
CREATE POLICY "auth_delete_signalements_bucket" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'signalements');

-- =====================================================
-- 7. Migrer les statuts existants vers le nouveau workflow
-- =====================================================
UPDATE signalements SET statut = 'nouveau' WHERE statut = 'nouveau';
UPDATE signalements SET statut = 'affecte' WHERE statut = 'en_cours';
UPDATE signalements SET statut = 'cloture' WHERE statut = 'traite';
UPDATE signalements SET statut = 'cloture' WHERE statut = 'cloture';
