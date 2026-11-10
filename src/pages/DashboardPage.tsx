import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dog,
  Siren,
  HeartHandshake,
  Stethoscope,
  AlertTriangle,
  Euro,
  Activity,
  CalendarClock,
  Home,
  HeartPulse,
  Truck,
  Scale,
  Plus,
} from 'lucide-react';
import { PageHeader, StatCard, LoadingSpinner, Badge, EmptyState } from '../components/ui';
import { DashboardSection, DashboardMetric } from '../components/DashboardSection';
import { fetchDashboardOverview, type DashboardOverview } from '../lib/dashboardData';
import {
  animalStatutLabels,
  animalStatutColors,
  alertPrioriteColors,
  alertPrioriteLabels,
  daysUntil,
  formatCurrency,
} from '../lib/constants';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { profile, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchDashboardOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;

  if (error || !overview) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Tableau de bord indisponible"
        description={error ?? 'Les données n\'ont pas pu être chargées.'}
        action={<button onClick={load} className="btn-primary">Réessayer</button>}
      />
    );
  }

  const { stats, recentAnimaux, alerts, blocks } = overview;
  const firstName = profile?.full_name?.split(' ')[0];
  const dateDuJour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const quickActions = [
    hasPermission('animaux_gestion') && { to: '/animaux/nouveau', label: 'Nouvel animal' },
    hasPermission('signalements') && { to: '/signalements', label: 'Nouveau signalement' },
    hasPermission('familles_accueil') && { to: '/familles-accueil', label: 'Nouvelle famille' },
  ].filter((action): action is { to: string; label: string } => Boolean(action));

  return (
    <div>
      <PageHeader
        title={`Bonjour${firstName ? ` ${firstName}` : ''}`}
        subtitle={`${dateDuJour} · Vue d'ensemble de l'activité de l'association`}
        action={
          quickActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="btn-ghost">
                  <Plus size={16} /> {action.label}
                </Link>
              ))}
            </div>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Animaux suivis" value={stats.totalAnimaux} icon={Dog} color="primary" />
        <StatCard label="À adopter" value={stats.aAdopter} icon={HeartHandshake} color="success" />
        <StatCard label="En famille d'accueil" value={stats.enFamilleAccueil} icon={Home} color="secondary" />
        <StatCard label="En soins" value={stats.enSoins} icon={Stethoscope} color="error" />
        <StatCard label="Signalements ouverts" value={stats.signalementsOuverts} icon={Siren} color="warning" />
        <StatCard label="Adoptions en cours" value={stats.adoptionsEnCours} icon={HeartHandshake} color="accent" />
        {hasPermission('finances') && (
          <StatCard label="Coûts totaux" value={formatCurrency(stats.coutTotal)} icon={Euro} color="error" />
        )}
        <StatCard label="Alertes actives" value={stats.alertesActives} icon={AlertTriangle} color="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {hasPermission('signalements') && (
          <DashboardSection title="Urgences" icon={Siren} tone="error">
            <DashboardMetric label="Signalements rouges" value={blocks.urgences.signalementsRouges} alert={blocks.urgences.signalementsRouges > 0} />
            <DashboardMetric label="Signalements oranges" value={blocks.urgences.signalementsOranges} />
            <DashboardMetric label="Non affectés depuis 24 h" value={blocks.urgences.signalementsNonAffectes} alert={blocks.urgences.signalementsNonAffectes > 0} />
            <DashboardMetric label="Alertes critiques ou urgentes" value={blocks.urgences.alertesCritiques} alert={blocks.urgences.alertesCritiques > 0} />
          </DashboardSection>
        )}

        <DashboardSection title="Aujourd'hui" icon={CalendarClock} tone="warning">
          <DashboardMetric label="Rendez-vous vétérinaires" value={blocks.aujourdhui.rdvVeto} />
          <DashboardMetric label="Transports prévus" value={blocks.aujourdhui.transportsPrevus} />
          <DashboardMetric label="Audiences" value={blocks.aujourdhui.audiences} />
          <DashboardMetric label="Échéances du jour" value={blocks.aujourdhui.alertesDuJour} />
        </DashboardSection>

        {hasPermission('familles_accueil') && (
          <DashboardSection title="Familles d'accueil" icon={Home} tone="primary">
            <DashboardMetric label="Contrats actifs" value={blocks.familles.contratsActifs} />
            <DashboardMetric label="Disponibles" value={blocks.familles.disponibles} />
            <DashboardMetric label="Complètes" value={blocks.familles.completes} />
            <DashboardMetric label="Places libres" value={blocks.familles.placesLibres} />
          </DashboardSection>
        )}

        {hasPermission('sante') && (
          <DashboardSection title="Santé" icon={HeartPulse} tone="success">
            <DashboardMetric label="Vaccins à suivre" value={blocks.sante.vaccinsASuivre} alert={blocks.sante.vaccinsASuivre > 0} />
            <DashboardMetric label="Animaux graves ou critiques" value={blocks.sante.animauxGraves} alert={blocks.sante.animauxGraves > 0} />
          </DashboardSection>
        )}

        {hasPermission('transports') && (
          <DashboardSection title="Transports" icon={Truck} tone="neutral">
            <DashboardMetric label="Planifiés" value={blocks.transports.planifies} />
            <DashboardMetric label="En cours" value={blocks.transports.enCours} />
            <DashboardMetric label="Terminés" value={blocks.transports.termines} />
            {hasPermission('finances') && (
              <DashboardMetric label="Coût des transports" value={formatCurrency(blocks.transports.coutTotal)} />
            )}
          </DashboardSection>
        )}

        {hasPermission('justice') && (
          <DashboardSection title="Justice" icon={Scale} tone="error">
            <DashboardMetric label="Dossiers actifs" value={blocks.justice.dossiersActifs} />
            <DashboardMetric label="Audiences sous 7 jours" value={blocks.justice.audiencesSemaine} alert={blocks.justice.audiencesSemaine > 0} />
          </DashboardSection>
        )}

        {hasPermission('finances') && (
          <DashboardSection title="Finances" icon={Euro} tone="neutral">
            <DashboardMetric label="Dépenses du mois" value={formatCurrency(blocks.finances.depensesMois)} />
            <DashboardMetric label="Nombre de dépenses" value={blocks.finances.nbDepensesMois} />
          </DashboardSection>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent animals */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">
                Animaux récents
              </h2>
              <Link to="/animaux" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Voir tout →
              </Link>
            </div>
            <div className="divide-y divide-neutral-100">
              {recentAnimaux.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-neutral-500">
                  Aucun animal enregistré pour le moment.
                </p>
              ) : (
                recentAnimaux.map((animal) => (
                  <Link
                    key={animal.id}
                    to={`/animaux/${animal.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-neutral-50"
                  >
                    <div className="flex items-center gap-3">
                      {animal.photo_url ? (
                        <img src={animal.photo_url} alt={animal.nom} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                          <Dog size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">{animal.nom}</p>
                        <p className="text-xs text-neutral-500">
                          {animal.espece} {animal.race ? `· ${animal.race}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge className={animalStatutColors[animal.statut]}>
                      {animalStatutLabels[animal.statut]}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div>
          <div className="card">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">
                Alertes & rappels
              </h2>
              <Badge className="bg-warning-100 text-warning-800">{stats.alertesActives}</Badge>
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
      </div>
    </div>
  );
}
