import { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Search,
  Filter,
  Loader2,
  Check,
  UserCog,
  Power,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, LoadingSpinner, EmptyState, Badge, Modal } from '../components/ui';
import { permissionLabels, presetLabels, permissionColors, formatDate } from '../lib/constants';
import {
  ALL_PERMISSIONS,
  PRESET_PERMISSIONS,
  type Permission,
  type PresetRole,
  type Profile,
} from '../types';

interface AdminProfile extends Profile {
  permissions: Permission[];
}

const presetOptions: PresetRole[] = [
  'presidente',
  'administrateur',
  'responsable_fa',
  'responsable_veto',
  'responsable_comm',
  'enqueteur',
  'educateur',
  'tresorier',
  'benevole',
];

export function AdministrationPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [search, setSearch] = useState('');
  const [permFilter, setPermFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPreset, setNewPreset] = useState<PresetRole>('benevole');
  const [newPerms, setNewPerms] = useState<Permission[]>(['animaux_lecture']);

  // Edit form
  const [editPerms, setEditPerms] = useState<Permission[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profErr) {
      console.error('Error fetching profiles:', profErr);
      setLoading(false);
      return;
    }

    const { data: permData, error: permErr } = await supabase
      .from('user_permissions')
      .select('user_id, permission');

    if (permErr) {
      console.error('Error fetching permissions:', permErr);
      setLoading(false);
      return;
    }

    const permMap = new Map<string, Permission[]>();
    (permData ?? []).forEach((p: { user_id: string; permission: Permission }) => {
      const existing = permMap.get(p.user_id) ?? [];
      existing.push(p.permission);
      permMap.set(p.user_id, existing);
    });

    const result: AdminProfile[] = (profData ?? []).map((p: Profile) => ({
      ...p,
      permissions: permMap.get(p.id) ?? [],
    }));

    // Expand acces_total
    result.forEach((p) => {
      if (p.permissions.includes('acces_total')) {
        p.permissions = [...ALL_PERMISSIONS];
      }
    });

    setProfiles(result);
    setLoading(false);
  };

  const filtered = profiles.filter((p) => {
    const matchSearch =
      !search ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name.toLowerCase().includes(search.toLowerCase());
    const matchPerm =
      permFilter === 'all' ||
      p.permissions.includes(permFilter as Permission) ||
      (permFilter === 'none' && p.permissions.length === 0);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.active) ||
      (statusFilter === 'inactive' && !p.active);
    return matchSearch && matchPerm && matchStatus;
  });

  const togglePerm = (
    perm: Permission,
    list: Permission[],
    setter: (v: Permission[]) => void
  ) => {
    if (perm === 'acces_total') {
      if (list.includes('acces_total')) {
        setter(['animaux_lecture']);
      } else {
        setter([...ALL_PERMISSIONS]);
      }
      return;
    }
    if (list.includes(perm)) {
      setter(list.filter((p) => p !== perm));
    } else {
      setter([...list, perm]);
    }
  };

  const applyPreset = (preset: PresetRole, setter: (v: Permission[]) => void) => {
    setter([...PRESET_PERMISSIONS[preset]]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.admin.createUser({
        email: newEmail,
        password: newPassword,
        user_metadata: { full_name: newFullName },
      });

      if (signUpError) throw new Error(signUpError.message);

      if (data.user) {
        await supabase.from('profiles').update({ full_name: newFullName }).eq('id', data.user.id);

        const permsToInsert = newPerms.includes('acces_total')
          ? ['acces_total']
          : newPerms;

        if (permsToInsert.length > 0) {
          await supabase.from('user_permissions').insert(
            permsToInsert.map((perm) => ({
              user_id: data.user.id,
              permission: perm,
            }))
          );
        }
      }

      setCreateOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewPreset('benevole');
      setNewPerms(['animaux_lecture']);
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerms = async () => {
    if (!editTarget) return;
    setSaving(true);
    setError(null);

    try {
      await supabase.from('user_permissions').delete().eq('user_id', editTarget.id);

      const permsToInsert = editPerms.includes('acces_total')
        ? ['acces_total']
        : editPerms;

      if (permsToInsert.length > 0) {
        await supabase.from('user_permissions').insert(
          permsToInsert.map((perm) => ({
            user_id: editTarget.id,
            permission: perm,
          }))
        );
      }

      setEditTarget(null);
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (profile: AdminProfile) => {
    const newActive = !profile.active;
    await supabase.from('profiles').update({ active: newActive }).eq('id', profile.id);
    fetchProfiles();
  };

  // Safety check: can the current user remove administration/acces_total from this profile?
  const canRemoveAdminPerm = (target: AdminProfile): boolean => {
    if (!target.permissions.includes('administration') && !target.permissions.includes('acces_total')) {
      return true;
    }
    const otherAdmins = profiles.filter(
      (p) =>
        p.id !== target.id &&
        p.active &&
        (p.permissions.includes('administration') || p.permissions.includes('acces_total'))
    );
    return otherAdmins.length > 0;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle={`${profiles.length} compte${profiles.length > 1 ? 's' : ''} au total`}
        action={
          <button
            onClick={() => {
              setNewEmail('');
              setNewFullName('');
              setNewPassword('');
              setNewPreset('benevole');
              setNewPerms(['animaux_lecture']);
              setError(null);
              setCreateOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Nouveau compte
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-neutral-400" />
          <select
            value={permFilter}
            onChange={(e) => setPermFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Toutes les permissions</option>
            <option value="none">Aucune permission</option>
            {ALL_PERMISSIONS.map((p) => (
              <option key={p} value={p}>
                {permissionLabels[p]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Désactivés</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Aucun compte trouvé"
          description="Créez un nouveau compte pour donner accès à PHÉNIX."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Créé le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                          {p.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-sm font-medium text-neutral-900">{p.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{p.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.permissions.length === 0 ? (
                          <span className="text-xs text-neutral-400">Aucune</span>
                        ) : (
                          p.permissions.slice(0, 4).map((perm) => (
                            <Badge key={perm} className={permissionColors[perm] ?? 'bg-neutral-100 text-neutral-600'}>
                              {permissionLabels[perm]}
                            </Badge>
                          ))
                        )}
                        {p.permissions.length > 4 && (
                          <span className="text-xs text-neutral-400">+{p.permissions.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <Badge className="bg-success-100 text-success-700">Actif</Badge>
                      ) : (
                        <Badge className="bg-neutral-100 text-neutral-500">Désactivé</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditTarget(p);
                            setEditPerms([...p.permissions]);
                            setError(null);
                          }}
                          className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          title="Modifier les permissions"
                        >
                          <UserCog size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`rounded-lg p-2 transition-colors ${
                            p.active
                              ? 'text-neutral-500 hover:bg-error-50 hover:text-error-600'
                              : 'text-neutral-400 hover:bg-success-50 hover:text-success-600'
                          }`}
                          title={p.active ? 'Désactiver' : 'Réactiver'}
                        >
                          <Power size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau compte" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom complet *</label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
                className="input"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="input"
                placeholder="jean.dupont@email.fr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Mot de passe temporaire *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                placeholder="Minimum 6 caractères"
              />
            </div>
          </div>

          <div>
            <label className="label">Préréglage de départ</label>
            <div className="flex flex-wrap gap-2">
              {presetOptions.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setNewPreset(preset);
                    applyPreset(preset, setNewPerms);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    newPreset === preset
                      ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {presetLabels[preset]}
                </button>
              ))}
            </div>
          </div>

          <PermissionCheckboxes
            selected={newPerms}
            onToggle={(perm) => togglePerm(perm, newPerms, setNewPerms)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Créer le compte
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Permissions — ${editTarget?.full_name ?? ''}`}
        size="lg"
      >
        {editTarget && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
            )}

            <div className="card p-3">
              <p className="text-sm text-neutral-600">
                <span className="font-medium text-neutral-900">{editTarget.email}</span>
                {' — '}
                {editTarget.active ? 'Actif' : 'Désactivé'}
              </p>
            </div>

            <div>
              <label className="label">Appliquer un préréglage (raccourci)</label>
              <div className="flex flex-wrap gap-2">
                {presetOptions.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset, setEditPerms)}
                    className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-200"
                  >
                    {presetLabels[preset]}
                  </button>
                ))}
              </div>
            </div>

            <PermissionCheckboxes
              selected={editPerms}
              onToggle={(perm) => {
                if ((perm === 'administration' || perm === 'acces_total') && !canRemoveAdminPerm(editTarget)) {
                  setError("Impossible de retirer cette permission : c'est le dernier compte administrateur.");
                  return;
                }
                setError(null);
                togglePerm(perm, editPerms, setEditPerms);
              }}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSavePerms}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PermissionCheckboxes({
  selected,
  onToggle,
}: {
  selected: Permission[];
  onToggle: (perm: Permission) => void;
}) {
  return (
    <div>
      <label className="label">Permissions individuelles</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALL_PERMISSIONS.map((perm) => (
          <label
            key={perm}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
              selected.includes(perm)
                ? 'border-primary-300 bg-primary-50'
                : 'border-neutral-200 bg-white hover:bg-neutral-50'
            }`}
          >
            <button
              type="button"
              onClick={() => onToggle(perm)}
              className={`flex h-5 w-5 items-center justify-center rounded transition-all ${
                selected.includes(perm)
                  ? 'bg-primary-600 text-white'
                  : 'border border-neutral-300 bg-white'
              }`}
            >
              {selected.includes(perm) && <Check size={14} />}
            </button>
            <span className="text-sm font-medium text-neutral-700">{permissionLabels[perm]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
