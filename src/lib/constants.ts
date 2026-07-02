import type {
  AnimalStatut,
  SignalementStatut,
  SignalementUrgence,
  AdoptionStatut,
  JusticeStatut,
  PensionType,
  TransportStatut,
  AlertPriorite,
  AlertStatut,
  SanteStatut,
} from '../types';

export const animalStatutLabels: Record<AnimalStatut, string> = {
  signale: 'Signalé',
  en_enquete: 'En enquête',
  pris_en_charge: 'Pris en charge',
  en_famille_accueil: 'En famille d\'accueil',
  en_pension: 'En pension',
  en_soins: 'En soins',
  a_adopter: 'À adopter',
  adopte: 'Adopté',
  rendu_proprietaire: 'Rendu au propriétaire',
  decede: 'Décédé',
  archive: 'Archivé',
};

export const animalStatutColors: Record<AnimalStatut, string> = {
  signale: 'bg-warning-100 text-warning-800',
  en_enquete: 'bg-secondary-100 text-secondary-800',
  pris_en_charge: 'bg-primary-100 text-primary-800',
  en_famille_accueil: 'bg-success-100 text-success-800',
  en_pension: 'bg-accent-100 text-accent-800',
  en_soins: 'bg-error-100 text-error-800',
  a_adopter: 'bg-primary-100 text-primary-700',
  adopte: 'bg-success-100 text-success-700',
  rendu_proprietaire: 'bg-neutral-100 text-neutral-700',
  decede: 'bg-neutral-800 text-white',
  archive: 'bg-neutral-100 text-neutral-500',
};

export const signalementStatutLabels: Record<SignalementStatut, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  traite: 'Traité',
  cloture: 'Clôturé',
};

export const signalementUrgenceLabels: Record<SignalementUrgence, string> = {
  faible: 'Faible',
  normal: 'Normal',
  urgent: 'Urgent',
  critique: 'Critique',
};

export const signalementUrgenceColors: Record<SignalementUrgence, string> = {
  faible: 'bg-neutral-100 text-neutral-600',
  normal: 'bg-secondary-100 text-secondary-700',
  urgent: 'bg-warning-100 text-warning-800',
  critique: 'bg-error-100 text-error-800',
};

export const adoptionStatutLabels: Record<AdoptionStatut, string> = {
  candidature: 'Candidature',
  pre_visite: 'Pré-visite',
  visio: 'Visioconférence',
  validee: 'Validée',
  contrat_signe: 'Contrat signé',
  paiement_recu: 'Paiement reçu',
  icad_change: 'ICAD changé',
  adoptee: 'Adoptée',
  post_visite: 'Post-visite',
  refusee: 'Refusée',
};

export const justiceStatutLabels: Record<JusticeStatut, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  audience_planifiee: 'Audience planifiée',
  jugement_rendu: 'Jugement rendu',
  cloture: 'Clôturé',
};

export const pensionTypeLabels: Record<PensionType, string> = {
  pension: 'Pension',
  fourriere: 'Fourrière',
  spa: 'SPA',
};

export const transportStatutLabels: Record<TransportStatut, string> = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};

export const alertPrioriteLabels: Record<AlertPriorite, string> = {
  faible: 'Faible',
  normal: 'Normal',
  urgent: 'Urgent',
  critique: 'Critique',
};

export const alertPrioriteColors: Record<AlertPriorite, string> = {
  faible: 'bg-neutral-100 text-neutral-600',
  normal: 'bg-secondary-100 text-secondary-700',
  urgent: 'bg-warning-100 text-warning-800',
  critique: 'bg-error-100 text-error-800',
};

export const alertStatutColors: Record<AlertStatut, string> = {
  active: 'bg-warning-100 text-warning-800',
  'traitée': 'bg-success-100 text-success-700',
  'ignorée': 'bg-neutral-100 text-neutral-500',
};

export const santeStatutLabels: Record<SanteStatut, string> = {
  bon: 'Bon',
  moyen: 'Moyen',
  grave: 'Grave',
  critique: 'Critique',
};

export const santeStatutColors: Record<SanteStatut, string> = {
  bon: 'bg-success-100 text-success-700',
  moyen: 'bg-warning-100 text-warning-800',
  grave: 'bg-error-100 text-error-700',
  critique: 'bg-error-200 text-error-900',
};

export const especeLabels: Record<string, string> = {
  chien: 'Chien',
  chat: 'Chat',
  lapin: 'Lapin',
  cheval: 'Cheval',
  autre: 'Autre',
};

export const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  benevole: 'Bénévole',
  enqueteur: 'Enquêteur',
  referent_fa: 'Référent FA',
};

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function daysBetween(dateStr1: string, dateStr2?: string): number {
  const d1 = new Date(dateStr1);
  const d2 = dateStr2 ? new Date(dateStr2) : new Date();
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(dateStr: string): number {
  return daysBetween(new Date().toISOString(), dateStr);
}
