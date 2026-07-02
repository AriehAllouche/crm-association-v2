import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Dog, Siren, Home, HeartHandshake, Stethoscope, Scale, Building2, Users, FileText, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, Badge } from '../components/ui';
import { formatDate } from '../lib/constants';
import type { Animal, Signalement, FamilleAccueil, Adoption, Veterinaire, JusticeCase, Pension, Enqueteur } from '../types';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  link: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const searchTerm = `%${searchQuery}%`;

      // Recherche parallèle dans toutes les tables
      const [
        animauxRes,
        signalementsRes,
        famillesRes,
        adoptionsRes,
        veterinairesRes,
        justiceRes,
        pensionsRes,
        enqueteursRes,
      ] = await Promise.all([
        supabase
          .from('animals')
          .select('id, nom, espece, statut, photo_url')
          .or(`nom.ilike.${searchTerm},race.ilike.${searchTerm},numero_icad.ilike.${searchTerm},numero_puce.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('signalements')
          .select('id, numero_dossier, declarant_nom, motif, statut')
          .or(`numero_dossier.ilike.${searchTerm},declarant_nom.ilike.${searchTerm},declarant_prenom.ilike.${searchTerm},motif.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('famille_accueils')
          .select('id, nom, prenom, ville, contrat_actif')
          .or(`nom.ilike.${searchTerm},prenom.ilike.${searchTerm},ville.ilike.${searchTerm},telephone.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('adoptions')
          .select('id, adoptant_nom, adoptant_prenom, statut, animal_id')
          .or(`adoptant_nom.ilike.${searchTerm},adoptant_prenom.ilike.${searchTerm},adoptant_telephone.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('veterinaires')
          .select('id, nom, clinique, ville, partenaire')
          .or(`nom.ilike.${searchTerm},clinique.ilike.${searchTerm},ville.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('justice_cases')
          .select('id, numero_parquet, tribunal, statut')
          .or(`numero_parquet.ilike.${searchTerm},tribunal.ilike.${searchTerm},avocat.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('pensions')
          .select('id, nom, type, ville')
          .or(`nom.ilike.${searchTerm},ville.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('enqueteurs')
          .select('id, nom, prenom, ville, actif')
          .or(`nom.ilike.${searchTerm},prenom.ilike.${searchTerm},ville.ilike.${searchTerm}`)
          .limit(10),
      ]);

      const allResults: SearchResult[] = [];

      // Animaux
      (animauxRes.data ?? []).forEach((a: any) => {
        allResults.push({
          type: 'animal',
          id: a.id,
          title: a.nom,
          subtitle: `${a.espece}${a.race ? ` · ${a.race}` : ''}`,
          link: `/animaux/${a.id}`,
          icon: Dog,
          badge: a.statut,
          badgeColor: 'bg-primary-100 text-primary-700',
        });
      });

      // Signalements
      (signalementsRes.data ?? []).forEach((s: any) => {
        allResults.push({
          type: 'signalement',
          id: s.id,
          title: `Dossier ${s.numero_dossier}`,
          subtitle: `${s.declarant_prenom} ${s.declarant_nom} · ${s.motif}`,
          link: '/signalements',
          icon: Siren,
          badge: s.statut,
          badgeColor: s.statut === 'nouveau' ? 'bg-warning-100 text-warning-800' : 'bg-neutral-100 text-neutral-600',
        });
      });

      // Familles d'accueil
      (famillesRes.data ?? []).forEach((f: any) => {
        allResults.push({
          type: 'famille_accueil',
          id: f.id,
          title: `${f.nom} ${f.prenom || ''}`,
          subtitle: f.ville || 'Ville non renseignée',
          link: '/familles-accueil',
          icon: Home,
          badge: f.contrat_actif ? 'Actif' : 'Inactif',
          badgeColor: f.contrat_actif ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-600',
        });
      });

      // Adoptions
      (adoptionsRes.data ?? []).forEach((a: any) => {
        allResults.push({
          type: 'adoption',
          id: a.id,
          title: `${a.adoptant_prenom} ${a.adoptant_nom}`,
          subtitle: 'Candidature adoption',
          link: '/adoptions',
          icon: HeartHandshake,
          badge: a.statut,
          badgeColor: 'bg-primary-100 text-primary-700',
        });
      });

      // Vétérinaires
      (veterinairesRes.data ?? []).forEach((v: any) => {
        allResults.push({
          type: 'veterinaire',
          id: v.id,
          title: v.nom,
          subtitle: v.clinique || 'Vétérinaire',
          link: '/veterinaires',
          icon: Stethoscope,
          badge: v.partenaire ? 'Partenaire' : '',
          badgeColor: v.partenaire ? 'bg-success-100 text-success-700' : undefined,
        });
      });

      // Justice
      (justiceRes.data ?? []).forEach((j: any) => {
        allResults.push({
          type: 'justice',
          id: j.id,
          title: j.numero_parquet || 'Dossier sans numéro',
          subtitle: j.tribunal || 'Tribunal',
          link: '/justice',
          icon: Scale,
          badge: j.statut,
          badgeColor: 'bg-secondary-100 text-secondary-700',
        });
      });

      // Pensions
      (pensionsRes.data ?? []).forEach((p: any) => {
        allResults.push({
          type: 'pension',
          id: p.id,
          title: p.nom,
          subtitle: p.type || 'Pension',
          link: '/pensions',
          icon: Building2,
        });
      });

      // Enquêteurs
      (enqueteursRes.data ?? []).forEach((e: any) => {
        allResults.push({
          type: 'enqueteur',
          id: e.id,
          title: `${e.nom} ${e.prenom || ''}`,
          subtitle: e.ville || 'Enquêteur',
          link: '/enqueteurs',
          icon: Users,
          badge: e.actif ? 'Actif' : 'Inactif',
          badgeColor: e.actif ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-600',
        });
      });

      setResults(allResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type])(acc[result.type] = []);
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    animal: 'Animaux',
    signalement: 'Signalements',
    famille_accueil: 'Familles d\'accueil',
    adoption: 'Adoptions',
    veterinaire: 'Vétérinaires',
    justice: 'Dossiers judiciaires',
    pension: 'Pensions',
    enqueteur: 'Enquêteurs',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-neutral-900">Recherche</h1>
          <p className="text-sm text-neutral-500">
            {query ? `Résultats pour "${query}"` : 'Entrez un terme de recherche'}
          </p>
        </div>
        {query && (
          <Link to="/" className="btn-secondary">
            <X size={16} className="mr-2" />
            Effacer
          </Link>
        )}
      </div>

      {loading && <LoadingSpinner />}

      {error && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
      )}

      {!loading && !error && query && results.length === 0 && (
        <div className="card p-12 text-center">
          <Search size={48} className="mx-auto mb-4 text-neutral-300" />
          <h3 className="font-heading text-lg font-semibold text-neutral-900">Aucun résultat</h3>
          <p className="text-sm text-neutral-500">
            Aucun élément ne correspond à votre recherche "{query}"
          </p>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([type, items]) => (
            <div key={type} className="card p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-neutral-900">
                {typeLabels[type] || type} ({items.length})
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                      <item.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{item.title}</p>
                      <p className="text-sm text-neutral-500">{item.subtitle}</p>
                    </div>
                    {item.badge && (
                      <Badge className={item.badgeColor || 'bg-neutral-100 text-neutral-600'}>
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!query && (
        <div className="card p-12 text-center">
          <Search size={48} className="mx-auto mb-4 text-neutral-300" />
          <h3 className="font-heading text-lg font-semibold text-neutral-900">Recherche globale</h3>
          <p className="text-sm text-neutral-500 mb-6">
            Utilisez la barre de recherche en haut de l'écran pour trouver des animaux, signalements, familles d'accueil, etc.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm text-neutral-600">
            <div className="flex items-center gap-2"><Dog size={16} /> Animaux</div>
            <div className="flex items-center gap-2"><Siren size={16} /> Signalements</div>
            <div className="flex items-center gap-2"><Home size={16} /> Familles d'accueil</div>
            <div className="flex items-center gap-2"><HeartHandshake size={16} /> Adoptions</div>
            <div className="flex items-center gap-2"><Stethoscope size={16} /> Vétérinaires</div>
            <div className="flex items-center gap-2"><Scale size={16} /> Justice</div>
          </div>
        </div>
      )}
    </div>
  );
}
