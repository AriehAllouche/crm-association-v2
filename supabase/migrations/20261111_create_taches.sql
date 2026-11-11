-- Table pour les tâches personnelles
CREATE TABLE IF NOT EXISTS taches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  date_echeance DATE,
  priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('faible', 'normale', 'urgente', 'critique')),
  categorie TEXT DEFAULT 'admin' CHECK (categorie IN ('admin', 'terrain', 'communication', 'sante', 'adoption', 'autre')),
  assigne_a UUID REFERENCES auth.users(id),
  statut TEXT DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'termine')),
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_completion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_taches_assigne_a ON taches(assigne_a);
CREATE INDEX IF NOT EXISTS idx_taches_statut ON taches(statut);
CREATE INDEX IF NOT EXISTS idx_taches_date_echeance ON taches(date_echeance);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_taches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER taches_updated_at
  BEFORE UPDATE ON taches
  FOR EACH ROW
  EXECUTE FUNCTION update_taches_updated_at();

-- RLS (Row Level Security)
ALTER TABLE taches ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés
CREATE POLICY "Users can view their own tasks" ON taches
  FOR SELECT USING (auth.uid() = assigne_a);

CREATE POLICY "Users can insert their own tasks" ON taches
  FOR INSERT WITH CHECK (auth.uid() = assigne_a);

CREATE POLICY "Users can update their own tasks" ON taches
  FOR UPDATE USING (auth.uid() = assigne_a);

CREATE POLICY "Users can delete their own tasks" ON taches
  FOR DELETE USING (auth.uid() = assigne_a);

-- Politique pour les admins (voir toutes les tâches)
CREATE POLICY "Admins can view all tasks" ON taches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
