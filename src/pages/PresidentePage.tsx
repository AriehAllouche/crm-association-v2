import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Dog,
  Siren,
  HeartHandshake,
  Euro,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Activity,
  FileText,
  Scale,
  Truck,
  Home,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, Badge } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import type { Animal, Signalement, Adoption, FamilleAccueil, JusticeCase, Transport, Pension } from '../types';

interface DashboardStats {
  totalAnimaux: number;
  aAdopter: number;
  enFamilleAccueil: number;
  enPension: number;
  enSoins: number;
  hospitalises: number;
  sousRequisition: number;
  adoptes: number;
  urgencesPlacement: number;
  signalementsOuverts: number;
  signalementsUrgents: number;
  adoptionsEnCours: number;
  famillesActives: number;
  placesLibres: number;
  coutTotal: number;
  donsMois: number;
  audiencesAvenir: number;
  transportsAvenir: number;
}

interface RecentAction {
  id: string;
  type: string;
  description: string;
  date: string;
  user?: string;
}

export function PresidentePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
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
    donsMois: 0,
    audiencesAvenir: 0,
    transportsAvenir: 0,
  });
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [bénévolesConnectes, setBénévolesConnectes] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [
      animauxRes,
      signalementsRes,
      adoptionsRes,
      depensesRes,
      famillesRes,
      justiceRes,
      transportsRes,
      pensionsRes,
      actionsRes,
      usersRes,
    ] = await Promise.all([
      supabase.from('animals').select('*'),
      supabase.from('signalements').select('*'),
      supabase.from('adoptions').select('*').not('statut', 'in', '("adoptee","refusee")'),
      supabase.from('depenses').select('montant'),
      supabase.from('famille_accueils').select('*'),
      supabase.from('justice_cases').select('*').gte('date_audience', new Date().toISOString().split('T')[0]),
      supabase.from('transports').select('*').gte('date_transport', new Date().toISOString().split('T')[0]),
      supabase.from('pensions').select('*'),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*').eq('actif', true),
    ]);

    const animaux = (animauxRes.data ?? []) as Animal[];
    const signalements = (signalementsRes.data ?? []) as Signalement[];
    const familles = (famillesRes.data ?? []) as FamilleAccueil[];
    const justice = (justiceRes.data ?? []) as JusticeCase[];
    const transports = (transportsRes.data ?? []) as Transport[];
    const pensions = (pensionsRes.data ?? []) as Pension[];
    const actions = (actionsRes.data ?? []) as any[];
    const users = (usersRes.data ?? []) as any[];

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
      donsMois: 0, // À implémenter avec table dons
      audiencesAvenir: justice.length,
      transportsAvenir: transports.length,
    });

    setRecentActions(
      actions.map((action) => ({
        id: action.id,
        type: action.action_type || 'action',
        description: action.description || 'Action système',
        date: action.created_at,
        user: action.user_name || 'Système',
      }))
    );

    setBénévolesConnectes(users.length);
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Vue Présidente"
        subtitle="Tableau de bord consolidé - Vue décisionnelle"
      />

      {/* Stats principales */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Animaux en charge</p>
              <p className="text-2xl font-bold text-neutral-900">{stats.totalAnimaux}</p>
            </div>
            <Dog className="text-primary-500" size={24} />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Signalements urgents</p>
              <p className="text-2xl font-bold text-error-600">{stats.signalementsUrgents}</p>
            </div>
            <Siren className="text-error-500" size={24} />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Adoptions en cours</p>
              <p className="text-2xl font-bold text-success-600">{stats.adoptionsEnCours}</p>
            </div>
            <HeartHandshake className="text-success-500" size={24} />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Dépenses totales</p>
              <p className="text-2xl font-bold text-warning-600">{formatCurrency(stats.coutTotal)}</p>
            </div>
            <Euro className="text-warning-500" size={24} />
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Répartition des animaux */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">
            Répartition des animaux
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">À adopter</span>
              <Badge className="bg-warning-100 text-warning-800">{stats.aAdopter}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">En famille d'accueil</span>
              <Badge className="bg-primary-100 text-primary-700">{stats.enFamilleAccueil}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">En pension</span>
              <Badge className="bg-secondary-100 text-secondary-700">{stats.enPension}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">En soins</span>
              <Badge className="bg-error-100 text-error-700">{stats.enSoins}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Sous réquisition</span>
              <Badge className="bg-neutral-100 text-neutral-700">{stats.sousRequisition}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Adoptés</span>
              <Badge className="bg-success-100 text-success-700">{stats.adoptes}</Badge>
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div className="card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">
            Activité récente
          </h2>
          <div className="space-y-3">
            {recentActions.length === 0 ? (
              <p className="text-sm text-neutral-500">Aucune action récente</p>
            ) : (
              recentActions.slice(0, 5).map((action) => (
                <div key={action.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{action.description}</p>
                    <p className="text-xs text-neutral-500">
                      {action.user} • {formatDate(action.date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modules clés */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/signalements" className="card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <Siren className="text-error-500" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Signalements</p>
              <p className="text-xs text-neutral-500">{stats.signalementsOuverts} ouverts</p>
            </div>
          </div>
        </Link>

        <Link to="/familles-accueil" className="card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <Home className="text-primary-500" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Familles d'accueil</p>
              <p className="text-xs text-neutral-500">{stats.famillesActives} actives • {stats.placesLibres} places libres</p>
            </div>
          </div>
        </Link>

        <Link to="/justice" className="card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <Scale className="text-warning-500" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Justice</p>
              <p className="text-xs text-neutral-500">{stats.audiencesAvenir} audiences à venir</p>
            </div>
          </div>
        </Link>

        <Link to="/transports" className="card p-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <Truck className="text-secondary-500" size={20} />
            <div>
              <p className="text-sm font-medium text-neutral-900">Transports</p>
              <p className="text-xs text-neutral-500">{stats.transportsAvenir} à venir</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Bénévoles connectés */}
      <div className="mt-6 card p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">
          Bénévoles connectés
        </h2>
        <div className="flex items-center gap-4">
          <Users className="text-primary-500" size={32} />
          <div>
            <p className="text-2xl font-bold text-neutral-900">{bénévolesConnectes}</p>
            <p className="text-sm text-neutral-600">bénévoles actifs dans le système</p>
          </div>
        </div>
      </div>
    </div>
  );
}
