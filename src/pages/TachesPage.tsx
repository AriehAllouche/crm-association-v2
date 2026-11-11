import { useEffect, useState } from 'react';
import { Plus, CheckCircle, Circle, Clock, AlertTriangle, Filter, Search, Loader2, Trash2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatDate } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import type { Tache, TachePriorite, TacheStatut, TacheCategorie } from '../types';

const prioriteColors: Record<TachePriorite, string> = {
  faible: 'bg-neutral-100 text-neutral-600',
  normale: 'bg-secondary-100 text-secondary-700',
  urgente: 'bg-warning-100 text-warning-800',
  critique: 'bg-error-100 text-error-800',
};

const prioriteLabels: Record<TachePriorite, string> = {
  faible: 'Faible',
  normale: 'Normale',
  urgente: 'Urgente',
  critique: 'Critique',
};

const statutColors: Record<TacheStatut, string> = {
  a_faire: 'bg-neutral-100 text-neutral-600',
  en_cours: 'bg-primary-100 text-primary-700',
  termine: 'bg-success-100 text-success-700',
};

const statutLabels: Record<TacheStatut, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
};

const categorieLabels: Record<TacheCategorie, string> = {
  admin: 'Admin',
  terrain: 'Terrain',
  communication: 'Communication',
  sante: 'Santé',
  adoption: 'Adoption',
  autre: 'Autre',
};

const emptyForm = {
  titre: '',
  description: '',
  date_echeance: '',
  priorite: 'normale' as TachePriorite,
  categorie: 'admin' as TacheCategorie,
};

export function TachesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<TacheStatut | 'all'>('all');
  const [prioriteFilter, setPrioriteFilter] = useState<TachePriorite | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTache, setSelectedTache] = useState<Tache | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaches();
  }, [user]);

  const fetchTaches = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('taches')
      .select('*')
      .eq('assigne_a', user.id)
      .order('date_echeance', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching taches:', error);
    } else {
      setTaches((data ?? []) as Tache[]);
    }
    setLoading(false);
  };

  const filtered = taches.filter((t) => {
    const matchSearch =
      !search ||
      t.titre.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || t.statut === statutFilter;
    const matchPriorite = prioriteFilter === 'all' || t.priorite === prioriteFilter;
    return matchSearch && matchStatut && matchPriorite;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    const payload = {
      titre: form.titre,
      description: form.description || null,
      date_echeance: form.date_echeance || null,
      priorite: form.priorite,
      categorie: form.categorie,
      assigne_a: user.id,
      statut: 'a_faire' as TacheStatut,
    };

    try {
      const { error } = await supabase.from('taches').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchTaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTache) return;
    setSaving(true);
    setError(null);

    const payload = {
      titre: form.titre,
      description: form.description || null,
      date_echeance: form.date_echeance || null,
      priorite: form.priorite,
      categorie: form.categorie,
    };

    try {
      const { error } = await supabase
        .from('taches')
        .update(payload)
        .eq('id', selectedTache.id);
      if (error) throw new Error(error.message);
      setEditModalOpen(false);
      setSelectedTache(null);
      setForm(emptyForm);
      fetchTaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatut = async (tache: Tache) => {
    const newStatut: TacheStatut = tache.statut === 'termine' ? 'a_faire' : 'termine';
    const payload = {
      statut: newStatut,
      date_completion: newStatut === 'termine' ? new Date().toISOString() : null,
    };

    try {
      const { error } = await supabase
        .from('taches')
        .update(payload)
        .eq('id', tache.id);
      if (error) throw new Error(error.message);
      fetchTaches();
    } catch (err) {
      console.error('Error updating tache:', err);
    }
  };

  const handleDelete = async (tache: Tache) => {
    if (!confirm('Voulez-vous vraiment supprimer cette tâche ?')) return;
    try {
      const { error } = await supabase.from('taches').delete().eq('id', tache.id);
      if (error) throw new Error(error.message);
      fetchTaches();
    } catch (err) {
      console.error('Error deleting tache:', err);
    }
  };

  const openEditModal = (tache: Tache) => {
    setSelectedTache(tache);
    setForm({
      titre: tache.titre,
      description: tache.description || '',
      date_echeance: tache.date_echeance || '',
      priorite: tache.priorite,
      categorie: tache.categorie,
    });
    setError(null);
    setEditModalOpen(true);
  };

  if (loading) return <LoadingSpinner />;

  const stats = {
    total: taches.length,
    aFaire: taches.filter((t) => t.statut === 'a_faire').length,
    enCours: taches.filter((t) => t.statut === 'en_cours').length,
    termine: taches.filter((t) => t.statut === 'termine').length,
  };

  return (
    <div>
      <PageHeader
        title="Mes Tâches"
        subtitle={`${stats.total} tâche${stats.total > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouvelle tâche
          </button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
          <p className="text-sm text-neutral-600">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-neutral-600">{stats.aFaire}</p>
          <p className="text-sm text-neutral-600">À faire</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{stats.enCours}</p>
          <p className="text-sm text-neutral-600">En cours</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-success-600">{stats.termine}</p>
          <p className="text-sm text-neutral-600">Terminé</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher une tâche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as TacheStatut | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(statutLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={prioriteFilter}
            onChange={(e) => setPrioriteFilter(e.target.value as TachePriorite | 'all')}
            className="input w-auto"
          >
            <option value="all">Toutes les priorités</option>
            {Object.entries(prioriteLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Aucune tâche trouvée"
          description="Créez votre première tâche pour commencer."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvelle tâche
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((tache) => (
            <div
              key={tache.id}
              className="card p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleStatut(tache)}
                  className="mt-1 flex-shrink-0"
                >
                  {tache.statut === 'termine' ? (
                    <CheckCircle size={24} className="text-success-500" />
                  ) : (
                    <Circle size={24} className="text-neutral-300 hover:text-primary-500" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-medium ${tache.statut === 'termine' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                        {tache.titre}
                      </h3>
                      {tache.description && (
                        <p className="mt-1 text-sm text-neutral-600">{tache.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={prioriteColors[tache.priorite]}>
                        {prioriteLabels[tache.priorite]}
                      </Badge>
                      <Badge className={statutColors[tache.statut]}>
                        {statutLabels[tache.statut]}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {tache.date_echeance ? formatDate(tache.date_echeance) : 'Pas de date'}
                    </span>
                    <span className="badge bg-neutral-100 text-neutral-600">
                      {categorieLabels[tache.categorie]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(tache)}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(tache)}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-error-50 hover:text-error-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle tâche" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div>
            <label className="label">Titre *</label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              required
              className="input"
              placeholder="Ex: Appeler le vétérinaire"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="input"
              placeholder="Détails de la tâche..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Date d'échéance</label>
              <input
                type="date"
                value={form.date_echeance}
                onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => setForm({ ...form, priorite: e.target.value as TachePriorite })}
                className="input"
              >
                {Object.entries(prioriteLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value as TacheCategorie })}
              className="input"
            >
              {Object.entries(categorieLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer la tâche
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Modifier la tâche" size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div>
            <label className="label">Titre *</label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="input"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Date d'échéance</label>
              <input
                type="date"
                value={form.date_echeance}
                onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => setForm({ ...form, priorite: e.target.value as TachePriorite })}
                className="input"
              >
                {Object.entries(prioriteLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value as TacheCategorie })}
              className="input"
            >
              {Object.entries(categorieLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
              Modifier la tâche
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
