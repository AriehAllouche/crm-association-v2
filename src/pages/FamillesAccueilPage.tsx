import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Home, Search, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { faDisponibiliteLabels, faDisponibiliteColors } from '../lib/constants';
import type { FamilleAccueil, FaDisponibilite } from '../types';

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
  notes: '',
  date_entree_association: '',
};

export function FamillesAccueilPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [familles, setFamilles] = useState<FamilleAccueil[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      statut_disponibilite: 'disponible' as FaDisponibilite,
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
            Nouvelle famille
          </button>
        }
      />

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

      {filtered.length === 0 ? (
        <EmptyState
          icon={Home}
          title="Aucune famille d'accueil trouvée"
          description="Ajoutez une famille d'accueil pour suivre les placements temporaires d'animaux."
          action={
            <button onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouvelle famille
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => {
            const totalCap = ((f.capacite_chiens ?? 0) + (f.capacite_chats ?? 0) + (f.capacite_nac ?? 0)) || f.capacite_max;
            const places = Math.max(0, totalCap - f.animaux_actuels);
            const dispo = f.statut_disponibilite ?? 'disponible';
            return (
              <div
                key={f.id}
                onClick={() => navigate(`/familles-accueil/${f.id}`)}
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
                  <Badge className={faDisponibiliteColors[dispo as FaDisponibilite]}>
                    {faDisponibiliteLabels[dispo as FaDisponibilite]}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                  <span className="text-xs font-medium text-neutral-500">Places restantes</span>
                  <span className={`text-sm font-semibold ${places > 0 ? 'text-success-700' : 'text-error-600'}`}>
                    {places} / {totalCap}
                  </span>
                </div>

                {f.telephone && (
                  <p className="mt-3 text-sm text-neutral-600">{f.telephone}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle famille d'accueil" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required className="input" placeholder="Martin" />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input type="text" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="input" placeholder="Sophie" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input" placeholder="06 12 34 56 78" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="sophie.martin@email.fr" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="input" placeholder="12 rue des Lilas" />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input type="text" value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} className="input" placeholder="69000" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input type="text" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className="input" placeholder="Lyon" />
            </div>
            <div>
              <label className="label">Département</label>
              <input type="text" value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} className="input" placeholder="69" />
            </div>
            <div>
              <label className="label">Capacité max (globale)</label>
              <input type="number" min={1} value={form.capacite_max} onChange={(e) => setForm({ ...form, capacite_max: Number(e.target.value) })} className="input" placeholder="2" />
            </div>
            <div>
              <label className="label">Date d'entrée dans l'association</label>
              <input type="date" value={form.date_entree_association} onChange={(e) => setForm({ ...form, date_entree_association: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input" placeholder="Informations complémentaires..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer la famille
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
