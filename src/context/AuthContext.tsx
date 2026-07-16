import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, UserWithRoles } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserWithRoles | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, motivation?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (!data) return;

    // Charger les rôles de l'utilisateur
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        assigned_at,
        roles (
          id,
          name,
          description,
          is_system_role,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    const roles = rolesData?.map((ur: any) => ur.roles).filter(Boolean) || [];

    // Charger les permissions via les rôles
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('user_permissions_view')
      .select('*')
      .eq('user_id', userId);

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError);
    }

    const permissions = permissionsData?.map((p: any) => ({
      id: p.permission_name,
      name: p.permission_name,
      description: '',
      resource: p.resource,
      action: p.action,
      created_at: new Date().toISOString(),
    })) || [];

    setProfile({
      ...data,
      roles,
      permissions,
    } as UserWithRoles);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, motivation?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };

    if (data.user) {
      await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          motivation: motivation || null,
          status: 'pending',
          active: false
        })
        .eq('id', data.user.id);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasRole(profile: UserWithRoles | null, ...roles: UserRole[]): boolean {
  if (!profile) return false;
  return roles.includes(profile.role);
}
