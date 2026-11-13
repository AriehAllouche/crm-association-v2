-- ============================================
-- ICAD - Historique des demandes de transfert
-- ============================================
-- Retour utilisateur : conserver l'historique des
-- détenteurs et des démarches ICAD. Une fois une
-- demande enregistrée, elle n'est JAMAIS écrasée :
-- chaque étape (envoi, attente, validation, transfert
-- EPA) est tracée avec ses dates et justificatifs.
-- ============================================

-- ============================================
-- 1. TABLE icad_demandes
-- ============================================
CREATE TABLE IF NOT EXISTS icad_demandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  -- Ancien détenteur (figé au moment de la demande)
  ancien_detenteur_nom text,
  ancien_detenteur_prenom text,
  ancien_detenteur_contact text, -- téléphone ou email
  -- Démarche
  date_envoi_demande date,
  mode_envoi text CHECK (mode_envoi IN ('courrier', 'email', 'main_propre', 'autre')),
  statut text NOT NULL DEFAULT 'a_effectuer' CHECK (statut IN ('a_effectuer', 'envoyee', 'en_attente', 'validee')),
  date_transfert_epa date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icad_demandes_animal ON icad_demandes(animal_id);
CREATE INDEX IF NOT EXISTS idx_icad_demandes_statut ON icad_demandes(statut);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_icad_demandes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS icad_demandes_updated_at ON icad_demandes;
CREATE TRIGGER icad_demandes_updated_at
  BEFORE UPDATE ON icad_demandes
  FOR EACH ROW EXECUTE FUNCTION update_icad_demandes_updated_at();

-- RLS : même politique que le reste de l'app (authentifié)
ALTER TABLE icad_demandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "icad_demandes_select_authenticated" ON icad_demandes;
CREATE POLICY "icad_demandes_select_authenticated" ON icad_demandes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "icad_demandes_insert_authenticated" ON icad_demandes;
CREATE POLICY "icad_demandes_insert_authenticated" ON icad_demandes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "icad_demandes_update_authenticated" ON icad_demandes;
CREATE POLICY "icad_demandes_update_authenticated" ON icad_demandes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "icad_demandes_delete_authenticated" ON icad_demandes;
CREATE POLICY "icad_demandes_delete_authenticated" ON icad_demandes FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- 2. DOCUMENTS : autoriser module 'icad'
--    pour lier les justificatifs à une demande
-- ============================================
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_module_check;
ALTER TABLE documents ADD CONSTRAINT documents_module_check CHECK (module IN (
  'animal', 'signalement', 'famille_accueil', 'adoption', 'veterinaire',
  'justice', 'pension', 'transport', 'communication', 'icad', 'autre'
));

-- ============================================
-- 3. TIMELINE : autoriser action_type 'icad'
-- ============================================
ALTER TABLE timeline DROP CONSTRAINT IF EXISTS timeline_action_type_check;
ALTER TABLE timeline ADD CONSTRAINT timeline_action_type_check CHECK (action_type IN (
  'statut_change', 'veterinaire_visite', 'transport',
  'famille_accueil', 'adoption', 'justice', 'pension',
  'signalement', 'document', 'alerte', 'autre',
  'depense', 'communication', 'registre', 'icad'
));

-- ============================================
-- 4. TRIGGER TIMELINE sur icad_demandes
-- ============================================
CREATE OR REPLACE FUNCTION trigger_timeline_icad_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'icad',
    'Demande ICAD créée' || CASE WHEN NEW.ancien_detenteur_nom IS NOT NULL
      THEN ' — ex-détenteur: ' || COALESCE(NEW.ancien_detenteur_prenom || ' ', '') || NEW.ancien_detenteur_nom
      ELSE '' END,
    jsonb_build_object('demande_id', NEW.id, 'statut', NEW.statut, 'mode_envoi', NEW.mode_envoi, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_timeline_icad_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne log que les changements de statut significatifs
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      NEW.animal_id, 'icad',
      'Demande ICAD: ' || OLD.statut || ' → ' || NEW.statut,
      jsonb_build_object('demande_id', NEW.id, 'ancien_statut', OLD.statut, 'nouveau_statut', NEW.statut, 'action', 'UPDATE'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_icad_insert ON icad_demandes;
CREATE TRIGGER trigger_icad_insert AFTER INSERT ON icad_demandes
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_icad_insert();

DROP TRIGGER IF EXISTS trigger_icad_update ON icad_demandes;
CREATE TRIGGER trigger_icad_update AFTER UPDATE ON icad_demandes
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_icad_update();

-- ============================================
-- FIN DE MIGRATION
-- ============================================
