/*
# Auto-depense visite veto + ancien detenteur + champs jardin FA

## Changements

### 1. Trigger auto-depense sur veterinaire_visites
Quand une visite veterinaire avec un cout > 0 est inseree, une ligne de
depense correspondante est creee automatiquement, evitant la double saisie.
- Fonction `auto_create_depense_from_visite()` : SECURITY DEFINER, insere
  dans depenses avec type='veterinaire', montant=cout, date=date_visite,
  description contient le motif et le nom de l'animal.
- Trigger `trg_visite_auto_depense` AFTER INSERT ON veterinaire_visites.

### 2. Ancien detenteur sur animals
- `ancien_detenteur_nom` (text)
- `ancien_detenteur_prenom` (text)
- `ancien_detenteur_contact` (text) — telephone ou email

### 3. Champs jardin sur famille_accueils
- `a_jardin` (boolean) — presence d'un exterieur
- `a_jardin_cloture` (boolean) — jardin cloture ou non

## Securite
- La fonction trigger est SECURITY DEFINER pour pouvoir inserer dans
  depenses quel que soit le role appelant.
- RLS deja active sur les tables concernees ; les nouvelles colonnes
  heritent des grants existants.
*/

-- 2. Ancien detenteur sur animals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'ancien_detenteur_nom') THEN
    ALTER TABLE animals ADD COLUMN ancien_detenteur_nom text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'ancien_detenteur_prenom') THEN
    ALTER TABLE animals ADD COLUMN ancien_detenteur_prenom text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'ancien_detenteur_contact') THEN
    ALTER TABLE animals ADD COLUMN ancien_detenteur_contact text;
  END IF;
END $$;

-- 3. Champs jardin sur famille_accueils
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'famille_accueils' AND column_name = 'a_jardin') THEN
    ALTER TABLE famille_accueils ADD COLUMN a_jardin boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'famille_accueils' AND column_name = 'a_jardin_cloture') THEN
    ALTER TABLE famille_accueils ADD COLUMN a_jardin_cloture boolean DEFAULT false;
  END IF;
END $$;

-- 1. Trigger auto-depense sur veterinaire_visites
CREATE OR REPLACE FUNCTION auto_create_depense_from_visite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_animal_nom text;
BEGIN
  -- Ne rien faire si pas de cout ou cout = 0
  IF NEW.cout IS NULL OR NEW.cout <= 0 THEN
    RETURN NEW;
  END IF;

  -- Recuperer le nom de l'animal pour la description
  SELECT nom INTO v_animal_nom FROM animals WHERE id = NEW.animal_id;

  -- Inserer la depense (eviter les doublons si la visite a deja une depense liee)
  INSERT INTO depenses (animal_id, type, description, montant, date_depense)
  VALUES (
    NEW.animal_id,
    'veterinaire',
    COALESCE('Visite veto: ' || NEW.motif, 'Visite veterinaire') ||
      CASE WHEN v_animal_nom IS NOT NULL THEN ' — ' || v_animal_nom ELSE '' END,
    NEW.cout,
    NEW.date_visite
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visite_auto_depense ON veterinaire_visites;
CREATE TRIGGER trg_visite_auto_depense
  AFTER INSERT ON veterinaire_visites
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_depense_from_visite();
