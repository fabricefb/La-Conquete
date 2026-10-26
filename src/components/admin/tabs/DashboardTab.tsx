import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Users, Heart, Building2, Calendar,
  TrendingUp, Clock, ChevronRight, RefreshCw, AlertTriangle,
  UserPlus, MessageSquare, Shield,
} from '../../../lib/icons';
import type { AdminTab } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────
interface DashboardStats {
  activeMembers: number;
  newMembersThisMonth: number;
  pendingPrayers: number;
  departmentCount: number;
  upcomingEvents: number;
}

interface RoleDistribution {
  label: string;
  count: number;
  color: string;
}

interface RecentMember {
  id: string;
  full_name: string | null;
  email: string;
  role_level: number;
  created_at: string;
}

interface RecentPrayer {
  id: string;
  author_name: string;
  content: string;
  status: string;
  created_at: string;
  is_anonymous: boolean;
}

// (DashboardData removed — state is stored in separate useState hooks)

// ─── Role labels & colors ─────────────────────────────────────────
const ROLE_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Membres', color: 'bg-accent-300' },
  2: { label: 'Serviteurs', color: 'bg-accent-400' },
  3: { label: 'Chefs', color: 'bg-accent-500' },
  4: { label: 'Pasteurs', color: 'bg-[rgb(var(--accent-red-rgb))]' },
  5: { label: 'Super Admins', color: 'bg-evangile-600' },
};

// ─── Skeleton helpers ─────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 ${className ?? ''}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="panel p-5">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-9 w-16" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}

