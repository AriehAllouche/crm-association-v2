import { Activity, Calendar, FileText, Stethoscope, Home, ChevronRight, User } from 'lucide-react';
import { formatDateTime } from '../lib/constants';
import type { VeterinaireVisite, DocumentItem } from '../types';

export interface HistoryEvent {
  id: string;
  date: string;
  type: 'statut' | 'veterinaire' | 'document' | 'famille_accueil';
  title: string;
  description?: string;
  author?: string;
  details?: any;
}

interface HistoryTimelineProps {
  events: HistoryEvent[];
  visites?: VeterinaireVisite[];
  documents?: DocumentItem[];
}

const timelineIcons: Record<string, typeof Activity> = {
  statut: Activity,
  veterinaire: Stethoscope,
  document: FileText,
  famille_accueil: Home,
};

const typeColors: Record<string, string> = {
  statut: 'bg-primary-50 text-primary-600 border-primary-200',
  veterinaire: 'bg-success-50 text-success-600 border-success-200',
  document: 'bg-secondary-50 text-secondary-600 border-secondary-200',
  famille_accueil: 'bg-warning-50 text-warning-600 border-warning-200',
};

export function HistoryTimeline({ events, visites = [], documents = [] }: HistoryTimelineProps) {
  // Combiner tous les événements pour une timeline complète
  const allEvents: HistoryEvent[] = [
    ...events,
    ...visites.map((v) => ({
      id: `vet-${v.id}`,
      date: v.date_visite,
      type: 'veterinaire' as const,
      title: 'Visite vétérinaire',
      description: v.motif,
      details: v,
    })),
    ...documents.map((d) => ({
      id: `doc-${d.id}`,
      date: d.created_at,
      type: 'document' as const,
      title: `Document: ${d.type_document}`,
      description: d.nom_fichier,
      details: d,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <Calendar size={32} className="text-neutral-400" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-neutral-900">Aucun historique</h3>
        <p className="mt-1 max-w-sm text-sm text-neutral-500">
          Aucun événement enregistré pour cet animal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {allEvents.map((event, index) => {
        const Icon = timelineIcons[event.type] || Activity;
        const colorClass = typeColors[event.type] || typeColors.statut;

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${colorClass}`}>
                <Icon size={18} />
              </div>
              {index < allEvents.length - 1 && (
                <div className="my-1 w-px flex-1 bg-neutral-200" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{event.title}</p>
                  {event.description && (
                    <p className="mt-1 text-sm text-neutral-600">{event.description}</p>
                  )}
                  
                  {/* Détails spécifiques selon le type */}
                  {event.type === 'veterinaire' && event.details && (
                    <div className="mt-2 space-y-1 text-sm text-neutral-600">
                      {event.details.veterinaire && (
                        <p>Vétérinaire: {event.details.veterinaire.nom}</p>
                      )}
                      {event.details.diagnostic && (
                        <p>Diagnostic: {event.details.diagnostic}</p>
                      )}
                      {event.details.traitement && (
                        <p>Traitement: {event.details.traitement}</p>
                      )}
                      {event.details.cout && (
                        <p className="font-medium">Coût: {event.details.cout}€</p>
                      )}
                    </div>
                  )}

                  {event.type === 'document' && event.details && (
                    <div className="mt-2">
                      <a
                        href={event.details.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        Voir le document <ChevronRight size={14} />
                      </a>
                    </div>
                  )}

                  {event.author && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
                      <User size={12} />
                      <span>Par {event.author}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-neutral-400">{formatDateTime(event.date)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
