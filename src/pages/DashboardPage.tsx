import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { db, supabase } from '../lib/supabase';
import { formatDate } from '../lib/date';
import {
  Calendar, Bell, Heart, MapPin, Users, Clock, CheckCircle,
  MessageSquare, BookOpen, Star, ChevronRight, Plus, Send, User, Shield, Home,
} from '../lib/icons';
import type { ChurchEvent, PrayerRequest as PrayerReqType, NotificationItem, UserProfile, Department, Position } from '../types';
import type { Page } from '../lib/navigation';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';

/* ═══════════════════════════════════════════════════════════════════
   Props & Types
   ═══════════════════════════════════════════════════════════════════ */

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
}

interface StatCard {
  label: string;
  value: number;
  Icon: React.FC<{ className?: string }>;
  color: string;
}

interface UserDepartment {
  id: string;
  department_name: string;
  position_name: string | null;
  accent_color: string;
  icon_name: string;
}

/* ═══════════════════════════════════════════════════════════════════
   Intersection Observer Hook (scroll reveal)
   ═══════════════════════════════════════════════════════════════════ */

function useEvtReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function EvtReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useEvtReveal();
  return (
    <div
      ref={ref}
      className={`evt-reveal ${inView ? 'in' : ''} ${delay ? `evt-reveal-delay-${delay}` : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════════════════════ */

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const { colorMode, toggleColorMode } = useDynamicTheme();

  // ── State ──────────────────────────────────────────────────────
  const [stats, setStats] = useState<StatCard[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [prayers, setPrayers] = useState<PrayerReqType[]>([]);
  const [departments, setDepartments] = useState<UserDepartment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Membre';

  // ── Fetch all dashboard data ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadDashboard() {
      setDataLoading(true);
      try {
        const now = new Date().toISOString();

        // 1. Upcoming events
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', now.split('T')[0])
          .order('event_date', { ascending: true })
          .limit(10);

        // 2. Active prayer requests (public, not answered)
        const { data: prayerData } = await supabase
          .from('prayer_requests')
          .select('*')
          .eq('is_confidential', false)
          .neq('status', 'answered')
          .order('created_at', { ascending: false })
          .limit(5);

        // 3. Count queries for stats
        const [evtRes, prayRes, visitRes, memberRes] = await Promise.all([
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .gte('event_date', now.split('T')[0]),
          supabase
            .from('prayer_requests')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'answered'),
          supabase
            .from('visit_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'en_attente'),
          supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('onboarding_completed', true),
        ]);

        // 4. User's departments
        const { data: deptMembers } = await supabase
          .from('department_members')
          .select('department_id, position_id, departments(name, accent_color, icon_name), positions(name)')
          .eq('user_id', user.id)
          .eq('is_active', true);

        // 5. Notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8);

        if (cancelled) return;

        const userDepts: UserDepartment[] = (deptMembers || []).map((dm: any) => ({
          id: dm.department_id,
          department_name: dm.departments?.name || 'Département',
          position_name: dm.positions?.name || null,
          accent_color: dm.departments?.accent_color || 'gold',
          icon_name: dm.departments?.icon_name || 'Star',
        }));

        setEvents((eventData || []) as ChurchEvent[]);
        setPrayers((prayerData || []) as PrayerReqType[]);
        setDepartments(userDepts);
        setNotifications((notifData || []) as NotificationItem[]);
        setUnreadCount((notifData || []).filter((n: any) => !n.is_read).length);

        setStats([
          {
            label: 'Prochains événements',
            value: evtRes.count ?? 0,
            Icon: Calendar,
            color: 'text-sky-300',
          },
          {
            label: 'Requêtes de prière actives',
            value: prayRes.count ?? 0,
            Icon: Heart,
            color: 'text-rose-400',
          },
          {
            label: 'Demandes de visite en attente',
            value: visitRes.count ?? 0,
            Icon: MapPin,
            color: 'text-amber-400',
          },
          {
            label: 'Membres actifs ce mois',
            value: memberRes.count ?? 0,
            Icon: Users,
            color: 'text-emerald-400',
          },
        ]);
      } catch (err) {
        console.error('Dashboard data load error:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Prayer action ──────────────────────────────────────────────
  const handlePray = async (prayerId: string) => {
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .update({
          status: 'praying',
          prayed_by: user?.id || null,
          prayed_at: new Date().toISOString(),
        })
        .eq('id', prayerId);

      if (error) throw error;
      addToast('Nous prions avec vous ! 🙏', 'success');
      setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
    } catch {
      addToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  // ── Guard: not logged in ───────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans">
        <SiteHeader onNavigate={onNavigate} activePage="dashboard" theme={colorMode} onToggleTheme={toggleColorMode} />
        <div className="flex min-h-[80vh] items-center justify-center px-margin-mobile md:px-margin-desktop">
          <div className="glass-card max-w-md p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-400/10">
              <Shield className="h-10 w-10 text-gold-400" />
            </div>
            <h2 className="text-headline-lg font-display gold-text mb-3">
              Espace Membre
            </h2>
            <p className="text-body-lg text-muted mb-8">
              Connectez-vous pour accéder à votre tableau de bord personnel et suivre la vie de l'église.
            </p>
            <button onClick={() => onNavigate('connexion')} className="btn-gold px-8 py-3">
              Se connecter
            </button>
          </div>
        </div>
        <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
        <MobileNav onNavigate={onNavigate} active="dashboard" />
      </div>
    );
  }

  // ── Quick actions ──────────────────────────────────────────────
  const quickActions = [
    {
      label: 'Soumettre une demande de visite',
      Icon: MapPin,
      page: 'contact' as Page,
      desc: 'Demandez une visite pastorale',
    },
    {
      label: 'Soumettre une requête de prière',
      Icon: Heart,
      page: 'contact' as Page,
      desc: 'Partagez vos besoins de prière',
    },
    {
      label: 'Auto-évaluation spirituelle',
      Icon: BookOpen,
      page: 'contact' as Page,
      desc: 'Évaluez votre croissance spirituelle',
    },
    {
      label: 'Voir mes notifications',
      Icon: Bell,
      page: 'dashboard' as Page,
      desc: `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''}`,
    },
  ];

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-bg text-cream font-sans">
      <SiteHeader onNavigate={onNavigate} activePage="dashboard" theme={colorMode} onToggleTheme={toggleColorMode} />

      <main className="pt-16">
        {/* ── Subtle radial background ─────────────────────────────── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-gold opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-100/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-8xl px-margin-mobile md:px-margin-desktop py-xl">
            {/* ═══════════════════════════════════════════════════════
               1. WELCOME HEADER
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gold-400/15 ring-2 ring-gold-400/30">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={userName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gold-400" />
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-bg" />
                  </div>
                  <div>
                    <p className="text-label-lg text-muted font-sans uppercase tracking-wider">
                      Bienvenue,
                    </p>
                    <h1 className="text-headline-xl font-display text-cream">
                      {userName}
                    </h1>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const el = document.getElementById('recent-activity');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="relative flex items-center gap-2.5 rounded-xl glass px-4 py-3 text-sm font-medium text-cream transition-all duration-200 hover:border-gold-400/30 hover:bg-white/5"
                >
                  <Bell className="h-5 w-5 text-gold-400" />
                  <span className="hidden sm:inline">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               2. STATS ROW
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={1}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-10">
                {dataLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="glass-card flex flex-col gap-3 p-5 animate-pulse"
                      >
                        <div className="h-5 w-20 rounded bg-white/5" />
                        <div className="h-10 w-16 rounded bg-white/5" />
                      </div>
                    ))
                  : stats.map((stat) => {
                      const Icon = stat.Icon;
                      return (
                        <div
                          key={stat.label}
                          className="glass-card group flex flex-col gap-3 p-5 sm:p-6 transition-all duration-300 hover:border-gold-400/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/5 cursor-default"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-muted font-sans leading-snug">
                              {stat.label}
                            </span>
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/5 transition-colors duration-300 group-hover:bg-gold-400/10">
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                            </div>
                          </div>
                          <span className="text-3xl sm:text-4xl font-display font-bold text-cream tabular-nums">
                            {stat.value}
                          </span>
                        </div>
                      );
                    })}
              </div>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               3. UPCOMING EVENTS
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={2}>
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10">
                      <Calendar className="h-5 w-5 text-gold-400" />
                    </div>
                    <h2 className="text-headline-md font-display text-cream">
                      Prochains Événements
                    </h2>
                  </div>
                  <button
                    onClick={() => onNavigate('events')}
                    className="btn-ghost text-sm flex items-center gap-1.5"
                  >
                    Voir tout
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {events.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="mb-3 h-10 w-10 text-muted/40" />
                    <p className="text-muted text-sm">
                      Aucun événement à venir
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {events.slice(0, 3).map((evt, i) => {
                      const { day, month, full } = formatDate(evt.event_date);
                      return (
                        <div
                          key={evt.id}
                          className="glass-card group flex gap-4 p-4 sm:p-5 transition-all duration-300 hover:border-gold-400/20 hover:-translate-y-0.5 cursor-pointer"
                          onClick={() => onNavigate('events')}
                        >
                          {/* Date badge */}
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gold-400/10 ring-1 ring-gold-400/20 transition-colors duration-300 group-hover:bg-gold-400/15">
                            <span className="text-lg font-bold text-gold-400 font-display leading-none">
                              {day}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-400/80 mt-0.5">
                              {month}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-cream truncate mb-1">
                              {evt.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{evt.location || 'Lieu à confirmer'}</span>
                            </div>
                            <span className="mt-1.5 inline-block rounded-full bg-sky-100/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
                              {evt.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               4. PRAYER REQUESTS
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={3}>
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                      <Heart className="h-5 w-5 text-rose-400" />
                    </div>
                    <h2 className="text-headline-md font-display text-cream">
                      Requêtes de Prière
                    </h2>
                  </div>
                </div>

                {prayers.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
                    <Heart className="mb-3 h-10 w-10 text-muted/40" />
                    <p className="text-muted text-sm mb-4">
                      Aucune requête de prière active
                    </p>
                    <button
                      onClick={() => onNavigate('contact')}
                      className="btn-gold px-5 py-2 text-sm"
                    >
                      <Plus className="mr-1.5 h-4 w-4 inline" />
                      Soumettre une requête
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prayers.slice(0, 3).map((prayer) => (
                      <div
                        key={prayer.id}
                        className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between transition-all duration-300 hover:border-gold-400/15"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-medium text-muted">
                              {prayer.is_anonymous ? 'Anonyme' : prayer.author_name}
                            </span>
                            <span className="text-muted/30">·</span>
                            <span className="text-xs text-muted/70">
                              {formatDate(prayer.created_at).full}
                            </span>
                          </div>
                          <p className="text-sm text-cream/90 leading-relaxed line-clamp-2">
                            {prayer.content}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePray(prayer.id)}
                          className="flex shrink-0 items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm font-medium text-rose-400 transition-all duration-200 hover:bg-rose-500/20 hover:border-rose-500/30 active:scale-95"
                        >
                          <Heart className="h-4 w-4" />
                          Prier
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               5. MY DEPARTMENT
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={4}>
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Users className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h2 className="text-headline-md font-display text-cream">
                    Mon Département
                  </h2>
                </div>

                {departments.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-3 h-10 w-10 text-muted/40" />
                    <p className="text-muted text-sm mb-2">
                      Vous n'êtes pas encore assigné à un département
                    </p>
                    <p className="text-xs text-muted/60 max-w-sm">
                      Complétez votre profil ou contactez un responsable pour rejoindre un département.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="glass-card group p-5 transition-all duration-300 hover:border-gold-400/20 hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/10 ring-1 ring-gold-400/20 transition-colors duration-300 group-hover:bg-gold-400/15">
                            <Star className="h-5 w-5 text-gold-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-cream truncate">
                              {dept.department_name}
                            </h3>
                            {dept.position_name && (
                              <p className="mt-0.5 text-sm text-gold-400 font-medium">
                                {dept.position_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted rounded-lg bg-white/3 px-3 py-2">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-gold-400/70" />
                          <span>Réunion hebdomadaire —</span>
                          <span className="text-cream/70 font-medium">
                            À confirmer
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               6. QUICK ACTIONS
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={5}>
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <Send className="h-5 w-5 text-amber-400" />
                  </div>
                  <h2 className="text-headline-md font-display text-cream">
                    Actions Rapides
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.Icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => onNavigate(action.page)}
                        className="glass-card group flex items-center gap-4 p-4 sm:p-5 text-left transition-all duration-300 hover:border-gold-400/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/5"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/10 ring-1 ring-gold-400/20 transition-all duration-300 group-hover:bg-gold-400 group-hover:ring-gold-400/40 group-hover:text-white">
                          <Icon className="h-5 w-5 text-gold-400 transition-colors duration-300 group-hover:text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-cream group-hover:text-gold-300 transition-colors duration-200 truncate">
                            {action.label}
                          </h3>
                          <p className="text-xs text-muted mt-0.5 truncate">
                            {action.desc}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted/40 shrink-0 transition-all duration-300 group-hover:text-gold-400 group-hover:translate-x-1" />
                      </button>
                    );
                  })}
                </div>
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               7. RECENT ACTIVITY
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={6}>
              <section id="recent-activity" className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h2 className="text-headline-md font-display text-cream">
                    Activité Récente
                  </h2>
                </div>

                {notifications.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="mb-3 h-10 w-10 text-muted/40" />
                    <p className="text-muted text-sm">
                      Aucune activité récente
                    </p>
                  </div>
                ) : (
                  <div className="glass-card p-5 sm:p-6">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gold-400/20" />

                      <div className="space-y-6">
                        {notifications.slice(0, 5).map((notif, idx) => (
                          <div key={notif.id} className="relative flex gap-4">
                            {/* Dot */}
                            <div className="relative z-10 mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bg ring-2 ring-gold-400/30">
                              {notif.type === 'prayer' ? (
                                <Heart className="h-3.5 w-3.5 text-rose-400" />
                              ) : notif.type === 'visit' ? (
                                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                              ) : notif.type === 'assignment' ? (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                              ) : notif.type === 'alert' ? (
                                <Bell className="h-3.5 w-3.5 text-red-400" />
                              ) : (
                                <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className={`text-sm font-medium ${notif.is_read ? 'text-muted' : 'text-cream'}`}>
                                    {notif.title}
                                  </p>
                                  {notif.message && (
                                    <p className="mt-0.5 text-xs text-muted/80 line-clamp-2">
                                      {notif.message}
                                    </p>
                                  )}
                                </div>
                                {!notif.is_read && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-400" />
                                )}
                              </div>
                              <span className="mt-1 block text-[11px] text-muted/60">
                                {formatDate(notif.created_at).full}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </EvtReveal>
          </div>
        </div>
      </main>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="dashboard" />
    </div>
  );
}