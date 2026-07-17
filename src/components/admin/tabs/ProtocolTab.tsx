import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import type { CultReport, ProtocolTeam, ProtocolDressCode, NewVisitor, CultDay } from '../../../types';
import { CULT_DAY_LABELS, CULT_DAY_COLORS } from '../../../types';
import {
  Loader2, Plus, Trash2, Save, X, Edit3, Check, FileBarChart,
  UsersRound, CalendarClock, UserCheck, Shirt, ChevronLeft, ChevronRight, ChevronDown,
} from '../../../lib/icons';

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const SUB_TABS = [
  { key: 'reports', label: 'Rapports de Culte', icon: FileBarChart },
  { key: 'teams', label: 'Équipes de Rotation', icon: UsersRound },
  { key: 'schedule', label: 'Planning de Service', icon: CalendarClock },
  { key: 'visitors', label: 'Nouveaux Venus', icon: UserCheck },
  { key: 'dresscode', label: 'Code Vestimentaire', icon: Shirt },
] as const;

type SubTab = (typeof SUB_TABS)[number]['key'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-gray-500/20 text-gray-300' },
  soumis: { label: 'Soumis', cls: 'bg-amber-500/20 text-amber-300' },
  valide: { label: 'Validé', cls: 'bg-emerald-500/20 text-emerald-300' },
  rejete: { label: 'Rejeté', cls: 'bg-red-500/20 text-red-400' },
};

const VISITOR_STATUS: Record<NewVisitor['status'], { label: string; cls: string }> = {
  nouveau: { label: 'Nouveau', cls: 'bg-blue-500/20 text-blue-300' },
  contacte: { label: 'Contacté', cls: 'bg-amber-500/20 text-amber-300' },
  suivi_en_cours: { label: 'Suivi en cours', cls: 'bg-purple-500/20 text-purple-300' },
  integre: { label: 'Intégré', cls: 'bg-emerald-500/20 text-emerald-300' },
  perdu: { label: 'Perdu', cls: 'bg-red-500/20 text-red-400' },
};

const HOW_KNOWN_LABELS: Record<string, string> = {
  membre_invitation: 'Invitation membre',
  reseaux_sociaux: 'Réseaux sociaux',
  passant: 'Passant',
  media: 'Média',
  autre: 'Autre',
};

const FOLLOW_UP_LABELS: Record<string, string> = {
  visite: 'Visite',
  appel: 'Appel',
  information: 'Information',
  aucun: 'Aucun',
};

const SCHEDULE_DAYS: CultDay[] = ['mercredi', 'vendredi', 'samedi', 'dimanche'];

