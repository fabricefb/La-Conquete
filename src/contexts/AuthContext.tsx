import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../types';

// ─── Context shape ───────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isFullAdmin: boolean;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  unreadCount: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Default profile template ────────────────────────────────────
function defaultProfile(overrides: Record<string, any> = {}): UserProfile {
  return {
    id: '',
    email: '',
    full_name: null,
    avatar_url: null,
    phone: null,
    address: null,
    gender: null,
    birth_date: null,
    bio: null,
    is_admin: false,
    is_blocked: false,
    blocked_at: null,
    blocked_reason: null,
    last_seen_at: null,
    onboarding_completed: false,
    role_level: 1,
    pastor_category: null,
    extension_id: null,
    is_principal_pastor: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as UserProfile;
}

// ─── Provider ────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      // Timeout de 8s pour éviter le blocage par RLS
      const { data, error } = await Promise.race([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise<{ data: null; error: { message: string; code: 'TIMEOUT' } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Requête trop longue (RLS ?)', code: 'TIMEOUT' } }), 8000)
        ),
      ]);

      if (!error && data) {
        const p = data as any;
        setProfile(defaultProfile({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          phone: p.phone,
          address: p.address,
          gender: p.gender,
          birth_date: p.birth_date,
          bio: p.bio,
          is_admin: p.is_admin ?? false,
          is_blocked: p.is_blocked ?? false,
          blocked_at: p.blocked_at,
          blocked_reason: p.blocked_reason,
          last_seen_at: p.last_seen_at,
          onboarding_completed: p.onboarding_completed ?? false,
          role_level: p.role_level ?? 1,
          pastor_category: p.pastor_category,
          extension_id: p.extension_id,
          is_principal_pastor: p.is_principal_pastor ?? false,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        console.log('Profile loaded:', { id: p.id, is_admin: p.is_admin, role_level: p.role_level });
      } else if (error?.code === 'TIMEOUT') {
        console.error('Profile fetch timed out — possible RLS issue:', error.message);
        // Fallback: créer un profil minimal depuis la session auth
        const { data: userData } = await supabase.auth.getUser(userId);
        const u = userData?.user;
        if (u) {
          setProfile(defaultProfile({
            id: u.id,
            email: u.email || '',
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || null,
          }));
        }
      } else {
        console.log('No profile found, auto-creating...');
        await autoCreateProfile(userId);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const autoCreateProfile = useCallback(async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser(userId);
      const meta = userData?.user?.user_metadata || {};
      const email = userData?.user?.email || '';

      const { error: insertErr } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email,
          full_name: meta.full_name || meta.name || email.split('@')[0] || null,
          phone: meta.phone || null,
          is_admin: false,
          role_level: 1,
        });

      if (insertErr) {
        console.error('Failed to auto-create profile:', insertErr.message);
        setProfile(null);
        return;
      }

      setProfile(defaultProfile({
        id: userId,
        email,
        full_name: meta.full_name || meta.name || null,
        phone: meta.phone || null,
      }));
    } catch (err) {
      console.error('Auto-create profile error:', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [fetchProfile]);

  // Initial session check
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      });
      subscription = sub.data.subscription;
    } catch {
      // ignore
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase n\'est pas configuré. Vérifiez les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Cloudflare Pages.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const isAdmin = profile?.is_admin === true;
  const isFullAdmin = profile?.is_admin === true;

  // Check if user is blocked
  useEffect(() => {
    if (profile?.is_blocked && user) {
      console.warn('User is blocked, signing out.');
      supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    }
  }, [profile?.is_blocked, user]);

  // Fetch unread notification count
  useEffect(() => {
    if (!profile || !isSupabaseConfigured) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_read', false);
        setUnreadCount(count ?? 0);
      } catch { setUnreadCount(0); }
    };
    fetchUnread();
    try {
      const sub = supabase
        .channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
          () => fetchUnread());
      sub.subscribe();
      return () => { sub.unsubscribe(); };
    } catch { /* notifications table may not exist yet */ }
  }, [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isAdmin, isFullAdmin, loading, profileLoading, signIn, signOut, refreshProfile, unreadCount }),
    [user, profile, isAdmin, isFullAdmin, loading, profileLoading, signIn, signOut, refreshProfile, unreadCount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}