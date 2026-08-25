/*
# PHÉNIX - Schéma central CRM pour association de protection animale

## Description
Crée le modèle de données relationnel complet pour PHÉNIX, un CRM/Gestion destiné à une EPA.
Le principe fondamental : Un animal = un dossier unique = une seule saisie = un suivi complet.
La fiche animale est l'objet central ; tous les modules y sont reliés par clés étrangères.

## Tables créées
1. `profiles` — Profils utilisateurs liés à auth.users avec rôles RBAC
2. `animals` — Fiche centrale de l'animal (module central)
3. `signalements` — Signalements d'animaux
4. `famille_accueils` — Familles d'accueil
5. `adoptions` — Dossiers d'adoption
6. `veterinaires` — Vétérinaires partenaires
7. `veterinaire_visites` — Visites et soins vétérinaires liés à un animal
8. `justice_cases` — Dossiers judiciaires
9. `pensions` — Pensions/fourrières/SPA
10. `pension_sejours` — Séjours en pension liés à un animal
11. `enqueteurs` — Enquêteurs bénévoles
12. `transports` — Transports liés aux animaux
13. `documents` — Documents centralisés rattachés aux fiches
14. `depenses` — Dépenses liées aux animaux (vétérinaire, pension, transport, autres)
15. `communications` — Historique des communications/publications
16. `audit_log` — Journal d'audit transverse (qui, quoi, quand)
17. `alerts` — Alertes et rappels automatiques
18. `registre_entrees_sorties` — Registre légal obligatoire

## Sécurité
- RLS activée sur toutes les tables
- Politiques `TO authenticated` avec vérification de propriété ou d'appartenance
- Toutes les tables ont `user_id` ou sont accessibles à tous les utilisateurs authentifiés (données partagées de l'association)
- Les données de l'association sont partagées entre tous les utilisateurs authentifiés (pas de cloisonnement par utilisateur, mais par rôle)

## Notes importantes
- Les données de l'association sont partagées entre tous les membres authentifiés (pas d'isolation par utilisateur)
- Le cloisonnement se fait par rôle (admin, benevole, enqueteur, referent_fa) au niveau de l'application
- L'audit log capture toutes les modifications pour traçabilité
- Les alertes sont générées automatiquement par l'application
*/

-- ============================================
-- 1. PROFILES (extension de auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'benevole' CHECK (role IN ('admin', 'benevole', 'enqueteur', 'referent_fa')),
  phone text,
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. ANIMALS (module central)
-- ============================================
CREATE TABLE IF NOT EXISTS animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  espece text NOT NULL DEFAULT 'chien' CHECK (espece IN ('chien', 'chat', 'lapin', 'cheval', 'autre')),
  race text,
  sexe text CHECK (sexe IN ('male', 'femelle', 'inconnu')),
  date_naissance date,
  age_estime text,
  couleur text,
  poids text,
  taille text,
  sterilise boolean DEFAULT false,
  vaccinne boolean DEFAULT false,
  numero_icad text,
  numero_puce text,
  statut text NOT NULL DEFAULT 'signale' CHECK (statut IN (
    'signale', 'en_enquete', 'pris_en_charge', 'en_famille_accueil',
    'en_pension', 'en_soins', 'a_adopter', 'adopte', 'rendu_proprietaire',
    'decede', 'archive'
  )),
  description text,
  comportement text,
  sante_statut text DEFAULT 'bon' CHECK (sante_statut IN ('bon', 'moyen', 'grave', 'critique')),
  sante_notes text,
  photo_url text,
  lieu_actuel text,
  date_prise_en_charge date,
  date_sortie date,
  motif_sortie text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "animals_select_authenticated" ON animals;
CREATE POLICY "animals_select_authenticated" ON animals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "animals_insert_authenticated" ON animals;
CREATE POLICY "animals_insert_authenticated" ON animals FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "animals_update_authenticated" ON animals;
CREATE POLICY "animals_update_authenticated" ON animals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "animals_delete_authenticated" ON animals;
CREATE POLICY "animals_delete_authenticated" ON animals FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 3. SIGNALEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS signalements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_dossier text UNIQUE NOT NULL,
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  declarant_nom text NOT NULL,
  declarant_prenom text,
  declarant_telephone text,
  declarant_email text,
  declarant_adresse text,
  lieu_signalement text,
  latitude decimal(9,6),
  longitude decimal(9,6),
  motif text NOT NULL,
  description text,
  urgence text DEFAULT 'normal' CHECK (urgence IN ('faible', 'normal', 'urgent', 'critique')),
  statut text DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'traite', 'cloture')),
  enqueteur_id uuid REFERENCES profiles(id),
  date_signalement date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signalements_select_authenticated" ON signalements;
