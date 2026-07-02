import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Flag, Search, Filter, AlertTriangle, Loader2, MapPin, User, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import {
  signalementStatutLabels,
  signalementUrgenceLabels,
  signalementUrgenceColors,
  formatDate,
} from '../lib/constants';
import type { Signalement, SignalementStatut, SignalementUrgence } from '../types';

const statutFilters: SignalementStatut[] = ['nouveau', 'en_cours', 'traite', 'cloture'];
const urgenceOptions: SignalementUrgence[] = ['faible', 'normal', 'urgent', 'critique'];

const statutColors: Record<SignalementStatut, string> = {
  nouveau: 'bg-warning-100 text-warning-800',
  en_cours: 'bg-secondary-100 text-secondary-800',
  traite: 'bg-success-100 text-success-700',
  cloture: 'bg-neutral-100 text-neutral-500',
};

function generateNumeroDossier(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SIG-${ymd}-${rand}`;
}

const emptyForm = {
  declarant_nom: '',
  declarant_prenom: '',
  declarant_telephone: '',
  declarant_email: '',
  lieu_signalement: '',
  motif: '',
  description: '',
  urgence: 'normal' as SignalementUrgence,
};

export function SignalementsPage() {
  const [loading, setLoading] = useState(true);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<SignalementStatut | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailSignalement, setDetailSignalement] = useState<Signalement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignalements();
  }, []);

  const fetchSignalements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('signalements')
      .select('*, animal:animals(*)')
      .order('date_signalement', { ascending: false });

    if (error) {
      console.error('Error fetching signalements:', error);
    } else {
      setSignalements((data ?? []) as Signalement[]);
    }
    setLoading(false);
  };

  const filtered = signalements.filter((s) => {
    const matchSearch =
      !search ||
      s.numero_dossier.toLowerCase().includes(search.toLowerCase()) ||
      s.declarant_nom.toLowerCase().includes(search.toLowerCase()) ||
      s.lieu_signalement?.toLowerCase().includes(search.toLowerCase()) ||
      s.motif.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || s.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      numero_dossier: generateNumeroDossier(),
      statut: 'nouveau' as SignalementStatut,
      date_signalement: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('signalements').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchSignalements();
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
        title="Signalements"
        subtitle={`${signalements.length} signalement${signalements.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouveau signalement
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, déclarant, lieu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as SignalementStatut | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            {statutFilters.map((s) => (
              <option key={s} value={s}>
                {signalementStatutLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Aucun signalement trouvé"
          description="Créez un nouveau signalement pour enregistrer une alerte ou une plainte."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouveau signalement
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">N° dossier</th>
                  <th className="px-4 py-3">Déclarant</th>
                  <th className="px-4 py-3">Lieu</th>
                  <th className="px-4 py-3">Urgence</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setDetailSignalement(s)}
                    className="cursor-pointer table-row-hover"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-medium text-neutral-900">{s.numero_dossier}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {s.declarant_prenom} {s.declarant_nom}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{s.lieu_signalement || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={signalementUrgenceColors[s.urgence]}>
                        {signalementUrgenceLabels[s.urgence]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statutColors[s.statut]}>{signalementStatutLabels[s.statut]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(s.date_signalement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau signalement" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom du déclarant *</label>
              <input
                type="text"
                value={form.declarant_nom}
                onChange={(e) => setForm({ ...form, declarant_nom: e.target.value })}
                required
                className="input"
                placeholder="Dupont"
              />
            </div>
            <div>
              <label className="label">Prénom du déclarant</label>
              <input
                type="text"
                value={form.declarant_prenom}
                onChange={(e) => setForm({ ...form, declarant_prenom: e.target.value })}
                className="input"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={form.declarant_telephone}
                onChange={(e) => setForm({ ...form, declarant_telephone: e.target.value })}
                className="input"
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.declarant_email}
                onChange={(e) => setForm({ ...form, declarant_email: e.target.value })}
                className="input"
                placeholder="jean.dupont@email.fr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lieu du signalement</label>
              <input
                type="text"
                value={form.lieu_signalement}
                onChange={(e) => setForm({ ...form, lieu_signalement: e.target.value })}
                className="input"
                placeholder="Lyon 7e, près du parc..."
              />
            </div>
            <div>
              <label className="label">Motif *</label>
              <input
                type="text"
                value={form.motif}
                onChange={(e) => setForm({ ...form, motif: e.target.value })}
                required
                className="input"
                placeholder="Animal errant, maltraitance..."
              />
            </div>
            <div>
              <label className="label">Niveau d'urgence</label>
              <select
                value={form.urgence}
                onChange={(e) => setForm({ ...form, urgence: e.target.value as SignalementUrgence })}
                className="input"
              >
                {urgenceOptions.map((u) => (
                  <option key={u} value={u}>{signalementUrgenceLabels[u]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="input"
                placeholder="Décrivez la situation en détail..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer le signalement
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailSignalement} onClose={() => setDetailSignalement(null)} title="Détail du signalement" size="lg">
        {detailSignalement && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-medium text-neutral-900">{detailSignalement.numero_dossier}</p>
                <p className="text-xs text-neutral-500">Créé le {formatDate(detailSignalement.date_signalement)}</p>
              </div>
              <div className="flex gap-2">
                <Badge className={signalementUrgenceColors[detailSignalement.urgence]}>
                  {signalementUrgenceLabels[detailSignalement.urgence]}
                </Badge>
                <Badge className={statutColors[detailSignalement.statut]}>
                  {signalementStatutLabels[detailSignalement.statut]}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <User size={14} /> Déclarant
                </div>
                <p className="mt-1 text-sm text-neutral-900">
                  {detailSignalement.declarant_prenom} {detailSignalement.declarant_nom}
                </p>
              </div>
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <MapPin size={14} /> Lieu
                </div>
                <p className="mt-1 text-sm text-neutral-900">{detailSignalement.lieu_signalement || '—'}</p>
              </div>
              {detailSignalement.declarant_telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Phone size={14} /> Téléphone
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailSignalement.declarant_telephone}</p>
                </div>
              )}
              {detailSignalement.declarant_email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Mail size={14} /> Email
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailSignalement.declarant_email}</p>
                </div>
              )}
            </div>

            <div className="card p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                <FileText size={14} /> Motif
              </div>
              <p className="mt-1 text-sm font-medium text-neutral-900">{detailSignalement.motif}</p>
            </div>

            {detailSignalement.description && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Description</div>
                <p className="mt-1 text-sm text-neutral-700">{detailSignalement.description}</p>
              </div>
            )}

            {detailSignalement.animal_id && detailSignalement.animal && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Animal associé</div>
                <Link
                  to={`/animaux/${detailSignalement.animal_id}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {detailSignalement.animal.nom}
                </Link>
              </div>
            )}

            {detailSignalement.urgence === 'critique' && (
              <div className="flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">
                <AlertTriangle size={18} />
                Signalement critique — intervention requise rapidement.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
