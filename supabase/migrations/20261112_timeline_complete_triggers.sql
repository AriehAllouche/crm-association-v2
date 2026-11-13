-- ============================================
-- TIMELINE COMPLÈTE - Triggers manquants + Backfill
-- ============================================
-- Objectif : faire de la table `timeline` la source de vérité
-- absolue pour l'historique de chaque animal.
--
-- 1. Étend le CHECK action_type ('depense', 'communication', 'registre')
-- 2. Corrige generate_timeline_description (colonne transports.type)
-- 3. Backfill depuis les tables sources existantes (idempotent)
-- 4. Ajoute les triggers manquants :
--    - pension_sejours (INSERT/UPDATE/DELETE)
--    - depenses (INSERT/DELETE)
--    - registre_entrees_sorties (INSERT)
--    - communications (INSERT)
--    - documents (INSERT)
--    - animals (UPDATE sur changement de statut)
-- ============================================

-- ============================================
-- 1. EXTENSION DU CHECK action_type
-- ============================================
ALTER TABLE timeline DROP CONSTRAINT IF EXISTS timeline_action_type_check;
ALTER TABLE timeline ADD CONSTRAINT timeline_action_type_check CHECK (action_type IN (
  'statut_change', 'veterinaire_visite', 'transport',
  'famille_accueil', 'adoption', 'justice', 'pension',
  'signalement', 'document', 'alerte', 'autre',
  'depense', 'communication', 'registre'
));

-- ============================================
-- 2. CORRECTION generate_timeline_description
--    La fonction référençait transports.type_transport
--    (colonne inexistante) -> tout INSERT transport
--    aurait fait échouer le trigger.
-- ============================================
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
      SELECT 'Visite vétérinaire: ' || COALESCE(motif, 'Non spécifié') INTO v_description
      FROM veterinaire_visites WHERE id = p_record_id;
    WHEN 'transport' THEN
      SELECT 'Transport: ' || COALESCE(lieu_depart, '?') || ' → ' || COALESCE(lieu_arrivee, '?') INTO v_description
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
-- 3. BACKFILL depuis les tables sources
--    Chaque INSERT est gardé par NOT EXISTS pour
--    rester idempotent en cas de ré-exécution.
-- ============================================

-- Signalements
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT s.animal_id, 'signalement',
       'Signalement: ' || COALESCE(s.motif, 'Non spécifié'),
       jsonb_build_object('signalement_id', s.id, 'numero_dossier', s.numero_dossier, 'motif', s.motif, 'urgence', s.urgence, 'backfill', true),
       s.date_signalement::timestamptz
FROM signalements s
WHERE s.animal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = s.animal_id
      AND t.action_type = 'signalement'
      AND t.created_at::date = s.date_signalement::date
      AND t.description = 'Signalement: ' || COALESCE(s.motif, 'Non spécifié')
  );

-- Visites vétérinaires
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT v.animal_id, 'veterinaire_visite',
       'Visite vétérinaire: ' || COALESCE(v.motif, 'Non spécifié'),
       jsonb_build_object('visite_id', v.id, 'date_visite', v.date_visite, 'motif', v.motif, 'veterinaire_id', v.veterinaire_id, 'backfill', true),
       v.date_visite::timestamptz
FROM veterinaire_visites v
WHERE NOT EXISTS (
  SELECT 1 FROM timeline t
  WHERE t.animal_id = v.animal_id
    AND t.action_type = 'veterinaire_visite'
    AND t.created_at::date = v.date_visite::date
    AND t.description = 'Visite vétérinaire: ' || COALESCE(v.motif, 'Non spécifié')
);

-- Transports
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT tr.animal_id, 'transport',
       'Transport: ' || COALESCE(tr.lieu_depart, '?') || ' → ' || COALESCE(tr.lieu_arrivee, '?'),
       jsonb_build_object('transport_id', tr.id, 'date_transport', tr.date_transport, 'type', tr.type_transport, 'lieu_depart', tr.lieu_depart, 'lieu_arrivee', tr.lieu_arrivee, 'backfill', true),
       tr.date_transport::timestamptz
FROM transports tr
WHERE NOT EXISTS (
  SELECT 1 FROM timeline t
  WHERE t.animal_id = tr.animal_id
    AND t.action_type = 'transport'
    AND t.created_at::date = tr.date_transport::date
    AND t.description = 'Transport: ' || COALESCE(tr.lieu_depart, '?') || ' → ' || COALESCE(tr.lieu_arrivee, '?')
);

