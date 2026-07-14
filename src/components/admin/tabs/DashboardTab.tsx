import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Users, Heart, Building2, Calendar, BarChart3,
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
  1: { label: 'Membres', color: 'bg-blue-500' },
  2: { label: 'Serviteurs', color: 'bg-emerald-500' },
  3: { label: 'Chefs', color: 'bg-violet-500' },
  4: { label: 'Pasteurs', color: 'bg-evangile-600' },
  5: { label: 'Super Admins', color: 'bg-rose-500' },
};

// ─── Skeleton helpers ─────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ''}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
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
    <div className="glass rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted text-xs font-medium uppercase tracking-wider">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-3xl font-bold text-evangile-500 tabular-nums">{value}</div>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

// ─── Role bar ─────────────────────────────────────────────────────
function RoleBar({ label, count, color, max }: { label: string; count: number; color: string; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-24 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-cream tabular-nums w-8 text-right">{count}</span>
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
      className="glass rounded-xl p-4 text-left hover:bg-white/5 transition group"
    >
      <div className="flex items-center gap-3 mb-1">
        <Icon className="h-4 w-4 text-evangile-500" />
        <span className="text-sm font-medium text-cream">{label}</span>
        <ChevronRight className="h-3 w-3 text-muted ml-auto group-hover:text-evangile-500 transition" />
      </div>
      <p className="text-xs text-muted">{desc}</p>
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
          .gte('date', new Date().toISOString()),
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
      case 'received': return 'text-blue-400 bg-blue-400/10';
      case 'praying': return 'text-evangile-500 bg-evangile-600/10';
      case 'answered': return 'text-emerald-400 bg-emerald-400/10';
      default: return 'text-muted bg-white/5';
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
      <div className="glass rounded-xl p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-ember-400 mx-auto mb-3" />
        <p className="text-cream font-medium mb-1">Erreur de chargement</p>
        <p className="text-sm text-muted mb-4">{error}</p>
        <button onClick={fetchData} className="btn-gold inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-cream flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-evangile-500" />
            Tableau de bord
          </h1>
          <p className="text-sm text-muted mt-1">
            Vue d'ensemble de l'activité de l'église
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-xs font-medium text-muted hover:text-cream hover:bg-white/5 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ─── Stats grid ─── */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Role distribution */}
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cream mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-evangile-500" />
            Distribution par rôle
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
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
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cream mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-evangile-500" />
            Actions rapides
          </h2>
          <div className="flex flex-col gap-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent members */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cream mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-evangile-500" />
            Derniers inscrits
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-28 mb-1.5" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentMembers.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Aucun membre inscrit</p>
          ) : (
            <div className="space-y-3">
              {recentMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-evangile-600/10 text-xs font-bold text-evangile-500">
                    {(m.full_name ?? m.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cream truncate">
                      {m.full_name ?? m.email}
                    </p>
                    <p className="text-[11px] text-muted">
                      {roleLabel(m.role_level)} · {fmtRelative(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent prayer requests */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-cream mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 text-evangile-500" />
            Dernières demandes de prière
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="rounded-lg bg-white/5 p-3">
                  <Skeleton className="h-3.5 w-full mb-2" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPrayers.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Aucune demande de prière</p>
          ) : (
            <div className="space-y-2.5">
              {recentPrayers.map(p => (
                <div key={p.id} className="rounded-lg bg-white/5 p-3">
                  <p className="text-sm text-cream line-clamp-2 mb-2">
                    {p.content}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted truncate">
                      {p.is_anonymous ? 'Anonyme' : p.author_name} · {fmtRelative(p.created_at)}
                    </span>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>
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