import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Home, MapPin, User, Dog, Package, Star,
  Loader2, Save, Plus, Trash2, CheckCircle2, XCircle,
  Camera, FileText, Award, Users, Brain, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Badge, LoadingSpinner, Modal } from '../components/ui';
import {
  formatDate, formatDateTime, daysBetween,
  faDisponibiliteLabels, faDisponibiliteColors,
  faReportStatutLabels, faReportStatutColors,
  faEvaluationCriteria, faMaterielEtatLabels, faMaterielEtatColors,
  especeLabels,
} from '../lib/constants';
import type {
  FamilleAccueil, FaDisponibilite, FaMateriel, FaEvaluation, FaDecision,
  FaReport, FaComportementSession, Animal, Profile,
} from '../types';

type Tab = 'identite' | 'capacites' | 'conditions' | 'animaux' | 'materiel' | 'reports' | 'comportement' | 'evaluation' | 'decisions';

interface FaAnimalLink {
  id: string;
  animal_id: string;
  statut: 'prevu' | 'en_cours' | 'termine';
  date_debut?: string;
  date_fin?: string;
  motif_fin?: string;
  animal: Animal;
}

export function FamilleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [famille, setFamille] = useState<FamilleAccueil | null>(null);
  const [animals, setAnimals] = useState<FaAnimalLink[]>([]);
  const [materiels, setMateriels] = useState<FaMateriel[]>([]);
  const [evaluations, setEvaluations] = useState<FaEvaluation[]>([]);
  const [reports, setReports] = useState<FaReport[]>([]);
  const [comportementSessions, setComportementSessions] = useState<FaComportementSession[]>([]);
  const [decisions, setDecisions] = useState<FaDecision[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('identite');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Modals
  const [showMaterielModal, setShowMaterielModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showComportementModal, setShowComportementModal] = useState(false);

  const [editForm, setEditForm] = useState<Partial<FamilleAccueil>>({});
  const [materielForm, setMaterielForm] = useState({ type_materiel: '', date_remise: new Date().toISOString().split('T')[0], date_restitution_prevue: '', etat_retour: '', commentaire: '' });
  const [evalForm, setEvalForm] = useState<Record<string, number>>({});
  const [evalCommentaire, setEvalCommentaire] = useState('');
  const [decisionForm, setDecisionForm] = useState({ pre_visite_realisee: false, pre_visite_date: '', pre_visite_compte_rendu: '', avis_commentaire: '' });
  const [reportForm, setReportForm] = useState({ animal_id: '', commentaire: '', poids: '', alimentation: '', observations_sante: '', observations_comportement: '' });
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [comportementForm, setComportementForm] = useState({ animal_id: '', educateur_id: '', date_session: new Date().toISOString().split('T')[0], type_session: '', conseils: '', progres_constates: '', bilan_final: false, compte_rendu: '' });

  const canEdit = hasPermission('familles_accueil');
  const canEvaluate = hasPermission('familles_accueil') && (hasPermission('acces_total') || hasPermission('administration'));
  const canManageComportement = hasPermission('comportement') || hasPermission('acces_total');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [famRes, animRes, matRes, evalRes, repRes, compRes, decRes, profRes] = await Promise.all([
      supabase.from('famille_accueils').select('*').eq('id', id).maybeSingle(),
      supabase.from('famille_accueil_animaux').select('id, animal_id, statut, date_debut, date_fin, motif_fin, animal:animals(*)').eq('famille_accueil_id', id).order('created_at', { ascending: false }),
      supabase.from('fa_materiel').select('*').eq('famille_accueil_id', id).order('date_remise', { ascending: false }),
      supabase.from('fa_evaluations').select('*, evaluateur:profiles!evaluateur_id(id,full_name), animal:animals(id,nom)').eq('famille_accueil_id', id).order('date_evaluation', { ascending: false }),
      supabase.from('fa_reports').select('*, auteur:profiles!auteur_id(id,full_name), animal:animals(id,nom,espece), validateur:profiles!validateur_id(id,full_name)').eq('famille_accueil_id', id).order('created_at', { ascending: false }),
      supabase.from('fa_comportement_sessions').select('*, educateur:profiles!educateur_id(id,full_name), animal:animals(id,nom)').eq('famille_accueil_id', id).order('date_session', { ascending: false }),
      supabase.from('fa_decisions').select('*, animal:animals(id,nom)').eq('famille_accueil_id', id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('active', true).order('full_name'),
    ]);
    if (famRes.data) { setFamille(famRes.data as FamilleAccueil); setEditForm(famRes.data as FamilleAccueil); }
    if (animRes.data) setAnimals(animRes.data as unknown as FaAnimalLink[]);
    if (matRes.data) setMateriels(matRes.data as FaMateriel[]);
    if (evalRes.data) setEvaluations(evalRes.data as unknown as FaEvaluation[]);
    if (repRes.data) setReports(repRes.data as unknown as FaReport[]);
    if (compRes.data) setComportementSessions(compRes.data as unknown as FaComportementSession[]);
    if (decRes.data) setDecisions(decRes.data as unknown as FaDecision[]);
    if (profRes.data) setProfiles(profRes.data as Profile[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalCapacite = ((famille?.capacite_chiens ?? 0) + (famille?.capacite_chats ?? 0) + (famille?.capacite_nac ?? 0)) || (famille?.capacite_max ?? 0);
  const placesRestantes = Math.max(0, totalCapacite - (famille?.animaux_actuels ?? 0));
  const enCours = animals.filter((a) => a.statut === 'en_cours');
  const historique = animals.filter((a) => a.statut === 'termine');
  const prevus = animals.filter((a) => a.statut === 'prevu');

  const handleSave = async () => {
    if (!famille || !id) return;
    setSaving(true);
    const { error } = await supabase.from('famille_accueils').update(editForm).eq('id', id);
    if (!error) { setFamille({ ...famille, ...editForm } as FamilleAccueil); setEditMode(false); }
    setSaving(false);
  };

  const handleAddMateriel = async () => {
    if (!id || !materielForm.type_materiel) return;
    await supabase.from('fa_materiel').insert({ ...materielForm, famille_accueil_id: id, date_restitution_prevue: materielForm.date_restitution_prevue || null, etat_retour: materielForm.etat_retour || null });
    setShowMaterielModal(false);
    setMaterielForm({ type_materiel: '', date_remise: new Date().toISOString().split('T')[0], date_restitution_prevue: '', etat_retour: '', commentaire: '' });
    loadData();
  };

  const handleReturnMateriel = async (matId: string, etat: string) => {
    await supabase.from('fa_materiel').update({ date_restitution_reelle: new Date().toISOString().split('T')[0], etat_retour: etat }).eq('id', matId);
    loadData();
  };

  const handleDeleteMateriel = async (matId: string) => {
    await supabase.from('fa_materiel').delete().eq('id', matId);
    loadData();
  };

  const handleAddEvaluation = async () => {
    if (!id) return;
    await supabase.from('fa_evaluations').insert({
      famille_accueil_id: id,
      evaluateur_id: user?.id,
      notes: evalForm,
      commentaire: evalCommentaire || null,
    });
    setShowEvalModal(false);
    setEvalForm({});
    setEvalCommentaire('');
    loadData();
  };

  const handleAddDecision = async () => {
    if (!id) return;
    const newAvis = {
      responsable_id: user?.id ?? '',
      responsable_nom: profiles.find((p) => p.id === user?.id)?.full_name ?? 'Inconnu',
      avis: 'en_attente' as const,
      commentaire: decisionForm.avis_commentaire || undefined,
      date: new Date().toISOString(),
    };
    // Check if there's already a decision
    if (decisions.length === 0) {
      await supabase.from('fa_decisions').insert({
        famille_accueil_id: id,
        pre_visite_realisee: decisionForm.pre_visite_realisee,
        pre_visite_date: decisionForm.pre_visite_date || null,
        pre_visite_compte_rendu: decisionForm.pre_visite_compte_rendu || null,
        avis: [newAvis],
        statut_vote: 'en_attente',
      });
    } else {
      const existing = decisions[0];
      const updatedAvis = [...(existing.avis ?? []), newAvis];
      await supabase.from('fa_decisions').update({ avis: updatedAvis, pre_visite_realisee: decisionForm.pre_visite_realisee || existing.pre_visite_realisee, pre_visite_date: decisionForm.pre_visite_date || existing.pre_visite_date, pre_visite_compte_rendu: decisionForm.pre_visite_compte_rendu || existing.pre_visite_compte_rendu }).eq('id', existing.id);
    }
    setShowDecisionModal(false);
    setDecisionForm({ pre_visite_realisee: false, pre_visite_date: '', pre_visite_compte_rendu: '', avis_commentaire: '' });
    loadData();
  };

  const handleVote = async (decisionId: string, vote: 'valide' | 'refuse') => {
    const decision = decisions.find((d) => d.id === decisionId);
    if (!decision) return;
    const updatedAvis = (decision.avis ?? []).map((a) =>
      a.responsable_id === user?.id ? { ...a, avis: vote, date: new Date().toISOString() } : a,
    );
    // If no existing avis for this user, add one
    if (!updatedAvis.find((a) => a.responsable_id === user?.id)) {
      updatedAvis.push({ responsable_id: user?.id ?? '', responsable_nom: profiles.find((p) => p.id === user?.id)?.full_name ?? 'Inconnu', avis: vote, date: new Date().toISOString() });
    }
    const allValide = updatedAvis.every((a) => a.avis === 'valide');
    const anyRefuse = updatedAvis.some((a) => a.avis === 'refuse');
    const newStatut = anyRefuse ? 'refuse' : allValide && updatedAvis.length > 0 ? 'valide' : 'en_attente';
    await supabase.from('fa_decisions').update({ avis: updatedAvis, statut_vote: newStatut }).eq('id', decisionId);
    loadData();
  };

  const handleValidateReport = async (reportId: string, valide: boolean, commentaire?: string) => {
    const statut = valide ? 'valide' : 'correction_demandee';
    await supabase.from('fa_reports').update({
      statut, validateur_id: user?.id, date_validation: new Date().toISOString(), commentaire_validation: commentaire ?? null,
    }).eq('id', reportId);

    // If validated, integrate into animal's record
    if (valide) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        // Update animal sante_notes and comportement
        const updates: Record<string, string> = {};
        if (report.observations_sante) updates.sante_notes = report.observations_sante;
        if (report.observations_comportement) updates.comportement = report.observations_comportement;
        if (Object.keys(updates).length > 0) {
          await supabase.from('animals').update(updates).eq('id', report.animal_id);
        }
        // Add photos to documents
        if (report.photos.length > 0) {
          const docRecords = report.photos.map((url) => ({
            animal_id: report.animal_id,
            module: 'animal' as const,
            type_document: 'photo' as const,
            nom_fichier: `Suivi FA ${formatDate(report.created_at)}`,
            url,
          }));
          await supabase.from('documents').insert(docRecords);
        }
      }
    }
    loadData();
  };

  const handleAddReport = async () => {
    if (!id || !reportForm.animal_id) return;
    await supabase.from('fa_reports').insert({
      famille_accueil_id: id,
      animal_id: reportForm.animal_id,
      auteur_id: user?.id,
      photos: reportPhotos,
      videos: [],
      commentaire: reportForm.commentaire || null,
      poids: reportForm.poids || null,
      alimentation: reportForm.alimentation || null,
      observations_sante: reportForm.observations_sante || null,
      observations_comportement: reportForm.observations_comportement || null,
      statut: 'soumis',
    });
    setShowReportModal(false);
    setReportForm({ animal_id: '', commentaire: '', poids: '', alimentation: '', observations_sante: '', observations_comportement: '' });
    setReportPhotos([]);
    loadData();
  };

  const handleAddComportement = async () => {
    if (!id || !comportementForm.animal_id) return;
    await supabase.from('fa_comportement_sessions').insert({
      famille_accueil_id: id,
      animal_id: comportementForm.animal_id,
      educateur_id: comportementForm.educateur_id || null,
      date_session: comportementForm.date_session,
      type_session: comportementForm.type_session || null,
      conseils: comportementForm.conseils || null,
      progres_constates: comportementForm.progres_constates || null,
      bilan_final: comportementForm.bilan_final,
      compte_rendu: comportementForm.compte_rendu || null,
    });
    setShowComportementModal(false);
    setComportementForm({ animal_id: '', educateur_id: '', date_session: new Date().toISOString().split('T')[0], type_session: '', conseils: '', progres_constates: '', bilan_final: false, compte_rendu: '' });
    loadData();
  };

  const handleReportPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('fa-reports').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (!error) {
        const { data } = supabase.storage.from('fa-reports').getPublicUrl(fileName);
        urls.push(data.publicUrl);
      }
    }
    setReportPhotos((prev) => [...prev, ...urls]);
  };

  if (loading) return <LoadingSpinner />;
  if (!famille) {
    return (
      <div className="py-12 text-center">
        <p className="text-neutral-500">Famille d'accueil introuvable.</p>
        <Link to="/familles-accueil" className="mt-2 inline-block text-primary-600 hover:underline">Retour à la liste</Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'identite', label: 'Identité', icon: User },
    { id: 'capacites', label: 'Capacités', icon: Home },
    { id: 'conditions', label: 'Conditions', icon: Home },
    { id: 'animaux', label: `Animaux (${animals.length})`, icon: Dog },
    { id: 'materiel', label: `Matériel (${materiels.length})`, icon: Package },
    { id: 'reports', label: `Suivi (${reports.filter((r) => r.statut === 'soumis').length})`, icon: FileText },
    { id: 'comportement', label: 'Comportement', icon: Brain },
    ...(canEvaluate ? [{ id: 'evaluation' as Tab, label: 'Évaluation', icon: Star }] : []),
    { id: 'decisions', label: 'Décisions', icon: Users },
  ];

  return (
    <div>
      <button onClick={() => navigate('/familles-accueil')} className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-neutral-900">{famille.prenom} {famille.nom}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
              <MapPin size={14} />
              {famille.adresse}{famille.code_postal && `, ${famille.code_postal}`}{famille.ville && ` ${famille.ville}`}{famille.departement && ` (${famille.departement})`}
            </p>
            {famille.date_entree_association && (
              <p className="mt-0.5 text-xs text-neutral-400">Dans l'association depuis le {formatDate(famille.date_entree_association)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={faDisponibiliteColors[(famille.statut_disponibilite ?? 'disponible') as FaDisponibilite]}>
              {faDisponibiliteLabels[(famille.statut_disponibilite ?? 'disponible') as FaDisponibilite]}
            </Badge>
            {famille.contrat_actif ? <Badge className="bg-success-100 text-success-700">Contrat actif</Badge> : <Badge className="bg-neutral-100 text-neutral-500">Inactif</Badge>}
          </div>
        </div>

        {/* Disponibilités + places restantes */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-400">Places restantes</p>
            <p className={`mt-1 text-lg font-bold ${placesRestantes > 0 ? 'text-success-700' : 'text-error-600'}`}>{placesRestantes} / {totalCapacite}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-400">En cours</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{enCours.length}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-400">Historique</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{historique.length}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-400">Évaluation moy.</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">
              {evaluations.length > 0 ? (evaluations.reduce((sum, e) => sum + Object.values(e.notes).reduce((s, v) => s + v, 0) / Object.keys(e.notes).length, 0) / evaluations.length).toFixed(1) : '—'}
            </p>
          </div>
        </div>

        {famille.date_fin_indisponibilite && famille.statut_disponibilite !== 'disponible' && (
          <p className="mt-2 text-xs text-neutral-500">Disponibilité reprise le {formatDate(famille.date_fin_indisponibilite)}</p>
        )}
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
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {/* IDENTITÉ */}
        {activeTab === 'identite' && (
          <div className="card p-6">
            {canEdit && (
              <div className="mb-4 flex justify-end gap-2">
                {editMode ? (
                  <>
                    <button onClick={() => { setEditMode(false); setEditForm(famille); }} className="btn-secondary">Annuler</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(true)} className="btn-secondary">Modifier</button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nom" value={famille.nom} edit={editMode} editValue={editForm.nom ?? ''} onChange={(v) => setEditForm({ ...editForm, nom: v })} />
              <Field label="Prénom" value={famille.prenom} edit={editMode} editValue={editForm.prenom ?? ''} onChange={(v) => setEditForm({ ...editForm, prenom: v })} />
              <Field label="Téléphone" value={famille.telephone} edit={editMode} editValue={editForm.telephone ?? ''} onChange={(v) => setEditForm({ ...editForm, telephone: v })} />
              <Field label="Email" value={famille.email} edit={editMode} editValue={editForm.email ?? ''} onChange={(v) => setEditForm({ ...editForm, email: v })} />
              <Field label="Adresse" value={famille.adresse} edit={editMode} editValue={editForm.adresse ?? ''} onChange={(v) => setEditForm({ ...editForm, adresse: v })} />
              <Field label="Code postal" value={famille.code_postal} edit={editMode} editValue={editForm.code_postal ?? ''} onChange={(v) => setEditForm({ ...editForm, code_postal: v })} />
              <Field label="Ville" value={famille.ville} edit={editMode} editValue={editForm.ville ?? ''} onChange={(v) => setEditForm({ ...editForm, ville: v })} />
              <Field label="Département" value={famille.departement} edit={editMode} editValue={editForm.departement ?? ''} onChange={(v) => setEditForm({ ...editForm, departement: v })} />
              <Field label="Profession" value={famille.profession} edit={editMode} editValue={editForm.profession ?? ''} onChange={(v) => setEditForm({ ...editForm, profession: v })} />
              <Field label="Date de naissance" value={formatDate(famille.date_naissance)} edit={editMode} editType="date" editValue={editForm.date_naissance ?? ''} onChange={(v) => setEditForm({ ...editForm, date_naissance: v })} />
              <Field label="Date d'entrée" value={formatDate(famille.date_entree_association)} edit={editMode} editType="date" editValue={editForm.date_entree_association ?? ''} onChange={(v) => setEditForm({ ...editForm, date_entree_association: v })} />
            </div>
            {famille.notes && <div className="mt-4"><p className="text-xs font-medium uppercase text-neutral-400">Notes</p><p className="mt-1 text-sm text-neutral-700">{famille.notes}</p></div>}
          </div>
        )}

        {/* CAPACITÉS */}
        {activeTab === 'capacites' && (
          <div className="card p-6">
            {canEdit && <div className="mb-4 flex justify-end"><button onClick={() => setEditMode(!editMode)} className="btn-secondary">{editMode ? 'Terminer' : 'Modifier'}</button></div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField label="Max chiens" value={famille.capacite_chiens ?? 0} edit={editMode} onChange={(v) => setEditForm({ ...editForm, capacite_chiens: v })} />
              <NumberField label="Max chats" value={famille.capacite_chats ?? 0} edit={editMode} onChange={(v) => setEditForm({ ...editForm, capacite_chats: v })} />
              <NumberField label="Max NAC" value={famille.capacite_nac ?? 0} edit={editMode} onChange={(v) => setEditForm({ ...editForm, capacite_nac: v })} />
            </div>
            <h4 className="mb-3 mt-6 text-sm font-semibold uppercase text-neutral-500">Types d'accueil acceptés</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([
                { key: 'accueil_chiots', label: 'Chiots' },
                { key: 'accueil_seniors', label: 'Seniors' },
                { key: 'accueil_handicapes', label: 'Animaux handicapés' },
                { key: 'accueil_categorises', label: 'Animaux catégorisés' },
                { key: 'accueil_femelles_gestantes', label: 'Femelles gestantes' },
                { key: 'accueil_urgences', label: 'Urgences' },
                { key: 'accueil_requisitions', label: 'Réquisitions judiciaires' },
              ] as const).map((item) => {
                const checked = editMode ? (editForm[item.key] as boolean) ?? false : (famille[item.key] as boolean) ?? false;
                return (
                  <label key={item.key} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${checked ? 'border-primary-300 bg-primary-50' : 'border-neutral-200'}`}>
                    <input type="checkbox" disabled={!editMode} checked={checked} onChange={(e) => setEditForm({ ...editForm, [item.key]: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-neutral-900">{item.label}</span>
                  </label>
                );
              })}
            </div>
            {editMode && <div className="mt-4 flex justify-end"><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</button></div>}
          </div>
        )}

        {/* CONDITIONS */}
        {activeTab === 'conditions' && (
          <div className="card p-6">
            {canEdit && <div className="mb-4 flex justify-end"><button onClick={() => setEditMode(!editMode)} className="btn-secondary">{editMode ? 'Terminer' : 'Modifier'}</button></div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Type de logement</label>
                {editMode ? (
                  <select value={editForm.type_logement ?? ''} onChange={(e) => setEditForm({ ...editForm, type_logement: e.target.value })} className="input">
                    <option value="">—</option>
                    <option value="maison">Maison</option>
                    <option value="appartement">Appartement</option>
                  </select>
                ) : <p className="mt-1 text-sm text-neutral-900">{famille.type_logement === 'maison' ? 'Maison' : famille.type_logement === 'appartement' ? 'Appartement' : '—'}</p>}
              </div>
              <div>
                <label className="label">Jardin clôturé</label>
                {editMode ? (
                  <select value={editForm.jardin_cloture === null ? '' : editForm.jardin_cloture ? 'true' : 'false'} onChange={(e) => setEditForm({ ...editForm, jardin_cloture: e.target.value === 'true' })} className="input">
                    <option value="">—</option><option value="true">Oui</option><option value="false">Non</option>
                  </select>
                ) : <p className="mt-1 text-sm text-neutral-900">{famille.jardin_cloture == null ? '—' : famille.jardin_cloture ? 'Oui' : 'Non'}</p>}
              </div>
              <NumberField label="Nombre d'adultes" value={famille.nb_adultes ?? 0} edit={editMode} onChange={(v) => setEditForm({ ...editForm, nb_adultes: v })} />
              <NumberField label="Nombre d'enfants" value={famille.nb_enfants ?? 0} edit={editMode} onChange={(v) => setEditForm({ ...editForm, nb_enfants: v })} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                { key: 'presence_escaliers', label: 'Présence d\'escaliers' },
                { key: 'presence_ascenseur', label: 'Présence d\'ascenseur' },
                { key: 'autres_animaux', label: 'Autres animaux au foyer' },
                { key: 'fumeurs', label: 'Fumeurs' },
              ] as const).map((item) => {
                const checked = editMode ? (editForm[item.key] as boolean) ?? false : (famille[item.key] as boolean) ?? false;
                return (
                  <label key={item.key} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${checked ? 'border-primary-300 bg-primary-50' : 'border-neutral-200'}`}>
                    <input type="checkbox" disabled={!editMode} checked={checked} onChange={(e) => setEditForm({ ...editForm, [item.key]: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-neutral-900">{item.label}</span>
                  </label>
                );
              })}
            </div>
            {editMode && <div className="mt-4 flex justify-end"><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</button></div>}
          </div>
        )}

        {/* ANIMAUX */}
        {activeTab === 'animaux' && (
          <div className="space-y-6">
            {enCours.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-neutral-500">Actuellement accueillis ({enCours.length})</h3>
                {enCours.map((fa) => <AnimalRow key={fa.id} fa={fa} />)}
              </div>
            )}
            {prevus.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-neutral-500">Arrivées prévues ({prevus.length})</h3>
                {prevus.map((fa) => <AnimalRow key={fa.id} fa={fa} />)}
              </div>
            )}
            {historique.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase text-neutral-500">Historique ({historique.length})</h3>
                {historique.map((fa) => <AnimalRow key={fa.id} fa={fa} />)}
              </div>
            )}
            {animals.length === 0 && <div className="card p-6 text-center"><Dog size={32} className="mx-auto mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">Aucun animal accueilli pour le moment.</p></div>}
          </div>
        )}

        {/* MATÉRIEL */}
        {activeTab === 'materiel' && (
          <div>
            <div className="mb-4 flex justify-end">
              {canEdit && <button onClick={() => setShowMaterielModal(true)} className="btn-primary"><Plus size={16} /> Ajouter du matériel</button>}
            </div>
            {materiels.length === 0 ? (
              <div className="card p-6 text-center"><Package size={32} className="mx-auto mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">Aucun matériel enregistré.</p></div>
            ) : (
              <div className="space-y-2">
                {materiels.map((m) => {
                  const isLate = !m.date_restitution_reelle && m.date_restitution_prevue && new Date(m.date_restitution_prevue) < new Date();
                  return (
                    <div key={m.id} className={`card flex items-center gap-4 p-4 ${isLate ? 'border-error-300 bg-error-50' : ''}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100"><Package size={20} className="text-neutral-500" /></div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{m.type_materiel}</p>
                        <p className="text-xs text-neutral-500">
                          Remis le {formatDate(m.date_remise)}
                          {m.date_restitution_prevue && ` · Restitution prévue: ${formatDate(m.date_restitution_prevue)}`}
                          {m.date_restitution_reelle && ` · Rendu le ${formatDate(m.date_restitution_reelle)}`}
                        </p>
                        {m.commentaire && <p className="mt-1 text-xs text-neutral-400">{m.commentaire}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {m.etat_retour && <Badge className={faMaterielEtatColors[m.etat_retour] ?? 'bg-neutral-100 text-neutral-600'}>{faMaterielEtatLabels[m.etat_retour] ?? m.etat_retour}</Badge>}
                        {isLate && <Badge className="bg-error-100 text-error-700"><AlertTriangle size={12} /> En retard</Badge>}
                        {!m.date_restitution_reelle && canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => handleReturnMateriel(m.id, 'bon_etat')} className="rounded bg-success-100 px-2 py-1 text-xs text-success-700 hover:bg-success-200">Bon état</button>
                            <button onClick={() => handleReturnMateriel(m.id, 'abime')} className="rounded bg-warning-100 px-2 py-1 text-xs text-warning-700 hover:bg-warning-200">Abîmé</button>
                            <button onClick={() => handleReturnMateriel(m.id, 'perdu')} className="rounded bg-error-100 px-2 py-1 text-xs text-error-700 hover:bg-error-200">Perdu</button>
                          </div>
                        )}
                        {canEdit && <button onClick={() => handleDeleteMateriel(m.id)} className="rounded p-1 text-neutral-400 hover:text-error-600"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REPORTS (suivi hebdomadaire) */}
        {activeTab === 'reports' && (
          <div>
            <div className="mb-4 flex justify-end">
              {canEdit && <button onClick={() => setShowReportModal(true)} className="btn-primary"><Plus size={16} /> Nouveau compte-rendu</button>}
            </div>
            {reports.length === 0 ? (
              <div className="card p-6 text-center"><FileText size={32} className="mx-auto mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">Aucun compte-rendu de suivi.</p></div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><FileText size={20} /></div>
                        <div>
                          <p className="font-medium text-neutral-900">{r.animal?.nom ?? 'Animal'}</p>
                          <p className="text-xs text-neutral-500">Soumis le {formatDateTime(r.created_at)}{r.auteur?.full_name ? ` par ${r.auteur.full_name}` : ''}</p>
                        </div>
                      </div>
                      <Badge className={faReportStatutColors[r.statut]}>{faReportStatutLabels[r.statut]}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      {r.poids && <p><span className="font-medium text-neutral-500">Poids:</span> {r.poids}</p>}
                      {r.alimentation && <p><span className="font-medium text-neutral-500">Alimentation:</span> {r.alimentation}</p>}
                      {r.observations_sante && <p><span className="font-medium text-neutral-500">Santé:</span> {r.observations_sante}</p>}
                      {r.observations_comportement && <p><span className="font-medium text-neutral-500">Comportement:</span> {r.observations_comportement}</p>}
                    </div>
                    {r.commentaire && <p className="mt-2 text-sm text-neutral-700">{r.commentaire}</p>}
                    {r.photos.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {r.photos.map((url, i) => <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />)}
                      </div>
                    )}
                    {r.statut === 'soumis' && canEdit && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleValidateReport(r.id, true)} className="btn-primary bg-success-600 hover:bg-success-700"><CheckCircle2 size={16} /> Valider</button>
                        <button onClick={() => handleValidateReport(r.id, false)} className="btn-secondary text-error-600 hover:bg-error-50"><XCircle size={16} /> Demander correction</button>
                      </div>
                    )}
                    {r.commentaire_validation && <p className="mt-2 text-xs text-neutral-500">Validation: {r.commentaire_validation}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPORTEMENT */}
        {activeTab === 'comportement' && (
          <div>
            <div className="mb-4 flex justify-end">
              {canManageComportement && <button onClick={() => setShowComportementModal(true)} className="btn-primary"><Plus size={16} /> Ajouter une séance</button>}
            </div>
            {comportementSessions.length === 0 ? (
              <div className="card p-6 text-center"><Brain size={32} className="mx-auto mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">Aucune séance comportementale enregistrée.</p></div>
            ) : (
              <div className="space-y-3">
                {comportementSessions.map((s) => (
                  <div key={s.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50 text-warning-600"><Brain size={20} /></div>
                        <div>
                          <p className="font-medium text-neutral-900">{s.animal?.nom ?? 'Animal'} — {s.type_session ?? 'Séance'}</p>
                          <p className="text-xs text-neutral-500">{formatDate(s.date_session)}{s.educateur?.full_name ? ` · ${s.educateur.full_name}` : ''}</p>
                        </div>
                      </div>
                      {s.bilan_final && <Badge className="bg-accent-100 text-accent-700"><Award size={12} /> Bilan final</Badge>}
                    </div>
                    {s.conseils && <p className="mt-2 text-sm text-neutral-700"><span className="font-medium">Conseils:</span> {s.conseils}</p>}
                    {s.progres_constates && <p className="mt-1 text-sm text-neutral-700"><span className="font-medium">Progrès:</span> {s.progres_constates}</p>}
                    {s.compte_rendu && <p className="mt-1 text-sm text-neutral-600">{s.compte_rendu}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ÉVALUATION */}
        {activeTab === 'evaluation' && canEvaluate && (
          <div>
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowEvalModal(true)} className="btn-primary"><Plus size={16} /> Nouvelle évaluation</button>
            </div>
            {evaluations.length === 0 ? (
              <div className="card p-6 text-center"><Star size={32} className="mx-auto mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">Aucune évaluation pour le moment.</p></div>
            ) : (
              <div className="space-y-3">
                {evaluations.map((ev) => (
                  <div key={ev.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-neutral-900">{formatDate(ev.date_evaluation)}{ev.evaluateur?.full_name ? ` · ${ev.evaluateur.full_name}` : ''}</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} className={i < Math.round(Object.values(ev.notes).reduce((s, v) => s + v, 0) / Object.keys(ev.notes).length) ? 'fill-warning-400 text-warning-400' : 'text-neutral-200'} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {faEvaluationCriteria.map((c) => (
                        <div key={c.key} className="rounded bg-neutral-50 p-2">
                          <p className="text-xs text-neutral-500">{c.label}</p>
                          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < (ev.notes[c.key] ?? 0) ? 'fill-warning-400 text-warning-400' : 'text-neutral-200'} />)}</div>
                        </div>
                      ))}
                    </div>
                    {ev.commentaire && <p className="mt-2 text-sm text-neutral-700">{ev.commentaire}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 rounded-lg bg-warning-50 p-3 text-xs text-warning-700">
              <AlertTriangle size={14} className="inline mr-1" />
              Les évaluations sont visibles uniquement par les responsables. Elles ne sont jamais affichées aux familles d'accueil.
            </div>
          </div>
        )}

        {/* DÉCISIONS COLLÉGIALES */}
        {activeTab === 'decisions' && (
          <div>
            <div className="mb-4 flex justify-end">
              {canEdit && <button onClick={() => setShowDecisionModal(true)} className="btn-primary"><Plus size={16} /> Ajouter un avis</button>}
            </div>
            {decisions.length === 0 ? (
              <div className="card p-6 text-center"><Users size={32} className="mx-auto mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">Aucune décision collégiale en cours.</p></div>
            ) : (
              <div className="space-y-4">
                {decisions.map((d) => (
                  <div key={d.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">Décision {d.animal ? `pour ${d.animal.nom}` : 'générale'}</p>
                        {d.pre_visite_realisee && <p className="text-xs text-neutral-500">Pré-visite: {formatDate(d.pre_visite_date)} {d.pre_visite_compte_rendu && `— ${d.pre_visite_compte_rendu}`}</p>}
                      </div>
                      <Badge className={d.statut_vote === 'valide' ? 'bg-success-100 text-success-700' : d.statut_vote === 'refuse' ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-800'}>
                        {d.statut_vote === 'valide' ? 'Validé' : d.statut_vote === 'refuse' ? 'Refusé' : 'En attente'}
                      </Badge>
                    </div>
                    {(d.avis ?? []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium uppercase text-neutral-400">Avis individuels</p>
                        {(d.avis ?? []).map((a, i) => (
                          <div key={i} className="flex items-center justify-between rounded bg-neutral-50 p-2">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{a.responsable_nom}</p>
                              {a.commentaire && <p className="text-xs text-neutral-500">{a.commentaire}</p>}
                              <p className="text-xs text-neutral-400">{formatDate(a.date)}</p>
                            </div>
                            <Badge className={a.avis === 'valide' ? 'bg-success-100 text-success-700' : a.avis === 'refuse' ? 'bg-error-100 text-error-700' : 'bg-neutral-100 text-neutral-500'}>
                              {a.avis === 'valide' ? 'Valide' : a.avis === 'refuse' ? 'Refuse' : 'En attente'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {canEdit && d.statut_vote === 'en_attente' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleVote(d.id, 'valide')} className="btn-primary bg-success-600 hover:bg-success-700"><CheckCircle2 size={16} /> Je valide</button>
                        <button onClick={() => handleVote(d.id, 'refuse')} className="btn-secondary text-error-600 hover:bg-error-50"><XCircle size={16} /> Je refuse</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal open={showMaterielModal} onClose={() => setShowMaterielModal(false)} title="Ajouter du matériel" size="md">
        <div className="space-y-4">
          <div><label className="label">Type de matériel *</label><input type="text" value={materielForm.type_materiel} onChange={(e) => setMaterielForm({ ...materielForm, type_materiel: e.target.value })} className="input" placeholder="Longe, harnais, collier..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Date de remise</label><input type="date" value={materielForm.date_remise} onChange={(e) => setMaterielForm({ ...materielForm, date_remise: e.target.value })} className="input" /></div>
            <div><label className="label">Restitution prévue</label><input type="date" value={materielForm.date_restitution_prevue} onChange={(e) => setMaterielForm({ ...materielForm, date_restitution_prevue: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">Commentaire</label><input type="text" value={materielForm.commentaire} onChange={(e) => setMaterielForm({ ...materielForm, commentaire: e.target.value })} className="input" /></div>
          <div className="flex justify-end gap-3"><button onClick={() => setShowMaterielModal(false)} className="btn-secondary">Annuler</button><button onClick={handleAddMateriel} className="btn-primary">Ajouter</button></div>
        </div>
      </Modal>

      <Modal open={showEvalModal} onClose={() => setShowEvalModal(false)} title="Évaluer la famille" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {faEvaluationCriteria.map((c) => (
              <div key={c.key}>
                <label className="label">{c.label}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setEvalForm({ ...evalForm, [c.key]: n })}>
                      <Star size={20} className={(evalForm[c.key] ?? 0) >= n ? 'fill-warning-400 text-warning-400' : 'text-neutral-300'} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div><label className="label">Commentaire</label><textarea value={evalCommentaire} onChange={(e) => setEvalCommentaire(e.target.value)} rows={3} className="input" /></div>
          <div className="flex justify-end gap-3"><button onClick={() => setShowEvalModal(false)} className="btn-secondary">Annuler</button><button onClick={handleAddEvaluation} className="btn-primary">Enregistrer</button></div>
        </div>
      </Modal>

      <Modal open={showDecisionModal} onClose={() => setShowDecisionModal(false)} title="Avis / Décision collégiale" size="md">
        <div className="space-y-4">
          <label className="flex items-center gap-3"><input type="checkbox" checked={decisionForm.pre_visite_realisee} onChange={(e) => setDecisionForm({ ...decisionForm, pre_visite_realisee: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600" /><span className="text-sm">Pré-visite réalisée</span></label>
          {decisionForm.pre_visite_realisee && (
            <>
              <div><label className="label">Date pré-visite</label><input type="date" value={decisionForm.pre_visite_date} onChange={(e) => setDecisionForm({ ...decisionForm, pre_visite_date: e.target.value })} className="input" /></div>
              <div><label className="label">Compte-rendu pré-visite</label><textarea value={decisionForm.pre_visite_compte_rendu} onChange={(e) => setDecisionForm({ ...decisionForm, pre_visite_compte_rendu: e.target.value })} rows={2} className="input" /></div>
            </>
          )}
          <div><label className="label">Mon commentaire / avis</label><textarea value={decisionForm.avis_commentaire} onChange={(e) => setDecisionForm({ ...decisionForm, avis_commentaire: e.target.value })} rows={3} className="input" placeholder="Mon avis sur cette famille..." /></div>
          <div className="flex justify-end gap-3"><button onClick={() => setShowDecisionModal(false)} className="btn-secondary">Annuler</button><button onClick={handleAddDecision} className="btn-primary">Enregistrer</button></div>
        </div>
      </Modal>

      <Modal open={showReportModal} onClose={() => setShowReportModal(false)} title="Compte-rendu de suivi" size="lg">
        <div className="space-y-4">
          <div><label className="label">Animal concerné *</label><select value={reportForm.animal_id} onChange={(e) => setReportForm({ ...reportForm, animal_id: e.target.value })} className="input"><option value="">— Choisir —</option>{enCours.map((fa) => <option key={fa.animal_id} value={fa.animal_id}>{fa.animal.nom}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Poids</label><input type="text" value={reportForm.poids} onChange={(e) => setReportForm({ ...reportForm, poids: e.target.value })} className="input" placeholder="12 kg" /></div>
            <div><label className="label">Alimentation</label><input type="text" value={reportForm.alimentation} onChange={(e) => setReportForm({ ...reportForm, alimentation: e.target.value })} className="input" placeholder="150g croquettes / jour" /></div>
          </div>
          <div><label className="label">Observations santé</label><textarea value={reportForm.observations_sante} onChange={(e) => setReportForm({ ...reportForm, observations_sante: e.target.value })} rows={2} className="input" /></div>
          <div><label className="label">Observations comportement</label><textarea value={reportForm.observations_comportement} onChange={(e) => setReportForm({ ...reportForm, observations_comportement: e.target.value })} rows={2} className="input" /></div>
          <div><label className="label">Commentaire libre</label><textarea value={reportForm.commentaire} onChange={(e) => setReportForm({ ...reportForm, commentaire: e.target.value })} rows={2} className="input" /></div>
          <div><label className="label">Photos</label><div className="rounded-lg border-2 border-dashed border-neutral-200 p-3"><label className="flex cursor-pointer items-center justify-center gap-2 py-2 text-neutral-500"><Camera size={20} /><span className="text-sm">Ajouter des photos</span><input type="file" accept="image/*" multiple onChange={handleReportPhotoUpload} className="hidden" /></label>{reportPhotos.length > 0 && <div className="mt-2 flex gap-2">{reportPhotos.map((url, i) => <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />)}</div>}</div></div>
          <div className="flex justify-end gap-3"><button onClick={() => setShowReportModal(false)} className="btn-secondary">Annuler</button><button onClick={handleAddReport} disabled={!reportForm.animal_id} className="btn-primary">Soumettre</button></div>
        </div>
      </Modal>

      <Modal open={showComportementModal} onClose={() => setShowComportementModal(false)} title="Séance comportementale" size="md">
        <div className="space-y-4">
          <div><label className="label">Animal *</label><select value={comportementForm.animal_id} onChange={(e) => setComportementForm({ ...comportementForm, animal_id: e.target.value })} className="input"><option value="">— Choisir —</option>{animals.filter((a) => a.statut !== 'termine').map((fa) => <option key={fa.animal_id} value={fa.animal_id}>{fa.animal.nom}</option>)}</select></div>
          <div><label className="label">Éducateur</label><select value={comportementForm.educateur_id} onChange={(e) => setComportementForm({ ...comportementForm, educateur_id: e.target.value })} className="input"><option value="">—</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Date</label><input type="date" value={comportementForm.date_session} onChange={(e) => setComportementForm({ ...comportementForm, date_session: e.target.value })} className="input" /></div>
            <div><label className="label">Type de séance</label><input type="text" value={comportementForm.type_session} onChange={(e) => setComportementForm({ ...comportementForm, type_session: e.target.value })} className="input" placeholder="Évaluation, suivi..." /></div>
          </div>
          <div><label className="label">Conseils à la famille</label><textarea value={comportementForm.conseils} onChange={(e) => setComportementForm({ ...comportementForm, conseils: e.target.value })} rows={2} className="input" /></div>
          <div><label className="label">Progrès constatés</label><textarea value={comportementForm.progres_constates} onChange={(e) => setComportementForm({ ...comportementForm, progres_constates: e.target.value })} rows={2} className="input" /></div>
          <div><label className="label">Compte-rendu</label><textarea value={comportementForm.compte_rendu} onChange={(e) => setComportementForm({ ...comportementForm, compte_rendu: e.target.value })} rows={3} className="input" /></div>
          <label className="flex items-center gap-3"><input type="checkbox" checked={comportementForm.bilan_final} onChange={(e) => setComportementForm({ ...comportementForm, bilan_final: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600" /><span className="text-sm">Bilan final de fin d'accueil</span></label>
          <div className="flex justify-end gap-3"><button onClick={() => setShowComportementModal(false)} className="btn-secondary">Annuler</button><button onClick={handleAddComportement} disabled={!comportementForm.animal_id} className="btn-primary">Enregistrer</button></div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value, edit, editType = 'text', editValue, onChange }: { label: string; value?: string; edit: boolean; editType?: string; editValue: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      {edit ? <input type={editType} value={editValue} onChange={(e) => onChange(e.target.value)} className="input" /> : <p className="mt-1 text-sm text-neutral-900">{value || '—'}</p>}
    </div>
  );
}

function NumberField({ label, value, edit, onChange }: { label: string; value: number; edit: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      {edit ? <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="input" /> : <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>}
    </div>
  );
}

function AnimalRow({ fa }: { fa: FaAnimalLink }) {
  const jours = fa.date_debut ? daysBetween(fa.date_debut) : 0;
  return (
    <Link to={`/animaux/${fa.animal_id}`} className="card mb-2 flex items-center gap-3 p-3 transition-colors hover:bg-neutral-50">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {fa.animal.photo_url ? <img src={fa.animal.photo_url} alt={fa.animal.nom} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Dog size={20} className="text-neutral-400" /></div>}
      </div>
      <div className="flex-1">
        <p className="font-medium text-neutral-900">{fa.animal.nom}</p>
        <p className="text-xs text-neutral-500">{especeLabels[fa.animal.espece] ?? fa.animal.espece} · {fa.date_debut ? `Depuis ${formatDate(fa.date_debut)} (${jours}j)` : '—'}</p>
      </div>
      <Badge className={fa.statut === 'en_cours' ? 'bg-success-100 text-success-700' : fa.statut === 'prevu' ? 'bg-warning-100 text-warning-800' : 'bg-neutral-100 text-neutral-600'}>
        {fa.statut === 'en_cours' ? 'En cours' : fa.statut === 'prevu' ? 'Prévu' : 'Terminé'}
      </Badge>
    </Link>
  );
}
