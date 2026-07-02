import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dog,
  Siren,
  HeartHandshake,
  Stethoscope,
  AlertTriangle,
  Euro,
  Activity,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, StatCard, LoadingSpinner, Badge } from '../components/ui';
import {
  animalStatutLabels,
  animalStatutColors,
  alertPrioriteColors,
  alertPrioriteLabels,
  daysUntil,
  formatCurrency,
} from '../lib/constants';
import type { Animal, Alert } from '../types';

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAnimaux: 0,
    aAdopter: 0,
    enFamilleAccueil: 0,
    enSoins: 0,
    signalementsOuverts: 0,
    adoptionsEnCours: 0,
    coutTotal: 0,
  });
  const [recentAnimaux, setRecentAnimaux] = useState<Animal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [animauxRes, signalementsRes, adoptionsRes, depensesRes, alertsRes] = await Promise.all([
      supabase.from('animals').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('signalements').select('*', { count: 'exact' }).in('statut', ['nouveau', 'en_cours']),
      supabase.from('adoptions').select('*', { count: 'exact' }).not('statut', 'in', '("adoptee","refusee")'),
      supabase.from('depenses').select('montant'),
      supabase.from('alerts').select('*, animal:animals(*)').eq('statut', 'active').order('date_echeance').limit(10),
    ]);

    const animaux = (animauxRes.data ?? []) as Animal[];
    setRecentAnimaux(animaux);

    setStats({
      totalAnimaux: animaux.length,
      aAdopter: animaux.filter((a) => a.statut === 'a_adopter').length,
      enFamilleAccueil: animaux.filter((a) => a.statut === 'en_famille_accueil').length,
      enSoins: animaux.filter((a) => a.statut === 'en_soins').length,
      signalementsOuverts: signalementsRes.count ?? 0,
      adoptionsEnCours: adoptionsRes.count ?? 0,
      coutTotal: (depensesRes.data ?? []).reduce((sum, d) => sum + (d.montant ?? 0), 0),
    });

    setAlerts((alertsRes.data ?? []) as Alert[]);

    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de l'activité de l'association"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Animaux suivis" value={stats.totalAnimaux} icon={Dog} color="primary" />
        <StatCard label="À adopter" value={stats.aAdopter} icon={HeartHandshake} color="success" />
        <StatCard label="En famille d'accueil" value={stats.enFamilleAccueil} icon={Activity} color="secondary" />
        <StatCard label="En soins" value={stats.enSoins} icon={Stethoscope} color="error" />
        <StatCard label="Signalements ouverts" value={stats.signalementsOuverts} icon={Siren} color="warning" />
        <StatCard label="Adoptions en cours" value={stats.adoptionsEnCours} icon={HeartHandshake} color="accent" />
        <StatCard label="Coûts totaux" value={formatCurrency(stats.coutTotal)} icon={Euro} color="error" />
        <StatCard label="Alertes actives" value={alerts.length} icon={AlertTriangle} color="warning" />
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
      </div>
    </div>
  );
}
