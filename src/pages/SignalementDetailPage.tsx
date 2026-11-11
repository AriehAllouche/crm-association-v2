import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, User, MapPin, FileText, UserCheck, MessageSquare, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import {
  signalementStatutLabels,
  signalementUrgenceLabels,
  signalementUrgenceColors,
  formatDate,
  formatDateTime,
} from '../lib/constants';
import type { Signalement, SignalementStatut, Enqueteur } from '../types';

const statutColors: Record<SignalementStatut, string> = {
  nouveau: 'bg-warning-100 text-warning-800',
  en_cours: 'bg-secondary-100 text-secondary-800',
  traite: 'bg-success-100 text-success-700',
  cloture: 'bg-neutral-100 text-neutral-500',
};

const workflowSteps: SignalementStatut[] = ['nouveau', 'en_cours', 'traite', 'cloture'];

export function SignalementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signalement, setSignalement] = useState<Signalement | null>(null);
  const [enqueteurs, setEnqueteurs] = useState<Enqueteur[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEnqueteur, setSelectedEnqueteur] = useState<string>('');
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [interventionData, setInterventionData] = useState({
    creer_animal: false,
    creer_justice: false,
    creer_veterinaire: false,
    creer_fa: false,
    creer_transport: false,
  });

  useEffect(() => {
    if (id) {
      fetchSignalement();
      fetchEnqueteurs();
      fetchComments();
    }
  }, [id]);

  const fetchSignalement = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('signalements')
      .select('*, animal:animals(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching signalement:', error);
    } else {
      setSignalement(data as Signalement);
    }
    setLoading(false);
  };

  const fetchEnqueteurs = async () => {
    const { data } = await supabase
      .from('enqueteurs')
      .select('*')
      .eq('actif', true)
      .order('nom');
    setEnqueteurs((data ?? []) as Enqueteur[]);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('signalement_comments')
      .select('*')
      .eq('signalement_id', id)
      .order('created_at', { ascending: false });
    setComments(data ?? []);
  };

  const handleAssignEnqueteur = async () => {
    if (!signalement || !selectedEnqueteur) return;
    const { error } = await supabase
      .from('signalements')
      .update({ enqueteur_id: selectedEnqueteur })
      .eq('id', signalement.id);

    if (error) {
      alert('Erreur lors de l\'affectation');
    } else {
      setShowAssignModal(false);
      setSelectedEnqueteur('');
      fetchSignalement();
    }
  };

  const handleAddComment = async () => {
    if (!signalement || !newComment.trim()) return;
    const { error } = await supabase
      .from('signalement_comments')
      .insert({
        signalement_id: signalement.id,
        contenu: newComment,
        created_at: new Date().toISOString(),
      });

    if (error) {
      alert('Erreur lors de l\'ajout du commentaire');
    } else {
      setNewComment('');
      setShowCommentForm(false);
      fetchComments();
    }
  };

  const handleCreateIntervention = async () => {
    if (!signalement) return;
    // Cette fonctionnalité créera automatiquement les entités liées
    // Pour l'instant, on affiche un message de confirmation
    alert('Fonctionnalité "Créer intervention complète" - En cours de développement');
    setShowInterventionModal(false);
  };

  if (loading) return <LoadingSpinner />;

  if (!signalement) {
    return (
      <EmptyState
        icon={Flag}
        title="Signalement introuvable"
        description="Ce signalement n'existe pas ou a été supprimé."
        action={<button onClick={() => navigate('/signalements')} className="btn-primary">Retour à la liste</button>}
      />
    );
  }

  const currentStepIndex = workflowSteps.indexOf(signalement.statut);

  return (
    <div>
      <button onClick={() => navigate('/signalements')} className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-neutral-900">{signalement.numero_dossier}</h1>
              <Badge className={signalementUrgenceColors[signalement.urgence]}>
                {signalementUrgenceLabels[signalement.urgence]}
              </Badge>
              <Badge className={statutColors[signalement.statut]}>
                {signalementStatutLabels[signalement.statut]}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              Créé le {formatDate(signalement.date_signalement)} par {signalement.created_by || 'Système'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-ghost"
            >
              <UserCheck size={16} /> Affecter enquêteur
            </button>
            <button
              onClick={() => setShowInterventionModal(true)}
              className="btn-primary"
            >
              <Plus size={16} /> Créer intervention
            </button>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Workflow & Affectation</h2>
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                index <= currentStepIndex ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-500'
              }`}>
                {index < currentStepIndex ? <CheckCircle size={20} /> : index === currentStepIndex ? <Clock size={20} /> : <XCircle size={20} />}
              </div>
              <div className="ml-2">
                <p className={`text-sm font-medium ${index <= currentStepIndex ? 'text-neutral-900' : 'text-neutral-500'}`}>
                  {signalementStatutLabels[step]}
                </p>
              </div>
              {index < workflowSteps.length - 1 && (
                <div className={`mx-4 h-1 w-16 ${index < currentStepIndex ? 'bg-primary-600' : 'bg-neutral-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Enquêteur assigné */}
        {signalement.enqueteur_id && (
          <div className="mt-4 rounded-lg bg-neutral-50 p-3">
            <p className="text-sm font-medium text-neutral-700">Enquêteur assigné:</p>
            <p className="text-sm text-neutral-900">{enqueteurs.find(e => e.id === signalement.enqueteur_id)?.nom} {enqueteurs.find(e => e.id === signalement.enqueteur_id)?.prenom}</p>
          </div>
        )}
      </div>

      {/* Informations du signalement */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Informations du signalement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
              <User size={16} /> Déclarant
            </div>
            <p className="mt-1 text-neutral-900">{signalement.declarant_prenom} {signalement.declarant_nom}</p>
            {signalement.declarant_telephone && <p className="text-sm text-neutral-600">{signalement.declarant_telephone}</p>}
            {signalement.declarant_email && <p className="text-sm text-neutral-600">{signalement.declarant_email}</p>}
          </div>
          <div className="rounded-lg bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
              <MapPin size={16} /> Lieu
            </div>
            <p className="mt-1 text-neutral-900">{signalement.lieu_signalement || 'Non spécifié'}</p>
            {signalement.latitude && signalement.longitude && (
              <p className="text-sm text-neutral-600">GPS: {signalement.latitude}, {signalement.longitude}</p>
            )}
          </div>
          <div className="rounded-lg bg-neutral-50 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
              <FileText size={16} /> Motif
            </div>
            <p className="mt-1 text-neutral-900">{signalement.motif}</p>
          </div>
          {signalement.description && (
            <div className="rounded-lg bg-neutral-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                <FileText size={16} /> Description
              </div>
              <p className="mt-1 text-neutral-900">{signalement.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Animal associé */}
      {signalement.animal && (
        <div className="card mb-6 p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Animal associé</h2>
          <div className="flex items-center gap-4">
            {signalement.animal.photo_url ? (
              <img src={signalement.animal.photo_url} alt={signalement.animal.nom} className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Flag size={24} />
              </div>
            )}
            <div>
              <p className="font-medium text-neutral-900">{signalement.animal.nom}</p>
              <p className="text-sm text-neutral-500">{signalement.animal.espece} {signalement.animal.race}</p>
            </div>
          </div>
        </div>
      )}

      {/* Commentaires confidentiels */}
      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Commentaires confidentiels</h2>
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="btn-ghost"
          >
            <MessageSquare size={16} /> Ajouter
          </button>
        </div>

        {showCommentForm && (
          <div className="mb-4 rounded-lg bg-neutral-50 p-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire confidentiel..."
              className="input mb-2"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={handleAddComment} className="btn-primary">Enregistrer</button>
              <button onClick={() => setShowCommentForm(false)} className="btn-ghost">Annuler</button>
            </div>
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun commentaire pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-neutral-200 p-3">
                <p className="text-sm text-neutral-900">{comment.contenu}</p>
                <p className="mt-1 text-xs text-neutral-500">{formatDateTime(comment.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Affectation */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Affecter un enquêteur">
        <div className="space-y-4">
          <div>
            <label className="label">Sélectionner un enquêteur</label>
            <select
              value={selectedEnqueteur}
              onChange={(e) => setSelectedEnqueteur(e.target.value)}
              className="input"
            >
              <option value="">Choisir...</option>
              {enqueteurs.map((enq) => (
                <option key={enq.id} value={enq.id}>
                  {enq.nom} {enq.prenom} - {enq.zones_couvertes || 'Toutes zones'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAssignModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleAssignEnqueteur} className="btn-primary">Affecter</button>
          </div>
        </div>
      </Modal>

      {/* Modal Intervention complète */}
      <Modal open={showInterventionModal} onClose={() => setShowInterventionModal(false)} title="Créer intervention complète" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Cochez les entités à créer automatiquement lors de la prise en charge de cet animal :
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={interventionData.creer_animal}
                onChange={(e) => setInterventionData({ ...interventionData, creer_animal: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium text-neutral-900">Fiche Animal</p>
                <p className="text-sm text-neutral-500">Créer la fiche complète de l'animal</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={interventionData.creer_justice}
                onChange={(e) => setInterventionData({ ...interventionData, creer_justice: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium text-neutral-900">Dossier Justice & Réquisition</p>
                <p className="text-sm text-neutral-500">Créer le dossier judiciaire si nécessaire</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={interventionData.creer_veterinaire}
                onChange={(e) => setInterventionData({ ...interventionData, creer_veterinaire: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium text-neutral-900">Dossier Vétérinaire</p>
                <p className="text-sm text-neutral-500">Créer le dossier de suivi vétérinaire</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={interventionData.creer_fa}
                onChange={(e) => setInterventionData({ ...interventionData, creer_fa: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium text-neutral-900">Demande Famille d'Accueil</p>
                <p className="text-sm text-neutral-500">Créer la demande de placement FA</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={interventionData.creer_transport}
                onChange={(e) => setInterventionData({ ...interventionData, creer_transport: e.target.checked })}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium text-neutral-900">Fiche Transport / Logistique</p>
                <p className="text-sm text-neutral-500">Créer la fiche de transport si nécessaire</p>
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowInterventionModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleCreateIntervention} className="btn-primary">Créer intervention</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
