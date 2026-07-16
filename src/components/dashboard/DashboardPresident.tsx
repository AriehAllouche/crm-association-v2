import { Link } from 'react-router-dom';
import { Dog, Home, Users, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from '../ui';
import type { Animal, FamilleAccueil, Signalement, Alert } from '../../types';

interface DashboardPresidentProps {
  animals: Animal[];
  familles: FamilleAccueil[];
  signalements: Signalement[];
  alerts: Alert[];
}

export function DashboardPresident({
  animals,
  familles,
  signalements,
  alerts,
}: DashboardPresidentProps) {
  const faActives = familles.filter(f => f.contrat_actif).length;
  const enAttenteValidation = 0; // À connecter avec la table profiles
  const enquetesEnCours = signalements.filter(s => s.statut === 'en_cours').length;

  const animauxAdoptes = animals.filter(a => a.statut === 'adopte').length;
  const visitesVet = alerts.filter(a => a.type === 'vaccin').length;

  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil Présidente */}
      <div className="rounded-3xl bg-gradient-to-r from-primary-600 to-secondary-600 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-15">
          <Dog size={180} className="translate-x-10 translate-y-10" />
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">
              👋 Bonjour, Présidente
            </h1>
            <p className="text-xs font-medium text-primary-100 uppercase tracking-wider mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-primary-100 block">Animaux en refuge</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-success-500 text-white font-bold text-xs">{animals.length}</Badge>
                protégés
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-primary-100 block">Familles d'accueil</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-info-500 text-white font-bold text-xs">{faActives}</Badge>
                actives
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-primary-100 block">En attente validation</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-warning-500 text-white font-bold text-xs">{enAttenteValidation}</Badge>
                inscrits
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-primary-100 block">Enquêtes en cours</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-error-500 text-white font-bold text-xs">{enquetesEnCours}</Badge>
                actives
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques du mois */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-primary-600" />
          Statistiques du mois
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 bg-success-50 rounded-xl">
            <span className="text-xs text-success-700 font-semibold block">Animaux adoptés</span>
            <span className="text-2xl font-bold text-success-900 mt-1">{animauxAdoptes}</span>
          </div>
          <div className="p-4 bg-info-50 rounded-xl">
            <span className="text-xs text-info-700 font-semibold block">Nouvelles FA</span>
            <span className="text-2xl font-bold text-info-900 mt-1">{familles.filter(f => f.statut === 'active').length}</span>
          </div>
          <div className="p-4 bg-warning-50 rounded-xl">
            <span className="text-xs text-warning-700 font-semibold block">Enquêtes clôturées</span>
            <span className="text-2xl font-bold text-warning-900 mt-1">{signalements.filter(s => s.statut === 'cloture').length}</span>
          </div>
          <div className="p-4 bg-primary-50 rounded-xl">
            <span className="text-xs text-primary-700 font-semibold block">Visites vétérinaires</span>
            <span className="text-2xl font-bold text-primary-900 mt-1">{visitesVet}</span>
          </div>
        </div>
      </div>

      {/* Alertes récentes */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-error-600" />
          Alertes récentes
        </h3>
        <div className="space-y-3">
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  alert.priorite === 'critique' ? 'bg-error-500' :
                  alert.priorite === 'urgent' ? 'bg-warning-500' :
                  'bg-info-500'
                }`} />
                <span className="text-sm font-medium text-neutral-900">{alert.titre}</span>
              </div>
              <Badge className={
                alert.priorite === 'critique' ? 'bg-error-100 text-error-800' :
                alert.priorite === 'urgent' ? 'bg-warning-100 text-warning-800' :
                'bg-info-100 text-info-800'
              }>
                {alert.priorite}
              </Badge>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-4">Aucune alerte active</p>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link to="/admin/validation" className="btn-primary py-3 text-sm flex items-center justify-center gap-2">
            <Users size={16} /> Valider inscrits
          </Link>
          <Link to="/animaux/nouveau" className="btn-secondary py-3 text-sm flex items-center justify-center gap-2">
            <Dog size={16} /> Nouvel animal
          </Link>
          <Link to="/familles-accueil" className="btn-secondary py-3 text-sm flex items-center justify-center gap-2">
            <Home size={16} /> Gérer FA
          </Link>
          <Link to="/signalements" className="btn-secondary py-3 text-sm flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> Signalements
          </Link>
        </div>
      </div>
    </div>
  );
}
