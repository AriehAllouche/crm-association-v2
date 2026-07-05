-- Migration: Ajout du système de dossiers pour les documents

-- Ajouter la colonne folder à la table documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'Général';

-- Créer un index pour optimiser les requêtes sur les dossiers
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);
