import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dog,
  Siren,
  HeartHandshake,
  Stethoscope,
  AlertTriangle,
  Euro,
  Home,
  Calendar,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Truck,
  Scale,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  alertPrioriteColors,
  alertPrioriteLabels,
  daysUntil,
  formatCurrency,
  formatDate,
} from '../lib/constants';
import { generateAllAlerts } from '../lib/alerts';
import type { Animal, Alert } from '../types';

export function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userName] = useState(profile?.full_name || 'Utilisateur');
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    totalAnimaux: 0,
    aAdopter: 0,
    enFamilleAccueil: 0,
    enPension: 0,
    enSoins: 0,
    hospitalises: 0,
    sousRequisition: 0,
    adoptes: 0,
    urgencesPlacement: 0,
    signalementsOuverts: 0,
    signalementsUrgents: 0,
    adoptionsEnCours: 0,
    famillesActives: 0,
    placesLibres: 0,
    coutTotal: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleBlock = (blockId: string) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('fr-FR', options);
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    // Générer automatiquement les alertes
    await generateAllAlerts();

    const [animauxRes, signalementsRes, adoptionsRes, depensesRes, alertsRes, famillesRes, visitesRes] = await Promise.all([
      supabase.from('animals').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('signalements').select('*', { count: 'exact' }),
      supabase.from('adoptions').select('*', { count: 'exact' }).not('statut', 'in', '("adoptee","refusee")'),
      supabase.from('depenses').select('montant'),
      supabase.from('alerts').select('*, animal:animals(*)').eq('statut', 'active').order('date_echeance').limit(10),
      supabase.from('famille_accueils').select('*'),
      supabase.from('visites_veterinaires').select('*').gte('date_visite', new Date().toISOString().split('T')[0]),
    ]);

    const animaux = (animauxRes.data ?? []) as Animal[];
    const signalements = (signalementsRes.data ?? []) as any[];
    const familles = (famillesRes.data ?? []) as any[];

    setStats({
      totalAnimaux: animaux.length,
      aAdopter: animaux.filter((a) => a.statut === 'a_adopter').length,
      enFamilleAccueil: animaux.filter((a) => a.statut === 'en_famille_accueil').length,
      enPension: animaux.filter((a) => a.statut === 'en_pension').length,
      enSoins: animaux.filter((a) => a.statut === 'en_soins').length,
      hospitalises: animaux.filter((a) => a.statut === 'en_soins').length,
      sousRequisition: animaux.filter((a) => a.requisition).length,
      adoptes: animaux.filter((a) => a.adopte).length,
      urgencesPlacement: animaux.filter((a) => a.statut === 'a_adopter' && a.sante_statut === 'critique').length,
      signalementsOuverts: signalements.filter((s) => ['nouveau', 'en_cours'].includes(s.statut)).length,
      signalementsUrgents: signalements.filter((s) => s.urgence === 'critique' || s.urgence === 'urgent').length,
      adoptionsEnCours: adoptionsRes.count ?? 0,
      famillesActives: familles.filter((f) => f.contrat_actif).length,
      placesLibres: familles.reduce((sum, f) => sum + (f.capacite_max || 0) - (f.animaux_actuels || 0), 0),
      coutTotal: (depensesRes.data ?? []).reduce((sum, d) => sum + (d.montant ?? 0), 0),
    });

    setAlerts((alertsRes.data ?? []) as Alert[]);
    setTodayEvents((visitesRes.data ?? []) as any[]);

    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Module d'accueil personnalisé */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">👋 Bonjour {userName}</h1>
            <p className="mt-1 text-primary-100">📅 {getCurrentDate()}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              <span>{stats.signalementsUrgents} urgences</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              <span>{todayEvents.length} RDV aujourd'hui</span>
            </div>
            <div className="flex items-center gap-2">
              <Dog size={20} />
              <span>{stats.totalAnimaux} animaux en charge</span>
            </div>
            <div className="flex items-center gap-2">
              <HeartHandshake size={20} />
              <span>{stats.adoptionsEnCours} adoptions prévues</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 11 - Actions Rapides */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link to="/animaux/nouveau" className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-white transition-colors hover:bg-primary-700">
          <Plus size={20} />
          <span className="font-medium">Nouvel animal</span>
        </Link>
        <Link to="/signalements/nouveau" className="flex items-center gap-2 rounded-lg bg-error-600 px-4 py-3 text-white transition-colors hover:bg-error-700">
          <Siren size={20} />
          <span className="font-medium">Signalement</span>
        </Link>
        <Link to="/familles-accueil/nouveau" className="flex items-center gap-2 rounded-lg bg-success-600 px-4 py-3 text-white transition-colors hover:bg-success-700">
          <Home size={20} />
          <span className="font-medium">Nouvelle FA</span>
        </Link>
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3">
          <Search size={20} className="text-neutral-400" />
          <input
            type="text"
            placeholder="Recherche globale (Nom, ICAD, FA, Enquêteur, Vétérinaire...)"
            className="flex-1 border-none outline-none text-sm"
          />
        </div>
      </div>

      {/* Bloc 1 - Urgences */}
      <div className="mb-4 card border-l-4 border-error-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <AlertTriangle className="text-error-500" size={20} />
            Bloc 1 – Urgences (🔴/🟠)
          </h2>
          <button onClick={() => toggleBlock('urgences')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.urgences ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.urgences && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-error-50 p-4">
                <p className="text-2xl font-bold text-error-600">{stats.signalementsUrgents}</p>
                <p className="text-sm text-neutral-600">Signalements urgents</p>
              </div>
              <div className="rounded-lg bg-error-50 p-4">
                <p className="text-2xl font-bold text-error-600">{stats.hospitalises}</p>
                <p className="text-sm text-neutral-600">Animaux hospitalisés</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-4">
                <p className="text-2xl font-bold text-warning-600">{stats.urgencesPlacement}</p>
                <p className="text-sm text-neutral-600">Urgences placement</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-4">
                <p className="text-2xl font-bold text-warning-600">{stats.sousRequisition}</p>
                <p className="text-sm text-neutral-600">Sous réquisition</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 2 - Aujourd'hui */}
      <div className="mb-4 card border-l-4 border-primary-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Calendar className="text-primary-500" size={20} />
            Bloc 2 – Aujourd'hui
          </h2>
          <button onClick={() => toggleBlock('aujourdhui')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.aujourdhui ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.aujourdhui && (
          <div className="p-5">
            {todayEvents.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun RDV prévu aujourd'hui</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                    <div className="flex items-center gap-3">
                      <Stethoscope className="text-primary-500" size={18} />
                      <div>
                        <p className="font-medium text-neutral-900">{event.motif}</p>
                        <p className="text-xs text-neutral-500">{formatDate(event.date_visite)}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary-100 text-primary-700">RDV Vétérinaire</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bloc 3 - Synthèse Animaux */}
      <div className="mb-4 card border-l-4 border-success-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Dog className="text-success-500" size={20} />
            Bloc 3 – Synthèse Animaux
          </h2>
          <button onClick={() => toggleBlock('synthese')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.synthese ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.synthese && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <div className="rounded-lg bg-success-50 p-4 text-center">
                <p className="text-2xl font-bold text-success-600">{stats.enFamilleAccueil}</p>
                <p className="text-xs text-neutral-600">En FA</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-4 text-center">
                <p className="text-2xl font-bold text-warning-600">{stats.enPension}</p>
                <p className="text-xs text-neutral-600">Pension</p>
              </div>
              <div className="rounded-lg bg-error-50 p-4 text-center">
                <p className="text-2xl font-bold text-error-600">{stats.hospitalises}</p>
                <p className="text-xs text-neutral-600">Hospitalisés</p>
              </div>
              <div className="rounded-lg bg-accent-50 p-4 text-center">
                <p className="text-2xl font-bold text-accent-600">{stats.sousRequisition}</p>
                <p className="text-xs text-neutral-600">Réquisition</p>
              </div>
              <div className="rounded-lg bg-primary-50 p-4 text-center">
                <p className="text-2xl font-bold text-primary-600">{stats.aAdopter}</p>
                <p className="text-xs text-neutral-600">À adopter</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 text-center">
                <p className="text-2xl font-bold text-neutral-600">{stats.urgencesPlacement}</p>
                <p className="text-xs text-neutral-600">Urgences</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 4 - Familles d'Accueil */}
      <div className="mb-4 card border-l-4 border-secondary-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Home className="text-secondary-500" size={20} />
            Bloc 4 – Familles d'Accueil
          </h2>
          <button onClick={() => toggleBlock('fa')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.fa ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.fa && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-success-50 p-4 text-center">
                <p className="text-2xl font-bold text-success-600">{stats.placesLibres}</p>
                <p className="text-sm text-neutral-600">Places libres</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-4 text-center">
                <p className="text-2xl font-bold text-warning-600">0</p>
                <p className="text-sm text-neutral-600">Pré-visites à programmer</p>
              </div>
              <div className="rounded-lg bg-error-50 p-4 text-center">
                <p className="text-2xl font-bold text-error-600">0</p>
                <p className="text-sm text-neutral-600">FA sans nouvelles</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 5 - Santé & Soins */}
      <div className="mb-4 card border-l-4 border-accent-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Stethoscope className="text-accent-500" size={20} />
            Bloc 5 – Santé & Soins
          </h2>
          <button onClick={() => toggleBlock('sante')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.sante ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.sante && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-error-50 p-4 text-center">
                <p className="text-2xl font-bold text-error-600">0</p>
                <p className="text-sm text-neutral-600">Vaccins en retard</p>
              </div>
              <div className="rounded-lg bg-warning-50 p-4 text-center">
                <p className="text-2xl font-bold text-warning-600">0</p>
                <p className="text-sm text-neutral-600">Vaccins à venir</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 text-center">
                <p className="text-2xl font-bold text-neutral-600">0</p>
                <p className="text-sm text-neutral-600">Traitements en cours</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 6 - Logistique & Transports */}
      <div className="mb-4 card border-l-4 border-neutral-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Truck className="text-neutral-500" size={20} />
            Bloc 6 – Logistique & Transports
          </h2>
          <button onClick={() => toggleBlock('transport')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.transport ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.transport && (
          <div className="p-5">
            <p className="text-sm text-neutral-500">Aucun transport urgent à organiser</p>
          </div>
        )}
      </div>

      {/* Bloc 7 - Affaires Juridiques */}
      <div className="mb-4 card border-l-4 border-warning-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Scale className="text-warning-500" size={20} />
            Bloc 7 – Affaires Juridiques
          </h2>
          <button onClick={() => toggleBlock('justice')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.justice ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.justice && (
          <div className="p-5">
            <p className="text-sm text-neutral-500">Aucune audience ou délai critique à traiter</p>
          </div>
        )}
      </div>

      {/* Bloc 8 - Communication */}
      <div className="mb-4 card border-l-4 border-info-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <FileText className="text-info-500" size={20} />
            Bloc 8 – Communication
          </h2>
          <button onClick={() => toggleBlock('communication')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.communication ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.communication && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-warning-50 p-4 text-center">
                <p className="text-2xl font-bold text-warning-600">{stats.aAdopter}</p>
                <p className="text-sm text-neutral-600">Animaux non publiés</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 text-center">
                <p className="text-2xl font-bold text-neutral-600">0</p>
                <p className="text-sm text-neutral-600">Demandes FA à traiter</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 text-center">
                <p className="text-2xl font-bold text-neutral-600">0</p>
                <p className="text-sm text-neutral-600">Avis/réseaux à traiter</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 9 - Finances */}
      <div className="mb-4 card border-l-4 border-success-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Euro className="text-success-500" size={20} />
            Bloc 9 – Finances
          </h2>
          <button onClick={() => toggleBlock('finances')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.finances ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.finances && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-warning-50 p-4 text-center">
                <p className="text-2xl font-bold text-warning-600">0</p>
                <p className="text-sm text-neutral-600">Factures vétérinaires</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 text-center">
                <p className="text-2xl font-bold text-neutral-600">{formatCurrency(stats.coutTotal)}</p>
                <p className="text-sm text-neutral-600">Dépenses totales</p>
              </div>
              <div className="rounded-lg bg-success-50 p-4 text-center">
                <p className="text-2xl font-bold text-success-600">0</p>
                <p className="text-sm text-neutral-600">Dons du mois</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloc 10 - Mes Tâches */}
      <div className="mb-4 card border-l-4 border-primary-500">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <CheckCircle className="text-primary-500" size={20} />
            Bloc 10 – Mes Tâches
          </h2>
          <button onClick={() => toggleBlock('taches')} className="text-neutral-400 hover:text-neutral-600">
            {collapsedBlocks.taches ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        {!collapsedBlocks.taches && (
          <div className="p-5">
            <p className="text-sm text-neutral-500">Aucune tâche personnelle assignée</p>
          </div>
        )}
      </div>

      {/* Alertes */}
      <div className="mb-4 card">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">
            Alertes & rappels
          </h2>
          <Badge className="bg-warning-100 text-warning-800">{alerts.length}</Badge>
        </div>
        <div className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-neutral-500">
              Aucune alerte active.
            </p>
          ) : (
            alerts.map((alert) => {
              const days = daysUntil(alert.date_echeance);
              return (
                <div key={alert.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{alert.titre}</p>
                      {alert.message && (
                        <p className="mt-0.5 text-xs text-neutral-500">{alert.message}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge className={alertPrioriteColors[alert.priorite]}>
                          {alertPrioriteLabels[alert.priorite]}
                        </Badge>
                        <span className="text-xs text-neutral-400">
                          {days >= 0 ? `Dans ${days}j` : `Il y a ${Math.abs(days)}j`}
                        </span>
                      </div>
                    </div>
                    {alert.animal && (
                      <Link
                        to={`/animaux/${alert.animal.id}`}
                        className="shrink-0 text-xs font-medium text-primary-600 hover:underline"
                      >
                        {alert.animal.nom}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
