/*
# Ajout de la table de liaison famille_accueil_animaux + index

## Description
Crée la table de liaison N:N entre animaux et famille_accueils.
Un animal peut passer par plusieurs familles d'accueil dans le temps,
et une famille d'accueil peut accueillir plusieurs animaux.
La table suit les dates de début/fin de chaque placement.

## Nouvelle table
- `famille_accueil_animaux`
  - `id` (uuid, PK)
  - `animal_id` (uuid, FK → animals, NOT NULL)
  - `famille_accueil_id` (uuid, FK → famille_accueils, NOT NULL)
  - `date_debut` (date, NOT NULL)
  - `date_fin` (date, nullable — null = placement en cours)
  - `motif_fin` (text, nullable)
  - `notes` (text, nullable)
  - `created_at` (timestamptz)

## Index ajoutés
- Index sur `animal_id` pour toutes les tables de liaison qui n'en ont pas encore
- Index sur `famille_accueil_animaux(animal_id)` et `(famille_accueil_id)`

## Sécurité
- RLS activée, politiques `TO authenticated` (données partagées de l'association)
*/

CREATE TABLE IF NOT EXISTS famille_accueil_animaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  famille_accueil_id uuid NOT NULL REFERENCES famille_accueils(id) ON DELETE CASCADE,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  motif_fin text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE famille_accueil_animaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faa_select_authenticated" ON famille_accueil_animaux;
CREATE POLICY "faa_select_authenticated" ON famille_accueil_animaux FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "faa_insert_authenticated" ON famille_accueil_animaux;
CREATE POLICY "faa_insert_authenticated" ON famille_accueil_animaux FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "faa_update_authenticated" ON famille_accueil_animaux;
CREATE POLICY "faa_update_authenticated" ON famille_accueil_animaux FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "faa_delete_authenticated" ON famille_accueil_animaux;
CREATE POLICY "faa_delete_authenticated" ON famille_accueil_animaux FOR DELETE
  TO authenticated USING (true);

-- Index pour la table de liaison
CREATE INDEX IF NOT EXISTS idx_faa_animal ON famille_accueil_animaux(animal_id);
CREATE INDEX IF NOT EXISTS idx_faa_famille ON famille_accueil_animaux(famille_accueil_id);
CREATE INDEX IF NOT EXISTS idx_faa_actif ON famille_accueil_animaux(date_fin) WHERE date_fin IS NULL;

-- Index manquants sur les tables existantes
CREATE INDEX IF NOT EXISTS idx_communications_animal ON communications(animal_id);
CREATE INDEX IF NOT EXISTS idx_depenses_type ON depenses(type);
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(module, module_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
