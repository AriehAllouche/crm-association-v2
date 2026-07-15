-- ============================================
-- PHÉNIX V1.0 - Étape 1: Timeline & Scoring FA
-- ============================================
-- Ajustements stratégiques:
-- 1. Timeline avec triggers INSERT/UPDATE/DELETE (100% fiable)
-- 2. Colonnes préférences scoring FA + notes_equipe_interne (décision humaine)
-- 3. Index pour performance temps réel (< 30s)
-- ============================================

-- ============================================
-- 1. TABLE TIMELINE (Source de vérité absolue)
-- ============================================
CREATE TABLE IF NOT EXISTS timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'statut_change', 'veterinaire_visite', 'transport', 
    'famille_accueil', 'adoption', 'justice', 'pension',
    'signalement', 'document', 'alerte', 'autre'
  )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS sur timeline
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timeline_select_authenticated" ON timeline;
CREATE POLICY "timeline_select_authenticated" ON timeline FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "timeline_insert_authenticated" ON timeline;
CREATE POLICY "timeline_insert_authenticated" ON timeline FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "timeline_update_authenticated" ON timeline;
CREATE POLICY "timeline_update_authenticated" ON timeline FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "timeline_delete_authenticated" ON timeline;
CREATE POLICY "timeline_delete_authenticated" ON timeline FOR DELETE
  TO authenticated USING (true);

