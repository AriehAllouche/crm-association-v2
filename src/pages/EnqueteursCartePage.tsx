import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner } from '../components/ui';
import type { Enqueteur } from '../types';

// Fix pour les icônes Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function EnqueteursCartePage() {
  const [loading, setLoading] = useState(true);
  const [enqueteurs, setEnqueteurs] = useState<Enqueteur[]>([]);

  useEffect(() => {
    fetchEnqueteurs();
  }, []);

  const fetchEnqueteurs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enqueteurs')
      .select('*')
      .eq('actif', true);

    if (error) {
      console.error('Error fetching enqueteurs:', error);
    } else {
      setEnqueteurs((data ?? []) as Enqueteur[]);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  // Centre par défaut (France)
  const center: [number, number] = [46.603354, 1.888334];

  return (
    <div>
      <PageHeader
        title="Carte des Enquêteurs"
        subtitle={`${enqueteurs.length} enquêteur${enqueteurs.length > 1 ? 's' : ''} actif${enqueteurs.length > 1 ? 's' : ''}`}
      />

      <div className="card overflow-hidden">
        <div className="h-[600px] w-full">
          <MapContainer
            center={center}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {enqueteurs.map((enqueteur) => {
              // Pour l'instant, on utilise des coordonnées par défaut
              // À améliorer avec géolocalisation réelle
              const lat = 46.603354 + (Math.random() - 0.5) * 2;
              const lng = 1.888334 + (Math.random() - 0.5) * 2;
              
              return (
                <Marker
                  key={enqueteur.id}
                  position={[lat, lng]}
                  icon={icon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{enqueteur.prenom} {enqueteur.nom}</h3>
                      <p className="text-sm text-neutral-600">{enqueteur.telephone}</p>
                      {enqueteur.email && (
                        <p className="text-sm text-neutral-600">{enqueteur.email}</p>
                      )}
                      {enqueteur.zones_couvertes && (
                        <p className="mt-2 text-sm">
                          <strong>Zones :</strong> {enqueteur.zones_couvertes}
                        </p>
                      )}
                      {enqueteur.departements && enqueteur.departements.length > 0 && (
                        <p className="text-sm">
                          <strong>Départements :</strong> {enqueteur.departements.join(', ')}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Liste des enquêteurs */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enqueteurs.map((enqueteur) => (
          <div key={enqueteur.id} className="card p-4">
            <h3 className="font-semibold text-neutral-900">
              {enqueteur.prenom} {enqueteur.nom}
            </h3>
            <p className="mt-1 text-sm text-neutral-600">{enqueteur.telephone}</p>
            {enqueteur.email && (
              <p className="text-sm text-neutral-600">{enqueteur.email}</p>
            )}
            {enqueteur.zones_couvertes && (
              <p className="mt-2 text-sm text-neutral-500">
                <strong>Zones :</strong> {enqueteur.zones_couvertes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
