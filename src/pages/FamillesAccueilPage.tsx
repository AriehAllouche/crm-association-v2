import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Home, Search, Loader2, Phone, MapPin, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import type { FamilleAccueil } from '../types';

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
  // Nouveaux champs pour le matching
  especes_acceptees: [] as string[],
  ages_acceptes: [] as string[],
  tailles_acceptees: [] as string[],
  nombre_adultes: 1,
  nombre_enfants: 0,
  ages_enfants: '',
  autres_animaux: false,
  type_logement: '' as 'appartement' | 'maison' | '',
  superficie: '',
  peut_isoler: false,
  attestation_categorise: false,
  patience_chiot_chaton: false,
  patience_adulte_traumatise: false,
  animal_reste_seul: false,
  temps_seul: '',
  vehiculee: false,
  peut_se_deplacer: false,
  specialites: [] as string[],
};

export function FamillesAccueilPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [familles, setFamilles] = useState<FamilleAccueil[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'actifs' | 'inactifs' | 'refuses' | 'ont_adopte'>('tous');

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
    // Filtre par statut
    if (statutFilter === 'actifs' && !f.contrat_actif) return false;
    if (statutFilter === 'inactifs' && f.contrat_actif) return false;
    if (statutFilter === 'refuses' && f.statut !== 'refusee') return false;
    if (statutFilter === 'ont_adopte' && f.animaux_actuels === 0) return false;

    // Filtre par recherche
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
      nombre_adultes: Number(form.nombre_adultes) || 1,
      nombre_enfants: Number(form.nombre_enfants) || 0,
      superficie: form.superficie ? Number(form.superficie) : null,
      type_logement: form.type_logement || null,
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

      {/* Search and Filter */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, ville, département..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as any)}
            className="input"
          >
            <option value="tous">Tous les statuts</option>
            <option value="actifs">Actifs</option>
            <option value="inactifs">Inactifs</option>
            <option value="refuses">Refusés</option>
            <option value="ont_adopte">Ont adopté</option>
          </select>
        </div>
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

          {/* Section Matching Intelligent */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 font-heading text-base font-semibold text-neutral-900">
              Préférences d'accueil
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Espèces acceptées</label>
                <div className="flex flex-wrap gap-2">
                  {['chien', 'chat', 'lapin', 'autre'].map((espece) => (
                    <label key={espece} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.especes_acceptees.includes(espece)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, especes_acceptees: [...form.especes_acceptees, espece] });
                          } else {
                            setForm({ ...form, especes_acceptees: form.especes_acceptees.filter(e => e !== espece) });
                          }
                        }}
                        className="rounded border-neutral-300"
                      />
                      {espece}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Âges acceptés</label>
                <div className="flex flex-wrap gap-2">
                  {['chiot', 'adulte', 'senior'].map((age) => (
                    <label key={age} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.ages_acceptes.includes(age)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, ages_acceptes: [...form.ages_acceptes, age] });
                          } else {
                            setForm({ ...form, ages_acceptes: form.ages_acceptes.filter(a => a !== age) });
                          }
                        }}
                        className="rounded border-neutral-300"
                      />
                      {age}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Tailles acceptées</label>
                <div className="flex flex-wrap gap-2">
                  {['petit', 'moyen', 'grand'].map((taille) => (
                    <label key={taille} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.tailles_acceptees.includes(taille)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, tailles_acceptees: [...form.tailles_acceptees, taille] });
                          } else {
                            setForm({ ...form, tailles_acceptees: form.tailles_acceptees.filter(t => t !== taille) });
                          }
                        }}
                        className="rounded border-neutral-300"
                      />
                      {taille}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Spécialités</label>
                <div className="flex flex-wrap gap-2">
                  {['handicap', 'categorise', 'agressif', 'senior'].map((spec) => (
                    <label key={spec} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.specialites.includes(spec)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, specialites: [...form.specialites, spec] });
                          } else {
                            setForm({ ...form, specialites: form.specialites.filter(s => s !== spec) });
                          }
                        }}
                        className="rounded border-neutral-300"
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section Contexte Familial */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 font-heading text-base font-semibold text-neutral-900">
              Contexte familial
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nombre d'adultes</label>
                <input
                  type="number"
                  min={1}
                  value={form.nombre_adultes}
                  onChange={(e) => setForm({ ...form, nombre_adultes: Number(e.target.value) })}
                  className="input"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="label">Nombre d'enfants</label>
                <input
                  type="number"
                  min={0}
                  value={form.nombre_enfants}
                  onChange={(e) => setForm({ ...form, nombre_enfants: Number(e.target.value) })}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Âges des enfants</label>
                <input
                  type="text"
                  value={form.ages_enfants}
                  onChange={(e) => setForm({ ...form, ages_enfants: e.target.value })}
                  className="input"
                  placeholder="Ex: 2 ans, 5 ans, 8 ans"
                />
              </div>
              <div>
                <label className="label">Type de logement</label>
                <select
                  value={form.type_logement}
                  onChange={(e) => setForm({ ...form, type_logement: e.target.value as 'appartement' | 'maison' | '' })}
                  className="input"
                >
                  <option value="">Sélectionner</option>
                  <option value="appartement">Appartement</option>
                  <option value="maison">Maison</option>
                </select>
              </div>
              <div>
                <label className="label">Superficie (m²)</label>
                <input
                  type="number"
                  min={0}
                  value={form.superficie}
                  onChange={(e) => setForm({ ...form, superficie: e.target.value })}
                  className="input"
                  placeholder="Ex: 80"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autres_animaux"
                  checked={form.autres_animaux}
                  onChange={(e) => setForm({ ...form, autres_animaux: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="autres_animaux" className="text-sm text-neutral-700">
                  Présence d'autres animaux
                </label>
              </div>
            </div>
          </div>

          {/* Section Contraintes */}
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="mb-3 font-heading text-base font-semibold text-neutral-900">
              Contraintes et capacités
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="peut_isoler"
                  checked={form.peut_isoler}
                  onChange={(e) => setForm({ ...form, peut_isoler: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="peut_isoler" className="text-sm text-neutral-700">
                  Peut isoler les animaux
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attestation_categorise"
                  checked={form.attestation_categorise}
                  onChange={(e) => setForm({ ...form, attestation_categorise: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="attestation_categorise" className="text-sm text-neutral-700">
                  Attestation pour animaux catégorisés
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="patience_chiot_chaton"
                  checked={form.patience_chiot_chaton}
                  onChange={(e) => setForm({ ...form, patience_chiot_chaton: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="patience_chiot_chaton" className="text-sm text-neutral-700">
                  Patience pour chiots/chatons
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="patience_adulte_traumatise"
                  checked={form.patience_adulte_traumatise}
                  onChange={(e) => setForm({ ...form, patience_adulte_traumatise: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="patience_adulte_traumatise" className="text-sm text-neutral-700">
                  Patience pour adultes traumatisés
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="animal_reste_seul"
                  checked={form.animal_reste_seul}
                  onChange={(e) => setForm({ ...form, animal_reste_seul: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="animal_reste_seul" className="text-sm text-neutral-700">
                  L'animal reste seul
                </label>
              </div>
              <div>
                <label className="label">Temps seul (si applicable)</label>
                <input
                  type="text"
                  value={form.temps_seul}
                  onChange={(e) => setForm({ ...form, temps_seul: e.target.value })}
                  className="input"
                  placeholder="Ex: 4h par jour"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vehiculee"
                  checked={form.vehiculee}
                  onChange={(e) => setForm({ ...form, vehiculee: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="vehiculee" className="text-sm text-neutral-700">
                  Véhiculée
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="peut_se_deplacer"
                  checked={form.peut_se_deplacer}
                  onChange={(e) => setForm({ ...form, peut_se_deplacer: e.target.checked })}
                  className="rounded border-neutral-300"
                />
                <label htmlFor="peut_se_deplacer" className="text-sm text-neutral-700">
                  Peut se déplacer
                </label>
              </div>
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
    </div>
  );
}