// ─── Panel title ──────────────────────────────────────────────────
function PanelTitle({
  label, title, icon: Icon,
}: {
  label: string;
  title: string;
  icon?: React.FC<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
      <div className="flex items-stretch gap-3">
        <span className="mt-0.5 w-[2px] shrink-0 bg-evangile-600" aria-hidden="true" />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-red-rgb))]">
            {label}
          </p>
          <h2 className="mt-1 font-hero text-xl uppercase leading-none tracking-[0.04em] text-cream">
            {title}
          </h2>
        </div>
      </div>
      {Icon && <Icon className="mt-1 h-4 w-4 shrink-0 text-muted" />}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="panel relative flex flex-col justify-between gap-6 p-5">
      <span className="absolute left-0 top-0 h-10 w-[2px] bg-evangile-600" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase leading-4 tracking-[0.24em] text-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-muted/70" />
      </div>
      <div>
        <div className="font-hero text-[2.75rem] leading-[0.85] tracking-[0.01em] text-cream tabular-nums">
          {value}
        </div>
        {sub && (
          <p className="mt-3 border-t border-line pt-2 text-[10px] uppercase tracking-[0.12em] text-muted">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Role bar ─────────────────────────────────────────────────────
function RoleBar({ label, count, color, max }: { label: string; count: number; color: string; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
      <span className="truncate text-[11px] text-muted">{label}</span>
      <div className="h-2 bg-white/[0.06]">
        <div
          className={`h-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right font-hero text-base leading-none text-cream tabular-nums">{count}</span>
    </div>
  );
}

// ─── Quick action button ──────────────────────────────────────────
function QuickAction({
  icon: Icon, label, desc, onClick,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 border-b border-line py-3 text-left transition-colors last:border-0 hover:bg-white/[0.02]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-muted transition-colors group-hover:border-evangile-600/50 group-hover:text-[rgb(var(--accent-red-rgb))]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-cream">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted">{desc}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent-red-rgb))]" />
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────
interface DashboardTabProps {
  onTabChange?: (tab: AdminTab) => void;
}

// ─── Main component ───────────────────────────────────────────────
export function DashboardTab({ onTabChange }: DashboardTabProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution[]>([]);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [recentPrayers, setRecentPrayers] = useState<RecentPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // ── Parallel fetches ──
      const [
        membersRes,
        newMembersRes,
        prayersRes,
        departmentsRes,
        eventsRes,
        roleBreakdownRes,
        recentMembersRes,
        recentPrayersRes,
      ] = await Promise.all([
        // Active members (role_level >= 1)
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .gte('role_level', 1)
          .eq('is_blocked', false),
        // New members this month
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .gte('role_level', 1)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        // Pending prayer requests
        supabase
          .from('prayer_requests')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'answered'),
        // Departments count
        supabase
          .from('departments')
          .select('id', { count: 'exact', head: true }),
        // Upcoming events
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .gte('event_date', new Date().toISOString()),
        // Role breakdown (role_level and count)
        supabase
          .from('user_profiles')
          .select('role_level')
          .gte('role_level', 1)
          .eq('is_blocked', false),
        // Recent members
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role_level, created_at')
          .gte('role_level', 1)
          .order('created_at', { ascending: false })
          .limit(5),
        // Recent prayer requests
        supabase
          .from('prayer_requests')
          .select('id, author_name, content, status, created_at, is_anonymous')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // ── Build stats ──
      const activeMembers = membersRes.count ?? 0;
      const newMembersThisMonth = newMembersRes.count ?? 0;
      const pendingPrayers = prayersRes.count ?? 0;
      const departmentCount = departmentsRes.count ?? 0;
      const upcomingEvents = eventsRes.count ?? 0;

      setStats({
        activeMembers,
        newMembersThisMonth,
        pendingPrayers,
        departmentCount,
        upcomingEvents,
      });

      // ── Role distribution ──
      const roleCounts: Record<number, number> = {};
      (roleBreakdownRes.data ?? []).forEach((r: any) => {
        const lvl = r.role_level ?? 1;
        roleCounts[lvl] = (roleCounts[lvl] || 0) + 1;
      });
      const dist: RoleDistribution[] = Object.entries(ROLE_MAP).map(([lvl, cfg]) => ({
        label: cfg.label,
        count: roleCounts[Number(lvl)] || 0,
        color: cfg.color,
      }));
      setRoleDistribution(dist);

      // ── Recent members ──
      setRecentMembers((recentMembersRes.data ?? []) as RecentMember[]);

      // ── Recent prayers ──
      setRecentPrayers((recentPrayersRes.data ?? []) as RecentPrayer[]);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Helpers ──
  const maxRole = Math.max(...roleDistribution.map(r => r.count), 1);

  const statusLabel = (s: string) => {
    switch (s) {
      case 'received': return 'Reçue';
      case 'praying': return 'En prière';
      case 'answered': return 'Exaucée';
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'received': return 'border-accent-400/40 text-accent-400';
      case 'praying': return 'border-evangile-600/60 text-[rgb(var(--accent-red-rgb))]';
      case 'answered': return 'border-emerald-500/40 text-emerald-400';
      default: return 'border-line text-muted';
    }
  };

  const roleLabel = (lvl: number) => ROLE_MAP[lvl]?.label ?? `Niveau ${lvl}`;

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return iso; }
  };

  const fmtRelative = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "À l'instant";
      if (mins < 60) return `Il y a ${mins}min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Il y a ${hrs}h`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `Il y a ${days}j`;
      return fmtDate(iso);
    } catch { return iso; }
  };

  // ── Error state ──
  if (error) {
    return (
      <div className="panel border-l-2 border-l-evangile-600 p-8 text-center">
        <AlertTriangle className="mx-auto h-9 w-9 text-[rgb(var(--accent-red-rgb))]" />
        <p className="mt-4 font-hero text-xl uppercase leading-none tracking-[0.04em] text-cream">
          Erreur de chargement
        </p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button onClick={fetchData} className="btn-primary mt-6">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="section-label">Vue d'ensemble</span>
          <h1 className="mt-3 font-hero text-[2.5rem] uppercase leading-none tracking-[0.02em] text-cream sm:text-[3rem]">
            Tableau de bord
          </h1>
          <p className="mt-2 text-sm text-muted">
            Activité de l'église, en temps réel.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-ghost shrink-0 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ─── Stats grid ─── */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Membres actifs"
            value={stats.activeMembers}
            sub={`+${stats.newMembersThisMonth} ce mois`}
          />
          <StatCard
            icon={Heart}
            label="Prières en attente"
            value={stats.pendingPrayers}
            sub="Non encore exaucées"
          />
          <StatCard
            icon={Building2}
            label="Départements"
            value={stats.departmentCount}
            sub="Départements actifs"
          />
          <StatCard
            icon={Calendar}
            label="Événements à venir"
            value={stats.upcomingEvents}
            sub="Prochains événements"
          />
        </div>
      ) : null}

      {/* ─── Middle row: Role distribution + Quick actions ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Role distribution */}
        <div className="panel p-5 lg:col-span-2">
          <PanelTitle label="Répartition" title="Par rôle" icon={TrendingUp} />
          {loading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {roleDistribution.map(rd => (
                <RoleBar
                  key={rd.label}
                  label={rd.label}
                  count={rd.count}
                  color={rd.color}
                  max={maxRole}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="panel p-5">
          <PanelTitle label="Raccourcis" title="Actions rapides" icon={Clock} />
          <div className="mt-1 flex flex-col">
            <QuickAction
              icon={UserPlus}
              label="Gérer les membres"
              desc="Ajouter ou modifier des utilisateurs"
              onClick={() => onTabChange?.('users')}
            />
            <QuickAction
              icon={Heart}
              label="Prier pour les demandes"
              desc="Voir et suivre les prières"
              onClick={() => onTabChange?.('pipeline')}
            />
            <QuickAction
              icon={MessageSquare}
              label="Lire les messages"
              desc="Messages de contact reçus"
              onClick={() => onTabChange?.('messages')}
            />
            <QuickAction
              icon={Calendar}
              label="Planifier un événement"
              desc="Créer un nouvel événement"
              onClick={() => onTabChange?.('events')}
            />
          </div>
        </div>
      </div>

      {/* ─── Bottom row: Recent members + Recent prayers ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent members */}
        <div className="panel p-5">
          <PanelTitle label="Derniers arrivés" title="Inscrits" icon={Shield} />
          {loading ? (
            <div className="mt-3 space-y-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <Skeleton className="h-9 w-9" />
                  <div className="flex-1">
                    <Skeleton className="mb-1.5 h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentMembers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aucun membre inscrit</p>
          ) : (
            <div className="mt-1">
              {recentMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line bg-white/[0.03] font-hero text-sm leading-none text-accent-400">
                    {(m.full_name ?? m.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-cream">
                      {m.full_name ?? m.email}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {roleLabel(m.role_level)} · {fmtRelative(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent prayer requests */}
        <div className="panel p-5">
          <PanelTitle label="Intercession" title="Dernières prières" icon={Heart} />
          {loading ? (
            <div className="mt-3 space-y-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="border-b border-line py-3 last:border-0">
                  <Skeleton className="mb-2 h-3.5 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPrayers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aucune demande de prière</p>
          ) : (
            <div className="mt-1">
              {recentPrayers.map(p => (
                <div key={p.id} className="border-b border-line py-3 last:border-0">
                  <p className="line-clamp-2 text-[13px] leading-6 text-cream/90">
                    {p.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-muted">
                      {p.is_anonymous ? 'Anonyme' : p.author_name} · {fmtRelative(p.created_at)}
                    </span>
                    <span className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}