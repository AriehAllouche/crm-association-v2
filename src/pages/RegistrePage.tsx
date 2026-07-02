import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ClipboardList, Search, Filter, Loader2, ArrowRight, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatDate } from '../lib/constants';
import type { RegistreEntreeSortie, RegistreType, Animal } from '../types';

const typeColors: Record<RegistreType, string> = {
  entree: 'bg-success-100 text-success-700',
  sortie: 'bg-warning-100 text-warning-800',
};

const typeLabels: Record<RegistreType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
};

const emptyForm = {
  animal_id: '',
  type: 'entree' as RegistreType,
  motif: '',
  provenance_destination: '',
};

export function RegistrePage() {
  const [loading, setLoading] = useState(true);
  const [entrees, setEntrees] = useState<RegistreEntreeSortie[]>([]);
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RegistreType | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailEntree, setDetailEntree] = useState<RegistreEntreeSortie | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntrees();
    fetchAnimaux();
  }, []);

  const fetchEntrees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('registre_entrees_sorties')
      .select('*, animal:animals(*)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching registre:', error);
    } else {
      setEntrees((data ?? []) as RegistreEntreeSortie[]);
    }
    setLoading(false);
  };

  const fetchAnimaux = async () => {
    const { data } = await supabase.from('animals').select('id, nom').order('nom');
    setAnimaux((data ?? []) as Animal[]);
  };

  const filtered = entrees.filter((e) => {
    const matchSearch =
      !search ||
      e.numero_entree.toLowerCase().includes(search.toLowerCase()) ||
      e.motif?.toLowerCase().includes(search.toLowerCase()) ||
      e.provenance_destination?.toLowerCase().includes(search.toLowerCase()) ||
      e.animal?.nom.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      animal_id: form.animal_id,
      numero_entree: `ENT-${Date.now()}`,
      type: form.type,
      motif: form.motif || null,
      provenance_destination: form.provenance_destination || null,
      date: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('registre_entrees_sorties').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchEntrees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Registre d'entrées / sorties"
        subtitle={`${entrees.length} entrée${entrees.length > 1 ? 's' : ''} au registre`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouvelle entrée registre
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, motif, animal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as RegistreType | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les types</option>
            <option value="entree">Entrées</option>
            <option value="sortie">Sorties</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune entrée au registre"
          description="Le registre est alimenté automatiquement lors de la création d'un animal. Vous pouvez aussi ajouter des entrées manuellement."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvelle entrée registre
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">N° entrée</th>
                  <th className="px-4 py-3">Animal</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Motif</th>
                  <th className="px-4 py-3">Provenance / Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setDetailEntree(e)}
                    className="cursor-pointer table-row-hover"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-medium text-neutral-900">{e.numero_entree}</td>
                    <td className="px-4 py-3">
                      {e.animal ? (
                        <Link
                          to={`/animaux/${e.animal_id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {e.animal.nom}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={typeColors[e.type]}>{typeLabels[e.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{e.motif || '—'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{e.provenance_destination || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle entrée registre" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div>
            <label className="label">Animal *</label>
            <select
              value={form.animal_id}
              onChange={(e) => setForm({ ...form, animal_id: e.target.value })}
              required
              className="input"
            >
              <option value="">Sélectionner un animal...</option>
              {animaux.map((a) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as RegistreType })}
              className="input"
            >
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
            </select>
          </div>
          <div>
            <label className="label">Motif</label>
            <input
              type="text"
              value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
              className="input"
              placeholder="Prise en charge, adoption, décès..."
            />
          </div>
          <div>
            <label className="label">Provenance / Destination</label>
            <input
              type="text"
              value={form.provenance_destination}
              onChange={(e) => setForm({ ...form, provenance_destination: e.target.value })}
              className="input"
              placeholder="Rue X, Famille d'accueil Y..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer l'entrée
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailEntree} onClose={() => setDetailEntree(null)} title="Détail de l'entrée registre" size="md">
        {detailEntree && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-medium text-neutral-900">{detailEntree.numero_entree}</p>
                <p className="text-xs text-neutral-500">{formatDate(detailEntree.date)}</p>
              </div>
              <Badge className={typeColors[detailEntree.type]}>
                {typeLabels[detailEntree.type]}
              </Badge>
            </div>

            {detailEntree.animal && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Animal</div>
                <Link
                  to={`/animaux/${detailEntree.animal_id}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {detailEntree.animal.nom}
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {detailEntree.motif && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Motif</div>
                <p className="mt-1 text-sm text-neutral-900">{detailEntree.motif}</p>
              </div>
            )}

            {detailEntree.provenance_destination && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Provenance / Destination
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailEntree.provenance_destination}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
