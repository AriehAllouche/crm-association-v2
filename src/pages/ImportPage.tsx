import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Download,
  Users,
  Dog,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { PageHeader, Badge } from '../components/ui';
import { especeLabels, animalStatutLabels } from '../lib/constants';
import type { AnimalEspece, AnimalStatut, SanteStatut, AnimalSexe, FamilleAccueil } from '../types';

interface ImportResult {
  total: number;
  success: number;
  errors: { row: number; message: string }[];
}

interface PreviewRow {
  rowIndex: number;
  data: Record<string, string>;
  valid: boolean;
  error?: string;
}

const columnMapping: Record<string, string> = {
  nom: 'nom',
  name: 'nom',
  espece: 'espece',
  species: 'espece',
  race: 'race',
  breed: 'race',
  sexe: 'sexe',
  sex: 'sexe',
  date_naissance: 'date_naissance',
  birth_date: 'date_naissance',
  naissance: 'date_naissance',
  age: 'age_estime',
  age_estime: 'age_estime',
  couleur: 'couleur',
  color: 'couleur',
  poids: 'poids',
  weight: 'poids',
  taille: 'taille',
  size: 'taille',
  sterilise: 'sterilise',
  sterilized: 'sterilise',
  vaccinne: 'vaccinne',
  vaccine: 'vaccinne',
  vaccinated: 'vaccinne',
  numero_icad: 'numero_icad',
  icad: 'numero_icad',
  numero_puce: 'numero_puce',
  puce: 'numero_puce',
  statut: 'statut',
  status: 'statut',
  description: 'description',
  comportement: 'comportement',
  behavior: 'comportement',
  sante: 'sante_statut',
  sante_statut: 'sante_statut',
  health: 'sante_statut',
  sante_notes: 'sante_notes',
  lieu: 'lieu_actuel',
  lieu_actuel: 'lieu_actuel',
  location: 'lieu_actuel',
  date_prise_en_charge: 'date_prise_en_charge',
  intake_date: 'date_prise_en_charge',
  photo: 'photo_url',
  photo_url: 'photo_url',
};

const familleAccueilColumnMapping: Record<string, string> = {
  // Colonnes de base
  nom: 'nom',
  name: 'nom',
  prenom: 'prenom',
  first_name: 'prenom',
  telephone: 'telephone',
  phone: 'telephone',
  email: 'email',
  adresse: 'adresse',
  address: 'adresse',
  code_postal: 'code_postal',
  postal_code: 'code_postal',
  ville: 'ville',
  city: 'ville',
  departement: 'departement',
  department: 'departement',
  profession: 'profession',
  capacite_max: 'capacite_max',
  capacity: 'capacite_max',
  materiel_confie: 'materiel_confie',
  equipment: 'materiel_confie',
  croquettes_fournies: 'croquettes_fournies',
  food: 'croquettes_fournies',
  notes: 'notes',
  statut: 'statut',
  status: 'statut',
  
  // Colonnes de préférences (noms tronqués dans Excel)
  'quel animal pouvez-vous accueillir': 'especes_acceptees',
  'pouvez-vous accueillir suivant l\'urgence 2 ani...': 'urgence_2_animaux',
  'durée de l\'accueil': 'duree_accueil',
  
  // Colonnes de contexte familial (noms tronqués dans Excel)
  'combien d\'adultes vivent dans votre foyer ?': 'nombre_adultes',
  'combien d\'enfants vivent avec vous ? merci d\'i...': 'nombre_enfants',
  'les membres de la famille sont-ils tous d\'acco...': 'famille_daccord',
  'l\'un des membres de la famille souffre-t-il d\'...': 'allergies',
  'vivez-vous en appartement ou maison ?': 'type_logement',
  'superficie :': 'superficie',
  'l\' animal sera-t-il en présence d\'autres anima...': 'autres_animaux',
  'si oui lesquels :': 'types_autres_animaux',
  'avez-vous la possibilité de les isoler les uns...': 'peut_isoler',
  
  // Colonnes de contraintes (noms tronqués dans Excel)
  'possédez-vous l\'attestation d\'aptitude à déten...': 'attestation_categorise',
  'l\'animal restera-t-il seul dans la journée ?': 'animal_reste_seul',
  'si oui, combien de temps ?': 'temps_seul',
  'etes-vous véhiculée ?': 'vehiculee',
  'pouvez-vous vous déplacer pour aller récupérer...': 'peut_se_deplacer',
  
  // Autres colonnes
  'n° département': 'departement',
  'libre / occupé': 'statut',
  'animal': 'animaux_actuels',
  'animal eu': 'animaux_actuels',
  'date de naissance': 'date_naissance',
  'pseudo facebook': 'pseudo_facebook',
  'compléments d\'informations': 'notes',
};

