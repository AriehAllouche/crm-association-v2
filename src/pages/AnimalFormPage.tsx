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
    species_race: '',
    race: '',
    sexe: 'inconnu' as AnimalSexe,
    gender: '',
    date_naissance: '',
    age_estime: '',
    couleur: '',
    poids: '',
    taille: '',
    sterilise: false,
    vaccinne: false,
    date_dernier_vaccin: '',
    numero_icad: '',
    icad_number: '',
    numero_puce: '',
    statut: 'signale' as AnimalStatut,
    status_pec: '',
    animal_state: '',
    withdrawal_cause: '',
    agent: '',
    date_pec: '',
    description: '',
    comportement: '',
    sante_statut: 'bon' as SanteStatut,
    sante_notes: '',
    photo_url: '',
    lieu_actuel: '',
    date_prise_en_charge: '',
    // ICAD/Documents
    icad_done: false,
    requisition: false,
    sortie_fourriere: false,
    icad_epa: false,
    icad_non_epa: false,
    certificat_cession: false,
    cni_recu: false,
    duplicata_carte: false,
    date_envoi_icad: '',
    date_valide_epa: '',
    attente_icad: false,
    // Santé
    en_pension: false,
    primo_vaccination: false,
    date_vaccin: '',
    rappel_vaccin: false,
    date_rappel: '',
    diagnose: '',
    delais_rdv: '',
    date_diagnose: '',
    sterilisation: false,
    date_sterilisation: '',
    // Adoption/Sortie
    caution: '',
    frais_adoption: '',
    adopte: false,
    adoptant_nom: '',
    lieu_intervention: '',
    date_sortie: '',
    famille_accueil_actuelle: '',
    mail_famille_accueil: '',
    // Statuts rapides
    remis_proprietaire: false,
    a_l_adoption: false,
    fa_en_vue_adoption: false,
    cedere_autre_asso: false,
    transfert_asso: false,
    perdu: false,
    reserve: false,
    vole: false,
    notes_excel: '',
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
        species_race: a.species_race || '',
        race: a.race || '',
        sexe: a.sexe || 'inconnu',
        gender: a.gender || '',
        date_naissance: a.date_naissance || '',
        age_estime: a.age_estime || '',
        couleur: a.couleur || '',
        poids: a.poids || '',
        taille: a.taille || '',
        sterilise: a.sterilise || false,
        vaccinne: a.vaccinne || false,
        date_dernier_vaccin: a.date_dernier_vaccin || '',
        numero_icad: a.numero_icad || '',
        icad_number: a.icad_number || '',
        numero_puce: a.numero_puce || '',
        statut: a.statut || 'signale',
        status_pec: a.status_pec || '',
        animal_state: a.animal_state || '',
        withdrawal_cause: a.withdrawal_cause || '',
        agent: a.agent || '',
        date_pec: a.date_pec || '',
        description: a.description || '',
        comportement: a.comportement || '',
        sante_statut: a.sante_statut || 'bon',
        sante_notes: a.sante_notes || '',
        photo_url: a.photo_url || '',
        lieu_actuel: a.lieu_actuel || '',
        date_prise_en_charge: a.date_prise_en_charge || '',
        // ICAD/Documents
        icad_done: a.icad_done || false,
        requisition: a.requisition || false,
        sortie_fourriere: a.sortie_fourriere || false,
        icad_epa: a.icad_epa || false,
        icad_non_epa: a.icad_non_epa || false,
        certificat_cession: a.certificat_cession || false,
        cni_recu: a.cni_recu || false,
        duplicata_carte: a.duplicata_carte || false,
        date_envoi_icad: a.date_envoi_icad || '',
        date_valide_epa: a.date_valide_epa || '',
        attente_icad: a.attente_icad || false,
        // Santé
        en_pension: a.en_pension || false,
        primo_vaccination: a.primo_vaccination || false,
        date_vaccin: a.date_vaccin || '',
        rappel_vaccin: a.rappel_vaccin || false,
        date_rappel: a.date_rappel || '',
        diagnose: a.diagnose || '',
        delais_rdv: a.delais_rdv || '',
        date_diagnose: a.date_diagnose || '',
        sterilisation: a.sterilisation || false,
        date_sterilisation: a.date_sterilisation || '',
        // Adoption/Sortie
        caution: a.caution || '',
        frais_adoption: a.frais_adoption || '',
        adopte: a.adopte || false,
        adoptant_nom: a.adoptant_nom || '',
        lieu_intervention: a.lieu_intervention || '',
        date_sortie: a.date_sortie || '',
        famille_accueil_actuelle: a.famille_accueil_actuelle || '',
        mail_famille_accueil: a.mail_famille_accueil || '',
        // Statuts rapides
        remis_proprietaire: a.remis_proprietaire || false,
        a_l_adoption: a.a_l_adoption || false,
        fa_en_vue_adoption: a.fa_en_vue_adoption || false,
        cedere_autre_asso: a.cedere_autre_asso || false,
        transfert_asso: a.transfert_asso || false,
        perdu: a.perdu || false,
        reserve: a.reserve || false,
        vole: a.vole || false,
        notes_excel: a.notes_excel || '',
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
      date_pec: form.date_pec || null,
      date_envoi_icad: form.date_envoi_icad || null,
      date_valide_epa: form.date_valide_epa || null,
      date_vaccin: form.date_vaccin || null,
      date_rappel: form.date_rappel || null,
      date_diagnose: form.date_diagnose || null,
      date_sterilisation: form.date_sterilisation || null,
      date_sortie: form.date_sortie || null,
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

        {/* ICAD & Documents */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">ICAD & Documents</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Agent (MODO)</label>
              <input
                type="text"
                value={form.agent}
                onChange={(e) => setForm({ ...form, agent: e.target.value })}
                className="input"
                placeholder="Morgan, Margareth..."
              />
            </div>
            <div>
              <label className="label">Date de PEC</label>
              <input
                type="date"
                value={form.date_pec}
                onChange={(e) => setForm({ ...form, date_pec: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date envoi ICAD / Date valide EPA</label>
              <input
                type="date"
                value={form.date_envoi_icad}
                onChange={(e) => setForm({ ...form, date_envoi_icad: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date valide EPA</label>
              <input
                type="date"
                value={form.date_valide_epa}
                onChange={(e) => setForm({ ...form, date_valide_epa: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.icad_done}
                onChange={(e) => setForm({ ...form, icad_done: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              ICAD fait
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.requisition}
                onChange={(e) => setForm({ ...form, requisition: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Réquisition
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.sortie_fourriere}
                onChange={(e) => setForm({ ...form, sortie_fourriere: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Sortie fourrière
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.icad_epa}
                onChange={(e) => setForm({ ...form, icad_epa: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              ICAD EPA
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.icad_non_epa}
                onChange={(e) => setForm({ ...form, icad_non_epa: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              ICAD non EPA
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.certificat_cession}
                onChange={(e) => setForm({ ...form, certificat_cession: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Certificat cession
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.cni_recu}
                onChange={(e) => setForm({ ...form, cni_recu: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              CNI reçu
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.duplicata_carte}
                onChange={(e) => setForm({ ...form, duplicata_carte: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Duplicata carte
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.attente_icad}
                onChange={(e) => setForm({ ...form, attente_icad: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Attente ICAD
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

        {/* Santé détaillée */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Suivi santé & vaccinations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Date vaccination</label>
              <input
                type="date"
                value={form.date_vaccin}
                onChange={(e) => setForm({ ...form, date_vaccin: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date rappel</label>
              <input
                type="date"
                value={form.date_rappel}
                onChange={(e) => setForm({ ...form, date_rappel: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date stérilisation</label>
              <input
                type="date"
                value={form.date_sterilisation}
                onChange={(e) => setForm({ ...form, date_sterilisation: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date diagnostic</label>
              <input
                type="date"
                value={form.date_diagnose}
                onChange={(e) => setForm({ ...form, date_diagnose: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Délais RDV</label>
              <input
                type="text"
                value={form.delais_rdv}
                onChange={(e) => setForm({ ...form, delais_rdv: e.target.value })}
                className="input"
                placeholder="2 semaines, 1 mois..."
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Diagnostic</label>
              <textarea
                value={form.diagnose}
                onChange={(e) => setForm({ ...form, diagnose: e.target.value })}
                rows={2}
                className="input"
                placeholder="Diagnostic vétérinaire..."
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.en_pension}
                onChange={(e) => setForm({ ...form, en_pension: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              En pension
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.primo_vaccination}
                onChange={(e) => setForm({ ...form, primo_vaccination: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Primo vaccination
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.rappel_vaccin}
                onChange={(e) => setForm({ ...form, rappel_vaccin: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Rappel fait
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.sterilisation}
                onChange={(e) => setForm({ ...form, sterilisation: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Stérilisé(e)
            </label>
          </div>
        </div>

        {/* Adoption & Sortie */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Adoption & Sortie</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Adoptant</label>
              <input
                type="text"
                value={form.adoptant_nom}
                onChange={(e) => setForm({ ...form, adoptant_nom: e.target.value })}
                className="input"
                placeholder="Nom de l'adoptant"
              />
            </div>
            <div>
              <label className="label">Date de sortie</label>
              <input
                type="date"
                value={form.date_sortie}
                onChange={(e) => setForm({ ...form, date_sortie: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Lieu d'intervention</label>
              <input
                type="text"
                value={form.lieu_intervention}
                onChange={(e) => setForm({ ...form, lieu_intervention: e.target.value })}
                className="input"
                placeholder="Ville, lieu..."
              />
            </div>
            <div>
              <label className="label">Caution</label>
              <input
                type="text"
                value={form.caution}
                onChange={(e) => setForm({ ...form, caution: e.target.value })}
                className="input"
                placeholder="Montant"
              />
            </div>
            <div>
              <label className="label">Frais d'adoption</label>
              <input
                type="text"
                value={form.frais_adoption}
                onChange={(e) => setForm({ ...form, frais_adoption: e.target.value })}
                className="input"
                placeholder="Montant"
              />
            </div>
            <div>
              <label className="label">Famille d'accueil actuelle</label>
              <input
                type="text"
                value={form.famille_accueil_actuelle}
                onChange={(e) => setForm({ ...form, famille_accueil_actuelle: e.target.value })}
                className="input"
                placeholder="Nom FA"
              />
            </div>
            <div>
              <label className="label">Email FA</label>
              <input
                type="email"
                value={form.mail_famille_accueil}
                onChange={(e) => setForm({ ...form, mail_famille_accueil: e.target.value })}
                className="input"
                placeholder="email@exemple.com"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.adopte}
                onChange={(e) => setForm({ ...form, adopte: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Adopté
            </label>
          </div>
        </div>

        {/* Statuts rapides */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Statuts rapides</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.remis_proprietaire}
                onChange={(e) => setForm({ ...form, remis_proprietaire: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Remis à propriétaire
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.a_l_adoption}
                onChange={(e) => setForm({ ...form, a_l_adoption: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              À l'adoption
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.fa_en_vue_adoption}
                onChange={(e) => setForm({ ...form, fa_en_vue_adoption: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              FA en vue adoption
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.cedere_autre_asso}
                onChange={(e) => setForm({ ...form, cedere_autre_asso: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              À céder autre asso
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.transfert_asso}
                onChange={(e) => setForm({ ...form, transfert_asso: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Transfert asso
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.perdu}
                onChange={(e) => setForm({ ...form, perdu: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Perdu
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.reserve}
                onChange={(e) => setForm({ ...form, reserve: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Réservé
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.vole}
                onChange={(e) => setForm({ ...form, vole: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Volé
            </label>
          </div>
          <div className="mt-4">
            <label className="label">Notes Excel</label>
            <textarea
              value={form.notes_excel}
              onChange={(e) => setForm({ ...form, notes_excel: e.target.value })}
              rows={3}
              className="input"
              placeholder="Notes supplémentaires du fichier Excel..."
            />
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
