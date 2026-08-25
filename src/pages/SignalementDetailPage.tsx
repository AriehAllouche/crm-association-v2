import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Flag, AlertTriangle, MapPin, User, Phone, Mail, FileText,
  MessageSquare, Send, Link2, Loader2, Bell, Eye, Calendar,
  ChevronRight, Activity, Package, Scale, Stethoscope, Home, Truck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Badge, Modal, LoadingSpinner } from '../components/ui';
import {
  formatDate, formatDateTime, signalementStatutLabels, signalementStatutColors,
  signalementUrgenceLabels, signalementUrgenceColors,
  signalementUrgenceCalculeeLabels, signalementUrgenceCalculeeColors,
  signalementUrgenceCalculeeDot, especeLabels,
} from '../lib/constants';
import type {
  Signalement, SignalementEvent, SignalementComment, SignalementPhoto,
  SignalementStatut, Profile,
} from '../types';
import { addSignalementEvent, createLinkedDossiers, type LinkedDossierChoices } from '../lib/signalementLogic';

const statutWorkflow: { statut: SignalementStatut; label: string }[] = [
  { statut: 'nouveau', label: 'Nouveau' },
  { statut: 'affecte', label: 'Affecté' },
  { statut: 'en_enquete', label: 'Enquête' },
  { statut: 'transmission', label: 'Transmission' },
  { statut: 'animal_pris_en_charge', label: 'Pris en charge' },
  { statut: 'cloture', label: 'Clôturé' },
];

const eventIcons: Record<string, typeof Activity> = {
  creation: Flag,
  statut_change: Activity,
  affectation: User,
  commentaire: MessageSquare,
  photo_upload: FileText,
  animal_cree: Package,
  justice_cree: Scale,
  veterinaire_cree: Stethoscope,
  fa_recherche: Home,
  transport_cree: Truck,
  transmission: Bell,
  alerte: AlertTriangle,
};

