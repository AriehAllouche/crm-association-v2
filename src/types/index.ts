export type UserRole = 'admin' | 'benevole' | 'enqueteur' | 'referent_fa';

export type Permission =
  | 'acces_total'
  | 'administration'
  | 'animaux_lecture'
  | 'animaux_gestion'
  | 'sante'
  | 'comportement'
  | 'justice'
  | 'familles_accueil'
  | 'signalements'
  | 'communication'
  | 'finances'
  | 'transports'
  | 'statistiques';

export type PresetRole =
  | 'presidente'
  | 'administrateur'
  | 'responsable_fa'
  | 'responsable_veto'
  | 'responsable_comm'
  | 'enqueteur'
  | 'educateur'
  | 'tresorier'
  | 'benevole';

export const ALL_PERMISSIONS: Permission[] = [
  'acces_total',
  'administration',
  'animaux_lecture',
  'animaux_gestion',
  'sante',
  'comportement',
  'justice',
  'familles_accueil',
  'signalements',
  'communication',
  'finances',
  'transports',
  'statistiques',
];

export const PRESET_PERMISSIONS: Record<PresetRole, Permission[]> = {
  presidente: ['acces_total'],
  administrateur: ['acces_total', 'administration'],
  responsable_fa: ['familles_accueil', 'animaux_lecture'],
  responsable_veto: ['sante', 'animaux_lecture'],
  responsable_comm: ['communication', 'animaux_lecture'],
  enqueteur: ['signalements', 'justice', 'animaux_lecture'],
  educateur: ['comportement', 'animaux_lecture'],
  tresorier: ['finances'],
  benevole: ['animaux_lecture'],
};

