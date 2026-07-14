'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserCheck, TrendingUp, TrendingDown, LayoutGrid,
  Church, Heart, MessageSquare, Calendar, Loader2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/* ═══════════════════════════════════════════════════════════════════
   Types & Demo Data
   ═══════════════════════════════════════════════════════════════════ */
interface StatCard {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
}

interface Activity {
  icon: React.ReactNode;
  text: string;
  time: string;
}

const DEMO_STATS: StatCard[] = [
  { label: 'Total membres', value: '347', trend: 12.5, icon: <Users className="h-5 w-5 text-evangile-600" /> },
  { label: 'Présents ce dimanche', value: '218', trend: 8.3, icon: <Church className="h-5 w-5 text-evangile-600" /> },
  { label: 'Nouveaux ce mois', value: '14', trend: -3.2, icon: <UserCheck className="h-5 w-5 text-evangile-600" /> },
  { label: 'Groupes actifs', value: '12', trend: 16.7, icon: <LayoutGrid className="h-5 w-5 text-evangile-600" /> },
];

const DEMO_ATTENDANCE = [
  { week: 'Sem 1', value: 72 },
  { week: 'Sem 2', value: 85 },
  { week: 'Sem 3', value: 68 },
  { week: 'Sem 4', value: 91 },
];

const DEMO_ACTIVITIES: Activity[] = [
  { icon: <UserCheck className="h-4 w-4 text-emerald-400" />, text: 'Marie Nzuzi a rejoint la communauté', time: 'Il y a 2h' },
  { icon: <Heart className="h-4 w-4 text-pink-400" />, text: 'Demande de prière exaucée — Guérison', time: 'Il y a 5h' },
  { icon: <MessageSquare className="h-4 w-4 text-divin-100" />, text: 'Nouveau message dans le groupe Jeunesse', time: 'Il y a 8h' },
  { icon: <Calendar className="h-4 w-4 text-amber-400" />, text: 'Réunion de département confirmée — Chant', time: 'Il y a 1j' },
  { icon: <Users className="h-4 w-4 text-purple-400" />, text: 'Cellule de maison Kinshasa — 18 présents', time: 'Il y a 2j' },
];

/* ═══════════════════════════════════════════════════════════════════
   CommunityDashboard Component
   ═══════════════════════════════════════════════════════════════════ */
export function CommunityDashboard() {
  const [stats, setStats] = useState<StatCard[]>(DEMO_STATS);
  const [attendance, setAttendance] = useState(DEMO_ATTENDANCE);
  const [activities, setActivities] = useState<Activity[]>(DEMO_ACTIVITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        // Fetch member count
        const { count: memberCount } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true });

        // Fetch recent events for attendance
        const { data: recentEvents } = await supabase
          .from('events')
          .select('title, event_date, is_featured')
          .order('event_date', { ascending: false })
          .limit(4);

        if (memberCount !== null) {
          const val = memberCount;
          setStats(prev => {
            const updated = [...prev];
            updated[0] = { ...updated[0], value: val.toString() };
            return updated;
          });
        }

        if (recentEvents && recentEvents.length > 0) {
          setActivities(prev => {
            const newActs: Activity[] = recentEvents.slice(0, 3).map((e: any) => ({
              icon: <Calendar className="h-4 w-4 text-amber-400" />,
              text: e.title || 'Événement',
              time: e.event_date ? `Le ${new Date(e.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : 'Récemment',
            }));
            return [...newActs, ...prev];
          });
        }
      } catch {
        /* keep demo data */
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const maxAttendance = Math.max(...attendance.map(a => a.value), 1);

  return (
    <section className="w-full">
      {/* ─── Stats Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 md:p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ))
        ) : (
          stats.map((s, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-4 md:p-6 transition hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evangile-600/10 group-hover:bg-evangile-600/20 transition">
                  {s.icon}
                </div>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${s.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(s.trend)}%
                </div>
              </div>
              <p className="font-headline text-headline-lg brand-text stat-number">{s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))
        )}
      </div>

      {/* ─── Two-column layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 md:mt-6">
        {/* ─── Attendance Chart (CSS only) ──────────────────────── */}
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <h3 className="font-headline text-sm text-cream mb-4">Fréquentation — 4 dernières semaines</h3>
          <div className="flex items-end gap-3 h-40">
            {attendance.map((a, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-cream stat-number">{a.value}%</span>
                <div className="w-full rounded-t-lg bg-evangile-600/20 relative overflow-hidden" style={{ height: '100%' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-evangile-600 transition-all duration-700"
                    style={{ height: `${(a.value / 100) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted">{a.week}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Activity Feed ─────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <h3 className="font-headline text-sm text-cream mb-4">Activité récente</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cream/90 truncate">{a.text}</p>
                  <p className="text-[11px] text-muted mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}