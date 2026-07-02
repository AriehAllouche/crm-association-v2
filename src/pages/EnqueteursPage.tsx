import { useEffect, useState } from 'react';
import { Plus, Search, Loader2, Phone, Mail, MapPin, FileText, BadgeCheck, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { formatDate } from '../lib/constants';
import type { Enqueteur } from '../types';

const emptyForm = {
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  adresse: '',
  departements: '',
  zones_couvertes: '',
  disponibilites: '',
  date_carte_enqueteur: '',
  cotisation_payee: false,
  date_derniere_cotisation: '',
  notes: '',
};

export function EnqueteursPage() {
  const [loading, setLoading] = useState(true);
  const [enqueteurs, setEnqueteurs] = useState<Enqueteur[]>([]);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailEnqueteur, setDetailEnqueteur] = useState<Enqueteur | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnqueteurs();
  }, []);

  const fetchEnqueteurs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enqueteurs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching enqueteurs:', error);
    } else {
      setEnqueteurs((data ?? []) as Enqueteur[]);
    }
    setLoading(false);
  };

  const filtered = enqueteurs.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.nom.toLowerCase().includes(q) ||
      e.prenom?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.departements?.some((d) => d.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const departementsArray = form.departements
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const payload = {
      nom: form.nom,
      prenom: form.prenom || null,
      telephone: form.telephone || null,
      email: form.email || null,
      adresse: form.adresse || null,
      departements: departementsArray.length > 0 ? departementsArray : null,
      zones_couvertes: form.zones_couvertes || null,
      disponibilites: form.disponibilites || null,
      date_carte_enqueteur: form.date_carte_enqueteur || null,
      cotisation_payee: form.cotisation_payee,
      date_derniere_cotisation: form.date_derniere_cotisation || null,
      notes: form.notes || null,
      actif: true,
    };

    try {
      const { error } = await supabase.from('enqueteurs').insert(payload);
      if (error) throw new Error(error.message);
      setModalOpen(false);
      setForm(emptyForm);
      fetchEnqueteurs();
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
        title="Enquêteurs"
        subtitle={`${enqueteurs.length} enquêteur${enqueteurs.length > 1 ? 's' : ''} au total`}
        action={
          <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} />
            Nouvel enquêteur
          </button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, email, département..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="Aucun enquêteur trouvé"
          description="Ajoutez un enquêteur pour suivre les enquêtes de terrain."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvel enquêteur
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div
              key={e.id}
              onClick={() => setDetailEnqueteur(e)}
              className="card cursor-pointer p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-neutral-900">
                    {e.prenom} {e.nom}
                  </h3>
                  {e.telephone && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                      <Phone size={14} />
                      {e.telephone}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {e.actif ? (
                    <Badge className="bg-success-100 text-success-700">Actif</Badge>
                  ) : (
                    <Badge className="bg-neutral-100 text-neutral-500">Inactif</Badge>
                  )}
                  {e.cotisation_payee ? (
                    <Badge className="bg-primary-100 text-primary-700">
                      <BadgeCheck size={12} className="mr-1" />
                      Cotisation OK
                    </Badge>
                  ) : (
                    <Badge className="bg-error-100 text-error-700">Cotisation due</Badge>
                  )}
                </div>
              </div>

              {e.departements && e.departements.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.departements.map((d, i) => (
                    <span key={i} className="badge bg-neutral-100 text-neutral-600">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel enquêteur" size="lg">
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
                placeholder="Lefebvre"
              />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="input"
                placeholder="Paul"
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
                placeholder="paul.lefebvre@email.fr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="input"
                placeholder="3 rue de l'Enquête"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Départements (séparés par des virgules)</label>
              <input
                type="text"
                value={form.departements}
                onChange={(e) => setForm({ ...form, departements: e.target.value })}
                className="input"
                placeholder="69, 38, 01"
              />
            </div>
            <div>
              <label className="label">Zones couvertes</label>
              <input
                type="text"
                value={form.zones_couvertes}
                onChange={(e) => setForm({ ...form, zones_couvertes: e.target.value })}
                className="input"
                placeholder="Lyon et alentours"
              />
            </div>
            <div>
              <label className="label">Disponibilités</label>
              <input
                type="text"
                value={form.disponibilites}
                onChange={(e) => setForm({ ...form, disponibilites: e.target.value })}
                className="input"
                placeholder="Week-ends, soirées..."
              />
            </div>
            <div>
              <label className="label">Date carte enquêteur</label>
              <input
                type="date"
                value={form.date_carte_enqueteur}
                onChange={(e) => setForm({ ...form, date_carte_enqueteur: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date dernière cotisation</label>
              <input
                type="date"
                value={form.date_derniere_cotisation}
                onChange={(e) => setForm({ ...form, date_derniere_cotisation: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.cotisation_payee}
                  onChange={(e) => setForm({ ...form, cotisation_payee: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                Cotisation payée
              </label>
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
              Créer l'enquêteur
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailEnqueteur} onClose={() => setDetailEnqueteur(null)} title="Détail de l'enquêteur" size="lg">
        {detailEnqueteur && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-neutral-900">
                  {detailEnqueteur.prenom} {detailEnqueteur.nom}
                </h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                {detailEnqueteur.actif ? (
                  <Badge className="bg-success-100 text-success-700">Actif</Badge>
                ) : (
                  <Badge className="bg-neutral-100 text-neutral-500">Inactif</Badge>
                )}
                {detailEnqueteur.cotisation_payee ? (
                  <Badge className="bg-primary-100 text-primary-700">
                    <BadgeCheck size={12} className="mr-1" />
                    Cotisation payée
                  </Badge>
                ) : (
                  <Badge className="bg-error-100 text-error-700">Cotisation due</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailEnqueteur.telephone && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Phone size={14} /> Téléphone
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailEnqueteur.telephone}</p>
                </div>
              )}
              {detailEnqueteur.email && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Mail size={14} /> Email
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailEnqueteur.email}</p>
                </div>
              )}
              {detailEnqueteur.adresse && (
                <div className="card p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <MapPin size={14} /> Adresse
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">{detailEnqueteur.adresse}</p>
                </div>
              )}
              {detailEnqueteur.zones_couvertes && (
                <div className="card p-3">
                  <div className="text-xs font-medium uppercase text-neutral-400">Zones couvertes</div>
                  <p className="mt-1 text-sm text-neutral-900">{detailEnqueteur.zones_couvertes}</p>
                </div>
              )}
              {detailEnqueteur.disponibilites && (
                <div className="card p-3">
                  <div className="text-xs font-medium uppercase text-neutral-400">Disponibilités</div>
                  <p className="mt-1 text-sm text-neutral-900">{detailEnqueteur.disponibilites}</p>
                </div>
              )}
              {detailEnqueteur.date_carte_enqueteur && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Calendar size={14} /> Carte enquêteur
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">
                    {formatDate(detailEnqueteur.date_carte_enqueteur)}
                  </p>
                </div>
              )}
              {detailEnqueteur.date_derniere_cotisation && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                    <Calendar size={14} /> Dernière cotisation
                  </div>
                  <p className="mt-1 text-sm text-neutral-900">
                    {formatDate(detailEnqueteur.date_derniere_cotisation)}
                  </p>
                </div>
              )}
            </div>

            {detailEnqueteur.departements && detailEnqueteur.departements.length > 0 && (
              <div className="card p-3">
                <div className="text-xs font-medium uppercase text-neutral-400">Départements</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {detailEnqueteur.departements.map((d, i) => (
                    <span key={i} className="badge bg-neutral-100 text-neutral-600">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailEnqueteur.notes && (
              <div className="card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-400">
                  <FileText size={14} /> Notes
                </div>
                <p className="mt-1 text-sm text-neutral-700">{detailEnqueteur.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