-- Index pour performance (< 30s)
CREATE INDEX IF NOT EXISTS idx_timeline_animal_created ON timeline(animal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_action_type ON timeline(action_type);

-- ============================================
-- 2. COLONNES PRÉFÉRENCES SCORING dans famille_accueils
-- ============================================
ALTER TABLE famille_accueils 
  ADD COLUMN IF NOT EXISTS accepte_chats boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepte_chiens boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS a_jardin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS a_jardin_cloture boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepte_chien_male boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepte_chien_femelle boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS experience_animaux boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS type_logement text CHECK (type_logement IN ('appartement', 'maison', 'ferme', 'autre')),
  ADD COLUMN IF NOT EXISTS enfants_maison boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS horaires_travail text,
  ADD COLUMN IF NOT EXISTS preferences_comportement text[],
  ADD COLUMN IF NOT EXISTS distance_max_km int,
  ADD COLUMN IF NOT EXISTS notes_equipe_interne text DEFAULT ''; -- Décision humaine préservée

-- ============================================
-- 3. FONCTIONS HELPER pour Timeline
-- ============================================

-- Fonction pour générer description automatique
CREATE OR REPLACE FUNCTION generate_timeline_description(
  p_action_type text,
  p_table_name text,
  p_record_id uuid
) RETURNS text AS $$
DECLARE
  v_description text;
BEGIN
  CASE p_action_type
    WHEN 'veterinaire_visite' THEN
      SELECT 'Visite vétérinaire: ' || motif INTO v_description
      FROM veterinaire_visites WHERE id = p_record_id;
    WHEN 'transport' THEN
      SELECT 'Transport: ' || COALESCE(type_transport, 'Non spécifié') INTO v_description
      FROM transports WHERE id = p_record_id;
    WHEN 'famille_accueil' THEN
      SELECT 'Placement famille d''accueil: ' || COALESCE(nom, 'Non spécifié') INTO v_description
      FROM famille_accueils WHERE id = p_record_id;
    WHEN 'adoption' THEN
      SELECT 'Adoption: ' || COALESCE(adoptant_nom, 'Non spécifié') INTO v_description
      FROM adoptions WHERE id = p_record_id;
    WHEN 'justice' THEN
      SELECT 'Dossier justice: ' || COALESCE(numero_parquet, 'Non spécifié') INTO v_description
      FROM justice_cases WHERE id = p_record_id;
    WHEN 'signalement' THEN
      SELECT 'Signalement: ' || COALESCE(motif, 'Non spécifié') INTO v_description
      FROM signalements WHERE id = p_record_id;
    WHEN 'pension' THEN
      SELECT 'Séjour pension: ' || COALESCE(nom, 'Non spécifié') INTO v_description
      FROM pensions WHERE id = p_record_id;
    ELSE
      v_description := 'Action: ' || p_action_type;
  END CASE;
  
  RETURN COALESCE(v_description, 'Action enregistrée');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGERS TIMELINE (INSERT/UPDATE/DELETE)
-- ============================================

-- Trigger pour veterinaire_visites (INSERT)
CREATE OR REPLACE FUNCTION trigger_timeline_veterinaire_visite_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'veterinaire_visite',
    generate_timeline_description('veterinaire_visite', 'veterinaire_visites', NEW.id),
    jsonb_build_object(
      'visite_id', NEW.id,
      'date_visite', NEW.date_visite,
      'motif', NEW.motif,
      'veterinaire_id', NEW.veterinaire_id,
      'action', 'INSERT'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour veterinaire_visites (UPDATE)
CREATE OR REPLACE FUNCTION trigger_timeline_veterinaire_visite_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'veterinaire_visite',
    'Modification visite vétérinaire: ' || NEW.motif,
    jsonb_build_object(
      'visite_id', NEW.id,
      'date_visite', NEW.date_visite,
      'motif', NEW.motif,
      'old_values', row_to_json(OLD),
      'new_values', row_to_json(NEW),
      'action', 'UPDATE'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour veterinaire_visites (DELETE)
CREATE OR REPLACE FUNCTION trigger_timeline_veterinaire_visite_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    OLD.animal_id,
    'veterinaire_visite',
    'Annulation visite vétérinaire: ' || OLD.motif,
    jsonb_build_object(
      'visite_id', OLD.id,
      'date_visite', OLD.date_visite,
      'motif', OLD.motif,
      'deleted_values', row_to_json(OLD),
      'action', 'DELETE'
    ),
    auth.uid()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour transports (INSERT)
CREATE OR REPLACE FUNCTION trigger_timeline_transport_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'transport',
    generate_timeline_description('transport', 'transports', NEW.id),
    jsonb_build_object(
      'transport_id', NEW.id,
      'date_transport', NEW.date_transport,
      'type', NEW.type,
      'lieu_depart', NEW.lieu_depart,
      'lieu_arrivee', NEW.lieu_arrivee,
      'action', 'INSERT'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour transports (UPDATE)
CREATE OR REPLACE FUNCTION trigger_timeline_transport_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'transport',
    'Modification transport',
    jsonb_build_object(
      'transport_id', NEW.id,
      'old_values', row_to_json(OLD),
      'new_values', row_to_json(NEW),
      'action', 'UPDATE'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour transports (DELETE)
CREATE OR REPLACE FUNCTION trigger_timeline_transport_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    OLD.animal_id,
    'transport',
    'Annulation transport',
    jsonb_build_object(
      'transport_id', OLD.id,
      'deleted_values', row_to_json(OLD),
      'action', 'DELETE'
    ),
    auth.uid()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour famille_accueil_animaux (INSERT)
CREATE OR REPLACE FUNCTION trigger_timeline_famille_accueil_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'famille_accueil',
    generate_timeline_description('famille_accueil', 'famille_accueils', NEW.famille_accueil_id),
    jsonb_build_object(
      'fa_animal_id', NEW.id,
      'famille_accueil_id', NEW.famille_accueil_id,
      'date_debut', NEW.date_debut,
      'statut', NEW.statut,
      'action', 'INSERT'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour famille_accueil_animaux (UPDATE)
CREATE OR REPLACE FUNCTION trigger_timeline_famille_accueil_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'famille_accueil',
    'Modification placement famille d''accueil',
    jsonb_build_object(
      'fa_animal_id', NEW.id,
      'famille_accueil_id', NEW.famille_accueil_id,
      'old_values', row_to_json(OLD),
      'new_values', row_to_json(NEW),
      'action', 'UPDATE'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour famille_accueil_animaux (DELETE)
CREATE OR REPLACE FUNCTION trigger_timeline_famille_accueil_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    OLD.animal_id,
    'famille_accueil',
    'Fin placement famille d''accueil',
    jsonb_build_object(
      'fa_animal_id', OLD.id,
      'famille_accueil_id', OLD.famille_accueil_id,
      'deleted_values', row_to_json(OLD),
      'action', 'DELETE'
    ),
    auth.uid()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour adoptions (INSERT)
CREATE OR REPLACE FUNCTION trigger_timeline_adoption_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'adoption',
    generate_timeline_description('adoption', 'adoptions', NEW.id),
    jsonb_build_object(
      'adoption_id', NEW.id,
      'adoptant_nom', NEW.adoptant_nom,
      'statut', NEW.statut,
      'date_candidature', NEW.date_candidature,
      'action', 'INSERT'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour adoptions (UPDATE)
CREATE OR REPLACE FUNCTION trigger_timeline_adoption_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'adoption',
    'Modification dossier adoption',
    jsonb_build_object(
      'adoption_id', NEW.id,
      'old_statut', OLD.statut,
      'new_statut', NEW.statut,
      'action', 'UPDATE'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour justice_cases (INSERT)
CREATE OR REPLACE FUNCTION trigger_timeline_justice_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'justice',
    generate_timeline_description('justice', 'justice_cases', NEW.id),
    jsonb_build_object(
      'justice_id', NEW.id,
      'numero_parquet', NEW.numero_parquet,
      'statut', NEW.statut,
      'action', 'INSERT'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour justice_cases (UPDATE)
CREATE OR REPLACE FUNCTION trigger_timeline_justice_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'justice',
    'Modification dossier justice',
    jsonb_build_object(
      'justice_id', NEW.id,
      'old_statut', OLD.statut,
      'new_statut', NEW.statut,
      'action', 'UPDATE'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour signalements (INSERT)
CREATE OR REPLACE FUNCTION trigger_timeline_signalement_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'signalement',
    generate_timeline_description('signalement', 'signalements', NEW.id),
    jsonb_build_object(
      'signalement_id', NEW.id,
      'numero_dossier', NEW.numero_dossier,
      'motif', NEW.motif,
      'urgence', NEW.urgence,
      'action', 'INSERT'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour signalements (UPDATE)
CREATE OR REPLACE FUNCTION trigger_timeline_signalement_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (
    animal_id, 
    action_type, 
    description, 
    metadata, 
    created_by
  ) VALUES (
    NEW.animal_id,
    'signalement',
    'Modification signalement',
    jsonb_build_object(
      'signalement_id', NEW.id,
      'old_statut', OLD.statut,
      'new_statut', NEW.statut,
      'action', 'UPDATE'
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. ACTIVATION DES TRIGGERS
-- ============================================

-- Veterinaire visites
DROP TRIGGER IF EXISTS trigger_veterinaire_visite_insert ON veterinaire_visites;
CREATE TRIGGER trigger_veterinaire_visite_insert 
  AFTER INSERT ON veterinaire_visites 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_veterinaire_visite_insert();

DROP TRIGGER IF EXISTS trigger_veterinaire_visite_update ON veterinaire_visites;
CREATE TRIGGER trigger_veterinaire_visite_update 
  AFTER UPDATE ON veterinaire_visites 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_veterinaire_visite_update();

DROP TRIGGER IF EXISTS trigger_veterinaire_visite_delete ON veterinaire_visites;
CREATE TRIGGER trigger_veterinaire_visite_delete 
  AFTER DELETE ON veterinaire_visites 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_veterinaire_visite_delete();

-- Transports
DROP TRIGGER IF EXISTS trigger_transport_insert ON transports;
CREATE TRIGGER trigger_transport_insert 
  AFTER INSERT ON transports 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_transport_insert();

DROP TRIGGER IF EXISTS trigger_transport_update ON transports;
CREATE TRIGGER trigger_transport_update 
  AFTER UPDATE ON transports 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_transport_update();

DROP TRIGGER IF EXISTS trigger_transport_delete ON transports;
CREATE TRIGGER trigger_transport_delete 
  AFTER DELETE ON transports 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_transport_delete();

-- Famille accueil animaux
DROP TRIGGER IF EXISTS trigger_famille_accueil_insert ON famille_accueil_animaux;
CREATE TRIGGER trigger_famille_accueil_insert 
  AFTER INSERT ON famille_accueil_animaux 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_famille_accueil_insert();

DROP TRIGGER IF EXISTS trigger_famille_accueil_update ON famille_accueil_animaux;
CREATE TRIGGER trigger_famille_accueil_update 
  AFTER UPDATE ON famille_accueil_animaux 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_famille_accueil_update();

DROP TRIGGER IF EXISTS trigger_famille_accueil_delete ON famille_accueil_animaux;
CREATE TRIGGER trigger_famille_accueil_delete 
  AFTER DELETE ON famille_accueil_animaux 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_famille_accueil_delete();

-- Adoptions
DROP TRIGGER IF EXISTS trigger_adoption_insert ON adoptions;
CREATE TRIGGER trigger_adoption_insert 
  AFTER INSERT ON adoptions 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_adoption_insert();

DROP TRIGGER IF EXISTS trigger_adoption_update ON adoptions;
CREATE TRIGGER trigger_adoption_update 
  AFTER UPDATE ON adoptions 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_adoption_update();

-- Justice cases
DROP TRIGGER IF EXISTS trigger_justice_insert ON justice_cases;
CREATE TRIGGER trigger_justice_insert 
  AFTER INSERT ON justice_cases 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_justice_insert();

DROP TRIGGER IF EXISTS trigger_justice_update ON justice_cases;
CREATE TRIGGER trigger_justice_update 
  AFTER UPDATE ON justice_cases 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_justice_update();

-- Signalements
DROP TRIGGER IF EXISTS trigger_signalement_insert ON signalements;
CREATE TRIGGER trigger_signalement_insert 
  AFTER INSERT ON signalements 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_signalement_insert();

DROP TRIGGER IF EXISTS trigger_signalement_update ON signalements;
CREATE TRIGGER trigger_signalement_update 
  AFTER UPDATE ON signalements 
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_signalement_update();

-- ============================================
-- FIN DE MIGRATION
-- ============================================
