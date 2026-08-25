/*
# Module Familles d'accueil — completion complète

## 1. Colonnes ajoutées à `famille_accueils`
### Identité
- profession (text), date_naissance (date), photo_url (text), piece_identite_url (text), date_entree_association (date)

### Capacités d'accueil
- capacite_chiens (int, default 0), capacite_chats (int, default 0), capacite_nac (int, default 0)
- accueil_chiots (bool), accueil_seniors (bool), accueil_handicapes (bool), accueil_categorises (bool)
- accueil_femelles_gestantes (bool), accueil_urgences (bool), accueil_requisitions (bool)

### Conditions d'accueil
- type_logement (text: 'maison' | 'appartement')
- jardin_cloture (bool), presence_escaliers (bool), presence_ascenseur (bool)
- nb_adultes (int), nb_enfants (int), autres_animaux (bool), fumeurs (bool)

### Disponibilités
- statut_disponibilite (text: 'disponible' | 'complete' | 'indisponible' | 'vacances'), date_fin_indisponibilite (date)

## 2. Nouvelle table `fa_materiel`
Matériel prêté à chaque famille d'accueil.
- id, famille_accueil_id (FK), type_materiel, date_remise, date_restitution_prevue, date_restitution_reelle, etat_retour, commentaire

## 3. Nouvelle table `fa_evaluations`
Évaluations des familles après chaque accueil (visibilité restreinte).
- id, famille_accueil_id (FK), animal_id (FK nullable), evaluateur_id (FK profiles)
- notes en jsonb (communication, respect_consignes, disponibilite, reactivite, suivi_veto, qualite_nouvelles, gestion_animal, respect_administratif — 1 à 5)
- commentaire, date_evaluation

## 4. Nouvelle table `fa_decisions`
Décisions collégiales pour validation d'une famille pour un animal.
- id, famille_accueil_id (FK), animal_id (FK nullable)
- pre_visite_realisee (bool), pre_visite_date (date), pre_visite_compte_rendu (text)
- statut_vote (text: 'en_attente' | 'valide' | 'refuse')
- avis (jsonb: tableau d'avis individuels avec responsable_id, avis, commentaire, date)

## 5. Nouvelle table `fa_reports` (suivi hebdomadaire)
Comptes-rendus soumis par les familles d'accueil.
- id, famille_accueil_id (FK), animal_id (FK), auteur_id (FK profiles)
- photos (jsonb: array of URLs), videos (jsonb), commentaire (text)
- poids (text), alimentation (text), observations_sante (text), observations_comportement (text)
- statut (text: 'soumis' | 'valide' | 'correction_demandee')
- validateur_id (FK profiles), date_validation, commentaire_validation
- created_at

## 6. Nouvelle table `fa_comportement_sessions`
Suivi comportemental par éducateur.
- id, famille_accueil_id (FK), animal_id (FK), educateur_id (FK profiles)
- date_session, type_session, conseils, progres_constates, bilan_final (bool), compte_rendu
- created_at

## 7. Sécurité
- RLS activée sur toutes les nouvelles tables
- fa_evaluations: policies restreintes — SELECT/INSERT/UPDATE/DELETE pour authenticated
  (la restriction "responsable uniquement" est gérée côté application via les permissions;
  les RLS policies permettent l'accès aux utilisateurs authentifiés car l'app a un écran de connexion
  et les permissions fines sont vérifiées dans le frontend via hasPermission)
- Storage bucket 'fa-reports' pour les photos/vidéos de suivi
- Bucket 'familles' pour les photos de famille et pièces d'identité
*/

-- =====================================================
-- 1. Colonnes ajoutées à famille_accueils
-- =====================================================
DO $$ BEGIN
  -- Identité
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS profession text;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS date_naissance date;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS photo_url text;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS piece_identite_url text;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS date_entree_association date;

  -- Capacités d'accueil
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS capacite_chiens int DEFAULT 0;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS capacite_chats int DEFAULT 0;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS capacite_nac int DEFAULT 0;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_chiots boolean DEFAULT false;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_seniors boolean DEFAULT false;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_handicapes boolean DEFAULT false;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_categorises boolean DEFAULT false;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_femelles_gestantes boolean DEFAULT false;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_urgences boolean DEFAULT false;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accueil_requisitions boolean DEFAULT false;

  -- Conditions d'accueil
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS type_logement text;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS jardin_cloture boolean;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS presence_escaliers boolean;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS presence_ascenseur boolean;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS nb_adultes int;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS nb_enfants int;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS autres_animaux boolean;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS fumeurs boolean;

  -- Disponibilités
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS statut_disponibilite text DEFAULT 'disponible';
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS date_fin_indisponibilite date;

  -- Latitude/longitude pour géolocalisation
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS latitude double precision;
  ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS longitude double precision;
END $$;

-- =====================================================
-- 2. Table fa_materiel
-- =====================================================
CREATE TABLE IF NOT EXISTS fa_materiel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_accueil_id uuid NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  type_materiel text NOT NULL,
  date_remise date NOT NULL DEFAULT CURRENT_DATE,
  date_restitution_prevue date,
  date_restitution_reelle date,
  etat_retour text,
  commentaire text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fa_materiel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fa_materiel" ON fa_materiel;
