-- Migration pour ajouter les champs manquants identifiés dans le fichier Excel de l'association
-- Basée sur l'analyse du fichier Excel fourni

-- Ajout des champs ICAD et documents
ALTER TABLE animals ADD COLUMN IF NOT EXISTS icad_done BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS requisition BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS sortie_fourriere BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS icad_epa BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS icad_non_epa BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS certificat_cession BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS cni_recu BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS duplicata_carte BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_envoi_icad DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_valide_epa DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS attente_icad BOOLEAN DEFAULT FALSE;

-- Ajout des champs santé et soins
ALTER TABLE animals ADD COLUMN IF NOT EXISTS en_pension BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS primo_vaccination BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_vaccin DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS rappel_vaccin BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_rappel DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS diagnose TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS delais_rdv TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_diagnose DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS sterilisation BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_sterilisation DATE;

-- Ajout des champs adoption et sortie
ALTER TABLE animals ADD COLUMN IF NOT EXISTS caution TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS frais_adoption TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS adopte BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS adoptant_nom TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS lieu_intervention TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_sortie DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS famille_accueil_actuelle TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS mail_famille_accueil TEXT;

-- Ajout des statuts spéciaux (booléens pour les états rapides)
ALTER TABLE animals ADD COLUMN IF NOT EXISTS remis_proprietaire BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS a_l_adoption BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS fa_en_vue_adoption BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS cedere_autre_asso BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS transfert_asso BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS perdu BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS reserve BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS vole BOOLEAN DEFAULT FALSE;

-- Ajout d'un champ pour les notes supplémentaires
ALTER TABLE animals ADD COLUMN IF NOT EXISTS notes_excel TEXT;

-- Ajout des champs adoption et sortie
ALTER TABLE animals ADD COLUMN IF NOT EXISTS caution TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS frais_adoption TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS adopte BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS adoptant_nom TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS lieu_intervention TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS date_sortie DATE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS famille_accueil_actuelle TEXT;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS mail_famille_accueil TEXT;

-- Ajout des statuts spéciaux (booléens pour les états rapides)
ALTER TABLE animals ADD COLUMN IF NOT EXISTS remis_proprietaire BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS a_l_adoption BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS fa_en_vue_adoption BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS cedere_autre_asso BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS transfert_asso BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS perdu BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS reserve BOOLEAN DEFAULT FALSE;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS vole BOOLEAN DEFAULT FALSE;

-- Ajout d'un champ pour les notes supplémentaires
ALTER TABLE animals ADD COLUMN IF NOT EXISTS notes_excel TEXT;

-- Commentaires pour documenter les nouveaux champs
COMMENT ON COLUMN animals.icad_done IS 'ICAD effectué (booléen)';
COMMENT ON COLUMN animals.requisition IS 'Sous réquisition judiciaire';
COMMENT ON COLUMN animals.sortie_fourriere IS 'Sorti de fourrière';
COMMENT ON COLUMN animals.icad_epa IS 'ICAD EPA (Équivalent Puce Américaine)';
COMMENT ON COLUMN animals.icad_non_epa IS 'ICAD non EPA';
COMMENT ON COLUMN animals.certificat_cession IS 'Certificat de cession reçu';
COMMENT ON COLUMN animals.cni_recu IS 'Carte d''identité reçue';
COMMENT ON COLUMN animals.duplicata_carte IS 'Duplicata ou carte reçu';
COMMENT ON COLUMN animals.date_envoi_icad IS 'Date d''envoi ICAD / Date valide EPA';
COMMENT ON COLUMN animals.date_valide_epa IS 'Date de validité EPA';
COMMENT ON COLUMN animals.attente_icad IS 'En attente ICAD';

COMMENT ON COLUMN animals.en_pension IS 'Animal en pension';
COMMENT ON COLUMN animals.primo_vaccination IS 'Première vaccination faite';
COMMENT ON COLUMN animals.date_vaccin IS 'Date de vaccination';
COMMENT ON COLUMN animals.rappel_vaccin IS 'Rappel de vaccination fait';
COMMENT ON COLUMN animals.date_rappel IS 'Date du rappel';
COMMENT ON COLUMN animals.diagnose IS 'Diagnostic vétérinaire';
COMMENT ON COLUMN animals.delais_rdv IS 'Délais pour rendez-vous';
COMMENT ON COLUMN animals.date_diagnose IS 'Date du diagnostic';
COMMENT ON COLUMN animals.sterilisation IS 'Animal stérilisé';
COMMENT ON COLUMN animals.date_sterilisation IS 'Date de stérilisation';

COMMENT ON COLUMN animals.caution IS 'Montant de la caution';
COMMENT ON COLUMN animals.frais_adoption IS 'Frais d''adoption';
COMMENT ON COLUMN animals.adopte IS 'Animal adopté';
COMMENT ON COLUMN animals.adoptant_nom IS 'Nom de l''adoptant';
COMMENT ON COLUMN animals.lieu_intervention IS 'Lieu d''intervention';
COMMENT ON COLUMN animals.date_sortie IS 'Date de sortie';
COMMENT ON COLUMN animals.famille_accueil_actuelle IS 'Famille d''accueil actuelle';
COMMENT ON COLUMN animals.mail_famille_accueil IS 'Email de la famille d''accueil';

COMMENT ON COLUMN animals.remis_proprietaire IS 'Remis à son propriétaire';
COMMENT ON COLUMN animals.a_l_adoption IS 'À l''adoption';
COMMENT ON COLUMN animals.fa_en_vue_adoption IS 'En famille d''accueil en vue d''adoption';
COMMENT ON COLUMN animals.cedere_autre_asso IS 'À céder à une autre association';
COMMENT ON COLUMN animals.transfert_asso IS 'Transfert à une autre association';
COMMENT ON COLUMN animals.perdu IS 'Animal perdu';
COMMENT ON COLUMN animals.reserve IS 'Animal réservé';
COMMENT ON COLUMN animals.vole IS 'Animal volé';
COMMENT ON COLUMN animals.notes_excel IS 'Notes supplémentaires du fichier Excel';
