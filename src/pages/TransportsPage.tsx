import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Truck, Search, Filter, Loader2, ArrowRight, FileText, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { transportStatutLabels, formatDate, formatCurrency } from '../lib/constants';
import type { Transport, TransportStatut, TransportType, Animal } from '../types';

const statutFilters: TransportStatut[] = ['planifie', 'en_cours', 'termine', 'annule'];

const statutColors: Record<TransportStatut, string> = {
  planifie: 'bg-secondary-100 text-secondary-800',
  en_cours: 'bg-primary-100 text-primary-800',
  termine: 'bg-success-100 text-success-700',
  annule: 'bg-error-100 text-error-700',
};

const typeLabels: Record<TransportType, string> = {
  covoiturage: 'Covoiturage',
  transporteur: 'Transporteur',
  benevole: 'Bénévole',
};

const emptyForm = {
  animal_id: '',
  type: 'benevole' as TransportType,
  transporteur_nom: '',
  transporteur_contact: '',
  lieu_depart: '',
  lieu_arrivee: '',
  date_transport: '',
  heure_depart: '',
  heure_arrivee: '',
  cout: '',
  notes: '',
};

export function TransportsPage() {
  const [loading, setLoading] = useState(true);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<TransportStatut | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailTransport, setDetailTransport] = useState<Transport | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransports();
    fetchAnimaux();
  }, []);

  const fetchTransports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transports')
      .select('*, animal:animals(*)')
      .order('date_transport', { ascending: false });

    if (error) {
      console.error('Error fetching transports:', error);
    } else {
      setTransports((data ?? []) as Transport[]);
    }
    setLoading(false);
  };

  const fetchAnimaux = async () => {
    const { data } = await supabase.from('animals').select('id, nom').order('nom');
    setAnimaux((data ?? []) as Animal[]);
  };

  const filtered = transports.filter((t) => {
    const matchSearch =
      !search ||
      t.transporteur_nom?.toLowerCase().includes(search.toLowerCase()) ||
      t.lieu_depart?.toLowerCase().includes(search.toLowerCase()) ||
      t.lieu_arrivee?.toLowerCase().includes(search.toLowerCase()) ||
      t.animal?.nom.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || t.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      animal_id: form.animal_id,
      type: form.type,
      transporteur_nom: form.transporteur_nom || null,
      transporteur_contact: form.transporteur_contact || null,
      lieu_depart: form.lieu_depart || null,
      lieu_arrivee: form.lieu_arrivee || null,
      date_transport: form.date_transport || new Date().toISOString(),
      heure_depart: form.heure_depart || null,
      heure_arrivee: form.heure_arrivee || null,
      cout: form.cout ? Number(form.cout) : null,
      notes: form.notes || null,
      statut: 'planifie' as TransportStatut,
    };

    try {
      const { error } = await supabase.from('transports').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchTransports();
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
        title="Transports"
        subtitle={`${transports.length} transport${transports.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouveau transport
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par transporteur, lieu, animal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as TransportStatut | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            {statutFilters.map((s) => (
              <option key={s} value={s}>
                {transportStatutLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Aucun transport trouvé"
          description="Planifiez un transport pour suivre les déplacements d'animaux."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouveau transport
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Animal</th>
                  <th className="px-4 py-3">Trajet</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Transporteur</th>
                  <th className="px-4 py-3">Coût</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setDetailTransport(t)}
                    className="cursor-pointer table-row-hover"
                  >
                    <td className="px-4 py-3">
                      {t.animal ? (
                        <Link
                          to={`/animaux/${t.animal_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {t.animal.nom}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      <span>{t.lieu_depart || '—'}</span>
                      <ArrowRight size={14} className="mx-1 inline text-neutral-400" />
                      <span>{t.lieu_arrivee || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(t.date_transport)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{t.transporteur_nom || '—'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{formatCurrency(t.cout)}</td>
                    <td className="px-4 py-3">
                      <Badge className={statutColors[t.statut]}>{transportStatutLabels[t.statut]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau transport" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label className="label">Type de transport</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TransportType })}
                className="input"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nom du transporteur</label>
              <input
                type="text"
                value={form.transporteur_nom}
                onChange={(e) => setForm({ ...form, transporteur_nom: e.target.value })}
                className="input"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="label">Contact du transporteur</label>
              <input
                type="text"
                value={form.transporteur_contact}
                onChange={(e) => setForm({ ...form, transporteur_contact: e.target.value })}
                className="input"
                placeholder="Téléphone / email"
              />
            </div>
            <div>
              <label className="label">Lieu de départ</label>
              <input
                type="text"
                value={form.lieu_depart}
                onChange={(e) => setForm({ ...form, lieu_depart: e.target.value })}
                className="input"
                placeholder="Lyon"
              />
            </div>
            <div>
              <label className="label">Lieu d'arrivée</label>
              <input
                type="text"
                value={form.lieu_arrivee}
                onChange={(e) => setForm({ ...form, lieu_arrivee: e.target.value })}
                className="input"
                placeholder="Marseille"
              />
            </div>
            <div>
              <label className="label">Date du transport</label>
              <input
                type="date"
                value={form.date_transport}
                onChange={(e) => setForm({ ...form, date_transport: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Coût (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.cout}
                onChange={(e) => setForm({ ...form, cout: e.target.value })}
                className="input"
                placeholder="50"
              />
            </div>
            <div>
              <label className="label">Heure de départ</label>
              <input
                type="time"
                value={form.heure_depart}
                onChange={(e) => setForm({ ...form, heure_depart: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Heure d'arrivée</label>
              <input
                type="time"
                value={form.heure_arrivee}
                onChange={(e) => setForm({ ...form, heure_arrivee: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="input"
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer le transport
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailTransport} onClose={() => setDetailTransport(null)} title="Détail du transport" size="lg">
        {detailTransport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-neutral-900">
                  {detailTransport.lieu_depart || '—'} → {detailTransport.lieu_arrivee || '—'}
                </h3>
                <p className="text-xs text-neutral-500">{typeLabels[detailTransport.type]}</p>
              </div>
              <Badge className={statutColors[detailTransport.statut]}>
                {transportStatutLabels[detailTransport.statut]}
              </Badge>
            </div>

            {detailTransport.animal && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Animal</div>
                <Link
                  to={`/animaux/${detailTransport.animal_id}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {detailTransport.animal.nom}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <Calendar size={14} /> Date
                </div>
                <p className="mt-1 text-sm text-neutral-900">{formatDate(detailTransport.date_transport)}</p>
                {detailTransport.heure_depart && (
                  <p className="text-xs text-neutral-500">
                    {detailTransport.heure_depart}
                    {detailTransport.heure_arrivee && ` → ${detailTransport.heure_arrivee}`}
                  </p>
                )}
              </div>
              {detailTransport.cout != null && (
                <div className="card p-3">
                  <div className="text-xs font-medium uppercase text-neutral-400">Coût</div>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {formatCurrency(detailTransport.cout)}
                  </p>
                </div>
              )}
              {detailTransport.transporteur_nom && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <User size={14} /> Transporteur
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailTransport.transporteur_nom}</p>
                  {detailTransport.transporteur_contact && (
                    <p className="text-xs text-neutral-500">{detailTransport.transporteur_contact}</p>
                  )}
                </div>
              )}
            </div>

            {detailTransport.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailTransport.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
