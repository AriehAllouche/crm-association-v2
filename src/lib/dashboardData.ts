import { supabase } from './supabase';
import type { Alert, Animal } from '../types';

export interface DashboardStats {
  totalAnimaux: number;
  aAdopter: number;
  enFamilleAccueil: number;
  enSoins: number;
  signalementsOuverts: number;
  adoptionsEnCours: number;
  coutTotal: number;
  alertesActives: number;
}

export interface DashboardBlocks {
  urgences: {
    signalementsRouges: number;
    signalementsOranges: number;
    signalementsNonAffectes: number;
    alertesCritiques: number;
  };
  aujourdhui: {
    rdvVeto: number;
    transportsPrevus: number;
    audiences: number;
    alertesDuJour: number;
  };
  familles: {
    contratsActifs: number;
    disponibles: number;
    completes: number;
    placesLibres: number;
  };
  sante: {
    vaccinsASuivre: number;
    animauxGraves: number;
  };
  transports: {
    planifies: number;
    enCours: number;
    termines: number;
    coutTotal: number;
  };
  justice: {
    dossiersActifs: number;
    audiencesSemaine: number;
  };
  finances: {
    depensesMois: number;
    nbDepensesMois: number;
  };
}

export interface DashboardOverview {
  stats: DashboardStats;
  recentAnimaux: Animal[];
  alerts: Alert[];
  blocks: DashboardBlocks;
}

type CountResult = { count: number | null; error: { message: string } | null };
type RowsResult<T> = { data: T[] | null; error: { message: string } | null };

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function countOf(result: CountResult): number {
  assertNoError(result.error);
  return result.count ?? 0;
}

function rowsOf<T>(result: RowsResult<T>): T[] {
  assertNoError(result.error);
  return result.data ?? [];
}

const pad = (n: number) => String(n).padStart(2, '0');

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SIGNALEMENT_CLOS = '(cloture,sans_suite)';
const STATUTS_SORTIS = '(decede,adopte,archive,rendu_proprietaire)';

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const now = new Date();
  const today = isoDate(now);
  const inSevenDays = isoDate(new Date(now.getTime() + 7 * 86_400_000));
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

  const [
    recentRes, statutsRes, signalementsRes, adoptionsRes, alertesActivesRes, alertesRes,
    rougesRes, orangesRes, nonAffectesRes, alertesCritiquesRes,
    rdvRes, transportsJourRes, audiencesJourRes, alertesJourRes,
    famillesRes, vaccinsRes, gravesRes, transportsRes, justiceRes, depensesRes,
  ] = await Promise.all([
    supabase.from('animals').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('animals').select('statut'),
    supabase.from('signalements').select('id', { count: 'exact', head: true }).not('statut', 'in', SIGNALEMENT_CLOS),
    supabase.from('adoptions').select('id', { count: 'exact', head: true }).not('statut', 'in', '("adoptee","refusee")'),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('statut', 'active'),
    supabase.from('alerts').select('*, animal:animals(*)').eq('statut', 'active').order('date_echeance').limit(10),
    supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('urgence_calculee', 'rouge').not('statut', 'in', SIGNALEMENT_CLOS),
    supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('urgence_calculee', 'orange').not('statut', 'in', SIGNALEMENT_CLOS),
    supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('statut', 'nouveau').lt('created_at', dayAgo),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('statut', 'active').in('priorite', ['critique', 'urgent']),
    supabase.from('veterinaire_visites').select('id', { count: 'exact', head: true }).eq('prochaine_visite', today),
    supabase.from('transports').select('id', { count: 'exact', head: true }).eq('date_transport', today).neq('statut', 'annule'),
    supabase.from('justice_cases').select('id', { count: 'exact', head: true }).eq('date_audience', today).neq('statut', 'cloture'),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('statut', 'active').eq('date_echeance', today),
    supabase.from('famille_accueils').select('statut_disponibilite, capacite_max, animaux_actuels').eq('contrat_actif', true),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('statut', 'active').eq('type', 'vaccin'),
    supabase.from('animals').select('id', { count: 'exact', head: true }).in('sante_statut', ['grave', 'critique']).not('statut', 'in', STATUTS_SORTIS),
    supabase.from('transports').select('statut, cout').neq('statut', 'annule'),
    supabase.from('justice_cases').select('date_audience').neq('statut', 'cloture'),
    supabase.from('depenses').select('montant').gte('date_depense', monthStart),
  ]);

  const statuts = rowsOf<{ statut: Animal['statut'] }>(statutsRes);
  const count = (s: Animal['statut']) => statuts.filter((a) => a.statut === s).length;

  const famillesActives = rowsOf<{ statut_disponibilite: string | null; capacite_max: number; animaux_actuels: number }>(famillesRes);
  const famillesDispo = famillesActives.filter((f) => (f.statut_disponibilite ?? 'disponible') === 'disponible');

  const transports = rowsOf<{ statut: string; cout: number | null }>(transportsRes);
  const transportsCout = transports.reduce((sum, t) => sum + (t.cout ?? 0), 0);

  const justiceActifs = rowsOf<{ date_audience: string | null }>(justiceRes);
  const audiencesSemaine = justiceActifs.filter(
    (j) => j.date_audience !== null && j.date_audience >= today && j.date_audience <= inSevenDays,
  ).length;

  const depenses = rowsOf<{ montant: number | null }>(depensesRes);

  return {
    stats: {
      totalAnimaux: statuts.length,
      aAdopter: count('a_adopter'),
      enFamilleAccueil: count('en_famille_accueil'),
      enSoins: count('en_soins'),
      signalementsOuverts: countOf(signalementsRes),
      adoptionsEnCours: countOf(adoptionsRes),
      coutTotal: depenses.reduce((sum, d) => sum + (d.montant ?? 0), 0),
      alertesActives: countOf(alertesActivesRes),
    },
    recentAnimaux: rowsOf<Animal>(recentRes),
    alerts: rowsOf<Alert>(alertesRes),
    blocks: {
      urgences: {
        signalementsRouges: countOf(rougesRes),
        signalementsOranges: countOf(orangesRes),
        signalementsNonAffectes: countOf(nonAffectesRes),
        alertesCritiques: countOf(alertesCritiquesRes),
      },
      aujourdhui: {
        rdvVeto: countOf(rdvRes),
        transportsPrevus: countOf(transportsJourRes),
        audiences: countOf(audiencesJourRes),
        alertesDuJour: countOf(alertesJourRes),
      },
      familles: {
        contratsActifs: famillesActives.length,
        disponibles: famillesDispo.length,
        completes: famillesActives.filter((f) => f.statut_disponibilite === 'complete').length,
        placesLibres: famillesDispo.reduce((sum, f) => sum + Math.max(0, f.capacite_max - f.animaux_actuels), 0),
      },
      sante: {
        vaccinsASuivre: countOf(vaccinsRes),
        animauxGraves: countOf(gravesRes),
      },
      transports: {
        planifies: transports.filter((t) => t.statut === 'planifie').length,
        enCours: transports.filter((t) => t.statut === 'en_cours').length,
        termines: transports.filter((t) => t.statut === 'termine').length,
        coutTotal: transportsCout,
      },
      justice: {
        dossiersActifs: justiceActifs.length,
        audiencesSemaine,
      },
      finances: {
        depensesMois: depenses.reduce((sum, d) => sum + (d.montant ?? 0), 0),
        nbDepensesMois: depenses.length,
      },
    },
  };
}
