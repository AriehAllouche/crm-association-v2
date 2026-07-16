import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchFamillesForSelect, fetchVetsForSelect, fetchPensionsForSelect, type FamilleAccueilAnimal, type FamilleAccueilAnimalStatut } from '../lib/animalDetails';
import { syncAnimal, syncFamilleAccueilCount, syncPensionCount } from '../lib/animalSync';
import { Modal } from './ui';

interface InlineFormProps {
  animalId?: string;
  onSaved: () => void;
}

export function InlineVetVisitForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [vets, setVets] = useState<{ id: string; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    veterinaire_id: '',
    date_visite: new Date().toISOString().split('T')[0],
    motif: '',
    diagnostic: '',
    traitement: '',
    cout: '',
    prochaine_visite: '',
    notes: '',
  });

  useEffect(() => {
    fetchVetsForSelect().then(setVets).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('veterinaire_visites').insert({
        animal_id: animalId,
        veterinaire_id: form.veterinaire_id || null,
        date_visite: form.date_visite,
        motif: form.motif,
        diagnostic: form.diagnostic || null,
        traitement: form.traitement || null,
        cout: form.cout ? parseFloat(form.cout) : null,
        prochaine_visite: form.prochaine_visite || null,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      
      // Synchroniser le statut de l'animal (visite vétérinaire peut changer le statut)
      if (animalId) {
        await syncAnimal(animalId);
      }
      
      setOpen(false);
      setForm({ veterinaire_id: '', date_visite: new Date().toISOString().split('T')[0], motif: '', diagnostic: '', traitement: '', cout: '', prochaine_visite: '', notes: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Visite vétérinaire
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle visite vétérinaire">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vétérinaire</label>
              <select value={form.veterinaire_id} onChange={(e) => setForm({ ...form, veterinaire_id: e.target.value })} className="input">
                <option value="">—</option>
                {vets.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={form.date_visite} onChange={(e) => setForm({ ...form, date_visite: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Motif *</label>
              <input type="text" required value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} className="input" placeholder="Consultation, vaccin, chirurgie..." />
            </div>
            <div>
              <label className="label">Diagnostic</label>
              <input type="text" value={form.diagnostic} onChange={(e) => setForm({ ...form, diagnostic: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Traitement</label>
              <input type="text" value={form.traitement} onChange={(e) => setForm({ ...form, traitement: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Coût (€)</label>
              <input type="number" step="0.01" value={form.cout} onChange={(e) => setForm({ ...form, cout: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Prochaine visite</label>
              <input type="date" value={form.prochaine_visite} onChange={(e) => setForm({ ...form, prochaine_visite: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineFamilleAccueilForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [familles, setFamilles] = useState<{ id: string; nom: string; prenom?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    famille_accueil_id: '',
    statut: 'prevu' as FamilleAccueilAnimalStatut,
    date_debut: '',
    notes: ''
  });

  useEffect(() => {
    fetchFamillesForSelect().then(setFamilles).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data: placementData, error } = await supabase.from('famille_accueil_animaux').insert({
        animal_id: animalId,
        famille_accueil_id: form.famille_accueil_id,
        statut: form.statut,
        date_debut: form.statut !== 'prevu' ? (form.date_debut || new Date().toISOString().split('T')[0]) : (form.date_debut || null),
        notes: form.notes || null,
      }).select('famille_accueil_id').single();
      if (error) throw new Error(error.message);
      
      // Synchroniser le statut de l'animal et le compteur de la FA
      if (animalId) {
        await syncAnimal(animalId);
      }
      if (placementData?.famille_accueil_id) {
        await syncFamilleAccueilCount(placementData.famille_accueil_id);
      }
      
      setOpen(false);
      setForm({ famille_accueil_id: '', statut: 'prevu', date_debut: '', notes: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Placement FA
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau placement en famille d'accueil">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div>
            <label className="label">Famille d'accueil *</label>
            <select required value={form.famille_accueil_id} onChange={(e) => setForm({ ...form, famille_accueil_id: e.target.value })} className="input">
              <option value="">Sélectionner...</option>
              {familles.map((f) => <option key={f.id} value={f.id}>{f.nom} {f.prenom ?? ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Statut *</label>
            <select required value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as FamilleAccueilAnimalStatut })} className="input">
              <option value="prevu">Prévu (arrivée à venir)</option>
              <option value="en_cours">En cours (animal présent)</option>
              <option value="termine">Terminé (animal parti)</option>
            </select>
          </div>
          <div>
            <label className="label">Date de début {form.statut !== 'prevu' ? '*' : ''}</label>
            <input
              type="date"
              required={form.statut !== 'prevu'}
              value={form.date_debut}
              onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              className="input"
            />
            {form.statut === 'prevu' && <p className="mt-1 text-xs text-neutral-500">Optionnel si date non encore fixée</p>}
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineEditPlacementForm({ animalId, placement, onSaved }: InlineFormProps & { placement: FamilleAccueilAnimal }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    statut: placement.statut,
    date_debut: placement.date_debut || '',
    date_fin: placement.date_fin || '',
    motif_fin: placement.motif_fin || '',
    notes: placement.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updateData: Record<string, unknown> = {
        statut: form.statut,
        date_debut: form.date_debut || null,
        notes: form.notes || null,
      };

      if (form.statut === 'termine') {
        updateData.date_fin = form.date_fin || new Date().toISOString().split('T')[0];
        updateData.motif_fin = form.motif_fin || null;
      } else {
        updateData.date_fin = null;
        updateData.motif_fin = null;
      }

      const { error } = await supabase
        .from('famille_accueil_animaux')
        .update(updateData)
        .eq('id', placement.id);

      if (error) throw new Error(error.message);
      
      // Synchroniser le statut de l'animal et le compteur de la FA
      if (animalId) {
        await syncAnimal(animalId);
      }
      if (placement.famille_accueil_id) {
        await syncFamilleAccueilCount(placement.famille_accueil_id);
      }
      
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs">
        <Edit size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Modifier le placement">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}

          <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
            <span className="text-sm text-neutral-500">Famille:</span>
            <span className="font-medium text-neutral-900">{placement.famille_accueil?.nom} {placement.famille_accueil?.prenom ?? ''}</span>
          </div>

          <div>
            <label className="label">Statut *</label>
            <select required value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as FamilleAccueilAnimalStatut })} className="input">
              <option value="prevu">Prévu (arrivée à venir)</option>
              <option value="en_cours">En cours (animal présent)</option>
              <option value="termine">Terminé (animal parti)</option>
            </select>
          </div>

          <div>
            <label className="label">Date de début</label>
            <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className="input" />
          </div>

          {form.statut === 'termine' && (
            <>
              <div>
                <label className="label">Date de fin *</label>
                <input type="date" required value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Motif de fin</label>
                <select value={form.motif_fin} onChange={(e) => setForm({ ...form, motif_fin: e.target.value })} className="input">
                  <option value="">—</option>
                  <option value="adoption">Adoption</option>
                  <option value="retour">Retour</option>
                  <option value="changement_fa">Changement de FA</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineTransportForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'benevole' as 'covoiturage' | 'transporteur' | 'benevole',
    transporteur_nom: '',
    transporteur_contact: '',
    lieu_depart: '',
    lieu_arrivee: '',
    date_transport: new Date().toISOString().split('T')[0],
    cout: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('transports').insert({
        animal_id: animalId,
        type: form.type,
        transporteur_nom: form.transporteur_nom || null,
        transporteur_contact: form.transporteur_contact || null,
        lieu_depart: form.lieu_depart || null,
        lieu_arrivee: form.lieu_arrivee || null,
        date_transport: form.date_transport,
        cout: form.cout ? parseFloat(form.cout) : null,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Transport
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau transport">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })} className="input">
                <option value="benevole">Bénévole</option>
                <option value="covoiturage">Covoiturage</option>
                <option value="transporteur">Transporteur</option>
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={form.date_transport} onChange={(e) => setForm({ ...form, date_transport: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Lieu de départ</label>
              <input type="text" value={form.lieu_depart} onChange={(e) => setForm({ ...form, lieu_depart: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Lieu d'arrivée</label>
              <input type="text" value={form.lieu_arrivee} onChange={(e) => setForm({ ...form, lieu_arrivee: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Transporteur</label>
              <input type="text" value={form.transporteur_nom} onChange={(e) => setForm({ ...form, transporteur_nom: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Contact</label>
              <input type="text" value={form.transporteur_contact} onChange={(e) => setForm({ ...form, transporteur_contact: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Coût (€)</label>
              <input type="number" step="0.01" value={form.cout} onChange={(e) => setForm({ ...form, cout: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineDepenseForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'veterinaire' as 'veterinaire' | 'pension' | 'transport' | 'nourriture' | 'materiel' | 'autre',
    description: '',
    montant: '',
    date_depense: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('depenses').insert({
        animal_id: animalId,
        type: form.type,
        description: form.description,
        montant: parseFloat(form.montant),
        date_depense: form.date_depense,
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Dépense
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle dépense">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })} className="input">
                <option value="veterinaire">Vétérinaire</option>
                <option value="pension">Pension</option>
                <option value="transport">Transport</option>
                <option value="nourriture">Nourriture</option>
                <option value="materiel">Matériel</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={form.date_depense} onChange={(e) => setForm({ ...form, date_depense: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Montant (€) *</label>
              <input type="number" step="0.01" required value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlinePensionForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [pensions, setPensions] = useState<{ id: string; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ pension_id: '', date_entree: new Date().toISOString().split('T')[0], notes: '' });

  useEffect(() => {
    fetchPensionsForSelect().then(setPensions).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data: sejourData, error } = await supabase.from('pension_sejours').insert({
        animal_id: animalId,
        pension_id: form.pension_id || null,
        date_entree: form.date_entree,
        notes: form.notes || null,
      }).select('pension_id').single();
      if (error) throw new Error(error.message);
      
      // Synchroniser le statut de l'animal et le compteur de la pension
      if (animalId) {
        await syncAnimal(animalId);
      }
      if (sejourData?.pension_id) {
        await syncPensionCount(sejourData.pension_id);
      }
      
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Séjour en pension
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau séjour en pension">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div>
            <label className="label">Pension</label>
            <select value={form.pension_id} onChange={(e) => setForm({ ...form, pension_id: e.target.value })} className="input">
              <option value="">—</option>
              {pensions.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date d'entrée *</label>
            <input type="date" required value={form.date_entree} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineDocumentForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type_document: 'photo' as 'contrat' | 'facture' | 'devis' | 'certificat' | 'jugement' | 'photo' | 'video' | 'compte_rendu' | 'carte' | 'autre',
    nom_fichier: '',
    url: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('documents').insert({
        animal_id: animalId,
        module: 'animal',
        type_document: form.type_document,
        nom_fichier: form.nom_fichier,
        url: form.url,
        description: form.description || null,
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Document
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau document">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div>
            <label className="label">Type *</label>
            <select value={form.type_document} onChange={(e) => setForm({ ...form, type_document: e.target.value as typeof form.type_document })} className="input">
              <option value="photo">Photo</option>
              <option value="video">Vidéo</option>
              <option value="contrat">Contrat</option>
              <option value="facture">Facture</option>
              <option value="devis">Devis</option>
              <option value="certificat">Certificat</option>
              <option value="jugement">Jugement</option>
              <option value="compte_rendu">Compte-rendu</option>
              <option value="carte">Carte</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="label">Nom du fichier *</label>
            <input type="text" required value={form.nom_fichier} onChange={(e) => setForm({ ...form, nom_fichier: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">URL *</label>
            <input type="text" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ============================================================
 * FORMULAIRES DE CRÉATION D'ENTITÉ + LIAISON IMMÉDIATE
 * Permet de créer une nouvelle entité (vétérinaire, FA, etc.)
 * et de l'associer à l'animal sans quitter la fiche animale.
 * ============================================================ */

export function InlineCreateVetForm({ onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: '',
    clinique: '',
    adresse: '',
    telephone: '',
    email: '',
    siret: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('veterinaires').insert({
        nom: form.nom,
        clinique: form.clinique || null,
        adresse: form.adresse || null,
        telephone: form.telephone || null,
        email: form.email || null,
        siret: form.siret || null,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      setForm({ nom: '', clinique: '', adresse: '', telephone: '', email: '', siret: '', notes: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Nouveau vétérinaire
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Créer un nouveau vétérinaire">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input" placeholder="Dr. Dupont" />
            </div>
            <div>
              <label className="label">Clinique</label>
              <input type="text" value={form.clinique} onChange={(e) => setForm({ ...form, clinique: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Adresse</label>
              <input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">SIRET</label>
              <input type="text" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Créer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineCreateFamilleForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    ville: '',
    code_postal: '',
    capacite_max: '1',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('famille_accueils').insert({
        nom: form.nom,
        prenom: form.prenom || null,
        telephone: form.telephone || null,
        email: form.email || null,
        adresse: form.adresse || null,
        ville: form.ville || null,
        code_postal: form.code_postal || null,
        capacite_max: form.capacite_max ? parseInt(form.capacite_max) : 1,
        notes: form.notes || null,
        contrat_actif: true,
      }).select('id').single();
      if (error) throw new Error(error.message);
      // Auto-link to this animal
      if (data) {
        await supabase.from('famille_accueil_animaux').insert({
          animal_id: animalId,
          famille_accueil_id: data.id,
          date_debut: new Date().toISOString().split('T')[0],
        });
      }
      setOpen(false);
      setForm({ nom: '', prenom: '', telephone: '', email: '', adresse: '', ville: '', code_postal: '', capacite_max: '1', notes: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Nouvelle famille d'accueil
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Créer une nouvelle famille d'accueil">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nom *</label>
              <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input type="text" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Adresse</label>
              <input type="text" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Ville</label>
              <input type="text" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input type="text" value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Capacité max</label>
              <input type="number" min="1" value={form.capacite_max} onChange={(e) => setForm({ ...form, capacite_max: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input" />
            </div>
          </div>
          <div className="rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary-700">
            La famille sera automatiquement associée à cet animal.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Créer et associer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineCreateDocumentForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type_document: 'photo' as 'contrat' | 'facture' | 'devis' | 'certificat' | 'jugement' | 'photo' | 'video' | 'compte_rendu' | 'carte' | 'autre',
    nom_fichier: '',
    url: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('documents').insert({
        animal_id: animalId,
        module: 'animal',
        type_document: form.type_document,
        nom_fichier: form.nom_fichier,
        url: form.url,
        description: form.description || null,
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      setForm({ type_document: 'photo', nom_fichier: '', url: '', description: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Nouveau document
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un document">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div>
            <label className="label">Type *</label>
            <select value={form.type_document} onChange={(e) => setForm({ ...form, type_document: e.target.value as typeof form.type_document })} className="input">
              <option value="photo">Photo</option>
              <option value="video">Vidéo</option>
              <option value="contrat">Contrat</option>
              <option value="facture">Facture</option>
              <option value="devis">Devis</option>
              <option value="certificat">Certificat</option>
              <option value="jugement">Jugement</option>
              <option value="compte_rendu">Compte-rendu</option>
              <option value="carte">Carte</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="label">Nom du fichier *</label>
            <input type="text" required value={form.nom_fichier} onChange={(e) => setForm({ ...form, nom_fichier: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">URL *</label>
            <input type="text" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function InlineCreateRegistreForm({ animalId, onSaved }: InlineFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'entree' as 'entree' | 'sortie',
    motif: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const prefix = form.type === 'entree' ? 'ENT' : 'SOR';
      const { error } = await supabase.from('registre_entrees_sorties').insert({
        animal_id: animalId,
        numero_entree: `${prefix}-${Date.now()}`,
        type: form.type,
        motif: form.motif,
        date: form.date,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      setOpen(false);
      setForm({ type: 'entree', motif: '', date: new Date().toISOString().split('T')[0], notes: '' });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Plus size={16} /> Entrée registre
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter une entrée au registre légal">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-error-50 px-4 py-2 text-sm text-error-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'entree' | 'sortie' })} className="input">
                <option value="entree">Entrée</option>
                <option value="sortie">Sortie</option>
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Motif *</label>
              <input type="text" required value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} className="input" placeholder="Prise en charge, adoption, décès..." />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
