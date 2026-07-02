import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner } from '../components/ui';
import { ImageUpload } from '../components/ImageUpload';
import { animalStatutLabels, especeLabels } from '../lib/constants';
import type { Animal, AnimalStatut, AnimalEspece, AnimalSexe, SanteStatut } from '../types';

export function AnimalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: '',
    espece: 'chien' as AnimalEspece,
    race: '',
    sexe: 'inconnu' as AnimalSexe,
    date_naissance: '',
    age_estime: '',
    couleur: '',
    poids: '',
    taille: '',
    sterilise: false,
    vaccinne: false,
    numero_icad: '',
    numero_puce: '',
    statut: 'signale' as AnimalStatut,
    description: '',
    comportement: '',
    sante_statut: 'bon' as SanteStatut,
    sante_notes: '',
    photo_url: '',
    lieu_actuel: '',
    date_prise_en_charge: '',
  });

  useEffect(() => {
    if (id) fetchAnimal();
  }, [id]);

  const fetchAnimal = async () => {
    const { data, error } = await supabase.from('animals').select('*').eq('id', id).maybeSingle();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data) {
      const a = data as Animal;
      setForm({
        nom: a.nom || '',
        espece: a.espece || 'chien',
        race: a.race || '',
        sexe: a.sexe || 'inconnu',
        date_naissance: a.date_naissance || '',
        age_estime: a.age_estime || '',
        couleur: a.couleur || '',
        poids: a.poids || '',
        taille: a.taille || '',
        sterilise: a.sterilise || false,
        vaccinne: a.vaccinne || false,
        numero_icad: a.numero_icad || '',
        numero_puce: a.numero_puce || '',
        statut: a.statut || 'signale',
        description: a.description || '',
        comportement: a.comportement || '',
        sante_statut: a.sante_statut || 'bon',
        sante_notes: a.sante_notes || '',
        photo_url: a.photo_url || '',
        lieu_actuel: a.lieu_actuel || '',
        date_prise_en_charge: a.date_prise_en_charge || '',
      });
    }
    setLoading(false);
  };

  const handleImageUploaded = (url: string) => {
    setForm({ ...form, photo_url: url });
  };

  const handleImageRemoved = () => {
    setForm({ ...form, photo_url: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      date_naissance: form.date_naissance || null,
      date_prise_en_charge: form.date_prise_en_charge || null,
    };

    try {
      if (isEdit) {
        const { error } = await supabase.from('animals').update(payload).eq('id', id);
        if (error) throw new Error(error.message);
        navigate(`/animaux/${id}`);
      } else {
        const { data, error } = await supabase
          .from('animals')
          .insert(payload)
          .select('id')
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (data) {
          await supabase.from('registre_entrees_sorties').insert({
            animal_id: data.id,
            numero_entree: `ENT-${Date.now()}`,
            type: 'entree',
            motif: 'Prise en charge',
          });
          navigate(`/animaux/${data.id}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(isEdit ? `/animaux/${id}` : '/animaux')}
        className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <PageHeader
        title={isEdit ? 'Modifier la fiche' : 'Nouvelle fiche animal'}
        subtitle="Un animal = un dossier unique. Tous les modules seront reliés à cette fiche."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
        )}

        {/* Identité */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Identité</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Photo</label>
              <ImageUpload
                currentImageUrl={form.photo_url}
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleImageRemoved}
                bucket="animals"
                pathPrefix={id || undefined}
              />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
                className="input"
                placeholder="Rex"
              />
            </div>
            <div>
              <label className="label">Espèce</label>
              <select
                value={form.espece}
                onChange={(e) => setForm({ ...form, espece: e.target.value as AnimalEspece })}
                className="input"
              >
                {Object.entries(especeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Race</label>
              <input
                type="text"
                value={form.race}
                onChange={(e) => setForm({ ...form, race: e.target.value })}
                className="input"
                placeholder="Berger Australien"
              />
            </div>
            <div>
              <label className="label">Sexe</label>
              <select
                value={form.sexe}
                onChange={(e) => setForm({ ...form, sexe: e.target.value as AnimalSexe })}
                className="input"
              >
                <option value="inconnu">Inconnu</option>
                <option value="male">Mâle</option>
                <option value="femelle">Femelle</option>
              </select>
            </div>
            <div>
              <label className="label">Date de naissance</label>
              <input
                type="date"
                value={form.date_naissance}
                onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Âge estimé</label>
              <input
                type="text"
                value={form.age_estime}
                onChange={(e) => setForm({ ...form, age_estime: e.target.value })}
                className="input"
                placeholder="~2 ans"
              />
            </div>
            <div>
              <label className="label">Couleur</label>
              <input
                type="text"
                value={form.couleur}
                onChange={(e) => setForm({ ...form, couleur: e.target.value })}
                className="input"
                placeholder="Noir et feu"
              />
            </div>
            <div>
              <label className="label">Poids</label>
              <input
                type="text"
                value={form.poids}
                onChange={(e) => setForm({ ...form, poids: e.target.value })}
                className="input"
                placeholder="15 kg"
              />
            </div>
            <div>
              <label className="label">Taille</label>
              <input
                type="text"
                value={form.taille}
                onChange={(e) => setForm({ ...form, taille: e.target.value })}
                className="input"
                placeholder="Moyen"
              />
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Identification</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Numéro ICAD</label>
              <input
                type="text"
                value={form.numero_icad}
                onChange={(e) => setForm({ ...form, numero_icad: e.target.value })}
                className="input"
                placeholder="250259..."
              />
            </div>
            <div>
              <label className="label">Numéro de puce</label>
              <input
                type="text"
                value={form.numero_puce}
                onChange={(e) => setForm({ ...form, numero_puce: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Statut</label>
              <select
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value as AnimalStatut })}
                className="input"
              >
                {Object.entries(animalStatutLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date de prise en charge</label>
              <input
                type="date"
                value={form.date_prise_en_charge}
                onChange={(e) => setForm({ ...form, date_prise_en_charge: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Lieu actuel</label>
              <input
                type="text"
                value={form.lieu_actuel}
                onChange={(e) => setForm({ ...form, lieu_actuel: e.target.value })}
                className="input"
                placeholder="Famille d'accueil - 69"
              />
            </div>
            <div>
              <label className="label">URL Photo</label>
              <input
                type="text"
                value={form.photo_url}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                className="input"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="mt-4 flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.sterilise}
                onChange={(e) => setForm({ ...form, sterilise: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Stérilisé(e)
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.vaccinne}
                onChange={(e) => setForm({ ...form, vaccinne: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Vacciné(e)
            </label>
          </div>
        </div>

        {/* Santé & comportement */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Santé & comportement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">État de santé</label>
              <select
                value={form.sante_statut}
                onChange={(e) => setForm({ ...form, sante_statut: e.target.value as SanteStatut })}
                className="input"
              >
                <option value="bon">Bon</option>
                <option value="moyen">Moyen</option>
                <option value="grave">Grave</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div>
              <label className="label">Comportement</label>
              <input
                type="text"
                value={form.comportement}
                onChange={(e) => setForm({ ...form, comportement: e.target.value })}
                className="input"
                placeholder="Doux, sociable, craintif..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes de santé</label>
              <textarea
                value={form.sante_notes}
                onChange={(e) => setForm({ ...form, sante_notes: e.target.value })}
                rows={3}
                className="input"
                placeholder="Détails sur l'état de santé, traitements en cours..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="input"
                placeholder="Histoire de l'animal, circonstances de la prise en charge..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/animaux/${id}` : '/animaux')}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isEdit ? 'Enregistrer' : 'Créer la fiche'}
          </button>
        </div>
      </form>
    </div>
  );
}
