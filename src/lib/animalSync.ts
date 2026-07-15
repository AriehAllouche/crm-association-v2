import { supabase } from './supabase';
import type { AnimalStatut } from '../types';

/**
 * Synchronise automatiquement le statut d'un animal en fonction de ses placements actuels
 * Cette fonction est appelée après chaque modification de placement (FA, pension, veto)
 */
export async function syncAnimalStatut(animalId: string): Promise<void> {
  try {
    // Récupérer les placements actifs
    const [faRes, pensionRes, animalRes] = await Promise.all([
      supabase
        .from('famille_accueil_animaux')
        .select('*')
        .eq('animal_id', animalId)
        .eq('statut', 'en_cours')
        .maybeSingle(),
      supabase
        .from('pension_sejours')
        .select('*')
        .eq('animal_id', animalId)
        .isnull('date_sortie')
        .maybeSingle(),
      supabase
        .from('animals')
        .select('statut')
        .eq('id', animalId)
        .single(),
    ]);

    if (animalRes.error) return;

    const currentStatut = animalRes.data.statut as AnimalStatut;
    let newStatut: AnimalStatut = currentStatut;

    // Logique de priorité pour le statut
    if (faRes.data) {
      // Animal en famille d'accueil actif
      newStatut = 'en_famille_accueil';
    } else if (pensionRes.data) {
      // Animal en pension actif
      newStatut = 'en_pension';
    } else if (currentStatut === 'en_famille_accueil' || currentStatut === 'en_pension') {
      // Animal n'est plus en placement mais l'était avant
      // On le remet à "à adopter" ou "pris en charge" selon le contexte
      newStatut = 'a_adopter';
    }

    // Mettre à jour le statut seulement s'il a changé
    if (newStatut !== currentStatut) {
      await supabase
        .from('animals')
        .update({ 
          statut: newStatut,
          updated_at: new Date().toISOString()
        })
        .eq('id', animalId);
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation du statut:', error);
  }
}

/**
 * Met à jour le lieu_actuel de l'animal en fonction de son placement
 */
export async function syncAnimalLieu(animalId: string): Promise<void> {
  try {
    const [faRes, pensionRes] = await Promise.all([
      supabase
        .from('famille_accueil_animaux')
        .select('*, famille_accueil:famille_accueils(nom, ville)')
        .eq('animal_id', animalId)
        .eq('statut', 'en_cours')
        .maybeSingle(),
      supabase
        .from('pension_sejours')
        .select('*, pension:pensions(nom, ville)')
        .eq('animal_id', animalId)
        .isnull('date_sortie')
        .maybeSingle(),
    ]);

    let lieuActuel: string | null = null;

    if (faRes.data?.famille_accueil) {
      const fa = faRes.data.famille_accueil as any;
      lieuActuel = `FA: ${fa.nom}${fa.ville ? ` (${fa.ville})` : ''}`;
    } else if (pensionRes.data?.pension) {
      const pension = pensionRes.data.pension as any;
      lieuActuel = `${pension.nom}${pension.ville ? ` (${pension.ville})` : ''}`;
    }

    await supabase
      .from('animals')
      .update({ 
        lieu_actuel: lieuActuel,
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId);
  } catch (error) {
    console.error('Erreur lors de la synchronisation du lieu:', error);
  }
}

/**
 * Fonction combinée pour synchroniser statut et lieu
 */
export async function syncAnimal(animalId: string): Promise<void> {
  await Promise.all([
    syncAnimalStatut(animalId),
    syncAnimalLieu(animalId),
  ]);
}

/**
 * Met à jour le compteur d'animaux actuels dans une famille d'accueil
 */
export async function syncFamilleAccueilCount(familleId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('famille_accueil_animaux')
      .select('id')
      .eq('famille_accueil_id', familleId)
      .eq('statut', 'en_cours');

    if (error) throw error;

    await supabase
      .from('famille_accueils')
      .update({ 
        animaux_actuels: data?.length ?? 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', familleId);
  } catch (error) {
    console.error('Erreur lors de la synchronisation du compteur FA:', error);
  }
}

/**
 * Met à jour le compteur d'animaux dans une pension
 */
export async function syncPensionCount(pensionId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('pension_sejours')
      .select('id')
      .eq('pension_id', pensionId)
      .isnull('date_sortie');

    if (error) throw error;

    await supabase
      .from('pensions')
      .update({ 
        animaux_actuels: data?.length ?? 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', pensionId);
  } catch (error) {
    console.error('Erreur lors de la synchronisation du compteur pension:', error);
  }
}
