import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { db } from '../lib/supabase';
import {
  Calendar, MapPin, Phone, User, Plus, Search, AlertTriangle, CheckCircle,
  X, Clock, Eye, ChevronRight, Filter, Home, BookOpen, Heart, Shield, Bell,
  ArrowRight, Star, Users, MessageSquare,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { PastoralAlert, VisitRequest, PastorSchedule, Converti, ConvertiPipelineStage } from '../types';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { EvtReveal } from '../components/EvtReveal';

/* ═══════════════════════════════════════════════════════════════════
   Pastoral Control Space
   ═══════════════════════════════════════════════════════════════════ */

interface PastoralPageProps { onNavigate: (page: Page) => void }

// ─── Helpers ────────────────────────────────────────────────────────

function timeSince(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const hours = Math.floor((now - then) / 36e5);
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 jour';
  return `${days} jours`;
}

function timeInStage(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const hours = Math.floor((now - then) / 36e5);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  const months = Math.floor(days / 30);
  return `${months}m ${days % 30}j`;
}

function formatShortDate(s: string): string {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(s: string): string {
  const d = new Date(`2000-01-01T${s}`);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const SEVERITY_ORDER: Record<string, number> = { haute: 3, moyenne: 2, basse: 1 };

const PIPELINE_STAGES: { key: ConvertiPipelineStage; label: string; color: string }[] = [
  { key: 'nouveau',          label: 'Nouveau',          color: 'text-sky-400' },
  { key: 'premier_contact',  label: 'Premier contact',  color: 'text-cyan-400' },
  { key: 'visite_domicile',  label: 'Visite domicile',  color: 'text-emerald-400' },
  { key: 'cellule',          label: 'En cellule',       color: 'text-amber-400' },
  { key: 'cours_bapteme',    label: 'Cours baptême',    color: 'text-orange-400' },
  { key: 'membre_actif',     label: 'Membre actif',     color: 'text-accent-500' },
];

const ALERT_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ame_en_danger_72h:  { label: 'Âme en danger',   color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  cas_lourd:          { label: 'Cas lourd',        color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/30' },
  retard_integration: { label: 'Retard',          color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/30' },
  autre:              { label: 'Autre',           color: 'text-muted',       bg: 'bg-white/5 border-white/10' },
};

const SEVERITY_BADGE: Record<string, { color: string; bg: string }> = {
  haute:   { color: 'text-red-400',    bg: 'bg-red-500/15' },
  moyenne: { color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  basse:   { color: 'text-green-400',  bg: 'bg-green-500/15' },
};

const URGENCY_BADGE: Record<string, { color: string; bg: string }> = {
  urgente: { color: 'text-red-400',    bg: 'bg-red-500/15' },
  haute:   { color: 'text-orange-400', bg: 'bg-orange-500/15' },
  normale: { color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  basse:   { color: 'text-green-400',  bg: 'bg-green-500/15' },
};

const VISIT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_attente:   { label: 'En attente',    color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  acceptee:     { label: 'Acceptée',      color: 'text-sky-400',   bg: 'bg-sky-500/15' },
  planifiee:    { label: 'Planifiée',     color: 'text-blue-400',   bg: 'bg-blue-500/15' },
  effectuee:    { label: 'Effectuée',     color: 'text-green-400',  bg: 'bg-green-500/15' },
  refusee:      { label: 'Refusée',       color: 'text-red-400',    bg: 'bg-red-500/15' },
  reprogrammee: { label: 'Reprogrammée',  color: 'text-orange-400', bg: 'bg-orange-500/15' },
};

const SCHEDULE_TYPE_ICONS: Record<string, string> = {
  visite: '🏠', entretien: '💬', culte: '⛪', reunion: '👥', formation: '📚', personnel: '🙏', autre: '📌',
};

const SCHEDULE_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  planifie: { label: 'Planifié', color: 'text-sky-400', bg: 'bg-sky-500/15' },
  confirme: { label: 'Confirmé', color: 'text-green-400', bg: 'bg-green-500/15' },
  termine:  { label: 'Terminé', color: 'text-muted', bg: 'bg-white/5' },
  annule:   { label: 'Annulé', color: 'text-red-400', bg: 'bg-red-500/15' },
};

// ─── Modal ──────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass-card relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-headline-md font-display text-cream">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-cream">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function PastoralPage({ onNavigate }: PastoralPageProps) {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const { colorMode, toggleColorMode } = useDynamicTheme();

  // ── Data state ──────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<PastoralAlert[]>([]);
  const [convertis, setConvertis] = useState<Converti[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [schedule, setSchedule] = useState<PastorSchedule[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Stats computed ──────────────────────────────────────────────
  const dangerCount = alerts.filter(a => a.type === 'ame_en_danger_72h' && a.status === 'ouverte').length;
  const casLourdsCount = alerts.filter(a => a.type === 'cas_lourd' && a.status === 'ouverte').length;
  const totalConvertis = convertis.length;
  const membresActifs = convertis.filter(c => c.pipeline_stage === 'membre_actif').length;
  const retentionRate = totalConvertis > 0 ? Math.round((membresActifs / totalConvertis) * 100) : 0;

  // ── Section 2: Alerts ───────────────────────────────────────────
  const [resolveModal, setResolveModal] = useState<PastoralAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const sortedAlerts = [...alerts]
    .filter(a => a.status === 'ouverte')
    .sort((a, b) => {
      const sevDiff = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
      if (sevDiff !== 0) return sevDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  // ── Section 3: Pipeline filters ─────────────────────────────────
  const [pipeFilterEvangelist, setPipeFilterEvangelist] = useState('');
  const [pipeFilterQuartier, setPipeFilterQuartier] = useState('');
  const [pipeFilterStage, setPipeFilterStage] = useState<ConvertiPipelineStage | ''>('');
  const [pipeFilterDateFrom, setPipeFilterDateFrom] = useState('');
  const [pipeFilterDateTo, setPipeFilterDateTo] = useState('');
  const [expandedConverti, setExpandedConverti] = useState<string | null>(null);
  const [convertiTimelines, setConvertiTimelines] = useState<Record<string, { action: string; notes?: string; done_by_name?: string; created_at: string }[]>>({});

  const uniqueEvangelists = Array.from(new Set(convertis.map(c => c.evangelist_name).filter(Boolean) as string[])).sort();
  const uniqueQuartiers = Array.from(new Set(convertis.map(c => c.quartier).filter(Boolean) as string[])).sort();

  const filteredConvertis = convertis.filter(c => {
    if (pipeFilterEvangelist && c.evangelist_name !== pipeFilterEvangelist) return false;
    if (pipeFilterQuartier && c.quartier !== pipeFilterQuartier) return false;
    if (pipeFilterStage && c.pipeline_stage !== pipeFilterStage) return false;
    if (pipeFilterDateFrom && c.created_at < pipeFilterDateFrom) return false;
    if (pipeFilterDateTo && c.created_at > pipeFilterDateTo + 'T23:59:59') return false;
    return true;
  });

  async function loadTimeline(convertiId: string) {
    try {
      const data = await db.getConvertiTimeline(convertiId);
      setConvertiTimelines(prev => ({ ...prev, [convertiId]: data }));
    } catch { /* silent */ }
  }

  function handleExpandConverti(id: string) {
    if (expandedConverti === id) {
      setExpandedConverti(null);
    } else {
      setExpandedConverti(id);
      loadTimeline(id);
    }
  }

  // ── Section 4: Visit requests ───────────────────────────────────
  const [vrFilterStatus, setVrFilterStatus] = useState('');
  const [vrFilterUrgency, setVrFilterUrgency] = useState('');
  const [vrFilterType, setVrFilterType] = useState('');
  const [planifModal, setPlanifModal] = useState<VisitRequest | null>(null);
  const [planifDate, setPlanifDate] = useState('');
  const [planifTime, setPlanifTime] = useState('');
  const [notesModal, setNotesModal] = useState<VisitRequest | null>(null);
  const [vrNotes, setVrNotes] = useState('');

  const filteredVisitRequests = visitRequests.filter(vr => {
    if (vrFilterStatus && vr.status !== vrFilterStatus) return false;
    if (vrFilterUrgency && vr.urgency !== vrFilterUrgency) return false;
    if (vrFilterType && vr.visit_type !== vrFilterType) return false;
    return true;
  });

  // ── Section 5: Schedule ─────────────────────────────────────────
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<PastorSchedule | null>(null);
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');
  const [schedType, setSchedType] = useState<PastorSchedule['type']>('visite');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedDesc, setSchedDesc] = useState('');
  const [schedIsAvailable, setSchedIsAvailable] = useState(false);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const scheduleFiltered = schedule.filter(s => {
    if (showAvailableOnly && !s.is_available) return false;
    return true;
  });

  const scheduleByDate = scheduleFiltered.reduce<Record<string, PastorSchedule[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const weekDates: string[] = [];
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    weekDates.push(d.toISOString().split('T')[0]);
  }

  // ── Fetch all data ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadAll() {
      setDataLoading(true);
      try {
        const [alertsData, convertisData, visitsData, schedData] = await Promise.all([
          db.getPastoralAlerts(),
          db.getConvertis(),
          db.getVisitRequests(),
          db.getPastorSchedule(),
        ]);
        if (cancelled) return;
        setAlerts(alertsData);
        setConvertis(convertisData);
        setVisitRequests(visitsData);
        setSchedule(schedData);
      } catch (err) {
        console.error('PastoralPage load error:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [user]);

  // ── Actions ─────────────────────────────────────────────────────

  async function handleTakeCharge(alertId: string) {
    try {
      await db.upsertPastoralAlert({
        id: alertId,
        status: 'en_cours',
        assigned_to: user?.id,
        assigned_to_name: profile?.full_name ?? undefined,
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'en_cours' as const, assigned_to: user?.id, assigned_to_name: profile?.full_name ?? undefined } : a));
      addToast('Alerte prise en charge.', 'success');
    } catch {
      addToast("Erreur lors de la prise en charge.", 'error');
    }
  }

  async function handleResolveAlert() {
    if (!resolveModal) return;
    try {
      await db.upsertPastoralAlert({
        id: resolveModal.id,
        status: 'resolue',
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolveNotes,
      });
      setAlerts(prev => prev.map(a => a.id === resolveModal.id ? { ...a, status: 'resolue' as const, resolved_by: user?.id, resolved_at: new Date().toISOString(), resolution_notes: resolveNotes } : a));
      addToast('Alerte résolue.', 'success');
      setResolveModal(null);
      setResolveNotes('');
    } catch {
      addToast("Erreur lors de la résolution.", 'error');
    }
  }

  async function handleVisitAction(id: string, action: string, extra?: Record<string, string>) {
    try {
      const update: Partial<VisitRequest> = { ...extra, updated_at: new Date().toISOString() };
      if (action === 'accepter') update.status = 'acceptee';
      else if (action === 'refuser') update.status = 'refusee';
      else if (action === 'planifier') {
        update.status = 'planifiee';
        update.assigned_to = user?.id;
        update.assigned_to_name = profile?.full_name ?? undefined;
      }
      else if (action === 'effectuer') update.status = 'effectuee';
      else if (action === 'reprogrammer') update.status = 'reprogrammee';

      await db.upsertVisitRequest({ id, ...update });
      setVisitRequests(prev => prev.map(vr => vr.id === id ? { ...vr, ...update } as VisitRequest : vr));
      addToast('Demande mise à jour.', 'success');
    } catch {
      addToast("Erreur lors de la mise à jour.", 'error');
    }
  }

  async function handleSaveSchedule() {
    if (!schedTitle.trim() || !schedDate || !schedStartTime || !schedEndTime) {
      addToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }
    try {
      const payload: Partial<PastorSchedule> = {
        pastor_id: user?.id ?? '',
        pastor_name: profile?.full_name ?? undefined,
        date: schedDate,
        start_time: schedStartTime,
        end_time: schedEndTime,
        type: schedType,
        title: schedTitle.trim(),
        description: schedDesc.trim() || undefined,
        location: schedLocation.trim() || undefined,
        is_available: schedIsAvailable,
        status: 'planifie',
      };
      if (scheduleModal) {
        payload.id = scheduleModal.id;
        await db.upsertPastorSchedule(payload);
        setSchedule(prev => prev.map(s => s.id === scheduleModal.id ? { ...s, ...payload } as PastorSchedule : s));
      } else {
        const created = await db.upsertPastorSchedule(payload);
        setSchedule(prev => [...prev, created as unknown as PastorSchedule]);
      }
      addToast('Créneau enregistré.', 'success');
      setScheduleModalOpen(false);
      setScheduleModal(null);
      resetScheduleForm();
    } catch {
      addToast("Erreur lors de l'enregistrement.", 'error');
    }
  }

  async function handleDeleteSchedule(id: string) {
    try {
      await db.deletePastorSchedule(id);
      setSchedule(prev => prev.filter(s => s.id !== id));
      addToast('Créneau supprimé.', 'success');
    } catch {
      addToast('Erreur lors de la suppression.', 'error');
    }
  }

  function resetScheduleForm() {
    setSchedTitle(''); setSchedDate(''); setSchedStartTime(''); setSchedEndTime('');
    setSchedType('visite'); setSchedLocation(''); setSchedDesc(''); setSchedIsAvailable(false);
  }

  function openScheduleModal(existing?: PastorSchedule) {
    if (existing) {
      setScheduleModal(existing);
      setSchedTitle(existing.title);
      setSchedDate(existing.date);
      setSchedStartTime(existing.start_time);
      setSchedEndTime(existing.end_time);
      setSchedType(existing.type);
      setSchedLocation(existing.location ?? '');
      setSchedDesc(existing.description ?? '');
      setSchedIsAvailable(existing.is_available);
    } else {
      setScheduleModal(null);
      resetScheduleForm();
      setSchedDate(new Date().toISOString().split('T')[0]);
    }
    setScheduleModalOpen(true);
  }

  // ── Guard: not logged in ───────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
        <SiteHeader onNavigate={onNavigate} activePage="pastoral" />
        <div className="flex min-h-[80vh] items-center justify-center px-margin-mobile md:px-margin-desktop">
          <div className="glass-card max-w-md p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-400/10">
              <Shield className="h-10 w-10 text-accent-400" />
            </div>
            <h2 className="text-headline-lg font-display gold-text mb-3">
              Espace Pastoral
            </h2>
            <p className="text-body-lg text-muted mb-8">
              Connectez-vous pour accéder à l'espace de supervision pastorale.
            </p>
            <button onClick={() => onNavigate('connexion')} className="btn-gold px-8 py-3">
              Se connecter
            </button>
          </div>
        </div>
        <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
        <MobileNav onNavigate={onNavigate} active="pastoral" />
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
        <SiteHeader onNavigate={onNavigate} activePage="pastoral" />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-evangile-600 border-t-transparent" />
            <p className="text-muted">Chargement de l'espace pastoral…</p>
          </div>
        </div>
        <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
        <MobileNav onNavigate={onNavigate} active="pastoral" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="pastoral" />

      <main className="pt-24 pb-32 px-margin-mobile md:px-margin-desktop">
        <div className="mx-auto max-w-8xl space-y-gutter">

          {/* ─── Page Header ──────────────────────────────────── */}
          <EvtReveal>
            <div className="mb-2">
              <div className="flex items-center gap-2 text-sm text-muted mb-4">
                <button onClick={() => onNavigate('dashboard')} className="hover:text-cream transition-colors">Tableau de bord</button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-accent-400">Espace Pastoral</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h1 className="text-headline-xl font-display gold-text mb-2">Espace Pastoral</h1>
                  <p className="text-body-lg text-muted max-w-2xl">
                    Supervision des âmes, gestion des alertes, suivi des visites et planification du pasteur.
                  </p>
                </div>
                <button onClick={() => onNavigate('crm')} className="btn-ghost flex items-center gap-2 self-start sm:self-auto">
                  <Users className="h-4 w-4" />
                  Voir le CRM complet
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </EvtReveal>

          {/* ═══════════════════════════════════════════════════════
              SECTION 1 — Stats Overview
              ═══════════════════════════════════════════════════════ */}
          <EvtReveal delay={1}>
            <section>
              <h2 className="text-headline-md font-display text-cream mb-6 flex items-center gap-3">
                <Star className="h-5 w-5 text-accent-400" />
                Vue d'ensemble
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat: Âmes en danger */}
                <div className="glass-card p-5 relative overflow-hidden">
                  {dangerCount > 0 && (
                    <span className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <span className="text-sm text-muted">Âmes en danger (72h)</span>
                  </div>
                  <p className="text-headline-lg font-display text-red-400">{dangerCount}</p>
                  <p className="text-xs text-muted/60 mt-1">Alertes ouvertes</p>
                </div>

                {/* Stat: Cas lourds */}
                <div className="glass-card p-5 relative overflow-hidden">
                  {casLourdsCount > 0 && (
                    <span className="absolute top-3 right-3 h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                      <Heart className="h-5 w-5 text-orange-400" />
                    </div>
                    <span className="text-sm text-muted">Cas lourds</span>
                  </div>
                  <p className="text-headline-lg font-display text-orange-400">{casLourdsCount}</p>
                  <p className="text-xs text-muted/60 mt-1">Alertes ouvertes</p>
                </div>

                {/* Stat: Taux de rétention */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <span className="text-sm text-muted">Taux de rétention</span>
                  </div>
                  <p className="text-headline-lg font-display text-green-400">{retentionRate}%</p>
                  <p className="text-xs text-muted/60 mt-1">{membresActifs} / {totalConvertis} convertis</p>
                </div>

                {/* Stat: Convertis en pipeline */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15">
                      <Users className="h-5 w-5 text-sky-400" />
                    </div>
                    <span className="text-sm text-muted">Convertis en pipeline</span>
                  </div>
                  <p className="text-headline-lg font-display text-sky-400">{totalConvertis}</p>
                  <p className="text-xs text-muted/60 mt-1">Total en suivi</p>
                </div>
              </div>
            </section>
          </EvtReveal>

          {/* ═══════════════════════════════════════════════════════
              SECTION 2 — Pastoral Alerts Table
              ═══════════════════════════════════════════════════════ */}
          <EvtReveal delay={2}>
            <section>
              <h2 className="text-headline-md font-display text-cream mb-6 flex items-center gap-3">
                <Bell className="h-5 w-5 text-accent-400" />
                Alertes Pastorales
                {sortedAlerts.length > 0 && (
                  <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-400/20 px-2 text-xs font-bold text-accent-400">
                    {sortedAlerts.length}
                  </span>
                )}
              </h2>

              {sortedAlerts.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400/50" />
                  <p className="text-headline-md font-display text-cream mb-2">Aucune alerte ouverte</p>
                  <p className="text-muted">Toutes les alertes ont été traitées. Que la paix soit avec vous !</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAlerts.map(alert => {
                    const typeInfo = ALERT_TYPE_LABELS[alert.type] ?? ALERT_TYPE_LABELS.autre;
                    const sevInfo = SEVERITY_BADGE[alert.severity] ?? SEVERITY_BADGE.basse;
                    const age = timeSince(alert.created_at);
                    const isOld = age !== "À l'instant" && !age.endsWith('h');

                    return (
                      <div key={alert.id} className="glass-card p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          {/* Type badge */}
                          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${typeInfo.bg} ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-cream truncate">
                              {alert.converti_name ?? 'Converti inconnu'}
                            </p>
                            <p className="text-sm text-muted truncate mt-0.5">
                              {alert.description}
                            </p>
                          </div>

                          {/* Severity */}
                          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${sevInfo.bg} ${sevInfo.color}`}>
                            {alert.severity}
                          </span>

                          {/* Age */}
                          <span className={`flex items-center gap-1.5 text-sm whitespace-nowrap ${isOld ? 'text-red-400' : 'text-muted'}`}>
                            <Clock className="h-3.5 w-3.5" />
                            {age}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {alert.status === 'ouverte' && (
                              <button
                                onClick={() => handleTakeCharge(alert.id)}
                                className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
                              >
                                <User className="h-3.5 w-3.5" />
                                Prendre en charge
                              </button>
                            )}
                            {alert.status !== 'resolue' && (
                              <button
                                onClick={() => { setResolveModal(alert); setResolveNotes(''); }}
                                className="flex items-center gap-1.5 rounded-lg border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Résoudre
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </EvtReveal>

          {/* ═══════════════════════════════════════════════════════
              SECTION 3 — Pipeline des Âmes
              ═══════════════════════════════════════════════════════ */}
          <EvtReveal delay={3}>
            <section>
              <h2 className="text-headline-md font-display text-cream mb-6 flex items-center gap-3">
                <Eye className="h-5 w-5 text-accent-400" />
                Pipeline des Âmes
                <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-500/20 px-2 text-xs font-bold text-sky-400">
                  {filteredConvertis.length}
                </span>
              </h2>

              {/* Filters */}
              <div className="glass-card p-4 mb-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted">
                  <Filter className="h-4 w-4" />
                  Filtres
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <select
                    value={pipeFilterEvangelist}
                    onChange={e => setPipeFilterEvangelist(e.target.value)}
                    className="input-surface text-sm"
                  >
                    <option value="">Tous les évangélistes</option>
                    {uniqueEvangelists.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={pipeFilterQuartier}
                    onChange={e => setPipeFilterQuartier(e.target.value)}
                    className="input-surface text-sm"
                  >
                    <option value="">Tous les quartiers</option>
                    {uniqueQuartiers.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <select
                    value={pipeFilterStage}
                    onChange={e => setPipeFilterStage(e.target.value as ConvertiPipelineStage | '')}
                    className="input-surface text-sm"
                  >
                    <option value="">Toutes les étapes</option>
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={pipeFilterDateFrom}
                    onChange={e => setPipeFilterDateFrom(e.target.value)}
                    placeholder="Du"
                    className="input-surface text-sm"
                  />
                  <input
                    type="date"
                    value={pipeFilterDateTo}
                    onChange={e => setPipeFilterDateTo(e.target.value)}
                    placeholder="Au"
                    className="input-surface text-sm"
                  />
                </div>
              </div>

              {/* Converti cards */}
              {filteredConvertis.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted/30" />
                  <p className="text-muted">Aucun converti ne correspond aux filtres.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredConvertis.map(c => {
                    const stageInfo = PIPELINE_STAGES.find(s => s.key === c.pipeline_stage);
                    const isExpanded = expandedConverti === c.id;
                    const isCasLourd = alerts.some(a => a.converti_id === c.id && a.type === 'cas_lourd' && a.status !== 'resolue');
                    const timeline = convertiTimelines[c.id] ?? [];

                    return (
                      <div
                        key={c.id}
                        className={`glass-card p-4 cursor-pointer transition-all duration-200 hover:border-accent-400/30 ${
                          isCasLourd ? 'border-2 border-evangile-600' : ''
                        } ${isExpanded ? 'ring-1 ring-accent-500/20' : ''}`}
                        onClick={() => handleExpandConverti(c.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-cream truncate">
                              {c.first_name} {c.last_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={`text-xs font-semibold ${stageInfo?.color ?? 'text-muted'}`}>
                                {stageInfo?.label ?? c.pipeline_stage}
                              </span>
                              <span className="text-xs text-muted/60 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeInStage(c.pipeline_updated_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.needs_pastoral_care && (
                              <Heart className="h-4 w-4 text-red-400" />
                            )}
                            <ChevronRight className={`h-4 w-4 text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-muted/60">
                          {c.evangelist_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {c.evangelist_name}
                            </span>
                          )}
                          {c.quartier && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {c.quartier}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 border-t border-white/10 pt-4 space-y-3" onClick={e => e.stopPropagation()}>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted text-xs">Téléphone</span>
                                <p className="text-cream">{c.phone || '—'}</p>
                              </div>
                              <div>
                                <span className="text-muted text-xs">Source</span>
                                <p className="text-cream capitalize">{c.source}</p>
                              </div>
                              <div>
                                <span className="text-muted text-xs">Zone</span>
                                <p className="text-cream">{c.zone || '—'}</p>
                              </div>
                              <div>
                                <span className="text-muted text-xs">Cellule</span>
                                <p className="text-cream">{c.cellule_name || '—'}</p>
                              </div>
                            </div>
                            {c.notes && (
                              <div>
                                <span className="text-muted text-xs">Notes</span>
                                <p className="text-sm text-cream/80 mt-0.5">{c.notes}</p>
                              </div>
                            )}

                            {/* Timeline */}
                            {timeline.length > 0 && (
                              <div>
                                <span className="text-muted text-xs font-medium">Chronologie</span>
                                <div className="mt-2 space-y-2">
                                  {timeline.slice(0, 5).map((t, i) => (
                                    <div key={i} className="flex gap-3 text-xs">
                                      <div className="mt-1.5 h-2 w-2 rounded-full bg-accent-400/50 shrink-0" />
                                      <div>
                                        <p className="text-cream font-medium">{t.action}</p>
                                        {t.done_by_name && <p className="text-muted">par {t.done_by_name}</p>}
                                        {t.notes && <p className="text-muted/70 mt-0.5">{t.notes}</p>}
                                        <p className="text-muted/50 mt-0.5">{formatShortDate(t.created_at)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </EvtReveal>

          {/* ═══════════════════════════════════════════════════════
              SECTION 4 — Visit Requests Management
              ═══════════════════════════════════════════════════════ */}
          <EvtReveal delay={4}>
            <section>
              <h2 className="text-headline-md font-display text-cream mb-6 flex items-center gap-3">
                <Home className="h-5 w-5 text-accent-400" />
                Demandes de Visite
                {visitRequests.length > 0 && (
                  <span className="ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-400/20 px-2 text-xs font-bold text-accent-400">
                    {filteredVisitRequests.length}
                  </span>
                )}
              </h2>

              {/* Filters */}
              <div className="glass-card p-4 mb-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted">
                  <Filter className="h-4 w-4" />
                  Filtres
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={vrFilterStatus} onChange={e => setVrFilterStatus(e.target.value)} className="input-surface text-sm">
                    <option value="">Tous les statuts</option>
                    {Object.entries(VISIT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select value={vrFilterUrgency} onChange={e => setVrFilterUrgency(e.target.value)} className="input-surface text-sm">
                    <option value="">Toutes les urgences</option>
                    <option value="urgente">Urgente</option>
                    <option value="haute">Haute</option>
                    <option value="normale">Normale</option>
                    <option value="basse">Basse</option>
                  </select>
                  <select value={vrFilterType} onChange={e => setVrFilterType(e.target.value)} className="input-surface text-sm">
                    <option value="">Tous les types</option>
                    <option value="pastorale">Pastorale</option>
                    <option value="evangelisation">Évangélisation</option>
                    <option value="malade">Malade</option>
                    <option value="encouragement">Encouragement</option>
                    <option value="suivi">Suivi</option>
                  </select>
                </div>
              </div>

              {filteredVisitRequests.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <Home className="mx-auto mb-3 h-10 w-10 text-muted/30" />
                  <p className="text-muted">Aucune demande de visite.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredVisitRequests.map(vr => {
                    const statusInfo = VISIT_STATUS_LABELS[vr.status] ?? VISIT_STATUS_LABELS.en_attente;
                    const urgencyInfo = URGENCY_BADGE[vr.urgency] ?? URGENCY_BADGE.normale;

                    return (
                      <div key={vr.id} className="glass-card p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="font-medium text-cream truncate">{vr.beneficiary_name}</p>
                            <p className="text-xs text-muted mt-0.5">
                              Demandé par {vr.requester_name ?? 'Anonyme'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyInfo.bg} ${urgencyInfo.color}`}>
                              {vr.urgency}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-sm text-muted mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{vr.beneficiary_address}</span>
                          </div>
                          {vr.beneficiary_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{vr.beneficiary_phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>Visite {vr.visit_type} · {formatShortDate(vr.created_at)}</span>
                          </div>
                          {vr.reason && (
                            <p className="text-xs text-muted/70 mt-1 line-clamp-2">« {vr.reason} »</p>
                          )}
                        </div>

                        {/* Actions based on status */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                          {vr.status === 'en_attente' && (
                            <>
                              <button
                                onClick={() => handleVisitAction(vr.id, 'accepter')}
                                className="flex items-center gap-1.5 rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/25"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Accepter
                              </button>
                              <button
                                onClick={() => handleVisitAction(vr.id, 'refuser')}
                                className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25"
                              >
                                <X className="h-3.5 w-3.5" />
                                Refuser
                              </button>
                            </>
                          )}
                          {(vr.status === 'en_attente' || vr.status === 'acceptee' || vr.status === 'reprogrammee') && (
                            <button
                              onClick={() => {
                                setPlanifModal(vr);
                                setPlanifDate(vr.preferred_date ?? '');
                                setPlanifTime(vr.preferred_time ?? '');
                              }}
                              className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-400 transition-colors hover:bg-sky-500/25"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              Planifier
                            </button>
                          )}
                          {(vr.status === 'planifiee' || vr.status === 'acceptee') && (
                            <button
                              onClick={() => handleVisitAction(vr.id, 'effectuer', { visited_at: new Date().toISOString() })}
                              className="flex items-center gap-1.5 rounded-lg border border-accent-400/30 px-3 py-1.5 text-xs font-medium text-accent-400 transition-colors hover:bg-accent-400/10"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Marquer effectuée
                            </button>
                          )}
                          {vr.status === 'planifiee' && (
                            <button
                              onClick={() => handleVisitAction(vr.id, 'reprogrammer')}
                              className="flex items-center gap-1.5 rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/25"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Reprogrammer
                            </button>
                          )}
                          {vr.status !== 'en_attente' && vr.status !== 'refusee' && vr.status !== 'effectuee' && (
                            <button
                              onClick={() => { setNotesModal(vr); setVrNotes(vr.pastor_notes ?? ''); }}
                              className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-white/10"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Notes
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </EvtReveal>

          {/* ═══════════════════════════════════════════════════════
              SECTION 5 — Pastor's Schedule
              ═══════════════════════════════════════════════════════ */}
          <EvtReveal delay={5}>
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-headline-md font-display text-cream flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-accent-400" />
                  Emploi du temps
                </h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={showAvailableOnly}
                      onChange={e => setShowAvailableOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-evangile-600"
                    />
                    Créneaux disponibles
                  </label>
                  <button
                    onClick={() => openScheduleModal()}
                    className="btn-gold flex items-center gap-1.5 px-4 py-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </button>
                </div>
              </div>

              {weekDates.length === 0 || Object.keys(scheduleByDate).length === 0 && !showAvailableOnly ? (
                <div className="glass-card p-10 text-center">
                  <Calendar className="mx-auto mb-3 h-10 w-10 text-muted/30" />
                  <p className="text-muted">Aucun créneau cette semaine.</p>
                  <button onClick={() => openScheduleModal()} className="btn-ghost mt-4 text-sm">
                    <Plus className="h-4 w-4 inline mr-1.5" />
                    Ajouter un créneau
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {weekDates.map(dateStr => {
                    const daySched = scheduleByDate[dateStr] ?? [];
                    const dayLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    if (daySched.length === 0 && !showAvailableOnly) return null;

                    return (
                      <div key={dateStr} className="glass-card overflow-hidden">
                        <div className={`px-4 py-3 flex items-center gap-3 ${isToday ? 'bg-accent-400/10 border-l-2 border-evangile-600' : 'bg-white/[0.02]'}`}>
                          <Calendar className="h-4 w-4 text-accent-400 shrink-0" />
                          <span className={`font-medium capitalize ${isToday ? 'text-accent-400' : 'text-cream'}`}>
                            {dayLabel}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-400 bg-accent-400/15 px-2 py-0.5 rounded-full">
                              Aujourd'hui
                            </span>
                          )}
                          {daySched.length > 0 && (
                            <span className="ml-auto text-xs text-muted">{daySched.length} créneau{daySched.length > 1 ? 'x' : ''}</span>
                          )}
                        </div>

                        {daySched.length > 0 && (
                          <div className="divide-y divide-white/5">
                            {daySched.map(s => {
                              const statusBadge = SCHEDULE_STATUS_BADGE[s.status] ?? SCHEDULE_STATUS_BADGE.planifie;
                              const typeEmoji = SCHEDULE_TYPE_ICONS[s.type] ?? '📌';

                              return (
                                <div key={s.id} className="px-4 py-3 flex items-center gap-4 group">
                                  <span className="text-lg shrink-0">{typeEmoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`font-medium truncate ${s.is_available ? 'text-green-400' : 'text-cream'}`}>
                                        {s.is_available ? 'Créneau disponible' : s.title}
                                      </p>
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.bg} ${statusBadge.color}`}>
                                        {statusBadge.label}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                      </span>
                                      {s.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {s.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      onClick={() => openScheduleModal(s)}
                                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-cream"
                                      title="Modifier"
                                    >
                                      <EditIcon className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(s.id)}
                                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-400"
                                      title="Supprimer"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {daySched.length === 0 && showAvailableOnly && (
                          <div className="px-4 py-3 text-sm text-muted/50 italic">
                            Aucun créneau disponible ce jour.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </EvtReveal>

        </div>
      </main>

      {/* ─── Resolve Alert Modal ──────────────────────────────── */}
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Résoudre l'alerte">
        {resolveModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted mb-1">Converti</p>
              <p className="font-medium text-cream">{resolveModal.converti_name ?? 'Inconnu'}</p>
            </div>
            <div>
              <p className="text-sm text-muted mb-1">Description</p>
              <p className="text-sm text-cream/80">{resolveModal.description}</p>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Notes de résolution</label>
              <textarea
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                placeholder="Décrivez les actions entreprises..."
                rows={4}
                className="input-surface w-full resize-none"
              />
            </div>
            <button onClick={handleResolveAlert} className="btn-gold w-full py-2.5">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Confirmer la résolution
            </button>
          </div>
        )}
      </Modal>

      {/* ─── Planify Visit Modal ──────────────────────────────── */}
      <Modal open={!!planifModal} onClose={() => setPlanifModal(null)} title="Planifier la visite">
        {planifModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted mb-1">Bénéficiaire</p>
              <p className="font-medium text-cream">{planifModal.beneficiary_name}</p>
              <p className="text-xs text-muted mt-0.5">{planifModal.beneficiary_address}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={planifDate}
                  onChange={e => setPlanifDate(e.target.value)}
                  className="input-surface w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Heure</label>
                <input
                  type="time"
                  value={planifTime}
                  onChange={e => setPlanifTime(e.target.value)}
                  className="input-surface w-full"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!planifDate) { addToast('Veuillez choisir une date.', 'error'); return; }
                handleVisitAction(planifModal.id, 'planifier', { preferred_date: planifDate, preferred_time: planifTime });
                setPlanifModal(null);
              }}
              className="btn-gold w-full py-2.5"
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Confirmer la planification
            </button>
          </div>
        )}
      </Modal>

      {/* ─── Visit Notes Modal ────────────────────────────────── */}
      <Modal open={!!notesModal} onClose={() => setNotesModal(null)} title="Notes de visite">
        {notesModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted mb-1">Bénéficiaire</p>
              <p className="font-medium text-cream">{notesModal.beneficiary_name}</p>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Notes pastorales</label>
              <textarea
                value={vrNotes}
                onChange={e => setVrNotes(e.target.value)}
                placeholder="Ajoutez vos observations..."
                rows={4}
                className="input-surface w-full resize-none"
              />
            </div>
            <button
              onClick={() => {
                handleVisitAction(notesModal.id, 'notes', { pastor_notes: vrNotes });
                setNotesModal(null);
              }}
              className="btn-gold w-full py-2.5"
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Enregistrer les notes
            </button>
          </div>
        )}
      </Modal>

      {/* ─── Schedule Modal ───────────────────────────────────── */}
      <Modal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title={scheduleModal ? 'Modifier le créneau' : 'Nouveau créneau'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Titre *</label>
            <input
              type="text"
              value={schedTitle}
              onChange={e => setSchedTitle(e.target.value)}
              placeholder="Ex: Visite familiale..."
              className="input-surface w-full"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1">Date *</label>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="input-surface w-full" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Début *</label>
              <input type="time" value={schedStartTime} onChange={e => setSchedStartTime(e.target.value)} className="input-surface w-full" />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Fin *</label>
              <input type="time" value={schedEndTime} onChange={e => setSchedEndTime(e.target.value)} className="input-surface w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted mb-1">Type</label>
              <select value={schedType} onChange={e => setSchedType(e.target.value as PastorSchedule['type'])} className="input-surface w-full">
                <option value="visite">Visite</option>
                <option value="entretien">Entretien</option>
                <option value="culte">Culte</option>
                <option value="reunion">Réunion</option>
                <option value="formation">Formation</option>
                <option value="personnel">Personnel</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Lieu</label>
              <input type="text" value={schedLocation} onChange={e => setSchedLocation(e.target.value)} placeholder="Adresse ou lieu" className="input-surface w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Description</label>
            <textarea value={schedDesc} onChange={e => setSchedDesc(e.target.value)} placeholder="Détails..." rows={3} className="input-surface w-full resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
            <input
              type="checkbox"
              checked={schedIsAvailable}
              onChange={e => setSchedIsAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-evangile-600"
            />
            Créneau disponible pour les demandes de visite
          </label>
          <button onClick={handleSaveSchedule} className="btn-gold w-full py-2.5">
            <CheckCircle className="h-4 w-4 inline mr-2" />
            {scheduleModal ? 'Enregistrer les modifications' : 'Créer le créneau'}
          </button>
        </div>
      </Modal>
      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="pastoral" />
    </div>
  );
}

// ─── Edit Icon (inline since not in icons.ts) ───────────────────────

function EditIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}