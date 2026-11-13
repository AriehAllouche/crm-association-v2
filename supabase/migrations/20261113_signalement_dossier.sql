-- ============================================
-- SIGNALEMENTS - Dossier de suivi complet
-- ============================================
-- Retour utilisateur : transformer chaque signalement
-- en véritable dossier de suivi.
-- - plusieurs enquêteurs (au lieu d'un seul)
-- - comptes rendus d'enquête datés
-- - actions/démarches/visites/interventions avec échéances
-- - décisions et suites données au dossier
-- - animaux liés au dossier (plusieurs, sans ressaisie)
-- - historique chronologique via timeline
-- ============================================

-- ============================================
-- 1. ENQUÊTEURS multiples par signalement
-- ============================================
CREATE TABLE IF NOT EXISTS signalement_enqueteurs (
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  enqueteur_id uuid NOT NULL REFERENCES enqueteurs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (signalement_id, enqueteur_id)
);

ALTER TABLE signalement_enqueteurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signalement_enqueteurs_select" ON signalement_enqueteurs;
CREATE POLICY "signalement_enqueteurs_select" ON signalement_enqueteurs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "signalement_enqueteurs_insert" ON signalement_enqueteurs;
CREATE POLICY "signalement_enqueteurs_insert" ON signalement_enqueteurs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "signalement_enqueteurs_delete" ON signalement_enqueteurs;
CREATE POLICY "signalement_enqueteurs_delete" ON signalement_enqueteurs FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. COMPTES RENDUS D'ENQUÊTE datés
-- ============================================
CREATE TABLE IF NOT EXISTS enquete_compte_rendus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  date_rapport date NOT NULL DEFAULT CURRENT_DATE,
  auteur text,
  contenu text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compte_rendus_signalement ON enquete_compte_rendus(signalement_id);

ALTER TABLE enquete_compte_rendus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compte_rendus_select" ON enquete_compte_rendus;
CREATE POLICY "compte_rendus_select" ON enquete_compte_rendus FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "compte_rendus_insert" ON enquete_compte_rendus;
CREATE POLICY "compte_rendus_insert" ON enquete_compte_rendus FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "compte_rendus_update" ON enquete_compte_rendus;
CREATE POLICY "compte_rendus_update" ON enquete_compte_rendus FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "compte_rendus_delete" ON enquete_compte_rendus;
CREATE POLICY "compte_rendus_delete" ON enquete_compte_rendus FOR DELETE TO authenticated USING (true);

-- ============================================
-- 3. ACTIONS / DÉMARCHES / VISITES / INTERVENTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS enquete_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('visite', 'intervention', 'demarche', 'decision', 'autre')),
  date_action date NOT NULL DEFAULT CURRENT_DATE,
  lieu text,
  description text NOT NULL,
  echeance date,                              -- rappel pour actions en attente
  statut text NOT NULL DEFAULT 'realise' CHECK (statut IN ('planifie', 'realise', 'en_attente')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquete_actions_signalement ON enquete_actions(signalement_id);
CREATE INDEX IF NOT EXISTS idx_enquete_actions_echeance ON enquete_actions(echeance) WHERE echeance IS NOT NULL;

CREATE OR REPLACE FUNCTION update_enquete_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enquete_actions_updated_at ON enquete_actions;
CREATE TRIGGER enquete_actions_updated_at
  BEFORE UPDATE ON enquete_actions
  FOR EACH ROW EXECUTE FUNCTION update_enquete_actions_updated_at();

ALTER TABLE enquete_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enquete_actions_select" ON enquete_actions;
CREATE POLICY "enquete_actions_select" ON enquete_actions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "enquete_actions_insert" ON enquete_actions;
CREATE POLICY "enquete_actions_insert" ON enquete_actions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "enquete_actions_update" ON enquete_actions;
CREATE POLICY "enquete_actions_update" ON enquete_actions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "enquete_actions_delete" ON enquete_actions;
CREATE POLICY "enquete_actions_delete" ON enquete_actions FOR DELETE TO authenticated USING (true);

-- ============================================
-- 4. ANIMAUX LIÉS au dossier (plusieurs, sans ressaisie)
-- ============================================
CREATE TABLE IF NOT EXISTS signalement_animaux (
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'signale' CHECK (role IN ('signale', 'pris_en_charge', 'autre')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (signalement_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_signalement_animaux_animal ON signalement_animaux(animal_id);

ALTER TABLE signalement_animaux ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signalement_animaux_select" ON signalement_animaux;
CREATE POLICY "signalement_animaux_select" ON signalement_animaux FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "signalement_animaux_insert" ON signalement_animaux;
CREATE POLICY "signalement_animaux_insert" ON signalement_animaux FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "signalement_animaux_delete" ON signalement_animaux;
CREATE POLICY "signalement_animaux_delete" ON signalement_animaux FOR DELETE TO authenticated USING (true);

-- ============================================
-- 5. COMMENTAIRES (table utilisée par la page mais
--    jamais créée)
-- ============================================
CREATE TABLE IF NOT EXISTS signalement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signalement_id uuid NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signalement_comments ON signalement_comments(signalement_id);

ALTER TABLE signalement_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signalement_comments_select" ON signalement_comments;
CREATE POLICY "signalement_comments_select" ON signalement_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "signalement_comments_insert" ON signalement_comments;
CREATE POLICY "signalement_comments_insert" ON signalement_comments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "signalement_comments_delete" ON signalement_comments;
CREATE POLICY "signalement_comments_delete" ON signalement_comments FOR DELETE TO authenticated USING (true);

-- ============================================
-- 6. DÉCISION & SUITE sur le signalement
-- ============================================
ALTER TABLE signalements ADD COLUMN IF NOT EXISTS decision text;
ALTER TABLE signalements ADD COLUMN IF NOT EXISTS date_decision date;

-- ============================================
-- 7. TRIGGERS TIMELINE (action_type 'signalement'
--    déjà autorisé)
-- ============================================
CREATE OR REPLACE FUNCTION trigger_timeline_compte_rendu_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  SELECT s.animal_id, 'signalement',
    'Compte rendu d''enquête déposé',
    jsonb_build_object('signalement_id', NEW.signalement_id, 'compte_rendu_id', NEW.id, 'date_rapport', NEW.date_rapport, 'action', 'INSERT'),
    auth.uid()
  FROM signalements s WHERE s.id = NEW.signalement_id AND s.animal_id IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compte_rendu_insert ON enquete_compte_rendus;
CREATE TRIGGER trigger_compte_rendu_insert AFTER INSERT ON enquete_compte_rendus
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_compte_rendu_insert();

CREATE OR REPLACE FUNCTION trigger_timeline_enquete_action_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  SELECT s.animal_id, 'signalement',
    'Action enquête (' || NEW.type || '): ' || LEFT(NEW.description, 120),
    jsonb_build_object('signalement_id', NEW.signalement_id, 'action_id', NEW.id, 'type_action', NEW.type, 'date_action', NEW.date_action, 'echeance', NEW.echeance, 'action', 'INSERT'),
    auth.uid()
  FROM signalements s WHERE s.id = NEW.signalement_id AND s.animal_id IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enquete_action_insert ON enquete_actions;
CREATE TRIGGER trigger_enquete_action_insert AFTER INSERT ON enquete_actions
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_enquete_action_insert();

CREATE OR REPLACE FUNCTION trigger_timeline_signalement_animal_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO timeline (animal_id, action_type, description, metadata, created_by)
  VALUES (
    NEW.animal_id, 'signalement',
    'Animal lié au dossier de signalement',
    jsonb_build_object('signalement_id', NEW.signalement_id, 'animal_id', NEW.animal_id, 'role', NEW.role, 'action', 'INSERT'),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_signalement_animal_insert ON signalement_animaux;
CREATE TRIGGER trigger_signalement_animal_insert AFTER INSERT ON signalement_animaux
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_signalement_animal_insert();

-- ============================================
-- FIN DE MIGRATION
-- ============================================
