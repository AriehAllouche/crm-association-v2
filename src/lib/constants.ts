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
  FaDisponibilite,
  FaReportStatut,
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
  affecte: 'Affecté',
  en_enquete: 'En cours d\'enquête',
  transmission: 'Transmission DDPP / Police / Gendarmerie',
  animal_pris_en_charge: 'Animal pris en charge',
  cloture: 'Clôturé',
  sans_suite: 'Sans suite',
};

export const signalementStatutColors: Record<SignalementStatut, string> = {
  nouveau: 'bg-warning-100 text-warning-800',
  affecte: 'bg-secondary-100 text-secondary-800',
  en_enquete: 'bg-primary-100 text-primary-800',
  transmission: 'bg-accent-100 text-accent-800',
  animal_pris_en_charge: 'bg-success-100 text-success-700',
  cloture: 'bg-neutral-100 text-neutral-500',
  sans_suite: 'bg-neutral-100 text-neutral-500',
};

export const signalementStatutOrder: SignalementStatut[] = [
  'nouveau',
  'affecte',
  'en_enquete',
  'transmission',
  'animal_pris_en_charge',
  'cloture',
  'sans_suite',
];

export const signalementUrgenceCalculeeLabels: Record<string, string> = {
  rouge: 'Rouge — Danger immédiat',
  orange: 'Orange — À traiter dans la journée',
  jaune: 'Jaune — À vérifier rapidement',
  vert: 'Vert — Information simple',
};

export const signalementUrgenceCalculeeColors: Record<string, string> = {
  rouge: 'bg-error-100 text-error-800 border-error-300',
  orange: 'bg-warning-100 text-warning-800 border-warning-300',
  jaune: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  vert: 'bg-success-100 text-success-700 border-success-300',
};

export const signalementUrgenceCalculeeDot: Record<string, string> = {
  rouge: 'bg-error-500',
  orange: 'bg-warning-500',
  jaune: 'bg-yellow-400',
  vert: 'bg-success-500',
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

export const permissionLabels: Record<string, string> = {
  acces_total: 'Accès total',
  administration: 'Administration',
  animaux_lecture: 'Animaux (lecture)',
  animaux_gestion: 'Animaux (gestion)',
  sante: 'Santé',
  comportement: 'Comportement',
  justice: 'Justice',
  familles_accueil: 'Familles d\'accueil',
  signalements: 'Signalements',
  communication: 'Communication',
  finances: 'Finances',
  transports: 'Transports',
  statistiques: 'Statistiques',
};

export const presetLabels: Record<string, string> = {
  presidente: 'Présidente',
  administrateur: 'Administrateur',
  responsable_fa: 'Responsable Familles d\'Accueil',
  responsable_veto: 'Responsable vétérinaire',
  responsable_comm: 'Responsable communication',
  enqueteur: 'Enquêteur',
  educateur: 'Éducateur comportementaliste',
  tresorier: 'Trésorier',
  benevole: 'Bénévole',
};

export const permissionColors: Record<string, string> = {
  acces_total: 'bg-primary-100 text-primary-800',
  administration: 'bg-accent-100 text-accent-800',
  animaux_lecture: 'bg-secondary-100 text-secondary-700',
  animaux_gestion: 'bg-secondary-200 text-secondary-800',
  sante: 'bg-error-100 text-error-700',
  comportement: 'bg-warning-100 text-warning-800',
  justice: 'bg-neutral-200 text-neutral-800',
  familles_accueil: 'bg-success-100 text-success-700',
  signalements: 'bg-warning-100 text-warning-700',
  communication: 'bg-primary-100 text-primary-700',
  finances: 'bg-accent-100 text-accent-700',
  transports: 'bg-primary-50 text-primary-600',
  statistiques: 'bg-neutral-100 text-neutral-600',
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

export const faDisponibiliteLabels: Record<FaDisponibilite, string> = {
  disponible: 'Disponible',
  complete: 'Complète',
  indisponible: 'Indisponible temporairement',
  vacances: 'En vacances',
};

export const faDisponibiliteColors: Record<FaDisponibilite, string> = {
  disponible: 'bg-success-100 text-success-700',
  complete: 'bg-warning-100 text-warning-800',
  indisponible: 'bg-neutral-100 text-neutral-600',
  vacances: 'bg-accent-100 text-accent-700',
};

export const faReportStatutLabels: Record<FaReportStatut, string> = {
  soumis: 'Soumis — à valider',
  valide: 'Validé',
  correction_demandee: 'Correction demandée',
};

export const faReportStatutColors: Record<FaReportStatut, string> = {
  soumis: 'bg-warning-100 text-warning-800',
  valide: 'bg-success-100 text-success-700',
  correction_demandee: 'bg-error-100 text-error-700',
};

export const faEvaluationCriteria: { key: string; label: string }[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'respect_consignes', label: 'Respect des consignes' },
  { key: 'disponibilite', label: 'Disponibilité' },
  { key: 'reactivite', label: 'Réactivité' },
  { key: 'suivi_veto', label: 'Suivi vétérinaire' },
  { key: 'qualite_nouvelles', label: 'Qualité des nouvelles' },
  { key: 'gestion_animal', label: 'Gestion de l\'animal' },
  { key: 'respect_administratif', label: 'Respect administratif' },
];

export const faMaterielEtatLabels: Record<string, string> = {
  bon_etat: 'Bon état',
  abime: 'Abîmé',
  perdu: 'Perdu',
};

export const faMaterielEtatColors: Record<string, string> = {
  bon_etat: 'bg-success-100 text-success-700',
  abime: 'bg-warning-100 text-warning-800',
  perdu: 'bg-error-100 text-error-700',
};
