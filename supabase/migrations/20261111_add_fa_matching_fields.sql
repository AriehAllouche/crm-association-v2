-- Migration pour ajouter les champs manquants aux familles d'accueil
-- Ces champs sont nécessaires pour l'assistant intelligent "Proposer cet animal à une FA"

-- Ajouter les champs de préférences
ALTER TABLE famille_accueils 
ADD COLUMN IF NOT EXISTS especes_acceptees TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ages_acceptes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tailles_acceptees TEXT[] DEFAULT '{}';

-- Ajouter les champs de contexte familial
ALTER TABLE famille_accueils 
ADD COLUMN IF NOT EXISTS nombre_adultes INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS nombre_enfants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ages_enfants TEXT,
ADD COLUMN IF NOT EXISTS autres_animaux BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS type_logement TEXT CHECK (type_logement IN ('appartement', 'maison')),
ADD COLUMN IF NOT EXISTS superficie INTEGER;

-- Ajouter les champs de contraintes
ALTER TABLE famille_accueils 
ADD COLUMN IF NOT EXISTS peut_isoler BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attestation_categorise BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS patience_chiot_chaton BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS patience_adulte_traumatise BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS animal_reste_seul BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS temps_seul TEXT,
ADD COLUMN IF NOT EXISTS vehiculee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS peut_se_deplacer BOOLEAN DEFAULT FALSE;

-- Ajouter les champs de géolocalisation
ALTER TABLE famille_accueils 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Ajouter les champs de spécialités
ALTER TABLE famille_accueils 
ADD COLUMN IF NOT EXISTS specialites TEXT[] DEFAULT '{}';

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_famille_accueils_especes ON famille_accueils USING GIN(especes_acceptees);
CREATE INDEX IF NOT EXISTS idx_famille_accueils_ages ON famille_accueils USING GIN(ages_acceptes);
CREATE INDEX IF NOT EXISTS idx_famille_accueils_tailles ON famille_accueils USING GIN(tailles_acceptees);
CREATE INDEX IF NOT EXISTS idx_famille_accueils_specialites ON famille_accueils USING GIN(specialites);
CREATE INDEX IF NOT EXISTS idx_famille_accueils_localisation ON famille_accueils(latitude, longitude);
