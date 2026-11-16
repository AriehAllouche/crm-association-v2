import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Heart, Search, Filter, Loader2, Phone, Mail, MapPin, FileText, ChevronRight, CheckCircle, Circle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { adoptionStatutLabels, formatDate, formatCurrency } from '../lib/constants';
import type { Adoption, AdoptionStatut, Animal } from '../types';

const statutFilters: AdoptionStatut[] = [
  'candidature',
  'pre_visite',
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
  validee: 'bg-primary-100 text-primary-800',
  contrat_signe: 'bg-success-100 text-success-800',
  paiement_recu: 'bg-success-100 text-success-700',
  icad_change: 'bg-success-100 text-success-700',
  adoptee: 'bg-success-200 text-success-900',
  post_visite: 'bg-accent-100 text-accent-800',
  refusee: 'bg-error-100 text-error-700',
};

const PIPELINE_STEPS: { statut: AdoptionStatut; label: string; dateField: string }[] = [
  { statut: 'candidature', label: 'Candidature reçue', dateField: 'date_candidature' },
  { statut: 'pre_visite', label: 'Prévisite effectuée', dateField: 'date_pre_visite' },
  { statut: 'validee', label: 'Candidature validée', dateField: 'date_validation' },
  { statut: 'contrat_signe', label: 'Contrat signé', dateField: 'date_contrat' },
  { statut: 'paiement_recu', label: 'Paiement reçu', dateField: 'paiement_recu' },
  { statut: 'icad_change', label: 'Changement ICAD', dateField: 'date_icad_change' },
  { statut: 'adoptee', label: 'Adoption finalisée', dateField: 'adoptee' },
  { statut: 'post_visite', label: 'Post-visite', dateField: 'date_post_visite' },
];

function getCurrentStepIndex(statut: AdoptionStatut): number {
  const idx = PIPELINE_STEPS.findIndex(s => s.statut === statut);
  return idx === -1 ? 0 : idx;
}

