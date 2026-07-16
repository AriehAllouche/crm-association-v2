import { Link } from 'react-router-dom';
import { Home, Users, FileText, AlertTriangle, Dog, Plus } from 'lucide-react';
import { Badge } from '../ui';
import type { Animal, FamilleAccueil } from '../../types';

interface DashboardFAManagerProps {
  animals: Animal[];
  familles: FamilleAccueil[];
}

export function DashboardFAManager({
  animals,
  familles,
}: DashboardFAManagerProps) {
  const faActives = familles.filter(f => f.contrat_actif);
  const animauxPlaces = animals.filter(a => a.statut === 'en_famille_accueil');
  const demandesEnAttente = familles.filter(f => f.statut === 'en_attente');
  const contratsARenouveler = faActives.filter(f => {
    if (!f.date_fin_contrat) return false;
    const finContrat = new Date(f.date_fin_contrat);
    const aujourdHui = new Date();
    const diffJours = Math.ceil((finContrat.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));
    return diffJours <= 7;
  });

  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil Responsable FA */}
      <div className="rounded-3xl bg-gradient-to-r from-secondary-600 to-primary-600 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-15">
          <Home size={180} className="translate-x-10 translate-y-10" />
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">
              🏠 Gestion Familles d'Accueil
            </h1>
            <p className="text-xs font-medium text-secondary-100 uppercase tracking-wider mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-secondary-100 block">FA actives</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-success-500 text-white font-bold text-xs">{faActives.length}</Badge>
                familles
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-secondary-100 block">Animaux placés</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-info-500 text-white font-bold text-xs">{animauxPlaces.length}</Badge>
                chez FA
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-secondary-100 block">Demandes</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-warning-500 text-white font-bold text-xs">{demandesEnAttente.length}</Badge>
                en attente
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <span className="text-xs font-medium text-secondary-100 block">Contrats</span>
              <span className="font-heading text-xl font-bold mt-0.5 block flex items-center gap-1.5">
                <Badge className="bg-error-500 text-white font-bold text-xs">{contratsARenouveler.length}</Badge>
                à renouveler
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Familles d'accueil récemment inscrites */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Users size={20} className="text-primary-600" />
          Familles d'accueil récemment inscrites
        </h3>
        <div className="space-y-3">
          {familles.slice(0, 5).map(fa => (
            <div key={fa.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center">
                  <Home size={16} className="text-secondary-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-neutral-900">{fa.nom} {fa.prenom}</span>
                  <span className="text-xs text-neutral-500 block">
                    Disponible {fa.capacite_max - fa.animaux_actuels} places • {fa.ville || 'Ville non renseignée'}
                  </span>
                </div>
              </div>
              <Badge className={
                fa.statut === 'active' ? 'bg-success-100 text-success-800' :
                fa.statut === 'en_attente' ? 'bg-warning-100 text-warning-800' :
                'bg-neutral-100 text-neutral-800'
              }>
                {fa.statut || 'Inconnu'}
              </Badge>
            </div>
          ))}
          {familles.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-4">Aucune famille d'accueil inscrite</p>
          )}
        </div>
      </div>

      {/* Animaux actuellement placés */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Dog size={20} className="text-accent-600" />
          Animaux actuellement placés
        </h3>
        <div className="space-y-3">
          {animauxPlaces.slice(0, 5).map(animal => {
            const joursPlacement = animal.date_prise_en_charge 
              ? Math.ceil((new Date().getTime() - new Date(animal.date_prise_en_charge).getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            return (
              <div key={animal.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center">
                    <Dog size={16} className="text-accent-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-900">{animal.nom}</span>
                    <span className="text-xs text-neutral-500 block">
                      Chez {animal.famille_accueil_actuelle || 'FA non renseignée'} • {joursPlacement} jours
                    </span>
                  </div>
                </div>
                <Badge className="bg-info-100 text-info-800">
                  {animal.espece}
                </Badge>
              </div>
            );
          })}
          {animauxPlaces.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-4">Aucun animal placé en FA</p>
          )}
        </div>
      </div>

      {/* Contrats à renouveler */}
      {contratsARenouveler.length > 0 && (
        <div className="card p-6 border-2 border-warning-200">
          <h3 className="font-heading font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning-600" />
            Contrats à renouveler (7 jours)
          </h3>
          <div className="space-y-3">
            {contratsARenouveler.map(fa => (
              <div key={fa.id} className="flex items-center justify-between p-3 bg-warning-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center">
                    <FileText size={16} className="text-warning-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-900">{fa.nom} {fa.prenom}</span>
                    <span className="text-xs text-warning-700 block">
                      Fin le {fa.date_fin_contrat}
                    </span>
                  </div>
                </div>
                <Badge className="bg-warning-100 text-warning-800">
                  Urgent
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="card p-6">
        <h3 className="font-heading font-bold text-neutral-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/familles-accueil/nouveau" className="btn-primary py-3 text-sm flex items-center justify-center gap-2">
            <Plus size={16} /> Nouvelle FA
          </Link>
          <Link to="/familles-accueil" className="btn-secondary py-3 text-sm flex items-center justify-center gap-2">
            <Home size={16} /> Gérer FA
          </Link>
        </div>
      </div>
    </div>
  );
}
