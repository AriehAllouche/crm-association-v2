import { useEffect, useState } from 'react';
import { Plus, Edit, FileText, Loader2, Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal, Badge, EmptyState } from './ui';
import { DocumentUpload, emptyDocumentSource, type DocumentSource } from './DocumentUpload';
import { openDocument } from '../lib/documentUpload';
import { formatDate, formatDateTime, icadDemandeStatutLabels, icadDemandeStatutColors, icadModeEnvoiLabels } from '../lib/constants';
import type { IcadDemande, IcadDemandeStatut, IcadModeEnvoi, DocumentItem } from '../types';

interface IcadDemandesSectionProps {
  animalId: string;
  onChanged: () => void;
}

const emptyForm = () => ({
  ancien_detenteur_nom: '',
  ancien_detenteur_prenom: '',
  ancien_detenteur_contact: '',
  date_envoi_demande: '',
  mode_envoi: '' as IcadModeEnvoi | '',
  statut: 'a_effectuer' as IcadDemandeStatut,
  date_transfert_epa: '',
  notes: '',
});

export function IcadDemandesSection({ animalId, onChanged }: IcadDemandesSectionProps) {
  const [demandes, setDemandes] = useState<IcadDemande[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IcadDemande | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [docModal, setDocModal] = useState<IcadDemande | null>(null);
  const [docForm, setDocForm] = useState({ nom_fichier: '', description: '', source: emptyDocumentSource() });
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [demRes, docRes] = await Promise.all([
      supabase.from('icad_demandes').select('*').eq('animal_id', animalId).order('created_at', { ascending: false }),
      supabase.from('documents').select('*').eq('animal_id', animalId).eq('module', 'icad'),
    ]);
    setDemandes((demRes.data ?? []) as IcadDemande[]);
    setDocuments((docRes.data ?? []) as DocumentItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [animalId]);

  const docsFor = (demandeId: string) => documents.filter((d) => d.module_id === demandeId);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (d: IcadDemande) => {
    setEditing(d);
    setForm({
      ancien_detenteur_nom: d.ancien_detenteur_nom ?? '',
      ancien_detenteur_prenom: d.ancien_detenteur_prenom ?? '',
      ancien_detenteur_contact: d.ancien_detenteur_contact ?? '',
      date_envoi_demande: d.date_envoi_demande ?? '',
      mode_envoi: d.mode_envoi ?? '',
      statut: d.statut,
      date_transfert_epa: d.date_transfert_epa ?? '',
      notes: d.notes ?? '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        animal_id: animalId,
        ancien_detenteur_nom: form.ancien_detenteur_nom || null,
        ancien_detenteur_prenom: form.ancien_detenteur_prenom || null,
        ancien_detenteur_contact: form.ancien_detenteur_contact || null,
        date_envoi_demande: form.date_envoi_demande || null,
        mode_envoi: form.mode_envoi || null,
        statut: form.statut,
        // Si validée sans date de transfert, on propose la date du jour
        date_transfert_epa: form.date_transfert_epa || (form.statut === 'validee' ? new Date().toISOString().split('T')[0] : null),
        notes: form.notes || null,
      };
      const { error: err } = editing
        ? await supabase.from('icad_demandes').update(payload).eq('id', editing.id)
        : await supabase.from('icad_demandes').insert(payload);
      if (err) throw new Error(err.message);
      setModalOpen(false);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const quickStatut = async (d: IcadDemande, statut: IcadDemandeStatut) => {
    const payload: Record<string, unknown> = { statut };
    if (statut === 'validee' && !d.date_transfert_epa) {
      payload.date_transfert_epa = new Date().toISOString().split('T')[0];
    }
    const { error: err } = await supabase.from('icad_demandes').update(payload).eq('id', d.id);
    if (!err) {
      await load();
      onChanged();
    }
  };

  const openDocModal = (d: IcadDemande) => {
    setDocModal(d);
    setDocForm({ nom_fichier: '', description: '', source: emptyDocumentSource() });
    setDocError(null);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModal) return;
    if (!docForm.source.storage_path && !docForm.source.url) {
      setDocError('Envoyez un fichier ou renseignez un lien externe.');
      return;
    }
    setDocSaving(true);
    setDocError(null);
    try {
      const { error: err } = await supabase.from('documents').insert({
        animal_id: animalId,
        module: 'icad',
        module_id: docModal.id,
        type_document: 'certificat',
        nom_fichier: docForm.nom_fichier || docForm.source.nom_fichier,
        url: docForm.source.url,
        storage_path: docForm.source.storage_path,
        taille: docForm.source.taille,
        description: docForm.description || null,
      });
      if (err) throw new Error(err.message);
      setDocModal(null);
      await load();
      onChanged();
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDocSaving(false);
    }
  };

  if (loading) return <div className="card p-6"><Loader2 size={20} className="mx-auto animate-spin text-neutral-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Demandes de changement ICAD</h2>
          <p className="text-sm text-neutral-500">Historique des détenteurs et des démarches — jamais écrasé.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nouvelle demande
        </button>
      </div>

      {demandes.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            icon={FileText}
            title="Aucune demande ICAD"
            description="Enregistrez la première demande de changement de détenteur (ex : transfert au nom de l'EPA)."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => {
            const detenteur = [d.ancien_detenteur_prenom, d.ancien_detenteur_nom].filter(Boolean).join(' ');
            const docs = docsFor(d.id);
            return (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-neutral-900">
                        {detenteur || 'Détenteur non renseigné'}
                      </p>
                      <Badge className={icadDemandeStatutColors[d.statut]}>{icadDemandeStatutLabels[d.statut]}</Badge>
                    </div>
                    {d.ancien_detenteur_contact && (
                      <p className="mt-1 text-sm text-neutral-500">Contact : {d.ancien_detenteur_contact}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                      {d.date_envoi_demande && <span>Envoi : {formatDate(d.date_envoi_demande)}</span>}
                      {d.mode_envoi && <span>Mode : {icadModeEnvoiLabels[d.mode_envoi] ?? d.mode_envoi}</span>}
                      {d.date_transfert_epa && <span>Transfert EPA : {formatDate(d.date_transfert_epa)}</span>}
                    </div>
                    {d.notes && <p className="mt-2 text-sm text-neutral-600">{d.notes}</p>}
                    <p className="mt-2 text-xs text-neutral-400">Créée le {formatDateTime(d.created_at)}</p>

                    {/* Justificatifs */}
                    <div className="mt-3 border-t border-neutral-100 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500">Justificatifs :</span>
                        {docs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => openDocument(doc).catch(() => alert('Impossible d\'ouvrir le document'))}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
                          >
                            <FileText size={12} /> {doc.nom_fichier}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => openDocModal(d)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-primary-400 hover:text-primary-600"
                        >
                          <Upload size={12} /> Ajouter
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button onClick={() => openEdit(d)} className="btn-ghost text-sm"><Edit size={14} /> Modifier</button>
                    {/* Avancement rapide du statut */}
                    <div className="flex flex-wrap justify-end gap-1">
                      {(['envoyee', 'en_attente', 'validee'] as IcadDemandeStatut[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => quickStatut(d, s)}
                          disabled={d.statut === s}
                          className={`rounded-full px-2 py-1 text-xs transition-colors ${
                            d.statut === s
                              ? icadDemandeStatutColors[s]
                              : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                          }`}
                        >
                          {s === 'validee' && <CheckCircle size={10} className="mr-1 inline" />}
                          {icadDemandeStatutLabels[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création / édition */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la demande ICAD' : 'Nouvelle demande ICAD'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Ancien détenteur</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input type="text" placeholder="Prénom" value={form.ancien_detenteur_prenom} onChange={(e) => setForm({ ...form, ancien_detenteur_prenom: e.target.value })} className="input" />
              <input type="text" placeholder="Nom" value={form.ancien_detenteur_nom} onChange={(e) => setForm({ ...form, ancien_detenteur_nom: e.target.value })} className="input" />
              <input type="text" placeholder="Tél ou email" value={form.ancien_detenteur_contact} onChange={(e) => setForm({ ...form, ancien_detenteur_contact: e.target.value })} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Date d'envoi de la demande</label>
              <input type="date" value={form.date_envoi_demande} onChange={(e) => setForm({ ...form, date_envoi_demande: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Mode d'envoi</label>
              <select value={form.mode_envoi} onChange={(e) => setForm({ ...form, mode_envoi: e.target.value as IcadModeEnvoi | '' })} className="input">
                <option value="">—</option>
                {Object.entries(icadModeEnvoiLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as IcadDemandeStatut })} className="input">
                {Object.entries(icadDemandeStatutLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Date effective du transfert au nom d'EPA</label>
            <input type="date" value={form.date_transfert_epa} onChange={(e) => setForm({ ...form, date_transfert_epa: e.target.value })} className="input" />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input" placeholder="Référence du dossier, nom de l'agent ICAD, remarques..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal justificatif */}
      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Ajouter un justificatif" size="md">
        <form onSubmit={handleDocSubmit} className="space-y-4">
          {docError && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{docError}</div>}
          <div>
            <label className="label">Fichier *</label>
            <DocumentUpload value={docForm.source} onChange={(source: DocumentSource) => setDocForm({ ...docForm, source })} pathPrefix={animalId} />
          </div>
          <div>
            <label className="label">Nom du fichier</label>
            <input type="text" value={docForm.nom_fichier} onChange={(e) => setDocForm({ ...docForm, nom_fichier: e.target.value })} className="input" placeholder="Ex : Courrier ICAD - juin 2026" />
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDocModal(null)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={docSaving} className="btn-primary">
              {docSaving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
