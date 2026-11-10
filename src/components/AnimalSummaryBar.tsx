import { useEffect, useState } from 'react';
import { Dog, MapPin, UserRound, CalendarClock, Scale, History, Bell, Euro } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AnimalDetails } from '../lib/animalDetails';
import {
  animalStatutLabels, animalStatutColors, justiceStatutLabels, signalementUrgenceCalculeeLabels,
  signalementUrgenceCalculeeColors, signalementUrgenceCalculeeDot, formatDate, formatDateTime,
  formatCurrency, daysUntil,
} from '../lib/constants';

interface Deadline {
  date: string;
  label: string;
}

function nextDeadline(data: AnimalDetails): Deadline | null {
  const candidates: Deadline[] = [];
  for (const v of data.visites) {
    if (v.prochaine_visite) candidates.push({ date: v.prochaine_visite, label: 'Rendez-vous vétérinaire' });
  }
  for (const j of data.justice) {
    if (j.date_audience) candidates.push({ date: j.date_audience, label: 'Audience' });
  }
  for (const f of data.familles_accueil) {
    if (f.statut === 'en_cours' && f.date_fin) candidates.push({ date: f.date_fin, label: 'Fin de placement en famille d\'accueil' });
  }
  for (const a of data.alerts) {
    candidates.push({ date: a.date_echeance, label: a.titre });
  }
  return candidates
    .filter((c) => daysUntil(c.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

interface AnimalSummaryBarProps {
  data: AnimalDetails;
  canSeeFinances: boolean;
}

export function AnimalSummaryBar({ data, canSeeFinances }: AnimalSummaryBarProps) {
  const { animal, signalement, justice, alerts, timeline, cout_total } = data;
  const [responsableNom, setResponsableNom] = useState<string | null>(null);
  const responsableId = signalement?.responsable_id;

  useEffect(() => {
    if (!responsableId) {
      setResponsableNom(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', responsableId)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (!cancelled) setResponsableNom(profile?.full_name ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [responsableId]);

  const deadline = nextDeadline(data);
  const lastEvent = timeline[0];
  const dossierJustice = justice[0];
  const urgence = signalement?.urgence_calculee;

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-neutral-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:-mx-6 lg:px-6">
      <div className="flex items-center gap-4 overflow-x-auto">
        <div className="flex shrink-0 items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-lg bg-neutral-100">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt={animal.nom} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><Dog size={20} className="text-primary-400" /></div>
            )}
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-neutral-900">{animal.nom}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${animalStatutColors[animal.statut]}`}>
                {animalStatutLabels[animal.statut]}
              </span>
              {urgence && (
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${signalementUrgenceCalculeeColors[urgence] ?? ''}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${signalementUrgenceCalculeeDot[urgence] ?? ''}`} />
                  {signalementUrgenceCalculeeLabels[urgence] ?? urgence}
                </span>
              )}
            </div>
          </div>
        </div>

        <SummaryItem icon={MapPin} label="Localisation" value={animal.lieu_actuel || '—'} />
        <SummaryItem icon={UserRound} label="Responsable" value={responsableNom || '—'} />
        <SummaryItem
          icon={CalendarClock}
          label="Prochaine échéance"
          value={deadline ? `${deadline.label} · ${formatDate(deadline.date)}` : 'Aucune'}
        />
        <SummaryItem
          icon={Scale}
          label="Statut juridique"
          value={dossierJustice ? justiceStatutLabels[dossierJustice.statut] : 'Aucun dossier'}
        />
        {canSeeFinances && (
          <SummaryItem icon={Euro} label="Coût total" value={formatCurrency(cout_total)} />
        )}
        <SummaryItem
          icon={History}
          label="Dernière action"
          value={lastEvent ? `${lastEvent.title} · ${formatDateTime(lastEvent.date)}` : '—'}
        />
        <SummaryItem
          icon={Bell}
          label="Alertes en attente"
          value={alerts.length > 0 ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''}` : 'Aucune'}
          highlight={alerts.length > 0}
        />
      </div>
    </div>
  );
}

function SummaryItem({
  icon: Icon, label, value, highlight = false,
}: {
  icon: typeof Dog;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-[9rem] shrink-0 items-start gap-2 border-l border-neutral-200 pl-4">
      <Icon size={16} className={`mt-0.5 shrink-0 ${highlight ? 'text-warning-600' : 'text-neutral-400'}`} />
      <div>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <p className={`text-sm ${highlight ? 'font-semibold text-warning-800' : 'text-neutral-900'}`}>{value}</p>
      </div>
    </div>
  );
}
