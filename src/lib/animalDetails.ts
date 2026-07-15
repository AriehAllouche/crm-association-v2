import { supabase } from './supabase';
import type {
  Animal, Signalement, Adoption, VeterinaireVisite, JusticeCase,
  PensionSejour, Transport, DocumentItem, Depense, Communication,
  RegistreEntreeSortie, Alert,
} from '../types';

export type FamilleAccueilAnimalStatut = 'prevu' | 'en_cours' | 'termine';

export interface FamilleAccueilAnimal {
  id: string;
  animal_id: string;
  famille_accueil_id: string;
  statut: FamilleAccueilAnimalStatut;
  date_debut?: string;
  date_fin?: string;
  motif_fin?: string;
  notes?: string;
  created_at: string;
  famille_accueil?: {
    id: string;
    nom: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    ville?: string;
  };
}

export interface TimelineEvent {
  date: string;
  type: string;
  title: string;
  description?: string;
}

export interface StatusHistoryEvent {
  id: string;
  animal_id: string;
  ancien_statut: string;
  nouveau_statut: string;
  date_changement: string;
  auteur?: string;
  raison?: string;
}

export interface AnimalDetails {
  animal: Animal;
  signalement: Signalement | null;
  adoptions: Adoption[];
  visites: VeterinaireVisite[];
  justice: JusticeCase[];
  sejours: PensionSejour[];
  transports: Transport[];
  documents: DocumentItem[];
  depenses: Depense[];
  communications: Communication[];
  registre: RegistreEntreeSortie[];
  familles_accueil: FamilleAccueilAnimal[];
  alerts: Alert[];
  cout_total: number;
  timeline: TimelineEvent[];
  status_history: StatusHistoryEvent[];
}

export async function fetchAnimalDetails(animalId: string): Promise<AnimalDetails> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(`${supabaseUrl}/functions/v1/animal-details/${animalId}`, {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to fetch' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    // Fallback: fetch directly via Supabase client (multiple queries)
    return await fetchAnimalDetailsFallback(animalId);
  }
}

