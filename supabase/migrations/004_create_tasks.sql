-- Migration: Création de la table tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text,
  date_echeance date NOT NULL,
  heure_echeance time,
  priorite text DEFAULT 'normal' CHECK (priorite IN ('faible', 'normal', 'urgent', 'critique')),
  responsable_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  statut text DEFAULT 'active' CHECK (statut IN ('active', 'terminee')),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_authenticated" ON tasks;
CREATE POLICY "tasks_select_authenticated" ON tasks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "tasks_insert_authenticated" ON tasks;
CREATE POLICY "tasks_insert_authenticated" ON tasks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_update_authenticated" ON tasks;
CREATE POLICY "tasks_update_authenticated" ON tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_delete_authenticated" ON tasks;
CREATE POLICY "tasks_delete_authenticated" ON tasks FOR DELETE
  TO authenticated USING (true);
