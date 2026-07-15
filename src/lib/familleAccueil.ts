import { supabase } from './supabase';

export type FamilleAccueilStatut = 'en_attente' | 'occupee' | 'disponible' | 'refusee' | 'inactive';

export interface FamilleAccueilStatutInfo {
  statut: FamilleAccueilStatut;
  label: string;
  colorClass: string;
  raison?: string;
}

/**
 * Récupère le statut actuel d'une famille d'accueil depuis la table famille_accueils
 */
export async function getFamilleAccueilStatut(familleAccueilId: string): Promise<FamilleAccueilStatutInfo> {
  const { data, error } = await supabase
    .from('famille_accueils')
    .select('*')
    .eq('id', familleAccueilId)
    .single();

  if (error || !data) {
    return {
      statut: 'inactive',
      label: 'Inconnue',
      colorClass: 'bg-neutral-100 text-neutral-600',
    };
  }

  // Si le contrat n'est pas actif
  if (!data.contrat_actif) {
    return {
      statut: 'inactive',
      label: 'Inactive',
      colorClass: 'bg-error-100 text-error-700',
      raison: data.rejection_reason || 'Contrat non actif',
    };
  }

  // Si le statut est refusé
  if (data.statut === 'refusee') {
    return {
      statut: 'refusee',
      label: 'Refusée',
      colorClass: 'bg-error-100 text-error-700',
      raison: data.rejection_reason,
    };
  }

  // Si la FA a des animaux actuels
  if (data.animaux_actuels > 0) {
    return {
      statut: 'occupee',
      label: 'Occupée',
      colorClass: 'bg-info-100 text-info-700',
    };
  }

  // Si la FA est active sans animaux (disponible)
  return {
    statut: 'disponible',
    label: 'Disponible',
    colorClass: 'bg-success-100 text-success-700',
  };
}

/**
 * Récupère le statut de plusieurs familles d'accueil en une seule requête
 */
export async function getFamillesAccueilStatuts(familleAccueilIds: string[]): Promise<Record<string, FamilleAccueilStatutInfo>> {
  if (familleAccueilIds.length === 0) return {};

  const { data, error } = await supabase
    .from('famille_accueils')
    .select('id, contrat_actif, animaux_actuels, statut, rejection_reason')
    .in('id', familleAccueilIds);

  if (error || !data) return {};

  const result: Record<string, FamilleAccueilStatutInfo> = {};

  for (const fa of data) {
    result[fa.id] = determineStatutFromData(fa);
  }

  return result;
}

function determineStatutFromData(data: any): FamilleAccueilStatutInfo {
  // Si le contrat n'est pas actif
  if (!data.contrat_actif) {
    return {
      statut: 'inactive',
      label: 'Inactive',
      colorClass: 'bg-error-100 text-error-700',
      raison: data.rejection_reason || 'Contrat non actif',
    };
  }

  // Si le statut est refusé
  if (data.statut === 'refusee') {
    return {
      statut: 'refusee',
      label: 'Refusée',
      colorClass: 'bg-error-100 text-error-700',
      raison: data.rejection_reason,
    };
  }

  // Si la FA a des animaux actuels
  if (data.animaux_actuels > 0) {
    return {
      statut: 'occupee',
      label: 'Occupée',
      colorClass: 'bg-info-100 text-info-700',
    };
  }

  // Si la FA est active sans animaux (disponible)
  return {
    statut: 'disponible',
    label: 'Disponible',
    colorClass: 'bg-success-100 text-success-700',
  };
}
