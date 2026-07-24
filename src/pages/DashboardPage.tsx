import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { db, supabase } from '../lib/supabase';
import { formatDate } from '../lib/date';
import {
  Calendar, Bell, Heart, MapPin, Users, Clock, CheckCircle,
  MessageSquare, BookOpen, Star, ChevronRight, ChevronDown, Plus, Send, User, Shield, Home, X, ClipboardList, Quote, Sparkles, Eye, EyeOff, AlertTriangle,
} from '../lib/icons';
import { ProtocolSection } from '../components/dashboard/ProtocolSection';
import { DepartmentSection } from '../components/dashboard/DepartmentSection';
import { MediaCenterSection } from '../components/dashboard/MediaCenterSection';
import { EvangelismDashboardSection } from '../components/dashboard/EvangelismDashboardSection';
import { useEventReminders } from '../lib/hooks/useEventReminders';
import type { ChurchEvent, PrayerRequest as PrayerReqType, NotificationItem } from '../types';
import type { Page } from '../lib/navigation';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { EvtReveal } from '../components/EvtReveal';

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
  meeting_schedule: string | null;
}

/* ═══════════════════════════════════════════════════════════════════
   DeptMemberCount — petit composant pour afficher le nombre de membres
   ═══════════════════════════════════════════════════════════════════ */

