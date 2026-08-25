/*
# Ajout du statut sur les placements FA

## Description
Ajoute une colonne `statut` à la table `famille_accueil_animaux` pour gérer
les états: prévu, en_cours, termine.

Modifie aussi `date_debut` pour la rendre nullable (prévu = pas encore de date).

## Changements
- Ajout colonne `statut` avec valeurs: 'prevu', 'en_cours', 'termine'
- Migration des données existantes:
  - date_fin IS NULL AND date_debut <= CURRENT_DATE → 'en_cours'
  - date_fin IS NOT NULL → 'termine'  
  - date_fin IS NULL AND date_debut > CURRENT_DATE → 'prevu' (futur)
- Rend `date_debut` nullable (pour les placements prévus sans date fixée)
- Index sur le statut pour requêtes filtrées
*/

-- Ajouter la colonne statut
ALTER TABLE famille_accueil_animaux 
ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'en_cours' 
CHECK (statut IN ('prevu', 'en_cours', 'termine'));

-- Rendre date_debut nullable
ALTER TABLE famille_accueil_animaux 
ALTER COLUMN date_debut DROP NOT NULL;

-- Migration des données existantes
-- Ceux avec date_fin = terminé
UPDATE famille_accueil_animaux 
SET statut = 'termine' 
WHERE date_fin IS NOT NULL;

-- Ceux avec date_debut dans le futur = prévu
UPDATE famille_accueil_animaux 
SET statut = 'prevu' 
WHERE date_fin IS NULL AND date_debut > CURRENT_DATE;

-- Les autres = en cours (déjà la valeur par défaut)

-- Index sur le statut
CREATE INDEX IF NOT EXISTS idx_faa_statut ON famille_accueil_animaux(statut);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_faa_famille_statut ON famille_accueil_animaux(famille_accueil_id, statut);
CREATE INDEX IF NOT EXISTS idx_faa_animal_statut ON famille_accueil_animaux(animal_id, statut);