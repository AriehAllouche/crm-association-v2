-- ============================================
-- OBSERVATIONS & MORSURES
-- ============================================
-- Retour utilisateur :
-- - état initial de l'animal + évolution datée
--   (santé, comportement, blessures, maigreur,
--    craintes, agressivité) — jamais écrasé
-- - déclarations de morsure : évaluations
--   comportementales, niveaux de risque 1-4,
--   mesures imposées, pension éducative
-- ============================================

-- 1. OBSERVATIONS datées (état initial + évolution)
CREATE TABLE IF NOT EXISTS animal_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  date_observation date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL DEFAULT 'comportement' CHECK (type IN ('arrivee', 'sante', 'comportement', 'autre')),
  contenu text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_animal_observations_animal ON animal_observations(animal_id);

ALTER TABLE animal_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "animal_observations_select" ON animal_observations;
CREATE POLICY "animal_observations_select" ON animal_observations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "animal_observations_insert" ON animal_observations;
CREATE POLICY "animal_observations_insert" ON animal_observations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "animal_observations_update" ON animal_observations;
CREATE POLICY "animal_observations_update" ON animal_observations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "animal_observations_delete" ON animal_observations;
CREATE POLICY "animal_observations_delete" ON animal_observations FOR DELETE TO authenticated USING (true);

-- 2. DÉCLARATIONS DE MORSURE
CREATE TABLE IF NOT EXISTS morsures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  date_declaration date NOT NULL DEFAULT CURRENT_DATE,
  lieu text,
  circonstances text,
  victime_description text,
  niveau_risque int CHECK (niveau_risque BETWEEN 1 AND 4),
  evaluation_comportementale text,
  mesures_imposees text,
  pension_educative boolean DEFAULT false,
  suivi text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_morsures_animal ON morsures(animal_id);

CREATE OR REPLACE FUNCTION update_morsures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS morsures_updated_at ON morsures;
CREATE TRIGGER morsures_updated_at
  BEFORE UPDATE ON morsures
  FOR EACH ROW EXECUTE FUNCTION update_morsures_updated_at();

ALTER TABLE morsures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "morsures_select" ON morsures;
CREATE POLICY "morsures_select" ON morsures FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "morsures_insert" ON morsures;
CREATE POLICY "morsures_insert" ON morsures FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "morsures_update" ON morsures;
CREATE POLICY "morsures_update" ON morsures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "morsures_delete" ON morsures;
CREATE POLICY "morsures_delete" ON morsures FOR DELETE TO authenticated USING (true);

-- 3. TIMELINE : action_type 'observation', 'morsure'
ALTER TABLE timeline DROP CONSTRAINT IF EXISTS timeline_action_type_check;
ALTER TABLE timeline ADD CONSTRAINT timeline_action_type_check CHECK (action_type IN (
  'statut_change', 'veterinaire_visite', 'transport',
  'famille_accueil', 'adoption', 'justice', 'pension',
  'signalement', 'document', 'alerte', 'autre',
  'depense', 'communication', 'registre', 'icad',
  'vaccination', 'sante_soin', 'observation', 'morsure'
));

CREATE OR REPLACE FUNCTION trigger_timeline_observation_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'observation',
    'Observation (' || NEW.type || '): ' || LEFT(NEW.contenu, 120),
    jsonb_build_object('observation_id', NEW.id, 'type_observation', NEW.type, 'date_observation', NEW.date_observation, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_observation_insert ON animal_observations;
CREATE TRIGGER trigger_observation_insert AFTER INSERT ON animal_observations
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_observation_insert();

CREATE OR REPLACE FUNCTION trigger_timeline_morsure_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'morsure',
    'Déclaration de morsure — risque ' || COALESCE(NEW.niveau_risque::text, '?') || '/4',
    jsonb_build_object('morsure_id', NEW.id, 'date_declaration', NEW.date_declaration, 'niveau_risque', NEW.niveau_risque, 'pension_educative', NEW.pension_educative, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_morsure_insert ON morsures;
CREATE TRIGGER trigger_morsure_insert AFTER INSERT ON morsures
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_morsure_insert();

-- ============================================
-- FIN DE MIGRATION
-- ============================================
