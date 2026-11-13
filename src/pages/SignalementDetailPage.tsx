import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Flag, User, MapPin, FileText, UserCheck, MessageSquare, Plus,
  CheckCircle, Clock, Dog, ClipboardList, Upload, Edit, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { DocumentUpload, emptyDocumentSource, type DocumentSource } from '../components/DocumentUpload';
import { openDocument } from '../lib/documentUpload';
import {
  signalementStatutLabels, signalementUrgenceLabels, signalementUrgenceColors,
  enqueteActionTypeLabels, enqueteActionStatutLabels, enqueteActionStatutColors,
  signalementAnimalRoleLabels, formatDate, formatDateTime,
} from '../lib/constants';
import type {
  Signalement, SignalementStatut, Enqueteur, Animal,
  EnqueteCompteRendu, EnqueteAction, EnqueteActionType, EnqueteActionStatut,
  SignalementAnimalRole, DocumentItem,
} from '../types';

const statutColors: Record<SignalementStatut, string> = {
  nouveau: 'bg-warning-100 text-warning-800',
  en_cours: 'bg-secondary-100 text-secondary-800',
  traite: 'bg-success-100 text-success-700',
  cloture: 'bg-neutral-100 text-neutral-500',
};

const workflowSteps: SignalementStatut[] = ['nouveau', 'en_cours', 'traite', 'cloture'];

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function SignalementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signalement, setSignalement] = useState<Signalement | null>(null);

  const [enqueteurs, setEnqueteurs] = useState<Enqueteur[]>([]);
  const [enqueteursAssignes, setEnqueteursAssignes] = useState<string[]>([]);
  const [animauxLies, setAnimauxLies] = useState<{ link: { animal_id: string; role: SignalementAnimalRole }; animal: Animal }[]>([]);
  const [tousAnimaux, setTousAnimaux] = useState<Animal[]>([]);
  const [rapports, setRapports] = useState<EnqueteCompteRendu[]>([]);
  const [actions, setActions] = useState<EnqueteAction[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [comments, setComments] = useState<any[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSelection, setAssignSelection] = useState<string[]>([]);
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [animalForm, setAnimalForm] = useState({ animal_id: '', role: 'signale' as SignalementAnimalRole });
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [rapportForm, setRapportForm] = useState({ date_rapport: new Date().toISOString().split('T')[0], auteur: '', contenu: '' });
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    type: 'visite' as EnqueteActionType,
    date_action: new Date().toISOString().split('T')[0],
    lieu: '', description: '', echeance: '', statut: 'realise' as EnqueteActionStatut,
  });
  const [actionEditing, setActionEditing] = useState<EnqueteAction | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ nom_fichier: '', description: '', source: emptyDocumentSource() });
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ decision: '', date_decision: '' });
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [sigRes, enqRes, liensRes, rapportsRes, actionsRes, docsRes, commentsRes, tousAnimauxRes] = await Promise.all([
      supabase.from('signalements').select('*, animal:animals(*)').eq('id', id).single(),
      supabase.from('signalement_enqueteurs').select('enqueteur_id').eq('signalement_id', id),
      supabase.from('signalement_animaux').select('*, animal:animals(*)').eq('signalement_id', id),
      supabase.from('enquete_compte_rendus').select('*').eq('signalement_id', id).order('date_rapport', { ascending: false }),
      supabase.from('enquete_actions').select('*').eq('signalement_id', id).order('date_action', { ascending: false }),
      supabase.from('documents').select('*').eq('animal_id', id).eq('module', 'signalement'),
      supabase.from('signalement_comments').select('*').eq('signalement_id', id).order('created_at', { ascending: false }),
      supabase.from('animals').select('id, nom, espece, race, photo_url, statut').order('nom'),
    ]);

    if (sigRes.data) setSignalement(sigRes.data as Signalement);
    setEnqueteursAssignes((enqRes.data ?? []).map((r: any) => r.enqueteur_id));
    setAnimauxLies((liensRes.data ?? []).map((r: any) => ({ link: { animal_id: r.animal_id, role: r.role }, animal: r.animal })));
    setRapports((rapportsRes.data ?? []) as EnqueteCompteRendu[]);
    setActions((actionsRes.data ?? []) as EnqueteAction[]);
    setDocuments((docsRes.data ?? []) as DocumentItem[]);
    setComments(commentsRes.data ?? []);
    setTousAnimaux((tousAnimauxRes.data ?? []) as Animal[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('enqueteurs').select('*').eq('actif', true).order('nom').then(({ data }) => setEnqueteurs((data ?? []) as Enqueteur[]));
  }, [id]);

  const openAssignModal = () => {
    setAssignSelection(enqueteursAssignes);
    setShowAssignModal(true);
  };

  const handleAssignSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await supabase.from('signalement_enqueteurs').delete().eq('signalement_id', id);
      if (assignSelection.length > 0) {
        const { error } = await supabase.from('signalement_enqueteurs').insert(
          assignSelection.map((eid) => ({ signalement_id: id, enqueteur_id: eid }))
        );
        if (error) throw new Error(error.message);
      }
      setShowAssignModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkAnimal = async () => {
    if (!id || !animalForm.animal_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('signalement_animaux').insert({
        signalement_id: id,
        animal_id: animalForm.animal_id,
        role: animalForm.role,
      });
      if (error) throw new Error(error.message);
      setShowAnimalModal(false);
      setAnimalForm({ animal_id: '', role: 'signale' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkAnimal = async (animalId: string) => {
    if (!id) return;
    await supabase.from('signalement_animaux').delete().eq('signalement_id', id).eq('animal_id', animalId);
    await load();
  };

  const handleRapportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('enquete_compte_rendus').insert({
        signalement_id: id,
        date_rapport: rapportForm.date_rapport,
        auteur: rapportForm.auteur || null,
        contenu: rapportForm.contenu,
      });
      if (error) throw new Error(error.message);
      setShowRapportModal(false);
      setRapportForm({ date_rapport: new Date().toISOString().split('T')[0], auteur: '', contenu: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openActionCreate = () => {
    setActionEditing(null);
    setActionForm({ type: 'visite', date_action: new Date().toISOString().split('T')[0], lieu: '', description: '', echeance: '', statut: 'realise' });
    setShowActionModal(true);
  };

  const openActionEdit = (a: EnqueteAction) => {
    setActionEditing(a);
    setActionForm({
      type: a.type, date_action: a.date_action, lieu: a.lieu ?? '',
      description: a.description, echeance: a.echeance ?? '', statut: a.statut,
    });
    setShowActionModal(true);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        signalement_id: id,
        type: actionForm.type,
        date_action: actionForm.date_action,
        lieu: actionForm.lieu || null,
        description: actionForm.description,
        echeance: actionForm.echeance || null,
        statut: actionForm.statut,
      };
      const { error } = actionEditing
        ? await supabase.from('enquete_actions').update(payload).eq('id', actionEditing.id)
        : await supabase.from('enquete_actions').insert(payload);
      if (error) throw new Error(error.message);
      setShowActionModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const quickActionStatut = async (a: EnqueteAction, statut: EnqueteActionStatut) => {
    await supabase.from('enquete_actions').update({ statut }).eq('id', a.id);
    await load();
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!docForm.source.storage_path && !docForm.source.url) {
      setError('Envoyez un fichier ou renseignez un lien externe.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('documents').insert({
        animal_id: id,
        module: 'signalement',
        module_id: id,
        type_document: 'photo',
        nom_fichier: docForm.nom_fichier || docForm.source.nom_fichier,
        url: docForm.source.url,
        storage_path: docForm.source.storage_path,
        taille: docForm.source.taille,
        description: docForm.description || null,
      });
      if (error) throw new Error(error.message);
      setShowDocModal(false);
      setDocForm({ nom_fichier: '', description: '', source: emptyDocumentSource() });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('signalements').update({
        decision: decisionForm.decision || null,
        date_decision: decisionForm.date_decision || null,
      }).eq('id', id);
      if (error) throw new Error(error.message);
      setShowDecisionModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    const { error } = await supabase.from('signalement_comments').insert({
      signalement_id: id,
      contenu: newComment,
    });
    if (error) alert('Erreur lors de l\'ajout du commentaire');
    else {
      setNewComment('');
      setShowCommentForm(false);
      await load();
    }
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
  const enqueteursNoms = enqueteursAssignes
    .map((eid) => enqueteurs.find((e) => e.id === eid))
    .filter(Boolean) as Enqueteur[];

  const historique = [
    ...actions.map((a) => ({ date: a.date_action, type: 'action' as const, label: `${enqueteActionTypeLabels[a.type]} : ${a.description}`, detail: a.lieu })),
    ...rapports.map((r) => ({ date: r.date_rapport, type: 'rapport' as const, label: `Compte rendu${r.auteur ? ` — ${r.auteur}` : ''}`, detail: r.contenu.slice(0, 100) })),
    ...comments.map((c) => ({ date: c.created_at?.slice(0, 10), type: 'commentaire' as const, label: 'Commentaire confidentiel', detail: c.contenu?.slice(0, 100) })),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <div>
      <button onClick={() => navigate('/signalements')} className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      <div className="card mb-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-neutral-900">{signalement.numero_dossier}</h1>
              <Badge className={signalementUrgenceColors[signalement.urgence]}>{signalementUrgenceLabels[signalement.urgence]}</Badge>
              <Badge className={statutColors[signalement.statut]}>{signalementStatutLabels[signalement.statut]}</Badge>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              Créé le {formatDate(signalement.date_signalement)} · {signalement.motif}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={openAssignModal} className="btn-ghost"><UserCheck size={16} /> Enquêteurs</button>
            <button onClick={() => { setDecisionForm({ decision: signalement.decision ?? '', date_decision: signalement.date_decision ?? '' }); setShowDecisionModal(true); }} className="btn-ghost"><ClipboardList size={16} /> Décision</button>
          </div>
        </div>
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Workflow</h2>
        <div className="flex items-center justify-between overflow-x-auto">
          {workflowSteps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${index <= currentStepIndex ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                {index < currentStepIndex ? <CheckCircle size={20} /> : index === currentStepIndex ? <Clock size={20} /> : <span className="text-sm">{index + 1}</span>}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-sm font-medium ${index <= currentStepIndex ? 'text-neutral-900' : 'text-neutral-500'}`}>{signalementStatutLabels[step]}</p>
              </div>
              {index < workflowSteps.length - 1 && <div className={`mx-4 h-1 w-16 shrink-0 ${index < currentStepIndex ? 'bg-primary-600' : 'bg-neutral-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Informations du signalement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500"><User size={16} /> Déclarant</div>
            <p className="mt-1 text-neutral-900">{signalement.declarant_prenom} {signalement.declarant_nom}</p>
            {signalement.declarant_telephone && <p className="text-sm text-neutral-600">{signalement.declarant_telephone}</p>}
            {signalement.declarant_email && <p className="text-sm text-neutral-600">{signalement.declarant_email}</p>}
          </div>
          <div className="rounded-lg bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500"><MapPin size={16} /> Lieu</div>
            <p className="mt-1 text-neutral-900">{signalement.lieu_signalement || 'Non spécifié'}</p>
            {signalement.latitude && signalement.longitude && (
              <p className="text-sm text-neutral-600">GPS: {signalement.latitude}, {signalement.longitude}</p>
            )}
          </div>
          <div className="rounded-lg bg-neutral-50 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500"><FileText size={16} /> Motif</div>
            <p className="mt-1 text-neutral-900">{signalement.motif}</p>
          </div>
          {signalement.description && (
            <div className="rounded-lg bg-neutral-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-500"><FileText size={16} /> Description</div>
              <p className="mt-1 whitespace-pre-line text-neutral-900">{signalement.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Enquêteurs affectés</h2>
          <button onClick={openAssignModal} className="btn-ghost text-sm"><Plus size={16} /> Affecter</button>
        </div>
        {enqueteursNoms.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Aucun enquêteur affecté.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {enqueteursNoms.map((e) => (
              <Badge key={e.id} className="bg-secondary-100 text-secondary-700">{e.nom} {e.prenom}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Animaux liés au dossier</h2>
          <button onClick={() => setShowAnimalModal(true)} className="btn-ghost text-sm"><Plus size={16} /> Lier un animal</button>
        </div>
        {animauxLies.length === 0 && !signalement.animal ? (
          <p className="mt-2 text-sm text-neutral-500">Aucun animal lié. Liez les animaux signalés ou pris en charge — sans ressaisir leurs informations.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {signalement.animal && !animauxLies.some((l) => l.link.animal_id === signalement.animal_id) && (
              <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
                <Dog size={18} className="text-primary-600" />
                <Link to={`/animaux/${signalement.animal_id}`} className="font-medium text-primary-600 hover:underline">{signalement.animal.nom}</Link>
                <Badge className="bg-neutral-100 text-neutral-600">Animal principal</Badge>
              </div>
            )}
            {animauxLies.map(({ link, animal }) => (
              <div key={link.animal_id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-3">
                  <Dog size={18} className="text-primary-600" />
                  <Link to={`/animaux/${link.animal_id}`} className="font-medium text-primary-600 hover:underline">{animal?.nom ?? link.animal_id}</Link>
                  <Badge className={link.role === 'pris_en_charge' ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-600'}>
                    {signalementAnimalRoleLabels[link.role]}
                  </Badge>
                </div>
                <button onClick={() => handleUnlinkAnimal(link.animal_id)} className="btn-ghost text-error-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Comptes rendus d'enquête</h2>
          <button onClick={() => setShowRapportModal(true)} className="btn-ghost text-sm"><Plus size={16} /> Ajouter un compte rendu</button>
        </div>
        {rapports.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Aucun compte rendu.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {rapports.map((r) => (
              <div key={r.id} className="rounded-lg border border-neutral-200 p-4">
                <p className="text-sm font-medium text-neutral-900">{formatDate(r.date_rapport)}{r.auteur ? ` — ${r.auteur}` : ''}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{r.contenu}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Actions, visites & démarches</h2>
          <button onClick={openActionCreate} className="btn-ghost text-sm"><Plus size={16} /> Ajouter une action</button>
        </div>
        {actions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Aucune action enregistrée.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {actions.map((a) => {
              const days = daysUntil(a.echeance);
              const overdue = a.statut === 'en_attente' && days !== null && days < 0;
              return (
                <div key={a.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary-100 text-primary-700">{enqueteActionTypeLabels[a.type]}</Badge>
                        <Badge className={enqueteActionStatutColors[a.statut]}>{enqueteActionStatutLabels[a.statut]}</Badge>
                        {a.echeance && (
                          <Badge className={overdue ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-800'}>
                            {overdue ? `Échéance dépassée (${Math.abs(days)} j)` : `Échéance : ${formatDate(a.echeance)}`}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-neutral-900">{a.description}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDate(a.date_action)}{a.lieu ? ` · ${a.lieu}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {(['realise', 'en_attente'] as EnqueteActionStatut[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => quickActionStatut(a, s)}
                          disabled={a.statut === s}
                          className={`rounded-full px-2 py-1 text-xs ${a.statut === s ? enqueteActionStatutColors[s] : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                          {enqueteActionStatutLabels[s]}
                        </button>
                      ))}
                      <button onClick={() => openActionEdit(a)} className="btn-ghost text-sm"><Edit size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {signalement.decision && (
        <div className="card mb-6 border-l-4 border-success-400 p-6">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Décision & suite donnée</h2>
          <p className="mt-2 text-sm text-neutral-700">{signalement.decision}</p>
          {signalement.date_decision && <p className="mt-1 text-xs text-neutral-500">Le {formatDate(signalement.date_decision)}</p>}
        </div>
      )}

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Photos, vidéos & documents</h2>
          <button onClick={() => setShowDocModal(true)} className="btn-ghost text-sm"><Upload size={16} /> Ajouter</button>
        </div>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Aucun document.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => openDocument(doc).catch(() => alert('Impossible d\'ouvrir le document'))}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-200"
              >
                <FileText size={14} /> {doc.nom_fichier}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Commentaires confidentiels</h2>
          <button onClick={() => setShowCommentForm(!showCommentForm)} className="btn-ghost"><MessageSquare size={16} /> Ajouter</button>
        </div>
        {showCommentForm && (
          <div className="mb-4 rounded-lg bg-neutral-50 p-4">
            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire confidentiel..." className="input mb-2" rows={3} />
            <div className="flex gap-2">
              <button onClick={handleAddComment} className="btn-primary">Enregistrer</button>
              <button onClick={() => setShowCommentForm(false)} className="btn-ghost">Annuler</button>
            </div>
          </div>
        )}
        {comments.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun commentaire.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-neutral-200 p-3">
                <p className="text-sm text-neutral-900">{c.contenu}</p>
                <p className="mt-1 text-xs text-neutral-500">{formatDateTime(c.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Historique du dossier</h2>
        {historique.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun événement.</p>
        ) : (
          <div className="space-y-3">
            {historique.map((h, i) => (
              <div key={i} className="flex gap-3 border-b border-neutral-100 pb-3 last:border-0">
                <div className="w-24 shrink-0 text-xs text-neutral-500">{h.date ? formatDate(h.date) : '—'}</div>
                <div>
                  <Badge className={h.type === 'action' ? 'bg-primary-100 text-primary-700' : h.type === 'rapport' ? 'bg-secondary-100 text-secondary-700' : 'bg-neutral-100 text-neutral-600'}>
                    {h.type === 'action' ? 'Action' : h.type === 'rapport' ? 'Compte rendu' : 'Commentaire'}
                  </Badge>
                  <p className="mt-1 text-sm text-neutral-900">{h.label}</p>
                  {h.detail && <p className="text-xs text-neutral-500">{h.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Affecter des enquêteurs" size="md">
        <div className="space-y-3">
          {enqueteurs.length === 0 ? (
            <p className="text-sm text-neutral-500">Aucun enquêteur actif. Créez-en un dans la page Enquêteurs.</p>
          ) : (
            enqueteurs.map((e) => (
              <label key={e.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
                <input
                  type="checkbox"
                  checked={assignSelection.includes(e.id)}
                  onChange={(ev) => setAssignSelection(ev.target.checked ? [...assignSelection, e.id] : assignSelection.filter((x) => x !== e.id))}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-neutral-900">{e.nom} {e.prenom}</p>
                  <p className="text-sm text-neutral-500">{e.specialite || e.ville || ''}</p>
                </div>
              </label>
            ))
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAssignModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleAssignSave} disabled={saving} className="btn-primary">Enregistrer</button>
          </div>
        </div>
      </Modal>

      <Modal open={showAnimalModal} onClose={() => setShowAnimalModal(false)} title="Lier un animal au dossier" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Animal *</label>
            <select value={animalForm.animal_id} onChange={(e) => setAnimalForm({ ...animalForm, animal_id: e.target.value })} className="input">
              <option value="">Sélectionner...</option>
              {tousAnimaux
                .filter((a) => !animauxLies.some((l) => l.link.animal_id === a.id) && a.id !== signalement.animal_id)
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.nom} ({a.espece}{a.race ? ` · ${a.race}` : ''})</option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">Rôle dans le dossier</label>
            <select value={animalForm.role} onChange={(e) => setAnimalForm({ ...animalForm, role: e.target.value as SignalementAnimalRole })} className="input">
              {Object.entries(signalementAnimalRoleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAnimalModal(false)} className="btn-ghost">Annuler</button>
            <button onClick={handleLinkAnimal} disabled={saving || !animalForm.animal_id} className="btn-primary">Lier</button>
          </div>
        </div>
      </Modal>

      <Modal open={showRapportModal} onClose={() => setShowRapportModal(false)} title="Nouveau compte rendu d'enquête" size="lg">
        <form onSubmit={handleRapportSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Date du rapport *</label>
              <input type="date" required value={rapportForm.date_rapport} onChange={(e) => setRapportForm({ ...rapportForm, date_rapport: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Auteur</label>
              <input type="text" value={rapportForm.auteur} onChange={(e) => setRapportForm({ ...rapportForm, auteur: e.target.value })} className="input" placeholder="Nom de l'enquêteur" />
            </div>
          </div>
          <div>
            <label className="label">Contenu du compte rendu *</label>
            <textarea required value={rapportForm.contenu} onChange={(e) => setRapportForm({ ...rapportForm, contenu: e.target.value })} rows={6} className="input" placeholder="Constats de la visite, état des lieux, suite donnée..." />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowRapportModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal open={showActionModal} onClose={() => setShowActionModal(false)} title={actionEditing ? 'Modifier l\'action' : 'Nouvelle action'} size="lg">
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Type *</label>
              <select value={actionForm.type} onChange={(e) => setActionForm({ ...actionForm, type: e.target.value as EnqueteActionType })} className="input">
                {Object.entries(enqueteActionTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={actionForm.date_action} onChange={(e) => setActionForm({ ...actionForm, date_action: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Lieu</label>
              <input type="text" value={actionForm.lieu} onChange={(e) => setActionForm({ ...actionForm, lieu: e.target.value })} className="input" placeholder="Adresse, lieu de visite..." />
            </div>
            <div>
              <label className="label">Statut</label>
              <select value={actionForm.statut} onChange={(e) => setActionForm({ ...actionForm, statut: e.target.value as EnqueteActionStatut })} className="input">
                {Object.entries(enqueteActionStatutLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Échéance (rappel)</label>
              <input type="date" value={actionForm.echeance} onChange={(e) => setActionForm({ ...actionForm, echeance: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <textarea required value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} rows={3} className="input" placeholder="Détail de la visite, de l'intervention, de la démarche..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowActionModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Ajouter un document" size="md">
        <form onSubmit={handleDocSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div>
            <label className="label">Fichier *</label>
            <DocumentUpload value={docForm.source} onChange={(source: DocumentSource) => setDocForm({ ...docForm, source })} pathPrefix={id ?? 'signalement'} />
          </div>
          <div>
            <label className="label">Nom du fichier</label>
            <input type="text" value={docForm.nom_fichier} onChange={(e) => setDocForm({ ...docForm, nom_fichier: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} className="input" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowDocModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDecisionModal} onClose={() => setShowDecisionModal(false)} title="Décision & suite donnée" size="md">
        <form onSubmit={handleDecisionSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div>
            <label className="label">Décision / suite donnée</label>
            <textarea value={decisionForm.decision} onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })} rows={4} className="input" placeholder="Ex : 2 chiens pris en charge, 1 restitué au propriétaire..." />
          </div>
          <div>
            <label className="label">Date de la décision</label>
            <input type="date" value={decisionForm.date_decision} onChange={(e) => setDecisionForm({ ...decisionForm, date_decision: e.target.value })} className="input" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowDecisionModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
