import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Stethoscope, Search, Loader2, Phone, Mail, MapPin, FileText, Handshake, Dog, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/constants';
import type { Veterinaire, Animal } from '../types';

interface VetVisitWithAnimal {
  id: string;
  animal_id: string;
  date_visite: string;
  motif: string;
  diagnostic?: string;
  cout?: number;
  animal: Animal;
}

const emptyForm = {
  nom: '',
  prenom: '',
  clinique: '',
  adresse: '',
  code_postal: '',
  ville: '',
  telephone: '',
  email: '',
  tarif_consultation: '',
  tarif_chirurgie: '',
  tarif_sterilisation: '',
  notes: '',
  partenaire: false,
};

export function VeterinairesPage() {
  const [loading, setLoading] = useState(true);
  const [veterinaires, setVeterinaires] = useState<Veterinaire[]>([]);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailVeto, setDetailVeto] = useState<Veterinaire | null>(null);
  const [detailVisites, setDetailVisites] = useState<VetVisitWithAnimal[]>([]);
  const [loadingVisites, setLoadingVisites] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchVeterinaires();
  }, []);

  const fetchVeterinaires = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('veterinaires')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching veterinaires:', error);
    } else {
      setVeterinaires((data ?? []) as Veterinaire[]);
    }
    setLoading(false);
  };

  const fetchVetVisites = async (vetId: string) => {
    setLoadingVisites(true);
    try {
      const { data, error } = await supabase
        .from('veterinaire_visites')
        .select('id, animal_id, date_visite, motif, diagnostic, cout, animal:animals(id, nom, espece, photo_url, statut)')
        .eq('veterinaire_id', vetId)
        .order('date_visite', { ascending: false });

      if (error) throw error;
      setDetailVisites((data ?? []) as unknown as VetVisitWithAnimal[]);
    } catch (err) {
      console.error('Error fetching visites:', err);
      setDetailVisites([]);
    } finally {
      setLoadingVisites(false);
    }
  };

  const handleOpenDetail = (vet: Veterinaire) => {
    setDetailVeto(vet);
    fetchVetVisites(vet.id);
  };

  const handleCloseDetail = () => {
    setDetailVeto(null);
    setDetailVisites([]);
  };

  const handleDelete = async () => {
    if (!detailVeto) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('veterinaires').delete().eq('id', detailVeto.id);
      if (error) throw new Error(error.message);
      setShowDeleteConfirm(false);
      handleCloseDetail();
      fetchVeterinaires();
    } catch (err) {
      console.error('Error deleting veterinaire:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Get unique animals from visites
  const getUniqueAnimals = (): VetVisitWithAnimal[] => {
    const seen = new Set<string>();
    return detailVisites.filter((v) => {
      if (seen.has(v.animal_id)) return false;
      seen.add(v.animal_id);
      return true;
    });
  };

  const filtered = veterinaires.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.nom.toLowerCase().includes(q) ||
      v.prenom?.toLowerCase().includes(q) ||
      v.clinique?.toLowerCase().includes(q) ||
      v.ville?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nom: form.nom,
      prenom: form.prenom || null,
      clinique: form.clinique || null,
      adresse: form.adresse || null,
      code_postal: form.code_postal || null,
      ville: form.ville || null,
      telephone: form.telephone || null,
      email: form.email || null,
      tarif_consultation: form.tarif_consultation ? Number(form.tarif_consultation) : null,
      tarif_chirurgie: form.tarif_chirurgie ? Number(form.tarif_chirurgie) : null,
      tarif_sterilisation: form.tarif_sterilisation ? Number(form.tarif_sterilisation) : null,
      notes: form.notes || null,
      partenaire: form.partenaire,
    };

    try {
      const { error } = await supabase.from('veterinaires').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchVeterinaires();
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
        title="Vétérinaires"
        subtitle={`${veterinaires.length} vétérinaire${veterinaires.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouveau vétérinaire
          </button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, clinique, ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucun vétérinaire trouvé"
          description="Ajoutez un vétérinaire pour suivre les soins et les tarifs pratiqués."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouveau vétérinaire
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              onClick={() => handleOpenDetail(v)}
              className="card cursor-pointer p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-neutral-900">
                    {v.prenom} {v.nom}
                  </h3>
                  {v.clinique && (
                    <p className="mt-0.5 text-sm text-neutral-500">{v.clinique}</p>
                  )}
                </div>
                {v.partenaire && (
                  <Badge className="bg-primary-100 text-primary-700">
                    <Handshake size={12} className="mr-1" />
                    Partenaire
                  </Badge>
                )}
              </div>

              {v.ville && (
                <p className="mt-3 flex items-center gap-1 text-sm text-neutral-500">
                  <MapPin size={14} />
                  {v.ville}
                </p>
              )}
              {v.telephone && (
                <p className="mt-1 flex items-center gap-1 text-sm text-neutral-600">
                  <Phone size={14} className="text-neutral-400" />
                  {v.telephone}
                </p>
              )}

              <div className="mt-4 space-y-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
                {v.tarif_consultation != null && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Consultation</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(v.tarif_consultation)}</span>
                  </div>
                )}
                {v.tarif_chirurgie != null && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Chirurgie</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(v.tarif_chirurgie)}</span>
                  </div>
                )}
                {v.tarif_sterilisation != null && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Stérilisation</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(v.tarif_sterilisation)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau vétérinaire" size="lg">
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
                placeholder="Dubois"
              />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="input"
                placeholder="Claire"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Clinique</label>
              <input
                type="text"
                value={form.clinique}
                onChange={(e) => setForm({ ...form, clinique: e.target.value })}
                className="input"
                placeholder="Clinique Vétérinaire du Parc"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="input"
                placeholder="10 rue de la Santé"
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
                placeholder="contact@clinique.fr"
              />
            </div>
            <div>
              <label className="label">Tarif consultation (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.tarif_consultation}
                onChange={(e) => setForm({ ...form, tarif_consultation: e.target.value })}
                className="input"
                placeholder="45"
              />
            </div>
            <div>
              <label className="label">Tarif chirurgie (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.tarif_chirurgie}
                onChange={(e) => setForm({ ...form, tarif_chirurgie: e.target.value })}
                className="input"
                placeholder="350"
              />
            </div>
            <div>
              <label className="label">Tarif stérilisation (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.tarif_sterilisation}
                onChange={(e) => setForm({ ...form, tarif_sterilisation: e.target.value })}
                className="input"
                placeholder="180"
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
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.partenaire}
                  onChange={(e) => setForm({ ...form, partenaire: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                Vétérinaire partenaire de l'association
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer le vétérinaire
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailVeto} onClose={handleCloseDetail} title="Detail du veterinaire" size="lg">
        {detailVeto && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-neutral-900">
                  {detailVeto.prenom} {detailVeto.nom}
                </h3>
                {detailVeto.clinique && (
                  <p className="text-sm text-neutral-500">{detailVeto.clinique}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {detailVeto.partenaire && (
                  <Badge className="bg-primary-100 text-primary-700">
                    <Handshake size={12} className="mr-1" />
                    Partenaire
                  </Badge>
                )}
                <button onClick={() => setShowDeleteConfirm(true)} className="btn-ghost text-error-600 hover:bg-error-50">
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailVeto.telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Phone size={14} /> Telephone
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailVeto.telephone}</p>
                </div>
              )}
              {detailVeto.email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Mail size={14} /> Email
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailVeto.email}</p>
                </div>
              )}
              {detailVeto.adresse && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <MapPin size={14} /> Adresse
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">
                    {detailVeto.adresse}
                    {detailVeto.code_postal && `, ${detailVeto.code_postal}`}
                    {detailVeto.ville && ` ${detailVeto.ville}`}
                  </p>
                </div>
              )}
            </div>

            <div className="card p-4">
              <h4 className="mb-3 text-sm font-semibold text-neutral-900">Tarifs</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-xs text-neutral-500">Consultation</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatCurrency(detailVeto.tarif_consultation)}
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-xs text-neutral-500">Chirurgie</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatCurrency(detailVeto.tarif_chirurgie)}
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-xs text-neutral-500">Sterilisation</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatCurrency(detailVeto.tarif_sterilisation)}
                  </p>
                </div>
              </div>
            </div>

            {detailVeto.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailVeto.notes}</p>
              </div>
            )}

            {/* Animaux suivis */}
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="mb-3 font-medium text-neutral-900">Animaux suivis</h4>
              {loadingVisites ? (
                <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-neutral-400" /></div>
              ) : getUniqueAnimals().length === 0 ? (
                <EmptyState icon={Dog} title="Aucun animal" description="Ce veterinaire n'a pas encore vu d'animaux." />
              ) : (
                <div className="space-y-2">
                  {getUniqueAnimals().map((v) => (
                    <Link key={v.id} to={`/animaux/${v.animal_id}`} className="card flex items-center gap-3 p-3 transition-colors hover:bg-neutral-50">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {v.animal.photo_url ? (
                          <img src={v.animal.photo_url} alt={v.animal.nom} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Dog size={20} className="text-neutral-400" /></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{v.animal.nom}</p>
                        <p className="text-xs text-neutral-500">
                          Derniere visite: {formatDate(v.date_visite)} — {v.motif}
                        </p>
                      </div>
                      <Badge className="bg-neutral-100 text-neutral-600">
                        {detailVisites.filter((x) => x.animal_id === v.animal_id).length} visite{detailVisites.filter((x) => x.animal_id === v.animal_id).length > 1 ? 's' : ''}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && detailVeto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md p-6">
            <h3 className="font-heading text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Voulez-vous vraiment supprimer le veterinaire <strong>{detailVeto.prenom} {detailVeto.nom}</strong> ?
              Les visites associees seront conservees mais ne seront plus liees a ce veterinaire.
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