// Mapping exact des 38 colonnes Excel vers le schéma de base de données
const familleAccueilColumnMappingExact: Record<number, string> = {
  0: 'tags_profil', // Unnamed: 0 - Tags/spécificités
  1: 'departement', // N° département
  2: 'statut_disponibilite', // Libre / Occupé
  3: 'animal_actuel_nom', // Animal
  4: 'historique_animaux_eus', // Animal Eu
  5: 'nom', // Nom
  6: 'prenom', // Prénom
  7: 'telephone', // Téléphone
  8: 'date_naissance', // Date de naissance
  9: 'adresse', // Adresse
  10: 'code_postal', // Code postal
  11: 'ville', // Ville
  12: 'profession', // Profession
  13: 'email', // E-mail
  14: 'pseudo_facebook', // Pseudo Facebook
  15: 'animaux_acceptes', // Quel animal pouvez-vous accueillir
  16: 'accepte_urgences_multiples', // Pouvez-vous accueillir suivant l'urgence 2 animaux
  17: 'duree_accueil', // Durée de l'accueil
  18: 'nb_adultes', // Combien d'adultes vivent dans votre foyer ?
  19: 'nb_enfants_et_ages', // Combien d'enfants vivent avec vous ?
  20: 'accord_famille', // Les membres de la famille sont-ils tous d'accord
  21: 'allergies_foyer', // L'un des membres souffre-t-il d'asthme/allergies
  22: 'type_logement', // Vivez-vous en appartement ou maison ?
  23: 'superficie_logement', // Superficie :
  24: 'presence_autres_animaux', // L'animal sera-t-il en présence d'autres animaux ?
  25: 'details_autres_animaux', // Si oui lesquels :
  26: 'capacite_isolement', // Avez-vous la possibilité de les isoler
  27: 'attestation_categorise', // Possédez-vous l'attestation d'aptitude
  28: 'patience_jeune_animal', // Patience pour chiot/chaton
  29: 'patience_animal_traumatise', // Patience pour animal adulte traumatisé
  30: 'animal_seul_journee', // L'animal restera-t-il seul dans la journée ?
  31: 'duree_absence_quotidienne', // Si oui, combien de temps ?
  32: 'vehicule', // Etes-vous véhiculée ?
  33: 'disponibilite_trajets', // Pouvez-vous vous déplacer
  34: 'remarques_et_notes_libres', // Compléments d'informations
  35: 'champs_supplementaires_1', // Unnamed: 35
  36: 'champs_supplementaires_2', // Unnamed: 36
  37: 'champs_supplementaires_3', // Unnamed: 37
};

// Mapping par nom de colonne avec fuzzy matching
const familleAccueilColumnMappingFuzzy: Record<string, string> = {
  'unnamed: 0': 'tags_profil',
  'n° département': 'departement',
  'libre / occupé': 'statut_disponibilite',
  'animal': 'animal_actuel_nom',
  'animal eu': 'historique_animaux_eus',
  'nom': 'nom',
  'prénom': 'prenom',
  'téléphone': 'telephone',
  'date de naissance': 'date_naissance',
  'adresse': 'adresse',
  'code postal': 'code_postal',
  'ville': 'ville',
  'profession': 'profession',
  'e-mail': 'email',
  'pseudo facebook': 'pseudo_facebook',
  'quel animal pouvez-vous accueillir': 'animaux_acceptes',
  'pouvez-vous accueillir suivant l\'urgence 2 ani...': 'accepte_urgences_multiples',
  'durée de l\'accueil': 'duree_accueil',
  'combien d\'adultes vivent dans votre foyer ?': 'nb_adultes',
  'combien d\'enfants vivent avec vous ? merci d\'i...': 'nb_enfants_et_ages',
  'les membres de la famille sont-ils tous d\'acco...': 'accord_famille',
  'l\'un des membres de la famille souffre-t-il d\'...': 'allergies_foyer',
  'vivez-vous en appartement ou maison ?': 'type_logement',
  'superficie :': 'superficie_logement',
  'l\' animal sera-t-il en présence d\'autres anima...': 'presence_autres_animaux',
  'si oui lesquels :': 'details_autres_animaux',
  'avez-vous la possibilité de les isoler les uns...': 'capacite_isolement',
  'possédez-vous l\'attestation d\'aptitude à déten...': 'attestation_categorise',
  'pensez-vous avoir la patience nécessaire à l\'é...': 'patience_jeune_animal',
  'l\'animal restera-t-il seul dans la journée ?': 'animal_seul_journee',
  'si oui, combien de temps ?': 'duree_absence_quotidienne',
  'etes-vous véhiculée ?': 'vehicule',
  'pouvez-vous vous déplacer pour aller récupérer...': 'disponibilite_trajets',
  'compléments d\'informations': 'remarques_et_notes_libres',
};

