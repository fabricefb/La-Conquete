import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { db, supabase } from '../lib/supabase';
import {
  BarChart3, FileText, Plus, Search, Download,
  TrendingUp, TrendingDown, Users, BookOpen, Heart,
  DollarSign, MapPin, Calendar, Filter, CheckCircle,
  X, Eye, ChevronDown, Save, Send,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { MissionReport, MissionFinance, ImpactCounter, ChurchEvent } from '../types';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface ReportsPageProps {
  onNavigate: (page: Page) => void;
}

type PeriodKey = 'mois' | 'trimestre' | 'annee';
type Currency = 'USD' | 'CDF' | 'EUR';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  mois: 'Ce mois',
  trimestre: 'Ce trimestre',
  annee: 'Cette année',
};

interface ImpactCard {
  key: keyof ImpactCounter;
  label: string;
  Icon: React.FC<{ className?: string }>;
  color: string;
}

const IMPACT_CARDS: ImpactCard[] = [
  { key: 'persons_contacted', label: 'Personnes contactées', Icon: Users, color: 'text-sky-400' },
  { key: 'decisions', label: 'Décisions pour Christ', Icon: Heart, color: 'text-accent-400' },
  { key: 'bibles_distributed', label: 'Bibles distribuées', Icon: BookOpen, color: 'text-ember-400' },
  { key: 'baptisms_water', label: 'Baptêmes d\'eau', Icon: CheckCircle, color: 'text-sky-300' },
  { key: 'new_active_members', label: 'Nouveaux membres actifs', Icon: Users, color: 'text-accent-300' },
  { key: 'prayer_requests_answered', label: 'Requêtes de prière exaucées', Icon: Heart, color: 'text-ember-400' },
];

const PIPELINE_STAGES = [
  { key: 'nouveau', label: 'Nouveau converti' },
  { key: 'premier_contact', label: 'Premier contact' },
  { key: 'visite_domicile', label: 'Visite à domicile' },
  { key: 'cellule', label: 'Intégré cellule' },
  { key: 'cours_bapteme', label: 'Cours de baptême' },
  { key: 'membre_actif', label: 'Membre actif' },
];

const PIPELINE_COLORS = [
  'bg-sky-500', 'bg-sky-400', 'bg-evangile-400', 'bg-accent-500', 'bg-ember-400', 'bg-evangile-700',
];

const MONTH_NAMES = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

