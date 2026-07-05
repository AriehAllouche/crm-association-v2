-- Migration: Ajout du système de validation pour les Familles d'Accueil

-- Ajouter les colonnes status et rejection_reason à la table famille_accueils
ALTER TABLE famille_accueils 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'En attente' CHECK (status IN ('En attente', 'Validée', 'Refusée')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Créer un index pour optimiser les requêtes sur le status
CREATE INDEX IF NOT EXISTS idx_famille_accueils_status ON famille_accueils(status);