const validEspeces = ['chien', 'chat', 'lapin', 'cheval', 'autre'];
const validStatuts = [
  'signale', 'en_enquete', 'pris_en_charge', 'en_famille_accueil',
  'en_pension', 'en_soins', 'a_adopter', 'adopte', 'rendu_proprietaire',
  'decede', 'archive',
];
const validSexes = ['male', 'femelle', 'inconnu'];
const validSante = ['bon', 'moyen', 'grave', 'critique'];

function normalizeValue(value: string, validValues: string[], defaultValue: string): string {
  if (!value) return defaultValue;
  const lower = value.toLowerCase().trim();
  if (validValues.includes(lower)) return lower;
  return defaultValue;
}

function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return ['oui', 'yes', 'true', '1', 'x', 'vrai'].includes(lower);
}

// Parser les notes structurées des FA
function parseFamilleAccueilNotes(notes: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!notes) return result;
  
  // Extraire les informations structurées des notes
  const patterns = {
    statut_terrain: /Statut terrain:\s*([^|]+)/i,
    profession: /Profession:\s*([^|]+)/i,
    souhaits_accueil: /Souhaits accueil:\s*([^|]+)/i,
    duree_dispo: /Durée dispo:\s*([^|]+)/i,
    enfants_ages: /Enfants\/âges:\s*([^|]+)/i,
    logement: /Logement:\s*([^|]+)/i,
    animaux_personnels: /Animaux personnels:\s*([^|]+)/i,
    notes_supp: /Notes supp:\s*(.+)$/i,
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = notes.match(pattern);
    if (match) {
      result[key] = match[1].trim();
    }
  }
  
  return result;
}

function parseDate(value: string): string {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return '';
}

