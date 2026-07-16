import { Link } from 'react-router-dom';
import { Stethoscope, Calendar, Pill, AlertTriangle, Dog } from 'lucide-react';
import { Badge } from '../ui';
import type { Animal, VeterinaireVisite, Alert } from '../../types';

interface DashboardVeterinaryProps {
  animals: Animal[];
  visites: VeterinaireVisite[];
  alerts: Alert[];
}

export function DashboardVeterinary({
  animals,
  visites,
  alerts,
}: DashboardVeterinaryProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const rdvsToday = visites.filter(v => v.date_visite === todayStr);
  const soinsEnCours = animals.filter(a => a.statut === 'en_soins');
  const urgences = alerts.filter(a => a.priorite === 'urgent' || a.priorite === 'critique');
  const vaccinsAlertes = alerts.filter(a => a.type === 'vaccin');

  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil Responsable Vétérinaire */}
      <div className="rounded-3xl bg-gradient-to-r from-error-600 to-accent-600 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-15">
          <Stethoscope size={180} className="translate-x-10 translate-y-10" />
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">
              🩺 Pôle Santé
            </h1>
            <p className="text-xs font-medium text-error-100 uppercase tracking-wider mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-error-100 block">RDV aujourd'hui</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-warning-500 text-white font-bold text-xs">{rdvsToday.length}</Badge>
                prévus
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-error-100 block">Soins en cours</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-info-500 text-white font-bold text-xs">{soinsEnCours.length}</Badge>
                actifs
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-error-100 block">Urgences</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-error-500 text-white font-bold text-xs">{urgences.length}</Badge>
                à traiter
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-error-100 block">Stock ↓</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-warning-500 text-white font-bold text-xs">!</Badge>
                alerte
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rendez-vous vétérinaires aujourd'hui */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-primary-600" />
          Rendez-vous vétérinaires aujourd'hui
        </h3>
        <div className="space-y-3">
          {rdvsToday.map(visite => (
            <div key={visite.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Dog size={16} className="text-primary-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-900">{visite.animal?.nom}</span>
                  <span className="text-xs text-neutral-500 block">{visite.motif}</span>
                </div>
              </div>
              <Badge className="bg-info-100 text-info-800">
                {visite.date_visite}
              </Badge>
            </div>
          ))}
          {rdvsToday.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-4">Aucun RDV prévu aujourd'hui</p>
          )}
        </div>
      </div>

      {/* État des stocks médicamenteux */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Pill size={20} className="text-accent-600" />
          État des stocks médicamenteux
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-success-50 rounded-xl">
            <span className="text-xs text-success-700 font-semibold block">Vaccins rage</span>
            <span className="text-2xl font-bold text-success-900 mt-1">12 unités</span>
          </div>
          <div className="p-4 bg-warning-50 rounded-xl">
            <span className="text-xs text-warning-700 font-semibold block">Antibiotiques</span>
            <span className="text-2xl font-bold text-warning-900 mt-1">8 unités</span>
          </div>
          <div className="p-4 bg-success-50 rounded-xl">
            <span className="text-xs text-success-700 font-semibold block">Antiparasitaires</span>
            <span className="text-2xl font-bold text-success-900 mt-1">15 unités</span>
          </div>
          <div className="p-4 bg-success-50 rounded-xl">
            <span className="text-xs text-success-700 font-semibold block">Pansements</span>
            <span className="text-2xl font-bold text-success-900 mt-1">45 unités</span>
          </div>
        </div>
      </div>

      {/* Alertes vaccinations */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-warning-600" />
          Alertes vaccinations
        </h3>
        <div className="space-y-3">
          {vaccinsAlertes.slice(0, 5).map(alert => (
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
                {alert.date_echeance}
              </Badge>
            </div>
          ))}
          {vaccinsAlertes.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-4">Aucune alerte vaccination</p>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/veterinaires" className="btn-primary py-3 text-sm flex items-center justify-center gap-2">
            <Stethoscope size={16} /> Nouvelle visite
          </Link>
          <Link to="/animaux" className="btn-secondary py-3 text-sm flex items-center justify-center gap-2">
            <Dog size={16} /> Voir animaux
          </Link>
        </div>
      </div>
    </div>
  );
}
