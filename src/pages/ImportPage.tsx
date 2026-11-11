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
  capacite_max: 'capacite_max',
  capacity: 'capacite_max',
  materiel_confie: 'materiel_confie',
  equipment: 'materiel_confie',
  croquettes_fournies: 'croquettes_fournies',
  food: 'croquettes_fournies',
  notes: 'notes',
  statut: 'statut',
  status: 'statut',
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
        for (const [key, value] of Object.entries(row)) {
          const mappedKey = currentMapping[key.toLowerCase().trim()] ?? key.toLowerCase().trim();
          mapped[mappedKey] = String(value ?? '').trim();
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
        // Import familles d'accueil
        const payload = batch.map((row) => ({
          nom: row.data.nom,
          prenom: row.data.prenom || null,
          telephone: row.data.telephone || null,
          email: row.data.email || null,
          adresse: row.data.adresse || null,
          code_postal: row.data.code_postal || null,
          ville: row.data.ville || null,
          departement: row.data.departement || null,
          capacite_max: parseInt(row.data.capacite_max) || 1,
          materiel_confie: row.data.materiel_confie || null,
          croquettes_fournies: row.data.croquettes_fournies || null,
          notes: row.data.notes || null,
          statut: 'actif' as const,
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