function DeptMemberCount({ departmentId }: { departmentId: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('department_members')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [departmentId]);
  if (count === null) return null;
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-muted">
      <Users className="h-3.5 w-3.5 text-emerald-400/70" />
      <span>{count} membre{count > 1 ? 's' : ''} actif{count > 1 ? 's' : ''}</span>
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

  // ── Department request state ──────────────────────────────────
  const [showDeptRequest, setShowDeptRequest] = useState(false);
  const [deptList, setDeptList] = useState<any[]>([]);
  const [requestedDept, setRequestedDept] = useState<string>('');
  const [deptRequestSubmitting, setDeptRequestSubmitting] = useState(false);

  // ── Role request state ────────────────────────────────────────
  const [showRoleRequest, setShowRoleRequest] = useState(false);
  const [roleRequestForm, setRoleRequestForm] = useState({ requested_role: '', reason: '' });
  const [roleRequestSubmitting, setRoleRequestSubmitting] = useState(false);

  // ── Notification dropdown state ───────────────────────────────
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // ── Espace Pastoral: Accordion & Form State ────────────────────
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const [visitForm, setVisitForm] = useState({ name: '', phone: '', address: '', motif: '', timeOfDay: 'Matin', dayRange: 'Lundi-Vendredi' });
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [pastoralPrayerForm, setPastoralPrayerForm] = useState({ name: '', email: '', content: '', hideName: false, visibility: 'public' as 'public' | 'pastoral' | 'confidentiel' });
  const [pastoralPrayerSubmitting, setPastoralPrayerSubmitting] = useState(false);
  const [evalAnswers, setEvalAnswers] = useState<Record<number, number>>({});
  const [evalSubmitted, setEvalSubmitted] = useState(false);
  const [evalScore, setEvalScore] = useState(0);
  const [evalWantInterview, setEvalWantInterview] = useState(false);

  // ── My Requests state ─────────────────────────────────────────
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);

  // ── Eval sub-accordion state ──────────────────────────────────
  const [openEvalCat, setOpenEvalCat] = useState<string | null>(null);

  // ── Prayer form state ────────────────────────────────────────
  const [showPrayerForm, setShowPrayerForm] = useState(false);
  const [newPrayerContent, setNewPrayerContent] = useState('');
  const [newPrayerConfidential, setNewPrayerConfidential] = useState(false);
  const [newPrayerAnonymous, setNewPrayerAnonymous] = useState(false);
  const [newPrayerUrgency, setNewPrayerUrgency] = useState<'basse' | 'normale' | 'haute' | 'urgente'>('normale');
  const [prayerSubmitting, setPrayerSubmitting] = useState(false);
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);

  // ── Testimony state ───────────────────────────────────────────
  const [showTestimonyForm, setShowTestimonyForm] = useState(false);
  const [testimonyContent, setTestimonyContent] = useState('');
  const [testimonyCategory, setTestimonyCategory] = useState('general');
  const [testimonyAnonymous, setTestimonyAnonymous] = useState(false);
  const [testimonySubmitting, setTestimonySubmitting] = useState(false);
  const [testimonySubmitted, setTestimonySubmitted] = useState(false);
  const [userTestimonies, setUserTestimonies] = useState<any[]>([]);

  // ── Daily verse / Hero state ────────────────────────────────
  const [dailyVerse, setDailyVerse] = useState<any>(null);
  const [heroExhortation, setHeroExhortation] = useState<string>('Que la paix du Seigneur soit avec vous aujourd\'hui !');

  // ── Event Reminders (3x/day) ────────────────────────────────
  const { upcomingReminders } = useEventReminders();

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Membre';

  // ── Role-based section visibility ─────────────────────────────
  const PASTOR_HIDDEN_SECTIONS = new Set([
    'protocol_report',
    'rotation_planning',
    'dress_code',
    'pipeline',
  ]);

  const LEVEL4_HIDDEN_SECTIONS = new Set([
    'protocol_report',
    'rotation_planning',
    'dress_code',
    'pipeline',
  ]);

  const shouldHideDeptSection = (dept: UserDepartment): boolean => {
    const isPrincipalPastor = profile?.is_principal_pastor === true;
    const isLevel4Plus = (profile?.role_level ?? 0) >= 4 && !profile?.is_admin;

    if (!isPrincipalPastor && !isLevel4Plus) return false;

    const hiddenSet = isPrincipalPastor ? PASTOR_HIDDEN_SECTIONS : LEVEL4_HIDDEN_SECTIONS;
    const deptName = (dept.department_name || '').toLowerCase();

    const isProtocole = deptName.includes('protocole');
    if (isProtocole) return hiddenSet.has('protocol_report');

    if (deptName.includes('rotation') || deptName.includes('planning')) return hiddenSet.has('rotation_planning');
    if (deptName.includes('vestimentaire') || deptName.includes('dress') || deptName.includes('tenue')) return hiddenSet.has('dress_code');
    if (deptName.includes('pipeline') || deptName.includes('âme') || deptName.includes('cellule') || deptName.includes('zone')) return hiddenSet.has('pipeline');

    return false;
  };

  // ── Fetch all dashboard data ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
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

        // 2b. Daily verse
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: verseData } = await supabase
          .from('daily_verses')
          .select('*')
          .eq('verse_date', todayStr)
          .eq('is_active', true)
          .limit(1)
          .single();

        // 2c. Default exhortation from site_settings
        const defaultExhortation = await db.getSetting('hero_default_exhortation').catch(() => null);

        if (cancelled) return;

        if (verseData) {
          setDailyVerse(verseData);
        }
        if (defaultExhortation) {
          setHeroExhortation(defaultExhortation);
        }

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

        // 4. User's departments (sans jointure PostgREST — fetch séparé)
        // Cherche d'abord les membres actifs, puis aussi les inactifs pour réparation
        const { data: deptMembers, error: dmError } = await supabase
          .from('department_members')
          .select('department_id, position_id, is_active')
          .eq('user_id', userId);
        if (dmError) console.error('[DASHBOARD] dept_members query error:', dmError);

        // Récupérer les infos départements et positions séparément
        let deptMap: Record<string, any> = {};
        let posMap: Record<string, any> = {};
        if (deptMembers && deptMembers.length > 0) {
          const deptIds = [...new Set(deptMembers.map((d: any) => d.department_id))];
          const posIds = [...new Set((deptMembers as any[]).map((d: any) => d.position_id).filter(Boolean))];
          const [deptsRes, posRes] = await Promise.all([
            supabase.from('departments').select('id, name, accent_color, icon_name, meeting_schedule').in('id', deptIds),
            posIds.length > 0 ? supabase.from('positions').select('id, name').in('id', posIds) : Promise.resolve({ data: [] }),
          ]);
          deptMap = Object.fromEntries((deptsRes.data || []).map((d: any) => [d.id, d]));
          posMap = Object.fromEntries((posRes.data || []).map((p: any) => [p.id, p]));
        }

        // 5. Notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(8);

        if (cancelled) return;

        // 6. User's own requests (visit, prayer, department)
        loadMyRequests();

        // Filtrer uniquement les membres actifs pour l'affichage
        const activeDeptMembers = (deptMembers || []).filter((dm: any) => dm.is_active !== false);

        const userDepts: UserDepartment[] = activeDeptMembers.map((dm: any) => ({
          id: dm.department_id,
          department_name: deptMap[dm.department_id]?.name || 'Département',
          position_name: posMap[dm.position_id]?.name || null,
          accent_color: deptMap[dm.department_id]?.accent_color || 'gold',
          icon_name: deptMap[dm.department_id]?.icon_name || 'Star',
          meeting_schedule: deptMap[dm.department_id]?.meeting_schedule || null,
        }));

        setEvents((eventData || []) as ChurchEvent[]);
        setPrayers((prayerData || []) as PrayerReqType[]);
        setDepartments(userDepts);

        // ── Auto-réparation : demandes acceptées sans department_members actif ──
        if (userDepts.length === 0) {
          try {
            const { data: acceptedReqs, error: reqErr } = await supabase
              .from('department_requests')
              .select('id, department_id, status')
              .eq('user_id', userId)
              .in('status', ['accepte', 'accepted', 'approuve', 'approved']);

            if (acceptedReqs && acceptedReqs.length > 0) {
              for (const req of acceptedReqs) {
                // Stratégie 1: upsert
                const r1 = await supabase.from('department_members').upsert({
                  user_id: userId,
                  department_id: req.department_id,
                  role_in_dept: 'member',
                  is_active: true,
                }, { onConflict: 'user_id,department_id' });

                if (r1.error) {
                  // Stratégie 2: insert simple
                  const r2 = await supabase.from('department_members').insert({
                    user_id: userId,
                    department_id: req.department_id,
                    role_in_dept: 'member',
                    is_active: true,
                  });
                  if (r2.error) {
                    // Stratégie 3: forcer is_active = true
                    const r3 = await supabase.from('department_members')
                      .update({ is_active: true })
                      .eq('user_id', userId)
                      .eq('department_id', req.department_id);
                  }
                }
              }

              // Re-fetch departments après réparation
              const { data: repairedDepts, error: repErr } = await supabase
                .from('department_members')
                .select('department_id, position_id, is_active')
                .eq('user_id', userId);
              const activeRepaired = (repairedDepts || []).filter((dm: any) => dm.is_active !== false);
              if (activeRepaired.length > 0) {
                const rDeptIds = [...new Set(activeRepaired.map((d: any) => d.department_id))];
                const rPosIds = [...new Set(activeRepaired.map((d: any) => d.position_id).filter(Boolean))];
                const [rDeptsRes, rPosRes] = await Promise.all([
                  supabase.from('departments').select('id, name, accent_color, icon_name').in('id', rDeptIds),
                  rPosIds.length > 0 ? supabase.from('positions').select('id, name').in('id', rPosIds) : Promise.resolve({ data: [] }),
                ]);
                const rDeptMap = Object.fromEntries((rDeptsRes.data || []).map((d: any) => [d.id, d]));
                const rPosMap = Object.fromEntries((rPosRes.data || []).map((p: any) => [p.id, p]));
                const repairedUserDepts: UserDepartment[] = activeRepaired.map((dm: any) => ({
                  id: dm.department_id,
                  department_name: rDeptMap[dm.department_id]?.name || 'Département',
                  position_name: rPosMap[dm.position_id]?.name || null,
                  accent_color: rDeptMap[dm.department_id]?.accent_color || 'gold',
                  icon_name: rDeptMap[dm.department_id]?.icon_name || 'Star',
                }));
                setDepartments(repairedUserDepts);
              } else {
                console.error('[DASHBOARD] RÉPARATION ÉCHOUÉE — aucun membre actif trouvé après toutes les tentatives');

                // ── FILET DE SÉCURITÉ : utiliser directement les demandes acceptées ──
                const fbDeptIds = [...new Set(acceptedReqs.map((r: any) => r.department_id))];
                const { data: fbDepts } = await supabase
                  .from('departments')
                  .select('id, name, accent_color, icon_name')
                  .in('id', fbDeptIds);
                if (fbDepts && fbDepts.length > 0) {
                  const fallbackDepts: UserDepartment[] = fbDepts.map((d: any) => ({
                    id: d.id,
                    department_name: d.name,
                    position_name: null,
                    accent_color: d.accent_color || 'gold',
                    icon_name: d.icon_name || 'Star',
                  }));
                  setDepartments(fallbackDepts);
                } else {
                  console.error('[DASHBOARD] Filet de sécurité échoué aussi — départements introuvables pour IDs:', fbDeptIds);
                }
              }
            } else {
            }
          } catch (repairErr) {
            console.error('[DASHBOARD] Exception pendant auto-réparation:', repairErr);
          }
        }

        setNotifications((notifData || []).map((n: any) => ({
          ...n,
          message: n.body || n.message || '',
        })) as NotificationItem[]);
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
            label: userDepts.length > 0
              ? `Membres de ${userDepts[0].department_name}`
              : 'Membres inscrits',
            value: userDepts.length > 0
              ? (await supabase
                  .from('department_members')
                  .select('id', { count: 'exact', head: true })
                  .eq('department_id', userDepts[0].id)
                  .eq('is_active', true)).count ?? 0
              : memberRes.count ?? 0,
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

  // ── Close notification dropdown on outside click ──────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Load user's own requests ─────────────────────────────────
  const loadMyRequests = async () => {
    if (!user) return;
    setMyRequestsLoading(true);
    try {
      const [visitRes, prayerRes, deptRes] = await Promise.all([
        supabase.from('visit_requests').select('id, reason, status, created_at, response, responded_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('prayer_requests').select('id, content, status, created_at, visibility, is_confidential').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('department_requests').select('id, department_id, status, created_at, departments(name)').eq('user_id', user.id).neq('status', 'accepte').order('created_at', { ascending: false }).limit(5),
      ]);

      const ACCEPTED_STATUSES = ['accepte', 'accepted', 'termine', 'repondu', 'answered', 'traite', 'ferme'];
      const items: any[] = [];
      (visitRes.data || []).forEach((r: any) => {
        if (!ACCEPTED_STATUSES.includes(r.status)) {
          items.push({ type: 'visit', id: r.id, label: `Visite: ${r.reason || 'Demande pastorale'}`, status: r.status, date: r.created_at, response: r.response, responded_at: r.responded_at });
        }
      });
      (prayerRes.data || []).forEach((r: any) => {
        if (!ACCEPTED_STATUSES.includes(r.status)) {
          items.push({ type: 'prayer', id: r.id, label: r.content?.slice(0, 60) + '...', status: r.status, date: r.created_at, visibility: r.visibility });
        }
      });
      (deptRes.data || []).forEach((r: any) => {
        if (!ACCEPTED_STATUSES.includes(r.status)) {
          items.push({ type: 'department', id: r.id, label: `Departement: ${r.departments?.name || 'N/A'}`, status: r.status, date: r.created_at });
        }
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyRequests(items.slice(0, 8));
    } catch (err) {
      console.error('Load my requests error:', err);
    } finally {
      setMyRequestsLoading(false);
    }
  };

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
      // Update local state to show praying status
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? { ...p, status: 'praying' as const, prayed_by: user?.id || null, prayed_at: new Date().toISOString() }
            : p,
        ),
      );
    } catch {
      addToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  // ── Submit new prayer request ──────────────────────────────────
  const handleSubmitPrayer = async () => {
    if (!newPrayerContent.trim()) {
      addToast('Veuillez écrire votre requête de prière.', 'error');
      return;
    }
    setPrayerSubmitting(true);
    try {
      const { error } = await supabase.from('prayer_requests').insert({
        user_id: newPrayerAnonymous ? null : user?.id,
        author_name: profile?.full_name || 'Anonyme',
        content: newPrayerContent.trim(),
        is_anonymous: newPrayerAnonymous,
        is_confidential: newPrayerConfidential,
        status: 'received',
        urgency: newPrayerUrgency,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      addToast('Votre requête de prière a été soumise. 🙏', 'success');
      setNewPrayerContent('');
      setNewPrayerConfidential(false);
      setNewPrayerAnonymous(false);
      setNewPrayerUrgency('normale');
      setShowPrayerForm(false);
      // Refresh prayer list
      const { data: refreshed } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('is_confidential', false)
        .neq('status', 'answered')
        .order('created_at', { ascending: false })
        .limit(10);
      if (refreshed) setPrayers(refreshed as PrayerReqType[]);
    } catch {
      addToast('Erreur lors de la soumission de la requête.', 'error');
    } finally {
      setPrayerSubmitting(false);
    }
  };

  // ── Submit testimony ──────────────────────────────────────
  const handleSubmitTestimony = async () => {
    if (!user || !testimonyContent.trim()) {
      addToast('Veuillez écrire votre témoignage.', 'error');
      return;
    }
    setTestimonySubmitting(true);
    try {
      const { error } = await supabase.from('member_testimonies').insert({
        user_id: user.id,
        content: testimonyContent.trim(),
        category: testimonyCategory,
        is_anonymous: testimonyAnonymous,
        status: 'pending',
      });
      if (error) throw error;
      addToast('Témoignage soumis ! Il sera publié après examen.', 'success');
      setTestimonyContent('');
      setTestimonyCategory('general');
      setTestimonyAnonymous(false);
      setTestimonySubmitted(true);
      fetchUserTestimonies();
      setShowTestimonyForm(false);
    } catch {
      addToast('Erreur lors de la soumission du témoignage.', 'error');
    } finally {
      setTestimonySubmitting(false);
    }
  };

  const fetchUserTestimonies = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('member_testimonies')
        .select('id, content, category, is_anonymous, status, published_at, created_at, reviewed_by, reviewer_profiles:user_profiles!reviewed_by(full_name, role_level)')
        .eq('user_id', user.id)
        .in('status', ['published', 'approved'])
        .order('published_at', { ascending: false })
        .limit(10);
      setUserTestimonies(data || []);
    } catch {
      console.error('Error fetching user testimonies');
    }
  }, [user]);

  useEffect(() => { fetchUserTestimonies(); }, [fetchUserTestimonies]);

  const TESTIMONY_CATEGORIES = [
    { val: 'general', label: 'Général' },
    { val: 'guerison', label: 'Guérison' },
    { val: 'finance', label: 'Finance' },
    { val: 'miracle', label: 'Miracle' },
    { val: 'salut', label: 'Salut' },
    { val: 'famille', label: 'Famille' },
    { val: 'delivrance', label: 'Délivrance' },
    { val: 'autre', label: 'Autre' },
  ];

  // ── Fetch available departments ────────────────────────────────
  const handleShowDeptRequest = async () => {
    if (showDeptRequest) {
      setShowDeptRequest(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description, accent_color, icon_name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      setDeptList(data || []);
      setShowDeptRequest(true);
    } catch {
      addToast('Impossible de charger les départements.', 'error');
    }
  };

  // ── Submit department join request ─────────────────────────────
  const handleRequestDept = async (deptId: string, deptName: string) => {
    setDeptRequestSubmitting(true);
    try {
      const { error } = await supabase.from('department_requests').insert({
        user_id: user?.id,
        department_id: deptId,
        status: 'en_attente',
        message: 'Je souhaite rejoindre ce département',
      });
      if (error) {
        // Table might not exist — fall back to notification for admins
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          await supabase.from('notifications').insert({
            user_id: user?.id!,
            title: `Demande de département — ${deptName}`,
            body: `Utilisateur ${profile?.full_name || user?.email} demande à rejoindre le département ${deptName}`,
            type: 'info',
            is_read: false,
          });
        } else {
          throw error;
        }
      }

      // Notifier les chefs du département + admins
      try {
        const { data: leaders } = await supabase
          .from('department_members')
          .select('user_id')
          .eq('department_id', deptId)
          .eq('role_in_dept', 'leader')
          .eq('is_active', true);

        const { data: admins } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('is_admin', true)
          .limit(10);

        const notifyIds = [
          ...(leaders || []).map(l => l.user_id),
          ...(admins || []).map(a => a.id),
        ].filter(id => id !== user?.id);

        if (notifyIds.length > 0) {
          const requesterName = profile?.full_name || user?.email;
          await supabase.from('notifications').insert(
            notifyIds.map(uid => ({
              user_id: uid,
              type: 'dept_request_pending',
              title: `Nouvelle demande : ${deptName}`,
              body: `${requesterName} souhaite rejoindre le département "${deptName}".`,
              link: '#admin/departments',
              is_read: false,
            }))
          );
        }
      } catch { /* silent — notification is best-effort */ }

      setRequestedDept((prev) => (prev ? `${prev},${deptId}` : deptId));
      addToast('Votre demande a été envoyée au responsable du département.', 'success');
    } catch {
      addToast('Erreur lors de l\'envoi de la demande.', 'error');
    } finally {
      setDeptRequestSubmitting(false);
    }
  };

  // ── Role request submission ─────────────────────────────────────
  const handleRoleRequestSubmit = async () => {
    if (!user || !roleRequestForm.requested_role) return;
    setRoleRequestSubmitting(true);
    try {
      const { error } = await supabase.from('role_requests').insert({
        user_id: user.id,
        requested_role: roleRequestForm.requested_role,
        reason: roleRequestForm.reason || null,
      });
      if (error) throw error;
      addToast('Votre demande de rôle a été envoyée à l\'administrateur.', 'success');
      setShowRoleRequest(false);
      setRoleRequestForm({ requested_role: '', reason: '' });
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de l\'envoi de la demande.', 'error');
    } finally {
      setRoleRequestSubmitting(false);
    }
  };

  // ── Pre-fill pastoral forms from profile ──────────────────────
  useEffect(() => {
    if (profile) {
      setVisitForm((f: any) => ({ ...f, name: profile.full_name || '', phone: profile.phone || '' }));
      setPastoralPrayerForm((f: any) => ({ ...f, name: profile.full_name || '', email: profile.email || user?.email || '' }));
    }
  }, [profile, user]);

  // ── Visit form submission ─────────────────────────────────────
  const handleVisitSubmit = async () => {
    if (!visitForm.name || !visitForm.address || !visitForm.motif) {
      addToast('Veuillez remplir tous les champs obligatoires.', 'error'); return;
    }
    setVisitSubmitting(true);
    try {
      const { error } = await supabase.from('visit_requests').insert({
        requester_id: user?.id, requester_name: visitForm.name, requester_phone: visitForm.phone || null,
        beneficiary_name: visitForm.name, beneficiary_phone: visitForm.phone || null, beneficiary_address: visitForm.address,
        visit_type: 'pastorale' as const, reason: visitForm.motif,
        preferred_time: `${visitForm.timeOfDay} — ${visitForm.dayRange}`, urgency: 'normale' as const, status: 'en_attente' as const,
      });
      if (error) throw error;
      addToast('Votre demande de visite a été soumise avec succès !', 'success');
      setVisitForm({ name: profile?.full_name || '', phone: profile?.phone || '', address: '', motif: '', timeOfDay: 'Matin', dayRange: 'Lundi-Vendredi' });
      setOpenAccordion(null);
    } catch (err: any) {
      addToast(err?.message || 'Erreur lors de la soumission.', 'error');
    } finally { setVisitSubmitting(false); }
  };

  // ── Pastoral prayer form submission ───────────────────────────
  const handlePastoralPrayerSubmit = async () => {
    if (!pastoralPrayerForm.content.trim()) { addToast('Veuillez décrire votre intention de prière.', 'error'); return; }
    setPastoralPrayerSubmitting(true);
    try {
      const isAnon = pastoralPrayerForm.hideName;
      const { error } = await supabase.from('prayer_requests').insert({
        user_id: isAnon ? null : user?.id,
        author_name: isAnon ? 'Anonyme' : (pastoralPrayerForm.name || user?.email || 'Membre'),
        content: pastoralPrayerForm.content, is_anonymous: isAnon,
        is_confidential: pastoralPrayerForm.visibility === 'confidentiel', status: 'received', visibility: pastoralPrayerForm.visibility,
      });
      if (error) throw error;
      addToast('Votre requête de prière a été envoyée ! 🙏', 'success');
      setPastoralPrayerForm({ name: profile?.full_name || '', email: profile?.email || user?.email || '', content: '', hideName: false, visibility: 'public' });
      setOpenAccordion(null);
    } catch (err: any) {
      addToast(err?.message || 'Erreur lors de la soumission.', 'error');
    } finally { setPastoralPrayerSubmitting(false); }
  };

  // ── Self-evaluation data & scoring ────────────────────────────
  const EVAL_QUESTIONS = [
    { id: 1, cat: 'Intimité avec Dieu', q: 'Lecture de la Parole — À quelle fréquence lisez-vous la Bible ?', opts: ['Chaque jour', 'Plusieurs fois/semaine', 'Rarement', 'Jamais'] },
    { id: 2, cat: 'Intimité avec Dieu', q: 'Méditation — Prenez-vous le temps de méditer ?', opts: ['Toujours', 'Souvent', 'Parfois', 'Rarement'] },
    { id: 3, cat: 'Intimité avec Dieu', q: 'Vie de prière — Comment évalueriez-vous votre temps de prière ?', opts: ['Excellente', 'Stable', 'À améliorer', 'Très difficile'] },
    { id: 4, cat: 'Intimité avec Dieu', q: 'Écoute spirituelle — Discernez-vous la voix de Dieu ?', opts: ['Clairement', 'Parfois', "J'ai du mal"] },
    { id: 5, cat: 'Vie Communautaire', q: 'Assiduité aux cultes — À quelle fréquence ?', opts: ['Chaque dimanche', '2-3 fois/mois', 'Occasionnellement'] },
    { id: 6, cat: 'Vie Communautaire', q: "Groupes restreints — Faites-vous partie d'une cellule/groupe ?", opts: ['Oui activement', 'Oui mais je rate souvent', 'Non mais je voudrais', 'Non pas intéressé'] },
    { id: 7, cat: 'Vie Communautaire', q: "Relations fraternelles — Encouragez-vous d'autres frères ?", opts: ['Régulièrement', 'De temps en temps', 'Rarement'] },
    { id: 8, cat: 'Service et Mission', q: "Service à l'église — Impliqué dans un département ?", opts: ['Oui activement', 'Non mais je cherche', 'Non manque de temps'] },
    { id: 9, cat: 'Service et Mission', q: 'Générosité — Soutenez-vous par dîmes/offrandes ?', opts: ['Oui avec joie', 'Parfois selon moyens', "J'ai du mal"] },
    { id: 10, cat: 'Service et Mission', q: 'Évangélisation — Parlez-vous de Jésus autour de vous ?', opts: ['Dès que possible', 'Parfois', 'Rarement'] },
    { id: 11, cat: 'Transformation du Caractère', q: 'Gestion des émotions — Face aux conflits ?', opts: ['Pardonne et paix', 'Essaie de calmer', 'Rancœur'] },
    { id: 12, cat: 'Transformation du Caractère', q: 'Victoire sur le péché — Progression ?', opts: ['Réelle délivrance', 'Combat intense', 'Stagnation/recul'] },
  ];
  const getScoreForOption = (qId: number, optIdx: number): number => { if (qId === 11 && optIdx === 2) return 0; return Math.max(0, 3 - optIdx); };

  const handleEvalSubmit = async () => {
    if (Object.keys(evalAnswers).length < EVAL_QUESTIONS.length) {
      addToast(`Veuillez répondre à toutes les questions (${Object.keys(evalAnswers).length}/${EVAL_QUESTIONS.length}).`, 'error'); return;
    }
    let score = 0;
    EVAL_QUESTIONS.forEach((q) => { score += getScoreForOption(q.id, evalAnswers[q.id]); });
    setEvalScore(score); setEvalSubmitted(true);
    try { await supabase.from('spiritual_evaluations').insert({ user_id: user?.id, user_name: profile?.full_name || null, period: new Date().toISOString().slice(0, 7), overall_score: score, want_interview: evalWantInterview, answers: evalAnswers }); } catch { /* table may not exist */ }
  };
  const resetEval = () => { setEvalAnswers({}); setEvalSubmitted(false); setEvalScore(0); setEvalWantInterview(false); };

  // ── Guard: not logged in ───────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
        <SiteHeader onNavigate={onNavigate} activePage="dashboard" />
        <div className="flex min-h-[80vh] items-center justify-center px-margin-mobile md:px-margin-desktop">
          <div className="glass-card max-w-md p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-400/10">
              <Shield className="h-10 w-10 text-accent-400" />
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
        <div className="footer-spacer" />
      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
        <MobileNav onNavigate={onNavigate} active="dashboard" />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="dashboard" />

      <main className="pt-16">
        {/* ── Subtle radial background ─────────────────────────────── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-primary opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-100/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-8xl px-margin-mobile md:px-margin-desktop py-xl">
            {/* ═══════════════════════════════════════════════════════
               1. WELCOME HEADER
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-400/15 ring-2 ring-accent-500/30">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={userName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-accent-400" />
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

                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifDropdown(p => !p)}
                    className="relative flex items-center gap-2.5 rounded-xl glass px-4 py-3 text-sm font-medium text-cream transition-all duration-200 hover:border-accent-400/30 hover:bg-white/5"
                  >
                    <Bell className="h-5 w-5 text-accent-400" />
                    <span className="hidden sm:inline">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-evangile-600 px-1.5 text-[11px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* ── Notification Dropdown ── */}
                  {showNotifDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card rounded-2xl border border-line shadow-2xl shadow-black/40 z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-line/50">
                        <span className="text-sm font-semibold text-cream">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).is('is_read', false);
                              setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                              setUnreadCount(0);
                            }}
                            className="text-[11px] text-accent-400 hover:text-accent-300 transition"
                          >
                            Tout marquer lu
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {!dataLoading && notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-6 h-6 mx-auto mb-2 text-muted/40" />
                            <p className="text-xs text-muted">Aucune notification</p>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((notif, idx) => {
                            const notifIcon = notif.type === 'prayer' ? Heart
                              : notif.type === 'visit' ? MapPin
                              : (notif.type as string) === 'dept_approved' || (notif.type as string) === 'dept_rejected' ? CheckCircle
                              : notif.type === 'alert' ? AlertTriangle
                              : MessageSquare;
                            const NIcon = notifIcon;
                            return (
                              <div
                                key={notif.id || idx}
                                className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-line/20 last:border-0 ${!notif.is_read ? 'bg-evangile-600/[0.03]' : ''}`}
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 mt-0.5">
                                  <NIcon className="h-3.5 w-3.5 text-muted" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-cream truncate">{notif.title}</p>
                                  {notif.message && (
                                    <p className="text-[11px] text-muted truncate mt-0.5">{notif.message}</p>
                                  )}
                                  <p className="text-[10px] text-muted/60 mt-1">
                                    {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </p>
                                </div>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-evangile-600 shrink-0 mt-2" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               1b. HERO — DAILY BIBLE VERSE
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal>
              <div className="mb-10 relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-600/10 via-bg to-amber-400/5 border border-accent-400/10">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                <div className="relative flex flex-col items-center justify-center px-6 py-6 sm:py-8 text-center max-h-[150px]">
                  {dailyVerse ? (
                    <>
                      {dailyVerse.reference && (
                        <p className="gold-text text-xs sm:text-sm font-semibold font-display tracking-wide uppercase mb-1.5">
                          {dailyVerse.reference}
                        </p>
                      )}
                      {dailyVerse.content && (
                        <p className="text-sm sm:text-base text-cream/90 leading-relaxed italic max-w-2xl line-clamp-2">
                          « {dailyVerse.content} »
                        </p>
                      )}
                      {dailyVerse.exhortation && (
                        <p className="text-xs text-muted mt-1.5 max-w-xl line-clamp-1">
                          {dailyVerse.exhortation}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm sm:text-base text-cream/80 leading-relaxed italic max-w-2xl line-clamp-2">
                        « {heroExhortation} »
                      </p>
                      <p className="text-xs text-accent-400/70 mt-2 font-display">
                        — Église Évangélique La Conquête
                      </p>
                    </>
                  )}
                </div>
              </div>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               1c. DÉPARTEMENT-SPECIFIC SECTIONS (reordered: Mon dept > Media > autres)
               ═══════════════════════════════════════════════════════ */}
            {!dataLoading && (() => {
              const renderedSpecial = new Set<string>();
              const deptSections: { dept: typeof departments[0]; isProtocole: boolean; isMediaPlanif: boolean; isEvangelism: boolean; isGeneric: boolean; specialKey: string | null }[] = [];

              for (const dept of departments) {
                if (shouldHideDeptSection(dept)) continue;
                const deptName = (dept.department_name || '').toLowerCase();
                const isProtocole = deptName.includes('protocole');
                const isMediaPlanif = deptName.includes('média') ||
                  deptName.includes('media') ||
                  deptName.includes('presse') ||
                  deptName.includes('communication') ||
                  deptName.includes('planification');
                const isEvangelism = deptName.includes('evangelis') ||
                  deptName.includes('évangélis');
                const specialKey = isProtocole ? 'protocole' : isMediaPlanif ? 'media_planif' : isEvangelism ? 'evangelism' : null;
                if (specialKey && renderedSpecial.has(specialKey)) continue;
                if (specialKey) renderedSpecial.add(specialKey);
                deptSections.push({ dept, isProtocole, isMediaPlanif, isEvangelism, isGeneric: !isProtocole && !isMediaPlanif && !isEvangelism, specialKey });
              }

              // Trier : Mon département (générique) en premier, puis Media/Communication, puis le reste
              const sorted = [...deptSections].sort((a, b) => {
                const aPrio = a.isGeneric ? 0 : a.isMediaPlanif ? 1 : 2;
                const bPrio = b.isGeneric ? 0 : b.isMediaPlanif ? 1 : 2;
                return aPrio - bPrio;
              });

              return sorted.map(({ dept, isProtocole, isMediaPlanif, isEvangelism, isGeneric }, idx) => (
                <EvtReveal key={dept.id} delay={idx + 1}>
                  <section className="mb-10">
                    {isProtocole ? (
                      <ProtocolSection accentColor={dept.accent_color} />
                    ) : isMediaPlanif ? (
                      <MediaCenterSection accentColor={dept.accent_color} />
                    ) : isEvangelism ? (
                      <EvangelismDashboardSection accentColor={dept.accent_color} />
                    ) : (
                      <DepartmentSection
                        departmentId={dept.id}
                        departmentName={dept.department_name}
                        accentColor={dept.accent_color}
                      />
                    )}
                  </section>
                </EvtReveal>
              ));
            })()}

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
                          className="glass-card group flex flex-col gap-3 p-5 sm:p-6 transition-all duration-300 hover:border-accent-400/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-500/5 cursor-default"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-muted font-sans leading-snug">
                              {stat.label}
                            </span>
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/5 transition-colors duration-300 group-hover:bg-accent-400/10">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/10">
                      <Calendar className="h-5 w-5 text-accent-400" />
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
                          className="glass-card group flex gap-4 p-4 sm:p-5 transition-all duration-300 hover:border-accent-400/20 hover:-translate-y-0.5 cursor-pointer"
                          onClick={() => onNavigate('events')}
                        >
                          {/* Date badge */}
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent-400/10 ring-1 ring-accent-500/20 transition-colors duration-300 group-hover:bg-accent-400/15">
                            <span className="text-lg font-bold text-accent-400 font-display leading-none">
                              {day}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-400/80 mt-0.5">
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
                  <button
                    onClick={() => setShowPrayerForm((p) => !p)}
                    className="btn-ghost text-sm flex items-center gap-1.5"
                  >
                    <Plus className={`h-4 w-4 transition-transform duration-200 ${showPrayerForm ? 'rotate-45' : ''}`} />
                    Soumettre une requête
                  </button>
                </div>

                {/* Inline prayer form */}
                {showPrayerForm && (
                  <div className="glass-card p-5 mb-4 space-y-4 border-rose-500/15">
                    <textarea
                      rows={3}
                      placeholder="Partagez votre besoin de prière..."
                      value={newPrayerContent}
                      onChange={(e) => setNewPrayerContent(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/30 resize-none"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newPrayerConfidential}
                          onChange={(e) => setNewPrayerConfidential(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30"
                        />
                        Rendre ma demande confidentielle (seul le pasteur verra)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newPrayerAnonymous}
                          onChange={(e) => setNewPrayerAnonymous(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30"
                        />
                        Masquer mon nom (demande anonyme)
                      </label>
                    </div>
                    {/* Urgency selector */}
                    <div>
                      <label className="text-xs text-muted font-medium mb-2 block">Niveau d'urgence</label>
                      <div className="flex flex-wrap gap-2">
                        {([
                          ['basse', 'Basse', 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'],
                          ['normale', 'Normale', 'bg-sky-500/10 border-sky-500/20 text-sky-400', 'bg-sky-500/15 border-sky-500/40 text-sky-400'],
                          ['haute', 'Haute', 'bg-orange-500/10 border-orange-500/20 text-orange-400', 'bg-orange-500/15 border-orange-500/40 text-orange-400'],
                          ['urgente', 'Urgente', 'bg-red-500/10 border-red-500/20 text-red-400', 'bg-red-500/15 border-red-500/40 text-red-400'],
                        ] as const).map(([val, label, baseClasses, activeClasses]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setNewPrayerUrgency(val)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                              newPrayerUrgency === val ? activeClasses : `${baseClasses} opacity-60 hover:opacity-100`
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => setShowPrayerForm(false)}
                        className="btn-ghost text-sm px-4 py-2"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSubmitPrayer}
                        disabled={prayerSubmitting || !newPrayerContent.trim()}
                        className="btn-gold px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                        {prayerSubmitting ? 'Envoi en cours...' : 'Soumettre'}
                      </button>
                    </div>
                  </div>
                )}

                {prayers.length === 0 && !showPrayerForm ? (
                  <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
                    <Heart className="mb-3 h-10 w-10 text-muted/40" />
                    <p className="text-muted text-sm">
                      Aucune requête de prière active
                    </p>
                  </div>
                ) : prayers.length > 0 ? (
                  <div className="space-y-3">
                    {prayers.slice(0, 5).map((prayer) => {
                      const isExpanded = expandedPrayer === prayer.id;
                      return (
                        <div key={prayer.id}>
                          <div
                            onClick={() => setExpandedPrayer(isExpanded ? null : prayer.id)}
                            className={`glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between transition-all duration-300 cursor-pointer hover:border-evangile-600/15 ${isExpanded ? 'border-rose-500/20' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-medium text-muted">
                                  {prayer.is_anonymous ? 'Anonyme' : (prayer.author_name || 'Anonyme')}
                                </span>
                                <span className="text-muted/30">·</span>
                                <span className="text-xs text-muted/70">
                                  {formatDate(prayer.created_at).full}
                                </span>
                                {prayer.status === 'praying' && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                    <Heart className="h-3 w-3" />
                                    En prière
                                  </span>
                                )}
                                {(prayer as any).urgency && (prayer as any).urgency !== 'normale' && (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    (prayer as any).urgency === 'urgente' ? 'bg-red-500/15 text-red-400' :
                                    (prayer as any).urgency === 'haute' ? 'bg-orange-500/15 text-orange-400' :
                                    (prayer as any).urgency === 'basse' ? 'bg-emerald-500/15 text-emerald-400' :
                                    'bg-sky-500/15 text-sky-400'
                                  }`}>
                                    {(prayer as any).urgency === 'urgente' ? '🔴 Urgente' :
                                     (prayer as any).urgency === 'haute' ? '🟠 Haute' :
                                     (prayer as any).urgency === 'basse' ? '🟢 Basse' :
                                     (prayer as any).urgency}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm text-cream/90 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {prayer.content}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePray(prayer.id); }}
                              disabled={prayer.status === 'praying'}
                              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                                prayer.status === 'praying'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 cursor-default'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/30'
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${prayer.status === 'praying' ? 'fill-current' : ''}`} />
                              {prayer.status === 'praying' ? 'En prière' : 'Prier'}
                            </button>
                          </div>
                          {/* Inline expanded details */}
                          {isExpanded && (
                            <div className="glass-card mt-0 rounded-t-none border-t-0 p-4 space-y-3">
                              {prayer.status === 'praying' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                                  <Heart className="h-3.5 w-3.5" />
                                  Cette requête est en cours de prière
                                </span>
                              )}
                              {(prayer as any).urgency && (prayer as any).urgency !== 'normale' && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted">Urgence :</span>
                                  <span className={`font-medium ${
                                    (prayer as any).urgency === 'urgente' ? 'text-red-400' :
                                    (prayer as any).urgency === 'haute' ? 'text-orange-400' :
                                    (prayer as any).urgency === 'basse' ? 'text-emerald-400' :
                                    'text-sky-400'
                                  }`}>
                                    {(prayer as any).urgency === 'urgente' ? '🔴 Urgente' :
                                     (prayer as any).urgency === 'haute' ? '🟠 Haute' :
                                     (prayer as any).urgency === 'basse' ? '🟢 Basse' :
                                     (prayer as any).urgency}
                                  </span>
                                </div>
                              )}
                              {(prayer as any).expires_at && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Clock className="h-3.5 w-3.5 text-muted" />
                                  <span className="text-muted">Expire le</span>
                                  <span className="text-cream/70 font-medium">
                                    {new Date((prayer as any).expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                <span className="text-xs text-muted">
                                  {formatDate(prayer.created_at).full}
                                </span>
                                <button
                                  onClick={() => handlePray(prayer.id)}
                                  disabled={prayer.status === 'praying'}
                                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                                    prayer.status === 'praying'
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 cursor-default'
                                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/30'
                                  }`}
                                >
                                  <Heart className={`h-4 w-4 ${prayer.status === 'praying' ? 'fill-current' : ''}`} />
                                  {prayer.status === 'praying' ? 'En prière' : 'Prier'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => onNavigate('communication')}
                        className="btn-ghost text-sm inline-flex items-center gap-1.5"
                      >
                        Voir toutes les requêtes
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
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

                {dataLoading ? (
                  <div className="glass-card p-5 sm:p-6 animate-pulse">
                    <div className="h-5 w-40 rounded bg-white/5 mb-4" />
                    <div className="h-4 w-64 rounded bg-white/5 mb-2" />
                    <div className="h-4 w-48 rounded bg-white/5" />
                  </div>
                ) : departments.length === 0 ? (
                  <div className="glass-card p-5 sm:p-6">
                    {!showDeptRequest ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Users className="mb-3 h-10 w-10 text-muted/40" />
                        <p className="text-muted text-sm mb-2">
                          Vous n'êtes pas encore assigné à un département
                        </p>
                        <p className="text-xs text-muted/60 max-w-sm mb-5">
                          Rejoignez un département pour participer activement à la vie de l'église.
                        </p>
                        <button
                          onClick={handleShowDeptRequest}
                          className="btn-gold px-5 py-2.5 text-sm flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Demander à rejoindre un département
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-cream">
                            Choisir un département
                          </h3>
                          <button
                            onClick={() => setShowDeptRequest(false)}
                            className="text-muted hover:text-cream transition-colors text-xs"
                          >
                            Fermer
                          </button>
                        </div>
                        {deptList.length === 0 ? (
                          <p className="text-sm text-muted text-center py-6">
                            Aucun département disponible pour le moment.
                          </p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {deptList.map((dept) => {
                              const isRequested = requestedDept.split(',').includes(dept.id);
                              return (
                                <div
                                  key={dept.id}
                                  className="group rounded-xl bg-white/3 border border-white/10 p-4 transition-all duration-200 hover:border-accent-400/20"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1"
                                      style={{
                                        backgroundColor: `${dept.accent_color || 'gold'}15`,
                                        borderColor: `${dept.accent_color || 'gold'}30`,
                                      }}
                                    >
                                      <Star className={`h-4 w-4`} style={{ color: dept.accent_color || '#d4a843' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-semibold text-cream truncate">
                                        {dept.name}
                                      </h4>
                                      {dept.description && (
                                        <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                          {dept.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3">
                                    {isRequested ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400">
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Demande envoyée ✓
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleRequestDept(dept.id, dept.name)}
                                        disabled={deptRequestSubmitting}
                                        className="btn-gold px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Demander à rejoindre
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="glass-card group p-5 transition-all duration-300 hover:border-accent-400/20 hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-400/10 ring-1 ring-accent-500/20 transition-colors duration-300 group-hover:bg-accent-400/15">
                            <Star className="h-5 w-5 text-accent-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-cream truncate">
                              {dept.department_name}
                            </h3>
                            {dept.position_name && (
                              <p className="mt-0.5 text-sm text-accent-400 font-medium">
                                {dept.position_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <DeptMemberCount departmentId={dept.id} />
                        {dept.meeting_schedule ? (
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted rounded-lg bg-white/3 px-3 py-2">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
                            <span>Réunion hebdomadaire —</span>
                            <span className="text-cream/70 font-medium">{dept.meeting_schedule}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                {/* Demander un rôle pastoral */}
                <div className="mt-4 pt-4 border-t border-line">
                  <button
                    onClick={() => setShowRoleRequest(true)}
                    className="text-xs text-muted hover:text-accent-400 transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Demander un rôle pastoral (ancien, diacre, pasteur...)
                  </button>
                </div>
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               6. MES DEMANDES & RÉPONSES
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={5}>
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                    <ClipboardList className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h2 className="text-headline-md font-display text-cream">Mes Demandes & Réponses</h2>
                </div>

                {myRequestsLoading ? (
                  <div className="glass-card p-5 animate-pulse"><div className="h-4 w-40 bg-white/5 rounded" /></div>
                ) : myRequests.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-10 text-center">
                    <ClipboardList className="mb-3 h-10 w-10 text-muted/40" />
                    <p className="text-muted text-sm">Aucune demande envoyée</p>
                    <p className="text-xs text-muted/60 mt-1">Utilisez l'Espace Pastoral ci-dessous pour soumettre vos premières demandes.</p>
                  </div>
                ) : (
                  <div className="glass-card divide-y divide-white/5">
                    {myRequests.map((req) => (
                      <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${req.type === 'visit' ? 'bg-amber-500/10' : req.type === 'prayer' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                            {req.type === 'visit' ? <MapPin className="h-4 w-4 text-amber-400" /> : req.type === 'prayer' ? <Heart className="h-4 w-4 text-rose-400" /> : <Users className="h-4 w-4 text-emerald-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-cream truncate">{req.label}</p>
                            <p className="text-xs text-muted/60">{new Date(req.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                          {req.response && (
                            <div className="flex items-start gap-2 max-w-[200px]">
                              <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-emerald-400">Réponse reçue</p>
                                <p className="text-xs text-muted line-clamp-2">{req.response}</p>
                              </div>
                            </div>
                          )}
                          <span className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                            req.status === 'en_attente' ? 'bg-amber-500/15 text-amber-400' :
                            req.status === 'accepte' || req.status === 'repondu' || req.status === 'answered' ? 'bg-emerald-500/15 text-emerald-400' :
                            req.status === 'refuse' ? 'bg-red-500/15 text-red-400' :
                            'bg-sky-500/15 text-sky-400'
                          }`}>
                            {req.status === 'en_attente' ? 'En attente' :
                             req.status === 'accepte' ? 'Acceptée' :
                             req.status === 'refuse' ? 'Refusée' :
                             req.status === 'repondu' || req.status === 'answered' ? 'Répondue' :
                             req.status === 'received' ? 'Reçue' :
                             req.status === 'praying' || req.status === 'en_priere' ? 'En prière' :
                             req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               7. ESPACE PASTORAL
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={6}>
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                      <BookOpen className="h-5 w-5 text-purple-400" />
                    </div>
                    <h2 className="text-headline-md font-display text-cream">Espace Pastoral</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOpenAccordion(1)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition">
                      <MapPin className="h-3.5 w-3.5" /> Visite
                    </button>
                    <button onClick={() => setOpenAccordion(2)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition">
                      <Heart className="h-3.5 w-3.5" /> Prière
                    </button>
                    <button onClick={() => setOpenAccordion(3)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition">
                      <Star className="h-3.5 w-3.5" /> Auto-éval
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* ── Accordion 1: Demande de Visite Pastorale ── */}
                  <div className="glass-card overflow-hidden">
                    <button onClick={() => setOpenAccordion(openAccordion === 1 ? null : 1)} className="w-full p-5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10"><MapPin className="h-[18px] w-[18px] text-amber-400" /></div>
                        <span className="text-sm sm:text-base font-semibold text-cream">Demande de Visite Pastorale</span>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted transition-transform duration-300 ${openAccordion === 1 ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openAccordion === 1 ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="p-5 pt-0 space-y-4">
                        <p className="text-xs text-muted">Demandez une visite pastorale à domicile. Un pasteur ou ancien vous contactera pour planifier.</p>
                        <div>
                          <label className="text-sm font-medium text-cream mb-1.5 block">Nom et prénom *</label>
                          <input type="text" value={visitForm.name} onChange={(e) => setVisitForm({ ...visitForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition" placeholder="Votre nom complet" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-cream mb-1.5 block">Numéro de téléphone / WhatsApp</label>
                          <input type="tel" value={visitForm.phone} onChange={(e) => setVisitForm({ ...visitForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition" placeholder="+243 XX XX XX XX" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-cream mb-1.5 block">Adresse complète / Lieu de la visite *</label>
                          <input type="text" value={visitForm.address} onChange={(e) => setVisitForm({ ...visitForm, address: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition" placeholder="Quartier, ville, repère" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-cream mb-1.5 block">Motif de la visite *</label>
                          <select value={visitForm.motif} onChange={(e) => setVisitForm({ ...visitForm, motif: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition appearance-none cursor-pointer">
                            <option value="" className="bg-bg text-muted">— Choisir un motif —</option>
                            <option value="Conseil spirituel" className="bg-bg text-cream">Conseil spirituel</option>
                            <option value="Soutien moral" className="bg-bg text-cream">Soutien moral</option>
                            <option value="Baptême" className="bg-bg text-cream">Baptême</option>
                            <option value="Malade" className="bg-bg text-cream">Malade</option>
                            <option value="Autre" className="bg-bg text-cream">Autre</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-cream mb-1.5 block">Créneau horaire</label>
                            <select value={visitForm.timeOfDay} onChange={(e) => setVisitForm({ ...visitForm, timeOfDay: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition appearance-none cursor-pointer">
                              <option value="Matin" className="bg-bg text-cream">Matin</option>
                              <option value="Après-midi" className="bg-bg text-cream">Après-midi</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-cream mb-1.5 block">Jour préféré</label>
                            <select value={visitForm.dayRange} onChange={(e) => setVisitForm({ ...visitForm, dayRange: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition appearance-none cursor-pointer">
                              <option value="Lundi-Vendredi" className="bg-bg text-cream">Lundi à Vendredi</option>
                              <option value="Samedi" className="bg-bg text-cream">Samedi</option>
                              <option value="Dimanche" className="bg-bg text-cream">Dimanche</option>
                            </select>
                          </div>
                        </div>
                        <button onClick={handleVisitSubmit} disabled={visitSubmitting} className="btn-gold w-full sm:w-auto px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                          {visitSubmitting ? 'Envoi en cours…' : 'Soumettre la demande'}
                          {!visitSubmitting && <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Accordion 2: Requête de Prière ── */}
                  <div className="glass-card overflow-hidden">
                    <button onClick={() => setOpenAccordion(openAccordion === 2 ? null : 2)} className="w-full p-5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10"><Heart className="h-[18px] w-[18px] text-rose-400" /></div>
                        <span className="text-sm sm:text-base font-semibold text-cream">Requête de Prière</span>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted transition-transform duration-300 ${openAccordion === 2 ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openAccordion === 2 ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="p-5 pt-0 space-y-4">
                        <p className="text-xs text-muted">Partagez vos besoins et intentions de prière. Choisissez le niveau de confidentialité souhaité.</p>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-cream">Nom et prénom</label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted hover:text-cream transition">
                              <input type="checkbox" checked={pastoralPrayerForm.hideName} onChange={(e) => setPastoralPrayerForm({ ...pastoralPrayerForm, hideName: e.target.checked })} className="rounded border-line bg-white/5 text-accent-400 focus:ring-accent-500/30" />
                              Masquer mon nom
                            </label>
                          </div>
                          <input type="text" value={pastoralPrayerForm.hideName ? '' : pastoralPrayerForm.name} disabled={pastoralPrayerForm.hideName} onChange={(e) => setPastoralPrayerForm({ ...pastoralPrayerForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition disabled:opacity-40" placeholder="Votre nom" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-cream mb-1.5 block">E-mail</label>
                          <input type="email" value={pastoralPrayerForm.email} onChange={(e) => setPastoralPrayerForm({ ...pastoralPrayerForm, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition" placeholder="votre@email.com" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-cream mb-1.5 block">Votre besoin / Intention de prière *</label>
                          <textarea value={pastoralPrayerForm.content} onChange={(e) => setPastoralPrayerForm({ ...pastoralPrayerForm, content: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition min-h-[120px] resize-y" placeholder="Décrivez votre besoin de prière…" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-cream mb-2 block">Confidentialité</label>
                          <div className="flex flex-col gap-2">
                            {([
                              ['public', 'Publique', "Visible par tous les membres de l'église"],
                              ['pastoral', 'Équipe pastorale uniquement', 'Visible par le pasteur, anciens et diacres'],
                              ['confidentiel', 'Confidentielle', 'Visible par le pasteur uniquement'],
                            ] as const).map(([val, label, desc]) => (
                              <label key={val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${pastoralPrayerForm.visibility === val ? 'bg-accent-400/10 border-accent-400/30 text-accent-400' : 'bg-white/3 border-line text-cream/80 hover:bg-white/5'}`}>
                                <input type="radio" name="pastoral-prayer-visibility" value={val} checked={pastoralPrayerForm.visibility === val} onChange={() => setPastoralPrayerForm({ ...pastoralPrayerForm, visibility: val })} className="mt-0.5" />
                                <div>
                                  <span className="text-sm font-medium block">{label}</span>
                                  <span className={`text-xs ${pastoralPrayerForm.visibility === val ? 'text-accent-400/70' : 'text-muted'}`}>{desc}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <button onClick={handlePastoralPrayerSubmit} disabled={pastoralPrayerSubmitting} className="btn-gold w-full sm:w-auto px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                          {pastoralPrayerSubmitting ? 'Envoi en cours…' : 'Envoyer la requête'}
                          {!pastoralPrayerSubmitting && <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Accordion 3: Auto-évaluation Spirituelle ── */}
                  <div className="glass-card overflow-hidden">
                    <button onClick={() => setOpenAccordion(openAccordion === 3 ? null : 3)} className="w-full p-5 flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10"><Star className="h-[18px] w-[18px] text-sky-400" /></div>
                        <span className="text-sm sm:text-base font-semibold text-cream">Auto-évaluation Spirituelle</span>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted transition-transform duration-300 ${openAccordion === 3 ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openAccordion === 3 ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="p-5 pt-0 space-y-6">
                        <p className="text-xs text-muted">Évaluez votre croissance spirituelle à travers 4 domaines clés. Soyez honnête — ce questionnaire est personnel et confidentiel.</p>

                        {evalSubmitted ? (
                          <div className="space-y-4">
                            <div className={`p-5 rounded-2xl border ${evalScore >= 30 ? 'bg-emerald-500/10 border-emerald-500/30' : evalScore >= 20 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-sky-500/10 border-sky-500/30'}`}>
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${evalScore >= 30 ? 'bg-emerald-500/20' : evalScore >= 20 ? 'bg-amber-500/20' : 'bg-sky-500/20'}`}>
                                  <Star className={`h-6 w-6 ${evalScore >= 30 ? 'text-emerald-400' : evalScore >= 20 ? 'text-amber-400' : 'text-sky-400'}`} />
                                </div>
                                <div>
                                  <p className={`text-2xl font-display font-bold ${evalScore >= 30 ? 'text-emerald-400' : evalScore >= 20 ? 'text-amber-400' : 'text-sky-400'}`}>{evalScore}/36</p>
                                  <p className="text-xs text-muted">points sur 36</p>
                                </div>
                              </div>
                              <p className={`text-sm leading-relaxed ${evalScore >= 30 ? 'text-emerald-300' : evalScore >= 20 ? 'text-amber-300' : 'text-sky-300'}`}>
                                {evalScore >= 30
                                  ? "Bravo pour votre constance ! Continuez à persévérer et pensez à encadrer d'autres chrétiens."
                                  : evalScore >= 20
                                    ? 'Vous êtes sur la bonne voie, mais certains aspects méritent d\'être fortifiés.'
                                    : 'Ne vous découragez pas. Le parcours spirituel connaît des saisons. Nous sommes là pour vous accompagner.'}
                              </p>
                              {evalWantInterview && (
                                <p className="mt-3 text-sm text-accent-400 font-medium">🙏 Un pasteur vous contactera bientôt pour un entretien personnalisé.</p>
                              )}
                            </div>
                            <button onClick={resetEval} className="btn-ghost text-sm px-4 py-2">Recommencer l'évaluation</button>
                          </div>
                        ) : (
                          <>
                            {(['Intimité avec Dieu', 'Vie Communautaire', 'Service et Mission', 'Transformation du Caractère'] as const).map((cat, ci) => {
                              const catQuestions = EVAL_QUESTIONS.filter((q) => q.cat === cat);
                              const answered = catQuestions.filter((q) => evalAnswers[q.id] !== undefined).length;
                              const isOpen = openEvalCat === cat;
                              return (
                                <div key={cat} className="rounded-xl border border-line overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => setOpenEvalCat(isOpen ? null : cat)}
                                    className="w-full p-3.5 flex items-center justify-between hover:bg-white/3 transition"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-evangile-600" />
                                      <span className="text-sm font-medium text-cream">{cat}</span>
                                      <span className="text-[10px] text-muted">{answered}/{catQuestions.length}</span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-3.5 pb-4 space-y-4">
                                      {catQuestions.map((q) => (
                                        <div key={q.id}>
                                          <label className="text-sm font-medium text-cream mb-2 block leading-snug">{q.q}</label>
                                          <div className="flex flex-wrap gap-2">
                                            {q.opts.map((opt, oi) => (
                                              <button
                                                key={opt}
                                                onClick={() => setEvalAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${evalAnswers[q.id] === oi ? 'bg-accent-400/15 border-accent-400/40 text-accent-400' : 'bg-white/3 border-line text-cream/70 hover:bg-white/5 hover:text-cream'}`}
                                              >
                                                {opt}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            <div className="border-t border-line pt-4">
                              <label className="text-sm font-medium text-cream mb-2 block">Souhaitez-vous planifier un entretien pastoral ?</label>
                              <div className="flex gap-3">
                                <button onClick={() => setEvalWantInterview(true)} className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${evalWantInterview ? 'bg-accent-400/15 border-accent-400/40 text-accent-400' : 'bg-white/3 border-line text-cream/70 hover:bg-white/5'}`}>Oui</button>
                                <button onClick={() => setEvalWantInterview(false)} className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${!evalWantInterview ? 'bg-white/5 border-cream/20 text-cream' : 'bg-white/3 border-line text-cream/70 hover:bg-white/5'}`}>Non</button>
                              </div>
                            </div>

                            <button onClick={handleEvalSubmit} className="btn-gold w-full sm:w-auto px-6 py-3 text-sm font-medium flex items-center justify-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Voir mon résultat
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               7. TÉMOIGNAGE
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={8}>
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/10">
                      <Sparkles className="h-5 w-5 text-accent-400" />
                    </div>
                    <h2 className="text-headline-md font-display text-cream">
                      Témoignage
                    </h2>
                  </div>
                  {!testimonySubmitted && (
                    <button
                      onClick={() => setShowTestimonyForm(p => !p)}
                      className="btn-ghost text-sm flex items-center gap-1.5"
                    >
                      <Plus className={`h-4 w-4 transition-transform duration-200 ${showTestimonyForm ? 'rotate-45' : ''}`} />
                      Partager mon témoignage
                    </button>
                  )}
                </div>

                {testimonySubmitted ? (
                  <div className="glass-card p-6 text-center">
                    <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                    <p className="text-sm font-medium text-cream">Merci pour votre témoignage !</p>
                    <p className="text-xs text-muted mt-1">Il sera examiné par le pasteur puis publié sur le site.</p>
                    <button onClick={() => { setTestimonySubmitted(false); fetchUserTestimonies(); }} className="btn-ghost text-sm px-4 py-2 mt-4">
                      Partager un autre témoignage
                    </button>
                  </div>
                ) : showTestimonyForm ? (
                  <div className="glass-card p-5 space-y-4 border-evangile-600/15">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">Catégorie</label>
                      <div className="flex flex-wrap gap-2">
                        {TESTIMONY_CATEGORIES.map(c => (
                          <button
                            key={c.val}
                            type="button"
                            onClick={() => setTestimonyCategory(c.val)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium border transition-all ${
                              testimonyCategory === c.val
                                ? 'border-accent-400/50 bg-accent-400/10 text-accent-400'
                                : 'border-line text-muted hover:text-cream hover:border-white/20'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Partagez ce que Dieu a fait dans votre vie..."
                      value={testimonyContent}
                      onChange={(e) => setTestimonyContent(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400/30 resize-none"
                    />
                    <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={testimonyAnonymous}
                        onChange={(e) => setTestimonyAnonymous(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-accent-400 focus:ring-accent-500/30"
                      />
                      Publier anonymement
                    </label>
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => setShowTestimonyForm(false)} className="btn-ghost text-sm px-4 py-2">Annuler</button>
                      <button
                        onClick={handleSubmitTestimony}
                        disabled={testimonySubmitting || !testimonyContent.trim()}
                        className="btn-gold px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                        {testimonySubmitting ? 'Envoi...' : 'Soumettre'}
                      </button>
                    </div>
                  </div>
                ) : userTestimonies.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-10 text-center">
                    <Quote className="mb-3 h-10 w-10 text-accent-400/30" />
                    <p className="text-muted text-sm mb-1">Aucun témoignage partagé</p>
                    <p className="text-xs text-muted/60">Partagez ce que Dieu a fait dans votre vie pour encourager l'église.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTestimonies.map((t: any) => (
                      <div key={t.id} className="glass-card p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full bg-accent-400/10 text-accent-400 border border-accent-400/20`}>
                            {t.category === 'general' ? 'Général' : t.category === 'guerison' ? 'Guérison' : t.category === 'finance' ? 'Finance' : t.category === 'miracle' ? 'Miracle' : t.category === 'salut' ? 'Salut' : t.category === 'famille' ? 'Famille' : t.category === 'delivrance' ? 'Délivrance' : 'Autre'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Publié</span>
                          </div>
                        </div>
                        <p className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap">{t.content}</p>
                        {t.reviewer_profiles && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                              <Shield className="h-3 w-3 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[11px] text-cream/70">
                                Validé par <span className="font-medium text-cream">{t.reviewer_profiles.full_name || 'Un pasteur'}</span>
                              </p>
                              <p className="text-[10px] text-muted/60">
                                {t.published_at ? new Date(t.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                              </p>
                            </div>
                          </div>
                        )}
                        {!t.is_anonymous && (
                          <p className="mt-2 text-[10px] text-muted/50">
                            Partagé le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </EvtReveal>

            {/* ═══════════════════════════════════════════════════════
               9. RECENT ACTIVITY
               ═══════════════════════════════════════════════════════ */}
            <EvtReveal delay={9}>
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
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-accent-400/20" />

                      <div className="space-y-6">
                        {notifications.slice(0, 5).map((notif, idx) => (
                          <div key={notif.id} className="relative flex gap-4">
                            {/* Dot */}
                            <div className="relative z-10 mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bg ring-2 ring-accent-500/30">
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
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-evangile-600" />
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

      <div className="footer-spacer" />
      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="dashboard" />

      {/* ── Role Request Modal ──────────────────────────────────── */}
      {showRoleRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRoleRequest(false)}>
          <div className="glass rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-semibold text-cream">Demander un rôle pastoral</h3>
              <button onClick={() => setShowRoleRequest(false)} className="text-muted hover:text-cream"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-muted">Soumettez votre demande. L'administrateur examinera votre profil et vous répondra.</p>
            <div>
              <label className="text-sm font-medium text-cream mb-1.5 block">Rôle souhaité *</label>
              <select value={roleRequestForm.requested_role} onChange={e => setRoleRequestForm({...roleRequestForm, requested_role: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition appearance-none cursor-pointer">
                <option value="" className="bg-bg text-muted">— Choisir —</option>
                <option value="ancien" className="bg-bg text-cream">Ancien</option>
                <option value="diacre" className="bg-bg text-cream">Diacre</option>
                <option value="collaborateur" className="bg-bg text-cream">Collaborateur</option>
                <option value="assistant_pastor" className="bg-bg text-cream">Assistant pasteur</option>
                <option value="pastor_assoc" className="bg-bg text-cream">Pasteur associé</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-cream mb-1.5 block">Pourquoi souhaitez-vous ce rôle ?</label>
              <textarea value={roleRequestForm.reason} onChange={e => setRoleRequestForm({...roleRequestForm, reason: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-cream text-sm outline-none focus:border-accent-400/50 transition min-h-[100px] resize-y" placeholder="Décrivez votre appel et votre engagement..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRoleRequest(false)} className="btn-ghost text-sm px-4 py-2">Annuler</button>
              <button onClick={handleRoleRequestSubmit} disabled={roleRequestSubmitting || !roleRequestForm.requested_role} className="btn-gold px-5 py-2 text-sm disabled:opacity-50">Envoyer la demande</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}