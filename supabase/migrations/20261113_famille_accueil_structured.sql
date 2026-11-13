-- ============================================
-- FAMILLES D'ACCUEIL - Champs structurés
-- ============================================
-- Retour utilisateur : les infos Google Sheets sont
-- dans les notes ; les répartir en champs spécifiques
-- avec menus déroulants et cases à cocher.
-- Le formulaire envoyait déjà ~20 colonnes inexistantes
-- (création cassée) -> on les crée toutes.
-- ============================================

-- 1. Département (recherche par numéro : 11, 27, 73, 74...)
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS departement int;

-- Backfill depuis le code postal (2A/2B Corsica -> 2)
UPDATE famille_accueils
SET departement = CASE
  WHEN code_postal ~ '^20[0-9]{3}$' THEN 2
  WHEN code_postal ~ '^21[0-9]{3}$' THEN 2
  WHEN code_postal ~ '^[0-9]{5}$' THEN CAST(SUBSTRING(code_postal FROM 1 FOR 2) AS int)
  ELSE NULL
END
WHERE departement IS NULL AND code_postal IS NOT NULL;

-- 2. Colonnes envoyées par le formulaire mais inexistantes
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS materiel_confie text;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS croquettes_fournies text;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS especes_acceptees text[] DEFAULT '{}';
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS ages_acceptes text[] DEFAULT '{}';
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS tailles_acceptees text[] DEFAULT '{}';
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS nombre_adultes int DEFAULT 1;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS nombre_enfants int DEFAULT 0;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS ages_enfants text;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS autres_animaux boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS superficie numeric;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS peut_isoler boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS attestation_categorise boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS patience_chiot_chaton boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS patience_adulte_traumatise boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS animal_reste_seul boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS temps_seul text;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS vehiculee boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS peut_se_deplacer boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS specialites text[] DEFAULT '{}';

-- 3. Nouveaux champs structurés (retour utilisateur)
-- Composition du foyer : déjà couvert par nombre_adultes/nombre_enfants/ages_enfants
-- Animaux personnels : chiens, chats, autres
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS a_chien_personnel boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS a_chat_personnel boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS a_autre_animal_personnel boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS animaux_personnels_details text;
-- Animaux acceptés : chiots, chatons, petits/grands chiens
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accepte_chiots boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accepte_chatons boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accepte_petits_chiens boolean DEFAULT false;
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS accepte_grands_chiens boolean DEFAULT false;
-- Capacité et durée d'accueil
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS duree_accueil text; -- temporaire, longue_duree, definitive...
-- Disponibilité réelle
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS disponibilite text; -- immediate, a_partir_du, sur_demande...
ALTER TABLE famille_accueils ADD COLUMN IF NOT EXISTS date_disponibilite date;

-- 4. Index pour la recherche par critères
CREATE INDEX IF NOT EXISTS idx_famille_accueils_departement ON famille_accueils(departement);
CREATE INDEX IF NOT EXISTS idx_famille_accueils_disponibilite ON famille_accueils(disponibilite);

-- ============================================
-- FIN DE MIGRATION
-- ============================================
