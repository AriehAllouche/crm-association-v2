-- ============================================
-- CARNET DE SANTÉ - Vaccinations & Soins
-- ============================================
-- Retour utilisateur : véritable suivi médical.
-- - vaccinations : valences distinctes (rage, DHPPi...),
--   primo + rappels illimités, échéances par injection
-- - sante_soins : vermifuges, antiparasitaires,
--   stérilisation, diagnose morphologique
-- Historique jamais écrasé : chaque injection/soin
-- est une ligne figée avec ses dates et justificatifs.
-- ============================================

-- ============================================
-- 1. TABLE vaccinations
-- ============================================
CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  vaccin text NOT NULL,                    -- ex: DHPPi, Rage, Leuco, FVRCP, FeLV
  type_injection text NOT NULL DEFAULT 'rappel'
    CHECK (type_injection IN ('primo', 'rappel', 'complement')),
  date_injection date NOT NULL,
  date_prochain_rappel date,               -- selon indications vétérinaire
  veterinaire_id uuid REFERENCES veterinaires(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccinations_animal ON vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_echeance ON vaccinations(date_prochain_rappel) WHERE date_prochain_rappel IS NOT NULL;

CREATE OR REPLACE FUNCTION update_vaccinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vaccinations_updated_at ON vaccinations;
CREATE TRIGGER vaccinations_updated_at
  BEFORE UPDATE ON vaccinations
  FOR EACH ROW EXECUTE FUNCTION update_vaccinations_updated_at();

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccinations_select_authenticated" ON vaccinations;
CREATE POLICY "vaccinations_select_authenticated" ON vaccinations FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "vaccinations_insert_authenticated" ON vaccinations;
CREATE POLICY "vaccinations_insert_authenticated" ON vaccinations FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "vaccinations_update_authenticated" ON vaccinations;
CREATE POLICY "vaccinations_update_authenticated" ON vaccinations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vaccinations_delete_authenticated" ON vaccinations;
CREATE POLICY "vaccinations_delete_authenticated" ON vaccinations FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 2. TABLE sante_soins (vermifuges, antiparasitaires,
--    stérilisation, diagnose morphologique)
-- ============================================
CREATE TABLE IF NOT EXISTS sante_soins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('vermifuge', 'antiparasitaire', 'sterilisation', 'diagnose_morphologique')),
  produit text,                            -- ex: Drontal, Advocate, Nobivac
  date_soin date NOT NULL,
  dosage text,                             -- ex: 1 cp / 10 kg
  prochain_traitement date,                -- pour vermifuges/antiparasitaires
  resultat text,                           -- pour diagnose morphologique
  veterinaire_id uuid REFERENCES veterinaires(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sante_soins_animal ON sante_soins(animal_id);
CREATE INDEX IF NOT EXISTS idx_sante_soins_type ON sante_soins(type);
CREATE INDEX IF NOT EXISTS idx_sante_soins_prochain ON sante_soins(prochain_traitement) WHERE prochain_traitement IS NOT NULL;

CREATE OR REPLACE FUNCTION update_sante_soins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sante_soins_updated_at ON sante_soins;
CREATE TRIGGER sante_soins_updated_at
  BEFORE UPDATE ON sante_soins
  FOR EACH ROW EXECUTE FUNCTION update_sante_soins_updated_at();

ALTER TABLE sante_soins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sante_soins_select_authenticated" ON sante_soins;
CREATE POLICY "sante_soins_select_authenticated" ON sante_soins FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "sante_soins_insert_authenticated" ON sante_soins;
CREATE POLICY "sante_soins_insert_authenticated" ON sante_soins FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sante_soins_update_authenticated" ON sante_soins;
CREATE POLICY "sante_soins_update_authenticated" ON sante_soins FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sante_soins_delete_authenticated" ON sante_soins;
CREATE POLICY "sante_soins_delete_authenticated" ON sante_soins FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 3. DOCUMENTS : autoriser module 'sante'
--    (justificatifs stérilisation, rapports diagnose,
--     ordonnances, factures liés à un soin)
-- ============================================
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_module_check;
ALTER TABLE documents ADD CONSTRAINT documents_module_check CHECK (module IN (
  'animal', 'signalement', 'famille_accueil', 'adoption', 'veterinaire',
  'justice', 'pension', 'transport', 'communication', 'icad', 'sante', 'autre'
));

-- ============================================
-- 4. TIMELINE : action_type 'vaccination', 'sante_soin'
-- ============================================
ALTER TABLE timeline DROP CONSTRAINT IF EXISTS timeline_action_type_check;
ALTER TABLE timeline ADD CONSTRAINT timeline_action_type_check CHECK (action_type IN (
  'statut_change', 'veterinaire_visite', 'transport',
  'famille_accueil', 'adoption', 'justice', 'pension',
  'signalement', 'document', 'alerte', 'autre',
  'depense', 'communication', 'registre', 'icad',
  'vaccination', 'sante_soin'
));

-- ============================================
-- 5. TRIGGERS TIMELINE
-- ============================================
CREATE OR REPLACE FUNCTION trigger_timeline_vaccination_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'vaccination',
    'Vaccination ' || NEW.vaccin || ' (' || NEW.type_injection || ') — ' || NEW.date_injection,
    jsonb_build_object('vaccination_id', NEW.id, 'vaccin', NEW.vaccin, 'type_injection', NEW.type_injection, 'date_injection', NEW.date_injection, 'date_prochain_rappel', NEW.date_prochain_rappel, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vaccination_insert ON vaccinations;
CREATE TRIGGER trigger_vaccination_insert AFTER INSERT ON vaccinations
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_vaccination_insert();

CREATE OR REPLACE FUNCTION trigger_timeline_sante_soin_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'sante_soin',
    'Soins: ' || NEW.type || CASE WHEN NEW.produit IS NOT NULL THEN ' — ' || NEW.produit ELSE '' END || ' — ' || NEW.date_soin,
    jsonb_build_object('soin_id', NEW.id, 'type', NEW.type, 'produit', NEW.produit, 'date_soin', NEW.date_soin, 'prochain_traitement', NEW.prochain_traitement, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sante_soin_insert ON sante_soins;
CREATE TRIGGER trigger_sante_soin_insert AFTER INSERT ON sante_soins
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_sante_soin_insert();

-- ============================================
-- FIN DE MIGRATION
-- ============================================