export function SignalementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [signalement, setSignalement] = useState<Signalement | null>(null);
  const [events, setEvents] = useState<SignalementEvent[]>([]);
  const [comments, setComments] = useState<SignalementComment[]>([]);
  const [photos, setPhotos] = useState<SignalementPhoto[]>([]);
  const [enqueteurs, setEnqueteurs] = useState<Profile[]>([]);
  const [responsables, setResponsables] = useState<Profile[]>([]);

  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [showLinkedModal, setShowLinkedModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [creatingLinked, setCreatingLinked] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'comments' | 'photos' | 'details'>('timeline');

  const [linkedChoices, setLinkedChoices] = useState<LinkedDossierChoices>({
    create_animal: true,
    create_justice: false,
    create_veterinaire: false,
    create_famille_accueil: false,
    create_transport: false,
  });

  const [assignForm, setAssignForm] = useState({
    enqueteur_id: '',
    responsable_id: '',
    date_prevue_traitement: '',
    priorite: 3,
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [sigRes, evtRes, comRes, phoRes] = await Promise.all([
      supabase
        .from('signalements')
        .select('*, animal:animals(*), enqueteur:profiles!enqueteur_id(id,full_name), responsable:profiles!responsable_id(id,full_name)')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('signalement_events')
        .select('*, auteur:profiles!auteur_id(id,full_name)')
        .eq('signalement_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('signalement_comments')
        .select('*, auteur:profiles!auteur_id(id,full_name)')
        .eq('signalement_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('signalement_photos')
        .select('*')
        .eq('signalement_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (sigRes.data) setSignalement(sigRes.data as unknown as Signalement);
    if (evtRes.data) setEvents(evtRes.data as unknown as SignalementEvent[]);
    if (comRes.data) setComments(comRes.data as unknown as SignalementComment[]);
    if (phoRes.data) setPhotos(phoRes.data as unknown as SignalementPhoto[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (signalement) {
      setAssignForm({
        enqueteur_id: signalement.enqueteur_id ?? '',
        responsable_id: signalement.responsable_id ?? '',
        date_prevue_traitement: signalement.date_prevue_traitement ?? '',
        priorite: signalement.priorite ?? 3,
      });
    }
  }, [signalement]);

  useEffect(() => {
    const fetchEnqueteurs = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('active', true)
        .order('full_name');
      setEnqueteurs((data ?? []) as unknown as Profile[]);
      setResponsables((data ?? []) as unknown as Profile[]);
    };
    fetchEnqueteurs();
  }, []);

  const canEdit = hasPermission('signalements') || hasPermission('justice');
  const canCreateLinked = canEdit && (hasPermission('animaux_gestion') || hasPermission('acces_total'));

  const handleStatutChange = async (newStatut: SignalementStatut) => {
    if (!signalement || !canEdit) return;
    const oldStatut = signalement.statut;
    const updates: Record<string, unknown> = { statut: newStatut };
    if (newStatut === 'cloture' || newStatut === 'sans_suite') {
      updates.date_cloture = new Date().toISOString();
    }
    const { error } = await supabase.from('signalements').update(updates).eq('id', signalement.id);
    if (error) return;

    await addSignalementEvent(
      signalement.id,
      'statut_change',
      'Statut changé',
      `${signalementStatutLabels[oldStatut]} → ${signalementStatutLabels[newStatut]}`,
      user?.id,
    );
    loadData();
  };

  const handleAssign = async () => {
    if (!signalement || !canEdit) return;
    const updates: Record<string, unknown> = {
      enqueteur_id: assignForm.enqueteur_id || null,
      responsable_id: assignForm.responsable_id || null,
      date_prevue_traitement: assignForm.date_prevue_traitement || null,
      priorite: assignForm.priorite,
    };
    if (signalement.statut === 'nouveau' && assignForm.enqueteur_id) {
      updates.statut = 'affecte';
    }
    const { error } = await supabase.from('signalements').update(updates).eq('id', signalement.id);
    if (error) return;

    await addSignalementEvent(
      signalement.id,
      'affectation',
      'Signalement attribué',
      assignForm.enqueteur_id
        ? `Attribué à un enquêteur — priorité ${assignForm.priorite}/5`
        : 'Attribution mise à jour',
      user?.id,
    );

    // Notify assigned user
    if (assignForm.enqueteur_id && assignForm.enqueteur_id !== user?.id) {
      await supabase.from('notifications').insert({
        user_id: assignForm.enqueteur_id,
        type: 'assignation_signalement',
        titre: `Nouveau signalement assigné: ${signalement.numero_dossier}`,
        message: signalement.motif,
        signalement_id: signalement.id,
      });
    }

    setShowAssignModal(false);
    loadData();
  };

  const handleAddComment = async () => {
    if (!signalement || !newComment.trim()) return;
    setSavingComment(true);
    const { error } = await supabase.from('signalement_comments').insert({
      signalement_id: signalement.id,
      auteur_id: user?.id,
      contenu: newComment.trim(),
    });
    if (!error) {
      await addSignalementEvent(
        signalement.id,
        'commentaire',
        'Commentaire ajouté',
        newComment.trim().substring(0, 80),
        user?.id,
      );
      setNewComment('');
      loadData();
    }
    setSavingComment(false);
  };

  const handleCreateLinked = async () => {
    if (!signalement) return;
    setCreatingLinked(true);
    setLinkedError(null);
    try {
      const result = await createLinkedDossiers(signalement, linkedChoices, user?.id ?? '');
      setShowLinkedModal(false);
      if (result.animal_id) {
        navigate(`/animaux/${result.animal_id}`);
      } else {
        loadData();
      }
    } catch (err) {
      setLinkedError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setCreatingLinked(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!signalement) {
    return (
      <div className="py-12 text-center">
        <p className="text-neutral-500">Signalement introuvable.</p>
        <Link to="/signalements" className="mt-2 inline-block text-primary-600 hover:underline">Retour à la liste</Link>
      </div>
    );
  }

  const currentStatutIndex = statutWorkflow.findIndex((s) => s.statut === signalement.statut);
  const urgenceCalc = signalement.urgence_calculee;

  return (
    <div>
      <button onClick={() => navigate('/signalements')} className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-neutral-900">{signalement.numero_dossier}</h1>
              {urgenceCalc && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${signalementUrgenceCalculeeColors[urgenceCalc]}`}>
                  <span className={`h-2 w-2 rounded-full ${signalementUrgenceCalculeeDot[urgenceCalc]}`} />
                  {signalementUrgenceCalculeeLabels[urgenceCalc]}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Créé le {formatDateTime(signalement.created_at)}
              {signalement.enqueteur && ` · Enquêteur: ${signalement.enqueteur.full_name}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={signalementUrgenceColors[signalement.urgence]}>
              {signalementUrgenceLabels[signalement.urgence]}
            </Badge>
            <Badge className={signalementStatutColors[signalement.statut]}>
              {signalementStatutLabels[signalement.statut]}
            </Badge>
            {signalement.priorite != null && signalement.priorite > 0 && (
              <Badge className="bg-primary-50 text-primary-700">Priorité {signalement.priorite}/5</Badge>
            )}
          </div>
        </div>

        {/* Cases à cocher résumé */}
        <div className="mt-4 flex flex-wrap gap-2">
          {signalement.danger_immediat && <Badge className="bg-error-100 text-error-800">Danger immédiat</Badge>}
          {signalement.animal_blesse && <Badge className="bg-warning-100 text-warning-800">Animal blessé</Badge>}
          {signalement.animal_mort && <Badge className="bg-neutral-800 text-white">Animal mort</Badge>}
          {signalement.presence_enfants && <Badge className="bg-accent-100 text-accent-800">Enfants présents</Badge>}
          {signalement.animaux_visibles && <Badge className="bg-secondary-100 text-secondary-700">Animaux visibles</Badge>}
          {signalement.espece && <Badge className="bg-neutral-100 text-neutral-600">{especeLabels[signalement.espece]}</Badge>}
          {signalement.nombre_animaux && signalement.nombre_animaux > 1 && (
            <Badge className="bg-neutral-100 text-neutral-600">{signalement.nombre_animaux} animaux</Badge>
          )}
        </div>
      </div>

      {/* Workflow visuel */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Workflow</h2>
        <div className="flex items-center overflow-x-auto pb-2">
          {statutWorkflow.map((step, i) => {
            const isDone = i < currentStatutIndex;
            const isCurrent = i === currentStatutIndex;
            const isPast = signalement.statut === 'sans_suite' && step.statut !== 'nouveau';
            return (
              <div key={step.statut} className="flex items-center">
                <button
                  onClick={() => canEdit && handleStatutChange(step.statut)}
                  disabled={!canEdit}
                  className={`flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
                    canEdit ? 'hover:bg-neutral-50 cursor-pointer' : 'cursor-default'
                  } ${isCurrent ? 'scale-105' : ''}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all ${
                    isDone || isCurrent
                      ? 'bg-primary-600 text-white'
                      : isPast
                        ? 'bg-neutral-300 text-neutral-500'
                        : 'bg-neutral-100 text-neutral-400'
                  } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`whitespace-nowrap text-xs ${isCurrent ? 'font-semibold text-primary-700' : isDone ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    {step.label}
                  </span>
                </button>
                {i < statutWorkflow.length - 1 && (
                  <div className={`mx-1 h-px w-6 ${i < currentStatutIndex ? 'bg-primary-500' : 'bg-neutral-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        {signalement.statut === 'cloture' && signalement.motif_cloture && (
          <p className="mt-3 text-sm text-neutral-500">Motif de clôture: {signalement.motif_cloture}</p>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button onClick={() => setShowAssignModal(true)} className="btn-secondary">
            <User size={16} /> Attribution
          </button>
          {canCreateLinked && !signalement.animal_id && (
            <button onClick={() => setShowLinkedModal(true)} className="btn-primary">
              <Link2 size={16} /> Créer les dossiers liés
            </button>
          )}
          {signalement.statut !== 'cloture' && signalement.statut !== 'sans_suite' && (
            <button onClick={() => handleStatutChange('sans_suite')} className="btn-ghost text-neutral-500">
              Sans suite
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {[
          { id: 'timeline' as const, label: 'Timeline', icon: Activity, count: events.length },
          { id: 'comments' as const, label: 'Commentaires', icon: MessageSquare, count: comments.length },
          { id: 'photos' as const, label: 'Photos', icon: FileText, count: photos.length },
          { id: 'details' as const, label: 'Détails', icon: Eye, count: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count > 0 && <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="card p-6">
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">Aucun événement enregistré.</p>
            ) : (
              <div className="space-y-1">
                {events.map((evt, i) => {
                  const Icon = eventIcons[evt.type] ?? Activity;
                  const isAlert = evt.type === 'alerte';
                  return (
                    <div key={evt.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isAlert ? 'bg-error-50 text-error-600' : 'bg-primary-50 text-primary-600'
                        }`}>
                          <Icon size={18} />
                        </div>
                        {i < events.length - 1 && <div className="w-px flex-1 bg-neutral-200" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-neutral-900">{evt.titre}</p>
                        {evt.description && <p className="text-sm text-neutral-500">{evt.description}</p>}
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {formatDateTime(evt.created_at)}
                          {evt.auteur?.full_name && ` · ${evt.auteur.full_name}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* COMMENTS */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {canEdit && (
              <div className="card p-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Ajouter un commentaire interne (visible par les bénévoles uniquement)..."
                  className="input"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || savingComment}
                    className="btn-primary"
                  >
                    {savingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Publier
                  </button>
                </div>
              </div>
            )}
            {comments.length === 0 ? (
              <div className="card p-6 text-center">
                <MessageSquare size={32} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-sm text-neutral-500">Aucun commentaire pour le moment.</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                        <User size={16} />
                      </div>
                      {c.auteur?.full_name ?? 'Utilisateur'}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDateTime(c.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">{c.contenu}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* PHOTOS */}
        {activeTab === 'photos' && (
          <div>
            {photos.length === 0 ? (
              <div className="card p-6 text-center">
                <FileText size={32} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-sm text-neutral-500">Aucune photo pour ce signalement.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((p) => (
                  <div key={p.id} className="card overflow-hidden">
                    {p.type_media === 'video' ? (
                      <video src={p.url} controls className="h-40 w-full object-cover" />
                    ) : (
                      <img src={p.url} alt={p.description ?? ''} className="h-40 w-full object-cover" />
                    )}
                    {p.description && <p className="p-2 text-xs text-neutral-500">{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DETAILS */}
        {activeTab === 'details' && (
          <div className="card p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField icon={User} label="Déclarant" value={`${signalement.declarant_prenom ?? ''} ${signalement.declarant_nom}`} />
              <DetailField icon={Phone} label="Téléphone" value={signalement.declarant_telephone} />
              <DetailField icon={Mail} label="Email" value={signalement.declarant_email} />
              <DetailField icon={MapPin} label="Lieu" value={signalement.lieu_signalement} />
              <DetailField icon={Flag} label="Motif" value={signalement.motif} />
              <DetailField icon={Calendar} label="Date du signalement" value={formatDate(signalement.date_signalement)} />
              {signalement.date_prevue_traitement && (
                <DetailField icon={Calendar} label="Date prévue" value={formatDate(signalement.date_prevue_traitement)} />
              )}
              {(signalement.transmission_ddpp || signalement.transmission_police || signalement.transmission_gendarmerie) && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase text-neutral-400">Transmissions</p>
                  <div className="mt-1 flex gap-2">
                    {signalement.transmission_ddpp && <Badge className="bg-accent-100 text-accent-800">DDPP</Badge>}
                    {signalement.transmission_police && <Badge className="bg-accent-100 text-accent-800">Police</Badge>}
                    {signalement.transmission_gendarmerie && <Badge className="bg-accent-100 text-accent-800">Gendarmerie</Badge>}
                  </div>
                </div>
              )}
              {signalement.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase text-neutral-400">Description</p>
                  <p className="mt-1 text-sm text-neutral-700">{signalement.description}</p>
                </div>
              )}
              {signalement.animal_id && signalement.animal && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase text-neutral-400">Animal associé</p>
                  <Link to={`/animaux/${signalement.animal_id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
                    <ChevronRight size={14} /> {signalement.animal.nom}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Attribution du signalement" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Enquêteur</label>
            <select value={assignForm.enqueteur_id} onChange={(e) => setAssignForm({ ...assignForm, enqueteur_id: e.target.value })} className="input">
              <option value="">— Aucun —</option>
              {enqueteurs.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Responsable de dossier</label>
            <select value={assignForm.responsable_id} onChange={(e) => setAssignForm({ ...assignForm, responsable_id: e.target.value })} className="input">
              <option value="">— Aucun —</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date prévue de traitement</label>
              <input
                type="date"
                value={assignForm.date_prevue_traitement}
                onChange={(e) => setAssignForm({ ...assignForm, date_prevue_traitement: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Priorité (1-5)</label>
              <select
                value={assignForm.priorite}
                onChange={(e) => setAssignForm({ ...assignForm, priorite: Number(e.target.value) })}
                className="input"
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowAssignModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleAssign} className="btn-primary">Enregistrer</button>
          </div>
        </div>
      </Modal>

      {/* Linked Dossiers Modal */}
      <Modal open={showLinkedModal} onClose={() => setShowLinkedModal(false)} title="Créer les dossiers liés" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Créez automatiquement tous les dossiers nécessaires en une seule opération.
            Les informations du signalement (espèce, description, photos, localisation) seront pré-remplies dans chaque dossier.
          </p>
          {linkedError && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{linkedError}</div>
          )}
          <div className="space-y-2">
            <LinkedCheckbox
              checked={linkedChoices.create_animal}
              onChange={(v) => setLinkedChoices({ ...linkedChoices, create_animal: v })}
              icon={Package}
              label="Créer une fiche animal"
              description="Crée la fiche avec espèce, description, photo et lieu pré-remplis"
            />
            <LinkedCheckbox
              checked={linkedChoices.create_justice}
              onChange={(v) => setLinkedChoices({ ...linkedChoices, create_justice: v })}
              icon={Scale}
              label="Ouvrir un dossier Justice"
              description="Réquisition/plainte avec résumé des faits pré-rempli"
            />
            <LinkedCheckbox
              checked={linkedChoices.create_veterinaire}
              onChange={(v) => setLinkedChoices({ ...linkedChoices, create_veterinaire: v })}
              icon={Stethoscope}
              label="Créer un dossier vétérinaire"
              description="Visite d'évaluation programmée automatiquement"
            />
            <LinkedCheckbox
              checked={linkedChoices.create_famille_accueil}
              onChange={(v) => setLinkedChoices({ ...linkedChoices, create_famille_accueil: v })}
              icon={Home}
              label="Lancer une recherche de famille d'accueil"
              description="Place l'animal en file d'attente pour une famille d'accueil"
            />
            <LinkedCheckbox
              checked={linkedChoices.create_transport}
              onChange={(v) => setLinkedChoices({ ...linkedChoices, create_transport: v })}
              icon={Truck}
              label="Créer un transport"
              description="Transport planifié depuis le lieu du signalement"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowLinkedModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleCreateLinked} disabled={creatingLinked} className="btn-primary">
              {creatingLinked ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              Créer les dossiers
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
        <Icon size={14} /> {label}
      </div>
      <p className="mt-1 text-sm text-neutral-900">{value || '—'}</p>
    </div>
  );
}

function LinkedCheckbox({
  checked, onChange, icon: Icon, label, description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Activity;
  label: string;
  description: string;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
      checked ? 'border-primary-300 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
      />
      <Icon size={20} className={checked ? 'text-primary-600' : 'text-neutral-400'} />
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
    </label>
  );
}