-- Familles d'accueil (placement + fin éventuelle)
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT faa.animal_id, 'famille_accueil',
       'Placement en famille d''accueil',
       jsonb_build_object('fa_animal_id', faa.id, 'famille_accueil_id', faa.famille_accueil_id, 'date_debut', faa.date_debut, 'statut', faa.statut, 'backfill', true),
       faa.date_debut::timestamptz
FROM famille_accueil_animaux faa
WHERE faa.date_debut IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = faa.animal_id
      AND t.action_type = 'famille_accueil'
      AND t.created_at::date = faa.date_debut::date
      AND t.description = 'Placement en famille d''accueil'
  );

INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT faa.animal_id, 'famille_accueil',
       'Fin de placement FA',
       jsonb_build_object('fa_animal_id', faa.id, 'famille_accueil_id', faa.famille_accueil_id, 'date_fin', faa.date_fin, 'notes', faa.notes, 'backfill', true),
       faa.date_fin::timestamptz
FROM famille_accueil_animaux faa
WHERE faa.date_fin IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = faa.animal_id
      AND t.action_type = 'famille_accueil'
      AND t.created_at::date = faa.date_fin::date
      AND t.description = 'Fin de placement FA'
  );

-- Adoptions
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT a.animal_id, 'adoption',
       'Adoption: ' || COALESCE(a.adoptant_nom, 'Non spécifié'),
       jsonb_build_object('adoption_id', a.id, 'adoptant_nom', a.adoptant_nom, 'statut', a.statut, 'date_candidature', a.date_candidature, 'backfill', true),
       a.date_candidature::timestamptz
FROM adoptions a
WHERE NOT EXISTS (
  SELECT 1 FROM timeline t
  WHERE t.animal_id = a.animal_id
    AND t.action_type = 'adoption'
    AND t.created_at::date = a.date_candidature::date
    AND t.description = 'Adoption: ' || COALESCE(a.adoptant_nom, 'Non spécifié')
);

-- Dossiers justice
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT j.animal_id, 'justice',
       'Dossier justice: ' || COALESCE(j.numero_parquet, 'Non spécifié'),
       jsonb_build_object('justice_id', j.id, 'numero_parquet', j.numero_parquet, 'statut', j.statut, 'backfill', true),
       j.created_at
FROM justice_cases j
WHERE j.animal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = j.animal_id
      AND t.action_type = 'justice'
      AND t.created_at::date = j.created_at::date
      AND t.description = 'Dossier justice: ' || COALESCE(j.numero_parquet, 'Non spécifié')
  );

-- Séjours pension (entrée + sortie éventuelle)
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT ps.animal_id, 'pension',
       'Séjour pension: ' || COALESCE(p.nom, 'Non spécifié'),
       jsonb_build_object('sejour_id', ps.id, 'pension_id', ps.pension_id, 'date_entree', ps.date_entree, 'backfill', true),
       ps.date_entree::timestamptz
FROM pension_sejours ps
LEFT JOIN pensions p ON p.id = ps.pension_id
WHERE NOT EXISTS (
  SELECT 1 FROM timeline t
  WHERE t.animal_id = ps.animal_id
    AND t.action_type = 'pension'
    AND t.created_at::date = ps.date_entree::date
    AND t.description = 'Séjour pension: ' || COALESCE(p.nom, 'Non spécifié')
);

INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT ps.animal_id, 'pension',
       'Sortie pension: ' || COALESCE(p.nom, 'Non spécifié'),
       jsonb_build_object('sejour_id', ps.id, 'pension_id', ps.pension_id, 'date_sortie', ps.date_sortie, 'backfill', true),
       ps.date_sortie::timestamptz
FROM pension_sejours ps
LEFT JOIN pensions p ON p.id = ps.pension_id
WHERE ps.date_sortie IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = ps.animal_id
      AND t.action_type = 'pension'
      AND t.created_at::date = ps.date_sortie::date
      AND t.description = 'Sortie pension: ' || COALESCE(p.nom, 'Non spécifié')
  );

-- Dépenses
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT d.animal_id, 'depense',
       d.description || ' — ' || d.montant || ' €',
       jsonb_build_object('depense_id', d.id, 'type', d.categorie, 'montant', d.montant, 'date_depense', d.date_depense, 'backfill', true),
       d.date_depense::timestamptz
