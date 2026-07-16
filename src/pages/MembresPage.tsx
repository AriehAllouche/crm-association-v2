import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, Badge } from '../components/ui';
import { roleLabels } from '../lib/constants';
import { Shield, Phone, Mail, Search, Check, AlertCircle } from 'lucide-react';
import type { Profile, UserRole } from '../types';

export function MembresPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error fetching profiles:', error);
      setErrorMsg('Erreur lors du chargement des profils.');
    } else {
      setProfiles((data ?? []) as Profile[]);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    setSuccessMsg(null);
    setErrorMsg(null);

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating role:', error);
      setErrorMsg('Impossible de mettre à jour le rôle.');
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );
      setSuccessMsg('Rôle mis à jour avec succès.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setUpdatingId(null);
  };

  const handleStatusToggle = async (userId: string, currentActive: boolean) => {
    setUpdatingId(userId);
    setSuccessMsg(null);
    setErrorMsg(null);

    const { error } = await supabase
      .from('profiles')
      .update({ active: !currentActive, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating status:', error);
      setErrorMsg('Impossible de modifier le statut.');
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, active: !currentActive } : p))
      );
      setSuccessMsg(`Utilisateur ${!currentActive ? 'activé' : 'désactivé'} avec succès.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setUpdatingId(null);
  };

  const filtered = profiles.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(searchLower) ||
      p.email.toLowerCase().includes(searchLower) ||
      (p.phone && p.phone.includes(searchLower))
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Membres & Rôles"
        subtitle="Gérer les droits d'accès des bénévoles et membres de l'association"
      />

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-success-50 p-4 text-sm font-medium text-success-800 shadow-sm animate-fade-in">
          <Check size={16} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-50 p-4 text-sm font-medium text-error-800 shadow-sm animate-fade-in">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Barre de recherche */}
      <div className="mb-6 card p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Liste des membres */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-neutral-500">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-700 border-b border-neutral-200">
              <tr>
                <th scope="col" className="px-6 py-4">Membre</th>
                <th scope="col" className="px-6 py-4">Contact</th>
                <th scope="col" className="px-6 py-4">Rôle Système</th>
                <th scope="col" className="px-6 py-4">Statut</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-400">
                    Aucun membre trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{member.full_name}</p>
                          <p className="text-xs text-neutral-400">Inscrit le {new Date(member.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5 text-neutral-700">
                          <Mail size={12} className="text-neutral-400" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1.5 text-neutral-600">
                            <Phone size={12} className="text-neutral-400" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className={member.role === 'admin' ? 'text-primary-500' : 'text-neutral-400'} />
                        <select
                          value={member.role}
                          disabled={updatingId === member.id}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="input py-1 px-2 w-auto text-xs bg-white border border-neutral-200 rounded-lg cursor-pointer focus:ring-primary-100"
                        >
                          {Object.entries(roleLabels).map(([roleVal, label]) => (
                            <option key={roleVal} value={roleVal}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={member.active ? 'bg-success-100 text-success-800' : 'bg-neutral-100 text-neutral-600'}>
                        {member.active ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleStatusToggle(member.id, member.active)}
                        disabled={updatingId === member.id}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          member.active
                            ? 'text-error-600 border-error-200 hover:bg-error-50'
                            : 'text-success-600 border-success-200 hover:bg-success-50'
                        }`}
                      >
                        {member.active ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
