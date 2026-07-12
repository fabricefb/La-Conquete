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
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, avatar_url, phone, address, gender, birth_date, is_admin, onboarding_completed, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Profile doesn't exist yet — auto-create it
        console.log('No profile found for user, creating one...');
        const { data: userData } = await supabase.auth.getUser(userId);
        const meta = userData?.user?.user_metadata || {};
        const email = userData?.user?.email || '';

        const newProfile = {
          id: userId,
          email,
          full_name: meta.full_name || meta.name || email.split('@')[0] || null,
          is_admin: false,
          onboarding_completed: false,
        };

        const { error: insertErr } = await supabase
          .from('user_profiles')
          .insert(newProfile);

        if (insertErr) {
          console.error('Failed to auto-create profile:', insertErr.message);
          setProfile(null);
          return;
        }

        setProfile({
          ...newProfile,
          avatar_url: null,
          phone: null,
          address: null,
          gender: null,
          birth_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile);
        return;
      }

      // Build profile object with fallbacks for missing columns
      const p = data as any;
      setProfile({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url ?? null,
        phone: p.phone ?? null,
        address: p.address ?? null,
        gender: p.gender ?? null,
        birth_date: p.birth_date ?? null,
        is_admin: p.is_admin ?? false,
        onboarding_completed: p.onboarding_completed ?? false,
        created_at: p.created_at,
        updated_at: p.updated_at,
      } as UserProfile);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [fetchProfile]);

  // Initial session check
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // No Supabase → skip auth, let the site render immediately
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
      // If Supabase is unreachable, still render the site
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const isAdmin = profile?.is_admin === true;

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isAdmin, loading, profileLoading, signIn, signOut, refreshProfile }),
    [user, profile, isAdmin, loading, profileLoading, signIn, signOut, refreshProfile],
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