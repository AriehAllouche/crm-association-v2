/**
 * Fonctions utilitaires pour les notifications et automatismes
 */

import { supabase } from './supabase';
import type { Animal, Depense, VeterinaireVisite, PensionSejour, Transport } from '../types';

/**
 * Types d'actions autorisés par le CHECK de la table timeline.
 * Doit rester synchronisé avec la migration SQL.
 */
const TIMELINE_ACTION_TYPES = new Set([
  'statut_change', 'veterinaire_visite', 'transport',
  'famille_accueil', 'adoption', 'justice', 'pension',
  'signalement', 'document', 'alerte', 'autre',
  'depense', 'communication', 'registre', 'icad',
  'vaccination', 'sante_soin',
]);

/**
 * Met à jour la timeline de l'animal à chaque action système.
 * Écrit dans la table `timeline` (source de vérité absolue).
 * Les triggers SQL couvrent déjà les événements métier automatiques ;
 * cette fonction sert pour les événements manuels/spécifiques.
 */
export async function updateAnimalTimeline(
  animalId: string,
  eventType: string,
  title: string,
  description?: string
): Promise<void> {
  try {
    const actionType = TIMELINE_ACTION_TYPES.has(eventType) ? eventType : 'autre';

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('timeline').insert({
      animal_id: animalId,
      action_type: actionType,
      description: title,
      metadata: description ? { details: description } : {},
      created_by: user?.id ?? null,
    });

    if (error) {
      console.error('Erreur lors de la mise à jour de la timeline:', error);
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la timeline:', error);
  }
}

/**
 * Calcule les statistiques en temps réel pour un animal
 */
export async function calculateAnimalStats(animalId: string): Promise<{
  cout_total: number;
  cout_par_jour: number;
  duree_prise_en_charge: number;
  nombre_visites: number;
  nombre_transports: number;
  nombre_sejours_pension: number;
}> {
  try {
    // Récupérer toutes les données de l'animal
    const [animalRes, depensesRes, visitesRes, transportsRes, sejoursRes] = await Promise.all([
      supabase.from('animals').select('date_pec, date_sortie').eq('id', animalId).maybeSingle(),
      supabase.from('depenses').select('montant').eq('animal_id', animalId),
      supabase.from('veterinaire_visites').select('id, cout').eq('animal_id', animalId),
      supabase.from('transports').select('id, cout').eq('animal_id', animalId),
      supabase.from('pension_sejours').select('id, cout_total').eq('animal_id', animalId),
    ]);

    if (!animalRes.data) {
      throw new Error('Animal introuvable');
    }

    const animal = animalRes.data;
    const depenses = depensesRes.data ?? [];
    const visites = visitesRes.data ?? [];
    const transports = transportsRes.data ?? [];
    const sejours = sejoursRes.data ?? [];

    // Calculer le coût total
    const coutDepenses = depenses.reduce((sum, d) => sum + (d.montant ?? 0), 0);
    const coutVisites = visites.reduce((sum, v) => sum + (v.cout ?? 0), 0);
    const coutTransports = transports.reduce((sum, t) => sum + (t.cout ?? 0), 0);
    const coutSejours = sejours.reduce((sum, s) => sum + (s.cout_total ?? 0), 0);
    
    const cout_total = coutDepenses + coutVisites + coutTransports + coutSejours;

    // Calculer la durée de prise en charge
    const dateDebut = animal.date_pec ? new Date(animal.date_pec) : new Date();
    const dateFin = animal.date_sortie ? new Date(animal.date_sortie) : new Date();
    const duree_prise_en_charge = Math.floor((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));

    // Calculer le coût par jour
    const cout_par_jour = duree_prise_en_charge > 0 ? cout_total / duree_prise_en_charge : 0;

    return {
      cout_total,
      cout_par_jour,
      duree_prise_en_charge,
      nombre_visites: visites.length,
      nombre_transports: transports.length,
      nombre_sejours_pension: sejours.length,
    };
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return {
      cout_total: 0,
      cout_par_jour: 0,
      duree_prise_en_charge: 0,
      nombre_visites: 0,
      nombre_transports: 0,
      nombre_sejours_pension: 0,
    };
  }
}

/**
 * Calcule les statistiques globales de l'association
 */
export async function calculateGlobalStats(): Promise<{
  total_animaux: number;
  animaux_en_charge: number;
  cout_total_mois: number;
  cout_total_annee: number;
  nombre_familles_actives: number;
  places_libres_total: number;
}> {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [animauxRes, depensesRes, famillesRes] = await Promise.all([
      supabase.from('animals').select('id, statut'),
      supabase.from('depenses').select('montant, date_depense'),
      supabase.from('famille_accueils').select('id, capacite_max, animaux_actuels, contrat_actif'),
    ]);

    const animaux = animauxRes.data ?? [];
    const depenses = depensesRes.data ?? [];
    const familles = famillesRes.data ?? [];

    // Statistiques animaux
    const total_animaux = animaux.length;
    const animaux_en_charge = animaux.filter(a => 
      ['a_adopter', 'en_famille_accueil', 'en_pension', 'en_soins'].includes(a.statut)
    ).length;

    // Statistiques financières
    const depensesMois = depenses.filter(d => new Date(d.date_depense) >= startOfMonth);
    const depensesAnnee = depenses.filter(d => new Date(d.date_depense) >= startOfYear);
    
    const cout_total_mois = depensesMois.reduce((sum, d) => sum + (d.montant ?? 0), 0);
    const cout_total_annee = depensesAnnee.reduce((sum, d) => sum + (d.montant ?? 0), 0);

    // Statistiques familles d'accueil
    const familles_actives = familles.filter(f => f.contrat_actif);
    const nombre_familles_actives = familles_actives.length;
    const places_libres_total = familles_actives.reduce((sum, f) => {
      const placesLibres = (f.capacite_max || 0) - (f.animaux_actuels || 0);
      return sum + Math.max(0, placesLibres);
    }, 0);

    return {
      total_animaux,
      animaux_en_charge,
      cout_total_mois,
      cout_total_annee,
      nombre_familles_actives,
      places_libres_total,
    };
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques globales:', error);
    return {
      total_animaux: 0,
      animaux_en_charge: 0,
      cout_total_mois: 0,
      cout_total_annee: 0,
      nombre_familles_actives: 0,
      places_libres_total: 0,
    };
  }
}

/**
 * Génère un rapport financier pour un animal
 */
export async function generateAnimalFinancialReport(animalId: string): Promise<string> {
  try {
    const stats = await calculateAnimalStats(animalId);
    const { data: animal } = await supabase.from('animals').select('nom').eq('id', animalId).maybeSingle();
    
    if (!animal) {
      throw new Error('Animal introuvable');
    }

    const report = `
RAPPORT FINANCIER - ${animal.nom}
================================

Coût total: ${stats.cout_total.toFixed(2)} €
Coût moyen/jour: ${stats.cout_par_jour.toFixed(2)} €
Durée de prise en charge: ${stats.duree_prise_en_charge} jours

DÉTAILS:
- Nombre de visites vétérinaires: ${stats.nombre_visites}
- Nombre de transports: ${stats.nombre_transports}
- Nombre de séjours en pension: ${stats.nombre_sejours_pension}

Généré le: ${new Date().toLocaleDateString('fr-FR')}
    `.trim();

    return report;
  } catch (error) {
    console.error('Erreur lors de la génération du rapport financier:', error);
    return 'Erreur lors de la génération du rapport';
  }
}
