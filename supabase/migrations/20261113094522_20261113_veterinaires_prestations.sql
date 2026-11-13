/*
# Vétérinaires : prestations et tarifs détaillés

## Contexte
Le point 6 du cahier des charges demande de pouvoir rechercher les vétérinaires
par prestation (diagnose morphologique, évaluation comportementale, prise en
charge dans le cadre de réquisitions judiciaires) et d'enregistrer les tarifs
négociés pour chaque prestation.

## Changements
1. Colonnes ajoutées à la table `veterinaires` :
   - `diagnose_morpho` (boolean) — pratique les diagnoses morphologiques de
     décatégorisation.
   - `evaluation_comportementale` (boolean) — pratique les évaluations
     comportementales.
   - `pec_requisitions` (boolean) — prend en charge dans le cadre de
     réquisitions judiciaires.
   - `tarif_vaccination` (numeric) — tarif d'une vaccination.
   - `tarif_diagnose` (numeric) — tarif d'une diagnose morphologique.
   - `tarif_evaluation` (numeric) — tarif d'une évaluation comportementale.
   - `departement` (text) — département du cabinet, pour la recherche.

2. Sécurité
   - La table `veterinaires` a déjà RLS activée et des policies existantes.
   - Aucune modification de policy : les nouvelles colonnes héritent des grants
     déjà présents sur la table.

## Notes
- Toutes les colonnes sont optionnelles (nullable) pour ne pas casser les
  enregistrements existants.
- Idempotent : chaque ALTER TABLE vérifie l'existence de la colonne.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'diagnose_morpho') THEN
    ALTER TABLE veterinaires ADD COLUMN diagnose_morpho boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'evaluation_comportementale') THEN
    ALTER TABLE veterinaires ADD COLUMN evaluation_comportementale boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'pec_requisitions') THEN
    ALTER TABLE veterinaires ADD COLUMN pec_requisitions boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'tarif_vaccination') THEN
    ALTER TABLE veterinaires ADD COLUMN tarif_vaccination numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'tarif_diagnose') THEN
    ALTER TABLE veterinaires ADD COLUMN tarif_diagnose numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'tarif_evaluation') THEN
    ALTER TABLE veterinaires ADD COLUMN tarif_evaluation numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veterinaires' AND column_name = 'departement') THEN
    ALTER TABLE veterinaires ADD COLUMN departement text;
  END IF;
END $$;
