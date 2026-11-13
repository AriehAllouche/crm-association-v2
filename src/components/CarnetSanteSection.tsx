import { useEffect, useState } from 'react';
import { Plus, Edit, Loader2, Syringe, Pill, FileText, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal, Badge, EmptyState } from './ui';
import { DocumentUpload, emptyDocumentSource, type DocumentSource } from './DocumentUpload';
import { openDocument } from '../lib/documentUpload';
import { fetchVetsForSelect } from '../lib/animalDetails';
import {
  formatDate, vaccinsSuggestions, vaccinationTypeInjectionLabels,
  santeSoinTypeLabels, santeSoinTypeColors,
} from '../lib/constants';
import type { Vaccination, SanteSoin, VaccinationTypeInjection, SanteSoinType, DocumentItem, AnimalEspece } from '../types';

interface CarnetSanteSectionProps {
  animalId: string;
  espece?: AnimalEspece;
  onChanged: () => void;
}

const emptyVaccinForm = () => ({
  vaccin: '',
  type_injection: 'rappel' as VaccinationTypeInjection,
  date_injection: new Date().toISOString().split('T')[0],
  date_prochain_rappel: '',
  veterinaire_id: '',
  notes: '',
});

const emptySoinForm = () => ({
  type: 'vermifuge' as SanteSoinType,
  produit: '',
  date_soin: new Date().toISOString().split('T')[0],
  dosage: '',
  prochain_traitement: '',
  resultat: '',
  veterinaire_id: '',
  notes: '',
});

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function CarnetSanteSection({ animalId, espece, onChanged }: CarnetSanteSectionProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [soins, setSoins] = useState<SanteSoin[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [vets, setVets] = useState<{ id: string; nom: string; clinique?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [vaccinModal, setVaccinModal] = useState(false);
  const [vaccinEditing, setVaccinEditing] = useState<Vaccination | null>(null);
  const [vaccinForm, setVaccinForm] = useState(emptyVaccinForm());
  const [vaccinSaving, setVaccinSaving] = useState(false);
  const [vaccinError, setVaccinError] = useState<string | null>(null);

  const [soinModal, setSoinModal] = useState(false);
  const [soinEditing, setSoinEditing] = useState<SanteSoin | null>(null);
  const [soinForm, setSoinForm] = useState(emptySoinForm());
  const [soinSaving, setSoinSaving] = useState(false);
  const [soinError, setSoinError] = useState<string | null>(null);

  const [docModal, setDocModal] = useState<SanteSoin | null>(null);
  const [docForm, setDocForm] = useState({ nom_fichier: '', description: '', source: emptyDocumentSource() });
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [vaccRes, soinRes, docRes, vetsList] = await Promise.all([
      supabase.from('vaccinations').select('*').eq('animal_id', animalId).order('date_injection', { ascending: false }),
      supabase.from('sante_soins').select('*').eq('animal_id', animalId).order('date_soin', { ascending: false }),
      supabase.from('documents').select('*').eq('animal_id', animalId).eq('module', 'sante'),
      fetchVetsForSelect().catch(() => []),
    ]);
    setVaccinations((vaccRes.data ?? []) as Vaccination[]);
    setSoins((soinRes.data ?? []) as SanteSoin[]);
    setDocuments((docRes.data ?? []) as DocumentItem[]);
    setVets(vetsList);
    setLoading(false);
  };

  useEffect(() => { load(); }, [animalId]);

  const vetNom = (id?: string) => vets.find((v) => v.id === id)?.nom;
  const docsFor = (soinId: string) => documents.filter((d) => d.module_id === soinId);

  // Échéances à venir (30 jours) ou dépassées
  const echeances = [
    ...vaccinations
      .filter((v) => v.date_prochain_rappel)
      .map((v) => ({ label: `Rappel ${v.vaccin}`, date: v.date_prochain_rappel!, kind: 'vaccin' as const })),
    ...soins
      .filter((s) => s.prochain_traitement)
      .map((s) => ({ label: `${santeSoinTypeLabels[s.type]}${s.produit ? ` — ${s.produit}` : ''}`, date: s.prochain_traitement!, kind: 'soin' as const })),
  ]
    .map((e) => ({ ...e, days: daysUntil(e.date) }))
    .filter((e) => e.days !== null && e.days <= 30)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  const suggestions = espece && vaccinsSuggestions[espece] ? vaccinsSuggestions[espece] : [];

  const openVaccinCreate = () => {
    setVaccinEditing(null);
    setVaccinForm(emptyVaccinForm());
    setVaccinError(null);
    setVaccinModal(true);
  };

  const openVaccinEdit = (v: Vaccination) => {
    setVaccinEditing(v);
    setVaccinForm({
      vaccin: v.vaccin,
      type_injection: v.type_injection,
      date_injection: v.date_injection,
      date_prochain_rappel: v.date_prochain_rappel ?? '',
      veterinaire_id: v.veterinaire_id ?? '',
      notes: v.notes ?? '',
    });
    setVaccinError(null);
    setVaccinModal(true);
  };

  const handleVaccinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaccinSaving(true);
    setVaccinError(null);
    try {
      const payload = {
        animal_id: animalId,
        vaccin: vaccinForm.vaccin,
        type_injection: vaccinForm.type_injection,
        date_injection: vaccinForm.date_injection,
        date_prochain_rappel: vaccinForm.date_prochain_rappel || null,
        veterinaire_id: vaccinForm.veterinaire_id || null,
        notes: vaccinForm.notes || null,
      };
      const { error } = vaccinEditing
        ? await supabase.from('vaccinations').update(payload).eq('id', vaccinEditing.id)
        : await supabase.from('vaccinations').insert(payload);
      if (error) throw new Error(error.message);
      setVaccinModal(false);
      await load();
      onChanged();
    } catch (err) {
      setVaccinError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setVaccinSaving(false);
    }
  };

  const openSoinCreate = () => {
    setSoinEditing(null);
    setSoinForm(emptySoinForm());
    setSoinError(null);
    setSoinModal(true);
  };

  const openSoinEdit = (s: SanteSoin) => {
    setSoinEditing(s);
    setSoinForm({
      type: s.type,
      produit: s.produit ?? '',
      date_soin: s.date_soin,
      dosage: s.dosage ?? '',
      prochain_traitement: s.prochain_traitement ?? '',
      resultat: s.resultat ?? '',
      veterinaire_id: s.veterinaire_id ?? '',
      notes: s.notes ?? '',
    });
    setSoinError(null);
    setSoinModal(true);
  };

  const handleSoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSoinSaving(true);
    setSoinError(null);
    try {
      const payload = {
        animal_id: animalId,
        type: soinForm.type,
        produit: soinForm.produit || null,
        date_soin: soinForm.date_soin,
        dosage: soinForm.dosage || null,
        prochain_traitement: soinForm.prochain_traitement || null,
        resultat: soinForm.resultat || null,
        veterinaire_id: soinForm.veterinaire_id || null,
        notes: soinForm.notes || null,
      };
      const { error } = soinEditing
        ? await supabase.from('sante_soins').update(payload).eq('id', soinEditing.id)
        : await supabase.from('sante_soins').insert(payload);
      if (error) throw new Error(error.message);
      setSoinModal(false);
      await load();
      onChanged();
    } catch (err) {
      setSoinError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSoinSaving(false);
    }
  };

  const openDocModal = (s: SanteSoin) => {
    setDocModal(s);
    setDocForm({ nom_fichier: '', description: '', source: emptyDocumentSource() });
    setDocError(null);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModal) return;
    if (!docForm.source.storage_path && !docForm.source.url) {
      setDocError('Envoyez un fichier ou renseignez un lien externe.');
      return;
    }
    setDocSaving(true);
    setDocError(null);
    try {
      const { error } = await supabase.from('documents').insert({
        animal_id: animalId,
        module: 'sante',
        module_id: docModal.id,
        type_document: 'certificat',
        nom_fichier: docForm.nom_fichier || docForm.source.nom_fichier,
        url: docForm.source.url,
        storage_path: docForm.source.storage_path,
        taille: docForm.source.taille,
        description: docForm.description || null,
      });
      if (error) throw new Error(error.message);
      setDocModal(null);
      await load();
      onChanged();
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setDocSaving(false);
    }
  };

  if (loading) return <div className="card p-6"><Loader2 size={20} className="mx-auto animate-spin text-neutral-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Échéances */}
      {echeances.length > 0 && (
        <div className="card border-l-4 border-warning-400 bg-warning-50 p-4">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-warning-800">
            <AlertTriangle size={16} /> Échéances à venir
          </h3>
          <ul className="mt-2 space-y-1">
            {echeances.map((e, i) => (
              <li key={i} className="text-sm text-warning-900">
                {e.label} — {e.days !== null && e.days < 0 ? `en retard de ${Math.abs(e.days)} j` : `dans ${e.days} j`} ({formatDate(e.date)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* VACCINATIONS */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
            <Syringe size={18} className="text-primary-600" /> Vaccinations
          </h2>
          <button onClick={openVaccinCreate} className="btn-primary text-sm">
            <Plus size={16} /> Ajouter une vaccination
          </button>
        </div>

        {vaccinations.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={Syringe} title="Aucune vaccination enregistrée" description="Primo-vaccination, rappels et valences (rage, DHPPi...) — chaque injection est historisée." />
          </div>
        ) : (
          <div className="space-y-2">
            {vaccinations.map((v) => {
              const days = daysUntil(v.date_prochain_rappel);
              const overdue = days !== null && days < 0;
              const soon = days !== null && days >= 0 && days <= 30;
              return (
                <div key={v.id} className="card flex items-start justify-between gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-neutral-900">{v.vaccin}</p>
                      <Badge className="bg-primary-100 text-primary-700">{vaccinationTypeInjectionLabels[v.type_injection] ?? v.type_injection}</Badge>
                      {v.date_prochain_rappel && (
                        <Badge className={overdue ? 'bg-error-100 text-error-700' : soon ? 'bg-warning-100 text-warning-800' : 'bg-neutral-100 text-neutral-600'}>
                          {overdue ? `Rappel en retard (${Math.abs(days)} j)` : soon ? `Rappel dans ${days} j` : `Rappel le ${formatDate(v.date_prochain_rappel)}`}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      Injecté le {formatDate(v.date_injection)}
                      {v.date_prochain_rappel && !overdue && !soon && ` · prochain rappel le ${formatDate(v.date_prochain_rappel)}`}
                      {vetNom(v.veterinaire_id) && ` · ${vetNom(v.veterinaire_id)}`}
                    </p>
                    {v.notes && <p className="mt-1 text-sm text-neutral-500">{v.notes}</p>}
                  </div>
                  <button onClick={() => openVaccinEdit(v)} className="btn-ghost shrink-0 text-sm"><Edit size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SOINS */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
            <Pill size={18} className="text-accent-600" /> Soins & traitements
          </h2>
          <button onClick={openSoinCreate} className="btn-primary text-sm">
            <Plus size={16} /> Ajouter un soin
          </button>
        </div>

        {soins.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={Pill} title="Aucun soin enregistré" description="Vermifuges, antiparasitaires, stérilisation et diagnose morphologique." />
          </div>
        ) : (
          <div className="space-y-2">
            {soins.map((s) => {
              const docs = docsFor(s.id);
              const days = daysUntil(s.prochain_traitement);
              const overdue = days !== null && days < 0;
              const soon = days !== null && days >= 0 && days <= 30;
              return (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={santeSoinTypeColors[s.type]}>{santeSoinTypeLabels[s.type]}</Badge>
                        {s.produit && <span className="font-medium text-neutral-900">{s.produit}</span>}
                        {s.prochain_traitement && (
                          <Badge className={overdue ? 'bg-error-100 text-error-700' : soon ? 'bg-warning-100 text-warning-800' : 'bg-neutral-100 text-neutral-600'}>
                            {overdue ? `Traitement en retard (${Math.abs(days)} j)` : soon ? `Traitement dans ${days} j` : `Prochain : ${formatDate(s.prochain_traitement)}`}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">
                        {formatDate(s.date_soin)}
                        {s.dosage && ` · ${s.dosage}`}
                        {vetNom(s.veterinaire_id) && ` · ${vetNom(s.veterinaire_id)}`}
                      </p>
                      {s.resultat && <p className="mt-1 text-sm text-neutral-700">Résultat : {s.resultat}</p>}
                      {s.notes && <p className="mt-1 text-sm text-neutral-500">{s.notes}</p>}

                      {/* Justificatifs */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                        <span className="text-xs font-medium text-neutral-500">Justificatifs :</span>
                        {docs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => openDocument(doc).catch(() => alert('Impossible d\'ouvrir le document'))}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
                          >
                            <FileText size={12} /> {doc.nom_fichier}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => openDocModal(s)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:border-primary-400 hover:text-primary-600"
                        >
                          <Upload size={12} /> Ajouter
                        </button>
                      </div>
                    </div>
                    <button onClick={() => openSoinEdit(s)} className="btn-ghost shrink-0 text-sm"><Edit size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal vaccination */}
      <Modal open={vaccinModal} onClose={() => setVaccinModal(false)} title={vaccinEditing ? 'Modifier la vaccination' : 'Nouvelle vaccination'} size="lg">
        <form onSubmit={handleVaccinSubmit} className="space-y-4">
          {vaccinError && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{vaccinError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Vaccin / valence *</label>
              <input
                type="text"
                required
                list="vaccins-suggestions"
                value={vaccinForm.vaccin}
                onChange={(e) => setVaccinForm({ ...vaccinForm, vaccin: e.target.value })}
                className="input"
                placeholder="Ex : DHPPi, Rage..."
              />
              <datalist id="vaccins-suggestions">
                {suggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
              {suggestions.length > 0 && <p className="mt-1 text-xs text-neutral-400">Suggestions {espece === 'chien' ? 'chien' : 'chat'} — saisie libre possible.</p>}
            </div>
            <div>
              <label className="label">Type d'injection</label>
              <select value={vaccinForm.type_injection} onChange={(e) => setVaccinForm({ ...vaccinForm, type_injection: e.target.value as VaccinationTypeInjection })} className="input">
                {Object.entries(vaccinationTypeInjectionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date d'injection *</label>
              <input type="date" required value={vaccinForm.date_injection} onChange={(e) => setVaccinForm({ ...vaccinForm, date_injection: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Prochain rappel (selon vétérinaire)</label>
              <input type="date" value={vaccinForm.date_prochain_rappel} onChange={(e) => setVaccinForm({ ...vaccinForm, date_prochain_rappel: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Vétérinaire</label>
              <select value={vaccinForm.veterinaire_id} onChange={(e) => setVaccinForm({ ...vaccinForm, veterinaire_id: e.target.value })} className="input">
                <option value="">—</option>
                {vets.map((v) => <option key={v.id} value={v.id}>{v.nom}{v.clinique ? ` (${v.clinique})` : ''}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea value={vaccinForm.notes} onChange={(e) => setVaccinForm({ ...vaccinForm, notes: e.target.value })} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setVaccinModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={vaccinSaving} className="btn-primary">
              {vaccinSaving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal soin */}
      <Modal open={soinModal} onClose={() => setSoinModal(false)} title={soinEditing ? 'Modifier le soin' : 'Nouveau soin'} size="lg">
        <form onSubmit={handleSoinSubmit} className="space-y-4">
          {soinError && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{soinError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Type de soin *</label>
              <select value={soinForm.type} onChange={(e) => setSoinForm({ ...soinForm, type: e.target.value as SanteSoinType })} className="input">
                {Object.entries(santeSoinTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Produit</label>
              <input type="text" value={soinForm.produit} onChange={(e) => setSoinForm({ ...soinForm, produit: e.target.value })} className="input" placeholder="Ex : Drontal, Advocate..." />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={soinForm.date_soin} onChange={(e) => setSoinForm({ ...soinForm, date_soin: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Dosage</label>
              <input type="text" value={soinForm.dosage} onChange={(e) => setSoinForm({ ...soinForm, dosage: e.target.value })} className="input" placeholder="Ex : 1 cp / 10 kg" />
            </div>
            {(soinForm.type === 'vermifuge' || soinForm.type === 'antiparasitaire') && (
              <div>
                <label className="label">Prochain traitement</label>
                <input type="date" value={soinForm.prochain_traitement} onChange={(e) => setSoinForm({ ...soinForm, prochain_traitement: e.target.value })} className="input" />
              </div>
            )}
            {soinForm.type === 'diagnose_morphologique' && (
              <div>
                <label className="label">Résultat</label>
                <input type="text" value={soinForm.resultat} onChange={(e) => setSoinForm({ ...soinForm, resultat: e.target.value })} className="input" placeholder="Ex : conforme, anomalie détectée..." />
              </div>
            )}
            <div>
              <label className="label">Vétérinaire</label>
              <select value={soinForm.veterinaire_id} onChange={(e) => setSoinForm({ ...soinForm, veterinaire_id: e.target.value })} className="input">
                <option value="">—</option>
                {vets.map((v) => <option key={v.id} value={v.id}>{v.nom}{v.clinique ? ` (${v.clinique})` : ''}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea value={soinForm.notes} onChange={(e) => setSoinForm({ ...soinForm, notes: e.target.value })} rows={2} className="input" />
            </div>
          </div>
          <p className="text-xs text-neutral-400">Les justificatifs (certificat de stérilisation, rapport de diagnose, ordonnance, facture) s'ajoutent après enregistrement, depuis la carte du soin.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSoinModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={soinSaving} className="btn-primary">
              {soinSaving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal justificatif soin */}
      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Ajouter un justificatif" size="md">
        <form onSubmit={handleDocSubmit} className="space-y-4">
          {docError && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{docError}</div>}
          <div>
            <label className="label">Fichier *</label>
            <DocumentUpload value={docForm.source} onChange={(source: DocumentSource) => setDocForm({ ...docForm, source })} pathPrefix={animalId} />
          </div>
          <div>
            <label className="label">Nom du fichier</label>
            <input type="text" value={docForm.nom_fichier} onChange={(e) => setDocForm({ ...docForm, nom_fichier: e.target.value })} className="input" placeholder="Ex : Certificat stérilisation, Ordonnance..." />
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDocModal(null)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={docSaving} className="btn-primary">
              {docSaving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
