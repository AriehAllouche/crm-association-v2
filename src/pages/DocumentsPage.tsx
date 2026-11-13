import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Search, Filter, Loader2, ExternalLink, FileCheck, Folder, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { DocumentFolderForm } from '../components/DocumentFolderForm';
import { DocumentUpload, emptyDocumentSource, type DocumentSource } from '../components/DocumentUpload';
import { openDocument, formatFileSize, deleteDocument } from '../lib/documentUpload';
import { formatDate } from '../lib/constants';
import type { DocumentItem, DocumentModule, DocumentType, Animal } from '../types';

const moduleLabels: Record<DocumentModule, string> = {
  animal: 'Animal',
  signalement: 'Signalement',
  famille_accueil: 'Famille d\'accueil',
  adoption: 'Adoption',
  veterinaire: 'Vétérinaire',
  justice: 'Justice',
  pension: 'Pension',
  transport: 'Transport',
  communication: 'Communication',
  icad: 'ICAD',
  sante: 'Santé',
  autre: 'Autre',
};

const typeLabels: Record<DocumentType, string> = {
  contrat: 'Contrat',
  facture: 'Facture',
  devis: 'Devis',
  certificat: 'Certificat',
  jugement: 'Jugement',
  photo: 'Photo',
  video: 'Vidéo',
  compte_rendu: 'Compte rendu',
  carte: 'Carte',
  autre: 'Autre',
};

const typeColors: Record<DocumentType, string> = {
  contrat: 'bg-primary-100 text-primary-800',
  facture: 'bg-warning-100 text-warning-800',
  devis: 'bg-secondary-100 text-secondary-800',
  certificat: 'bg-success-100 text-success-700',
  jugement: 'bg-accent-100 text-accent-800',
  photo: 'bg-neutral-100 text-neutral-700',
  video: 'bg-neutral-100 text-neutral-700',
  compte_rendu: 'bg-primary-100 text-primary-700',
  carte: 'bg-secondary-100 text-secondary-700',
  autre: 'bg-neutral-100 text-neutral-500',
};

const emptyForm = {
  animal_id: '',
  module: 'animal' as DocumentModule,
  type_document: 'autre' as DocumentType,
  nom_fichier: '',
  description: '',
  folder: 'Général',
  source: emptyDocumentSource(),
};