async function fetchAnimalDetailsFallback(animalId: string): Promise<AnimalDetails> {
  const [
    animalRes, signalementRes, adoptionsRes, visitesRes,
    justiceRes, sejoursRes, transportsRes, documentsRes,
    depensesRes, commsRes, registreRes, faRes, alertsRes, statusHistoryRes
  ] = await Promise.all([
    supabase.from('animals').select('*').eq('id', animalId).maybeSingle(),
    supabase.from('signalements').select('*').eq('animal_id', animalId).maybeSingle(),
    supabase.from('adoptions').select('*').eq('animal_id', animalId).order('created_at', { ascending: false }),
    supabase.from('veterinaire_visites').select('*, veterinaire:veterinaires(*)').eq('animal_id', animalId).order('date_visite', { ascending: false }),
    supabase.from('justice_cases').select('*').eq('animal_id', animalId).order('created_at', { ascending: false }),
    supabase.from('pension_sejours').select('*, pension:pensions(*)').eq('animal_id', animalId).order('date_entree', { ascending: false }),
    supabase.from('transports').select('*').eq('animal_id', animalId).order('date_transport', { ascending: false }),
    supabase.from('documents').select('*').eq('animal_id', animalId).order('created_at', { ascending: false }),
    supabase.from('depenses').select('*').eq('animal_id', animalId).order('date_depense', { ascending: false }),
    supabase.from('communications').select('*').eq('animal_id', animalId).order('date_publication', { ascending: false }),
    supabase.from('registre_entrees_sorties').select('*').eq('animal_id', animalId).order('date', { ascending: false }),
    supabase.from('famille_accueil_animaux').select('*, famille_accueil:famille_accueils(*)').eq('animal_id', animalId).order('date_debut', { ascending: false }),
    supabase.from('alerts').select('*').eq('animal_id', animalId).eq('statut', 'active').order('date_echeance'),
    supabase.from('animal_status_history').select('*').eq('animal_id', animalId).order('date_changement', { ascending: false }),
  ]);

  if (animalRes.error || !animalRes.data) {
    throw new Error('Animal introuvable');
  }

  const cout_total = (depensesRes.data ?? []).reduce((sum: number, d: any) => sum + (d.montant ?? 0), 0)
    + (visitesRes.data ?? []).reduce((sum: number, v: any) => sum + (v.cout ?? 0), 0)
    + (sejoursRes.data ?? []).reduce((sum: number, s: any) => sum + (s.cout_total ?? 0), 0)
    + (transportsRes.data ?? []).reduce((sum: number, t: any) => sum + (t.cout ?? 0), 0);

  const timeline: TimelineEvent[] = [];
  for (const r of registreRes.data ?? []) {
    timeline.push({ date: r.date, type: 'registre', title: r.type === 'entree' ? 'Entrée au registre' : 'Sortie du registre', description: r.motif });
  }
  for (const s of signalementRes.data ?? []) {
    timeline.push({ date: s.date_signalement, type: 'signalement', title: 'Signalement', description: s.motif });
  }
  for (const v of visitesRes.data ?? []) {
    timeline.push({ date: v.date_visite, type: 'veterinaire', title: 'Visite vétérinaire', description: `${v.motif}${v.veterinaire ? ' — ' + v.veterinaire.nom : ''}` });
  }
  for (const f of faRes.data ?? []) {
    timeline.push({ date: f.date_debut, type: 'famille_accueil', title: 'Placement en famille d\'accueil', description: f.famille_accueil?.nom });
    if (f.date_fin) {
      timeline.push({ date: f.date_fin, type: 'famille_accueil_fin', title: 'Fin de placement FA', description: f.famille_accueil?.nom });
    }
  }
  for (const s of sejoursRes.data ?? []) {
    timeline.push({ date: s.date_entree, type: 'pension', title: 'Entrée en pension', description: s.pension?.nom });
  }
  for (const t of transportsRes.data ?? []) {
    timeline.push({ date: t.date_transport, type: 'transport', title: 'Transport', description: `${t.lieu_depart ?? '?'} → ${t.lieu_arrivee ?? '?'}` });
  }
  for (const a of adoptionsRes.data ?? []) {
    timeline.push({ date: a.date_candidature, type: 'adoption', title: 'Candidature d\'adoption', description: a.adoptant_nom });
  }
  for (const j of justiceRes.data ?? []) {
    timeline.push({ date: j.created_at, type: 'justice', title: 'Dossier judiciaire', description: j.numero_parquet });
  }
  for (const c of commsRes.data ?? []) {
    timeline.push({ date: c.date_publication, type: 'communication', title: c.titre || c.type, description: c.canal });
  }
  for (const d of depensesRes.data ?? []) {
    timeline.push({ date: d.date_depense, type: 'depense', title: 'Dépense', description: `${d.description} — ${d.montant}€` });
  }
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    animal: animalRes.data as Animal,
    signalement: (signalementRes.data ?? null) as Signalement | null,
    adoptions: (adoptionsRes.data ?? []) as Adoption[],
    visites: (visitesRes.data ?? []) as VeterinaireVisite[],
    justice: (justiceRes.data ?? []) as JusticeCase[],
    sejours: (sejoursRes.data ?? []) as PensionSejour[],
    transports: (transportsRes.data ?? []) as Transport[],
    documents: (documentsRes.data ?? []) as DocumentItem[],
    depenses: (depensesRes.data ?? []) as Depense[],
    communications: (commsRes.data ?? []) as Communication[],
    registre: (registreRes.data ?? []) as RegistreEntreeSortie[],
    familles_accueil: (faRes.data ?? []) as FamilleAccueilAnimal[],
    alerts: (alertsRes.data ?? []) as Alert[],
    cout_total,
    timeline,
    status_history: (statusHistoryRes.data ?? []) as StatusHistoryEvent[],
  };
}

export async function fetchAnimalsForSelect(): Promise<{ id: string; nom: string; espece: string }[]> {
  const { data, error } = await supabase
    .from('animals')
    .select('id, nom, espece')
    .order('nom');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchFamillesForSelect(): Promise<{ id: string; nom: string; prenom?: string }[]> {
  const { data, error } = await supabase
    .from('famille_accueils')
    .select('id, nom, prenom')
    .eq('contrat_actif', true)
    .order('nom');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchVetsForSelect(): Promise<{ id: string; nom: string; clinique?: string }[]> {
  const { data, error } = await supabase
    .from('veterinaires')
    .select('id, nom, clinique')
    .order('nom');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPensionsForSelect(): Promise<{ id: string; nom: string; type: string }[]> {
  const { data, error } = await supabase
    .from('pensions')
    .select('id, nom, type')
    .order('nom');
  if (error) throw new Error(error.message);
  return data ?? [];
}