CREATE POLICY "signalements_select_authenticated" ON signalements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "signalements_insert_authenticated" ON signalements;
CREATE POLICY "signalements_insert_authenticated" ON signalements FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "signalements_update_authenticated" ON signalements;
CREATE POLICY "signalements_update_authenticated" ON signalements FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "signalements_delete_authenticated" ON signalements;
CREATE POLICY "signalements_delete_authenticated" ON signalements FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 4. FAMILLE ACCUEILS
-- ============================================
CREATE TABLE IF NOT EXISTS famille_accueils (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text,
  telephone text,
  email text,
  adresse text,
  code_postal text,
  ville text,
  departement text,
  capacite_max int DEFAULT 1,
  animaux_actuels int DEFAULT 0,
  referent_benevole_id uuid REFERENCES profiles(id),
  date_debut_contrat date,
  date_fin_contrat date,
  contrat_actif boolean DEFAULT true,
  materiel_confie text,
  croquettes_fournies text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE famille_accueils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fa_select_authenticated" ON famille_accueils;
CREATE POLICY "fa_select_authenticated" ON famille_accueils FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "fa_insert_authenticated" ON famille_accueils;
CREATE POLICY "fa_insert_authenticated" ON famille_accueils FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fa_update_authenticated" ON famille_accueils;
CREATE POLICY "fa_update_authenticated" ON famille_accueils FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fa_delete_authenticated" ON famille_accueils;
CREATE POLICY "fa_delete_authenticated" ON famille_accueils FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 5. ADOPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS adoptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  adoptant_nom text NOT NULL,
  adoptant_prenom text,
  adoptant_telephone text,
  adoptant_email text,
  adoptant_adresse text,
  statut text DEFAULT 'candidature' CHECK (statut IN (
    'candidature', 'pre_visite', 'visio', 'validee', 'contrat_signe',
    'paiement_recu', 'icad_change', 'adoptee', 'post_visite', 'refusee'
  )),
  date_candidature date DEFAULT CURRENT_DATE,
  date_pre_visite date,
  date_visio date,
  date_validation date,
  date_contrat date,
  montant_adoption decimal(10,2),
  paiement_recu boolean DEFAULT false,
  date_icad_change date,
  date_post_visite date,
  post_visite_effectuee boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE adoptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adoptions_select_authenticated" ON adoptions;
CREATE POLICY "adoptions_select_authenticated" ON adoptions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "adoptions_insert_authenticated" ON adoptions;
CREATE POLICY "adoptions_insert_authenticated" ON adoptions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "adoptions_update_authenticated" ON adoptions;
CREATE POLICY "adoptions_update_authenticated" ON adoptions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "adoptions_delete_authenticated" ON adoptions;
CREATE POLICY "adoptions_delete_authenticated" ON adoptions FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 6. VETERINAIRES
-- ============================================
CREATE TABLE IF NOT EXISTS veterinaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text,
  clinique text,
  adresse text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  tarif_consultation decimal(10,2),
  tarif_chirurgie decimal(10,2),
  tarif_sterilisation decimal(10,2),
  notes text,
  partenaire boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE veterinaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "veterinaires_select_authenticated" ON veterinaires;
CREATE POLICY "veterinaires_select_authenticated" ON veterinaires FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "veterinaires_insert_authenticated" ON veterinaires;
CREATE POLICY "veterinaires_insert_authenticated" ON veterinaires FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "veterinaires_update_authenticated" ON veterinaires;
CREATE POLICY "veterinaires_update_authenticated" ON veterinaires FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "veterinaires_delete_authenticated" ON veterinaires;
CREATE POLICY "veterinaires_delete_authenticated" ON veterinaires FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 7. VETERINAIRE VISITES
-- ============================================
CREATE TABLE IF NOT EXISTS veterinaire_visites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  veterinaire_id uuid REFERENCES veterinaires(id) ON DELETE SET NULL,
  date_visite date NOT NULL DEFAULT CURRENT_DATE,
  motif text NOT NULL,
  diagnostic text,
  traitement text,
  cout decimal(10,2),
  facture_url text,
  compte_rendu_url text,
  prochaine_visite date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE veterinaire_visites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visites_select_authenticated" ON veterinaire_visites;
CREATE POLICY "visites_select_authenticated" ON veterinaire_visites FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "visites_insert_authenticated" ON veterinaire_visites;
CREATE POLICY "visites_insert_authenticated" ON veterinaire_visites FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "visites_update_authenticated" ON veterinaire_visites;
CREATE POLICY "visites_update_authenticated" ON veterinaire_visites FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "visites_delete_authenticated" ON veterinaire_visites;
CREATE POLICY "visites_delete_authenticated" ON veterinaire_visites FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 8. JUSTICE CASES
-- ============================================
CREATE TABLE IF NOT EXISTS justice_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  numero_parquet text,
  tribunal text,
  date_audience date,
  avocat text,
  avocat_contact text,
  requisition text,
  resume_faits text,
  statut text DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_cours', 'audience_planifiee', 'jugement_rendu', 'cloture')),
  decision text,
  date_cloture date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE justice_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "justice_select_authenticated" ON justice_cases;
CREATE POLICY "justice_select_authenticated" ON justice_cases FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "justice_insert_authenticated" ON justice_cases;
CREATE POLICY "justice_insert_authenticated" ON justice_cases FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "justice_update_authenticated" ON justice_cases;
CREATE POLICY "justice_update_authenticated" ON justice_cases FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "justice_delete_authenticated" ON justice_cases;
CREATE POLICY "justice_delete_authenticated" ON justice_cases FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 9. PENSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS pensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type text DEFAULT 'pension' CHECK (type IN ('pension', 'fourriere', 'spa')),
  adresse text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  cout_journalier decimal(10,2),
  contact_referent text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pensions_select_authenticated" ON pensions;
CREATE POLICY "pensions_select_authenticated" ON pensions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "pensions_insert_authenticated" ON pensions;
CREATE POLICY "pensions_insert_authenticated" ON pensions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pensions_update_authenticated" ON pensions;
CREATE POLICY "pensions_update_authenticated" ON pensions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pensions_delete_authenticated" ON pensions;
CREATE POLICY "pensions_delete_authenticated" ON pensions FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 10. PENSION SEJOURS
-- ============================================
CREATE TABLE IF NOT EXISTS pension_sejours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  pension_id uuid REFERENCES pensions(id) ON DELETE SET NULL,
  date_entree date NOT NULL DEFAULT CURRENT_DATE,
  date_sortie date,
  cout_total decimal(10,2),
  facture_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pension_sejours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sejours_select_authenticated" ON pension_sejours;
CREATE POLICY "sejours_select_authenticated" ON pension_sejours FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "sejours_insert_authenticated" ON pension_sejours;
CREATE POLICY "sejours_insert_authenticated" ON pension_sejours FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sejours_update_authenticated" ON pension_sejours;
CREATE POLICY "sejours_update_authenticated" ON pension_sejours FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sejours_delete_authenticated" ON pension_sejours;
CREATE POLICY "sejours_delete_authenticated" ON pension_sejours FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 11. ENQUETEURS
-- ============================================
CREATE TABLE IF NOT EXISTS enqueteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  nom text NOT NULL,
  prenom text,
  telephone text,
  email text,
  adresse text,
  departements text[],
  zones_couvertes text,
  disponibilites text,
  date_carte_enqueteur date,
  carte_enqueteur_url text,
  cotisation_payee boolean DEFAULT false,
  date_derniere_cotisation date,
  notes text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE enqueteurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enqueteurs_select_authenticated" ON enqueteurs;
CREATE POLICY "enqueteurs_select_authenticated" ON enqueteurs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "enqueteurs_insert_authenticated" ON enqueteurs;
CREATE POLICY "enqueteurs_insert_authenticated" ON enqueteurs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "enqueteurs_update_authenticated" ON enqueteurs;
CREATE POLICY "enqueteurs_update_authenticated" ON enqueteurs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "enqueteurs_delete_authenticated" ON enqueteurs;
CREATE POLICY "enqueteurs_delete_authenticated" ON enqueteurs FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 12. TRANSPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  type text DEFAULT 'covoiturage' CHECK (type IN ('covoiturage', 'transporteur', 'benevole')),
  transporteur_nom text,
  transporteur_contact text,
  lieu_depart text,
  lieu_arrivee text,
  date_transport date NOT NULL DEFAULT CURRENT_DATE,
  heure_depart time,
  heure_arrivee time,
  cout decimal(10,2),
  statut text DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transports_select_authenticated" ON transports;
CREATE POLICY "transports_select_authenticated" ON transports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "transports_insert_authenticated" ON transports;
CREATE POLICY "transports_insert_authenticated" ON transports FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "transports_update_authenticated" ON transports;
CREATE POLICY "transports_update_authenticated" ON transports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "transports_delete_authenticated" ON transports;
CREATE POLICY "transports_delete_authenticated" ON transports FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 13. DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('animal', 'signalement', 'famille_accueil', 'adoption', 'veterinaire', 'justice', 'pension', 'transport', 'communication', 'autre')),
  module_id uuid,
  type_document text NOT NULL CHECK (type_document IN ('contrat', 'facture', 'devis', 'certificat', 'jugement', 'photo', 'video', 'compte_rendu', 'carte', 'autre')),
  nom_fichier text NOT NULL,
  url text NOT NULL,
  description text,
  taille bigint,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

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

