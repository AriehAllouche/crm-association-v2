-- Table pour le registre de prêt matériel aux familles d'accueil
CREATE TABLE IF NOT EXISTS materiel_prets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  famille_accueil_id UUID NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  type_materiel VARCHAR(100) NOT NULL, -- 'longe', 'cage', 'collier', 'harnais', 'gamelle', 'etc.'
  description TEXT,
  date_attribution DATE NOT NULL DEFAULT CURRENT_DATE,
  date_restitution DATE,
  statut VARCHAR(20) DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'restitue', 'perdu', 'casse')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_materiel_prets_famille ON materiel_prets(famille_accueil_id);
CREATE INDEX IF NOT EXISTS idx_materiel_prets_animal ON materiel_prets(animal_id);
CREATE INDEX IF NOT EXISTS idx_materiel_prets_statut ON materiel_prets(statut);
CREATE INDEX IF NOT EXISTS idx_materiel_prets_dates ON materiel_prets(date_attribution, date_restitution);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_materiel_prets_updated_at BEFORE UPDATE ON materiel_prets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE materiel_prets IS 'Registre de prêt matériel aux familles daccueil';
COMMENT ON COLUMN materiel_prets.type_materiel IS 'Type de matériel prêté (longe, cage, collier, harnais, etc.)';
COMMENT ON COLUMN materiel_prets.statut IS 'Statut du prêt: en_cours, restitue, perdu, casse';
