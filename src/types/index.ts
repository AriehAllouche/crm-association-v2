// Legacy roles (pour compatibilité)
export type UserRole = 'admin' | 'benevole' | 'enqueteur' | 'referent_fa';

// Nouveaux rôles RBAC
export type RBACRole =
  | 'president'
  | 'administrator'
  | 'fa_manager'
  | 'veterinary_manager'
  | 'communication_manager'
  | 'investigator'
  | 'educator'
  | 'treasurer';

export type UserStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole; // Legacy field
  phone?: string;
  avatar_url?: string;
  active: boolean;
  status: UserStatus; // Nouveau champ RBAC
  last_login?: string; // Nouveau champ RBAC
  motivation?: string; // Nouveau champ RBAC
  created_at: string;
  updated_at: string;
}

// Types RBAC
export interface Role {
  id: string;
  name: RBACRole;
  description: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string;
  role?: Role;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  permission?: Permission;
}

export interface UserWithRoles extends Profile {
  roles?: Role[];
  permissions?: Permission[];
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
  species_race?: string;
  race?: string;
  sexe?: AnimalSexe;
  gender?: string;
  date_naissance?: string;
  birth_date?: string;
  age_estime?: string;
  couleur?: string;
  poids?: string;
  taille?: string;
  sterilise: boolean;
  vaccinne: boolean;
  date_dernier_vaccin?: string;
  numero_icad?: string;
  icad_number?: string;
  numero_puce?: string;
  statut: AnimalStatut;
  status_pec?: string;
  animal_state?: string;
  withdrawal_cause?: string;
  agent?: string;
  date_pec?: string;
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
  // Champs ICAD/Documents
  icad_done?: boolean;
  requisition?: boolean;
  sortie_fourriere?: boolean;
  icad_epa?: boolean;
  icad_non_epa?: boolean;
  certificat_cession?: boolean;
  cni_recu?: boolean;
  duplicata_carte?: boolean;
  date_envoi_icad?: string;
  date_valide_epa?: string;
  attente_icad?: boolean;
  // Champs santé
  en_pension?: boolean;
  primo_vaccination?: boolean;
  date_vaccin?: string;
  rappel_vaccin?: boolean;
  date_rappel?: string;
  diagnose?: string;
  delais_rdv?: string;
  date_diagnose?: string;
  sterilisation?: boolean;
  date_sterilisation?: string;
  // Champs adoption/sortie
  caution?: string;
  frais_adoption?: string;
  adopte?: boolean;
  adoptant_nom?: string;
  lieu_intervention?: string;
  famille_accueil_actuelle?: string;
  mail_famille_accueil?: string;
  // Statuts rapides
  remis_proprietaire?: boolean;
  a_l_adoption?: boolean;
  fa_en_vue_adoption?: boolean;
  cedere_autre_asso?: boolean;
  transfert_asso?: boolean;
  perdu?: boolean;
  reserve?: boolean;
  vole?: boolean;
  notes_excel?: string;
}

export type SignalementStatut = 'nouveau' | 'en_cours' | 'traite' | 'cloture';
export type SignalementUrgence = 'faible' | 'normal' | 'urgent' | 'critique';

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
  statut: SignalementStatut;
  enqueteur_id?: string;
  date_signalement: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  animal?: Animal;
}

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
  capacite_max: number;
  animaux_actuels: number;
  referent_benevole_id?: string;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
  contrat_actif: boolean;
  materiel_confie?: string;
  croquettes_fournies?: string;
  notes?: string;
  statut?: 'active' | 'refusee' | 'en_attente';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
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
  folder?: string;
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

export type TaskPriorite = 'faible' | 'normal' | 'urgent' | 'critique';
export type TaskStatut = 'active' | 'terminee';

export interface Task {
  id: string;
  titre: string;
  description?: string;
  date_echeance: string;
  heure_echeance?: string;
  priorite: TaskPriorite;
  responsable_id?: string;
  statut: TaskStatut;
  created_at: string;
  responsable?: Profile;
}