function fmtCurrency(n: number, currency: Currency): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function getPeriodRange(period: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  if (period === 'mois') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3);
    start.setMonth(q * 3, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(q * 3 + 3, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

/* ═══════════════════════════════════════════════════════════════════
   Intersection Observer (scroll reveal)
   ═══════════════════════════════════════════════════════════════════ */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useReveal();
  return (
    <div ref={ref} className={`evt-reveal ${inView ? 'in' : ''} ${delay ? `evt-reveal-delay-${delay}` : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Empty form states
   ═══════════════════════════════════════════════════════════════════ */

const emptyReportForm = {
  event_id: '',
  zone_name: '',
  report_date: new Date().toISOString().slice(0, 10),
  persons_contacted: 0,
  decisions_count: 0,
  bibles_distributed: 0,
  tracts_distributed: 0,
  new_contacts_count: 0,
  highlights: '',
  challenges: '',
  testimonies: '',
  photo_url: '',
  status: 'draft' as 'draft' | 'submitted',
};

const emptyFinanceForm = {
  event_id: '',
  budget_allocated: 0,
  transport_costs: 0,
  material_costs: 0,
  special_offering: 0,
  currency: 'USD' as Currency,
  notes: '',
};

/* ═══════════════════════════════════════════════════════════════════
   ReportsPage
   ═══════════════════════════════════════════════════════════════════ */

export function ReportsPage({ onNavigate }: ReportsPageProps) {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const { themeSettings, colorMode, toggleColorMode } = useDynamicTheme();

  // ── Data ────────────────────────────────────────────────
  const [counters, setCounters] = useState<ImpactCounter[]>([]);
  const [reports, setReports] = useState<MissionReport[]>([]);
  const [finances, setFinances] = useState<MissionFinance[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);

  // ── UI state ────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodKey>('mois');
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reportFilter, setReportFilter] = useState<'all' | 'draft' | 'submitted' | 'reviewed'>('all');
  const [financePeriod, setFinancePeriod] = useState<PeriodKey>('mois');

  // ── Forms ───────────────────────────────────────────────
  const [reportForm, setReportForm] = useState(emptyReportForm);
  const [financeForm, setFinanceForm] = useState(emptyFinanceForm);
  const [savingReport, setSavingReport] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);

  // ── Pipeline mock data (from reports) ───────────────────
  const [pipelineData, setPipelineData] = useState<Record<string, number>>({});

  // ── Load data ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r, f, e] = await Promise.all([
        db.getImpactCounters(),
        db.getMissionReports(),
        db.getMissionFinances(),
        db.getEvents(),
      ]);
      setCounters(c);
      setReports(r);
      setFinances(f);
      setEvents(e.filter(ev => ev.category === 'Missions' || ev.is_featured));
    } catch (err) {
      console.error('Reports load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Compute pipeline data from reports ──────────────────
  useEffect(() => {
    const data: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) data[s.key] = 0;
    // Use reports to estimate funnel
    data.nouveau = reports.reduce((s, r) => s + r.new_contacts_count, 0);
    data.premier_contact = reports.reduce((s, r) => s + r.persons_contacted, 0);
    data.membre_actif = reports.reduce((s, r) => s + r.decisions_count, 0);
    const maxVal = Math.max(...Object.values(data), 1);
    const normalized: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) normalized[s.key] = (data[s.key] / maxVal) * 100;
    setPipelineData(normalized);
  }, [reports]);

  // ── Period-filtered impact totals ───────────────────────
  const { start: pStart, end: pEnd } = getPeriodRange(period);
  const filteredCounters = counters.filter(c => {
    const d = new Date(c.period_value);
    return d >= pStart && d <= pEnd;
  });
  const periodTotals = IMPACT_CARDS.reduce<Record<string, number>>((acc, card) => {
    acc[card.key] = filteredCounters.reduce((s, c) => s + (Number(c[card.key]) || 0), 0);
    return acc;
  }, {});
  const allTimeTotals = IMPACT_CARDS.reduce<Record<string, number>>((acc, card) => {
    acc[card.key] = counters.reduce((s, c) => s + (Number(c[card.key]) || 0), 0);
    return acc;
  }, {});

  // ── Monthly chart data (last 6 months) ─────────────────
  const monthlyData = (() => {
    const now = new Date();
    const months: { label: string; value: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const val = counters
        .filter(c => c.period_value === key)
        .reduce((s, c) => s + (c.persons_contacted ?? 0), 0);
      months.push({ label: MONTH_NAMES[d.getMonth()], value: val, month: d.getMonth() });
    }
    const max = Math.max(...months.map(m => m.value), 1);
    return months.map(m => ({ ...m, pct: (m.value / max) * 100 }));
  })();

  // ── Filtered reports ────────────────────────────────────
  const filteredReports = reports.filter(r => {
    if (reportFilter !== 'all' && r.status !== reportFilter) return false;
    return true;
  });

  // ── Filtered finances ───────────────────────────────────
  const { start: fStart, end: fEnd } = getPeriodRange(financePeriod);
  const filteredFinances = finances.filter(f => {
    const d = new Date(f.created_at);
    return d >= fStart && d <= fEnd;
  });

  // ── Save report ─────────────────────────────────────────
  const handleSaveReport = async (status: 'draft' | 'submitted') => {
    if (!user) return;
    setSavingReport(true);
    try {
      const ev = events.find(e => e.id === reportForm.event_id);
      const payload: Partial<MissionReport> = {
        event_id: reportForm.event_id || undefined,
        event_title: ev?.title,
        zone_name: reportForm.zone_name || undefined,
        report_date: reportForm.report_date,
        persons_contacted: reportForm.persons_contacted,
        decisions_count: reportForm.decisions_count,
        bibles_distributed: reportForm.bibles_distributed,
        tracts_distributed: reportForm.tracts_distributed,
        new_contacts_count: reportForm.new_contacts_count,
        highlights: reportForm.highlights,
        challenges: reportForm.challenges,
        testimonies: reportForm.testimonies || undefined,
        photos: reportForm.photo_url ? [reportForm.photo_url] : undefined,
        reported_by: user.id,
        reported_by_name: profile?.full_name || user.email || '',
        status,
      };
      const { error } = await supabase.from('mission_reports').insert({
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      addToast(status === 'submitted' ? 'Rapport soumis avec succès !' : 'Brouillon enregistré.', 'success');
      setReportForm(emptyReportForm);
      setShowReportForm(false);
      loadData();
    } catch (err: any) {
      addToast(err?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSavingReport(false);
    }
  };

  // ── Save finance ────────────────────────────────────────
  const handleSaveFinance = async () => {
    if (!user) return;
    setSavingFinance(true);
    try {
      const ev = events.find(e => e.id === financeForm.event_id);
      const totalExpenses = financeForm.transport_costs + financeForm.material_costs;
      const balance = financeForm.budget_allocated - totalExpenses + financeForm.special_offering;
      const { error } = await supabase.from('mission_finances').insert({
        event_id: financeForm.event_id || undefined,
        event_title: ev?.title,
        budget_allocated: financeForm.budget_allocated,
        transport_costs: financeForm.transport_costs,
        material_costs: financeForm.material_costs,
        special_offering: financeForm.special_offering,
        total_expenses: totalExpenses,
        balance,
        currency: financeForm.currency,
        notes: financeForm.notes || undefined,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      addToast('Suivi financier enregistré !', 'success');
      setFinanceForm(emptyFinanceForm);
      setShowFinanceForm(false);
      loadData();
    } catch (err: any) {
      addToast(err?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSavingFinance(false);
    }
  };

  // ── Number input helper ─────────────────────────────────
  const numInput = (field: keyof typeof reportForm, form: typeof reportForm, setForm: typeof setReportForm) => (
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
      setForm({ ...form, [field]: v });
    }
  );

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="reports" />

      <main className="pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto space-y-24">

        {/* ═══ Page Header ═══ */}
        <Reveal>
          <div className="space-y-4 text-center">
            <span className="section-label">Rapports & Statistiques</span>
            <h1 className="font-playfair text-headline-xl lg:text-headline-lg text-cream">
              Tableau de bord <span className="gold-text">des missions</span>
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-muted">
              Suivez l&apos;impact de l&apos;évangélisation, consultez les rapports de mission et gérez le suivi financier.
            </p>
          </div>
        </Reveal>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1 — Compteurs d&apos;Impact
            ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <Reveal className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-accent-400" />
              <h2 className="font-playfair text-headline-md text-cream">Compteurs d&apos;Impact</h2>
            </div>
            <div className="flex gap-1 rounded-full border border-line p-1">
              {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    period === p
                      ? 'bg-evangile-600 text-white shadow-lg shadow-accent-500/20'
                      : 'text-muted hover:text-cream'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {IMPACT_CARDS.map((card, i) => {
              const Icon = card.Icon;
              const periodVal = periodTotals[card.key] ?? 0;
              const totalVal = allTimeTotals[card.key] ?? 0;
              const trend = totalVal > 0 ? Math.round(((periodVal / totalVal) * 100)) : 0;
              return (
                <Reveal key={card.key} delay={Math.min(i, 4) as 1 | 2 | 3 | 4}>
                  <div className="glass-card rounded-2xl p-4 lg:p-5 space-y-3 text-center transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-accent-500/5">
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-bg-card ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-be-vn text-2xl lg:text-3xl font-bold text-cream">{fmt(periodVal)}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{card.label}</p>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[10px]">
                      {periodVal >= (totalVal / 12 || 1) ? (
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-accent-400" />
                      )}
                      <span className="text-muted">{trend}% de la période</span>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2 — Rapports de Mission
            ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-accent-400" />
              <h2 className="font-playfair text-headline-md text-cream">Rapports de Mission</h2>
            </div>
            <button
              onClick={() => { setShowReportForm(!showReportForm); setShowFinanceForm(false); }}
              className="btn-gold px-5 py-2.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              Nouveau rapport
            </button>
          </Reveal>

          {/* ── Report Form ──────────────────────────────── */}
          {showReportForm && (
            <Reveal className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-label-lg text-cream">Soumettre un rapport</h3>
                <button onClick={() => setShowReportForm(false)} className="text-muted hover:text-cream transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Event select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Événement</label>
                  <select
                    value={reportForm.event_id}
                    onChange={e => setReportForm({ ...reportForm, event_id: e.target.value })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                  >
                    <option value="">— Sélectionner —</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
                {/* Zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                    <MapPin className="inline h-3 w-3 mr-1" />Zone
                  </label>
                  <input
                    type="text"
                    value={reportForm.zone_name}
                    onChange={e => setReportForm({ ...reportForm, zone_name: e.target.value })}
                    placeholder="Ex: Matonge, Lemba..."
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                    <Calendar className="inline h-3 w-3 mr-1" />Date
                  </label>
                  <input
                    type="date"
                    value={reportForm.report_date}
                    onChange={e => setReportForm({ ...reportForm, report_date: e.target.value })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                  />
                </div>
              </div>

              {/* Count inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {([
                  ['persons_contacted', 'Personnes contactées'],
                  ['decisions_count', 'Décisions'],
                  ['bibles_distributed', 'Bibles'],
                  ['tracts_distributed', 'Tracts'],
                  ['new_contacts_count', 'Nvx contacts'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={(reportForm as any)[key] ?? 0}
                      onChange={numInput(key as any, reportForm, setReportForm)}
                      className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Textareas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  ['highlights', 'Points forts'],
                  ['challenges', 'Défis rencontrés'],
                  ['testimonies', 'Témoignages'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
                    <textarea
                      rows={3}
                      value={(reportForm as any)[key] ?? ''}
                      onChange={e => setReportForm({ ...reportForm, [key]: e.target.value })}
                      placeholder={`Décrivez ${label.toLowerCase()}...`}
                      className="input-surface w-full rounded-xl px-4 py-3 text-sm resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Photo URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">URL de photo</label>
                <input
                  type="url"
                  value={reportForm.photo_url}
                  onChange={e => setReportForm({ ...reportForm, photo_url: e.target.value })}
                  placeholder="https://exemple.com/photo.jpg"
                  className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => handleSaveReport('draft')}
                  disabled={savingReport}
                  className="btn-ghost px-5 py-2.5 text-xs"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer brouillon
                </button>
                <button
                  onClick={() => handleSaveReport('submitted')}
                  disabled={savingReport}
                  className="btn-gold px-5 py-2.5 text-xs"
                >
                  <Send className="h-4 w-4" />
                  Soumettre
                </button>
              </div>
            </Reveal>
          )}

          {/* ── Filter ──────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="h-4 w-4 text-muted shrink-0" />
            {(['all', 'draft', 'submitted', 'reviewed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setReportFilter(s)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  reportFilter === s
                    ? 'bg-evangile-600 text-white'
                    : 'glass-card text-muted hover:text-cream'
                }`}
              >
                {s === 'all' ? 'Tous' : s === 'draft' ? 'Brouillons' : s === 'submitted' ? 'Soumis' : 'Révisés'}
              </button>
            ))}
          </div>

          {/* ── Reports List ────────────────────────────── */}
          {filteredReports.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted/40" />
              <p className="mt-4 text-muted">Aucun rapport trouvé pour cette période.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map(report => {
                const isExpanded = expandedReport === report.id;
                const statusBadge = report.status === 'submitted'
                  ? 'bg-green-500/15 text-green-400'
                  : report.status === 'reviewed'
                    ? 'bg-sky-500/15 text-sky-400'
                    : 'bg-accent-400/15 text-accent-300';

                const statusLabel = report.status === 'submitted'
                  ? 'Soumis'
                  : report.status === 'reviewed'
                    ? 'Révisé'
                    : 'Brouillon';

                return (
                  <div key={report.id} className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
                    <button
                      onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      className="w-full p-5 flex flex-col sm:flex-row sm:items-center gap-4 text-left hover:bg-bg-card-hover/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-cream truncate">{report.event_title || 'Sans titre'}</h4>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          {report.zone_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{report.zone_name}</span>}
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(report.report_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p className="font-bold text-cream">{fmt(report.persons_contacted)}</p>
                          <p className="text-muted text-[10px]">Contactées</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-accent-400">{fmt(report.decisions_count)}</p>
                          <p className="text-muted text-[10px]">Décisions</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-ember-400">{fmt(report.bibles_distributed)}</p>
                          <p className="text-muted text-[10px]">Bibles</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-line px-5 py-5 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <StatPill label="Personnes contactées" value={report.persons_contacted} />
                          <StatPill label="Décisions" value={report.decisions_count} />
                          <StatPill label="Bibles" value={report.bibles_distributed} />
                          <StatPill label="Tracts" value={report.tracts_distributed} />
                          <StatPill label="Nvx contacts" value={report.new_contacts_count} />
                        </div>
                        {report.highlights && <DetailBlock title="Points forts" text={report.highlights} />}
                        {report.challenges && <DetailBlock title="Défis" text={report.challenges} />}
                        {report.testimonies && <DetailBlock title="Témoignages" text={report.testimonies} />}
                        {report.photos && report.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto">
                            {report.photos.map((url, i) => (
                              <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-24 w-24 rounded-xl object-cover shrink-0" />
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted">
                          Par {report.reported_by_name || 'Anonyme'} · {new Date(report.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3 — Suivi Financier des Missions
            ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-accent-400" />
              <h2 className="font-playfair text-headline-md text-cream">Suivi Financier des Missions</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 rounded-full border border-line p-1">
                {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setFinancePeriod(p)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                      financePeriod === p ? 'bg-evangile-600 text-white' : 'text-muted hover:text-cream'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowFinanceForm(!showFinanceForm); setShowReportForm(false); }}
                className="btn-ghost px-4 py-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          </Reveal>

          {/* ── Finance Form ────────────────────────────── */}
          {showFinanceForm && (
            <Reveal className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-label-lg text-cream">Ajouter un suivi financier</h3>
                <button onClick={() => setShowFinanceForm(false)} className="text-muted hover:text-cream transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Événement</label>
                  <select
                    value={financeForm.event_id}
                    onChange={e => setFinanceForm({ ...financeForm, event_id: e.target.value })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                  >
                    <option value="">— Sélectionner —</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Devise</label>
                  <select
                    value={financeForm.currency}
                    onChange={e => setFinanceForm({ ...financeForm, currency: e.target.value as Currency })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Budget alloué</label>
                  <input
                    type="number"
                    min={0}
                    value={financeForm.budget_allocated || ''}
                    onChange={e => setFinanceForm({ ...financeForm, budget_allocated: parseInt(e.target.value) || 0 })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Offrande spéciale</label>
                  <input
                    type="number"
                    min={0}
                    value={financeForm.special_offering || ''}
                    onChange={e => setFinanceForm({ ...financeForm, special_offering: parseInt(e.target.value) || 0 })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Frais transport</label>
                  <input
                    type="number"
                    min={0}
                    value={financeForm.transport_costs || ''}
                    onChange={e => setFinanceForm({ ...financeForm, transport_costs: parseInt(e.target.value) || 0 })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Frais matériel</label>
                  <input
                    type="number"
                    min={0}
                    value={financeForm.material_costs || ''}
                    onChange={e => setFinanceForm({ ...financeForm, material_costs: parseInt(e.target.value) || 0 })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Notes</label>
                  <input
                    type="text"
                    value={financeForm.notes}
                    onChange={e => setFinanceForm({ ...financeForm, notes: e.target.value })}
                    className="input-surface w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="Notes optionnelles..."
                  />
                </div>
              </div>

              {/* Auto-calculated preview */}
              <div className="rounded-xl bg-bg/60 border border-line p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase">Dépenses totales</p>
                  <p className="mt-1 text-lg font-bold text-accent-400">
                    {fmtCurrency(financeForm.transport_costs + financeForm.material_costs, financeForm.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase">Solde</p>
                  <p className={`mt-1 text-lg font-bold ${
                    (financeForm.budget_allocated - financeForm.transport_costs - financeForm.material_costs + financeForm.special_offering) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {fmtCurrency(
                      financeForm.budget_allocated - financeForm.transport_costs - financeForm.material_costs + financeForm.special_offering,
                      financeForm.currency,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase">Budget</p>
                  <p className="mt-1 text-lg font-bold text-cream">
                    {fmtCurrency(financeForm.budget_allocated, financeForm.currency)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveFinance}
                disabled={savingFinance}
                className="btn-gold px-6 py-2.5 text-xs"
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
            </Reveal>
          )}

          {/* ── Finance Table ───────────────────────────── */}
          {filteredFinances.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <DollarSign className="mx-auto h-10 w-10 text-muted/40" />
              <p className="mt-4 text-muted">Aucune donnée financière pour cette période.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted">Événement</th>
                    <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted text-right">Budget</th>
                    <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted text-right">Dépenses</th>
                    <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted text-right">Offrande</th>
                    <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted text-right">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {filteredFinances.map(f => {
                    const cur = f.currency as Currency;
                    return (
                      <tr key={f.id} className="hover:bg-bg-card-hover/20 transition-colors">
                        <td className="py-4 pr-4">
                          <p className="font-medium text-cream">{f.event_title || '—'}</p>
                          {f.notes && <p className="text-[10px] text-muted mt-0.5">{f.notes}</p>}
                        </td>
                        <td className="py-4 pr-4 text-right text-muted">{fmtCurrency(f.budget_allocated, cur)}</td>
                        <td className="py-4 pr-4 text-right text-accent-400">{fmtCurrency(f.total_expenses, cur)}</td>
                        <td className="py-4 pr-4 text-right text-cream">{fmtCurrency(f.special_offering, cur)}</td>
                        <td className={`py-4 text-right font-bold ${f.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtCurrency(f.balance, cur)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4 — Graphiques (CSS Bar Charts)
            ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-8">
          <Reveal>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-accent-400" />
              <h2 className="font-playfair text-headline-md text-cream">Graphiques</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Monthly Impact Bar Chart ───────────────── */}
            <Reveal className="glass-card rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-label-lg text-cream">Impact mensuel</h3>
                <p className="text-xs text-muted mt-1">Personnes contactées · 6 derniers mois</p>
              </div>
              <div className="space-y-3">
                {monthlyData.map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-semibold text-muted text-right">{m.label}</span>
                    <div className="flex-1 h-8 rounded-lg bg-bg-card/60 overflow-hidden relative">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-evangile-700 to-evangile-600 transition-all duration-700 ease-out flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(m.pct, m.value > 0 ? 8 : 0)}%` }}
                      >
                        {m.value > 0 && (
                          <span className="text-[10px] font-bold text-white/90">{fmt(m.value)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* ── Pipeline Conversion Funnel ─────────────── */}
            <Reveal className="glass-card rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-label-lg text-cream">Entonnoir de conversion</h3>
                <p className="text-xs text-muted mt-1">Pipeline des convertis par étape</p>
              </div>
              <div className="space-y-3">
                {PIPELINE_STAGES.map((stage, i) => {
                  const pct = pipelineData[stage.key] ?? 0;
                  return (
                    <div key={stage.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-cream">{stage.label}</span>
                        <span className="text-[10px] text-muted">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-6 rounded-lg bg-bg-card/60 overflow-hidden">
                        <div
                          className={`h-full rounded-lg ${PIPELINE_COLORS[i]} transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

      </main>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="reports" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Small sub-components
   ═══════════════════════════════════════════════════════════════════ */

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bg/60 border border-line p-3 text-center">
      <p className="text-lg font-bold text-cream">{fmt(value)}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1">
      <h5 className="text-xs font-semibold text-accent-400 uppercase tracking-wider">{title}</h5>
      <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}