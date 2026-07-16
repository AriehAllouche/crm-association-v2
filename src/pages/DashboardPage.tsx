import { useEffect, useState } from 'react';
import { Dog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, Badge } from '../components/ui';
import { generateAllAlerts } from '../lib/alerts';
import { useAuth } from '../context/AuthContext';
import { DashboardPresident } from '../components/dashboard/DashboardPresident';
import { DashboardVeterinary } from '../components/dashboard/DashboardVeterinary';
import { DashboardFAManager } from '../components/dashboard/DashboardFAManager';
import type { Animal, Alert, FamilleAccueil, Signalement, VeterinaireVisite } from '../types';

export function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  // Données de l'application
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [familles, setFamilles] = useState<FamilleAccueil[]>([]);
  const [visites, setVisites] = useState<VeterinaireVisite[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Auto-générer les alertes
      await generateAllAlerts();

      // Requêtes parallèles pour les données nécessaires
      const [
        animalsRes,
        signalementsRes,
        famillesRes,
        visitesRes,
        alertsRes
      ] = await Promise.all([
        supabase.from('animals').select('*').order('created_at', { ascending: false }),
        supabase.from('signalements').select('*, animal:animals(*)').order('created_at', { ascending: false }),
        supabase.from('famille_accueils').select('*').order('nom'),
        supabase.from('veterinaire_visites').select('*, animal:animals(*), veterinaire:veterinaires(*)').order('date_visite', { ascending: false }),
        supabase.from('alerts').select('*, animal:animals(*)').eq('statut', 'active').order('date_echeance')
      ]);

      setAnimals((animalsRes.data ?? []) as Animal[]);
      setSignalements((signalementsRes.data ?? []) as Signalement[]);
      setFamilles((famillesRes.data ?? []) as FamilleAccueil[]);
      setVisites((visitesRes.data ?? []) as VeterinaireVisite[]);
      setAlerts((alertsRes.data ?? []) as Alert[]);

    } catch (err) {
      console.error('Erreur lors du chargement des données du dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Déterminer le rôle principal de l'utilisateur
  const userPrimaryRole = profile?.roles?.[0]?.name || 'president';
  
  // Afficher le dashboard personnalisé selon le rôle
  const renderDashboardByRole = () => {
    switch (userPrimaryRole) {
      case 'president':
      case 'administrator':
        return (
          <DashboardPresident
            animals={animals}
            familles={familles}
            signalements={signalements}
            alerts={alerts}
          />
        );
      case 'veterinary_manager':
        return (
          <DashboardVeterinary
            animals={animals}
            visites={visites}
            alerts={alerts}
          />
        );
      case 'fa_manager':
        return (
          <DashboardFAManager
            animals={animals}
            familles={familles}
          />
        );
      default:
        // Pour les autres rôles, afficher le dashboard générique
        return null;
    }
  };

  if (loading) return <LoadingSpinner />;

  // Afficher le dashboard personnalisé selon le rôle
  const dashboardComponent = renderDashboardByRole();
  
  if (dashboardComponent) {
    return dashboardComponent;
  }

  // Dashboard générique pour les rôles non implémentés
  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil */}
      <div className="rounded-3xl bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-15">
          <Dog size={180} className="translate-x-10 translate-y-10" />
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">
              👋 Bonjour, {profile?.full_name || 'Bénévole'}
            </h1>
            <p className="text-xs font-medium text-primary-100 uppercase tracking-wider mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-primary-100 block">Animaux pris en charge</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-success-500 text-white font-bold text-xs">{animals.length}</Badge> protégés
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-primary-100 block">Votre rôle</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-info-500 text-white font-bold text-xs">{userPrimaryRole}</Badge>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message pour les rôles non implémentés */}
      <div className="card p-6 text-center">
        <p className="text-neutral-600">
          Dashboard personnalisé pour le rôle <strong>{userPrimaryRole}</strong> en cours de développement.
        </p>
        <p className="text-sm text-neutral-500 mt-2">
          En attendant, vous avez accès aux fonctionnalités générales de l'application.
        </p>
      </div>
    </div>
  );
}
