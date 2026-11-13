import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Dog, Siren, HeartHandshake, Stethoscope, Scale,
  Building2, Truck, FileText, Euro, Activity, MapPin, Syringe, Calendar,
  Home, AlertTriangle, ChevronRight, Trash2, History, Users, Fingerprint, HeartPulse, Pill,
} from 'lucide-react';
import { fetchAnimalDetails, type AnimalDetails, type StatusHistoryEvent } from '../lib/animalDetails';
import { calculateAnimalStats, generateAnimalFinancialReport } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, Badge, EmptyState, Modal } from '../components/ui';
import { HistoryTimeline } from '../components/HistoryTimeline';
import { IcadDemandesSection } from '../components/IcadDemandesSection';
import { CarnetSanteSection } from '../components/CarnetSanteSection';
import { ObservationsMorsuresSection } from '../components/ObservationsMorsuresSection';
import { getFamillesAccueilStatuts, type FamilleAccueilStatutInfo } from '../lib/familleAccueil';
import { openDocument } from '../lib/documentUpload';
import { isV2 } from '../lib/features';
import {
  InlineVetVisitForm, InlineFamilleAccueilForm, InlineTransportForm,
  InlineDepenseForm, InlinePensionForm,
  InlineCreateVetForm, InlineCreateFamilleForm, InlineCreateDocumentForm,
  InlineCreateRegistreForm, InlineEditPlacementForm,
} from '../components/InlineForms';
import type { FamilleAccueilAnimalStatut } from '../lib/animalDetails';
import {
  animalStatutLabels, animalStatutColors, especeLabels, santeStatutLabels,
  santeStatutColors, formatDate, formatDateTime, formatCurrency,
  adoptionStatutLabels, justiceStatutLabels, transportStatutLabels,
  pensionTypeLabels, daysUntil, originePecLabels,
} from '../lib/constants';

const timelineIcons: Record<string, typeof Activity> = {
  registre: Calendar,
  signalement: Siren,
  veterinaire: Stethoscope,
  famille_accueil: Home,
  famille_accueil_fin: Home,
  pension: Building2,
  pension_sortie: Building2,
  transport: Truck,
  adoption: HeartHandshake,
  justice: Scale,
  justice_audience: Scale,
  communication: Activity,
  depense: Euro,
  statut_change: Activity,
  document: FileText,
  autre: Activity,
  icad: Fingerprint,
  vaccination: Syringe,
  sante_soin: Pill,
};

