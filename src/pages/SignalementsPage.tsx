import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Flag, Search, Filter, AlertTriangle, Loader2, MapPin, Eye,
  AlertCircle, Skull, Baby, Camera, X, Bell,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import {
  signalementStatutLabels,
  signalementStatutColors,
  signalementStatutOrder,
  signalementUrgenceLabels,
  signalementUrgenceColors,
  signalementUrgenceCalculeeLabels,
  signalementUrgenceCalculeeColors,
  signalementUrgenceCalculeeDot,
  especeLabels,
  formatDate,
} from '../lib/constants';
import type { Signalement, SignalementStatut, SignalementUrgence, SignalementUrgenceCalculee, AnimalEspece } from '../types';
import { calculateUrgence, uploadSignalementPhoto, addSignalementEvent, generateNumeroDossier, type UrgenceFlags } from '../lib/signalementLogic';

const urgenceOptions: SignalementUrgence[] = ['faible', 'normal', 'urgent', 'critique'];
const especeOptions: AnimalEspece[] = ['chien', 'chat', 'lapin', 'cheval', 'autre'];

interface CheckboxField {
  key: keyof UrgenceFlags;
  label: string;
  icon: typeof AlertCircle;
  color: string;
}

const checkboxFields: CheckboxField[] = [
  { key: 'danger_immediat', label: 'Danger immédiat', icon: AlertTriangle, color: 'text-error-600' },
  { key: 'animal_blesse', label: 'Animal blessé', icon: AlertCircle, color: 'text-warning-600' },
  { key: 'animal_mort', label: 'Animal mort', icon: Skull, color: 'text-neutral-600' },
  { key: 'presence_enfants', label: 'Présence d\'enfants', icon: Baby, color: 'text-accent-600' },
  { key: 'animaux_visibles', label: 'Animaux visibles sur place', icon: Eye, color: 'text-secondary-600' },
];

const emptyForm = {
  declarant_nom: '',
  declarant_prenom: '',
  declarant_telephone: '',
  declarant_email: '',
  declarant_adresse: '',
  lieu_signalement: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  motif: '',
  description: '',
  urgence: 'normal' as SignalementUrgence,
  espece: '' as AnimalEspece | '',
  nombre_animaux: 1,
  animaux_visibles: false,
  danger_immediat: false,
  presence_enfants: false,
  animal_blesse: false,
  animal_mort: false,
  anonyme: false,
};

