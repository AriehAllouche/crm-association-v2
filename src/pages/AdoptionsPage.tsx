import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Heart, Search, Filter, Loader2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { adoptionStatutLabels, formatDate, formatCurrency } from '../lib/constants';
import type { Adoption, AdoptionStatut, Animal } from '../types';

const statutFilters: AdoptionStatut[] = [
  'candidature',
  'pre_visite',
  'visio',
  'validee',
  'contrat_signe',
  'paiement_recu',
  'icad_change',
  'adoptee',
  'post_visite',
  'refusee',
];

const statutColors: Record<AdoptionStatut, string> = {
  candidature: 'bg-secondary-100 text-secondary-800',
  pre_visite: 'bg-secondary-100 text-secondary-700',
  visio: 'bg-primary-100 text-primary-700',
  validee: 'bg-primary-100 text-primary-800',
  contrat_signe: 'bg-success-100 text-success-800',
  paiement_recu: 'bg-success-100 text-success-700',
  icad_change: 'bg-success-100 text-success-700',
  adoptee: 'bg-success-200 text-success-900',
  post_visite: 'bg-accent-100 text-accent-800',
  refusee: 'bg-error-100 text-error-700',
};

const emptyForm = {
  animal_id: '',
  adoptant_nom: '',
  adoptant_prenom: '',
  adoptant_telephone: '',
  adoptant_email: '',
  adoptant_adresse: '',
  montant_adoption: '',
  notes: '',
};

export function AdoptionsPage() {
  const [loading, setLoading] = useState(true);
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<AdoptionStatut | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailAdoption, setDetailAdoption] = useState<Adoption | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdoptions();
    fetchAnimaux();
  }, []);

  const fetchAdoptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('adoptions')
      .select('*, animal:animals(*)')
      .order('date_candidature', { ascending: false });

    if (error) {
      console.error('Error fetching adoptions:', error);
    } else {
      setAdoptions((data ?? []) as Adoption[]);
    }
    setLoading(false);
  };

  const fetchAnimaux = async () => {
    const { data } = await supabase.from('animals').select('id, nom').order('nom');
    setAnimaux((data ?? []) as Animal[]);
  };

  const filtered = adoptions.filter((a) => {
    const matchSearch =
      !search ||
      a.adoptant_nom.toLowerCase().includes(search.toLowerCase()) ||
      a.adoptant_prenom?.toLowerCase().includes(search.toLowerCase()) ||
      a.animal?.nom.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || a.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      animal_id: form.animal_id,
      adoptant_nom: form.adoptant_nom,
      adoptant_prenom: form.adoptant_prenom || null,
      adoptant_telephone: form.adoptant_telephone || null,
      adoptant_email: form.adoptant_email || null,
      adoptant_adresse: form.adoptant_adresse || null,
      montant_adoption: form.montant_adoption ? Number(form.montant_adoption) : null,
      notes: form.notes || null,
      statut: 'candidature' as AdoptionStatut,
      date_candidature: new Date().toISOString(),
      paiement_recu: false,
      post_visite_effectuee: false,
    };

    try {
      const { error } = await supabase.from('adoptions').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchAdoptions();
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
        title="Adoptions"
        subtitle={`${adoptions.length} adoption${adoptions.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouvelle adoption
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par adoptant, animal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as AdoptionStatut | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            {statutFilters.map((s) => (
              <option key={s} value={s}>
                {adoptionStatutLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucune adoption trouvée"
          description="Enregistrez une nouvelle candidature d'adoption pour suivre le processus."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvelle adoption
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
                  <th className="px-4 py-3">Adoptant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Candidature</th>
                  <th className="px-4 py-3">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setDetailAdoption(a)}
                    className="cursor-pointer table-row-hover"
                  >
                    <td className="px-4 py-3">
                      {a.animal ? (
                        <Link
                          to={`/animaux/${a.animal_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {a.animal.nom}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {a.adoptant_prenom} {a.adoptant_nom}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statutColors[a.statut]}>{adoptionStatutLabels[a.statut]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(a.date_candidature)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{formatCurrency(a.montant_adoption)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle adoption" size="lg">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom de l'adoptant *</label>
              <input
                type="text"
                value={form.adoptant_nom}
                onChange={(e) => setForm({ ...form, adoptant_nom: e.target.value })}
                required
                className="input"
                placeholder="Bernard"
              />
            </div>
            <div>
              <label className="label">Prénom de l'adoptant</label>
              <input
                type="text"
                value={form.adoptant_prenom}
                onChange={(e) => setForm({ ...form, adoptant_prenom: e.target.value })}
                className="input"
                placeholder="Marie"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={form.adoptant_telephone}
                onChange={(e) => setForm({ ...form, adoptant_telephone: e.target.value })}
                className="input"
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.adoptant_email}
                onChange={(e) => setForm({ ...form, adoptant_email: e.target.value })}
                className="input"
                placeholder="marie.bernard@email.fr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input
                type="text"
                value={form.adoptant_adresse}
                onChange={(e) => setForm({ ...form, adoptant_adresse: e.target.value })}
                className="input"
                placeholder="5 avenue des Fleurs, 69000 Lyon"
              />
            </div>
            <div>
              <label className="label">Montant d'adoption (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.montant_adoption}
                onChange={(e) => setForm({ ...form, montant_adoption: e.target.value })}
                className="input"
                placeholder="200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="input"
                placeholder="Informations sur la candidature..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer l'adoption
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailAdoption} onClose={() => setDetailAdoption(null)} title="Détail de l'adoption" size="lg">
        {detailAdoption && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-neutral-900">
                  {detailAdoption.adoptant_prenom} {detailAdoption.adoptant_nom}
                </h3>
                <p className="text-xs text-neutral-500">
                  Candidature du {formatDate(detailAdoption.date_candidature)}
                </p>
              </div>
              <Badge className={statutColors[detailAdoption.statut]}>
                {adoptionStatutLabels[detailAdoption.statut]}
              </Badge>
            </div>

            {detailAdoption.animal && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Animal</div>
                <Link
                  to={`/animaux/${detailAdoption.animal_id}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {detailAdoption.animal.nom}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailAdoption.adoptant_telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Phone size={14} /> Téléphone
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailAdoption.adoptant_telephone}</p>
                </div>
              )}
              {detailAdoption.adoptant_email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Mail size={14} /> Email
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailAdoption.adoptant_email}</p>
                </div>
              )}
              {detailAdoption.adoptant_adresse && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <MapPin size={14} /> Adresse
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailAdoption.adoptant_adresse}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Montant</div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {formatCurrency(detailAdoption.montant_adoption)}
                </p>
              </div>
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Paiement reçu</div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {detailAdoption.paiement_recu ? 'Oui' : 'Non'}
                </p>
              </div>
            </div>

            {detailAdoption.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailAdoption.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
