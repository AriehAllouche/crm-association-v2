import { useEffect, useState } from 'react';
import { Plus, Building2, Search, Filter, Loader2, Phone, Mail, MapPin, FileText, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { pensionTypeLabels, formatCurrency } from '../lib/constants';
import type { Pension, PensionType } from '../types';

const typeFilters: PensionType[] = ['pension', 'fourriere', 'spa'];

const typeColors: Record<PensionType, string> = {
  pension: 'bg-primary-100 text-primary-800',
  fourriere: 'bg-warning-100 text-warning-800',
  spa: 'bg-accent-100 text-accent-800',
};

const emptyForm = {
  nom: '',
  type: 'pension' as PensionType,
  adresse: '',
  code_postal: '',
  ville: '',
  telephone: '',
  email: '',
  cout_journalier: '',
  contact_referent: '',
  notes: '',
};

export function PensionsPage() {
  const [loading, setLoading] = useState(true);
  const [pensions, setPensions] = useState<Pension[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PensionType | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailPension, setDetailPension] = useState<Pension | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPensions();
  }, []);

  const fetchPensions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pensions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pensions:', error);
    } else {
      setPensions((data ?? []) as Pension[]);
    }
    setLoading(false);
  };

  const filtered = pensions.filter((p) => {
    const matchSearch =
      !search ||
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.ville?.toLowerCase().includes(search.toLowerCase()) ||
      p.contact_referent?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nom: form.nom,
      type: form.type,
      adresse: form.adresse || null,
      code_postal: form.code_postal || null,
      ville: form.ville || null,
      telephone: form.telephone || null,
      email: form.email || null,
      cout_journalier: form.cout_journalier ? Number(form.cout_journalier) : null,
      contact_referent: form.contact_referent || null,
      notes: form.notes || null,
    };

    try {
      const { error } = await supabase.from('pensions').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchPensions();
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
        title="Pensions"
        subtitle={`${pensions.length} pension${pensions.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouvelle pension
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, ville, référent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PensionType | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les types</option>
            {typeFilters.map((t) => (
              <option key={t} value={t}>
                {pensionTypeLabels[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune pension trouvée"
          description="Ajoutez une pension, fourrière ou SPA pour suivre les lieux d'hébergement."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvelle pension
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => setDetailPension(p)}
              className="card cursor-pointer p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-neutral-900">{p.nom}</h3>
                  {p.ville && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                      <MapPin size={14} />
                      {p.ville}
                    </p>
                  )}
                </div>
                <Badge className={typeColors[p.type]}>{pensionTypeLabels[p.type]}</Badge>
              </div>

              {p.telephone && (
                <p className="mt-3 flex items-center gap-1 text-sm text-neutral-600">
                  <Phone size={14} className="text-neutral-400" />
                  {p.telephone}
                </p>
              )}

              {p.cout_journalier != null && (
                <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2">
                  <span className="text-xs text-neutral-500">Coût journalier</span>
                  <p className="text-sm font-semibold text-neutral-900">{formatCurrency(p.cout_journalier)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle pension" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                className="input"
                placeholder="Pension du Coin"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as PensionType })}
                className="input"
              >
                {Object.entries(pensionTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="input"
                placeholder="5 chemin rural"
              />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input
                type="text"
                value={form.code_postal}
                onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                className="input"
                placeholder="69000"
              />
            </div>
            <div>
              <label className="label">Ville</label>
              <input
                type="text"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className="input"
                placeholder="Lyon"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="input"
                placeholder="04 78 00 00 00"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="contact@pension.fr"
              />
            </div>
            <div>
              <label className="label">Coût journalier (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.cout_journalier}
                onChange={(e) => setForm({ ...form, cout_journalier: e.target.value })}
                className="input"
                placeholder="12"
              />
            </div>
            <div>
              <label className="label">Contact référent</label>
              <input
                type="text"
                value={form.contact_referent}
                onChange={(e) => setForm({ ...form, contact_referent: e.target.value })}
                className="input"
                placeholder="Nom du référent"
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
              Créer la pension
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailPension} onClose={() => setDetailPension(null)} title="Détail de la pension" size="lg">
        {detailPension && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold text-neutral-900">{detailPension.nom}</h3>
              <Badge className={typeColors[detailPension.type]}>{pensionTypeLabels[detailPension.type]}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailPension.telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Phone size={14} /> Téléphone
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailPension.telephone}</p>
                </div>
              )}
              {detailPension.email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Mail size={14} /> Email
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailPension.email}</p>
                </div>
              )}
              {detailPension.adresse && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <MapPin size={14} /> Adresse
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">
                    {detailPension.adresse}
                    {detailPension.code_postal && `, ${detailPension.code_postal}`}
                    {detailPension.ville && ` ${detailPension.ville}`}
                  </p>
                </div>
              )}
              {detailPension.contact_referent && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <User size={14} /> Contact référent
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailPension.contact_referent}</p>
                </div>
              )}
              {detailPension.cout_journalier != null && (
                <div className="card p-3">
                  <div className="text-xs font-medium uppercase text-neutral-400">Coût journalier</div>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {formatCurrency(detailPension.cout_journalier)}
                  </p>
                </div>
              )}
            </div>

            {detailPension.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailPension.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