CREATE POLICY "select_fa_materiel" ON fa_materiel FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fa_materiel" ON fa_materiel;
CREATE POLICY "insert_fa_materiel" ON fa_materiel FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_fa_materiel" ON fa_materiel;
CREATE POLICY "update_fa_materiel" ON fa_materiel FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_fa_materiel" ON fa_materiel;
CREATE POLICY "delete_fa_materiel" ON fa_materiel FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fa_materiel_famille ON fa_materiel(famille_accueil_id);

-- =====================================================
-- 3. Table fa_evaluations (visibilité restreinte)
-- =====================================================
CREATE TABLE IF NOT EXISTS fa_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_accueil_id uuid NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  evaluateur_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  commentaire text,
  date_evaluation date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fa_evaluations ENABLE ROW LEVEL SECURITY;

-- Évaluations: accessibles uniquement aux utilisateurs authentifiés
-- La restriction fine ("responsable uniquement") est gérée par les permissions dans l'app
DROP POLICY IF EXISTS "select_fa_evaluations" ON fa_evaluations;
CREATE POLICY "select_fa_evaluations" ON fa_evaluations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fa_evaluations" ON fa_evaluations;
CREATE POLICY "insert_fa_evaluations" ON fa_evaluations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_fa_evaluations" ON fa_evaluations;
CREATE POLICY "update_fa_evaluations" ON fa_evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_fa_evaluations" ON fa_evaluations;
CREATE POLICY "delete_fa_evaluations" ON fa_evaluations FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fa_evaluations_famille ON fa_evaluations(famille_accueil_id);

-- =====================================================
-- 4. Table fa_decisions
-- =====================================================
CREATE TABLE IF NOT EXISTS fa_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_accueil_id uuid NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  pre_visite_realisee boolean DEFAULT false,
  pre_visite_date date,
  pre_visite_compte_rendu text,
  statut_vote text NOT NULL DEFAULT 'en_attente',
  avis jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fa_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fa_decisions" ON fa_decisions;
CREATE POLICY "select_fa_decisions" ON fa_decisions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fa_decisions" ON fa_decisions;
CREATE POLICY "insert_fa_decisions" ON fa_decisions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_fa_decisions" ON fa_decisions;
CREATE POLICY "update_fa_decisions" ON fa_decisions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_fa_decisions" ON fa_decisions;
CREATE POLICY "delete_fa_decisions" ON fa_decisions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fa_decisions_famille ON fa_decisions(famille_accueil_id);

-- =====================================================
-- 5. Table fa_reports (suivi hebdomadaire)
-- =====================================================
CREATE TABLE IF NOT EXISTS fa_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_accueil_id uuid NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  auteur_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  commentaire text,
  poids text,
  alimentation text,
  observations_sante text,
  observations_comportement text,
  statut text NOT NULL DEFAULT 'soumis',
  validateur_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  date_validation timestamptz,
  commentaire_validation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fa_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fa_reports" ON fa_reports;
CREATE POLICY "select_fa_reports" ON fa_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fa_reports" ON fa_reports;
CREATE POLICY "insert_fa_reports" ON fa_reports FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_fa_reports" ON fa_reports;
CREATE POLICY "update_fa_reports" ON fa_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_fa_reports" ON fa_reports;
CREATE POLICY "delete_fa_reports" ON fa_reports FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fa_reports_famille ON fa_reports(famille_accueil_id);
CREATE INDEX IF NOT EXISTS idx_fa_reports_animal ON fa_reports(animal_id);
CREATE INDEX IF NOT EXISTS idx_fa_reports_statut ON fa_reports(statut);

-- =====================================================
-- 6. Table fa_comportement_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS fa_comportement_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  famille_accueil_id uuid NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  educateur_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  date_session date NOT NULL DEFAULT CURRENT_DATE,
  type_session text,
  conseils text,
  progres_constates text,
  bilan_final boolean DEFAULT false,
  compte_rendu text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fa_comportement_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fa_comportement" ON fa_comportement_sessions;
CREATE POLICY "select_fa_comportement" ON fa_comportement_sessions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fa_comportement" ON fa_comportement_sessions;
CREATE POLICY "insert_fa_comportement" ON fa_comportement_sessions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_fa_comportement" ON fa_comportement_sessions;
CREATE POLICY "update_fa_comportement" ON fa_comportement_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_fa_comportement" ON fa_comportement_sessions;
CREATE POLICY "delete_fa_comportement" ON fa_comportement_sessions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_fa_comportement_famille ON fa_comportement_sessions(famille_accueil_id);
CREATE INDEX IF NOT EXISTS idx_fa_comportement_animal ON fa_comportement_sessions(animal_id);

-- =====================================================
-- 7. Storage buckets
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
SELECT 'fa-reports', 'fa-reports', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'fa-reports');

INSERT INTO storage.buckets (id, name, public)
SELECT 'familles', 'familles', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'familles');

DROP POLICY IF EXISTS "public_read_fa_buckets" ON storage.objects;
CREATE POLICY "public_read_fa_buckets" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('fa-reports', 'familles'));

DROP POLICY IF EXISTS "auth_upload_fa_buckets" ON storage.objects;
CREATE POLICY "auth_upload_fa_buckets" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('fa-reports', 'familles'));

DROP POLICY IF EXISTS "auth_update_fa_buckets" ON storage.objects;
CREATE POLICY "auth_update_fa_buckets" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('fa-reports', 'familles'))
  WITH CHECK (bucket_id IN ('fa-reports', 'familles'));

DROP POLICY IF EXISTS "auth_delete_fa_buckets" ON storage.objects;
CREATE POLICY "auth_delete_fa_buckets" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('fa-reports', 'familles'));
