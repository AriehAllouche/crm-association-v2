import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, User, MapPin, Phone, Mail, FileText, Package, Bone, Dog, Star, Users, Calendar, CheckCircle, XCircle, Clock, MessageSquare, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatDate, formatDateTime } from '../lib/constants';
import type { FamilleAccueil, Animal } from '../types';

interface FamilleAccueilAnimalWithAnimal {
  id: string;
  animal_id: string;
  statut: 'prevu' | 'en_cours' | 'termine';
  date_debut?: string;
  date_fin?: string;
  motif_fin?: string;
  animal: Animal;
}

interface Evaluation {
  id: string;
  famille_accueil_id: string;
  note_communication: number;
  note_respect_consignes: number;
  note_reactivite: number;
  note_suivi_veterinaire: number;
  note_globale: number;
  commentaire?: string;
  created_by?: string;
  created_at: string;
}

interface SuiviHebdomadaire {
  id: string;
  famille_accueil_id: string;
  animal_id?: string;
  semaine: string;
  photos?: string[];
  videos?: string[];
  poids?: number;
  alimentation?: string;
  sante?: string;
  comportement?: string;
  notes?: string;
  valide_par?: string;
  created_at: string;
}

export function FamilleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [famille, setFamille] = useState<FamilleAccueil | null>(null);
  const [animals, setAnimals] = useState<FamilleAccueilAnimalWithAnimal[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [suivis, setSuivis] = useState<SuiviHebdomadaire[]>([]);
  const [activeTab, setActiveTab] = useState('identite');
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showSuiviModal, setShowSuiviModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    code_postal: '',
    ville: '',
    departement: '',
    capacite_max: 1,
    materiel_confie: '',
    croquettes_fournies: '',
    notes: '',
  });
  const [newEvaluation, setNewEvaluation] = useState({
    note_communication: 5,
    note_respect_consignes: 5,
    note_reactivite: 5,
    note_suivi_veterinaire: 5,
    note_globale: 5,
    commentaire: '',
  });
  const [newSuivi, setNewSuivi] = useState({
    animal_id: '',
    poids: '',
    alimentation: '',
    sante: '',
    comportement: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchFamille();
      fetchAnimals();
      fetchEvaluations();
      fetchSuivis();
    }
  }, [id]);

  const fetchFamille = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('famille_accueils')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching famille:', error);
    } else {
      setFamille(data as FamilleAccueil);
      // Initialiser le formulaire d'édition avec les données actuelles
      setEditForm({
        nom: data.nom || '',
        prenom: data.prenom || '',
        telephone: data.telephone || '',
        email: data.email || '',
        adresse: data.adresse || '',
        code_postal: data.code_postal || '',
        ville: data.ville || '',
        departement: data.departement || '',
        capacite_max: data.capacite_max || 1,
        materiel_confie: data.materiel_confie || '',
        croquettes_fournies: data.croquettes_fournies || '',
        notes: data.notes || '',
      });
    }
    setLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!famille) return;

    const { error } = await supabase
      .from('famille_accueils')
      .update({
        ...editForm,
        capacite_max: Number(editForm.capacite_max) || 1,
      })
      .eq('id', famille.id);

    if (error) {
      alert('Erreur lors de la mise à jour');
    } else {
      setShowEditModal(false);
      fetchFamille();
    }
  };

  const fetchAnimals = async () => {
    const { data, error } = await supabase
      .from('famille_accueil_animaux')
      .select('id, animal_id, statut, date_debut, date_fin, motif_fin, animal:animals(id, nom, espece, photo_url, statut)')
      .eq('famille_accueil_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching animals:', error);
    } else {
      setAnimals((data ?? []) as unknown as FamilleAccueilAnimalWithAnimal[]);
    }
  };

  const fetchEvaluations = async () => {
    const { data, error } = await supabase
      .from('famille_evaluations')
      .select('*')
      .eq('famille_accueil_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evaluations:', error);
    } else {
      setEvaluations(data ?? []);
    }
  };

  const fetchSuivis = async () => {
    const { data, error } = await supabase
      .from('famille_suivis_hebdomadaires')
      .select('*')
      .eq('famille_accueil_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suivis:', error);
    } else {
      setSuivis(data ?? []);
    }
  };

  const handleAddEvaluation = async () => {
    if (!famille) return;
    const { error } = await supabase
      .from('famille_evaluations')
      .insert({
        famille_accueil_id: famille.id,
        ...newEvaluation,
        created_at: new Date().toISOString(),
      });

    if (error) {
      alert('Erreur lors de l\'ajout de l\'évaluation');
    } else {
      setShowEvaluationModal(false);
      setNewEvaluation({
        note_communication: 5,
        note_respect_consignes: 5,
        note_reactivite: 5,
        note_suivi_veterinaire: 5,
        note_globale: 5,
        commentaire: '',
      });
      fetchEvaluations();
    }
  };

  const handleAddSuivi = async () => {
    if (!famille) return;
    const { error } = await supabase
      .from('famille_suivis_hebdomadaires')
      .insert({
        famille_accueil_id: famille.id,
        ...newSuivi,
        semaine: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });

    if (error) {
      alert('Erreur lors de l\'ajout du suivi');
    } else {
      setShowSuiviModal(false);
      setNewSuivi({
        animal_id: '',
        poids: '',
        alimentation: '',
        sante: '',
        comportement: '',
        notes: '',
      });
      fetchSuivis();
    }
  };

  const handleValidateSuivi = async (suiviId: string) => {
    const { error } = await supabase
      .from('famille_suivis_hebdomadaires')
      .update({ valide_par: 'current_user' })
      .eq('id', suiviId);

    if (error) {
      alert('Erreur lors de la validation');
    } else {
      fetchSuivis();
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!famille) {
    return (
      <EmptyState
        icon={Home}
        title="Famille introuvable"
        description="Cette famille d'accueil n'existe pas ou a été supprimée."
        action={<button onClick={() => navigate('/familles-accueil')} className="btn-primary">Retour à la liste</button>}
      />
    );
  }

  const placesLibres = famille.capacite_max - famille.animaux_actuels;
  const moyenneEvaluation = evaluations.length > 0
    ? evaluations.reduce((sum, e) => sum + e.note_globale, 0) / evaluations.length
    : 0;

  const tabs = [
    { id: 'identite', label: 'Identité & Contact', icon: User },
    { id: 'capacites', label: 'Capacités & Spécialités', icon: Package },
    { id: 'animaux', label: 'Animaux Accueillis', icon: Dog, count: animals.length },
    { id: 'suivis', label: 'Suivi Hebdomadaire', icon: Calendar, count: suivis.length },
    { id: 'evaluations', label: 'Évaluations', icon: Star, count: evaluations.length },
    { id: 'validation', label: 'Validation Collégiale', icon: CheckCircle },
  ];

  return (
    <div>
      <button onClick={() => navigate('/familles-accueil')} className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-neutral-900">{famille.prenom} {famille.nom}</h1>
              {famille.contrat_actif ? (
                <Badge className="bg-success-100 text-success-700">Actif</Badge>
              ) : (
                <Badge className="bg-neutral-100 text-neutral-500">Inactif</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {famille.ville || '—'}{famille.departement ? ` (${famille.departement})` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEditModal(true)} className="btn-ghost">
              <Edit size={16} /> Modifier
            </button>
            <button onClick={() => setShowEvaluationModal(true)} className="btn-ghost">
              <Star size={16} /> Évaluer
            </button>
            <button onClick={() => setShowSuiviModal(true)} className="btn-primary">
              <Plus size={16} /> Ajouter suivi
            </button>
          </div>
        </div>

        {/* Résumé */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{famille.animaux_actuels}</p>
            <p className="text-xs text-neutral-600">Animaux actuels</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-2xl font-bold text-neutral-900">{famille.capacite_max}</p>
            <p className="text-xs text-neutral-600">Capacité max</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-2xl font-bold text-success-600">{placesLibres}</p>
            <p className="text-xs text-neutral-600">Places libres</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-2xl font-bold text-warning-600">{moyenneEvaluation.toFixed(1)}</p>
            <p className="text-xs text-neutral-600">Note moyenne</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {/* IDENTITÉ & CONTACT */}
        {activeTab === 'identite' && (
          <div className="card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Informations de contact</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <User size={16} /> Nom complet
                </div>
                <p className="mt-1 text-neutral-900">{famille.prenom} {famille.nom}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <Phone size={16} /> Téléphone
                </div>
                <p className="mt-1 text-neutral-900">{famille.telephone || '—'}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <Mail size={16} /> Email
                </div>
                <p className="mt-1 text-neutral-900">{famille.email || '—'}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <MapPin size={16} /> Adresse
                </div>
                <p className="mt-1 text-neutral-900">
                  {famille.adresse || '—'}
                  {famille.code_postal && `, ${famille.code_postal}`}
                  {famille.ville && ` ${famille.ville}`}
                </p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <Calendar size={16} /> Date de début contrat
                </div>
                <p className="mt-1 text-neutral-900">{famille.date_debut_contrat ? formatDate(famille.date_debut_contrat) : '—'}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <FileText size={16} /> Notes
                </div>
                <p className="mt-1 text-neutral-900">{famille.notes || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* CAPACITÉS & SPÉCIALITÉS */}
        {activeTab === 'capacites' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Capacités & Spécialités</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Capacité d'accueil</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">{famille.capacite_max} animaux</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Animaux actuels</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">{famille.animaux_actuels}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Matériel confié</p>
                  <p className="mt-1 text-neutral-900">{famille.materiel_confie || '—'}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Croquettes fournies</p>
                  <p className="mt-1 text-neutral-900">{famille.croquettes_fournies || '—'}</p>
                </div>
              </div>
              {famille.specialites && famille.specialites.length > 0 && (
                <div className="mt-4 rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Spécialités</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {famille.specialites.map((s) => <Badge key={s} className="bg-primary-100 text-primary-700">{s}</Badge>)}
                  </div>
                </div>
              )}
            </div>

            {/* Composition du foyer */}
            <div className="card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Composition du foyer</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Adultes</p>
                  <p className="mt-1 text-neutral-900">{famille.nombre_adultes ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Enfants</p>
                  <p className="mt-1 text-neutral-900">{famille.nombre_enfants ?? '—'}{famille.ages_enfants ? ` (${famille.ages_enfants})` : ''}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Type de logement</p>
                  <p className="mt-1 text-neutral-900">{famille.type_logement === 'maison' ? 'Maison' : famille.type_logement === 'appartement' ? 'Appartement' : '—'}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Extérieur & jardin</p>
                  <p className="mt-1 text-neutral-900">
                    {famille.a_jardin ? (famille.a_jardin_cloture ? 'Jardin clôturé' : 'Jardin non clôturé') : 'Pas de jardin'}
                  </p>
                </div>
                {famille.superficie && (
                  <div className="rounded-lg bg-neutral-50 p-4">
                    <p className="text-sm font-medium text-neutral-500">Superficie</p>
                    <p className="mt-1 text-neutral-900">{famille.superficie} m²</p>
                  </div>
                )}
              </div>
            </div>

            {/* Animaux personnels & acceptés */}
            <div className="card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Animaux personnels & acceptés</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Animaux personnels</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {famille.a_chien_personnel && <Badge className="bg-neutral-100 text-neutral-700">Chien(s)</Badge>}
                    {famille.a_chat_personnel && <Badge className="bg-neutral-100 text-neutral-700">Chat(s)</Badge>}
                    {famille.a_autre_animal_personnel && <Badge className="bg-neutral-100 text-neutral-700">Autre(s)</Badge>}
                    {!famille.a_chien_personnel && !famille.a_chat_personnel && !famille.a_autre_animal_personnel && <span className="text-neutral-400">Aucun</span>}
                  </div>
                  {famille.animaux_personnels_details && <p className="mt-2 text-sm text-neutral-600">{famille.animaux_personnels_details}</p>}
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Animaux acceptés</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(famille.accepte_chiens || famille.especes_acceptees?.includes('chien')) && <Badge className="bg-success-100 text-success-700">Chiens</Badge>}
                    {(famille.accepte_chats || famille.especes_acceptees?.includes('chat')) && <Badge className="bg-success-100 text-success-700">Chats</Badge>}
                    {famille.accepte_chien_male && <Badge className="bg-neutral-100 text-neutral-700">Mâles</Badge>}
                    {famille.accepte_chien_femelle && <Badge className="bg-neutral-100 text-neutral-700">Femelles</Badge>}
                    {famille.accepte_chiots && <Badge className="bg-neutral-100 text-neutral-700">Chiots</Badge>}
                    {famille.accepte_chatons && <Badge className="bg-neutral-100 text-neutral-700">Chatons</Badge>}
                    {famille.accepte_petits_chiens && <Badge className="bg-neutral-100 text-neutral-700">Petits chiens</Badge>}
                    {famille.accepte_grands_chiens && <Badge className="bg-neutral-100 text-neutral-700">Grands chiens</Badge>}
                  </div>
                </div>
              </div>
            </div>

            {/* Capacité, durée & disponibilité */}
            <div className="card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Capacité, durée & disponibilité</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Durée d'accueil</p>
                  <p className="mt-1 text-neutral-900">
                    {famille.duree_accueil === 'temporaire' ? 'Temporaire' :
                     famille.duree_accueil === 'longue_duree' ? 'Longue durée' :
                     famille.duree_accueil === 'definitive' ? 'Définitive' :
                     famille.duree_accueil === 'sur_demande' ? 'Sur demande' : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Disponibilité</p>
                  <p className="mt-1 text-neutral-900">
                    {famille.disponibilite === 'immediate' ? 'Immédiate' :
                     famille.disponibilite === 'a_partir_du' ? `À partir du ${famille.date_disponibilite ? formatDate(famille.date_disponibilite) : ''}` :
                     famille.disponibilite === 'sur_demande' ? 'Sur demande' : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">Contrat</p>
                  <p className="mt-1 text-neutral-900">
                    {famille.contrat_actif ? 'Actif' : 'Inactif'}
                    {famille.date_debut_contrat && ` · depuis ${formatDate(famille.date_debut_contrat)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANIMAUX ACCUEILLIS */}
        {activeTab === 'animaux' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Animaux accueillis</h2>
              <button onClick={() => navigate('/animaux/nouveau')} className="btn-ghost">
                <Plus size={16} /> Ajouter animal
              </button>
            </div>
            {animals.length === 0 ? (
              <EmptyState icon={Dog} title="Aucun animal" description="Cette famille n'a pas encore accueilli d'animaux." />
            ) : (
              <div className="space-y-3">
                {animals.map((fa) => (
                  <div key={fa.id} className="card flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {fa.animal.photo_url ? (
                        <img src={fa.animal.photo_url} alt={fa.animal.nom} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                          <Dog size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">{fa.animal.nom}</p>
                        <p className="text-sm text-neutral-500">
                          {fa.animal.espece} {fa.animal.race}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {fa.date_debut ? `Depuis ${formatDate(fa.date_debut)}` : 'Date non fixée'}
                          {fa.date_fin && ` → ${formatDate(fa.date_fin)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fa.statut === 'en_cours' && <Badge className="bg-success-100 text-success-700">En cours</Badge>}
                      {fa.statut === 'prevu' && <Badge className="bg-warning-100 text-warning-800">Prévu</Badge>}
                      {fa.statut === 'termine' && <Badge className="bg-neutral-100 text-neutral-600">Terminé</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUIVI HEBDOMADAIRE */}
        {activeTab === 'suivis' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Suivi hebdomadaire</h2>
              <button onClick={() => setShowSuiviModal(true)} className="btn-primary">
                <Plus size={16} /> Ajouter suivi
              </button>
            </div>
            {suivis.length === 0 ? (
              <EmptyState icon={Calendar} title="Aucun suivi" description="Ajoutez un suivi hebdomadaire pour cette famille." />
            ) : (
              <div className="space-y-3">
                {suivis.map((suivi) => (
                  <div key={suivi.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">Semaine du {formatDate(suivi.semaine)}</p>
                        <p className="text-sm text-neutral-500">{formatDateTime(suivi.created_at)}</p>
                      </div>
                      {suivi.valide_par ? (
                        <Badge className="bg-success-100 text-success-700">Validé</Badge>
                      ) : (
                        <button onClick={() => handleValidateSuivi(suivi.id)} className="btn-ghost">
                          <CheckCircle size={16} /> Valider
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {suivi.poids && (
                        <div className="rounded-lg bg-neutral-50 p-2 text-center">
                          <p className="text-sm font-medium text-neutral-500">Poids</p>
                          <p className="text-lg font-semibold text-neutral-900">{suivi.poids} kg</p>
                        </div>
                      )}
                      {suivi.alimentation && (
                        <div className="rounded-lg bg-neutral-50 p-2 text-center">
                          <p className="text-sm font-medium text-neutral-500">Alimentation</p>
                          <p className="text-sm font-semibold text-neutral-900">{suivi.alimentation}</p>
                        </div>
                      )}
                      {suivi.sante && (
                        <div className="rounded-lg bg-neutral-50 p-2 text-center">
                          <p className="text-sm font-medium text-neutral-500">Santé</p>
                          <p className="text-sm font-semibold text-neutral-900">{suivi.sante}</p>
                        </div>
                      )}
                      {suivi.comportement && (
                        <div className="rounded-lg bg-neutral-50 p-2 text-center">
                          <p className="text-sm font-medium text-neutral-500">Comportement</p>
                          <p className="text-sm font-semibold text-neutral-900">{suivi.comportement}</p>
                        </div>
                      )}
                    </div>
                    {suivi.notes && (
                      <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                        <p className="text-sm text-neutral-600">{suivi.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ÉVALUATIONS */}
        {activeTab === 'evaluations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Évaluations</h2>
              <button onClick={() => setShowEvaluationModal(true)} className="btn-primary">
                <Star size={16} /> Ajouter évaluation
              </button>
            </div>
            {evaluations.length === 0 ? (
              <EmptyState icon={Star} title="Aucune évaluation" description="Ajoutez une évaluation pour cette famille." />
            ) : (
              <div className="space-y-3">
                {evaluations.map((eval_) => (
                  <div key={eval_.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">Note globale: {eval_.note_globale}/5</p>
                        <p className="text-sm text-neutral-500">{formatDateTime(eval_.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={star <= eval_.note_globale ? 'fill-warning-400 text-warning-400' : 'text-neutral-300'}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg bg-neutral-50 p-2 text-center">
                        <p className="text-xs text-neutral-500">Communication</p>
                        <p className="text-lg font-semibold text-neutral-900">{eval_.note_communication}/5</p>
                      </div>
                      <div className="rounded-lg bg-neutral-50 p-2 text-center">
                        <p className="text-xs text-neutral-500">Respect consignes</p>
                        <p className="text-lg font-semibold text-neutral-900">{eval_.note_respect_consignes}/5</p>
                      </div>
                      <div className="rounded-lg bg-neutral-50 p-2 text-center">
                        <p className="text-xs text-neutral-500">Réactivité</p>
                        <p className="text-lg font-semibold text-neutral-900">{eval_.note_reactivite}/5</p>
                      </div>
                      <div className="rounded-lg bg-neutral-50 p-2 text-center">
                        <p className="text-xs text-neutral-500">Suivi véto</p>
                        <p className="text-lg font-semibold text-neutral-900">{eval_.note_suivi_veterinaire}/5</p>
                      </div>
                    </div>
                    {eval_.commentaire && (
                      <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                        <p className="text-sm text-neutral-600">{eval_.commentaire}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VALIDATION COLLÉGIALE */}
        {activeTab === 'validation' && (
          <div className="card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Circuit de validation collégiale</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Statut de validation</p>
                <p className="mt-1 text-neutral-900">En attente de validation</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Avis pré-visite</p>
                <p className="mt-1 text-neutral-900">À recueillir</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Responsable animaux</p>
                <p className="mt-1 text-neutral-900">À recueillir</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Présidente</p>
                <p className="mt-1 text-neutral-900">À recueillir</p>
              </div>
              <button onClick={() => setShowValidationModal(true)} className="btn-primary">
                <CheckCircle size={16} /> Lancer validation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Évaluation */}
      <Modal open={showEvaluationModal} onClose={() => setShowEvaluationModal(false)} title="Nouvelle évaluation">
        <div className="space-y-4">
          <div>
            <label className="label">Note communication (1-5)</label>
            <select
              value={newEvaluation.note_communication}
              onChange={(e) => setNewEvaluation({ ...newEvaluation, note_communication: Number(e.target.value) })}
              className="input"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Note respect consignes (1-5)</label>
            <select
              value={newEvaluation.note_respect_consignes}
              onChange={(e) => setNewEvaluation({ ...newEvaluation, note_respect_consignes: Number(e.target.value) })}
              className="input"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Note réactivité (1-5)</label>
            <select
              value={newEvaluation.note_reactivite}
              onChange={(e) => setNewEvaluation({ ...newEvaluation, note_reactivite: Number(e.target.value) })}
              className="input"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Note suivi vétérinaire (1-5)</label>
            <select
              value={newEvaluation.note_suivi_veterinaire}
              onChange={(e) => setNewEvaluation({ ...newEvaluation, note_suivi_veterinaire: Number(e.target.value) })}
              className="input"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Note globale (1-5)</label>
            <select
              value={newEvaluation.note_globale}
              onChange={(e) => setNewEvaluation({ ...newEvaluation, note_globale: Number(e.target.value) })}
              className="input"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Commentaire</label>
            <textarea
              value={newEvaluation.commentaire}
              onChange={(e) => setNewEvaluation({ ...newEvaluation, commentaire: e.target.value })}
              className="input"
              rows={3}
              placeholder="Commentaire optionnel..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEvaluationModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleAddEvaluation} className="btn-primary">Enregistrer</button>
          </div>
        </div>
      </Modal>

      {/* Modal Édition Famille */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier la famille d'accueil" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={editForm.nom}
                onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input
                type="text"
                value={editForm.prenom}
                onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={editForm.telephone}
                onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input
                type="text"
                value={editForm.adresse}
                onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input
                type="text"
                value={editForm.code_postal}
                onChange={(e) => setEditForm({ ...editForm, code_postal: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Ville</label>
              <input
                type="text"
                value={editForm.ville}
                onChange={(e) => setEditForm({ ...editForm, ville: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Département</label>
              <input
                type="text"
                value={editForm.departement}
                onChange={(e) => setEditForm({ ...editForm, departement: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Capacité max</label>
              <input
                type="number"
                min={1}
                value={editForm.capacite_max}
                onChange={(e) => setEditForm({ ...editForm, capacite_max: Number(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Matériel confié</label>
              <input
                type="text"
                value={editForm.materiel_confie}
                onChange={(e) => setEditForm({ ...editForm, materiel_confie: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Croquettes fournies</label>
              <input
                type="text"
                value={editForm.croquettes_fournies}
                onChange={(e) => setEditForm({ ...editForm, croquettes_fournies: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>

      {/* Modal Suivi Hebdomadaire */}
      <Modal open={showSuiviModal} onClose={() => setShowSuiviModal(false)} title="Nouveau suivi hebdomadaire" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Animal (optionnel)</label>
            <select
              value={newSuivi.animal_id}
              onChange={(e) => setNewSuivi({ ...newSuivi, animal_id: e.target.value })}
              className="input"
            >
              <option value="">Tous les animaux</option>
              {animals.filter(a => a.statut === 'en_cours').map((fa) => (
                <option key={fa.animal_id} value={fa.animal_id}>{fa.animal.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Poids (kg)</label>
            <input
              type="number"
              value={newSuivi.poids}
              onChange={(e) => setNewSuivi({ ...newSuivi, poids: e.target.value })}
              className="input"
              placeholder="Ex: 12.5"
            />
          </div>
          <div>
            <label className="label">Alimentation</label>
            <input
              type="text"
              value={newSuivi.alimentation}
              onChange={(e) => setNewSuivi({ ...newSuivi, alimentation: e.target.value })}
              className="input"
              placeholder="Ex: 2 repas par jour, croquettes..."
            />
          </div>
          <div>
            <label className="label">Santé</label>
            <input
              type="text"
              value={newSuivi.sante}
              onChange={(e) => setNewSuivi({ ...newSuivi, sante: e.target.value })}
              className="input"
              placeholder="Ex: Bonne santé, pas de problème..."
            />
          </div>
          <div>
            <label className="label">Comportement</label>
            <input
              type="text"
              value={newSuivi.comportement}
              onChange={(e) => setNewSuivi({ ...newSuivi, comportement: e.target.value })}
              className="input"
              placeholder="Ex: Calme, sociable..."
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={newSuivi.notes}
              onChange={(e) => setNewSuivi({ ...newSuivi, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder="Notes complémentaires..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowSuiviModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleAddSuivi} className="btn-primary">Enregistrer</button>
          </div>
        </div>
      </Modal>

      {/* Modal Validation Collégiale */}
      <Modal open={showValidationModal} onClose={() => setShowValidationModal(false)} title="Lancer validation collégiale">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Cette action lancera le circuit de validation collégiale pour cette famille d'accueil.
            Les avis seront demandés à :
          </p>
          <ul className="list-disc pl-5 text-sm text-neutral-600">
            <li>Avis pré-visite</li>
            <li>Responsable animaux</li>
            <li>Présidente</li>
          </ul>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowValidationModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={() => { setShowValidationModal(false); alert('Validation lancée'); }} className="btn-primary">Lancer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