const emptyForm = {
  animal_id: '',
  adoptant_nom: '',
  adoptant_prenom: '',
  adoptant_telephone: '',
  adoptant_email: '',
  adoptant_adresse: '',
  montant_adoption: '',
  caution_sterilisation: '',
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
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
    const { data } = await supabase.from('animals').select('id, nom, numero_puce, numero_icad').order('nom');
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

    const selectedAnimal = animaux.find(a => a.id === form.animal_id);
    const payload = {
      animal_id: form.animal_id,
      adoptant_nom: form.adoptant_nom,
      adoptant_prenom: form.adoptant_prenom || null,
      adoptant_telephone: form.adoptant_telephone || null,
      adoptant_email: form.adoptant_email || null,
      adoptant_adresse: form.adoptant_adresse || null,
      montant_adoption: form.montant_adoption ? Number(form.montant_adoption) : null,
      caution_sterilisation: form.caution_sterilisation ? Number(form.caution_sterilisation) : 0,
      icad_animal: selectedAnimal?.numero_puce || selectedAnimal?.numero_icad || null,
      notes: form.notes || null,
      statut: 'candidature' as AdoptionStatut,
      date_candidature: new Date().toISOString().split('T')[0],
      paiement_recu: false,
      post_visite_effectuee: false,
      caution_versee: false,
      caution_restituee: false,
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

  const advanceStatus = async (adoption: Adoption, newStatut: AdoptionStatut) => {
    setUpdatingStatus(true);
    const updates: Record<string, unknown> = { statut: newStatut };
    const today = new Date().toISOString().split('T')[0];

    if (newStatut === 'pre_visite') updates.date_pre_visite = today;
    if (newStatut === 'validee') updates.date_validation = today;
    if (newStatut === 'contrat_signe') updates.date_contrat = today;
    if (newStatut === 'paiement_recu') { updates.paiement_recu = true; updates.date_paiement = today; }
    if (newStatut === 'icad_change') updates.date_icad_change = today;
    if (newStatut === 'adoptee') updates.date_adoption = today;
    if (newStatut === 'post_visite') { updates.date_post_visite = today; updates.post_visite_effectuee = true; }
    if (newStatut === 'refusee') updates.date_refus = today;

    try {
      const { error } = await supabase.from('adoptions').update(updates).eq('id', adoption.id);
      if (error) throw new Error(error.message);
      setDetailAdoption(prev => prev ? { ...prev, ...updates } as Adoption : null);
      fetchAdoptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleCaution = async (adoption: Adoption, field: 'caution_versee' | 'caution_restituee') => {
    const updates: Record<string, unknown> = { [field]: !adoption[field] };
    if (field === 'caution_versee' && !adoption.caution_versee) updates.date_caution_versement = new Date().toISOString().split('T')[0];
    if (field === 'caution_restituee' && !adoption.caution_restituee) updates.date_caution_restitution = new Date().toISOString().split('T')[0];

    try {
      await supabase.from('adoptions').update(updates).eq('id', adoption.id);
      setDetailAdoption(prev => prev ? { ...prev, ...updates } as Adoption : null);
      fetchAdoptions();
    } catch (err) {
      console.error('Error updating caution:', err);
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

      {/* Quick filter for ICAD pending */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setStatutFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${statutFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          Toutes
        </button>
        <button
          onClick={() => setStatutFilter('icad_change')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${statutFilter === 'icad_change' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          ICAD à faire
        </button>
        <button
          onClick={() => setStatutFilter('candidature')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${statutFilter === 'candidature' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          Nouvelles candidatures
        </button>
        <button
          onClick={() => setStatutFilter('post_visite')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${statutFilter === 'post_visite' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
        >
          Post-visites
        </button>
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
                  <th className="px-4 py-3">ICAD</th>
                  <th className="px-4 py-3">Adoptant</th>
                  <th className="px-4 py-3">Étape</th>
                  <th className="px-4 py-3">Candidature</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Caution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((a) => {
                  const stepIdx = getCurrentStepIndex(a.statut);
                  return (
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
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {a.icad_animal || a.animal?.numero_puce || a.animal?.numero_icad || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-700">
                        {a.adoptant_prenom} {a.adoptant_nom}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge className={statutColors[a.statut]}>{adoptionStatutLabels[a.statut]}</Badge>
                          <span className="text-xs text-neutral-400">{stepIdx + 1}/{PIPELINE_STEPS.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(a.date_candidature)}</td>
                      <td className="px-4 py-3 text-sm text-neutral-700">{formatCurrency(a.montant_adoption)}</td>
                      <td className="px-4 py-3 text-sm">
                        {a.caution_sterilisation ? (
                          <div className="flex items-center gap-1">
                            <span className="text-neutral-600">{formatCurrency(a.caution_sterilisation)}</span>
                            {a.caution_versee && <CheckCircle size={14} className="text-success-600" />}
                            {a.caution_restituee && <span className="text-xs text-neutral-400">(restituée)</span>}
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                <option key={a.id} value={a.id}>
                  {a.nom}{a.numero_puce ? ` (ICAD: ${a.numero_puce})` : a.numero_icad ? ` (ICAD: ${a.numero_icad})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom de l'adoptant *</label>
              <input type="text" value={form.adoptant_nom} onChange={(e) => setForm({ ...form, adoptant_nom: e.target.value })} required className="input" placeholder="Bernard" />
            </div>
            <div>
              <label className="label">Prénom de l'adoptant</label>
              <input type="text" value={form.adoptant_prenom} onChange={(e) => setForm({ ...form, adoptant_prenom: e.target.value })} className="input" placeholder="Marie" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input type="tel" value={form.adoptant_telephone} onChange={(e) => setForm({ ...form, adoptant_telephone: e.target.value })} className="input" placeholder="06 12 34 56 78" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.adoptant_email} onChange={(e) => setForm({ ...form, adoptant_email: e.target.value })} className="input" placeholder="marie.bernard@email.fr" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input type="text" value={form.adoptant_adresse} onChange={(e) => setForm({ ...form, adoptant_adresse: e.target.value })} className="input" placeholder="5 avenue des Fleurs, 69000 Lyon" />
            </div>
            <div>
              <label className="label">Frais d'adoption (€)</label>
              <input type="number" min={0} step="0.01" value={form.montant_adoption} onChange={(e) => setForm({ ...form, montant_adoption: e.target.value })} className="input" placeholder="200" />
            </div>
            <div>
              <label className="label">Caution de stérilisation (€)</label>
              <input type="number" min={0} step="0.01" value={form.caution_sterilisation} onChange={(e) => setForm({ ...form, caution_sterilisation: e.target.value })} className="input" placeholder="150" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input" placeholder="Informations sur la candidature..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer l'adoption
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal with status progression */}
      <Modal open={!!detailAdoption} onClose={() => setDetailAdoption(null)} title="Suivi de l'adoption" size="lg">
        {detailAdoption && (
          <div className="space-y-4">
            {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}

            {/* Header */}
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

            {/* Animal info */}
            {detailAdoption.animal && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Animal</div>
                <div className="mt-1 flex items-center justify-between">
                  <Link to={`/animaux/${detailAdoption.animal_id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    {detailAdoption.animal.nom}
                  </Link>
                  <span className="text-xs text-neutral-500">
                    ICAD : {detailAdoption.icad_animal || detailAdoption.animal.numero_puce || detailAdoption.animal.numero_icad || '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailAdoption.adoptant_telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400"><Phone size={14} /> Téléphone</div>
                  <p className="mt-1 text-sm text-neutral-900">{detailAdoption.adoptant_telephone}</p>
                </div>
              )}
              {detailAdoption.adoptant_email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400"><Mail size={14} /> Email</div>
                  <p className="mt-1 text-sm text-neutral-900">{detailAdoption.adoptant_email}</p>
                </div>
              )}
              {detailAdoption.adoptant_adresse && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400"><MapPin size={14} /> Adresse</div>
                  <p className="mt-1 text-sm text-neutral-900">{detailAdoption.adoptant_adresse}</p>
                </div>
              )}
            </div>

            {/* Pipeline progression */}
            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-neutral-900">Étapes du dossier</h4>
              <div className="space-y-2">
                {PIPELINE_STEPS.map((step, idx) => {
                  const currentIdx = getCurrentStepIndex(detailAdoption.statut);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isRefused = detailAdoption.statut === 'refusee';
                  const isFuture = idx > currentIdx && !isRefused;

                  return (
                    <div key={step.statut} className="flex items-center gap-3">
                      <div className="shrink-0">
                        {isDone ? <CheckCircle size={20} className="text-success-600" /> :
                         isCurrent ? <Circle size={20} className="text-primary-600 fill-primary-100" /> :
                         <Circle size={20} className="text-neutral-300" />}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm ${isDone ? 'text-neutral-500 line-through' : isCurrent ? 'font-semibold text-neutral-900' : 'text-neutral-400'}`}>
                          {step.label}
                        </span>
                      </div>
                      {isCurrent && detailAdoption.statut !== 'refusee' && idx < PIPELINE_STEPS.length - 1 && (
                        <button
                          onClick={() => advanceStatus(detailAdoption, PIPELINE_STEPS[idx + 1].statut)}
                          disabled={updatingStatus}
                          className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                        >
                          <ChevronRight size={14} className="inline" /> Avancer
                        </button>
                      )}
                    </div>
                  );
                })}
                {detailAdoption.statut !== 'refusee' && (
                  <button
                    onClick={() => advanceStatus(detailAdoption, 'refusee')}
                    disabled={updatingStatus}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-error-600 hover:text-error-700"
                  >
                    <X size={14} /> Marquer comme refusée
                  </button>
                )}
              </div>
            </div>

            {/* Financial info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Frais d'adoption</div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{formatCurrency(detailAdoption.montant_adoption)}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {detailAdoption.paiement_recu ? 'Reçu' : 'En attente'}
                </p>
              </div>
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Caution stérilisation</div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{formatCurrency(detailAdoption.caution_sterilisation)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => toggleCaution(detailAdoption, 'caution_versee')}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${detailAdoption.caution_versee ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
                  >
                    {detailAdoption.caution_versee ? 'Versée' : 'À verser'}
                  </button>
                  <button
                    onClick={() => toggleCaution(detailAdoption, 'caution_restituee')}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${detailAdoption.caution_restituee ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
                  >
                    {detailAdoption.caution_restituee ? 'Restituée' : 'À restituer'}
                  </button>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-neutral-900">Documents</h4>
              <div className="space-y-2">
                {([
                  { label: 'Contrat signé', url: detailAdoption.contrat_url },
                  { label: 'Compte rendu prévisite', url: detailAdoption.compte_rendu_previsite_url },
                  { label: 'Compte rendu post-visite', url: detailAdoption.compte_rendu_postvisite_url },
                ] as { label: string; url?: string }[]).map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                    <span className="text-sm text-neutral-700">{doc.label}</span>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                        <FileText size={14} /> Voir
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">Non fourni</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {detailAdoption.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400"><FileText size={14} /> Notes</div>
                <p className="mt-1 text-sm text-neutral-700">{detailAdoption.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