export function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<'animaux' | 'familles_accueil'>('animaux');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setImportResult(null);
    setPreview([]);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const currentMapping = importType === 'animaux' ? columnMapping : familleAccueilColumnMapping;

      const previewRows: PreviewRow[] = rows.map((row, index) => {
        const mapped: Record<string, string> = {};
        
        // Pour les familles d'accueil, utiliser le mapping exact par position
        if (importType === 'familles_accueil') {
          // Convertir la ligne en tableau ordonné pour garantir l'ordre des colonnes
          const rowValues = Object.values(row);
          rowValues.forEach((value, colIndex) => {
            // Essayer d'abord le mapping par position exacte
            let mappedKey = familleAccueilColumnMappingExact[colIndex];
            
            // Si pas trouvé, utiliser le nom de colonne par défaut
            if (!mappedKey) {
              mappedKey = `col_${colIndex}`;
            }
            
            mapped[mappedKey] = String(value ?? '').trim();
          });
        } else {
          // Pour les animaux, utiliser le mapping par nom
          const entries = Object.entries(row);
          entries.forEach(([key, value]) => {
            const lowerKey = key.toLowerCase().trim();
            const mappedKey = currentMapping[lowerKey] ?? lowerKey;
            mapped[mappedKey] = String(value ?? '').trim();
          });
        }

        let valid = true;
        let rowError: string | undefined;

        if (!mapped.nom) {
          valid = false;
          rowError = 'Nom manquant';
        }

        if (importType === 'animaux') {
          if (mapped.espece && !validEspeces.includes(mapped.espece.toLowerCase())) {
            mapped.espece = normalizeValue(mapped.espece, validEspeces, 'autre');
          }
          if (!mapped.espece) mapped.espece = 'chien';

          if (mapped.statut && !validStatuts.includes(mapped.statut.toLowerCase())) {
            mapped.statut = normalizeValue(mapped.statut, validStatuts, 'signale');
          }
          if (!mapped.statut) mapped.statut = 'signale';

          if (mapped.sexe) {
            mapped.sexe = normalizeValue(mapped.sexe, validSexes, 'inconnu');
          }

          if (mapped.sante_statut) {
            mapped.sante_statut = normalizeValue(mapped.sante_statut, validSante, 'bon');
          }

          if (mapped.date_naissance) {
            mapped.date_naissance = parseDate(mapped.date_naissance);
          }
          if (mapped.date_prise_en_charge) {
            mapped.date_prise_en_charge = parseDate(mapped.date_prise_en_charge);
          }

          if (mapped.sterilise) {
            mapped.sterilise = parseBoolean(mapped.sterilise) ? 'true' : 'false';
          }
          if (mapped.vaccinne) {
            mapped.vaccinne = parseBoolean(mapped.vaccinne) ? 'true' : 'false';
          }
        } else {
          // Validation pour familles d'accueil
          if (mapped.capacite_max) {
            mapped.capacite_max = String(parseInt(mapped.capacite_max) || 1);
          } else {
            mapped.capacite_max = '1';
          }
          
          // Parser les champs numériques
          if (mapped.nb_adultes) {
            mapped.nb_adultes = String(parseInt(mapped.nb_adultes) || 1);
          } else {
            mapped.nb_adultes = '1';
          }
          
          if (mapped.nb_enfants_et_ages) {
            // Extraire le nombre d'enfants de la chaîne
            const match = mapped.nb_enfants_et_ages.match(/(\d+)/);
            mapped.nb_enfants_et_ages = match ? match[1] : '0';
          } else {
            mapped.nb_enfants_et_ages = '0';
          }
          
          if (mapped.superficie_logement) {
            mapped.superficie_logement = String(parseInt(mapped.superficie_logement) || 0);
          }
          
          // Parser les champs booléens
          const booleanFields = [
            'accepte_urgences_multiples', 'accord_famille',
            'presence_autres_animaux', 'capacite_isolement',
            'attestation_categorise', 'patience_jeune_animal',
            'patience_animal_traumatise', 'animal_seul_journee',
            'vehicule', 'disponibilite_trajets'
          ];
          
          booleanFields.forEach(field => {
            if (mapped[field]) {
              mapped[field] = parseBoolean(mapped[field]) ? 'true' : 'false';
            } else {
              mapped[field] = 'false';
            }
          });
          
          // Parser le type de logement
          if (mapped.type_logement) {
            const lower = mapped.type_logement.toLowerCase();
            if (lower.includes('appartement')) {
              mapped.type_logement = 'appartement';
            } else if (lower.includes('maison')) {
              mapped.type_logement = 'maison';
            } else {
              mapped.type_logement = '';
            }
          }
          
          // Parser le statut de disponibilité
          if (mapped.statut_disponibilite) {
            const lower = mapped.statut_disponibilite.toLowerCase();
            if (lower.includes('libre')) {
              mapped.statut_disponibilite = 'libre';
            } else if (lower.includes('occup')) {
              mapped.statut_disponibilite = 'occupee';
            } else {
              mapped.statut_disponibilite = 'libre';
            }
          }
          
          // Parser les animaux acceptés (texte -> tableau)
          if (mapped.animaux_acceptes) {
            const animaux = mapped.animaux_acceptes.toLowerCase();
            const accepted = [];
            if (animaux.includes('chien')) accepted.push('chien');
            if (animaux.includes('chat')) accepted.push('chat');
            if (animaux.includes('lapin')) accepted.push('lapin');
            if (animaux.includes('chiot')) accepted.push('chiot');
            if (animaux.includes('chaton')) accepted.push('chaton');
            if (animaux.includes('autre') || animaux.includes('nac')) accepted.push('autre');
            mapped.animaux_acceptes = JSON.stringify(accepted);
          } else {
            mapped.animaux_acceptes = '[]';
          }
          
          // Parser les tags de profil
          if (mapped.tags_profil) {
            const tags = mapped.tags_profil.toLowerCase();
            const profilTags = [];
            if (tags.includes('chat uniquement')) profilTags.push('chat_uniquement');
            if (tags.includes('chien uniquement')) profilTags.push('chien_uniquement');
            if (tags.includes('chiot uniquement')) profilTags.push('chiot_uniquement');
            if (tags.includes('chaton uniquement')) profilTags.push('chaton_uniquement');
            mapped.tags_profil = JSON.stringify(profilTags);
          } else {
            mapped.tags_profil = '[]';
          }
          
          // Parser les notes structurées pour extraire des informations supplémentaires
          // SEULEMENT si les champs sont vides (priorité aux colonnes Excel)
          if (mapped.remarques_et_notes_libres) {
            const parsedNotes = parseFamilleAccueilNotes(mapped.remarques_et_notes_libres);
            
            // Mapper les informations extraites vers les champs appropriés
            // SEULEMENT si le champ est vide
            if (parsedNotes.statut_terrain && !mapped.statut_disponibilite) {
              mapped.statut_disponibilite = parsedNotes.statut_terrain.toLowerCase().includes('libre') ? 'libre' : 'occupee';
            }
            if (parsedNotes.profession && !mapped.profession) {
              mapped.profession = parsedNotes.profession;
            }
            if (parsedNotes.souhaits_accueil && !mapped.animaux_acceptes) {
              mapped.animaux_acceptes = parsedNotes.souhaits_accueil;
            }
            if (parsedNotes.duree_dispo && !mapped.duree_accueil) {
              mapped.duree_accueil = parsedNotes.duree_dispo;
            }
            if (parsedNotes.enfants_ages && !mapped.nb_enfants_et_ages) {
              mapped.nb_enfants_et_ages = parsedNotes.enfants_ages;
            }
            if (parsedNotes.logement && !mapped.type_logement) {
              const lower = parsedNotes.logement.toLowerCase();
              if (lower.includes('appartement')) {
                mapped.type_logement = 'appartement';
              } else if (lower.includes('maison')) {
                mapped.type_logement = 'maison';
              }
              // Extraire la superficie si présente
              const superficieMatch = parsedNotes.logement.match(/(\d+)\s*m/i);
              if (superficieMatch && !mapped.superficie_logement) {
                mapped.superficie_logement = superficieMatch[1];
              }
            }
            if (parsedNotes.animaux_personnels && !mapped.details_autres_animaux) {
              mapped.details_autres_animaux = parsedNotes.animaux_personnels;
              mapped.presence_autres_animaux = 'true';
            }
            if (parsedNotes.notes_supp) {
              mapped.remarques_et_notes_libres = parsedNotes.notes_supp;
            }
          }
        }

        return {
          rowIndex: index + 2,
          data: mapped,
          valid,
          error: rowError,
        };
      });

      setPreview(previewRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) {
      setError('Aucune ligne valide à importer');
      return;
    }

    setLoading(true);
    setError(null);

    const results: ImportResult = {
      total: validRows.length,
      success: 0,
      errors: [],
    };

    // Vérification des doublons
    let rowsToImport = validRows;
    
    if (importType === 'animaux') {
      // Récupérer les animaux existants pour vérifier les doublons
      const { data: existingAnimals } = await supabase
        .from('animals')
        .select('nom, date_naissance, numero_icad');
      
      if (existingAnimals) {
        rowsToImport = validRows.filter((row) => {
          const isDuplicate = existingAnimals.some((existing) => {
            // Vérifier par ICAD si disponible
            if (row.data.numero_icad && existing.numero_icad === row.data.numero_icad) {
              return true;
            }
            // Vérifier par nom + date de naissance
            if (existing.nom === row.data.nom && existing.date_naissance === row.data.date_naissance) {
              return true;
            }
            return false;
          });
          
          if (isDuplicate) {
            results.errors.push({
              row: row.rowIndex,
              message: 'Doublon détecté (animal existe déjà)',
            });
            return false;
          }
          return true;
        });
      }
    } else {
      // Récupérer les familles d'accueil existantes pour vérifier les doublons
      const { data: existingFamilles } = await supabase
        .from('famille_accueils')
        .select('nom, prenom, telephone, email');
      
      if (existingFamilles) {
        rowsToImport = validRows.filter((row) => {
          const isDuplicate = existingFamilles.some((existing) => {
            // Vérifier par email si disponible
            if (row.data.email && existing.email === row.data.email) {
              return true;
            }
            // Vérifier par nom + prénom + téléphone
            if (existing.nom === row.data.nom && 
                existing.prenom === row.data.prenom && 
                existing.telephone === row.data.telephone) {
              return true;
            }
            return false;
          });
          
          if (isDuplicate) {
            results.errors.push({
              row: row.rowIndex,
              message: 'Doublon détecté (famille d\'accueil existe déjà)',
            });
            return false;
          }
          return true;
        });
      }
    }

    if (rowsToImport.length === 0) {
      setImportResult(results);
      setLoading(false);
      return;
    }

    const batchSize = 50;
    for (let i = 0; i < rowsToImport.length; i += batchSize) {
      const batch = rowsToImport.slice(i, i + batchSize);

      if (importType === 'animaux') {
        const payload = batch.map((row) => ({
          nom: row.data.nom,
          espece: row.data.espece as AnimalEspece,
          race: row.data.race || null,
          sexe: (row.data.sexe || 'inconnu') as AnimalSexe,
          date_naissance: row.data.date_naissance || null,
          age_estime: row.data.age_estime || null,
          couleur: row.data.couleur || null,
          poids: row.data.poids || null,
          taille: row.data.taille || null,
          sterilise: row.data.sterilise === 'true',
          vaccinne: row.data.vaccinne === 'true',
          numero_icad: row.data.numero_icad || null,
          numero_puce: row.data.numero_puce || null,
          statut: row.data.statut as AnimalStatut,
          description: row.data.description || null,
          comportement: row.data.comportement || null,
          sante_statut: (row.data.sante_statut || 'bon') as SanteStatut,
          sante_notes: row.data.sante_notes || null,
          photo_url: row.data.photo_url || null,
          lieu_actuel: row.data.lieu_actuel || null,
          date_prise_en_charge: row.data.date_prise_en_charge || null,
        }));

        const { data, error } = await supabase.from('animals').insert(payload).select('id');

        if (error) {
          results.errors.push({
            row: i + 2,
            message: error.message,
          });
        } else if (data) {
          results.success += data.length;
          const registreEntries = data.map((animal) => ({
            animal_id: animal.id,
            numero_entree: `ENT-${Date.now()}-${animal.id.slice(0, 4)}`,
            type: 'entree' as const,
            motif: 'Import depuis Excel',
          }));
          await supabase.from('registre_entrees_sorties').insert(registreEntries);
        }
      } else {
        // Import familles d'accueil avec tous les 38 champs
        const payload = batch.map((row) => ({
          // Champs de base
          nom: row.data.nom,
          prenom: row.data.prenom || null,
          telephone: row.data.telephone || null,
          email: row.data.email || null,
          adresse: row.data.adresse || null,
          code_postal: row.data.code_postal || null,
          ville: row.data.ville || null,
          departement: row.data.departement || null,
          capacite_max: parseInt(row.data.capacite_max) || 1,
          animaux_actuels: parseInt(row.data.animaux_actuels) || 0,
          materiel_confie: row.data.materiel_confie || null,
          croquettes_fournies: row.data.croquettes_fournies || null,
          notes: row.data.notes || null,
          statut: 'actif' as const,
          
          // Champs du fichier Excel spécifique (38 colonnes)
          tags_profil: row.data.tags_profil ? JSON.parse(row.data.tags_profil) : [],
          statut_disponibilite: row.data.statut_disponibilite || 'libre',
          animal_actuel_nom: row.data.animal_actuel_nom || null,
          historique_animaux_eus: row.data.historique_animaux_eus || null,
          date_naissance: row.data.date_naissance || null,
          profession: row.data.profession || null,
          pseudo_facebook: row.data.pseudo_facebook || null,
          animaux_acceptes: row.data.animaux_acceptes ? JSON.parse(row.data.animaux_acceptes) : [],
          accepte_urgences_multiples: row.data.accepte_urgences_multiples === 'true',
          duree_accueil: row.data.duree_accueil || null,
          nb_adultes: parseInt(row.data.nb_adultes) || 1,
          nb_enfants_et_ages: row.data.nb_enfants_et_ages || null,
          accord_famille: row.data.accord_famille === 'true',
          allergies_foyer: row.data.allergies_foyer || null,
          type_logement: row.data.type_logement || null,
          superficie_logement: row.data.superficie_logement ? parseInt(row.data.superficie_logement) : null,
          presence_autres_animaux: row.data.presence_autres_animaux === 'true',
          details_autres_animaux: row.data.details_autres_animaux || null,
          capacite_isolement: row.data.capacite_isolement === 'true',
          attestation_categorise: row.data.attestation_categorise === 'true',
          patience_jeune_animal: row.data.patience_jeune_animal === 'true',
          patience_animal_traumatise: row.data.patience_animal_traumatise === 'true',
          animal_seul_journee: row.data.animal_seul_journee === 'true',
          duree_absence_quotidienne: row.data.duree_absence_quotidienne || null,
          vehicule: row.data.vehicule === 'true',
          disponibilite_trajets: row.data.disponibilite_trajets === 'true',
          remarques_et_notes_libres: row.data.remarques_et_notes_libres || null,
          champs_supplementaires_1: row.data.champs_supplementaires_1 || null,
          champs_supplementaires_2: row.data.champs_supplementaires_2 || null,
          champs_supplementaires_3: row.data.champs_supplementaires_3 || null,
        }));

        const { data, error } = await supabase.from('famille_accueils').insert(payload).select('id');

        if (error) {
          results.errors.push({
            row: i + 2,
            message: error.message,
          });
        } else if (data) {
          results.success += data.length;
        }
      }
    }

    setImportResult(results);
    setLoading(false);

    if (results.success > 0) {
      setTimeout(() => navigate(importType === 'animaux' ? '/animaux' : '/familles-accueil'), 2000);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        nom: 'Rex',
        espece: 'chien',
        race: 'Berger Australien',
        sexe: 'male',
        date_naissance: '2022-03-15',
        age_estime: '~3 ans',
        couleur: 'Noir et feu',
        poids: '20 kg',
        taille: 'Moyen',
        sterilise: 'oui',
        vaccinne: 'oui',
        numero_icad: '250259123456789',
        numero_puce: '',
        statut: 'a_adopter',
        description: 'Trouvé errant sur la commune',
        comportement: 'Doux et sociable',
        sante_statut: 'bon',
        sante_notes: '',
        lieu_actuel: 'Famille d\'accueil - 69',
        date_prise_en_charge: '2024-01-15',
        photo_url: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Animaux');
    XLSX.writeFile(wb, 'phenix_modele_import_animaux.xlsx');
  };

  return (
    <div>
      <PageHeader
        title="Import Excel"
        subtitle="Importez vos données depuis un fichier Excel (.xlsx, .xls, .csv)"
        action={
          <button onClick={downloadTemplate} className="btn-secondary">
            <Download size={18} />
            Modèle Excel
          </button>
        }
      />

      {/* Type d'import */}
      <div className="card mb-6 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-700">Type d'import :</span>
          <div className="flex gap-2">
            <button
              onClick={() => setImportType('animaux')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                importType === 'animaux'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Dog size={16} />
              Animaux
            </button>
            <button
              onClick={() => setImportType('familles_accueil')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                importType === 'familles_accueil'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Users size={16} />
              Familles d'accueil
            </button>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div className="card mb-6 p-6">
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 transition-colors hover:border-primary-400 hover:bg-primary-50/30"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              const input = fileInputRef.current;
              if (input) {
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change'));
              }
            }
          }}
        >
          <FileSpreadsheet size={48} className="mb-3 text-neutral-400" />
          <p className="mb-1 font-medium text-neutral-700">
            Glissez votre fichier Excel ici
          </p>
          <p className="mb-4 text-sm text-neutral-500">
            ou cliquez pour parcourir
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            <Upload size={18} />
            Choisir un fichier
          </button>
          {fileName && (
            <p className="mt-3 text-sm text-neutral-600">
              Fichier: <span className="font-medium">{fileName}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={32} className="animate-spin text-primary-500" />
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="card mb-6 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-success-500" />
            <div>
              <p className="font-heading text-lg font-semibold text-neutral-900">
                Import terminé
              </p>
              <p className="text-sm text-neutral-500">
                {importResult.success} {importType === 'animaux' ? 'animal' : 'famille d\'accueil'}{importResult.success > 1 ? (importType === 'animaux' ? 'ux' : 's') : ''} importé{importResult.success > 1 ? 's' : ''} sur {importResult.total}
              </p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-error-50 p-4">
              <p className="mb-2 text-sm font-medium text-error-700">
                Erreurs ({importResult.errors.length}) :
              </p>
              <ul className="space-y-1 text-sm text-error-600">
                {importResult.errors.map((err, i) => (
                  <li key={i}>Ligne {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
            <ArrowRight size={16} />
            Redirection vers la liste des animaux...
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && !importResult && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-neutral-900">
                Aperçu des données
              </h2>
              <p className="text-sm text-neutral-500">
                {preview.filter((r) => r.valid).length} lignes valides sur {preview.length}
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={loading || preview.filter((r) => r.valid).length === 0}
              className="btn-primary"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              Importer {preview.filter((r) => r.valid).length} {importType === 'animaux' ? 'animal' : 'famille d\'accueil'}{preview.filter((r) => r.valid).length > 1 ? (importType === 'animaux' ? 'ux' : 's') : ''}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Ligne</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Nom</th>
                  {importType === 'animaux' ? (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Espèce</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Race</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Statut</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">ICAD</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Prénom</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Téléphone</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Ville</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Capacité</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Statut Dispo</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Animaux Acceptés</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Type Logement</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Superficie</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Adultes</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-600">Enfants</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {preview.slice(0, 50).map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={row.valid ? 'table-row-hover' : 'bg-error-50/50'}
                  >
                    <td className="px-4 py-3 text-neutral-500">{row.rowIndex}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {row.data.nom || '—'}
                    </td>
                    {importType === 'animaux' ? (
                      <>
                        <td className="px-4 py-3 text-neutral-600">
                          {especeLabels[row.data.espece] || row.data.espece}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.race || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">
                          {animalStatutLabels[row.data.statut as AnimalStatut] || row.data.statut}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.numero_icad || '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-neutral-600">{row.data.prenom || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.telephone || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.ville || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.capacite_max || '1'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.statut_disponibilite || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">
                          {row.data.animaux_acceptes ? JSON.parse(row.data.animaux_acceptes).join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.type_logement || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.superficie_logement || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.nb_adultes || '—'}</td>
                        <td className="px-4 py-3 text-neutral-600">{row.data.nb_enfants_et_ages || '—'}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      {row.valid ? (
                        <Badge className="bg-success-100 text-success-700">OK</Badge>
                      ) : (
                        <Badge className="bg-error-100 text-error-700">{row.error}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="px-4 py-3 text-center text-sm text-neutral-500">
                ... et {preview.length - 50} autres lignes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Help */}
      <div className="mt-6 card p-5">
        <h3 className="mb-3 font-heading text-base font-semibold text-neutral-900">
          Colonnes reconnues
        </h3>
        <p className="mb-3 text-sm text-neutral-600">
          Votre fichier Excel doit contenir au minimum une colonne <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-primary-600">nom</code>.
          Les colonnes suivantes sont automatiquement détectées (insensible à la casse) :
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {importType === 'animaux' ? (
            <>
              {[
                'nom', 'espece (chien/chat/lapin/cheval/autre)', 'race', 'sexe (male/femelle/inconnu)',
                'date_naissance', 'age_estime', 'couleur', 'poids', 'taille',
                'sterilise (oui/non)', 'vaccinne (oui/non)', 'numero_icad', 'numero_puce',
                'statut', 'description', 'comportement', 'sante_statut (bon/moyen/grave/critique)',
                'sante_notes', 'lieu_actuel', 'date_prise_en_charge', 'photo_url',
              ].map((col) => (
                <div key={col} className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
                  {col}
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                'nom', 'prenom', 'telephone', 'email', 'adresse',
                'code_postal', 'ville', 'departement', 'capacite_max',
                'materiel_confie', 'croquettes_fournies', 'notes', 'statut',
                'quel animal pouvez-vous accueillir', 'combien d\'adultes vivent dans votre foyer ?',
                'combien d\'enfants vivent avec vous ?', 'vivez-vous en appartement ou maison ?',
                'superficie', 'l\'animal sera-t-il en présence d\'autres animaux ?',
                'avez-vous la possibilité de les isoler les uns des autres ?',
                'possédez-vous l\'attestation d\'aptitude à détenir un chien catégorisé ?',
                'pensez-vous avoir la patience nécessaire à l\'éducation d\'un chiot ou d\'un chaton ?',
                'l\'animal restera-t-il seul dans la journée ?', 'etes-vous véhiculée ?',
                'pouvez-vous vous déplacer pour aller récupérer l\'animal ?',
              ].map((col) => (
                <div key={col} className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
                  {col}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