export function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<DocumentItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchAnimaux();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*, animal:animals(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments((data ?? []) as DocumentItem[]);
    }
    setLoading(false);
  };

  const fetchAnimaux = async () => {
    const { data } = await supabase.from('animals').select('id, nom').order('nom');
    setAnimaux((data ?? []) as Animal[]);
  };

  const filtered = documents.filter((d) => {
    const matchSearch =
      !search ||
      d.nom_fichier.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.animal?.nom.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || d.type_document === typeFilter;
    return matchSearch && matchType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.source.storage_path && !form.source.url) {
      setError('Envoyez un fichier ou renseignez un lien externe.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      animal_id: form.animal_id || null,
      module: form.module,
      type_document: form.type_document,
      nom_fichier: form.nom_fichier,
      url: form.source.url,
      storage_path: form.source.storage_path,
      taille: form.source.taille,
      description: form.description || null,
      folder: form.folder || 'Général',
    };

    try {
      const { error } = await supabase.from('documents').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm({ ...emptyForm, source: emptyDocumentSource() });
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleSourceChange = (source: DocumentSource) => {
    // Le nom du fichier envoyé sert de libellé par défaut, sans écraser une
    // saisie manuelle de l'utilisateur.
    setForm((prev) => ({
      ...prev,
      source,
      nom_fichier: prev.nom_fichier || source.nom_fichier,
    }));
  };

  const handleOpenDocument = async (doc: DocumentItem) => {
    try {
      await openDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'ouvrir le document');
    }
  };

  const handleDelete = async () => {
    if (!detailDoc) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDocument(detailDoc);
      setShowDeleteConfirm(false);
      setDetailDoc(null);
      fetchDocuments();
    } catch (err) {
      // L'erreur reste affichée dans la fiche: la confirmation se ferme pour
      // la rendre visible.
      setShowDeleteConfirm(false);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} document${documents.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouveau document
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, description, animal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les types</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document trouvé"
          description="Ajoutez un document pour centraliser les contrats, factures, certificats..."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouveau document
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Fichier</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dossier</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Animal</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => { setError(null); setDetailDoc(d); }}
                    className="cursor-pointer table-row-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-900">{d.nom_fichier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={typeColors[d.type_document]}>{typeLabels[d.type_document]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Folder size={14} className="text-neutral-400" />
                        <span>{d.folder || 'Général'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{moduleLabels[d.module]}</td>
                    <td className="px-4 py-3 text-sm">
                      {d.animal ? (
                        <Link
                          to={`/animaux/${d.animal_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {d.animal.nom}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau document" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Animal (optionnel)</label>
              <select
                value={form.animal_id}
                onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
                className="input"
              >
                <option value="">Aucun</option>
                {animaux.map((a) => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Module</label>
              <select
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value as DocumentModule })}
                className="input"
              >
                {Object.entries(moduleLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type de document</label>
              <select
                value={form.type_document}
                onChange={(e) => setForm({ ...form, type_document: e.target.value as DocumentType })}
                className="input"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nom du fichier *</label>
              <input
                type="text"
                value={form.nom_fichier}
                onChange={(e) => setForm({ ...form, nom_fichier: e.target.value })}
                required
                className="input"
                placeholder="Contrat_adoption_Rex.pdf"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Fichier *</label>
              <DocumentUpload
                value={form.source}
                onChange={handleSourceChange}
                pathPrefix={form.animal_id || undefined}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="input"
                placeholder="Description du document..."
              />
            </div>
            <div className="sm:col-span-2">
              <DocumentFolderForm
                animalId={form.animal_id}
                onFolderSelected={(folder) => setForm({ ...form, folder })}
                selectedFolder={form.folder}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer le document
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailDoc} onClose={() => setDetailDoc(null)} title="Détail du document" size="lg">
        {detailDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                  <FileText size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-neutral-900">{detailDoc.nom_fichier}</h3>
                  <p className="text-xs text-neutral-500">
                    Ajouté le {formatDate(detailDoc.created_at)}
                    {detailDoc.taille ? ` • ${formatFileSize(detailDoc.taille)}` : ''}
                  </p>
                </div>
              </div>
              <Badge className={typeColors[detailDoc.type_document]}>
                {typeLabels[detailDoc.type_document]}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Module</div>
                <p className="mt-1 text-sm text-neutral-900">{moduleLabels[detailDoc.module]}</p>
              </div>
              {detailDoc.animal && (
                <div className="card p-3">
                  <div className="text-xs font-medium uppercase text-neutral-400">Animal</div>
                  <Link
                    to={`/animaux/${detailDoc.animal_id}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {detailDoc.animal.nom}
                  </Link>
                </div>
              )}
            </div>

            {detailDoc.description && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Description</div>
                <p className="mt-1 text-sm text-neutral-700">{detailDoc.description}</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
            )}

            <div className="flex gap-3">
              {/* Bucket privé: l'URL de lecture est signée à la demande, elle ne
                  peut pas être rendue dans un href statique. */}
              <button
                type="button"
                onClick={() => handleOpenDocument(detailDoc)}
                className="btn-primary flex-1 justify-center"
              >
                <ExternalLink size={18} />
                Ouvrir le document
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-ghost text-error-600 hover:bg-error-50"
              >
                <Trash2 size={18} />
                Supprimer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && detailDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md p-6">
            <h3 className="font-heading text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Voulez-vous vraiment supprimer <strong>{detailDoc.nom_fichier}</strong> ?
              {detailDoc.storage_path
                ? ' Le fichier sera définitivement effacé du stockage.'
                : ' Le lien externe sera retiré du CRM (le fichier d\'origine n\'est pas touché).'}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary" disabled={deleting}>
                Annuler
              </button>
              <button onClick={handleDelete} className="btn-primary bg-error-600 hover:bg-error-700" disabled={deleting}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
