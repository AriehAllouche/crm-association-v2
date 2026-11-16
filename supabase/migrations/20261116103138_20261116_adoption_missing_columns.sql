/*
# Adoptions : colonnes manquantes pour suivi complet

## Changements
Ajoute les colonnes manquantes que le frontend reference deja :
- `date_paiement` (date) — date de reception du paiement
- `date_adoption` (date) — date de finalisation de l'adoption
- `date_refus` (date) — date de refus de la candidature
- `contrat_url` (text) — lien vers le contrat signe
- `compte_rendu_previsite_url` (text) — compte rendu de previsite
- `compte_rendu_postvisite_url` (text) — compte rendu de post-visite

## Notes
- La colonne `date_visio` existante est conservee (NEVER DROP) mais n'est
  plus utilisee par le frontend — la previsite en visio est desormais
  enregistree via `date_pre_visite`.
- Toutes les colonnes sont nullable pour ne pas casser les donnees existantes.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'adoptions' AND column_name = 'date_paiement') THEN
    ALTER TABLE adoptions ADD COLUMN date_paiement date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'adoptions' AND column_name = 'date_adoption') THEN
    ALTER TABLE adoptions ADD COLUMN date_adoption date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'adoptions' AND column_name = 'date_refus') THEN
    ALTER TABLE adoptions ADD COLUMN date_refus date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'adoptions' AND column_name = 'contrat_url') THEN
    ALTER TABLE adoptions ADD COLUMN contrat_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'adoptions' AND column_name = 'compte_rendu_previsite_url') THEN
    ALTER TABLE adoptions ADD COLUMN compte_rendu_previsite_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'adoptions' AND column_name = 'compte_rendu_postvisite_url') THEN
    ALTER TABLE adoptions ADD COLUMN compte_rendu_postvisite_url text;
  END IF;
END $$;
