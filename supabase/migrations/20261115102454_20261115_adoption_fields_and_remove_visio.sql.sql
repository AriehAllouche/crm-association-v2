-- Add adoption tracking fields: caution stérilisation, ICAD animal number
ALTER TABLE adoptions
  ADD COLUMN IF NOT EXISTS caution_sterilisation numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS caution_versee boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS caution_restituee boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_caution_versement date,
  ADD COLUMN IF NOT EXISTS date_caution_restitution date,
  ADD COLUMN IF NOT EXISTS icad_animal text;

-- Migrate any existing 'visio' status to 'pre_visite' (visio is no longer a standalone status)
UPDATE adoptions SET statut = 'pre_visite' WHERE statut = 'visio';
