import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Scale, Search, Filter, Loader2, AlertTriangle, Gavel, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { justiceStatutLabels, formatDate } from '../lib/constants';
import type { JusticeCase, JusticeStatut, Animal } from '../types';

const statutFilters: JusticeStatut[] = [
  'ouvert',
  'en_cours',
  'audience_planifiee',
  'jugement_rendu',
  'cloture',
];

const statutColors: Record<JusticeStatut, string> = {
  ouvert: 'bg-warning-100 text-warning-800',
  en_cours: 'bg-secondary-100 text-secondary-800',
  audience_planifiee: 'bg-primary-100 text-primary-800',
  jugement_rendu: 'bg-accent-100 text-accent-800',
  cloture: 'bg-neutral-100 text-neutral-500',
};

const emptyForm = {
  animal_id: '',
  numero_parquet: '',
  tribunal: '',
  date_audience: '',
  avocat: '',
  avocat_contact: '',
  requisition: '',
  resume_faits: '',
  notes: '',
};

export function JusticePage() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<JusticeCase[]>([]);
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<JusticeStatut | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailCase, setDetailCase] = useState<JusticeCase | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
    fetchAnimaux();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('justice_cases')
      .select('*, animal:animals(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching justice cases:', error);
    } else {
      setCases((data ?? []) as JusticeCase[]);
    }
    setLoading(false);
  };

  const fetchAnimaux = async () => {
    const { data } = await supabase.from('animals').select('id, nom').order('nom');
    setAnimaux((data ?? []) as Animal[]);
  };

  const filtered = cases.filter((c) => {
    const matchSearch =
      !search ||
      c.numero_parquet?.toLowerCase().includes(search.toLowerCase()) ||
      c.tribunal?.toLowerCase().includes(search.toLowerCase()) ||
      c.avocat?.toLowerCase().includes(search.toLowerCase()) ||
      c.animal?.nom.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || c.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      animal_id: form.animal_id || null,
      numero_parquet: form.numero_parquet || null,
      tribunal: form.tribunal || null,
      date_audience: form.date_audience || null,
      avocat: form.avocat || null,
      avocat_contact: form.avocat_contact || null,
      requisition: form.requisition || null,
      resume_faits: form.resume_faits || null,
      notes: form.notes || null,
      statut: 'ouvert' as JusticeStatut,
    };

    try {
      const { error } = await supabase.from('justice_cases').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const isUpcoming = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d >= now && d.getTime() - now.getTime() < 1000 * 60 * 60 * 24 * 30; // within 30 days
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Justice"
        subtitle={`${cases.length} dossier${cases.length > 1 ? 's' : ''} de justice au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouveau dossier
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par n° parquet, tribunal, avocat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as JusticeStatut | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            {statutFilters.map((s) => (
              <option key={s} value={s}>
                {justiceStatutLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Aucun dossier de justice trouvé"
          description="Créez un dossier pour suivre les procédures judiciaires liées aux animaux."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouveau dossier
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setDetailCase(c)}
              className="card cursor-pointer p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-neutral-900">
                    {c.numero_parquet || 'N° parquet non renseigné'}
                  </h3>
                  {c.tribunal && (
                    <p className="mt-0.5 text-sm text-neutral-500">{c.tribunal}</p>
                  )}
                </div>
                <Badge className={statutColors[c.statut]}>{justiceStatutLabels[c.statut]}</Badge>
              </div>

              {c.date_audience && (
                <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isUpcoming(c.date_audience) ? 'bg-warning-50 text-warning-800' : 'bg-neutral-50 text-neutral-600'
                }`}>
                  {isUpcoming(c.date_audience) ? (
                    <AlertTriangle size={16} className="text-warning-600" />
                  ) : (
                    <Calendar size={16} className="text-neutral-400" />
                  )}
                  Audience : {formatDate(c.date_audience)}
                </div>
              )}

              {c.avocat && (
                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                  <Gavel size={14} className="text-neutral-400" />
                  {c.avocat}
                </p>
              )}

              {c.animal && (
                <p className="mt-2 text-xs text-neutral-400">
                  Animal : {c.animal.nom}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau dossier de justice" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div>
            <label className="label">Animal concerné</label>
            <select
              value={form.animal_id}
              onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
              className="input"
            >
              <option value="">Aucun (optionnel)</option>
              {animaux.map((a) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Numéro de parquet</label>
              <input
                type="text"
                value={form.numero_parquet}
                onChange={(e) => setForm({ ...form, numero_parquet: e.target.value })}
                className="input"
                placeholder="2024/0123"
              />
            </div>
            <div>
              <label className="label">Tribunal</label>
              <input
                type="text"
                value={form.tribunal}
                onChange={(e) => setForm({ ...form, tribunal: e.target.value })}
                className="input"
                placeholder="Tribunal de Lyon"
              />
            </div>
            <div>
              <label className="label">Date d'audience</label>
              <input
                type="date"
                value={form.date_audience}
                onChange={(e) => setForm({ ...form, date_audience: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Avocat</label>
              <input
                type="text"
                value={form.avocat}
                onChange={(e) => setForm({ ...form, avocat: e.target.value })}
                className="input"
                placeholder="Me Dupont"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Contact de l'avocat</label>
              <input
                type="text"
                value={form.avocat_contact}
                onChange={(e) => setForm({ ...form, avocat_contact: e.target.value })}
                className="input"
                placeholder="Email / téléphone"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Réquisition</label>
              <input
                type="text"
                value={form.requisition}
                onChange={(e) => setForm({ ...form, requisition: e.target.value })}
                className="input"
                placeholder="Réquisition du procureur..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Résumé des faits</label>
              <textarea
                value={form.resume_faits}
                onChange={(e) => setForm({ ...form, resume_faits: e.target.value })}
                rows={4}
                className="input"
                placeholder="Description des faits..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="input"
                placeholder="Notes complémentaires..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer le dossier
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailCase} onClose={() => setDetailCase(null)} title="Détail du dossier de justice" size="lg">
        {detailCase && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-neutral-900">
                  {detailCase.numero_parquet || 'N° parquet non renseigné'}
                </h3>
                {detailCase.tribunal && (
                  <p className="text-sm text-neutral-500">{detailCase.tribunal}</p>
                )}
              </div>
              <Badge className={statutColors[detailCase.statut]}>
                {justiceStatutLabels[detailCase.statut]}
              </Badge>
            </div>

            {detailCase.animal && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Animal concerné</div>
                <Link
                  to={`/animaux/${detailCase.animal_id}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {detailCase.animal.nom}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailCase.date_audience && (
                <div className={`card p-3 ${isUpcoming(detailCase.date_audience) ? 'border-warning-200 bg-warning-50' : ''}`}>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Calendar size={14} /> Date d'audience
                  </div>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {formatDate(detailCase.date_audience)}
                  </p>
                  {isUpcoming(detailCase.date_audience) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warning-700">
                      <AlertTriangle size={12} /> Audience à venir
                    </p>
                  )}
                </div>
              )}
              {detailCase.avocat && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Gavel size={14} /> Avocat
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailCase.avocat}</p>
                  {detailCase.avocat_contact && (
                    <p className="mt-0.5 text-xs text-neutral-500">{detailCase.avocat_contact}</p>
                  )}
                </div>
              )}
            </div>

            {detailCase.requisition && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Réquisition</div>
                <p className="mt-1 text-sm text-neutral-700">{detailCase.requisition}</p>
              </div>
            )}

            {detailCase.resume_faits && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Résumé des faits
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailCase.resume_faits}</p>
              </div>
            )}

            {detailCase.decision && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Décision</div>
                <p className="mt-1 text-sm text-neutral-700">{detailCase.decision}</p>
              </div>
            )}

            {detailCase.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailCase.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