FROM depenses d
WHERE d.animal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = d.animal_id
      AND t.action_type = 'depense'
      AND t.created_at::date = d.date_depense::date
      AND t.description = d.description || ' — ' || d.montant || ' €'
  );

-- Registre entrées/sorties
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT r.animal_id, 'registre',
       COALESCE(r.motif, CASE WHEN r.type_mouvement = 'entree' THEN 'Entrée au registre' ELSE 'Sortie du registre' END),
       jsonb_build_object('registre_id', r.id, 'type', r.type_mouvement, 'backfill', true),
       r.date::timestamptz
FROM registre_entrees_sorties r
WHERE NOT EXISTS (
  SELECT 1 FROM timeline t
  WHERE t.animal_id = r.animal_id
    AND t.action_type = 'registre'
    AND t.created_at::date = r.date::date
    AND t.description = COALESCE(r.motif, CASE WHEN r.type_mouvement = 'entree' THEN 'Entrée au registre' ELSE 'Sortie du registre' END)
);

-- Communications
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT c.animal_id, 'communication',
       COALESCE(c.titre, c.type_publication) || CASE WHEN c.plateforme IS NOT NULL AND array_length(c.plateforme, 1) > 0 THEN ' — ' || array_to_string(c.plateforme, ', ') ELSE '' END,
       jsonb_build_object('communication_id', c.id, 'type', c.type_publication, 'canal', array_to_string(c.plateforme, ', '), 'backfill', true),
       c.date_publication::timestamptz
FROM communications c
WHERE c.animal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = c.animal_id
      AND t.action_type = 'communication'
      AND t.created_at::date = c.date_publication::date
      AND t.description = COALESCE(c.titre, c.type_publication) || CASE WHEN c.plateforme IS NOT NULL AND array_length(c.plateforme, 1) > 0 THEN ' — ' || array_to_string(c.plateforme, ', ') ELSE '' END
  );

-- Documents
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT doc.animal_id, 'document',
       'Document: ' || doc.nom_fichier,
       jsonb_build_object('document_id', doc.id, 'type_document', doc.type_document, 'nom_fichier', doc.nom_fichier, 'backfill', true),
       doc.created_at
FROM documents doc
WHERE doc.animal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM timeline t
    WHERE t.animal_id = doc.animal_id
      AND t.action_type = 'document'
      AND t.created_at::date = doc.created_at::date
      AND t.description = 'Document: ' || doc.nom_fichier
  );

-- Historique des statuts
INSERT INTO timeline (animal_id, action_type, description, metadata, created_at)
SELECT h.animal_id, 'statut_change',
       'Changement de statut: ' || h.ancien_statut || ' → ' || h.nouveau_statut,
       jsonb_build_object('status_history_id', h.id, 'ancien_statut', h.ancien_statut, 'nouveau_statut', h.nouveau_statut, 'raison', h.raison, 'backfill', true),
       h.date_changement::timestamptz
FROM animal_status_history h
WHERE NOT EXISTS (
  SELECT 1 FROM timeline t
  WHERE t.animal_id = h.animal_id
    AND t.action_type = 'statut_change'
    AND t.created_at::date = h.date_changement::date
    AND t.description = 'Changement de statut: ' || h.ancien_statut || ' → ' || h.nouveau_statut
);

-- ============================================
-- 4. TRIGGERS MANQUANTS
-- ============================================

