import { useEffect, useState } from 'react';
import { Plus, Edit, Loader2, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal, Badge, EmptyState } from './ui';
import {
  formatDate, observationTypeLabels, observationTypeColors,
  morsureRisqueLabels, morsureRisqueColors,
} from '../lib/constants';
import type { AnimalObservation, ObservationType, Morsure } from '../types';

interface ObservationsMorsuresSectionProps {
  animalId: string;
  onChanged: () => void;
}

const emptyObsForm = () => ({
  date_observation: new Date().toISOString().split('T')[0],
  type: 'comportement' as ObservationType,
  contenu: '',
});

const emptyMorsureForm = () => ({
  date_declaration: new Date().toISOString().split('T')[0],
  lieu: '',
  circonstances: '',
  victime_description: '',
  niveau_risque: '' as string,
  evaluation_comportementale: '',
  mesures_imposees: '',
  pension_educative: false,
  suivi: '',
});

export function ObservationsMorsuresSection({ animalId, onChanged }: ObservationsMorsuresSectionProps) {
  const [observations, setObservations] = useState<AnimalObservation[]>([]);
  const [morsures, setMorsures] = useState<Morsure[]>([]);
  const [loading, setLoading] = useState(true);

  const [obsModal, setObsModal] = useState(false);
  const [obsEditing, setObsEditing] = useState<AnimalObservation | null>(null);
  const [obsForm, setObsForm] = useState(emptyObsForm());
  const [obsSaving, setObsSaving] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);

  const [morsureModal, setMorsureModal] = useState(false);
  const [morsureEditing, setMorsureEditing] = useState<Morsure | null>(null);
  const [morsureForm, setMorsureForm] = useState(emptyMorsureForm());
  const [morsureSaving, setMorsureSaving] = useState(false);
  const [morsureError, setMorsureError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [obsRes, morsRes] = await Promise.all([
      supabase.from('animal_observations').select('*').eq('animal_id', animalId).order('date_observation', { ascending: false }),
      supabase.from('morsures').select('*').eq('animal_id', animalId).order('date_declaration', { ascending: false }),
    ]);
    setObservations((obsRes.data ?? []) as AnimalObservation[]);
    setMorsures((morsRes.data ?? []) as Morsure[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [animalId]);

  const openObsCreate = () => {
    setObsEditing(null);
    setObsForm(emptyObsForm());
    setObsError(null);
    setObsModal(true);
  };

  const openObsEdit = (o: AnimalObservation) => {
    setObsEditing(o);
    setObsForm({ date_observation: o.date_observation, type: o.type, contenu: o.contenu });
    setObsError(null);
    setObsModal(true);
  };

  const handleObsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setObsSaving(true);
    setObsError(null);
    try {
      const payload = {
        animal_id: animalId,
        date_observation: obsForm.date_observation,
        type: obsForm.type,
        contenu: obsForm.contenu,
      };
      const { error } = obsEditing
        ? await supabase.from('animal_observations').update(payload).eq('id', obsEditing.id)
        : await supabase.from('animal_observations').insert(payload);
      if (error) throw new Error(error.message);
      setObsModal(false);
      await load();
      onChanged();
    } catch (err) {
      setObsError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setObsSaving(false);
    }
  };

  const openMorsureCreate = () => {
    setMorsureEditing(null);
    setMorsureForm(emptyMorsureForm());
    setMorsureError(null);
    setMorsureModal(true);
  };

  const openMorsureEdit = (m: Morsure) => {
    setMorsureEditing(m);
    setMorsureForm({
      date_declaration: m.date_declaration,
      lieu: m.lieu ?? '',
      circonstances: m.circonstances ?? '',
      victime_description: m.victime_description ?? '',
      niveau_risque: m.niveau_risque?.toString() ?? '',
      evaluation_comportementale: m.evaluation_comportementale ?? '',
      mesures_imposees: m.mesures_imposees ?? '',
      pension_educative: m.pension_educative ?? false,
      suivi: m.suivi ?? '',
    });
    setMorsureError(null);
    setMorsureModal(true);
  };

  const handleMorsureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMorsureSaving(true);
    setMorsureError(null);
    try {
      const payload = {
        animal_id: animalId,
        date_declaration: morsureForm.date_declaration,
        lieu: morsureForm.lieu || null,
        circonstances: morsureForm.circonstances || null,
        victime_description: morsureForm.victime_description || null,
        niveau_risque: morsureForm.niveau_risque ? Number(morsureForm.niveau_risque) : null,
        evaluation_comportementale: morsureForm.evaluation_comportementale || null,
        mesures_imposees: morsureForm.mesures_imposees || null,
        pension_educative: morsureForm.pension_educative,
        suivi: morsureForm.suivi || null,
      };
      const { error } = morsureEditing
        ? await supabase.from('morsures').update(payload).eq('id', morsureEditing.id)
        : await supabase.from('morsures').insert(payload);
      if (error) throw new Error(error.message);
      setMorsureModal(false);
      await load();
      onChanged();
    } catch (err) {
      setMorsureError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setMorsureSaving(false);
    }
  };

  if (loading) return <div className="card p-6"><Loader2 size={20} className="mx-auto animate-spin text-neutral-400" /></div>;

  return (
    <div className="space-y-6">
      {/* OBSERVATIONS */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
            <Activity size={18} className="text-primary-600" /> Observations & évolution
          </h2>
          <button onClick={openObsCreate} className="btn-primary text-sm">
            <Plus size={16} /> Ajouter une observation
          </button>
        </div>

        {observations.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={Activity} title="Aucune observation" description="État initial à l'arrivée (maigreur, craintes, blessures...) puis évolution datée — chaque observation est conservée." />
          </div>
        ) : (
          <div className="space-y-2">
            {observations.map((o) => (
              <div key={o.id} className="card flex items-start justify-between gap-3 p-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={observationTypeColors[o.type]}>{observationTypeLabels[o.type]}</Badge>
                    <span className="text-sm font-medium text-neutral-900">{formatDate(o.date_observation)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{o.contenu}</p>
                </div>
                <button onClick={() => openObsEdit(o)} className="btn-ghost shrink-0 text-sm"><Edit size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MORSURES */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
            <AlertTriangle size={18} className="text-error-600" /> Déclarations de morsure
          </h2>
          <button onClick={openMorsureCreate} className="btn-primary text-sm">
            <Plus size={16} /> Déclarer une morsure
          </button>
        </div>

        {morsures.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={AlertTriangle} title="Aucune morsure déclarée" description="Évaluations comportementales, niveaux de risque 1-4, mesures imposées et pension éducative." />
          </div>
        ) : (
          <div className="space-y-2">
            {morsures.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {m.niveau_risque && <Badge className={morsureRisqueColors[m.niveau_risque]}>{morsureRisqueLabels[m.niveau_risque]}</Badge>}
                      {m.pension_educative && <Badge className="bg-accent-100 text-accent-800">Pension éducative</Badge>}
                      <span className="text-sm text-neutral-500">{formatDate(m.date_declaration)}</span>
                    </div>
                    {m.lieu && <p className="mt-1 text-sm text-neutral-600">Lieu : {m.lieu}</p>}
                    {m.circonstances && <p className="mt-1 text-sm text-neutral-700">{m.circonstances}</p>}
                    {m.victime_description && <p className="mt-1 text-sm text-neutral-600">Victime : {m.victime_description}</p>}
                    {m.evaluation_comportementale && <p className="mt-1 text-sm text-neutral-700">Évaluation : {m.evaluation_comportementale}</p>}
                    {m.mesures_imposees && <p className="mt-1 text-sm text-neutral-700">Mesures : {m.mesures_imposees}</p>}
                    {m.suivi && <p className="mt-1 text-sm text-neutral-600">Suivi : {m.suivi}</p>}
                  </div>
                  <button onClick={() => openMorsureEdit(m)} className="btn-ghost shrink-0 text-sm"><Edit size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal observation */}
      <Modal open={obsModal} onClose={() => setObsModal(false)} title={obsEditing ? 'Modifier l\'observation' : 'Nouvelle observation'} size="lg">
        <form onSubmit={handleObsSubmit} className="space-y-4">
          {obsError && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{obsError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={obsForm.date_observation} onChange={(e) => setObsForm({ ...obsForm, date_observation: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={obsForm.type} onChange={(e) => setObsForm({ ...obsForm, type: e.target.value as ObservationType })} className="input">
                {Object.entries(observationTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observation *</label>
              <textarea required value={obsForm.contenu} onChange={(e) => setObsForm({ ...obsForm, contenu: e.target.value })} rows={5} className="input" placeholder="État de santé, comportement, blessures, maigreur, craintes, agressivité, évolution..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setObsModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={obsSaving} className="btn-primary">
              {obsSaving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal morsure */}
      <Modal open={morsureModal} onClose={() => setMorsureModal(false)} title={morsureEditing ? 'Modifier la déclaration' : 'Déclaration de morsure'} size="lg">
        <form onSubmit={handleMorsureSubmit} className="space-y-4">
          {morsureError && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{morsureError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Date de déclaration *</label>
              <input type="date" required value={morsureForm.date_declaration} onChange={(e) => setMorsureForm({ ...morsureForm, date_declaration: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Niveau de risque</label>
              <select value={morsureForm.niveau_risque} onChange={(e) => setMorsureForm({ ...morsureForm, niveau_risque: e.target.value })} className="input">
                <option value="">—</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{morsureRisqueLabels[n]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Lieu</label>
              <input type="text" value={morsureForm.lieu} onChange={(e) => setMorsureForm({ ...morsureForm, lieu: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Victime</label>
              <input type="text" value={morsureForm.victime_description} onChange={(e) => setMorsureForm({ ...morsureForm, victime_description: e.target.value })} className="input" placeholder="Âge, relation, gravité..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Circonstances</label>
              <textarea value={morsureForm.circonstances} onChange={(e) => setMorsureForm({ ...morsureForm, circonstances: e.target.value })} rows={2} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Évaluation comportementale</label>
              <textarea value={morsureForm.evaluation_comportementale} onChange={(e) => setMorsureForm({ ...morsureForm, evaluation_comportementale: e.target.value })} rows={2} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Mesures imposées</label>
              <textarea value={morsureForm.mesures_imposees} onChange={(e) => setMorsureForm({ ...morsureForm, mesures_imposees: e.target.value })} rows={2} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Suivi</label>
              <textarea value={morsureForm.suivi} onChange={(e) => setMorsureForm({ ...morsureForm, suivi: e.target.value })} rows={2} className="input" placeholder="Évolution, contrôle vétérinaire, fin de mesures..." />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="pension_educative" checked={morsureForm.pension_educative} onChange={(e) => setMorsureForm({ ...morsureForm, pension_educative: e.target.checked })} className="rounded border-neutral-300" />
              <label htmlFor="pension_educative" className="text-sm text-neutral-700">Pension éducative</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMorsureModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={morsureSaving} className="btn-primary">
              {morsureSaving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