export function SignalementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<SignalementStatut | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
  const [checkingAlerts, setCheckingAlerts] = useState(false);

  const urgenceCalculee: SignalementUrgenceCalculee = calculateUrgence({
    danger_immediat: form.danger_immediat,
    animal_blesse: form.animal_blesse,
    animal_mort: form.animal_mort,
    presence_enfants: form.presence_enfants,
    animaux_visibles: form.animaux_visibles,
  });

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
      setSignalements((data ?? []) as unknown as Signalement[]);
      fetchAlertCounts(data ?? []);
    }
    setLoading(false);
  };

  const fetchAlertCounts = async (sigs: Signalement[]) => {
    if (sigs.length === 0) return;
    const sigIds = sigs.map((s) => s.id);
    const { data } = await supabase
      .from('signalement_events')
      .select('signalement_id')
      .eq('type', 'alerte')
      .in('signalement_id', sigIds)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.signalement_id] = (counts[row.signalement_id] ?? 0) + 1;
    }
    setAlertCounts(counts);
  };

  const checkAlerts = async () => {
    setCheckingAlerts(true);
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signalement-alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      fetchSignalements();
    } catch {
      // silently ignore
    }
    setCheckingAlerts(false);
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPendingPhotos((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...previews]);
  };

  const removePhoto = (index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'Accept-Language': 'fr' } },
      );
      const data = await res.json();
      if (data && data[0]) {
        setForm((prev) => ({ ...prev, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
      }
    } catch {
      // Geocoding is optional — fail silently
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const numeroDossier = generateNumeroDossier();

    const payload = {
      numero_dossier: numeroDossier,
      declarant_nom: form.anonyme ? 'Anonyme' : form.declarant_nom,
      declarant_prenom: form.anonyme ? null : form.declarant_prenom || null,
      declarant_telephone: form.anonyme ? null : form.declarant_telephone || null,
      declarant_email: form.anonyme ? null : form.declarant_email || null,
      declarant_adresse: form.declarant_adresse || null,
      lieu_signalement: form.lieu_signalement || null,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      motif: form.motif,
      description: form.description || null,
      urgence: form.urgence,
      urgence_calculee: urgenceCalculee,
      espece: form.espece || null,
      nombre_animaux: form.nombre_animaux,
      animaux_visibles: form.animaux_visibles,
      danger_immediat: form.danger_immediat,
      presence_enfants: form.presence_enfants,
      animal_blesse: form.animal_blesse,
      animal_mort: form.animal_mort,
      statut: 'nouveau' as SignalementStatut,
      date_signalement: new Date().toISOString().split('T')[0],
      created_by: user?.id ?? null,
    };

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('signalements')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      const signalementId = inserted.id;

      // Upload photos
      if (pendingPhotos.length > 0) {
        const photoRecords = [];
        for (const file of pendingPhotos) {
          const url = await uploadSignalementPhoto(signalementId, file);
          if (url) {
            const isVideo = file.type.startsWith('video/');
            photoRecords.push({
              signalement_id: signalementId,
              url,
              type_media: isVideo ? 'video' : 'photo',
            });
          }
        }
        if (photoRecords.length > 0) {
          await supabase.from('signalement_photos').insert(photoRecords);
          await addSignalementEvent(
            signalementId,
            'photo_upload',
            `${photoRecords.length} photo(s) uploadée(s)`,
            undefined,
            user?.id,
          );
        }
      }

      // Create initial timeline event
      await addSignalementEvent(
        signalementId,
        'creation',
        'Signalement créé',
        `Dossier ${numeroDossier} — Urgence: ${signalementUrgenceCalculeeLabels[urgenceCalculee]}`,
        user?.id,
      );

      setModalOpen(false);
      setForm(emptyForm);
      setPendingPhotos([]);
      setPhotoPreviews([]);
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
          <div className="flex gap-2">
            <button onClick={checkAlerts} disabled={checkingAlerts} className="btn-secondary">
              {checkingAlerts ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
              Vérifier les alertes
            </button>
            <button onClick={() => { setForm(emptyForm); setError(null); setPendingPhotos([]); setPhotoPreviews([]); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nouveau signalement
            </button>
          </div>
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
            {signalementStatutOrder.map((s) => (
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
                    onClick={() => navigate(`/signalements/${s.id}`)}
                    className="cursor-pointer table-row-hover"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-medium text-neutral-900">
                      <div className="flex items-center gap-2">
                        {s.urgence_calculee && (
                          <span className={`h-2 w-2 shrink-0 rounded-full ${signalementUrgenceCalculeeDot[s.urgence_calculee]}`} />
                        )}
                        {s.numero_dossier}
                        {alertCounts[s.id] > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-error-100 px-1.5 py-0.5 text-xs text-error-700">
                            <Bell size={10} /> {alertCounts[s.id]}
                          </span>
                        )}
                      </div>
                    </td>
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
                      <Badge className={signalementStatutColors[s.statut]}>{signalementStatutLabels[s.statut]}</Badge>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau signalement" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}

          {/* Déclarant */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Déclarant</h3>
            <label className="mb-2 flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={form.anonyme}
                onChange={(e) => setForm({ ...form, anonyme: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Signalement anonyme
            </label>
            {!form.anonyme && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nom du déclarant *</label>
                  <input type="text" value={form.declarant_nom} onChange={(e) => setForm({ ...form, declarant_nom: e.target.value })} required={!form.anonyme} className="input" placeholder="Dupont" />
                </div>
                <div>
                  <label className="label">Prénom</label>
                  <input type="text" value={form.declarant_prenom} onChange={(e) => setForm({ ...form, declarant_prenom: e.target.value })} className="input" placeholder="Jean" />
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input type="tel" value={form.declarant_telephone} onChange={(e) => setForm({ ...form, declarant_telephone: e.target.value })} className="input" placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={form.declarant_email} onChange={(e) => setForm({ ...form, declarant_email: e.target.value })} className="input" placeholder="jean.dupont@email.fr" />
                </div>
              </div>
            )}
          </div>

          {/* Lieu avec géolocalisation */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Localisation</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Lieu du signalement *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={form.lieu_signalement}
                      onChange={(e) => setForm({ ...form, lieu_signalement: e.target.value })}
                      className="input pl-10"
                      placeholder="Lyon 7e, près du parc..."
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => geocodeAddress(form.lieu_signalement)}
                    className="btn-secondary whitespace-nowrap"
                  >
                    <MapPin size={16} /> Géolocaliser
                  </button>
                </div>
                {form.latitude != null && form.longitude != null && (
                  <p className="mt-1 text-xs text-success-600">
                    Position trouvée: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Adresse exacte</label>
                <input type="text" value={form.declarant_adresse} onChange={(e) => setForm({ ...form, declarant_adresse: e.target.value })} className="input" placeholder="12 rue des Lilas, 69007 Lyon" />
              </div>
            </div>
            {form.latitude != null && form.longitude != null && (
              <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
                <iframe
                  title="Carte"
                  width="100%"
                  height="250"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.longitude - 0.01},${form.latitude - 0.008},${form.longitude + 0.01},${form.latitude + 0.008}&marker=${form.latitude},${form.longitude}`}
                />
              </div>
            )}
          </div>

          {/* Animaux concernés */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Animaux concernés</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Espèce concernée</label>
                <select value={form.espece} onChange={(e) => setForm({ ...form, espece: e.target.value as AnimalEspece | '' })} className="input">
                  <option value="">— Inconnue —</option>
                  {especeOptions.map((e) => (
                    <option key={e} value={e}>{especeLabels[e]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nombre d'animaux</label>
                <input
                  type="number"
                  min={1}
                  value={form.nombre_animaux}
                  onChange={(e) => setForm({ ...form, nombre_animaux: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Cases à cocher */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Évaluation de la situation</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {checkboxFields.map((field) => (
                <label
                  key={field.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                    form[field.key] ? 'border-primary-300 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <field.icon size={20} className={form[field.key] ? field.color : 'text-neutral-400'} />
                  <span className="text-sm font-medium text-neutral-900">{field.label}</span>
                </label>
              ))}
            </div>

            {/* Urgence calculée automatiquement */}
            <div className={`mt-4 flex items-center gap-3 rounded-lg border p-4 ${signalementUrgenceCalculeeColors[urgenceCalculee]}`}>
              <span className={`h-3 w-3 rounded-full ${signalementUrgenceCalculeeDot[urgenceCalculee]}`} />
              <div>
                <p className="text-sm font-semibold">Niveau d'urgence calculé automatiquement</p>
                <p className="text-xs opacity-80">{signalementUrgenceCalculeeLabels[urgenceCalculee]}</p>
              </div>
              <span className="ml-auto text-xs opacity-60">Déduit des cases cochées ci-dessus</span>
            </div>
          </div>

          {/* Motif et description */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Détails</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Motif *</label>
                <input type="text" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} required className="input" placeholder="Animal errant, maltraitance..." />
              </div>
              <div>
                <label className="label">Niveau d'urgence manuel (optionnel)</label>
                <select value={form.urgence} onChange={(e) => setForm({ ...form, urgence: e.target.value as SignalementUrgence })} className="input">
                  {urgenceOptions.map((u) => (
                    <option key={u} value={u}>{signalementUrgenceLabels[u]}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input" placeholder="Décrivez la situation en détail..." />
              </div>
            </div>
          </div>

          {/* Upload photos */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Photos / Vidéos</h3>
            <div className="rounded-lg border-2 border-dashed border-neutral-200 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 py-4 text-neutral-500 hover:text-neutral-700">
                <Camera size={28} className="text-neutral-400" />
                <span className="text-sm">Cliquez pour ajouter des photos ou vidéos</span>
                <input type="file" accept="image/*,video/*" multiple onChange={handlePhotoSelect} className="hidden" />
              </label>
              {photoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photoPreviews.map((url, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 rounded-full bg-neutral-900/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
    </div>
  );
}
