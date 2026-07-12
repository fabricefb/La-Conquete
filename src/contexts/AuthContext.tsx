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
  unreadCount: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
      // ── Stratégie 1 : tenter avec toutes les colonnes V2 ──
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, avatar_url, phone, address, gender, birth_date, bio, is_admin, onboarding_completed, role_level, pastor_category, extension_id, is_principal_pastor, created_at, updated_at')
        .eq('id', userId)
        .single();

      // ── Si erreur de colonne manquante, retenter avec colonnes de base ──
      if (error && (error.message.includes('does not exist') || error.code === '42703')) {
        console.warn('Colonnes étendues manquantes, requête fallback…');
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, avatar_url, is_admin, onboarding_completed, created_at, updated_at')
          .eq('id', userId)
          .single();

        if (fallbackErr || !fallbackData) {
          // Profile introuvable → auto-création minimale
          await autoCreateProfile(userId);
          return;
        }

        const p = fallbackData as any;
        setProfile({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          avatar_url: p.avatar_url ?? null,
          phone: null,
          address: null,
          gender: null,
          birth_date: null,
          bio: null,
          is_admin: p.is_admin ?? false,
          onboarding_completed: p.onboarding_completed ?? true,
          role_level: p.role_level ?? (p.is_admin ? 6 : 1),
          pastor_category: p.pastor_category ?? null,
          extension_id: p.extension_id ?? null,
          is_principal_pastor: p.is_principal_pastor ?? false,
          created_at: p.created_at,
          updated_at: p.updated_at,
        } as UserProfile);
        return;
      }

      if (error || !data) {
        // Profile doesn't exist yet — auto-create it
        console.log('No profile found for user, creating one...');
        await autoCreateProfile(userId);
        return;
      }

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
        bio: p.bio ?? null,
        is_admin: p.is_admin ?? false,
        onboarding_completed: p.onboarding_completed ?? false,
        role_level: p.role_level ?? (p.is_admin ? 6 : 1),
        pastor_category: p.pastor_category ?? null,
        extension_id: p.extension_id ?? null,
        is_principal_pastor: p.is_principal_pastor ?? false,
        created_at: p.created_at,
        updated_at: p.updated_at,
      } as UserProfile);
    } catch (err) {
      console.error('Profile fetch error:', err);
      // En cas d'erreur imprévue, tenter le fallback minimal
      try {
        const { data: safeData } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, avatar_url, is_admin, onboarding_completed, created_at, updated_at')
          .eq('id', userId)
          .single();
        if (safeData) {
          const s = safeData as any;
          setProfile({
            id: s.id, email: s.email, full_name: s.full_name,
            avatar_url: s.avatar_url ?? null, phone: null, address: null,
            gender: null, birth_date: null, bio: null, is_admin: s.is_admin ?? false,
            onboarding_completed: s.onboarding_completed ?? true,
            role_level: s.role_level ?? (s.is_admin ? 6 : 1),
            pastor_category: s.pastor_category ?? null,
            extension_id: s.extension_id ?? null,
            is_principal_pastor: s.is_principal_pastor ?? false,
            created_at: s.created_at, updated_at: s.updated_at,
          } as UserProfile);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Auto-création de profil (utilitaire séparé) ──
  const autoCreateProfile = useCallback(async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser(userId);
      const meta = userData?.user?.user_metadata || {};
      const email = userData?.user?.email || '';

      const newProfile: Record<string, any> = {
        id: userId,
        email,
        full_name: meta.full_name || meta.name || email.split('@')[0] || null,
        is_admin: false,
      };

      // Tenter d'abord avec onboarding_completed
      let insertErr: any = null;
      const { error: err1 } = await supabase
        .from('user_profiles')
        .insert({ ...newProfile, onboarding_completed: false });

      if (err1 && (err1.message.includes('does not exist') || err1.code === '42703')) {
        // La colonne onboarding_completed n'existe pas, réessayer sans
        const { error: err2 } = await supabase
          .from('user_profiles')
          .insert(newProfile);
        insertErr = err2;
      } else {
        insertErr = err1;
      }

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
        bio: null,
        onboarding_completed: false,
        role_level: 1,
        pastor_category: null,
        extension_id: null,
        is_principal_pastor: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as UserProfile);
    } catch (err) {
      console.error('Auto-create profile error:', err);
      setProfile(null);
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

  // Fetch unread notification count
  useEffect(() => {
    if (!profile || !isSupabaseConfigured) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const sub = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => fetchUnread());
    sub.subscribe();
    return () => { sub.unsubscribe(); };
  }, [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isAdmin, loading, profileLoading, signIn, signOut, refreshProfile, unreadCount }),
    [user, profile, isAdmin, loading, profileLoading, signIn, signOut, refreshProfile, unreadCount],
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