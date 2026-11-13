-- ============================================
-- ANIMAL - Champs prise en charge (PEC)
-- ============================================
-- Retour utilisateur : enrichir la fiche animal avec
-- l'origine de la prise en charge, le service demandeur
-- et les circonstances de récupération.
-- ============================================

ALTER TABLE animals ADD COLUMN IF NOT EXISTS numero_tatouage text;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS origine_pec text;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS service_demandeur text;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS service_demandeur_contact text;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS circonstances_pec text;

COMMENT ON COLUMN animals.numero_tatouage IS 'Numéro de tatouage (distinct de la puce ICAD)';
COMMENT ON COLUMN animals.origine_pec IS 'Origine de la prise en charge : animal_errant, abandon, police, gendarmerie, fourriere, requisition_judiciaire, autre';
COMMENT ON COLUMN animals.service_demandeur IS 'Service à l''origine de la demande (ex: Gendarmerie de Lyon)';
COMMENT ON COLUMN animals.service_demandeur_contact IS 'Coordonnées du service demandeur (tél, email, adresse)';
COMMENT ON COLUMN animals.circonstances_pec IS 'Circonstances de la récupération de l''animal';
