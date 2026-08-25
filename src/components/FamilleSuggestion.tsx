import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Loader2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge } from './ui';
import { faDisponibiliteLabels, faDisponibiliteColors } from '../lib/constants';
import type { FamilleAccueil, FaEvaluation, Animal, FaDisponibilite } from '../types';

interface RankedFamille {
  famille: FamilleAccueil;
  score: number;
  reasons: string[];
}

export function FamilleSuggestion({ animal }: { animal: Animal }) {
  const [loading, setLoading] = useState(true);
  const [ranked, setRanked] = useState<RankedFamille[]>([]);

  useEffect(() => {
    rankFamilies(animal);
  }, [animal.id]);

  const rankFamilies = async (animal: Animal) => {
    setLoading(true);
    const { data: familles } = await supabase
      .from('famille_accueils')
      .select('*')
      .eq('contrat_actif', true);

    if (!familles || familles.length === 0) {
      setRanked([]);
      setLoading(false);
      return;
    }

    const familleIds = familles.map((f) => f.id);
    const { data: evals } = await supabase
      .from('fa_evaluations')
      .select('famille_accueil_id, notes')
      .in('famille_accueil_id', familleIds);

    const evalsByFamille: Record<string, FaEvaluation[]> = {};
    (evals ?? []).forEach((e) => {
      const fid = (e as { famille_accueil_id: string }).famille_accueil_id;
      if (!evalsByFamille[fid]) evalsByFamille[fid] = [];
      evalsByFamille[fid].push(e as FaEvaluation);
    });

    const results: RankedFamille[] = (familles as FamilleAccueil[])
      .map((f) => {
        let score = 0;
        const reasons: string[] = [];

        // Disponibilité
        const dispo = f.statut_disponibilite ?? 'disponible';
        if (dispo === 'disponible') {
          score += 30;
          reasons.push('Disponible');
        } else if (dispo === 'vacances' || dispo === 'indisponible') {
          score -= 50;
        } else if (dispo === 'complete') {
          score -= 50;
        }

        // Places restantes
        const totalCap = ((f.capacite_chiens ?? 0) + (f.capacite_chats ?? 0) + (f.capacite_nac ?? 0)) || f.capacite_max;
        const places = Math.max(0, totalCap - (f.animaux_actuels ?? 0));
        if (places > 0) {
          score += 20;
          reasons.push(`${places} place${places > 1 ? 's' : ''} restante${places > 1 ? 's' : ''}`);
        } else {
          score -= 30;
        }

        // Compatibilité espèce
        if (animal.espece === 'chien' && (f.capacite_chiens ?? 0) > 0) {
          score += 15;
          reasons.push('Accepte les chiens');
        }
        if (animal.espece === 'chat' && (f.capacite_chats ?? 0) > 0) {
          score += 15;
          reasons.push('Accepte les chats');
        }
        if (animal.espece === 'lapin' && (f.capacite_nac ?? 0) > 0) {
          score += 15;
          reasons.push('Accepte les NAC');
        }

        // Compatibilité enfants — si l'animal a un comportement mentionnant "enfant"
        const comportementLower = (animal.comportement ?? '').toLowerCase();
        const hasChildConcern = comportementLower.includes('enfant') || comportementLower.includes('child');
        if (hasChildConcern) {
          if ((f.nb_enfants ?? 0) === 0) {
            score += 10;
            reasons.push('Pas d\'enfant au foyer (compatible)');
          } else {
            score -= 15;
          }
        } else if ((f.nb_enfants ?? 0) > 0) {
          score += 3;
        }

        // Type de logement — maison avec jardin préférable pour chiens
        if (animal.espece === 'chien') {
          if (f.type_logement === 'maison') {
            score += 8;
            if (f.jardin_cloture === true) {
              score += 7;
              reasons.push('Maison avec jardin clôturé');
            }
          }
        }

        // Évaluations précédentes
        const famEvals = evalsByFamille[f.id] ?? [];
        if (famEvals.length > 0) {
          const avgScore = famEvals.reduce((sum, e) => {
            const vals = Object.values(e.notes);
            return sum + (vals.reduce((s, v) => s + v, 0) / (vals.length || 1));
          }, 0) / famEvals.length;
          if (avgScore >= 4) {
            score += 15;
            reasons.push(`Bien évaluée (${avgScore.toFixed(1)}/5)`);
          } else if (avgScore < 2.5) {
            score -= 20;
          }
        }

        // Expérience avec l'espèce (historique)
        // Bonus si déjà accueilli des animaux (animaux_actuels > 0 ou historique)
        if ((f.animaux_actuels ?? 0) > 0) {
          score += 5;
          reasons.push('Expérience d\'accueil en cours');
        }

        // Urgence
        if (animal.sante_statut === 'critique' || animal.sante_statut === 'grave') {
          if (f.accueil_urgences) {
            score += 10;
            reasons.push('Accepte les urgences');
          } else {
            score -= 10;
          }
        }

        // Seniors
        const ageStr = (animal.age_estime ?? '').toLowerCase();
        if (ageStr.includes('senior') || ageStr.includes('vieux') || ageStr.includes('age')) {
          if (f.accueil_seniors) {
            score += 10;
            reasons.push('Accepte les seniors');
          }
        }

        return { famille: f, score, reasons };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    setRanked(results);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 size={16} className="animate-spin" /> Calcul des familles adaptées...
        </div>
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-neutral-400" />
          <div>
            <p className="text-sm font-medium text-neutral-700">Aucune famille disponible actuellement</p>
            <p className="text-xs text-neutral-500">Aucune famille d'accueil ne correspond aux critères de cet animal pour le moment.</p>
          </div>
        </div>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];
  const medalColors = [
    'border-warning-300 bg-warning-50',
    'border-neutral-300 bg-neutral-50',
    'border-accent-300 bg-accent-50',
  ];

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={18} className="text-warning-500" />
        <h3 className="font-heading text-sm font-semibold text-neutral-900">Familles suggérées pour {animal.nom}</h3>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary-50 p-2">
        <Info size={14} className="mt-0.5 shrink-0 text-primary-500" />
        <p className="text-xs text-primary-700">
          Classement indicatif basé sur les disponibilités, capacités, conditions d'accueil et évaluations.
          Ceci est une <strong>suggestion</strong> — la décision finale reste le vote collégial.
        </p>
      </div>

      <div className="space-y-2">
        {ranked.map((r, i) => (
          <Link
            key={r.famille.id}
            to={`/familles-accueil/${r.famille.id}`}
            className={`block rounded-lg border p-3 transition-all hover:shadow-sm ${medalColors[i] ?? 'border-neutral-200'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{medals[i]}</span>
                <div>
                  <p className="font-medium text-neutral-900">{r.famille.prenom} {r.famille.nom}</p>
                  <p className="text-xs text-neutral-500">{r.famille.ville ?? '—'}{r.famille.departement ? ` (${r.famille.departement})` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={faDisponibiliteColors[(r.famille.statut_disponibilite ?? 'disponible') as FaDisponibilite]}>
                  {faDisponibiliteLabels[(r.famille.statut_disponibilite ?? 'disponible') as FaDisponibilite]}
                </Badge>
                <span className="text-sm font-bold text-neutral-700">{r.score} pts</span>
              </div>
            </div>
            {r.reasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.reasons.map((reason, idx) => (
                  <span key={idx} className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-600 ring-1 ring-neutral-200">
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