-- --- pension_sejours ---
CREATE OR REPLACE FUNCTION trigger_timeline_pension_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'pension',
    'Séjour pension: ' || COALESCE((SELECT nom FROM pensions WHERE id = NEW.pension_id), 'Non spécifié'),
    jsonb_build_object('sejour_id', NEW.id, 'pension_id', NEW.pension_id, 'date_entree', NEW.date_entree, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_timeline_pension_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne log que la sortie effective (date_sortie nouvellement renseignée)
  IF OLD.date_sortie IS NULL AND NEW.date_sortie IS NOT NULL THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      NEW.animal_id, 'pension',
      'Sortie pension: ' || COALESCE((SELECT nom FROM pensions WHERE id = NEW.pension_id), 'Non spécifié'),
      jsonb_build_object('sejour_id', NEW.id, 'pension_id', NEW.pension_id, 'date_sortie', NEW.date_sortie, 'action', 'UPDATE'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_timeline_pension_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    OLD.animal_id, 'pension',
    'Annulation séjour pension',
    jsonb_build_object('sejour_id', OLD.id, 'pension_id', OLD.pension_id, 'deleted_values', row_to_json(OLD), 'action', 'DELETE'),
    auth.uid()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pension_insert ON pension_sejours;
CREATE TRIGGER trigger_pension_insert AFTER INSERT ON pension_sejours
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_pension_insert();

DROP TRIGGER IF EXISTS trigger_pension_update ON pension_sejours;
CREATE TRIGGER trigger_pension_update AFTER UPDATE ON pension_sejours
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_pension_update();

DROP TRIGGER IF EXISTS trigger_pension_delete ON pension_sejours;
CREATE TRIGGER trigger_pension_delete AFTER DELETE ON pension_sejours
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_pension_delete();

-- --- depenses ---
CREATE OR REPLACE FUNCTION trigger_timeline_depense_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.animal_id IS NOT NULL THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      NEW.animal_id, 'depense',
      NEW.description || ' — ' || NEW.montant || ' €',
      jsonb_build_object('depense_id', NEW.id, 'type', NEW.categorie, 'montant', NEW.montant, 'date_depense', NEW.date_depense, 'action', 'INSERT'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_timeline_depense_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.animal_id IS NOT NULL THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      OLD.animal_id, 'depense',
      'Suppression dépense: ' || OLD.description,
      jsonb_build_object('depense_id', OLD.id, 'deleted_values', row_to_json(OLD), 'action', 'DELETE'),
      auth.uid()
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_depense_insert ON depenses;
CREATE TRIGGER trigger_depense_insert AFTER INSERT ON depenses
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_depense_insert();

DROP TRIGGER IF EXISTS trigger_depense_delete ON depenses;
CREATE TRIGGER trigger_depense_delete AFTER DELETE ON depenses
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_depense_delete();

-- --- registre_entrees_sorties ---
CREATE OR REPLACE FUNCTION trigger_timeline_registre_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'registre',
    COALESCE(NEW.motif, CASE WHEN NEW.type_mouvement = 'entree' THEN 'Entrée au registre' ELSE 'Sortie du registre' END),
    jsonb_build_object('registre_id', NEW.id, 'type', NEW.type_mouvement, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registre_insert ON registre_entrees_sorties;
CREATE TRIGGER trigger_registre_insert AFTER INSERT ON registre_entrees_sorties
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_registre_insert();

-- --- communications ---
CREATE OR REPLACE FUNCTION trigger_timeline_communication_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.animal_id IS NOT NULL THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      NEW.animal_id, 'communication',
      COALESCE(NEW.titre, NEW.type_publication) || CASE WHEN NEW.plateforme IS NOT NULL AND array_length(NEW.plateforme, 1) > 0 THEN ' — ' || array_to_string(NEW.plateforme, ', ') ELSE '' END,
      jsonb_build_object('communication_id', NEW.id, 'type', NEW.type_publication, 'canal', array_to_string(NEW.plateforme, ', '), 'action', 'INSERT'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_communication_insert ON communications;
CREATE TRIGGER trigger_communication_insert AFTER INSERT ON communications
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_communication_insert();

-- --- documents ---
CREATE OR REPLACE FUNCTION trigger_timeline_document_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.animal_id IS NOT NULL THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      NEW.animal_id, 'document',
      'Document: ' || NEW.nom_fichier,
      jsonb_build_object('document_id', NEW.id, 'type_document', NEW.type_document, 'nom_fichier', NEW.nom_fichier, 'action', 'INSERT'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_insert ON documents;
CREATE TRIGGER trigger_document_insert AFTER INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_document_insert();

-- --- animals : changement de statut ---
CREATE OR REPLACE FUNCTION trigger_timeline_animal_statut_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
    VALUES (
      NEW.id, 'statut_change',
      'Changement de statut: ' || OLD.statut || ' → ' || NEW.statut,
      jsonb_build_object('ancien_statut', OLD.statut, 'nouveau_statut', NEW.statut, 'action', 'UPDATE'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_animal_statut_update ON animals;
CREATE TRIGGER trigger_animal_statut_update AFTER UPDATE ON animals
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_animal_statut_update();

-- ============================================
-- FIN DE MIGRATION
-- ============================================