const FORMALITY_LABELS: Record<string, string> = {
  decontracte: 'Décontracté',
  correct: 'Correct',
  formel: 'Formel',
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export function ProtocolTab() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<SubTab>('reports');
  const [loading, setLoading] = useState(true);

  // ─── Sub-tab 1: Reports ──────────────────────────────────────
  const [reports, setReports] = useState<CultReport[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ id: string; status: 'valide' | 'rejete' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  // ─── Sub-tab 2: Teams ────────────────────────────────────────
  const [teams, setTeams] = useState<ProtocolTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, { id: string; user_id: string; role_in_team: string; full_name: string }[]>>({});
  const [teamForm, setTeamForm] = useState({ name: '', description: '', color: '#d4a843', department_id: '' });
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [addMemberForm, setAddMemberForm] = useState({ team_id: '', user_id: '', role_in_team: 'agent' as string });
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string }[]>([]);

  // ─── Sub-tab 3: Schedule ─────────────────────────────────────
  const [schedules, setSchedules] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [assignModal, setAssignModal] = useState<{ team_id: string; cult_day: CultDay } | null>(null);
  const [notifBadge, setNotifBadge] = useState<{ count: number; teamName: string } | null>(null);

  // ─── Sub-tab 4: Visitors ─────────────────────────────────────
  const [visitors, setVisitors] = useState<NewVisitor[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<NewVisitor | null>(null);
  const [visitorNotes, setVisitorNotes] = useState('');
  const [visitorStatusSaving, setVisitorStatusSaving] = useState(false);

  // ─── Sub-tab 5: Dress Code ───────────────────────────────────
  const [dressCodes, setDressCodes] = useState<ProtocolDressCode[]>([]);
  const [dressSaving, setDressSaving] = useState<string | null>(null);

  // ─── Consolidated Reports (multi-extension) ─────────────────
  const [extensions, setExtensions] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [allReportsForConsol, setAllReportsForConsol] = useState<CultReport[]>([]);
  const [expandedConsolidated, setExpandedConsolidated] = useState<Set<string>>(new Set());

  // ─── Fetch all data ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const promises = [
      fetchReports(),
      fetchExtensions(),
      fetchAllReportsForConsol(),
      fetchTeams(),
      fetchSchedules(),
      fetchVisitors(),
      fetchDressCodes(),
    ];
    await Promise.allSettled(promises);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Reports ─────────────────────────────────────────────────
  async function fetchReports() {
    try {
      const q = supabase.from('cult_reports').select('*').order('cult_date', { ascending: false }).limit(50);
      const { data, error } = await q;
      if (error) throw error;
      setReports((data as CultReport[]) ?? []);
    } catch { /* graceful */ }
  }

  async function fetchExtensions() {
    try {
      const { data, error } = await supabase.from('extensions').select('id, name, is_active').eq('is_active', true);
      if (error) throw error;
      setExtensions((data as any[]) ?? []);
    } catch { /* graceful */ }
  }

  async function fetchAllReportsForConsol() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('cult_reports')
        .select('*')
        .gte('cult_date', dateStr)
        .order('cult_date', { ascending: false });
      if (error) throw error;
      setAllReportsForConsol((data as CultReport[]) ?? []);
    } catch { /* graceful */ }
  }

  function toggleConsolidated(key: string) {
    setExpandedConsolidated(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleReview() {
    if (!reviewModal || !profile) return;
    setReviewSaving(true);
    try {
      const { error } = await supabase.from('cult_reports').update({
        status: reviewModal.status,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes.trim() || null,
      }).eq('id', reviewModal.id);
      if (error) throw error;
      addToast(reviewModal.status === 'valide' ? 'Rapport validé' : 'Rapport rejeté', 'success');
      setReviewModal(null);
      setAdminNotes('');
      await fetchReports();
    } catch {
      addToast('Erreur lors de la révision', 'error');
    }
    setReviewSaving(false);
  }

  // ─── Teams ───────────────────────────────────────────────────
  async function fetchTeams() {
    try {
      const { data, error } = await supabase.from('protocol_teams').select('*').order('sort_order');
      if (error) throw error;
      setTeams((data as ProtocolTeam[]) ?? []);
      // Fetch member counts
      for (const t of (data ?? [])) {
        try {
          const { data: members } = await supabase
            .from('protocol_team_members')
            .select('id, user_id, role_in_team, user_profiles(full_name)')
            .eq('team_id', t.id)
            .eq('is_active', true);
          if (members) {
            setTeamMembers(prev => ({
              ...prev,
              [t.id]: members.map((m: any) => ({ id: m.id, user_id: m.user_id, role_in_team: m.role_in_team, full_name: m.user_profiles?.full_name || 'Inconnu' })),
            }));
          }
        } catch { /* graceful */ }
      }
      // Fetch all users for add-member form
      const { data: users } = await supabase.from('user_profiles').select('id, full_name').order('full_name');
      if (users) setAllUsers(users as any[]);
      // Fetch active departments for team form + filter
      const { data: depts } = await supabase.from('departments').select('id, name').eq('is_active', true);
      if (depts) setDepartments(depts as { id: string; name: string }[]);
    } catch { /* graceful */ }
  }

  async function saveTeam() {
    if (!teamForm.name.trim()) return;
    setTeamSaving(true);
    try {
      const payload = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || null,
        color: teamForm.color,
        department_id: teamForm.department_id || null,
      };
      if (editingTeamId) {
        const { error } = await supabase.from('protocol_teams').update(payload).eq('id', editingTeamId);
        if (error) throw error;
        addToast('Équipe mise à jour', 'success');
      } else {
        const { error } = await supabase.from('protocol_teams').insert(payload);
        if (error) throw error;
        addToast('Équipe créée', 'success');
      }
      setTeamForm({ name: '', description: '', color: '#d4a843', department_id: '' });
      setEditingTeamId(null);
      await fetchTeams();
    } catch {
      addToast("Erreur lors de l'enregistrement", 'error');
    }
    setTeamSaving(false);
  }

  async function deleteTeam(id: string) {
    if (!window.confirm('Supprimer cette équipe et ses membres ?')) return;
    const { error } = await supabase.from('protocol_teams').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast('Équipe supprimée', 'success');
    await fetchTeams();
  }

  async function addMember() {
    if (!addMemberForm.team_id || !addMemberForm.user_id) return;
    try {
      const { error } = await supabase.from('protocol_team_members').insert({
        team_id: addMemberForm.team_id,
        user_id: addMemberForm.user_id,
        role_in_team: addMemberForm.role_in_team,
      });
      if (error) throw error;
      addToast('Membre ajouté', 'success');
      setAddMemberForm({ team_id: '', user_id: '', role_in_team: 'agent' });
      await fetchTeams();
    } catch {
      addToast("Erreur lors de l'ajout du membre", 'error');
    }
  }

  async function removeMember(id: string) {
    const { error } = await supabase.from('protocol_team_members').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast('Membre retiré', 'success');
    await fetchTeams();
  }

  // ─── Schedules ───────────────────────────────────────────────
  function getWeekDates(offset: number) {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setDate(monday.getDate() + (offset * 7));
    const weekNum = getISOWeek(monday);
    return {
      label: `Sem. ${weekNum} — ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(monday.getTime() + 6 * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
      weekNumber: weekNum,
      year: monday.getFullYear(),
      month: monday.getMonth() + 1,
    };
  }

  function getISOWeek(d: Date) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  async function fetchSchedules() {
    try {
      const { data, error } = await supabase
        .from('protocol_schedules')
        .select('*, protocol_teams(name, color)')
        .eq('is_active', true);
      if (error) throw error;
      setSchedules((data as any[]) ?? []);
    } catch { /* graceful */ }
  }

  async function assignTeam(teamId: string, cultDay: CultDay) {
    const wk = getWeekDates(weekOffset);
    try {
      // Upsert
      const { error } = await supabase.from('protocol_schedules').upsert({
        team_id: teamId,
        cult_day: cultDay,
        week_number: wk.weekNumber,
        year: wk.year,
        month: wk.month,
        is_active: true,
      }, { onConflict: 'team_id,cult_day,week_number,year' });
      if (error) throw error;
      addToast('Planning mis à jour', 'success');

      // Send notifications to team members
      try {
        const { data: members } = await supabase
          .from('protocol_team_members')
          .select('user_id')
          .eq('team_id', teamId);
        const teamName = teams.find(t => t.id === teamId)?.name || 'Équipe';
        const date = CULT_DAY_LABELS[cultDay];
        if (members && members.length > 0) {
          const notifs = members.map((m: any) => ({
            user_id: m.user_id,
            title: 'Rotation de protocole',
            message: `Votre équipe "${teamName}" est assignée pour le culte du ${date}.`,
            type: 'protocol',
            is_read: false,
          }));
          await supabase.from('notifications').insert(notifs);
          setNotifBadge({ count: members.length, teamName });
          setTimeout(() => setNotifBadge(null), 5000);
        }
      } catch { /* notification failure is non-blocking */ }

      setAssignModal(null);
      await fetchSchedules();
    } catch {
      addToast('Erreur lors de l\'assignation', 'error');
    }
  }

  async function clearSchedule(id: string) {
    const { error } = await supabase.from('protocol_schedules').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast('Assignation supprimée', 'success');
    await fetchSchedules();
  }

  // ─── Visitors ────────────────────────────────────────────────
  async function fetchVisitors() {
    try {
      const { data, error } = await supabase
        .from('new_visitors')
        .select('*, recorder:user_profiles!recorded_by(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVisitors((data as any[]) ?? []);
    } catch { /* graceful */ }
  }

  async function updateVisitorStatus(id: string, status: NewVisitor['status']) {
    setVisitorStatusSaving(true);
    try {
      const { error } = await supabase.from('new_visitors').update({
        status,
        follow_up_by: profile?.id,
        follow_up_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      addToast('Statut mis à jour', 'success');
      await fetchVisitors();
      if (selectedVisitor?.id === id) {
        setSelectedVisitor(prev => prev ? { ...prev, status } : null);
      }
    } catch {
      addToast('Erreur de mise à jour', 'error');
    }
    setVisitorStatusSaving(false);
  }

  async function saveVisitorNotes(id: string) {
    try {
      const { error } = await supabase.from('new_visitors').update({
        follow_up_notes: visitorNotes.trim() || null,
        follow_up_by: profile?.id,
        follow_up_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      addToast('Notes sauvegardées', 'success');
      await fetchVisitors();
    } catch {
      addToast('Erreur de sauvegarde', 'error');
    }
  }

  // ─── Dress Codes ─────────────────────────────────────────────
  async function fetchDressCodes() {
    try {
      const { data, error } = await supabase.from('protocol_dress_code').select('*');
      if (error) throw error;
      setDressCodes((data as ProtocolDressCode[]) ?? []);
    } catch { /* graceful */ }
  }

  async function saveDressCode(dc: ProtocolDressCode) {
    setDressSaving(dc.id);
    try {
      const { error } = await supabase.from('protocol_dress_code').update({
        description: dc.description,
        required_items: dc.required_items,
        formality_level: dc.formality_level,
        icon_hint: dc.icon_hint,
      }).eq('id', dc.id);
      if (error) throw error;
      addToast('Code vestimentaire sauvegardé', 'success');
    } catch {
      addToast('Erreur de sauvegarde', 'error');
    }
    setDressSaving(null);
  }

  // ─── Helpers ─────────────────────────────────────────────────
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthReports = reports.filter(r => r.cult_date >= thisMonthStart);
  const monthTotals = monthReports.reduce((acc, r) => {
    acc.participants += r.total_attendance;
    acc.newComers += r.new_comers_count;
    return acc;
  }, { participants: 0, newComers: 0 });
  const displayedReports = showAll ? reports : reports.slice(0, 20);

  const totalVisitors = visitors.length;
  const monthVisitors = visitors.filter(v => v.created_at >= thisMonthStart).length;
  const integratedVisitors = visitors.filter(v => v.status === 'integre').length;
  const lostVisitors = visitors.filter(v => v.status === 'perdu').length;

  const weekInfo = getWeekDates(weekOffset);

  function getScheduleForDay(day: CultDay) {
    return schedules.find(s =>
      s.cult_day === day && s.week_number === weekInfo.weekNumber && s.year === weekInfo.year
    );
  }

  // ─── Consolidated multi-extension groups ──────────────────
  interface ConsolidatedGroup {
    key: string;
    cult_date: string;
    cult_day: CultDay;
    reports: (CultReport & { extension_name: string | null })[];
    totalMen: number;
    totalWomen: number;
    totalChildren: number;
    totalAttendance: number;
    totalNewComers: number;
    extensionIds: Set<string | null>;
  }

  const extNameMap = new Map(extensions.map(e => [e.id, e.name]));

  const reportsWithExt = allReportsForConsol.map(r => ({
    ...r,
    extension_name: r.extension_id ? extNameMap.get(r.extension_id) || 'Extension inconnue' : null,
  }));

  const groupedForConsol = new Map<string, ConsolidatedGroup>();
  for (const r of reportsWithExt) {
    const key = `${r.cult_date}_${r.cult_day}`;
    const existing = groupedForConsol.get(key);
    if (existing) {
      existing.reports.push(r);
      existing.totalMen += r.men_count;
      existing.totalWomen += r.women_count;
      existing.totalChildren += r.children_count;
      existing.totalAttendance += r.total_attendance;
      existing.totalNewComers += r.new_comers_count;
      if (r.extension_id) existing.extensionIds.add(r.extension_id);
    } else {
      const ids = new Set<string | null>();
      if (r.extension_id) ids.add(r.extension_id);
      groupedForConsol.set(key, {
        key,
        cult_date: r.cult_date,
        cult_day: r.cult_day,
        reports: [r],
        totalMen: r.men_count,
        totalWomen: r.women_count,
        totalChildren: r.children_count,
        totalAttendance: r.total_attendance,
        totalNewComers: r.new_comers_count,
        extensionIds: ids,
      });
    }
  }

  const consolidatedGroups = Array.from(groupedForConsol.values())
    .filter(g => g.extensionIds.size >= 2)
    .sort((a, b) => b.cult_date.localeCompare(a.cult_date));

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Sub-tabs navigation ─────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-accent-400/20 text-accent-400 border border-accent-400/30'
                  : 'bg-white/5 text-muted hover:text-cream border border-transparent hover:border-line'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 1: Rapports de Culte
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-sm text-cream">
              <span className="gold-text font-semibold">Ce mois :</span>{' '}
              {monthReports.length} rapports,{' '}
              {monthTotals.participants} participants totaux,{' '}
              {monthTotals.newComers} nouveaux venus
            </p>
          </div>

          {/* Date filter */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-cream">Historique des rapports</h3>
            <button onClick={() => setShowAll(v => !v)} className="btn-ghost text-xs">
              {showAll ? 'Voir 30 derniers jours' : 'Voir tout'}
            </button>
          </div>

          {/* ─── Consolidated multi-extension reports ──────────── */}
          {consolidatedGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <FileBarChart className="h-5 w-5 text-accent-400" />
                <h3 className="font-display text-base font-semibold text-cream">Rapports consolidés multi-églises</h3>
                <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">
                  {consolidatedGroups.length} date{consolidatedGroups.length !== 1 ? 's' : ''}
                </span>
              </div>

              {consolidatedGroups.map(group => {
                const isExpanded = expandedConsolidated.has(group.key);
                const extCount = group.extensionIds.size;
                // Build per-extension summary
                const perExt = new Map<string, { name: string; total: number; men: number; women: number; children: number; newComers: number; reportCount: number }>();
                for (const r of group.reports) {
                  const extKey = r.extension_id || '_none';
                  const existing = perExt.get(extKey);
                  if (existing) {
                    existing.total += r.total_attendance;
                    existing.men += r.men_count;
                    existing.women += r.women_count;
                    existing.children += r.children_count;
                    existing.newComers += r.new_comers_count;
                    existing.reportCount += 1;
                  } else {
                    perExt.set(extKey, {
                      name: r.extension_name || 'Sans extension',
                      total: r.total_attendance,
                      men: r.men_count,
                      women: r.women_count,
                      children: r.children_count,
                      newComers: r.new_comers_count,
                      reportCount: 1,
                    });
                  }
                }

                return (
                  <div key={group.key} className="glass-card rounded-2xl overflow-hidden">
                    {/* Card header — always visible */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition"
                      onClick={() => toggleConsolidated(group.key)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-cream font-medium">
                            {new Date(group.cult_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${CULT_DAY_COLORS[group.cult_day]}`}>
                            {CULT_DAY_LABELS[group.cult_day]}
                          </span>
                          <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">
                            {extCount} extensions
                          </span>
                        </div>
                        {/* Merged totals row */}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-cream/70">
                            <span className="text-muted">H:</span> <span className="text-cream font-semibold">{group.totalMen}</span>
                          </span>
                          <span className="text-cream/70">
                            <span className="text-muted">F:</span> <span className="text-cream font-semibold">{group.totalWomen}</span>
                          </span>
                          <span className="text-cream/70">
                            <span className="text-muted">E:</span> <span className="text-cream font-semibold">{group.totalChildren}</span>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            Total: {group.totalAttendance}
                          </span>
                          <span className="text-accent-400 font-semibold">
                            Nvx: {group.totalNewComers}
                          </span>
                        </div>
                      </div>

                      {/* Extension mini-list (names + individual totals) */}
                      <div className="hidden md:flex items-center gap-2">
                        {Array.from(perExt.values()).map(ext => (
                          <div key={ext.name} className="text-right bg-white/5 rounded-lg px-3 py-1.5 border border-line/50">
                            <p className="text-[10px] text-muted leading-none">{ext.name}</p>
                            <p className="text-sm font-bold text-cream">{ext.total}</p>
                          </div>
                        ))}
                      </div>

                      <ChevronDown className={`h-4 w-4 text-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Expanded per-extension breakdown */}
                    {isExpanded && (
                      <div className="border-t border-line bg-white/[0.01] p-4">
                        <p className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Détails par extension</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Array.from(perExt.values()).map(ext => (
                            <div key={ext.name} className="rounded-xl bg-white/5 border border-line p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-cream">{ext.name}</span>
                                <span className="text-[10px] text-muted">{ext.reportCount} rapport{ext.reportCount !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1 text-center">
                                <div>
                                  <p className="text-[10px] text-muted">H</p>
                                  <p className="text-sm font-semibold text-cream">{ext.men}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted">F</p>
                                  <p className="text-sm font-semibold text-cream">{ext.women}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted">E</p>
                                  <p className="text-sm font-semibold text-cream">{ext.children}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-accent-400">Nvx</p>
                                  <p className="text-sm font-bold text-accent-400">{ext.newComers}</p>
                                </div>
                              </div>
                              <div className="text-center pt-1 border-t border-line/50">
                                <p className="text-emerald-400 font-bold text-lg">{ext.total}</p>
                                <p className="text-[10px] text-muted">Total</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Grand total bar */}
                        <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-emerald-400">Total consolidé</span>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-cream/70">H <span className="text-cream font-bold">{group.totalMen}</span></span>
                            <span className="text-cream/70">F <span className="text-cream font-bold">{group.totalWomen}</span></span>
                            <span className="text-cream/70">E <span className="text-cream font-bold">{group.totalChildren}</span></span>
                            <span className="text-emerald-400 font-bold text-base">{group.totalAttendance}</span>
                            <span className="text-accent-400 font-semibold">+{group.totalNewComers} nvx</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {reports.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileBarChart className="mx-auto h-10 w-10 text-muted/30 mb-4" />
              <p className="text-muted">Aucun rapport de culte enregistré.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Jour</th>
                      <th className="text-left px-4 py-3 font-medium">Équipe</th>
                      <th className="text-center px-4 py-3 font-medium">H</th>
                      <th className="text-center px-4 py-3 font-medium">F</th>
                      <th className="text-center px-4 py-3 font-medium">E</th>
                      <th className="text-center px-4 py-3 font-medium">Total</th>
                      <th className="text-center px-4 py-3 font-medium">Nvx</th>
                      <th className="text-left px-4 py-3 font-medium">Statut</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReports.map(r => {
                      const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.brouillon;
                      return (
                        <tr key={r.id} className="border-b border-line/50 hover:bg-white/[0.02] transition">
                          <td className="px-4 py-3 text-cream whitespace-nowrap">
                            {new Date(r.cult_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold border ${CULT_DAY_COLORS[r.cult_day]}`}>
                              {CULT_DAY_LABELS[r.cult_day]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-cream/70">{r.team_group || '—'}</td>
                          <td className="px-4 py-3 text-center text-cream/70">{r.men_count}</td>
                          <td className="px-4 py-3 text-center text-cream/70">{r.women_count}</td>
                          <td className="px-4 py-3 text-center text-cream/70">{r.children_count}</td>
                          <td className="px-4 py-3 text-center font-semibold text-cream">{r.total_attendance}</td>
                          <td className="px-4 py-3 text-center text-accent-400 font-semibold">{r.new_comers_count}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sc.cls}`}>{sc.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(r.status === 'soumis' || r.status === 'brouillon') && (
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => { setReviewModal({ id: r.id, status: 'valide' }); setAdminNotes(r.admin_notes || ''); }} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition">
                                  <Check className="inline h-3 w-3 mr-0.5" />Valider
                                </button>
                                <button onClick={() => { setReviewModal({ id: r.id, status: 'rejete' }); setAdminNotes(r.admin_notes || ''); }} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition">
                                  Rejeter
                                </button>
                              </div>
                            )}
                            {r.admin_notes && (
                              <span className="text-[10px] text-muted block mt-0.5 max-w-[150px] truncate" title={r.admin_notes}>📝 {r.admin_notes}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 2: Équipes de Rotation
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {/* Add / Edit team form */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-lg font-semibold text-cream">
              {editingTeamId ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Nom</label>
                <input type="text" value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} placeholder="Nom de l'équipe" className="input-surface w-full px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
                <input type="text" value={teamForm.description} onChange={e => setTeamForm(p => ({ ...p, description: e.target.value }))} placeholder="Description optionnelle" className="input-surface w-full px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Couleur</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={teamForm.color} onChange={e => setTeamForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-14 rounded-lg border border-line bg-transparent cursor-pointer" />
                  <span className="text-xs text-muted">{teamForm.color}</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Département</label>
                <select value={teamForm.department_id} onChange={e => setTeamForm(p => ({ ...p, department_id: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm">
                  <option value="">Aucun département</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveTeam} disabled={teamSaving || !teamForm.name.trim()} className="btn-gold flex items-center gap-2 text-sm disabled:opacity-50">
                {teamSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingTeamId ? 'Mettre à jour' : 'Créer l\'équipe'}
              </button>
              {editingTeamId && (
                <button onClick={() => { setEditingTeamId(null); setTeamForm({ name: '', description: '', color: '#d4a843', department_id: '' }); }} className="btn-ghost text-sm">Annuler</button>
              )}
            </div>
          </div>

          {/* Department filter */}
          {departments.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted">Filtrer par département :</label>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input-surface px-3 py-1.5 text-sm">
                <option value="all">Toutes</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Teams list */}
          {(() => {
            const filteredTeams = deptFilter === 'all' ? teams : teams.filter(t => (t as any).department_id === deptFilter);
            if (filteredTeams.length === 0) {
              return (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <UsersRound className="mx-auto h-10 w-10 text-muted/30 mb-4" />
                  <p className="text-muted">{teams.length === 0 ? 'Aucune équipe configurée.' : 'Aucune équipe dans ce département.'}</p>
                </div>
              );
            }
            return (
            <div className="space-y-3">
              {filteredTeams.map(team => {
                const members = teamMembers[team.id] || [];
                const isExpanded = expandedTeam === team.id;
                return (
                  <div key={team.id} className="glass-card rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedTeam(isExpanded ? null : team.id)}>
                      <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-semibold text-cream">{team.name}</h4>
                          <span className="text-xs text-muted bg-white/5 rounded-full px-2 py-0.5">{members.length} membre{members.length !== 1 ? 's' : ''}</span>
                          {!team.is_active && <span className="text-[10px] bg-red-500/20 text-red-400 rounded-full px-2 py-0.5">Inactive</span>}
                        </div>
                        {team.description && <p className="text-xs text-muted mt-0.5">{team.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditingTeamId(team.id); setTeamForm({ name: team.name, description: team.description || '', color: team.color, department_id: (team as any).department_id || '' }); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-accent-400 hover:border-accent-400/30 transition">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteTeam(team.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-red-400 hover:border-red-400/30 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-line p-4 space-y-3 bg-white/[0.01]">
                        {members.length === 0 ? (
                          <p className="text-xs text-muted text-center py-2">Aucun membre dans cette équipe.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {members.map(m => (
                              <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400/20 text-accent-400 text-[10px] font-bold">
                                    {m.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="text-sm text-cream">{m.full_name}</span>
                                    <span className="ml-2 text-[10px] uppercase font-semibold text-muted bg-white/5 rounded px-1.5 py-0.5">{m.role_in_team}</span>
                                  </div>
                                </div>
                                <button onClick={() => removeMember(m.id)} className="text-muted hover:text-red-400 transition">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Add member form */}
                        <div className="flex items-center gap-2 pt-2 border-t border-line/50">
                          <select value={addMemberForm.user_id || ''} onChange={e => setAddMemberForm(p => ({ ...p, team_id: team.id, user_id: e.target.value }))} className="input-surface flex-1 px-3 py-2 text-sm min-w-0">
                            <option value="">Sélectionner un membre...</option>
                            {allUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.full_name || u.id.slice(0, 8)}</option>
                            ))}
                          </select>
                          <select value={addMemberForm.role_in_team} onChange={e => setAddMemberForm(p => ({ ...p, role_in_team: e.target.value }))} className="input-surface w-32 px-3 py-2 text-sm">
                            <option value="agent">Agent</option>
                            <option value="responsable">Responsable</option>
                            <option value="adjoint">Adjoint</option>
                          </select>
                          <button onClick={addMember} disabled={!addMemberForm.user_id} className="btn-gold px-3 py-2 text-sm disabled:opacity-50 flex items-center gap-1">
                            <Plus className="h-3.5 w-3.5" /> Ajouter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 3: Planning de Service
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-lg font-semibold text-cream">Planning de la semaine</h3>
              {notifBadge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-400/20 text-accent-400 border border-accent-400/30 px-3 py-1 text-xs font-medium">
                  <Check className="h-3 w-3" />
                  Notifications envoyées ({notifBadge.count} membre{notifBadge.count !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setWeekOffset(w => w - 1); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-cream transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-cream min-w-[200px] text-center">{weekInfo.label}</span>
              <button onClick={() => { setWeekOffset(w => w + 1); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-cream transition">
                <ChevronRight className="h-4 w-4" />
              </button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="btn-ghost text-xs">Cette semaine</button>
              )}
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <CalendarClock className="mx-auto h-10 w-10 text-muted/30 mb-4" />
              <p className="text-muted">Aucune équipe configurée. Créez d'abord des équipes dans l'onglet "Équipes de Rotation".</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="text-left px-4 py-3 font-medium">Équipe</th>
                      {SCHEDULE_DAYS.map(d => (
                        <th key={d} className="text-center px-4 py-3 font-medium">{CULT_DAY_LABELS[d]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map(team => (
                      <tr key={team.id} className="border-b border-line/50 hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                            <span className="text-cream font-medium">{team.name}</span>
                          </div>
                        </td>
                        {SCHEDULE_DAYS.map(day => {
                          const sch = getScheduleForDay(day);
                          const isAssigned = sch && sch.team_id === team.id;
                          return (
                            <td key={day} className="px-4 py-3 text-center">
                              {isAssigned ? (
                                <button onClick={() => clearSchedule(sch.id)} className="rounded-lg bg-accent-400/20 text-accent-400 px-3 py-1.5 text-xs font-semibold hover:bg-accent-400/30 transition" title="Cliquer pour retirer">
                                  ✦ Assigné
                                </button>
                              ) : (
                                <button onClick={() => setAssignModal({ team_id: team.id, cult_day: day })} className="rounded-lg bg-white/5 text-muted px-3 py-1.5 text-xs hover:bg-white/10 hover:text-cream transition border border-dashed border-line">
                                  + Assigner
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Quick view: which team per day */}
              <div className="border-t border-line p-4 bg-white/[0.01]">
                <p className="text-xs font-medium text-muted mb-2">Résumé de la semaine :</p>
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_DAYS.map(day => {
                    const sch = getScheduleForDay(day);
                    const team = teams.find(t => t.id === sch?.team_id);
                    return (
                      <div key={day} className={`rounded-lg border px-3 py-1.5 text-xs ${team ? CULT_DAY_COLORS[day] : 'bg-white/5 text-muted border-line'}`}>
                        <span className="font-semibold">{CULT_DAY_LABELS[day]}:</span>{' '}
                        {team ? team.name : 'Non assigné'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 4: Nouveaux Venus
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'visitors' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-sm text-cream">
              <span className="gold-text font-semibold">Total visiteurs :</span> {totalVisitors} |{' '}
              <span className="text-muted">Ce mois :</span> {monthVisitors} |{' '}
              <span className="text-emerald-400">Intégrés :</span> {integratedVisitors} |{' '}
              <span className="text-red-400">Perdus :</span> {lostVisitors}
            </p>
          </div>

          {visitors.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <UserCheck className="mx-auto h-10 w-10 text-muted/30 mb-4" />
              <p className="text-muted">Aucun visiteur enregistré.</p>
            </div>
          ) : (
            <>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-muted">
                        <th className="text-left px-4 py-3 font-medium">Nom</th>
                        <th className="text-left px-4 py-3 font-medium">Téléphone</th>
                        <th className="text-left px-4 py-3 font-medium">Quartier</th>
                        <th className="text-left px-4 py-3 font-medium">Comment connu</th>
                        <th className="text-left px-4 py-3 font-medium">Suivi</th>
                        <th className="text-left px-4 py-3 font-medium">Statut</th>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Enregistré par</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map(v => {
                        const vs = VISITOR_STATUS[v.status] ?? VISITOR_STATUS.nouveau;
                        return (
                          <tr
                            key={v.id}
                            onClick={() => { setSelectedVisitor(v); setVisitorNotes(v.follow_up_notes || ''); }}
                            className="border-b border-line/50 hover:bg-white/[0.02] transition cursor-pointer"
                          >
                            <td className="px-4 py-3 text-cream font-medium">{v.visitor_name}</td>
                            <td className="px-4 py-3 text-cream/70">{v.visitor_phone || '—'}</td>
                            <td className="px-4 py-3 text-cream/70">{v.visitor_quartier || '—'}</td>
                            <td className="px-4 py-3 text-cream/70">{v.how_known ? HOW_KNOWN_LABELS[v.how_known] || v.how_known : '—'}</td>
                            <td className="px-4 py-3 text-cream/70">{v.follow_up_type ? FOLLOW_UP_LABELS[v.follow_up_type] || v.follow_up_type : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${vs.cls}`}>{vs.label}</span>
                            </td>
                            <td className="px-4 py-3 text-cream/70 whitespace-nowrap">{new Date(v.cult_date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-4 py-3 text-cream/70">{(v as any).recorder?.full_name || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Visitor detail modal */}
              {selectedVisitor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedVisitor(null)} />
                  <div className="relative glass rounded-2xl p-6 w-full max-w-lg space-y-4 border border-line max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-semibold text-cream">{selectedVisitor.visitor_name}</h3>
                      <button onClick={() => setSelectedVisitor(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:text-cream transition">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted">Téléphone :</span> <span className="text-cream">{selectedVisitor.visitor_phone || '—'}</span></div>
                      <div><span className="text-muted">Quartier :</span> <span className="text-cream">{selectedVisitor.visitor_quartier || '—'}</span></div>
                      <div><span className="text-muted">Genre :</span> <span className="text-cream">{selectedVisitor.visitor_gender || '—'}</span></div>
                      <div><span className="text-muted">Comment connu :</span> <span className="text-cream">{selectedVisitor.how_known ? HOW_KNOWN_LABELS[selectedVisitor.how_known] : '—'}</span></div>
                      <div><span className="text-muted">Invité par :</span> <span className="text-cream">{selectedVisitor.invited_by || '—'}</span></div>
                      <div><span className="text-muted">Type de suivi :</span> <span className="text-cream">{selectedVisitor.follow_up_type ? FOLLOW_UP_LABELS[selectedVisitor.follow_up_type] : '—'}</span></div>
                      <div><span className="text-muted">Culte :</span> <span className="text-cream">{selectedVisitor.cult_day ? CULT_DAY_LABELS[selectedVisitor.cult_day] : '—'} — {new Date(selectedVisitor.cult_date).toLocaleDateString('fr-FR')}</span></div>
                      <div><span className="text-muted">Enregistré le :</span> <span className="text-cream">{new Date(selectedVisitor.created_at).toLocaleDateString('fr-FR')}</span></div>
                    </div>

                    {/* Status update */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Statut de suivi</label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(VISITOR_STATUS) as NewVisitor['status'][]).map(s => (
                          <button
                            key={s}
                            onClick={() => updateVisitorStatus(selectedVisitor.id, s)}
                            disabled={visitorStatusSaving}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                              selectedVisitor.status === s
                                ? VISITOR_STATUS[s].cls + ' ring-1 ring-current'
                                : 'bg-white/5 text-muted hover:text-cream'
                            }`}
                          >
                            {VISITOR_STATUS[s].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Follow-up notes */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Notes de suivi</label>
                      <textarea
                        rows={3}
                        value={visitorNotes}
                        onChange={e => setVisitorNotes(e.target.value)}
                        placeholder="Ajouter des notes de suivi..."
                        className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                      />
                      <button onClick={() => saveVisitorNotes(selectedVisitor.id)} className="btn-gold mt-2 px-4 py-2 text-sm flex items-center gap-2">
                        <Save className="h-3.5 w-3.5" /> Sauvegarder les notes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SUB-TAB 5: Code Vestimentaire
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'dresscode' && (
        <div className="space-y-4">
          {dressCodes.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Shirt className="mx-auto h-10 w-10 text-muted/30 mb-4" />
              <p className="text-muted">Aucun code vestimentaire configuré. Exécutez le script SQL pour initialiser les données.</p>
            </div>
          ) : (
            dressCodes.map(dc => (
              <div key={dc.id} className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{dc.icon_hint || '👔'}</span>
                  <div>
                    <h4 className="font-display font-semibold text-cream flex items-center gap-2">
                      {CULT_DAY_LABELS[dc.cult_day]}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${CULT_DAY_COLORS[dc.cult_day]}`}>
                        {FORMALITY_LABELS[dc.formality_level] || dc.formality_level}
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
                    <textarea
                      rows={2}
                      value={dc.description}
                      onChange={e => setDressCodes(prev => prev.map(d => d.id === dc.id ? { ...d, description: e.target.value } : d))}
                      className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Éléments requis (séparés par virgule)</label>
                      <input
                        type="text"
                        value={(dc.required_items || []).join(', ')}
                        onChange={e => setDressCodes(prev => prev.map(d => d.id === dc.id ? { ...d, required_items: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : d))}
                        className="input-surface w-full px-4 py-2.5 text-sm"
                        placeholder="badge, uniforme, chaussures"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Niveau de formalité</label>
                      <select
                        value={dc.formality_level}
                        onChange={e => setDressCodes(prev => prev.map(d => d.id === dc.id ? { ...d, formality_level: e.target.value as any } : d))}
                        className="input-surface w-full px-4 py-2.5 text-sm"
                      >
                        <option value="decontracte">Décontracté</option>
                        <option value="correct">Correct</option>
                        <option value="formel">Formel</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Icône (emoji)</label>
                      <input
                        type="text"
                        value={dc.icon_hint || ''}
                        onChange={e => setDressCodes(prev => prev.map(d => d.id === dc.id ? { ...d, icon_hint: e.target.value } : d))}
                        className="input-surface w-full px-4 py-2.5 text-sm"
                        placeholder="👔"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => saveDressCode(dc)}
                      disabled={dressSaving === dc.id}
                      className="btn-gold flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {dressSaving === dc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Sauvegarder
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Review Modal (Reports)
          ═══════════════════════════════════════════════════════════ */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReviewModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-line">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${reviewModal.status === 'valide' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <Check className={`h-5 w-5 ${reviewModal.status === 'valide' ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-cream">
                  {reviewModal.status === 'valide' ? 'Valider' : 'Rejeter'} le rapport
                </h3>
                <p className="text-sm text-muted">Ajoutez une note optionnelle pour le rapporteur.</p>
              </div>
            </div>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Notes administratives (optionnel)..."
              className="input-surface w-full px-4 py-2.5 text-sm resize-none"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setReviewModal(null)} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
              <button
                onClick={handleReview}
                disabled={reviewSaving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-50 ${
                  reviewModal.status === 'valide'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
              >
                {reviewSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Assign Modal (Schedule)
          ═══════════════════════════════════════════════════════════ */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAssignModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-sm space-y-4 border border-line">
            <h3 className="font-display text-lg font-semibold text-cream">
              Assigner — {CULT_DAY_LABELS[assignModal.cult_day]}
            </h3>
            <p className="text-sm text-muted">Sélectionnez l'équipe pour ce jour de la semaine {weekInfo.label}.</p>
            <div className="space-y-2">
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => assignTeam(t.id, assignModal.cult_day)}
                  className="w-full flex items-center gap-3 rounded-xl p-3 bg-white/5 border border-line hover:border-accent-400/30 hover:bg-white/[0.04] transition text-left"
                >
                  <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-sm text-cream">{t.name}</span>
                  <span className="text-xs text-muted ml-auto">{(teamMembers[t.id] || []).length} membres</span>
                </button>
              ))}
            </div>
            <button onClick={() => setAssignModal(null)} className="btn-ghost w-full py-2 text-sm">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}