export function AnimalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnimalDetails | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [faStatuts, setFaStatuts] = useState<Record<string, FamilleAccueilStatutInfo>>({});
  const [icadCount, setIcadCount] = useState(0);
  const [santeCount, setSanteCount] = useState(0);
  const [obsMorsureCount, setObsMorsureCount] = useState(0);
  const [timelineEvent, setTimelineEvent] = useState<any | null>(null);
  const [animalStats, setAnimalStats] = useState<{
    cout_total: number;
    cout_par_jour: number;
    duree_prise_en_charge: number;
    nombre_visites: number;
    nombre_transports: number;
    nombre_sejours_pension: number;
  } | null>(null);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('animals').delete().eq('id', id);
      if (error) throw new Error(error.message);
      navigate('/animaux');
    } catch (err) {
      console.error('Error deleting animal:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const details = await fetchAnimalDetails(id);
      setData(details);

      // Calculer les statistiques de l'animal en temps réel
      const stats = await calculateAnimalStats(id);
      setAnimalStats(stats);

      // Récupérer les statuts des familles d'accueil
      const faIds = details.familles_accueil
        .map((fa) => fa.famille_accueil_id)
        .filter((id): id is string => id !== undefined);
      
      if (faIds.length > 0) {
        const statuts = await getFamillesAccueilStatuts(faIds);
        setFaStatuts(statuts);
      }

      // Nombre de demandes ICAD pour le badge d'onglet
      const { count } = await supabase
        .from('icad_demandes')
        .select('*', { count: 'exact', head: true })
        .eq('animal_id', id);
      setIcadCount(count ?? 0);

      // Nombre de vaccinations + soins pour le badge d'onglet Santé
      const [vaccCount, soinCount] = await Promise.all([
        supabase.from('vaccinations').select('*', { count: 'exact', head: true }).eq('animal_id', id),
        supabase.from('sante_soins').select('*', { count: 'exact', head: true }).eq('animal_id', id),
      ]);
      setSanteCount((vaccCount.count ?? 0) + (soinCount.count ?? 0));

      // Nombre d'observations + morsures pour le badge d'onglet
      const [obsCount, morsCount] = await Promise.all([
        supabase.from('animal_observations').select('*', { count: 'exact', head: true }).eq('animal_id', id),
        supabase.from('morsures').select('*', { count: 'exact', head: true }).eq('animal_id', id),
      ]);
      setObsMorsureCount((obsCount.count ?? 0) + (morsCount.count ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner />;

  if (error || !data) {
    return (
      <EmptyState
        icon={Dog}
        title="Animal introuvable"
        description={error ?? "Cette fiche n'existe pas."}
        action={<Link to="/animaux" className="btn-primary">Retour à la liste</Link>}
      />
    );
  }

  const { animal, signalement, adoptions, visites, justice, sejours, transports,
    documents, depenses, communications, registre, familles_accueil, alerts, cout_total, timeline, status_history } = data;

  const faActive = familles_accueil.filter((f) => f.statut === 'en_cours');
  const faPrevus = familles_accueil.filter((f) => f.statut === 'prevu');
  const faHistorique = familles_accueil.filter((f) => f.statut === 'termine');

  const faStatutColors: Record<FamilleAccueilAnimalStatut, string> = {
    prevu: 'bg-warning-100 text-warning-800',
    en_cours: 'bg-success-100 text-success-700',
    termine: 'bg-neutral-100 text-neutral-600',
  };

  const tabs = [
    { id: 'identite', label: 'Identité', icon: Dog, count: 1 },
    { id: 'situation', label: 'Situation', icon: MapPin, count: 1 },
    { id: 'responsables', label: 'Responsables', icon: Users, count: 1 },
    { id: 'timeline', label: 'Timeline', icon: Activity, count: timeline.length },
    { id: 'historique', label: 'Historique', icon: History, count: status_history.length + visites.length + documents.length },
    { id: 'signalement', label: 'Signalement', icon: Siren, count: signalement ? 1 : 0 },
    { id: 'famille', label: 'Famille d\'accueil', icon: Home, count: familles_accueil.length },
    { id: 'veterinaire', label: 'Vétérinaire', icon: Stethoscope, count: visites.length },
    { id: 'sante', label: 'Santé', icon: HeartPulse, count: santeCount },
    { id: 'comportement', label: 'Observations', icon: Activity, count: obsMorsureCount },
    { id: 'justice', label: 'Justice', icon: Scale, count: justice.length },
    { id: 'pension', label: 'Pension', icon: Building2, count: sejours.length },
    { id: 'transport', label: 'Transport', icon: Truck, count: transports.length },
    { id: 'adoption', label: 'Adoption', icon: HeartHandshake, count: adoptions.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
    { id: 'icad', label: 'ICAD', icon: Fingerprint, count: icadCount },
    { id: 'depenses', label: 'Coûts', icon: Euro, count: depenses.length },
    { id: 'communication', label: 'Communication', icon: Activity, count: communications.length },
    { id: 'registre', label: 'Registre', icon: Calendar, count: registre.length },
  ]
    // Les modules reportés en V2 sont annoncés « à venir » dans la navigation:
    // les exposer ici, remplis de données, contredirait cette promesse.
    .filter((t) => !isV2(t.id))
    .filter((t) => t.count > 0 || ['identite', 'situation', 'responsables', 'timeline', 'historique', 'famille', 'veterinaire', 'sante', 'comportement', 'documents', 'depenses', 'registre', 'icad'].includes(t.id));

  return (
    <div>
      <button onClick={() => navigate('/animaux')} className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      {/* Header - Bandeau de synthèse permanent */}
      <div className="card mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 p-6 sm:flex-row">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt={animal.nom} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
                <Dog size={40} className="text-primary-300" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold text-neutral-900">{animal.nom}</h1>
                <p className="text-sm text-neutral-500">
                  {especeLabels[animal.espece]}{animal.race ? ` · ${animal.race}` : ''}{animal.couleur ? ` · ${animal.couleur}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={animalStatutColors[animal.statut]}>{animalStatutLabels[animal.statut]}</Badge>
                {animal.sante_statut && (
                  <Badge className={santeStatutColors[animal.sante_statut]}>
                    <AlertTriangle size={12} className="mr-1" />
                    {santeStatutLabels[animal.sante_statut]}
                  </Badge>
                )}
                <button
                  onClick={() => {
                    const annonce = `🐕 ${animal.nom} à l'adoption !\n\n${especeLabels[animal.espece]}${animal.race ? ` · ${animal.race}` : ''}${animal.couleur ? ` · ${animal.couleur}` : ''}\n${animal.sexe === 'male' ? 'Mâle' : animal.sexe === 'femelle' ? 'Femelle' : ''}${animal.date_naissance ? ` · Né le ${formatDate(animal.date_naissance)}` : ''}\n\n${animal.description || 'Ce charmant animal cherche une famille aimante.'}\n\nContactez-nous pour plus d'informations !`;
                    navigator.clipboard.writeText(annonce);
                    alert('Annonce copiée dans le presse-papier !');
                  }}
                  className="btn-ghost"
                  title="Générer annonce Facebook"
                >
                  <FileText size={16} /> Annonce
                </button>
                <button
                  onClick={() => {
                    const dossier = `DOSSIER ANIMAL - ${animal.nom}\n\n=== IDENTITÉ ===\nNom: ${animal.nom}\nEspèce: ${especeLabels[animal.espece]}\nRace: ${animal.race || '—'}\nSexe: ${animal.sexe === 'male' ? 'Mâle' : animal.sexe === 'femelle' ? 'Femelle' : '—'}\nDate de naissance: ${animal.date_naissance ? formatDate(animal.date_naissance) : '—'}\nICAD: ${animal.numero_icad || '—'}\nPuce: ${animal.numero_puce || '—'}\n\n=== SITUATION ===\nStatut: ${animalStatutLabels[animal.statut]}\nLieu actuel: ${animal.lieu_actuel || '—'}\nDate PEC: ${animal.date_pec ? formatDate(animal.date_pec) : '—'}\nDate sortie: ${animal.date_sortie ? formatDate(animal.date_sortie) : '—'}\n\n=== SANTÉ ===\nStatut santé: ${santeStatutLabels[animal.sante_statut]}\nStérilisé: ${animal.sterilise ? 'Oui' : 'Non'}\nVacciné: ${animal.vaccinne ? 'Oui' : 'Non'}\nPoids: ${animal.poids || '—'} kg\nNotes: ${animal.sante_notes || '—'}\n\n=== FINANCES ===\nCoût total: ${formatCurrency(cout_total)}\nDurée PEC: ${animalStats?.duree_prise_en_charge || 0} jours\nCoût moyen/jour: ${animalStats?.cout_par_jour ? formatCurrency(animalStats.cout_par_jour) : '—'}\nNombre visites: ${animalStats?.nombre_visites || 0}\nNombre transports: ${animalStats?.nombre_transports || 0}\nNombre séjours pension: ${animalStats?.nombre_sejours_pension || 0}\n\n=== TIMELINE ===\n${timeline.map(e => `• ${formatDateTime(e.date)} - ${e.title}`).join('\n')}\n\nGénéré le: ${formatDateTime(new Date().toISOString())}`;
                    navigator.clipboard.writeText(dossier);
                    alert('Dossier complet copié dans le presse-papier !');
                  }}
                  className="btn-ghost"
                  title="Exporter dossier PDF"
                >
                  <FileText size={16} /> PDF
                </button>
                <button
                  onClick={async () => {
                    if (!id) return;
                    const report = await generateAnimalFinancialReport(id);
                    navigator.clipboard.writeText(report);
                    alert('Rapport financier copié dans le presse-papier !');
                  }}
                  className="btn-ghost"
                  title="Générer rapport financier"
                >
                  <Euro size={16} /> Rapport
                </button>
                <Link to={`/animaux/${animal.id}/edit`} className="btn-ghost"><Pencil size={16} /> Modifier</Link>
                <button onClick={() => setShowDeleteConfirm(true)} className="btn-ghost text-error-600 hover:bg-error-50"><Trash2 size={16} /> Supprimer</button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
              {animal.sexe && <span>{animal.sexe === 'male' ? 'Mâle' : animal.sexe === 'femelle' ? 'Femelle' : ''}</span>}
              {animal.date_naissance && <span>Né le {formatDate(animal.date_naissance)}</span>}
              {(animal.numero_puce || animal.numero_icad || animal.icad_number) && <span>ICAD: {animal.numero_puce || animal.numero_icad || animal.icad_number}</span>}
              {animal.agent && <span>Agent: {animal.agent}</span>}
              {animal.date_pec && <span>PEC: {formatDate(animal.date_pec)}</span>}
              {animal.lieu_actuel && <span className="flex items-center gap-1"><MapPin size={14} /> {animal.lieu_actuel}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {animal.sterilise && <Badge className="bg-success-100 text-success-700">Stérilisé</Badge>}
              {animal.vaccinne && <Badge className="bg-secondary-100 text-secondary-700"><Syringe size={12} className="mr-1" />Vacciné</Badge>}
              {animal.icad_done && <Badge className="bg-info-100 text-info-700">ICAD fait</Badge>}
              {animal.requisition && <Badge className="bg-error-100 text-error-700">Réquisition</Badge>}
              {animal.en_pension && <Badge className="bg-warning-100 text-warning-700">En pension</Badge>}
              {animal.adopte && <Badge className="bg-success-100 text-success-700">Adopté</Badge>}
              {animal.vole && <Badge className="bg-error-100 text-error-700">Volé</Badge>}
              {animal.perdu && <Badge className="bg-warning-100 text-warning-800">Perdu</Badge>}
              {animal.reserve && <Badge className="bg-info-100 text-info-700">Réservé</Badge>}
              {animal.remis_proprietaire && <Badge className="bg-success-100 text-success-700">Remis propriétaire</Badge>}
              <Badge className="bg-error-50 text-error-700"><Euro size={12} className="mr-1" />{formatCurrency(cout_total)}</Badge>
              {justice.length > 0 && <Badge className="bg-neutral-100 text-neutral-700">Justice</Badge>}
              {faActive.length > 0 && <Badge className="bg-success-100 text-success-700"><Home size={12} className="mr-1" />FA: {faActive[0].famille_accueil?.nom}</Badge>}
            </div>
            {/* Bandeau des 3 statuts distincts */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 p-2">
                <p className="text-xs font-medium text-neutral-500">Situation administrative</p>
                <p className="mt-0.5 text-sm font-semibold text-neutral-900">{animalStatutLabels[animal.statut]}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-2">
                <p className="text-xs font-medium text-neutral-500">Hébergement actuel</p>
                <p className="mt-0.5 text-sm font-semibold text-neutral-900">
                  {faActive.length > 0 ? `Famille d'accueil (${faActive[0].famille_accueil?.nom ?? '—'})` :
                   sejours.some((s) => !s.date_sortie) ? 'Pension' :
                   animal.lieu_actuel || 'Centre / Fourrière'}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-2">
                <p className="text-xs font-medium text-neutral-500">Disponibilité adoption</p>
                <p className="mt-0.5 text-sm font-semibold text-neutral-900">
                  {animal.adopte ? 'Adopté' : animal.reserve ? 'Réservé' : animal.remis_proprietaire ? 'Remis au propriétaire' : 'Disponible'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-neutral-50 p-3 text-xs sm:grid-cols-4">
              <div>
                <p className="font-medium text-neutral-500">Statut juridique</p>
                <p className="text-neutral-900">{justice.length > 0 ? 'Dossier en cours' : 'Aucun dossier'}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">Responsable</p>
                <p className="text-neutral-900">{animal.agent || 'Non assigné'}</p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">Prochaine échéance</p>
                <p className="text-neutral-900">
                  {visites.length > 0 && visites[0].prochaine_visite 
                    ? formatDate(visites[0].prochaine_visite)
                    : alerts.length > 0 
                      ? formatDate(alerts[0].date_echeance)
                      : 'Aucune'
                  }
                </p>
              </div>
              <div>
                <p className="font-medium text-neutral-500">Coût total</p>
                <p className="text-neutral-900">{formatCurrency(cout_total)}</p>
              </div>
            </div>
            {animalStats && (
              <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-primary-50 p-3 text-xs sm:grid-cols-4">
                <div>
                  <p className="font-medium text-primary-600">Durée PEC</p>
                  <p className="text-neutral-900">{animalStats.duree_prise_en_charge} jours</p>
                </div>
                <div>
                  <p className="font-medium text-primary-600">Coût/jour</p>
                  <p className="text-neutral-900">{formatCurrency(animalStats.cout_par_jour)}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-600">Visites véto</p>
                  <p className="text-neutral-900">{animalStats.nombre_visites}</p>
                </div>
                <div>
                  <p className="font-medium text-primary-600">Transports</p>
                  <p className="text-neutral-900">{animalStats.nombre_transports}</p>
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
              {animal.date_pec && (
                <span>Durée PEC: {Math.floor((new Date().getTime() - new Date(animal.date_pec).getTime()) / (1000 * 60 * 60 * 24))} jours</span>
              )}
              {animal.date_pec && cout_total > 0 && (
                <span>Coût moyen/jour: {formatCurrency(cout_total / Math.max(1, Math.floor((new Date().getTime() - new Date(animal.date_pec).getTime()) / (1000 * 60 * 60 * 24))))}</span>
              )}
              {alerts.length > 0 && <span className="flex items-center gap-1 text-warning-600"><AlertTriangle size={12} />{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((alert) => {
            const days = daysUntil(alert.date_echeance);
            return (
              <div key={alert.id} className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
                <AlertTriangle size={18} className="shrink-0 text-warning-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning-900">{alert.titre}</p>
                  {alert.message && <p className="text-xs text-warning-700">{alert.message}</p>}
                </div>
                <Badge className={days < 0 ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-800'}>
                  {days >= 0 ? `Dans ${days}j` : `En retard de ${Math.abs(days)}j`}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}>
            <tab.icon size={16} />
            {tab.label}
            {tab.count > 0 && <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {/* IDENTITÉ */}
        {activeTab === 'identite' && (
          <div className="card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Informations d'identité</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-500">Nom</p>
                <p className="mt-1 font-medium text-neutral-900">{animal.nom}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Espèce</p>
                <p className="mt-1">{especeLabels[animal.espece]}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Race</p>
                <p className="mt-1">{animal.race || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Sexe</p>
                <p className="mt-1">{animal.sexe === 'male' ? 'Mâle' : animal.sexe === 'femelle' ? 'Femille' : 'Inconnu'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Date de naissance</p>
                <p className="mt-1">{animal.date_naissance ? formatDate(animal.date_naissance) : '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Âge estimé</p>
                <p className="mt-1">{animal.age_estime || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Couleur / Robe</p>
                <p className="mt-1">{animal.couleur || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Poids</p>
                <p className="mt-1">{animal.poids || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Taille</p>
                <p className="mt-1">{animal.taille || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Numéro de puce (ICAD)</p>
                <p className="mt-1 font-mono">{animal.numero_puce || animal.numero_icad || animal.icad_number || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Numéro de tatouage</p>
                <p className="mt-1 font-mono">{animal.numero_tatouage || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Catégorie</p>
                <p className="mt-1">{animal.description || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-neutral-500">Diagnose</p>
                <p className="mt-1">{animal.comportement || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* SITUATION */}
        {activeTab === 'situation' && (
          <div className="card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Situation actuelle</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-500">Statut actuel</p>
                <p className="mt-1"><Badge className={animalStatutColors[animal.statut]}>{animalStatutLabels[animal.statut]}</Badge></p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Lieu de prise en charge</p>
                <p className="mt-1 flex items-center gap-1"><MapPin size={14} /> {animal.lieu_actuel || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Date de prise en charge</p>
                <p className="mt-1">{animal.date_pec ? formatDate(animal.date_pec) : '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Date de sortie</p>
                <p className="mt-1">{animal.date_sortie ? formatDate(animal.date_sortie) : '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-neutral-500">Motif de sortie</p>
                <p className="mt-1">{animal.motif_sortie || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Statut de santé</p>
                <p className="mt-1"><Badge className={santeStatutColors[animal.sante_statut]}>Santé: {santeStatutLabels[animal.sante_statut]}</Badge></p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Statut juridique</p>
                <p className="mt-1">{justice.length > 0 ? 'Dossier judiciaire en cours' : 'Aucun dossier'}</p>
              </div>
            </div>
          </div>
        )}

        {/* PRISE EN CHARGE */}
        {activeTab === 'situation' && (animal.origine_pec || animal.service_demandeur || animal.circonstances_pec) && (
          <div className="card mt-4 p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Circonstances de la prise en charge</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-500">Origine</p>
                <p className="mt-1">{animal.origine_pec ? (originePecLabels[animal.origine_pec] ?? animal.origine_pec) : '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Service demandeur</p>
                <p className="mt-1">{animal.service_demandeur || '—'}</p>
              </div>
              {animal.service_demandeur_contact && (
                <div>
                  <p className="text-sm font-medium text-neutral-500">Coordonnées du service</p>
                  <p className="mt-1">{animal.service_demandeur_contact}</p>
                </div>
              )}
              {animal.circonstances_pec && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-neutral-500">Circonstances de la récupération</p>
                  <p className="mt-1 whitespace-pre-line text-neutral-900">{animal.circonstances_pec}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESPONSABLES */}
        {activeTab === 'responsables' && (
          <div className="card p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">Répartition des responsabilités</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Présidente</p>
                <p className="mt-1 text-neutral-900">Christelle</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Responsable dossier</p>
                <p className="mt-1 text-neutral-900">À définir</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Responsable animaux</p>
                <p className="mt-1 text-neutral-900">À définir</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Enquêteur</p>
                <p className="mt-1 text-neutral-900">{signalement?.enqueteur_id ? 'Affecté' : 'À définir'}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Éducateur</p>
                <p className="mt-1 text-neutral-900">À définir</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Famille d'accueil</p>
                <p className="mt-1 text-neutral-900">{faActive.length > 0 ? faActive[0].famille_accueil?.nom + ' ' + faActive[0].famille_accueil?.prenom : 'À définir'}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Vétérinaire</p>
                <p className="mt-1 text-neutral-900">{visites.length > 0 && visites[0].veterinaire ? visites[0].veterinaire.nom : 'À définir'}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-500">Communication</p>
                <p className="mt-1 text-neutral-900">À définir</p>
              </div>
            </div>
          </div>
        )}

        {/* OBSERVATIONS & MORSURES */}
        {activeTab === 'comportement' && id && (
          <ObservationsMorsuresSection animalId={id} onChanged={loadData} />
        )}

        {/* HISTORIQUE */}
        {activeTab === 'historique' && (
          <div className="card p-6">
            <h2 className="mb-6 font-heading text-lg font-semibold text-neutral-900">Historique complet</h2>
            <HistoryTimeline
              events={status_history.map((h: StatusHistoryEvent) => ({
                id: h.id,
                date: h.date_changement,
                type: 'statut',
                title: `Changement de statut: ${animalStatutLabels[h.ancien_statut as keyof typeof animalStatutLabels] || h.ancien_statut} → ${animalStatutLabels[h.nouveau_statut as keyof typeof animalStatutLabels] || h.nouveau_statut}`,
                description: h.raison,
                author: h.auteur,
              }))}
              visites={visites}
              documents={documents}
            />
          </div>
        )}

        {/* TIMELINE - Cœur du module */}
        {activeTab === 'timeline' && (
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Timeline Dynamique</h2>
              <div className="flex gap-2">
                <Badge className="bg-primary-100 text-primary-700">{timeline.length} événements</Badge>
              </div>
            </div>
            {timeline.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">Aucun événement enregistré dans la vie de cet animal.</p>
            ) : (
              <div className="space-y-1">
                {timeline.map((event, i) => {
                  const Icon = timelineIcons[event.type] ?? Activity;
                  const getEventColor = (type: string) => {
                    switch (type) {
                      case 'signalement': return 'bg-error-100 text-error-600';
                      case 'veterinaire': return 'bg-accent-100 text-accent-600';
                      case 'famille_accueil': return 'bg-success-100 text-success-600';
                      case 'pension': return 'bg-warning-100 text-warning-600';
                      case 'transport': return 'bg-neutral-100 text-neutral-600';
                      case 'adoption': return 'bg-primary-100 text-primary-600';
                      case 'justice': return 'bg-secondary-100 text-secondary-600';
                      case 'depense': return 'bg-error-50 text-error-700';
                      default: return 'bg-primary-50 text-primary-600';
                    }
                  };
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getEventColor(event.type)}`}>
                          <Icon size={20} />
                        </div>
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-neutral-200" />}
                      </div>
                      <div
                        className="flex-1 cursor-pointer pb-6 transition-colors hover:bg-neutral-50 rounded-lg -mx-2 px-2"
                        onClick={() => setTimelineEvent(event)}
                        title="Cliquer pour voir les détails"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{event.title}</p>
                            {event.description && <p className="mt-1 text-sm text-neutral-600">{event.description}</p>}
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-xs text-neutral-400">{formatDateTime(event.date)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SIGNALEMENT */}
        {activeTab === 'signalement' && signalement && (
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Signalement d'origine</h2>
              <Link to="/signalements" className="text-sm text-primary-600 hover:underline">Voir le module →</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><p className="text-sm font-medium text-neutral-500">N° de dossier</p><p className="mt-1 font-mono text-neutral-900">{signalement.numero_dossier}</p></div>
              <div><p className="text-sm font-medium text-neutral-500">Date</p><p className="mt-1">{formatDate(signalement.date_signalement)}</p></div>
              <div><p className="text-sm font-medium text-neutral-500">Déclarant</p><p className="mt-1">{signalement.declarant_prenom} {signalement.declarant_nom}</p></div>
              <div><p className="text-sm font-medium text-neutral-500">Téléphone</p><p className="mt-1">{signalement.declarant_telephone || '—'}</p></div>
              <div><p className="text-sm font-medium text-neutral-500">Lieu</p><p className="mt-1">{signalement.lieu_signalement || '—'}</p></div>
              <div><p className="text-sm font-medium text-neutral-500">Urgence</p><p className="mt-1 capitalize">{signalement.urgence}</p></div>
              <div className="sm:col-span-2"><p className="text-sm font-medium text-neutral-500">Motif</p><p className="mt-1">{signalement.motif}</p></div>
              {signalement.description && <div className="sm:col-span-2"><p className="text-sm font-medium text-neutral-500">Description</p><p className="mt-1">{signalement.description}</p></div>}
            </div>
          </div>
        )}

        {/* FAMILLE D'ACCUEIL */}
        {activeTab === 'famille' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Familles d'accueil</h2>
              <div className="flex items-center gap-2">
                <InlineCreateFamilleForm animalId={animal.id} onSaved={loadData} />
                <InlineFamilleAccueilForm animalId={animal.id} onSaved={loadData} />
              </div>
            </div>

            {/* Placements en cours */}
            {faActive.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-500">Animaux actuellement accueillis</p>
                {faActive.map((fa) => {
                  const faStatut = fa.famille_accueil_id ? faStatuts[fa.famille_accueil_id] : null;
                  return (
                    <div key={fa.id} className="card mb-2 flex items-center justify-between p-4">
                      <Link to="/familles-accueil" className="flex flex-1 items-center gap-3 transition-colors hover:bg-neutral-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-600"><Home size={20} /></div>
                        <div>
                          <p className="font-medium text-neutral-900">{fa.famille_accueil?.nom} {fa.famille_accueil?.prenom ?? ''}</p>
                          <p className="text-sm text-neutral-500">Depuis le {fa.date_debut ? formatDate(fa.date_debut) : '—'}{fa.famille_accueil?.ville ? ` · ${fa.famille_accueil.ville}` : ''}</p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge className={faStatutColors.en_cours}>En cours</Badge>
                        {faStatut && (
                          <Badge className={faStatut.colorClass}>
                            {faStatut.label}
                          </Badge>
                        )}
                        <InlineEditPlacementForm animalId={animal.id} placement={fa} onSaved={loadData} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Arrivées prévues */}
            {faPrevus.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-500">Arrivées prévues</p>
                {faPrevus.map((fa) => {
                  const faStatut = fa.famille_accueil_id ? faStatuts[fa.famille_accueil_id] : null;
                  return (
                    <div key={fa.id} className="card mb-2 flex items-center justify-between p-4">
                      <Link to="/familles-accueil" className="flex flex-1 items-center gap-3 transition-colors hover:bg-neutral-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-warning-600"><Home size={20} /></div>
                        <div>
                          <p className="font-medium text-neutral-900">{fa.famille_accueil?.nom} {fa.famille_accueil?.prenom ?? ''}</p>
                          <p className="text-sm text-neutral-500">
                            {fa.date_debut ? `Arrivée prévue le ${formatDate(fa.date_debut)}` : 'Date non fixée'}
                            {fa.famille_accueil?.ville ? ` · ${fa.famille_accueil.ville}` : ''}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge className={faStatutColors.prevu}>Prévu</Badge>
                        {faStatut && (
                          <Badge className={faStatut.colorClass}>
                            {faStatut.label}
                          </Badge>
                        )}
                        <InlineEditPlacementForm animalId={animal.id} placement={fa} onSaved={loadData} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Historique */}
            {faHistorique.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-500">Historique des placements</p>
                {faHistorique.map((fa) => {
                  const faStatut = fa.famille_accueil_id ? faStatuts[fa.famille_accueil_id] : null;
                  return (
                    <div key={fa.id} className="card mb-2 flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"><Home size={20} /></div>
                        <div>
                          <p className="font-medium text-neutral-900">{fa.famille_accueil?.nom} {fa.famille_accueil?.prenom ?? ''}</p>
                          <p className="text-sm text-neutral-500">
                            {fa.date_debut ? formatDate(fa.date_debut) : '—'} → {fa.date_fin ? formatDate(fa.date_fin) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fa.motif_fin && <span className="text-xs text-neutral-500">{fa.motif_fin}</span>}
                        <Badge className={faStatutColors.termine}>Terminé</Badge>
                        {faStatut && (
                          <Badge className={faStatut.colorClass}>
                            {faStatut.label}
                          </Badge>
                        )}
                        <InlineEditPlacementForm animalId={animal.id} placement={fa} onSaved={loadData} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {familles_accueil.length === 0 && (
              <div className="card p-6"><EmptyState icon={Home} title="Aucune famille d'accueil" description="Ajoutez un placement depuis le bouton ci-dessus." /></div>
            )}
          </div>
        )}

        {/* VÉTÉRINAIRE - Santé & Carnet Médical complet */}
        {activeTab === 'veterinaire' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Santé & Carnet Médical</h2>
              <div className="flex items-center gap-2">
                <InlineCreateVetForm onSaved={loadData} />
                <InlineVetVisitForm animalId={animal.id} onSaved={loadData} />
              </div>
            </div>

            {/* Résumé santé */}
            <div className="card p-6">
              <h3 className="mb-4 font-heading text-base font-semibold text-neutral-900">État de santé actuel</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-sm font-medium text-neutral-500">Statut santé</p>
                  <Badge className={santeStatutColors[animal.sante_statut]}>{santeStatutLabels[animal.sante_statut]}</Badge>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-sm font-medium text-neutral-500">Stérilisé</p>
                  <p className="mt-1">{animal.sterilise ? 'Oui' : 'Non'}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-sm font-medium text-neutral-500">Vacciné</p>
                  <p className="mt-1">{animal.vaccinne ? 'Oui' : 'Non'}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-sm font-medium text-neutral-500">Poids actuel</p>
                  <p className="mt-1">{animal.poids || '—'} kg</p>
                </div>
              </div>
              {animal.sante_notes && (
                <div className="mt-4 rounded-lg bg-neutral-50 p-3">
                  <p className="text-sm font-medium text-neutral-500">Notes santé</p>
                  <p className="mt-1 text-sm text-neutral-900">{animal.sante_notes}</p>
                </div>
              )}
            </div>

            {/* Historique des visites vétérinaires */}
            <div className="card p-6">
              <h3 className="mb-4 font-heading text-base font-semibold text-neutral-900">Historique des visites vétérinaires</h3>
              {visites.length === 0 ? (
                <EmptyState icon={Stethoscope} title="Aucune visite vétérinaire" />
              ) : (
                <div className="space-y-3">
                  {visites.map((v) => (
                    <div key={v.id} className="rounded-lg border border-neutral-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900">{v.motif}</p>
                          <p className="mt-1 text-sm text-neutral-500">{formatDate(v.date_visite)}{v.veterinaire ? ` · ${v.veterinaire.nom}` : ''}</p>
                          {v.diagnostic && <p className="mt-2 text-sm text-neutral-600"><strong>Diagnostic:</strong> {v.diagnostic}</p>}
                          {v.traitement && <p className="text-sm text-neutral-600"><strong>Traitement:</strong> {v.traitement}</p>}
                        </div>
                        {v.cout != null && <Badge className="bg-error-50 text-error-700">{formatCurrency(v.cout)}</Badge>}
                      </div>
                      {v.prochaine_visite && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-warning-700">
                          <Calendar size={14} /> Prochaine visite: {formatDate(v.prochaine_visite)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alertes traitements et rappels */}
            <div className="card p-6">
              <h3 className="mb-4 font-heading text-base font-semibold text-neutral-900">Alertes & Rappels</h3>
              <div className="space-y-2">
                {!animal.vaccinne && (
                  <div className="flex items-center gap-2 rounded-lg bg-warning-50 p-3">
                    <AlertTriangle size={16} className="text-warning-600" />
                    <p className="text-sm text-warning-800">Vaccination à faire</p>
                  </div>
                )}
                {!animal.sterilise && (
                  <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3">
                    <AlertTriangle size={16} className="text-neutral-600" />
                    <p className="text-sm text-neutral-800">Stérilisation non effectuée</p>
                  </div>
                )}
                {visites.filter(v => v.prochaine_visite && new Date(v.prochaine_visite) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-error-50 p-3">
                    <AlertTriangle size={16} className="text-error-600" />
                    <p className="text-sm text-error-800">Visite vétérinaire à venir sous 7 jours</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* JUSTICE */}
        {activeTab === 'justice' && justice.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Dossier judiciaire</h2>
              <Link to="/justice" className="text-sm text-primary-600 hover:underline">Voir le module →</Link>
            </div>
            {justice.map((j) => (
              <div key={j.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">{j.numero_parquet || 'Dossier sans numéro'}</p>
                    <p className="text-sm text-neutral-500">{j.tribunal || 'Tribunal non défini'}</p>
                  </div>
                  <Badge className="bg-secondary-100 text-secondary-700">{justiceStatutLabels[j.statut]}</Badge>
                </div>
                {j.date_audience && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-warning-700">
                    <Calendar size={14} /> Audience: {formatDate(j.date_audience)}
                    {daysUntil(j.date_audience) >= 0 && daysUntil(j.date_audience) <= 30 && <Badge className="bg-warning-100 text-warning-800 ml-2">Dans {daysUntil(j.date_audience)}j</Badge>}
                  </div>
                )}
                {j.avocat && <p className="mt-2 text-sm text-neutral-600">Avocat: {j.avocat}</p>}
                {j.resume_faits && <p className="mt-2 text-sm text-neutral-600">{j.resume_faits}</p>}
              </div>
            ))}
          </div>
        )}

        {/* PENSION */}
        {activeTab === 'pension' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Séjours en pension</h2>
              <InlinePensionForm animalId={animal.id} onSaved={loadData} />
            </div>
            {sejours.length === 0 ? (
              <div className="card p-6"><EmptyState icon={Building2} title="Aucun séjour en pension" /></div>
            ) : (
              sejours.map((s) => (
                <div key={s.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{s.pension?.nom ?? 'Pension inconnue'} {s.pension && <span className="text-sm text-neutral-500">({pensionTypeLabels[s.pension.type]})</span>}</p>
                      <p className="text-sm text-neutral-500">Entrée: {formatDate(s.date_entree)}{s.date_sortie ? ` · Sortie: ${formatDate(s.date_sortie)}` : ' · En cours'}</p>
                    </div>
                    {s.cout_total != null && <Badge className="bg-error-50 text-error-700">{formatCurrency(s.cout_total)}</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TRANSPORT */}
        {activeTab === 'transport' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Transports</h2>
              <InlineTransportForm animalId={animal.id} onSaved={loadData} />
            </div>
            {transports.length === 0 ? (
              <div className="card p-6"><EmptyState icon={Truck} title="Aucun transport" /></div>
            ) : (
              transports.map((t) => (
                <div key={t.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{t.lieu_depart || '?'} → {t.lieu_arrivee || '?'}</p>
                      <p className="text-sm text-neutral-500">{formatDate(t.date_transport)}{t.transporteur_nom ? ` · ${t.transporteur_nom}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.cout != null && <Badge className="bg-error-50 text-error-700">{formatCurrency(t.cout)}</Badge>}
                      <Badge className="bg-neutral-100 text-neutral-600">{transportStatutLabels[t.statut]}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ADOPTION */}
        {activeTab === 'adoption' && adoptions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Adoptions</h2>
              <Link to="/adoptions" className="text-sm text-primary-600 hover:underline">Voir le module →</Link>
            </div>
            {adoptions.map((a) => (
              <div key={a.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">{a.adoptant_prenom} {a.adoptant_nom}</p>
                    <p className="text-sm text-neutral-500">Candidature du {formatDate(a.date_candidature)}</p>
                  </div>
                  <Badge className="bg-primary-100 text-primary-700">{adoptionStatutLabels[a.statut]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
                  {a.adoptant_telephone && <span>{a.adoptant_telephone}</span>}
                  {a.adoptant_email && <span>{a.adoptant_email}</span>}
                  {a.montant_adoption != null && <span>{formatCurrency(a.montant_adoption)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SANTÉ - Carnet de santé (vaccinations & soins) */}
        {activeTab === 'sante' && id && (
          <CarnetSanteSection animalId={id} espece={animal.espece} onChanged={loadData} />
        )}

        {/* ICAD - Historique détenteurs & demandes */}
        {activeTab === 'icad' && id && (
          <IcadDemandesSection animalId={id} onChanged={loadData} />
        )}

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Documents</h2>
              <InlineCreateDocumentForm animalId={animal.id} onSaved={loadData} />
            </div>
            {documents.length === 0 ? (
              <div className="card p-6"><EmptyState icon={FileText} title="Aucun document" /></div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="card flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-neutral-400" />
                      <div>
                        <p className="font-medium text-neutral-900">{doc.nom_fichier}</p>
                        <p className="text-xs text-neutral-500">{doc.type_document} · {formatDate(doc.created_at)}</p>
                      </div>
                    </div>
                    {/* Bucket privé: le lien de lecture est signé à la demande. */}
                    <button
                      type="button"
                      onClick={() => openDocument(doc).catch((err) =>
                        setError(err instanceof Error ? err.message : 'Impossible d\'ouvrir le document')
                      )}
                      className="btn-ghost"
                    >
                      Voir <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DÉPENSES */}
        {activeTab === 'depenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Coûts cumulés</h2>
              <InlineDepenseForm animalId={animal.id} onSaved={loadData} />
            </div>
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="font-medium text-neutral-700">Total</span>
                <span className="font-heading text-xl font-bold text-error-600">{formatCurrency(cout_total)}</span>
              </div>
              {depenses.length === 0 ? (
                <EmptyState icon={Euro} title="Aucune dépense" />
              ) : (
                <>
                  {/* Catégorisation des coûts */}
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-primary-50 p-3 text-center">
                      <p className="text-lg font-bold text-primary-600">{formatCurrency(depenses.filter(d => d.type === 'veterinaire').reduce((sum, d) => sum + d.montant, 0))}</p>
                      <p className="text-xs text-neutral-600">Vétérinaire</p>
                    </div>
                    <div className="rounded-lg bg-secondary-50 p-3 text-center">
                      <p className="text-lg font-bold text-secondary-600">{formatCurrency(depenses.filter(d => d.type === 'pension').reduce((sum, d) => sum + d.montant, 0))}</p>
                      <p className="text-xs text-neutral-600">Pension</p>
                    </div>
                    <div className="rounded-lg bg-warning-50 p-3 text-center">
                      <p className="text-lg font-bold text-warning-600">{formatCurrency(depenses.filter(d => d.type === 'transport').reduce((sum, d) => sum + d.montant, 0))}</p>
                      <p className="text-xs text-neutral-600">Transport</p>
                    </div>
                    <div className="rounded-lg bg-accent-50 p-3 text-center">
                      <p className="text-lg font-bold text-accent-600">{formatCurrency(depenses.filter(d => d.type === 'nourriture').reduce((sum, d) => sum + d.montant, 0))}</p>
                      <p className="text-xs text-neutral-600">Nourriture</p>
                    </div>
                    <div className="rounded-lg bg-success-50 p-3 text-center">
                      <p className="text-lg font-bold text-success-600">{formatCurrency(depenses.filter(d => d.type === 'materiel').reduce((sum, d) => sum + d.montant, 0))}</p>
                      <p className="text-xs text-neutral-600">Matériel</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 p-3 text-center">
                      <p className="text-lg font-bold text-neutral-600">{formatCurrency(cout_total)}</p>
                      <p className="text-xs text-neutral-600">Total</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {depenses.map((d) => (
                      <div key={d.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{d.description}</p>
                          <p className="text-xs text-neutral-500">{d.type} · {formatDate(d.date_depense)}</p>
                        </div>
                        <span className="font-medium text-neutral-900">{formatCurrency(d.montant)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* COMMUNICATION */}
        {activeTab === 'communication' && communications.length > 0 && (
          <div className="space-y-3">
            {communications.map((c) => (
              <div key={c.id} className="card p-5">
                <p className="font-medium text-neutral-900">{c.titre || c.type}</p>
                <p className="text-sm text-neutral-500">{c.canal || ''} · {formatDate(c.date_publication)}</p>
                {c.contenu && <p className="mt-2 text-sm text-neutral-600">{c.contenu}</p>}
              </div>
            ))}
          </div>
        )}

        {/* REGISTRE */}
        {activeTab === 'registre' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">Registre légal</h2>
              <InlineCreateRegistreForm animalId={animal.id} onSaved={loadData} />
            </div>
            {registre.length === 0 ? (
              <div className="card p-6"><EmptyState icon={Calendar} title="Aucune entrée au registre" /></div>
            ) : (
              <div className="card p-6">
                <div className="space-y-2">
                  {registre.map((r) => (
                    <div key={r.id} className="flex items-center justify-between border-b border-neutral-100 py-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{r.motif || (r.type_mouvement === 'entree' ? 'Entrée' : 'Sortie')}</p>
                        <p className="text-xs text-neutral-500">{r.type_mouvement === 'entree' ? 'Entrée' : 'Sortie'} · {formatDate(r.date)}</p>
                      </div>
                      <Badge className={r.type_mouvement === 'entree' ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-600'}>
                        {r.type_mouvement === 'entree' ? 'Entrée' : 'Sortie'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline Event Detail Modal */}
      <Modal open={!!timelineEvent} onClose={() => setTimelineEvent(null)} title="Détail de l'événement" size="md">
        {timelineEvent && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">Titre</p>
              <p className="mt-1 font-medium text-neutral-900">{timelineEvent.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Date</p>
              <p className="mt-1 text-neutral-900">{formatDateTime(timelineEvent.date)}</p>
            </div>
            {timelineEvent.description && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Description</p>
                <p className="mt-1 whitespace-pre-line text-neutral-900">{timelineEvent.description}</p>
              </div>
            )}
            {timelineEvent.details && Object.keys(timelineEvent.details).filter((k) => k !== 'action').length > 0 && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Détails</p>
                <div className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-3">
                  {Object.entries(timelineEvent.details)
                    .filter(([k]) => k !== 'action')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-sm">
                        <span className="text-neutral-500">{k.replace(/_/g, ' ')}</span>
                        <span className="text-right font-medium text-neutral-900">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md p-6">
            <h3 className="font-heading text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Voulez-vous vraiment supprimer <strong>{animal.nom}</strong> ? Cette action est irreversible et supprimera egalement toutes les donnees associees (visites, documents, etc.).
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
