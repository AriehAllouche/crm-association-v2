import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Dog, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge } from '../components/ui';
import {
  animalStatutLabels,
  animalStatutColors,
  especeLabels,
  formatDate,
} from '../lib/constants';
import type { Animal, AnimalStatut } from '../types';

const statutFilters: AnimalStatut[] = [
  'signale',
  'en_enquete',
  'pris_en_charge',
  'en_famille_accueil',
  'en_pension',
  'en_soins',
  'a_adopter',
  'adopte',
  'rendu_proprietaire',
  'decede',
];

export function AnimauxListPage() {
  const [loading, setLoading] = useState(true);
  const [animaux, setAnimaux] = useState<Animal[]>([]);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<AnimalStatut | 'all'>('all');

  useEffect(() => {
    fetchAnimaux();
  }, []);

  const fetchAnimaux = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching animals:', error);
    } else {
      setAnimaux((data ?? []) as Animal[]);
    }
    setLoading(false);
  };

  const filtered = animaux.filter((a) => {
    const matchSearch =
      !search ||
      a.nom.toLowerCase().includes(search.toLowerCase()) ||
      a.numero_icad?.toLowerCase().includes(search.toLowerCase()) ||
      a.race?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = statutFilter === 'all' || a.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Animaux"
        subtitle={`${animaux.length} animal${animaux.length > 1 ? 'ux' : ''} au total`}
        action={
          <Link to="/animaux/nouveau" className="btn-primary">
            <Plus size={18} />
            Nouvel animal
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, race, ICAD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as AnimalStatut | 'all')}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            {statutFilters.map((s) => (
              <option key={s} value={s}>
                {animalStatutLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Dog}
          title="Aucun animal trouvé"
          description="Commencez par créer la fiche d'un animal. Tous les modules seront automatiquement reliés à cette fiche."
          action={
            <Link to="/animaux/nouveau" className="btn-primary">
              <Plus size={18} />
              Créer une fiche animal
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((animal) => (
            <Link
              key={animal.id}
              to={`/animaux/${animal.id}`}
              className="card group overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="relative h-40 overflow-hidden bg-neutral-100">
                {animal.photo_url ? (
                  <img
                    src={animal.photo_url}
                    alt={animal.nom}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
                    <Dog size={48} className="text-primary-300" />
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <Badge className={animalStatutColors[animal.statut]}>
                    {animalStatutLabels[animal.statut]}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-heading text-lg font-semibold text-neutral-900">{animal.nom}</h3>
                <p className="text-sm text-neutral-500">
                  {especeLabels[animal.espece]}
                  {animal.race ? ` · ${animal.race}` : ''}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                  {animal.date_naissance && <span>Né le {formatDate(animal.date_naissance)}</span>}
                  {animal.numero_icad && <span>ICAD: {animal.numero_icad}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
