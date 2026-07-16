import { useEffect, useState } from 'react';
import { Check, X, Mail, Search, Filter, UserPlus, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge, Modal } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { UserWithRoles, Role, RBACRole } from '../types';

interface PendingUser extends UserWithRoles {
  motivation?: string;
}

export function AdminValidationPage() {
  const { isSystemAdmin } = usePermissions();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Record<string, RBACRole>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    if (!isSystemAdmin()) return;
    fetchPendingUsers();
    fetchRoles();
  }, [isSystemAdmin]);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending users:', error);
      } else {
        setPendingUsers(data as PendingUser[] || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching roles:', error);
      } else {
        setRoles(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleApproveUser = async (user: PendingUser) => {
    const roleToAssign = selectedRole[user.id];
    if (!roleToAssign) {
      alert('Veuillez sélectionner un rôle pour cet utilisateur');
      return;
    }

    const role = roles.find(r => r.name === roleToAssign);
    if (!role) {
      alert('Rôle invalide');
      return;
    }

    try {
      // Mettre à jour le statut du profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ status: 'active', active: true })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        alert('Erreur lors de la mise à jour du profil');
        return;
      }

      // Attribuer le rôle
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role_id: role.id,
          assigned_by: user.id, // À remplacer par l'ID de l'admin connecté
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        alert('Erreur lors de l\'attribution du rôle');
        return;
      }

      // Envoyer un email de confirmation (à implémenter avec Supabase Auth)
      // Pour l'instant, on simule
      console.log('Email de confirmation envoyé à:', user.email);

      // Rafraîchir la liste
      await fetchPendingUsers();
      setShowConfirmModal(false);
      setSelectedUser(null);
      alert('Utilisateur validé avec succès');
    } catch (err) {
      console.error('Error:', err);
      alert('Erreur lors de la validation');
    }
  };

  const handleRejectUser = async (user: PendingUser) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected', active: false })
        .eq('id', user.id);

      if (error) {
        console.error('Error rejecting user:', error);
        alert('Erreur lors du rejet');
        return;
      }

      await fetchPendingUsers();
      alert('Utilisateur rejeté');
    } catch (err) {
      console.error('Error:', err);
      alert('Erreur lors du rejet');
    }
  };

  const handleRequestInfo = async (user: PendingUser) => {
    // Implémenter l'envoi d'email pour demander des informations complémentaires
    alert(`Email de demande d'informations envoyé à ${user.email}`);
  };

  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (!isSystemAdmin()) {
    return (
      <div className="card p-8 text-center">
        <Shield size={48} className="mx-auto text-neutral-400 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Accès refusé</h2>
        <p className="text-neutral-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-neutral-600 mt-4">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-neutral-900">
            ⚙️ Administration - Validation des inscrits
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Gérez les demandes d'inscription et attribuez les rôles
          </p>
        </div>
        <Badge className="bg-primary-100 text-primary-800">
          {pendingUsers.length} en attente
        </Badge>
      </div>

      {/* Filtres et recherche */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-64">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="input w-auto"
          >
            <option value="pending">En attente</option>
            <option value="rejected">Refusés</option>
            <option value="all">Tous</option>
          </select>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="card p-8 text-center">
            <UserPlus size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-neutral-600">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                {/* Informations utilisateur */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-600">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-neutral-600">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-500">Inscrit le :</span>
                      <span className="ml-2 font-medium text-neutral-900">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {user.phone && (
                      <div>
                        <span className="text-neutral-500">Téléphone :</span>
                        <span className="ml-2 font-medium text-neutral-900">{user.phone}</span>
                      </div>
                    )}
                  </div>

                  {user.motivation && (
                    <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                      <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">
                        Motivation
                      </span>
                      <p className="text-sm text-neutral-700">{user.motivation}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 min-w-64">
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 uppercase block mb-1">
                      Attribuer un rôle
                    </label>
                    <select
                      value={selectedRole[user.id] || ''}
                      onChange={(e) => setSelectedRole({ ...selectedRole, [user.id]: e.target.value as RBACRole })}
                      className="input w-full"
                    >
                      <option value="">Sélectionner un rôle...</option>
                      <option value="president">👩 Présidente</option>
                      <option value="administrator">👨 Administrateur</option>
                      <option value="fa_manager">🏠 Responsable FA</option>
                      <option value="veterinary_manager">🩺 Responsable vétérinaire</option>
                      <option value="communication_manager">📢 Responsable communication</option>
                      <option value="investigator">👮 Enquêteur</option>
                      <option value="educator">👨‍🏫 Éducateur</option>
                      <option value="treasurer">💰 Trésorier</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowConfirmModal(true);
                      }}
                      disabled={!selectedRole[user.id]}
                      className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={16} /> Valider
                    </button>
                    <button
                      onClick={() => handleRejectUser(user)}
                      className="btn-secondary flex-1 py-2 text-sm flex items-center justify-center gap-2 bg-error-50 text-error-700 hover:bg-error-100"
                    >
                      <X size={16} /> Refuser
                    </button>
                  </div>

                  <button
                    onClick={() => handleRequestInfo(user)}
                    className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <Mail size={16} /> Demander infos
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmation */}
      <Modal 
        open={showConfirmModal && selectedUser !== null} 
        onClose={() => setShowConfirmModal(false)}
        title="✅ Confirmer la validation"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm text-neutral-600 mb-2">Vous allez valider l'inscription de :</p>
              <p className="font-semibold text-neutral-900">{selectedUser.full_name}</p>
              <p className="text-sm text-neutral-600">{selectedUser.email}</p>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-neutral-600 mb-1">Rôle attribué :</p>
              <p className="font-semibold text-primary-900">
                {roles.find(r => r.name === selectedRole[selectedUser.id])?.description || selectedRole[selectedUser.id]}
              </p>
            </div>

            <div className="p-4 bg-warning-50 rounded-lg text-sm text-warning-800">
              <p className="font-semibold mb-1">⚠️ Cette action :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Activera le compte de l'utilisateur</li>
                <li>Lui enverra un email de confirmation</li>
                <li>Lui donnera accès à son tableau de bord personnalisé</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1 py-2"
              >
                Annuler
              </button>
              <button
                onClick={() => handleApproveUser(selectedUser)}
                className="btn-primary flex-1 py-2"
              >
                Confirmer et activer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