export interface UserPermission {
  id: string;
  user_id: string;
  permission: Permission;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithPermissions extends Profile {
  permissions: Permission[];
}

export type AnimalEspece = 'chien' | 'chat' | 'lapin' | 'cheval' | 'autre';
export type AnimalSexe = 'male' | 'femelle' | 'inconnu';
export type AnimalStatut =
  | 'signale'
  | 'en_enquete'
  | 'pris_en_charge'
  | 'en_famille_accueil'
  | 'en_pension'
  | 'en_soins'
  | 'a_adopter'
  | 'adopte'
  | 'rendu_proprietaire'
  | 'decede'
  | 'archive';
export type SanteStatut = 'bon' | 'moyen' | 'grave' | 'critique';

export interface Animal {
  id: string;
  nom: string;
  espece: AnimalEspece;
  race?: string;
  sexe?: AnimalSexe;
  date_naissance?: string;
  age_estime?: string;
  couleur?: string;
  poids?: string;
  taille?: string;
  sterilise: boolean;
  vaccinne: boolean;
  numero_icad?: string;
  numero_puce?: string;
  statut: AnimalStatut;
  description?: string;
  comportement?: string;
  sante_statut: SanteStatut;
  sante_notes?: string;
  photo_url?: string;
  lieu_actuel?: string;
  date_prise_en_charge?: string;
  date_sortie?: string;
  motif_sortie?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type SignalementStatut =
  | 'nouveau'
  | 'affecte'
  | 'en_enquete'
  | 'transmission'
  | 'animal_pris_en_charge'
  | 'cloture'
  | 'sans_suite';

export type SignalementUrgence = 'faible' | 'normal' | 'urgent' | 'critique';
export type SignalementUrgenceCalculee = 'rouge' | 'orange' | 'jaune' | 'vert';

export interface Signalement {
  id: string;
  numero_dossier: string;
  animal_id?: string;
  declarant_nom: string;
  declarant_prenom?: string;
  declarant_telephone?: string;
  declarant_email?: string;
  declarant_adresse?: string;
  lieu_signalement?: string;
  latitude?: number;
  longitude?: number;
  motif: string;
  description?: string;
  urgence: SignalementUrgence;
  urgence_calculee?: SignalementUrgenceCalculee;
  espece?: AnimalEspece;
  nombre_animaux?: number;
  animaux_visibles?: boolean;
  danger_immediat?: boolean;
  presence_enfants?: boolean;
  animal_blesse?: boolean;
  animal_mort?: boolean;
  statut: SignalementStatut;
  enqueteur_id?: string;
  responsable_id?: string;
  priorite?: number;
  date_prevue_traitement?: string;
  transmission_ddpp?: boolean;
  transmission_police?: boolean;
  transmission_gendarmerie?: boolean;
  date_cloture?: string;
  motif_cloture?: string;
  date_signalement: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  animal?: Animal;
  enqueteur?: { id: string; full_name: string };
  responsable?: { id: string; full_name: string };
  photos?: SignalementPhoto[];
}

export interface SignalementEvent {
  id: string;
  signalement_id: string;
  type: string;
  titre: string;
  description?: string;
  auteur_id?: string;
  donnees?: Record<string, unknown>;
  created_at: string;
  auteur?: { id: string; full_name: string };
}

export interface SignalementComment {
  id: string;
  signalement_id: string;
  auteur_id?: string;
  contenu: string;
  created_at: string;
  auteur?: { id: string; full_name: string };
}

export interface SignalementPhoto {
  id: string;
  signalement_id: string;
  url: string;
  type_media: 'photo' | 'video';
  description?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  titre: string;
  message?: string;
  signalement_id?: string;
  lu: boolean;
  created_at: string;
}

export type FaDisponibilite = 'disponible' | 'complete' | 'indisponible' | 'vacances';

export interface FamilleAccueil {
  id: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  departement?: string;
  latitude?: number;
  longitude?: number;
  capacite_max: number;
  animaux_actuels: number;
  referent_benevole_id?: string;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
  contrat_actif: boolean;
  materiel_confie?: string;
  croquettes_fournies?: string;
  notes?: string;
  // Identité
  profession?: string;
  date_naissance?: string;
  photo_url?: string;
  piece_identite_url?: string;
  date_entree_association?: string;
  // Capacités
  capacite_chiens?: number;
  capacite_chats?: number;
  capacite_nac?: number;
  accueil_chiots?: boolean;
  accueil_seniors?: boolean;
  accueil_handicapes?: boolean;
  accueil_categorises?: boolean;
  accueil_femelles_gestantes?: boolean;
  accueil_urgences?: boolean;
  accueil_requisitions?: boolean;
  // Conditions
  type_logement?: string;
  jardin_cloture?: boolean;
  presence_escaliers?: boolean;
  presence_ascenseur?: boolean;
  nb_adultes?: number;
  nb_enfants?: number;
  autres_animaux?: boolean;
  fumeurs?: boolean;
  // Disponibilités
  statut_disponibilite?: FaDisponibilite;
  date_fin_indisponibilite?: string;
  created_at: string;
  updated_at: string;
}

export interface FaMateriel {
  id: string;
  famille_accueil_id: string;
  type_materiel: string;
  date_remise: string;
  date_restitution_prevue?: string;
  date_restitution_reelle?: string;
  etat_retour?: string;
  commentaire?: string;
  created_at: string;
}

export interface FaEvaluation {
  id: string;
  famille_accueil_id: string;
  animal_id?: string;
  evaluateur_id?: string;
  notes: Record<string, number>;
  commentaire?: string;
  date_evaluation: string;
  created_at: string;
  evaluateur?: { id: string; full_name: string };
  animal?: { id: string; nom: string };
}

export interface FaDecision {
  id: string;
  famille_accueil_id: string;
  animal_id?: string;
  pre_visite_realisee: boolean;
  pre_visite_date?: string;
  pre_visite_compte_rendu?: string;
  statut_vote: 'en_attente' | 'valide' | 'refuse';
  avis: FaAvisIndividuel[];
  created_at: string;
  updated_at: string;
  animal?: { id: string; nom: string };
}

export interface FaAvisIndividuel {
  responsable_id: string;
  responsable_nom: string;
  avis: 'valide' | 'refuse' | 'en_attente';
  commentaire?: string;
  date: string;
}

export type FaReportStatut = 'soumis' | 'valide' | 'correction_demandee';

export interface FaReport {
  id: string;
  famille_accueil_id: string;
  animal_id: string;
  auteur_id?: string;
  photos: string[];
  videos: string[];
  commentaire?: string;
  poids?: string;
  alimentation?: string;
  observations_sante?: string;
  observations_comportement?: string;
  statut: FaReportStatut;
  validateur_id?: string;
  date_validation?: string;
  commentaire_validation?: string;
  created_at: string;
  auteur?: { id: string; full_name: string };
  animal?: { id: string; nom: string; espece: string };
  validateur?: { id: string; full_name: string };
}

export interface FaComportementSession {
  id: string;
  famille_accueil_id: string;
  animal_id: string;
  educateur_id?: string;
  date_session: string;
  type_session?: string;
  conseils?: string;
  progres_constates?: string;
  bilan_final: boolean;
  compte_rendu?: string;
  created_at: string;
  educateur?: { id: string; full_name: string };
  animal?: { id: string; nom: string };
}

export type AdoptionStatut =
  | 'candidature'
  | 'pre_visite'
  | 'visio'
  | 'validee'
  | 'contrat_signe'
  | 'paiement_recu'
  | 'icad_change'
  | 'adoptee'
  | 'post_visite'
  | 'refusee';

export interface Adoption {
  id: string;
  animal_id: string;
  adoptant_nom: string;
  adoptant_prenom?: string;
  adoptant_telephone?: string;
  adoptant_email?: string;
  adoptant_adresse?: string;
  statut: AdoptionStatut;
  date_candidature: string;
  date_pre_visite?: string;
  date_visio?: string;
  date_validation?: string;
  date_contrat?: string;
  montant_adoption?: number;
  paiement_recu: boolean;
  date_icad_change?: string;
  date_post_visite?: string;
  post_visite_effectuee: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  animal?: Animal;
}

export interface Veterinaire {
  id: string;
  nom: string;
  prenom?: string;
  clinique?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  tarif_consultation?: number;
  tarif_chirurgie?: number;
  tarif_sterilisation?: number;
  notes?: string;
  partenaire: boolean;
  created_at: string;
  updated_at: string;
}

export interface VeterinaireVisite {
  id: string;
  animal_id: string;
  veterinaire_id?: string;
  date_visite: string;
  motif: string;
  diagnostic?: string;
  traitement?: string;
  cout?: number;
  facture_url?: string;
  compte_rendu_url?: string;
  prochaine_visite?: string;
  notes?: string;
  created_at: string;
  animal?: Animal;
  veterinaire?: Veterinaire;
}

export type JusticeStatut =
  | 'ouvert'
  | 'en_cours'
  | 'audience_planifiee'
  | 'jugement_rendu'
  | 'cloture';

export interface JusticeCase {
  id: string;
  animal_id?: string;
  numero_parquet?: string;
  tribunal?: string;
  date_audience?: string;
  avocat?: string;
  avocat_contact?: string;
  requisition?: string;
  resume_faits?: string;
  statut: JusticeStatut;
  decision?: string;
  date_cloture?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  animal?: Animal;
}

export type PensionType = 'pension' | 'fourriere' | 'spa';

export interface Pension {
  id: string;
  nom: string;
  type: PensionType;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  cout_journalier?: number;
  contact_referent?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PensionSejour {
  id: string;
  animal_id: string;
  pension_id?: string;
  date_entree: string;
  date_sortie?: string;
  cout_total?: number;
  facture_url?: string;
  notes?: string;
  created_at: string;
  animal?: Animal;
  pension?: Pension;
}

export interface Enqueteur {
  id: string;
  profile_id?: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  departements?: string[];
  zones_couvertes?: string;
  disponibilites?: string;
  date_carte_enqueteur?: string;
  carte_enqueteur_url?: string;
  cotisation_payee: boolean;
  date_derniere_cotisation?: string;
  notes?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export type TransportType = 'covoiturage' | 'transporteur' | 'benevole';
export type TransportStatut = 'planifie' | 'en_cours' | 'termine' | 'annule';

export interface Transport {
  id: string;
  animal_id: string;
  type: TransportType;
  transporteur_nom?: string;
  transporteur_contact?: string;
  lieu_depart?: string;
  lieu_arrivee?: string;
  date_transport: string;
  heure_depart?: string;
  heure_arrivee?: string;
  cout?: number;
  statut: TransportStatut;
  notes?: string;
  created_at: string;
  animal?: Animal;
}

export type DocumentModule =
  | 'animal'
  | 'signalement'
  | 'famille_accueil'
  | 'adoption'
  | 'veterinaire'
  | 'justice'
  | 'pension'
  | 'transport'
  | 'communication'
  | 'autre';

export type DocumentType =
  | 'contrat'
  | 'facture'
  | 'devis'
  | 'certificat'
  | 'jugement'
  | 'photo'
  | 'video'
  | 'compte_rendu'
  | 'carte'
  | 'autre';

export interface DocumentItem {
  id: string;
  animal_id?: string;
  module: DocumentModule;
  module_id?: string;
  type_document: DocumentType;
  nom_fichier: string;
  url: string;
  description?: string;
  taille?: number;
  created_by?: string;
  created_at: string;
  animal?: { id: string; nom: string };
}

export type DepenseType =
  | 'veterinaire'
  | 'pension'
  | 'transport'
  | 'nourriture'
  | 'materiel'
  | 'autre';

export interface Depense {
  id: string;
  animal_id?: string;
  type: DepenseType;
  description: string;
  montant: number;
  date_depense: string;
  facture_url?: string;
  created_at: string;
  animal?: Animal;
}

export type CommunicationType =
  | 'reseau_social'
  | 'site'
  | 'appel_adoption'
  | 'recherche_fa'
  | 'urgence'
  | 'covoiturage'
  | 'autre';

export interface Communication {
  id: string;
  animal_id?: string;
  type: CommunicationType;
  canal?: string;
  titre?: string;
  contenu?: string;
  url_publication?: string;
  date_publication: string;
  portee?: string;
  created_at: string;
  animal?: Animal;
}

export type AlertType =
  | 'vaccin'
  | 'icad'
  | 'audience'
  | 'post_visite'
  | 'pension_longue'
  | 'echeance_contrat'
  | 'relance_adoption'
  | 'autre';

export type AlertStatut = 'active' | 'traitée' | 'ignorée';
export type AlertPriorite = 'faible' | 'normal' | 'urgent' | 'critique';

export interface Alert {
  id: string;
  animal_id?: string;
  type: AlertType;
  titre: string;
  message?: string;
  date_echeance: string;
  statut: AlertStatut;
  priorite: AlertPriorite;
  created_at: string;
  animal?: Animal;
}

export type RegistreType = 'entree' | 'sortie';

export interface RegistreEntreeSortie {
  id: string;
  animal_id: string;
  numero_entree: string;
  type: RegistreType;
  date: string;
  motif?: string;
  provenance_destination?: string;
  created_at: string;
  animal?: Animal;
}

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  table_name: string;
  record_id?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  description?: string;
  created_at: string;
}
