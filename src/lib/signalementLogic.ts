import type { SignalementUrgenceCalculee, AnimalEspece } from '../types';
import { supabase } from './supabase';
import type { Signalement } from '../types';

export interface UrgenceFlags {
  danger_immediat: boolean;
  animal_blesse: boolean;
  animal_mort: boolean;
  presence_enfants: boolean;
  animaux_visibles: boolean;
}

export function calculateUrgence(flags: UrgenceFlags): SignalementUrgenceCalculee {
  if (flags.danger_immediat) return 'rouge';
  if (flags.animal_blesse) return 'orange';
  if (flags.presence_enfants || flags.animaux_visibles) return 'jaune';
  return 'vert';
}

export const urgenceFlagsLabels: Record<keyof UrgenceFlags, string> = {
  danger_immediat: 'Danger immédiat',
  animal_blesse: 'Animal blessé',
  animal_mort: 'Animal mort',
  presence_enfants: 'Présence d\'enfants',
  animaux_visibles: 'Animaux visibles sur place',
};

export async function uploadSignalementPhoto(
  signalementId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${signalementId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('signalements')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('signalements').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function addSignalementEvent(
  signalementId: string,
  type: string,
  titre: string,
  description?: string,
  auteurId?: string,
  donnees?: Record<string, unknown>,
): Promise<void> {
  await supabase.from('signalement_events').insert({
    signalement_id: signalementId,
    type,
    titre,
    description,
    auteur_id: auteurId,
    donnees: donnees ?? null,
  });
}

export interface LinkedDossierChoices {
  create_animal: boolean;
  create_justice: boolean;
  create_veterinaire: boolean;
  create_famille_accueil: boolean;
  create_transport: boolean;
}

export interface LinkedDossierResult {
  animal_id?: string;
  justice_id?: string;
  veterinaire_visite_id?: string;
  famille_accueil_animal_id?: string;
  transport_id?: string;
}

export async function createLinkedDossiers(
  signalement: Signalement,
  choices: LinkedDossierChoices,
  userId: string,
): Promise<LinkedDossierResult> {
  const result: LinkedDossierResult = {};
  const events: { type: string; titre: string; description: string }[] = [];

  // 1. Créer la fiche animal
  if (choices.create_animal) {
    const { data: animal, error } = await supabase
      .from('animals')
      .insert({
        nom: `Signalement ${signalement.numero_dossier}`,
        espece: (signalement.espece ?? 'autre') as AnimalEspece,
        statut: 'pris_en_charge',
        sante_statut: signalement.animal_blesse ? 'grave' : 'bon',
        description: signalement.description ?? '',
        lieu_actuel: signalement.lieu_signalement ?? '',
        date_prise_en_charge: new Date().toISOString().split('T')[0],
        created_by: userId,
        photo_url: signalement.photos?.[0]?.url,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création animal: ${error.message}`);
    result.animal_id = animal.id;

    // Lier le signalement à l'animal
    await supabase
      .from('signalements')
      .update({ animal_id: animal.id, statut: 'animal_pris_en_charge' })
      .eq('id', signalement.id);

    // Créer une entrée au registre
    await supabase.from('registre_entrees_sorties').insert({
      animal_id: animal.id,
      numero_entree: `REG-${Date.now().toString(36).toUpperCase()}`,
      type: 'entree',
      date: new Date().toISOString().split('T')[0],
      motif: `Signalement ${signalement.numero_dossier}`,
      provenance_destination: signalement.lieu_signalement ?? 'Signalement',
    });

    events.push({
      type: 'animal_cree',
      titre: 'Fiche animal créée',
      description: `Animal "${animal.nom}" créé depuis ce signalement`,
    });
  }

  const animalId = result.animal_id ?? signalement.animal_id;

  // 2. Créer le dossier justice
  if (choices.create_justice && animalId) {
    const { data: justice, error } = await supabase
      .from('justice_cases')
      .insert({
        animal_id: animalId,
        resume_faits: signalement.description ?? signalement.motif,
        statut: 'ouvert',
        requisition: signalement.transmission_ddpp
          ? 'DDPP'
          : signalement.transmission_police
            ? 'Police'
            : signalement.transmission_gendarmerie
              ? 'Gendarmerie'
              : null,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création justice: ${error.message}`);
    result.justice_id = justice.id;

    events.push({
      type: 'justice_cree',
      titre: 'Dossier justice ouvert',
      description: `Dossier ${justice.id.substring(0, 8)} ouvert`,
    });
  }

  // 3. Créer le dossier vétérinaire
  if (choices.create_veterinaire && animalId) {
    const { data: visite, error } = await supabase
      .from('veterinaire_visites')
      .insert({
        animal_id: animalId,
        date_visite: new Date().toISOString().split('T')[0],
        motif: `Visite suite signalement ${signalement.numero_dossier}`,
        diagnostic: signalement.animal_blesse ? 'À évaluer — animal signalé blessé' : 'À évaluer',
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création veto: ${error.message}`);
    result.veterinaire_visite_id = visite.id;

    events.push({
      type: 'veterinaire_cree',
      titre: 'Dossier vétérinaire créé',
      description: `Visite programmée pour évaluation`,
    });
  }

  // 4. Lancer une recherche de famille d'accueil
  if (choices.create_famille_accueil && animalId) {
    const { data: faLink, error } = await supabase
      .from('famille_accueil_animaux')
      .insert({
        famille_accueil_id: null as never,
        animal_id: animalId,
        statut: 'prevu',
        date_debut: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (!error && faLink) {
      result.famille_accueil_animal_id = faLink.id;
      events.push({
        type: 'fa_recherche',
        titre: 'Recherche de famille d\'accueil lancée',
        description: 'En attente d\'affectation d\'une famille d\'accueil',
      });
    }
  }

  // 5. Créer un transport
  if (choices.create_transport && animalId) {
    const { data: transport, error } = await supabase
      .from('transports')
      .insert({
        animal_id: animalId,
        type: 'benevole',
        lieu_depart: signalement.lieu_signalement ?? '',
        date_transport: new Date().toISOString().split('T')[0],
        statut: 'planifie',
        notes: `Transport suite signalement ${signalement.numero_dossier}`,
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur création transport: ${error.message}`);
    result.transport_id = transport.id;

    events.push({
      type: 'transport_cree',
      titre: 'Transport créé',
      description: `Transport planifié depuis ${signalement.lieu_signalement ?? 'lieu du signalement'}`,
    });
  }

  // Ajouter tous les événements à la timeline
  for (const evt of events) {
    await addSignalementEvent(
      signalement.id,
      evt.type,
      evt.titre,
      evt.description,
      userId,
    );
  }

  return result;
}

export function generateNumeroDossier(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SIG-${ymd}-${rand}`;
}
