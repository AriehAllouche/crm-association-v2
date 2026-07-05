-- Migration initiale pour le CRM Association
-- Exécutez cette migration dans Supabase SQL Editor

-- Table profiles (utilisateurs)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'benevole' CHECK (role IN ('admin', 'benevole', 'veterinaire', 'enqueteur', 'gestionnaire')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table animals
CREATE TABLE IF NOT EXISTS animals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  espece TEXT DEFAULT 'chien' CHECK (espece IN ('chien', 'chat', 'autre')),
  species_race TEXT, -- Espèce ou Race (Lapin, Chien /X DOGUE...)
  race TEXT,
  sexe TEXT DEFAULT 'inconnu' CHECK (sexe IN ('male', 'femelle', 'inconnu')),
  gender TEXT CHECK (gender IN ('M', 'F')), -- 'M' ou 'F'
  date_naissance DATE,
  birth_date DATE, -- Date de naissance (alternative)
  age_estime TEXT,
  couleur TEXT,
  poids TEXT,
  taille TEXT,
  sterilise BOOLEAN DEFAULT FALSE,
  vaccinne BOOLEAN DEFAULT FALSE,
  date_dernier_vaccin DATE,
  numero_icad TEXT,
  icad_number TEXT UNIQUE, -- Le numéro de puce / tatouage (unique)
  numero_puce TEXT,
  statut TEXT DEFAULT 'signale' CHECK (statut IN ('signale', 'a_adopter', 'en_famille_accueil', 'en_pension', 'en_soins', 'adopte', 'decede', 'perdu')),
  status_pec TEXT CHECK (status_pec IN ('a_l_adoption', 'fa_en_vue_adoption', 'transfert_asso', 'remis_proprietaire', 'a_mettre_a_jour')), -- Status PEC
  animal_state TEXT CHECK (animal_state IN ('disponible', 'reserve', 'pension', 'vole', 'dcd')), -- État de l'animal
  withdrawal_cause TEXT, -- Cause du retrait
  agent TEXT, -- Personne responsable (Morgan, Margareth...)
  date_pec DATE, -- Date de Prise En Charge
  description TEXT,
  comportement TEXT,
  sante_statut TEXT DEFAULT 'bon' CHECK (sante_statut IN ('bon', 'moyen', 'critique')),
  sante_notes TEXT,
  photo_url TEXT,
  lieu_actuel TEXT,
  date_prise_en_charge DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table contacts (Les Humains : Adoptants, FA, Intervenants)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT, -- Prénom
  last_name TEXT, -- Nom de famille
  email TEXT, -- Adresse email
  phone TEXT, -- Numéro de téléphone
  address TEXT, -- Adresse postale / Lieu
  role TEXT CHECK (role IN ('adoptant', 'famille_accueil', 'intervenant', 'veterinaire', 'autre')), -- Type de contact
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table famille_accueils
CREATE TABLE IF NOT EXISTS famille_accueils (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  telephone TEXT,
  email TEXT,
  type_logement TEXT,
  animaux_actuels INTEGER DEFAULT 0,
  capacite_max INTEGER DEFAULT 3,
  contrat_actif BOOLEAN DEFAULT TRUE,
  date_debut_contrat DATE,
  date_fin_contrat DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table famille_accueil_animaux (liaison)
CREATE TABLE IF NOT EXISTS famille_accueil_animaux (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  famille_accueil_id UUID REFERENCES famille_accueils(id) ON DELETE CASCADE,
  statut TEXT DEFAULT 'prevu' CHECK (statut IN ('prevu', 'en_cours', 'termine', 'annule')),
  date_debut DATE,
  date_fin DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table veterinaires
CREATE TABLE IF NOT EXISTS veterinaires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT,
  clinique TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  telephone TEXT,
  email TEXT,
  partenaire BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table veterinaire_visites
CREATE TABLE IF NOT EXISTS veterinaire_visites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  veterinaire_id UUID REFERENCES veterinaires(id) ON DELETE SET NULL,
  date_visite DATE NOT NULL,
  motif TEXT,
  diagnostic TEXT,
  traitement TEXT,
  cout TEXT,
  prochaine_visite DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pensions
CREATE TABLE IF NOT EXISTS pensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT DEFAULT 'pension' CHECK (type IN ('pension', 'fourriere')),
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  telephone TEXT,
  email TEXT,
  animaux_actuels INTEGER DEFAULT 0,
  capacite INTEGER,
  tarif_journalier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pension_sejours
CREATE TABLE IF NOT EXISTS pension_sejours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  pension_id UUID REFERENCES pensions(id) ON DELETE SET NULL,
  date_entree DATE NOT NULL,
  date_sortie DATE,
  motif TEXT,
  cout_total TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table signalements
CREATE TABLE IF NOT EXISTS signalements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_dossier TEXT UNIQUE,
  declarant_nom TEXT NOT NULL,
  declarant_prenom TEXT,
  declarant_telephone TEXT,
  declarant_email TEXT,
  date_signalement DATE DEFAULT CURRENT_DATE,
  motif TEXT NOT NULL,
  description TEXT,
  statut TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'cloture', 'archive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table adoptions
CREATE TABLE IF NOT EXISTS adoptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  adoptant_nom TEXT NOT NULL,
  adoptant_prenom TEXT,
  adoptant_telephone TEXT,
  adoptant_email TEXT,
  adoptant_adresse TEXT,
  adoptant_ville TEXT,
  adoptant_code_postal TEXT,
  date_demande DATE DEFAULT CURRENT_DATE,
  date_visite DATE,
  date_adoption DATE,
  statut TEXT DEFAULT 'nouvelle' CHECK (statut IN ('nouvelle', 'en_cours', 'approuvee', 'refusee', 'adoptee')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table justice_cases
CREATE TABLE IF NOT EXISTS justice_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  numero_parquet TEXT,
  tribunal TEXT,
  avocat TEXT,
  date_audience DATE,
  statut TEXT DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'en_attente', 'cloture', 'archive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table transports
CREATE TABLE IF NOT EXISTS transports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  type_transport TEXT CHECK (type_transport IN ('ramassage', 'deplacement', 'retour')),
  date_transport DATE NOT NULL,
  lieu_depart TEXT,
  lieu_arrivee TEXT,
  chauffeur TEXT,
  distance_km TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('medical', 'administratif', 'judiciaire', 'contrat', 'autre')),
  titre TEXT NOT NULL,
  description TEXT,
  fichier_url TEXT,
  date_document DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table depenses
CREATE TABLE IF NOT EXISTS depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  categorie TEXT CHECK (categorie IN ('veterinaire', 'alimentation', 'transport', 'logement', 'justice', 'autre')),
  description TEXT NOT NULL,
  montant NUMERIC,
  date_depense DATE DEFAULT CURRENT_DATE,
  facture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table enqueteurs)
CREATE TABLE IF NOT EXISTS enqueteurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  ville TEXT,
  specialite TEXT,
  actif BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table registre_entree_sortie
CREATE TABLE IF NOT EXISTS registre_entree_sortie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  type_mouvement TEXT CHECK (type_mouvement IN ('entree', 'sortie')),
  date_mouvement DATE NOT NULL,
  motif TEXT,
  provenance TEXT,
  destination TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  justice_case_id UUID REFERENCES justice_cases(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('vaccin', 'icad', 'audience', 'autre')),
  titre TEXT NOT NULL,
  message TEXT,
  date_echeance DATE,
  priorite TEXT DEFAULT 'moyenne' CHECK (priorite IN ('basse', 'moyenne', 'haute', 'critique')),
  statut TEXT DEFAULT 'active' CHECK (statut IN ('active', 'resolue', 'archivee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE famille_accueils ENABLE ROW LEVEL SECURITY;
ALTER TABLE famille_accueil_animaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinaire_visites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pension_sejours ENABLE ROW LEVEL SECURITY;
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE justice_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enqueteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE registre_entree_sortie ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permettre l'accès authentifié)
CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert profiles" ON profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update profiles" ON profiles FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read animals" ON animals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert animals" ON animals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update animals" ON animals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete animals" ON animals FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read contacts" ON contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert contacts" ON contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update contacts" ON contacts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete contacts" ON contacts FOR DELETE USING (auth.role() = 'authenticated');

-- Similaire pour les autres tables (accès complet pour les utilisateurs authentifiés)
CREATE POLICY "Authenticated full access on famille_accueils" ON famille_accueils FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on famille_accueil_animaux" ON famille_accueil_animaux FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on veterinaires" ON veterinaires FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on veterinaire_visites" ON veterinaire_visites FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on pensions" ON pensions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on pension_sejours" ON pension_sejours FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on signalements" ON signalements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on adoptions" ON adoptions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on justice_cases" ON justice_cases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on transports" ON transports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on documents" ON documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on depenses" ON depenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on enqueteurs" ON enqueteurs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on registre_entree_sortie" ON registre_entree_sortie FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access on alerts" ON alerts FOR ALL USING (auth.role() = 'authenticated');

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_animals_statut ON animals(statut);
CREATE INDEX IF NOT EXISTS idx_animals_espece ON animals(espece);
CREATE INDEX IF NOT EXISTS idx_famille_accueil_animaux_animal ON famille_accueil_animaux(animal_id);
CREATE INDEX IF NOT EXISTS idx_famille_accueil_animaux_famille ON famille_accueil_animaux(famille_accueil_id);
CREATE INDEX IF NOT EXISTS idx_alerts_statut ON alerts(statut);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
