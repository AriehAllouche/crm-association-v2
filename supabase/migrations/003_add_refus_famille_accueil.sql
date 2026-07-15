-- Migration pour ajouter la table des refus de famille d'accueil
-- Basée sur l'analyse du fichier Excel des refus

CREATE TABLE IF NOT EXISTS refus_famille_accueil (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type_refus TEXT NOT NULL, -- 'Refus EPA', 'Désistement', 'Stop', etc.
  departement TEXT,
  motif_refus TEXT,
  date_refus TIMESTAMP WITH TIME ZONE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  date_naissance DATE,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  profession TEXT,
  email TEXT,
  pseudo_facebook TEXT,
  type_animal_souhaite TEXT, -- "Quel animal pouvez-vous accueillir"
  peut_accueillir_urgence_2_animaux BOOLEAN DEFAULT FALSE,
  duree_accueil TEXT, -- 'URGENCE', 'Moyenne ou Courte Durée', 'Longue Durée'
  nb_adultes INTEGER,
  nb_enfants INTEGER,
  ages_enfants TEXT,
  famille_accord BOOLEAN DEFAULT TRUE,
  allergies_maladies BOOLEAN DEFAULT FALSE,
  type_logement TEXT, -- 'Appartement' ou 'Maison'
  superficie TEXT,
  autres_animaux BOOLEAN DEFAULT FALSE,
  autres_animaux_details TEXT,
  peut_isoler_animaux BOOLEAN DEFAULT FALSE,
  attestation_categorie BOOLEAN DEFAULT FALSE,
  patience_chiot BOOLEAN DEFAULT FALSE,
  patience_adulte BOOLEAN DEFAULT FALSE,
  animal_seul_journee BOOLEAN DEFAULT FALSE,
  duree_seul TEXT,
    vehicule BOOLEAN DEFAULT FALSE,
  peut_deplacer BOOLEAN DEFAULT FALSE,
  informations_complementaires TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches courantes
CREATE INDEX IF NOT EXISTS idx_refus_type ON refus_famille_accueil(type_refus);
CREATE INDEX IF NOT EXISTS idx_refus_departement ON refus_famille_accueil(departement);
CREATE INDEX IF NOT EXISTS idx_refus_date ON refus_famille_accueil(date_refus);
CREATE INDEX IF NOT EXISTS idx_refus_ville ON refus_famille_accueil(ville);

-- Commentaires
COMMENT ON TABLE refus_famille_accueil IS 'Table des refus de famille d''accueil';
COMMENT ON COLUMN refus_famille_accueil.type_refus IS 'Type de refus: Refus EPA, Désistement, Stop, etc.';
COMMENT ON COLUMN refus_famille_accueil.motif_refus IS 'Motif du refus';
COMMENT ON COLUMN refus_famille_accueil.type_animal_souhaite IS 'Type d''animal que la personne souhaite accueillir';
COMMENT ON COLUMN refus_famille_accueil.peut_accueillir_urgence_2_animaux IS 'Peut accueillir 2 animaux en urgence';
COMMENT ON COLUMN refus_famille_accueil.duree_accueil IS 'Durée d''accueil souhaitée';
COMMENT ON COLUMN refus_famille_accueil.attestation_categorie IS 'Possède l''attestation d''aptitude pour chiens catégorisés';
