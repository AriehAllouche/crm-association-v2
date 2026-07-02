import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Home, Search, Loader2, Phone, Mail, MapPin, Package, Bone, FileText, Dog, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatDate } from '../lib/constants';
import type { FamilleAccueil, Animal } from '../types';

interface FamilleAccueilAnimalWithAnimal {
  id: string;
  animal_id: string;
  statut: 'prevu' | 'en_cours' | 'termine';
  date_debut?: string;
  date_fin?: string;
  motif_fin?: string;
  animal: Animal;
}

const emptyForm = {
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  adresse: '',
  code_postal: '',
  ville: '',
  departement: '',
  capacite_max: 1,
  materiel_confie: '',
  croquettes_fournies: '',
  notes: '',
};

export function FamillesAccueilPage() {
  const [loading, setLoading] = useState(true);
  const [familles, setFamilles] = useState<FamilleAccueil[]>([]);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailFamille, setDetailFamille] = useState<FamilleAccueil | null>(null);
  const [detailAnimals, setDetailAnimals] = useState<FamilleAccueilAnimalWithAnimal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchFamilles();
  }, []);

  const fetchFamilles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('famille_accueils')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching familles:', error);
    } else {
      setFamilles((data ?? []) as FamilleAccueil[]);
    }
    setLoading(false);
  };

  const fetchFamilleAnimals = async (familleId: string) => {
    setLoadingAnimals(true);
    try {
      const { data, error } = await supabase
        .from('famille_accueil_animaux')
        .select('id, animal_id, statut, date_debut, date_fin, motif_fin, animal:animals(id, nom, espece, photo_url, statut)')
        .eq('famille_accueil_id', familleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDetailAnimals((data ?? []) as FamilleAccueilAnimalWithAnimal[]);
    } catch (err) {
      console.error('Error fetching animals:', err);
      setDetailAnimals([]);
    } finally {
      setLoadingAnimals(false);
    }
  };

  const handleOpenDetail = (famille: FamilleAccueil) => {
    setDetailFamille(famille);
    fetchFamilleAnimals(famille.id);
  };

  const handleCloseDetail = () => {
    setDetailFamille(null);
    setDetailAnimals([]);
  };

  const handleDelete = async () => {
    if (!detailFamille) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('famille_accueils').delete().eq('id', detailFamille.id);
      if (error) throw new Error(error.message);
      setShowDeleteConfirm(false);
      handleCloseDetail();
      fetchFamilles();
    } catch (err) {
      console.error('Error deleting famille:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = familles.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.nom.toLowerCase().includes(q) ||
      f.prenom?.toLowerCase().includes(q) ||
      f.ville?.toLowerCase().includes(q) ||
      f.departement?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      capacite_max: Number(form.capacite_max) || 1,
      animaux_actuels: 0,
      contrat_actif: true,
      date_debut_contrat: new Date().toISOString().split('T')[0],
    };

    try {
      const { error } = await supabase.from('famille_accueils').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchFamilles();
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
        title="Familles d'accueil"
        subtitle={`${familles.length} famille${familles.length > 1 ? 's' : ''} d'accueil au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouvelle famille d'accueil
          </button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, ville, département..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Home}
          title="Aucune famille d'accueil trouvée"
          description="Ajoutez une famille d'accueil pour suivre les placements temporaires d'animaux."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvelle famille d'accueil
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              onClick={() => handleOpenDetail(f)}
              className="card cursor-pointer p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-neutral-900">
                    {f.prenom} {f.nom}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                    <MapPin size={14} />
                    {f.ville || '—'}{f.departement ? ` (${f.departement})` : ''}
                  </p>
                </div>
                {f.contrat_actif ? (
                  <Badge className="bg-success-100 text-success-700">Actif</Badge>
                ) : (
                  <Badge className="bg-neutral-100 text-neutral-500">Inactif</Badge>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                <span className="text-xs font-medium text-neutral-500">Animaux accueillis</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {f.animaux_actuels} / {f.capacite_max}
                </span>
              </div>

              {f.telephone && (
                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
                  <Phone size={14} className="text-neutral-400" />
                  {f.telephone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle famille d'accueil" size="lg">
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
                placeholder="Martin"
              />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="input"
                placeholder="Sophie"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="input"
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="sophie.martin@email.fr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="input"
                placeholder="12 rue des Lilas"
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
              <label className="label">Département</label>
              <input
                type="text"
                value={form.departement}
                onChange={(e) => setForm({ ...form, departement: e.target.value })}
                className="input"
                placeholder="69"
              />
            </div>
            <div>
              <label className="label">Capacité max</label>
              <input
                type="number"
                min={1}
                value={form.capacite_max}
                onChange={(e) => setForm({ ...form, capacite_max: Number(e.target.value) })}
                className="input"
                placeholder="2"
              />
            </div>
            <div>
              <label className="label">Matériel confié</label>
              <input
                type="text"
                value={form.materiel_confie}
                onChange={(e) => setForm({ ...form, materiel_confie: e.target.value })}
                className="input"
                placeholder="Cage, gamelles, couverture..."
              />
            </div>
            <div>
              <label className="label">Croquettes fournies</label>
              <input
                type="text"
                value={form.croquettes_fournies}
                onChange={(e) => setForm({ ...form, croquettes_fournies: e.target.value })}
                className="input"
                placeholder="Marque, quantité..."
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
              Créer la famille
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailFamille} onClose={handleCloseDetail} title="Detail de la famille d'accueil" size="lg">
        {detailFamille && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-neutral-900">
                  {detailFamille.prenom} {detailFamille.nom}
                </h3>
                {detailFamille.date_debut_contrat && (
                  <p className="text-xs text-neutral-500">
                    Contrat depuis le {formatDate(detailFamille.date_debut_contrat)}
                  </p>
                )}
              </div>
              {detailFamille.contrat_actif ? (
                <Badge className="bg-success-100 text-success-700">Contrat actif</Badge>
              ) : (
                <Badge className="bg-neutral-100 text-neutral-500">Contrat inactif</Badge>
              )}
              <button onClick={() => setShowDeleteConfirm(true)} className="btn-ghost text-error-600 hover:bg-error-50">
                <Trash2 size={16} /> Supprimer
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailFamille.telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Phone size={14} /> Telephone
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailFamille.telephone}</p>
                </div>
              )}
              {detailFamille.email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Mail size={14} /> Email
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailFamille.email}</p>
                </div>
              )}
              {detailFamille.adresse && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <MapPin size={14} /> Adresse
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">
                    {detailFamille.adresse}
                    {detailFamille.code_postal && `, ${detailFamille.code_postal}`}
                    {detailFamille.ville && ` ${detailFamille.ville}`}
                    {detailFamille.departement && ` (${detailFamille.departement})`}
                  </p>
                </div>
              )}
            </div>

            <div className="card p-3">
              <div className="text-xs font-medium uppercase text-neutral-400">Capacite</div>
              <p className="mt-1 text-sm font-semibold text-neutral-900">
                {detailFamille.animaux_actuels} animal(aux) accueilli(s) / {detailFamille.capacite_max} max
              </p>
            </div>

            {detailFamille.materiel_confie && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <Package size={14} /> Materiel confie
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailFamille.materiel_confie}</p>
              </div>
            )}

            {detailFamille.croquettes_fournies && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <Bone size={14} /> Croquettes fournies
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailFamille.croquettes_fournies}</p>
              </div>
            )}

            {detailFamille.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailFamille.notes}</p>
              </div>
            )}

            {/* Animaux liés */}
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="mb-3 font-medium text-neutral-900">Animaux accueillis</h4>
              {loadingAnimals ? (
                <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-neutral-400" /></div>
              ) : detailAnimals.length === 0 ? (
                <EmptyState icon={Dog} title="Aucun animal" description="Cette famille n'a pas encore accueilli d'animaux." />
              ) : (
                <>
                  {/* Animaux en cours */}
                  {detailAnimals.filter((a) => a.statut === 'en_cours').length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium uppercase text-neutral-400">Actuellement accueillis</p>
                      {detailAnimals.filter((a) => a.statut === 'en_cours').map((fa) => (
                        <Link key={fa.id} to={`/animaux/${fa.animal_id}`} className="card mb-2 flex items-center gap-3 p-3 transition-colors hover:bg-neutral-50">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            {fa.animal.photo_url ? (
                              <img src={fa.animal.photo_url} alt={fa.animal.nom} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center"><Dog size={20} className="text-neutral-400" /></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{fa.animal.nom}</p>
                            <p className="text-xs text-neutral-500">
                              Depuis {fa.date_debut ? formatDate(fa.date_debut) : '—'}
                            </p>
                          </div>
                          <Badge className="bg-success-100 text-success-700">En cours</Badge>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Arrivées prévues */}
                  {detailAnimals.filter((a) => a.statut === 'prevu').length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium uppercase text-neutral-400">Arrivees prevues</p>
                      {detailAnimals.filter((a) => a.statut === 'prevu').map((fa) => (
                        <Link key={fa.id} to={`/animaux/${fa.animal_id}`} className="card mb-2 flex items-center gap-3 p-3 transition-colors hover:bg-neutral-50">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            {fa.animal.photo_url ? (
                              <img src={fa.animal.photo_url} alt={fa.animal.nom} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center"><Dog size={20} className="text-neutral-400" /></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{fa.animal.nom}</p>
                            <p className="text-xs text-neutral-500">
                              Arrivee {fa.date_debut ? formatDate(fa.date_debut) : 'date non fixee'}
                            </p>
                          </div>
                          <Badge className="bg-warning-100 text-warning-800">Prevu</Badge>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Historique */}
                  {detailAnimals.filter((a) => a.statut === 'termine').length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-neutral-400">Historique</p>
                      {detailAnimals.filter((a) => a.statut === 'termine').map((fa) => (
                        <Link key={fa.id} to={`/animaux/${fa.animal_id}`} className="card mb-2 flex items-center gap-3 p-3 transition-colors hover:bg-neutral-50">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            {fa.animal.photo_url ? (
                              <img src={fa.animal.photo_url} alt={fa.animal.nom} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center"><Dog size={20} className="text-neutral-400" /></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{fa.animal.nom}</p>
                            <p className="text-xs text-neutral-500">
                              {fa.date_debut ? formatDate(fa.date_debut) : '—'} → {fa.date_fin ? formatDate(fa.date_fin) : '—'}
                              {fa.motif_fin && ` (${fa.motif_fin})`}
                            </p>
                          </div>
                          <Badge className="bg-neutral-100 text-neutral-600">Termine</Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && detailFamille && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md p-6">
            <h3 className="font-heading text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Voulez-vous vraiment supprimer la famille d'accueil <strong>{detailFamille.prenom} {detailFamille.nom}</strong> ?
              Les animaux actuellement associes seront dissocies mais pas supprimes.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary" disabled={deleting}>Annuler</button>
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
