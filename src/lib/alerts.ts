import { supabase } from './supabase';

/**
 * Génère automatiquement des alertes pour les vaccins expirés
 */
export async function generateVaccineAlerts(): Promise<void> {
  try {
    // Récupérer tous les animaux avec des informations de vaccination
    const { data: animaux, error } = await supabase
      .from('animals')
      .select('id, nom, date_dernier_vaccin, statut')
      .not('date_dernier_vaccin', 'is', null)
      .in('statut', ['a_adopter', 'en_famille_accueil', 'en_pension', 'en_soins']);

    if (error) throw error;

    const today = new Date();
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + 30); // Alertes 30 jours avant expiration

    for (const animal of animaux as any[]) {
      const lastVaccine = new Date(animal.date_dernier_vaccin);
      const expirationDate = new Date(lastVaccine);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1); // Vaccins valables 1 an

      // Si le vaccin expire dans moins de 30 jours ou est déjà expiré
      if (expirationDate <= alertDate) {
        const daysUntil = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const priorite = daysUntil < 0 ? 'critique' : daysUntil < 7 ? 'urgent' : 'normal';

        // Vérifier si une alerte existe déjà
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('animal_id', animal.id)
          .eq('type', 'vaccin')
          .eq('statut', 'active')
          .maybeSingle();

        if (!existing) {
          await supabase.from('alerts').insert({
            animal_id: animal.id,
            type: 'vaccin',
            titre: `Vaccin expiré - ${animal.nom}`,
            message: daysUntil < 0 
              ? `Vaccin expiré depuis ${Math.abs(daysUntil)} jours`
              : `Vaccin expire dans ${daysUntil} jours`,
            date_echeance: expirationDate.toISOString().split('T')[0],
            priorite,
            statut: 'active',
          });
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des alertes vaccins:', error);
  }
}

/**
 * Génère automatiquement des alertes pour les ICAD à faire
 */
export async function generateICADAlerts(): Promise<void> {
  try {
    // Récupérer les animaux sans ICAD ou avec ICAD invalide
    const { data: animaux, error } = await supabase
      .from('animals')
      .select('id, nom, numero_icad, statut, date_naissance')
      .or('numero_icad.is.null,numero_icad.eq."",numero_icad.eq."Non renseigné"')
      .in('statut', ['a_adopter', 'en_famille_accueil', 'en_pension', 'en_soins']);

    if (error) throw error;

    const today = new Date();

    for (const animal of animaux as any[]) {
      // Vérifier si l'animal est âgé de plus de 3 mois (ICAD obligatoire à 3 mois)
      if (animal.date_naissance) {
        const birthDate = new Date(animal.date_naissance);
        const ageMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());

        if (ageMonths >= 3) {
          // Vérifier si une alerte existe déjà
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('animal_id', animal.id)
            .eq('type', 'icad')
            .eq('statut', 'active')
            .maybeSingle();

          if (!existing) {
            await supabase.from('alerts').insert({
              animal_id: animal.id,
              type: 'icad',
              titre: `ICAD manquant - ${animal.nom}`,
              message: `L'animal a ${ageMonths} mois, ICAD obligatoire`,
              date_echeance: today.toISOString().split('T')[0],
              priorite: 'haute',
              statut: 'active',
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des alertes ICAD:', error);
  }
}

/**
 * Génère automatiquement des alertes pour les audiences judiciaires à venir
 */
export async function generateJusticeAlerts(): Promise<void> {
  try {
    // Récupérer les dossiers judiciaires avec des audiences à venir
    const { data: dossiers, error } = await supabase
      .from('justice_cases')
      .select('id, numero_parquet, date_audience, animal_id, animal:animals(nom)')
      .not('date_audience', 'is', null)
      .in('statut', ['en_cours', 'en_attente']);

    if (error) throw error;

    const today = new Date();
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + 7); // Alertes 7 jours avant l'audience

    for (const dossier of dossiers as any[]) {
      const audienceDate = new Date(dossier.date_audience);

      // Si l'audience est dans moins de 7 jours
      if (audienceDate <= alertDate && audienceDate >= today) {
        const daysUntil = Math.ceil((audienceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const priorite = daysUntil <= 1 ? 'critique' : daysUntil <= 3 ? 'haute' : 'moyenne';

        // Vérifier si une alerte existe déjà
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('justice_case_id', dossier.id)
          .eq('type', 'audience')
          .eq('statut', 'active')
          .maybeSingle();

        if (!existing) {
          await supabase.from('alerts').insert({
            animal_id: dossier.animal_id,
            justice_case_id: dossier.id,
            type: 'audience',
            titre: `Audience - ${dossier.numero_parquet}`,
            message: `Audience dans ${daysUntil} jours`,
            date_echeance: dossier.date_audience,
            priorite,
            statut: 'active',
          });
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des alertes justice:', error);
  }
}

/**
 * Génère automatiquement des alertes pour les vermifuges expirés
 */
export async function generateVermifugeAlerts(): Promise<void> {
  try {
    // Récupérer tous les animaux avec des informations de vermifuge
    const { data: animaux, error } = await supabase
      .from('animals')
      .select('id, nom, date_dernier_vermifuge, statut')
      .not('date_dernier_vermifuge', 'is', null)
      .in('statut', ['a_adopter', 'en_famille_accueil', 'en_pension', 'en_soins']);

    if (error) throw error;

    const today = new Date();
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + 30); // Alertes 30 jours avant expiration

    for (const animal of animaux as any[]) {
      const lastVermifuge = new Date(animal.date_dernier_vermifuge);
      const expirationDate = new Date(lastVermifuge);
      expirationDate.setMonth(expirationDate.getMonth() + 3); // Vermifuges valables 3 mois

      // Si le vermifuge expire dans moins de 30 jours ou est déjà expiré
      if (expirationDate <= alertDate) {
        const daysUntil = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const priorite = daysUntil < 0 ? 'critique' : daysUntil < 7 ? 'urgent' : 'normal';

        // Vérifier si une alerte existe déjà
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('animal_id', animal.id)
          .eq('type', 'vermifuge')
          .eq('statut', 'active')
          .maybeSingle();

        if (!existing) {
          await supabase.from('alerts').insert({
            animal_id: animal.id,
            type: 'vermifuge',
            titre: `Vermifuge expiré - ${animal.nom}`,
            message: daysUntil < 0 
              ? `Vermifuge expiré depuis ${Math.abs(daysUntil)} jours`
              : `Vermifuge expire dans ${daysUntil} jours`,
            date_echeance: expirationDate.toISOString().split('T')[0],
            priorite,
            statut: 'active',
          });
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des alertes vermifuges:', error);
  }
}

/**
 * Génère automatiquement des alertes pour les contrats FA non signés
 */
export async function generateContratFAAlerts(): Promise<void> {
  try {
    // Récupérer les familles d'accueil avec des animaux en cours mais sans contrat actif
    const { data: familles, error } = await supabase
      .from('famille_accueils')
      .select('id, nom, prenom, animaux_actuels, contrat_actif, date_debut_contrat')
      .gt('animaux_actuels', 0)
      .eq('contrat_actif', false);

    if (error) throw error;

    const today = new Date();

    for (const famille of familles as any[]) {
      // Vérifier si une alerte existe déjà
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('famille_accueil_id', famille.id)
        .eq('type', 'contrat_fa')
        .eq('statut', 'active')
        .maybeSingle();

      if (!existing) {
        await supabase.from('alerts').insert({
          famille_accueil_id: famille.id,
          type: 'contrat_fa',
          titre: `Contrat FA non signé - ${famille.prenom} ${famille.nom}`,
          message: `La famille d'accueil a ${famille.animaux_actuels} animal(s) en charge mais le contrat n'est pas actif`,
          date_echeance: today.toISOString().split('T')[0],
          priorite: 'urgent',
          statut: 'active',
        });
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des alertes contrats FA:', error);
  }
}

/**
 * Génère automatiquement des alertes pour les nouvelles hebdomadaires FA manquantes
 */
export async function generateHebdoFAAlerts(): Promise<void> {
  try {
    // Récupérer les familles d'accueil avec des animaux en cours
    const { data: familles, error } = await supabase
      .from('famille_accueils')
      .select('id, nom, prenom, animaux_actuels, contrat_actif')
      .gt('animaux_actuels', 0)
      .eq('contrat_actif', true);

    if (error) throw error;

    const today = new Date();
    const alertDate = new Date(today);
    alertDate.setDate(alertDate.getDate() + 7); // Alertes 7 jours avant la fin de la semaine

    for (const famille of familles as any[]) {
      // Vérifier si une alerte existe déjà pour cette semaine
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Début de la semaine (dimanche)
      
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('famille_accueil_id', famille.id)
        .eq('type', 'hebdo_fa')
        .eq('statut', 'active')
        .gte('created_at', weekStart.toISOString())
        .maybeSingle();

      if (!existing) {
        await supabase.from('alerts').insert({
          famille_accueil_id: famille.id,
          type: 'hebdo_fa',
          titre: `Nouvelle hebdomadaire manquante - ${famille.prenom} ${famille.nom}`,
          message: `La famille d'accueil n'a pas transmis de nouvelle hebdomadaire cette semaine`,
          date_echeance: alertDate.toISOString().split('T')[0],
          priorite: 'normal',
          statut: 'active',
        });
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération des alertes hebdo FA:', error);
  }
}

/**
 * Fonction principale pour générer toutes les alertes automatiques
 */
export async function generateAllAlerts(): Promise<void> {
  await Promise.all([
    generateVaccineAlerts(),
    generateICADAlerts(),
    generateJusticeAlerts(),
    generateVermifugeAlerts(),
    generateContratFAAlerts(),
    generateHebdoFAAlerts(),
  ]);
}

/**
 * Récupère le nombre d'alertes actives pour un utilisateur
 */
export async function getActiveAlertsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'active');

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'alertes:', error);
    return 0;
  }
}