-- ============================================
-- 14. DEPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS depenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('veterinaire', 'pension', 'transport', 'nourriture', 'materiel', 'autre')),
  description text NOT NULL,
  montant decimal(10,2) NOT NULL,
  date_depense date NOT NULL DEFAULT CURRENT_DATE,
  facture_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "depenses_select_authenticated" ON depenses;
CREATE POLICY "depenses_select_authenticated" ON depenses FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "depenses_insert_authenticated" ON depenses;
CREATE POLICY "depenses_insert_authenticated" ON depenses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "depenses_update_authenticated" ON depenses;
CREATE POLICY "depenses_update_authenticated" ON depenses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "depenses_delete_authenticated" ON depenses;
CREATE POLICY "depenses_delete_authenticated" ON depenses FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 15. COMMUNICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('reseau_social', 'site', 'appel_adoption', 'recherche_fa', 'urgence', 'covoiturage', 'autre')),
  canal text CHECK (canal IN ('facebook', 'instagram', 'site_web', 'email', 'whatsapp', 'autre')),
  titre text,
  contenu text,
  url_publication text,
  date_publication date DEFAULT CURRENT_DATE,
  portee text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comms_select_authenticated" ON communications;
CREATE POLICY "comms_select_authenticated" ON communications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "comms_insert_authenticated" ON communications;
CREATE POLICY "comms_insert_authenticated" ON communications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "comms_update_authenticated" ON communications;
CREATE POLICY "comms_update_authenticated" ON communications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "comms_delete_authenticated" ON communications;
CREATE POLICY "comms_delete_authenticated" ON communications FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 16. AUDIT LOG (transverse)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_authenticated" ON audit_log;
CREATE POLICY "audit_select_authenticated" ON audit_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_insert_authenticated" ON audit_log;
CREATE POLICY "audit_insert_authenticated" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================
-- 17. ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('vaccin', 'icad', 'audience', 'post_visite', 'pension_longue', 'echeance_contrat', 'relance_adoption', 'autre')),
  titre text NOT NULL,
  message text,
  date_echeance date NOT NULL,
  statut text DEFAULT 'active' CHECK (statut IN ('active', 'traitée', 'ignorée')),
  priorite text DEFAULT 'normal' CHECK (priorite IN ('faible', 'normal', 'urgent', 'critique')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select_authenticated" ON alerts;
CREATE POLICY "alerts_select_authenticated" ON alerts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "alerts_insert_authenticated" ON alerts;
CREATE POLICY "alerts_insert_authenticated" ON alerts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "alerts_update_authenticated" ON alerts;
CREATE POLICY "alerts_update_authenticated" ON alerts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alerts_delete_authenticated" ON alerts;
CREATE POLICY "alerts_delete_authenticated" ON alerts FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 18. REGISTRE ENTREES SORTIES (légal)
-- ============================================
CREATE TABLE IF NOT EXISTS registre_entrees_sorties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  numero_entree text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('entree', 'sortie')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  motif text,
  provenance_destination text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE registre_entrees_sorties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registre_select_authenticated" ON registre_entrees_sorties;
CREATE POLICY "registre_select_authenticated" ON registre_entrees_sorties FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "registre_insert_authenticated" ON registre_entrees_sorties;
CREATE POLICY "registre_insert_authenticated" ON registre_entrees_sorties FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "registre_update_authenticated" ON registre_entrees_sorties;
CREATE POLICY "registre_update_authenticated" ON registre_entrees_sorties FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "registre_delete_authenticated" ON registre_entrees_sorties;
CREATE POLICY "registre_delete_authenticated" ON registre_entrees_sorties FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_animals_statut ON animals(statut);
CREATE INDEX IF NOT EXISTS idx_animals_espece ON animals(espece);
CREATE INDEX IF NOT EXISTS idx_signalements_animal ON signalements(animal_id);
CREATE INDEX IF NOT EXISTS idx_signalements_statut ON signalements(statut);
CREATE INDEX IF NOT EXISTS idx_adoptions_animal ON adoptions(animal_id);
CREATE INDEX IF NOT EXISTS idx_adoptions_statut ON adoptions(statut);
CREATE INDEX IF NOT EXISTS idx_visites_animal ON veterinaire_visites(animal_id);
CREATE INDEX IF NOT EXISTS idx_justice_animal ON justice_cases(animal_id);
CREATE INDEX IF NOT EXISTS idx_sejours_animal ON pension_sejours(animal_id);
CREATE INDEX IF NOT EXISTS idx_transports_animal ON transports(animal_id);
CREATE INDEX IF NOT EXISTS idx_documents_animal ON documents(animal_id);
CREATE INDEX IF NOT EXISTS idx_depenses_animal ON depenses(animal_id);
CREATE INDEX IF NOT EXISTS idx_alerts_statut ON alerts(statut);
CREATE INDEX IF NOT EXISTS idx_alerts_echeance ON alerts(date_echeance);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_registre_animal ON registre_entrees_sorties(animal_id);

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trigger_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_animals_updated BEFORE UPDATE ON animals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_signalements_updated BEFORE UPDATE ON signalements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_fa_updated BEFORE UPDATE ON famille_accueils FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_adoptions_updated BEFORE UPDATE ON adoptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_veterinaires_updated BEFORE UPDATE ON veterinaires FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_justice_updated BEFORE UPDATE ON justice_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_pensions_updated BEFORE UPDATE ON pensions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_enqueteurs_updated BEFORE UPDATE ON enqueteurs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
