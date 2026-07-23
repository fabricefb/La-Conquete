import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { db } from '../lib/supabase';
import { useReveal } from '../lib/hooks';
import {
  Calendar, MapPin, Phone, User, Plus, Search, ChevronRight, Clock,
  AlertTriangle, CheckCircle, ArrowRight, X, Filter, Users, Home, Heart,
  Eye, BookOpen,
} from '../lib/icons';
import type { Converti, ConvertiPipelineStage, ConvertiTimeline } from '../types';
import type { Page } from '../lib/navigation';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import type { LucideIcon } from '../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   CRM Convertis — Pipeline Kanban
   ═══════════════════════════════════════════════════════════════════ */

interface CrmPageProps { onNavigate: (page: Page) => void }

// ─── Pipeline stages ───────────────────────────────────────────────
const PIPELINE_STAGES: { key: ConvertiPipelineStage; label: string; color: string; border: string; bg: string; icon: string }[] = [
  { key: 'nouveau',          label: 'Nouveau Converti', color: 'text-sky-400',    border: 'border-sky-500',    bg: 'bg-sky-500',    icon: 'User' },
  { key: 'premier_contact',  label: 'Premier Contact',  color: 'text-cyan-400',   border: 'border-cyan-500',   bg: 'bg-cyan-500',   icon: 'Phone' },
  { key: 'visite_domicile',  label: 'Visite Domicile',  color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500', icon: 'Home' },
  { key: 'cellule',          label: 'En Cellule',        color: 'text-amber-400',  border: 'border-amber-500',  bg: 'bg-amber-500',  icon: 'Users' },
  { key: 'cours_bapteme',    label: 'Cours Baptême',     color: 'text-orange-400', border: 'border-orange-500', bg: 'bg-orange-500', icon: 'BookOpen' },
  { key: 'membre_actif',     label: 'Membre Actif',      color: 'text-accent-500',   border: 'border-evangile-600',   bg: 'bg-accent-500',   icon: 'CheckCircle' },
];

const ICON_MAP: Record<string, LucideIcon> = { User, Phone, Home, Users, BookOpen, CheckCircle };

const SOURCE_LABELS: Record<string, string> = {
  evangelisation: 'Évangélisation',
  croisade: 'Croisade',
  visite: 'Visite',
  internet: 'Internet',
  ami: 'Ami',
  media: 'Média',
  autre: 'Autre',
};

const REQUEST_LABELS: Record<string, string> = {
  priere: 'Prière',
  conseil: 'Conseil',
  visite: 'Visite',
  information: 'Information',
  relation_aide: "Relation d'aide",
};

const AGE_LABELS: Record<string, string> = {
  moins_18: 'Moins de 18',
  '18_25': '18–25',
  '26_35': '26–35',
  '36_50': '36–50',
  plus_50: 'Plus de 50',
};

// ─── Helpers ───────────────────────────────────────────────────────
function timeSince(dateStr: string): { text: string; danger: boolean } {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const hours = Math.floor((now - then) / 36e5);
  if (hours < 1) return { text: "À l'instant", danger: false };
  if (hours < 24) return { text: `${hours}h`, danger: false };
  const days = Math.floor(hours / 24);
  if (days === 1) return { text: '1 jour', danger: hours > 72 };
  return { text: `${days} jours`, danger: hours > 72 };
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStageIndex(stage: ConvertiPipelineStage): number {
  return PIPELINE_STAGES.findIndex(s => s.key === stage);
}

// ─── Form types ────────────────────────────────────────────────────
interface FormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  quartier: string;
  zone: string;
  gender: string;
  age_range: string;
  request_type: string;
  source: string;
  event_id: string;
  needs_pastoral_care: boolean;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

const EMPTY_FORM: FormData = {
  first_name: '', last_name: '', phone: '', email: '',
  quartier: '', zone: '', gender: '', age_range: '',
  request_type: '', source: '', event_id: '',
  needs_pastoral_care: false, notes: '',
};

function validateForm(f: FormData): FormErrors {
  const e: FormErrors = {};
  if (!f.first_name.trim()) e.first_name = 'Le prénom est requis.';
  if (!f.last_name.trim()) e.last_name = 'Le nom est requis.';
  if (!f.phone.trim()) e.phone = 'Le téléphone est requis.';
  else if (!/^[\d\s+()-]{7,20}$/.test(f.phone.trim())) e.phone = 'Format de téléphone invalide.';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Format d\'email invalide.';
  return e;
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
export function CrmPage({ onNavigate }: CrmPageProps) {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const { colorMode, toggleColorMode } = useDynamicTheme();

  // ── Auth guard ───────────────────────────────────────────────
  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="glass rounded-2xl p-10 text-center max-w-md">
          <p className="font-serif text-xl font-semibold mb-2">Connexion requise</p>
          <p className="text-sm text-muted mb-6">Vous devez être connecté pour accéder au CRM.</p>
          <button onClick={() => onNavigate('connexion')} className="btn-gold">Se connecter</button>
        </div>
      </div>
    );
  }

  // ── Data state ──────────────────────────────────────────────────
  const [convertis, setConvertis] = useState<Converti[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEvangelist, setFilterEvangelist] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedConverti, setSelectedConverti] = useState<Converti | null>(null);
  const [timeline, setTimeline] = useState<ConvertiTimeline[]>([]);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const { ref: heroRef, visible: heroVisible } = useReveal<HTMLDivElement>();

  // ── Fetch convertis ──────────────────────────────────────────────
  const fetchConvertis = async () => {
    setLoading(true);
    try {
      const data = await db.getConvertis(undefined, filterEvangelist || undefined);
      setConvertis(data);
    } catch (err) {
      console.error('Erreur chargement convertis:', err);
      addToast('Erreur de chargement des convertis', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConvertis(); }, [filterEvangelist]);

  // ── Unique lists for filters ─────────────────────────────────────
  const evangelists = useMemo(() => {
    const set = new Set(convertis.map(c => c.evangelist_name).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [convertis]);

  const zones = useMemo(() => {
    const set = new Set(convertis.map(c => c.zone).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [convertis]);

  // ── Filtered convertis ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return convertis.filter(c => {
      if (filterZone && c.zone !== filterZone) return false;
      if (filterSource && c.source !== filterSource) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${c.first_name} ${c.last_name} ${c.phone ?? ''} ${c.quartier ?? ''} ${c.zone ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [convertis, filterZone, filterSource, search]);

  // ── Stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filtered.length;
    const perStage: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) perStage[s.key] = 0;
    let alertCount = 0;
    for (const c of filtered) {
      perStage[c.pipeline_stage] = (perStage[c.pipeline_stage] ?? 0) + 1;
      if (timeSince(c.pipeline_updated_at).danger) alertCount++;
    }
    return { total, perStage, alertCount };
  }, [filtered]);

  // ── Column data ─────────────────────────────────────────────────
  const columns = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      ...stage,
      Icon: ICON_MAP[stage.icon] ?? User,
      cards: filtered.filter(c => c.pipeline_stage === stage.key),
      count: stats.perStage[stage.key] ?? 0,
    }));
  }, [filtered, stats]);

  // ── Handlers ────────────────────────────────────────────────────
  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
      needs_pastoral_care: false,
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const closeAddModal = () => setShowAddModal(false);

  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmitForm = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      await db.upsertConverti({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        quartier: form.quartier.trim() || undefined,
        zone: form.zone.trim() || undefined,
        gender: (form.gender || undefined) as Converti['gender'],
        age_range: (form.age_range || undefined) as Converti['age_range'],
        request_type: (form.request_type || undefined) as Converti['request_type'],
        source: (form.source || 'evangelisation') as Converti['source'],
        event_id: form.event_id.trim() || undefined,
        needs_pastoral_care: form.needs_pastoral_care,
        notes: form.notes.trim() || undefined,
        evangelist_id: user?.id,
        evangelist_name: profile?.full_name ?? undefined,
        pipeline_stage: 'nouveau',
        pipeline_updated_at: new Date().toISOString(),
        created_by: user?.id ?? '',
        visit_done: false,
        bapteme_saint_esprit: false,
      });
      addToast('Converti enregistré avec succès !', 'success');
      closeAddModal();
      fetchConvertis();
    } catch (err: any) {
      addToast(err?.message ?? 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDrawer = async (c: Converti) => {
    setSelectedConverti(c);
    setAdvanceNotes('');
    setShowDrawer(true);
    try {
      const tl = await db.getConvertiTimeline(c.id);
      setTimeline(tl);
    } catch {
      setTimeline([]);
    }
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setSelectedConverti(null);
    setTimeline([]);
  };

  const handleAdvance = async (convertiId: string, notes: string) => {
    if (!selectedConverti) return;
    const idx = getStageIndex(selectedConverti.pipeline_stage);
    if (idx >= PIPELINE_STAGES.length - 1) {
      addToast('Ce converti est déjà au stade final.', 'info');
      return;
    }
    const nextStage = PIPELINE_STAGES[idx + 1].key;
    setAdvancing(convertiId);
    try {
      await db.advanceConvertiStage(convertiId, nextStage, notes, user?.id ?? '');
      addToast(`${selectedConverti.first_name} avancé(e) vers "${PIPELINE_STAGES[idx + 1].label}"`, 'success');
      setShowAdvanceConfirm(null);
      setAdvanceNotes('');
      closeDrawer();
      fetchConvertis();
    } catch (err: any) {
      addToast(err?.message ?? 'Erreur lors de l\'avancement', 'error');
    } finally {
      setAdvancing(null);
    }
  };

  const handleQuickAdvance = async (c: Converti) => {
    const idx = getStageIndex(c.pipeline_stage);
    if (idx >= PIPELINE_STAGES.length - 1) {
      addToast('Ce converti est déjà au stade final.', 'info');
      return;
    }
    const nextStage = PIPELINE_STAGES[idx + 1].key;
    setAdvancing(c.id);
    try {
      await db.advanceConvertiStage(c.id, nextStage, '', user?.id ?? '');
      addToast(`${c.first_name} avancé(e) vers "${PIPELINE_STAGES[idx + 1].label}"`, 'success');
      fetchConvertis();
    } catch (err: any) {
      addToast(err?.message ?? 'Erreur lors de l\'avancement', 'error');
    } finally {
      setAdvancing(null);
    }
  };

  // Close drawer on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) closeDrawer();
    };
    if (showDrawer) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDrawer]);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader onNavigate={onNavigate} activePage="crm" />
      <MobileNav onNavigate={onNavigate} active="crm" />

      <main className="px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto pb-24 pt-32 md:pt-40">
        {/* ── Hero ────────────────────────────────────────────────── */}
        <div
          ref={heroRef}
          className={`evt-reveal ${heroVisible ? 'in' : ''} mb-12`}
        >
          <span className="section-label mb-4 block">Pipeline Spirituel</span>
          <h1 className="text-headline-xl font-playfair mb-3">
            Convertis <span className="gold-text">Pipeline</span>
          </h1>
          <p className="text-muted text-body-lg max-w-2xl">
            Suivez chaque nouvelle âme depuis le premier contact jusqu'à l'intégration
            active dans l'église. Ne laissez personne se perdre en chemin.
          </p>
        </div>

        {/* ── Stats summary ──────────────────────────────────────── */}
        <div className={`evt-reveal evt-reveal-delay-1 ${heroVisible ? 'in' : ''} grid grid-cols-2 md:grid-cols-4 gap-4 mb-8`}>
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-cream">{stats.total}</p>
            <p className="text-muted text-sm mt-1">Dans le pipeline</p>
          </div>
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-cream">{stats.perStage['nouveau'] ?? 0}</p>
            <p className="text-muted text-sm mt-1">Nouveaux</p>
          </div>
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-cream">{stats.perStage['membre_actif'] ?? 0}</p>
            <p className="text-muted text-sm mt-1">Membres actifs</p>
          </div>
          <div className="glass rounded-2xl p-5 text-center">
            <p className={`text-3xl font-bold ${stats.alertCount > 0 ? 'text-accent-500' : 'text-cream'}`}>
              {stats.alertCount}
            </p>
            <p className="text-muted text-sm mt-1">Alertes 72h</p>
          </div>
        </div>

        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div className={`evt-reveal evt-reveal-delay-2 ${heroVisible ? 'in' : ''} flex flex-wrap items-center gap-3 mb-6`}>
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Rechercher un converti..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-surface w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className="btn-ghost !px-5 !py-2.5 !text-sm gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>

          {/* Add button */}
          <button onClick={openAddModal} className="btn-gold !px-5 !py-2.5 !text-sm gap-2">
            <Plus className="w-4 h-4" />
            Nouveau converti
          </button>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────── */}
        {showFilters && (
          <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end animate-fade-in">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Évangéliste</label>
              <select
                value={filterEvangelist}
                onChange={e => setFilterEvangelist(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm"
              >
                <option value="">Tous</option>
                {evangelists.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Zone</label>
              <select
                value={filterZone}
                onChange={e => setFilterZone(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm"
              >
                <option value="">Toutes</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Source</label>
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="input-surface w-full px-3 py-2 text-sm"
              >
                <option value="">Toutes</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setFilterEvangelist(''); setFilterZone(''); setFilterSource(''); setSearch(''); }}
              className="text-sm text-muted hover:text-cream transition-colors underline"
            >
              Réinitialiser
            </button>
          </div>
        )}

        {/* ── Kanban Board ───────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-evangile-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Desktop: horizontal scroll */}
            <div className="hidden md:flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x">
              {columns.map((col) => (
                <KanbanColumn key={col.key} col={col} onCardClick={openDrawer} onQuickAdvance={handleQuickAdvance} advancing={advancing} />
              ))}
            </div>

            {/* Mobile: vertical stack */}
            <div className="md:hidden space-y-6">
              {columns.map((col) => (
                <div key={col.key}>
                  <MobileColumnHeader col={col} />
                  <div className="space-y-3 mt-3">
                    {col.cards.map(c => (
                      <ConvertiCard key={c.id} c={c} onCardClick={openDrawer} onQuickAdvance={handleQuickAdvance} advancing={advancing} />
                    ))}
                    {col.cards.length === 0 && (
                      <p className="text-muted text-sm text-center py-6 opacity-60">Aucun converti</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-muted mx-auto mb-4 opacity-40" />
                <p className="text-muted text-lg">Aucun converti trouvé</p>
                <button onClick={openAddModal} className="btn-gold !px-6 !py-2.5 !text-sm mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter un converti
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />

      {/* ═══ Add Modal ═══════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAddModal} />
          <div className="relative glass-card rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline-md font-playfair">Nouveau Converti</h2>
              <button onClick={closeAddModal} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Row: first + last name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Prénom *</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={e => handleFormChange('first_name', e.target.value)}
                    className={`input-surface w-full px-3 py-2.5 text-sm ${formErrors.first_name ? '!border-evangile-600' : ''}`}
                    placeholder="Jean"
                  />
                  {formErrors.first_name && <p className="text-accent-500 text-xs mt-1">{formErrors.first_name}</p>}
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Nom *</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={e => handleFormChange('last_name', e.target.value)}
                    className={`input-surface w-full px-3 py-2.5 text-sm ${formErrors.last_name ? '!border-evangile-600' : ''}`}
                    placeholder="Dupont"
                  />
                  {formErrors.last_name && <p className="text-accent-500 text-xs mt-1">{formErrors.last_name}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Téléphone *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => handleFormChange('phone', e.target.value)}
                    className={`input-surface w-full pl-10 pr-4 py-2.5 text-sm ${formErrors.phone ? '!border-evangile-600' : ''}`}
                    placeholder="+243 812 345 678"
                  />
                </div>
                {formErrors.phone && <p className="text-accent-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleFormChange('email', e.target.value)}
                  className={`input-surface w-full px-3 py-2.5 text-sm ${formErrors.email ? '!border-evangile-600' : ''}`}
                  placeholder="jean@exemple.com"
                />
                {formErrors.email && <p className="text-accent-500 text-xs mt-1">{formErrors.email}</p>}
              </div>

              {/* Quartier + Zone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Quartier</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      value={form.quartier}
                      onChange={e => handleFormChange('quartier', e.target.value)}
                      className="input-surface w-full pl-10 pr-4 py-2.5 text-sm"
                      placeholder="Matonge"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Zone</label>
                  <input
                    type="text"
                    value={form.zone}
                    onChange={e => handleFormChange('zone', e.target.value)}
                    className="input-surface w-full px-3 py-2.5 text-sm"
                    placeholder="Zone Sud"
                  />
                </div>
              </div>

              {/* Gender + Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Genre</label>
                  <select
                    value={form.gender}
                    onChange={e => handleFormChange('gender', e.target.value)}
                    className="input-surface w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">—</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Tranche d'âge</label>
                  <select
                    value={form.age_range}
                    onChange={e => handleFormChange('age_range', e.target.value)}
                    className="input-surface w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">—</option>
                    {Object.entries(AGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Request type + Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Type de demande</label>
                  <select
                    value={form.request_type}
                    onChange={e => handleFormChange('request_type', e.target.value)}
                    className="input-surface w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">—</option>
                    {Object.entries(REQUEST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Source</label>
                  <select
                    value={form.source}
                    onChange={e => handleFormChange('source', e.target.value)}
                    className="input-surface w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">—</option>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Event */}
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Événement</label>
                <input
                  type="text"
                  value={form.event_id}
                  onChange={e => handleFormChange('event_id', e.target.value)}
                  className="input-surface w-full px-3 py-2.5 text-sm"
                  placeholder="Nom de l'événement (optionnel)"
                />
              </div>

              {/* Pastoral care */}
              <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                <div
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.needs_pastoral_care ? 'bg-evangile-600' : 'bg-white/10'}`}
                  onClick={() => handleFormChange('needs_pastoral_care', !form.needs_pastoral_care)}
                  role="switch"
                  aria-checked={form.needs_pastoral_care}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.needs_pastoral_care ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm">Nécessite un suivi pastoral</span>
              </label>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  className="input-surface w-full px-3 py-2.5 text-sm min-h-[80px] resize-y"
                  placeholder="Observations, contexte, etc."
                />
              </div>

              {/* Evangelist (auto) */}
              {profile?.full_name && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <User className="w-4 h-4" />
                  Évangéliste : <span className="text-cream">{profile.full_name}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmitForm}
                disabled={submitting}
                className="btn-gold w-full !py-3.5 !text-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Enregistrer le converti
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Detail Drawer ══════════════════════════════════════════ */}
      {showDrawer && selectedConverti && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDrawer} />
          <div
            ref={drawerRef}
            className="relative w-full max-w-md bg-bg-elevated border-l border-line h-full overflow-y-auto animate-fade-in"
          >
            {/* Header */}
            <div className="sticky top-0 bg-bg-elevated/90 backdrop-blur-md border-b border-line p-5 flex items-center justify-between z-10">
              <h2 className="text-headline-md font-playfair truncate pr-4">
                {selectedConverti.first_name} {selectedConverti.last_name}
              </h2>
              <button onClick={closeDrawer} className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Current stage badge */}
              <div className="flex items-center gap-2">
                {(() => {
                  const stage = PIPELINE_STAGES.find(s => s.key === selectedConverti.pipeline_stage);
                  const StageIcon = stage ? (ICON_MAP[stage.icon] ?? User) : User;
                  return stage ? (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${stage.bg}/20 ${stage.color}`}>
                      <StageIcon className="w-3.5 h-3.5" />
                      {stage.label}
                    </span>
                  ) : null;
                })()}
                <span className="text-xs text-muted">
                  Mis à jour {timeSince(selectedConverti.pipeline_updated_at).text}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid gap-3">
                <InfoRow icon={Phone} label="Téléphone" value={selectedConverti.phone} />
                <InfoRow icon={MapPin} label="Quartier" value={selectedConverti.quartier} />
                <InfoRow icon={MapPin} label="Zone" value={selectedConverti.zone} />
                <InfoRow icon={User} label="Genre" value={selectedConverti.gender === 'homme' ? 'Homme' : selectedConverti.gender === 'femme' ? 'Femme' : undefined} />
                <InfoRow icon={Calendar} label="Tranche d'âge" value={selectedConverti.age_range ? AGE_LABELS[selectedConverti.age_range] : undefined} />
                <InfoRow icon={Heart} label="Source" value={selectedConverti.source ? SOURCE_LABELS[selectedConverti.source] : undefined} />
                <InfoRow icon={Eye} label="Demande" value={selectedConverti.request_type ? REQUEST_LABELS[selectedConverti.request_type] : undefined} />
                <InfoRow icon={User} label="Évangéliste" value={selectedConverti.evangelist_name} />
                {selectedConverti.cellule_name && <InfoRow icon={Users} label="Cellule" value={selectedConverti.cellule_name} />}
              </div>

              {/* Pastoral care badge */}
              {selectedConverti.needs_pastoral_care && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent-400/10 border border-accent-400/30">
                  <AlertTriangle className="w-4 h-4 text-accent-500 flex-shrink-0" />
                  <span className="text-sm text-accent-500 font-semibold">Suivi pastoral requis</span>
                </div>
              )}

              {/* Notes */}
              {selectedConverti.notes && (
                <div>
                  <h3 className="text-label-lg text-muted uppercase tracking-wider mb-2">Notes</h3>
                  <p className="text-sm text-cream/80 whitespace-pre-wrap leading-relaxed">{selectedConverti.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-label-lg text-muted uppercase tracking-wider mb-3">Historique</h3>
                {timeline.length === 0 ? (
                  <p className="text-muted text-sm opacity-60">Aucun historique disponible</p>
                ) : (
                  <div className="relative pl-6 space-y-4">
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-line" />
                    {timeline.map((entry) => (
                      <div key={entry.id} className="relative">
                        <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-evangile-600 border-2 border-bg-elevated" />
                        <div>
                          <p className="text-sm font-semibold text-cream">{entry.action}</p>
                          {entry.notes && <p className="text-xs text-muted mt-0.5">{entry.notes}</p>}
                          <p className="text-xs text-muted mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateFR(entry.created_at)}
                            {entry.done_by_name && <span className="ml-2">par {entry.done_by_name}</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Advance button */}
              {getStageIndex(selectedConverti.pipeline_stage) < PIPELINE_STAGES.length - 1 && (
                <div className="pt-4 border-t border-line">
                  {showAdvanceConfirm === selectedConverti.id ? (
                    <div className="space-y-3 animate-fade-in">
                      <textarea
                        value={advanceNotes}
                        onChange={e => setAdvanceNotes(e.target.value)}
                        className="input-surface w-full px-3 py-2.5 text-sm min-h-[70px] resize-y"
                        placeholder="Notes sur cette transition (optionnel)..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdvance(selectedConverti.id, advanceNotes)}
                          disabled={advancing === selectedConverti.id}
                          className="btn-gold flex-1 !py-2.5 !text-sm gap-2 disabled:opacity-50"
                        >
                          {advancing === selectedConverti.id ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4" />
                              Confirmer
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => { setShowAdvanceConfirm(null); setAdvanceNotes(''); }}
                          className="btn-ghost !px-4 !py-2.5 !text-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAdvanceConfirm(selectedConverti.id)}
                      className="btn-gold w-full !py-3 !text-sm gap-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Avancer vers « {PIPELINE_STAGES[getStageIndex(selectedConverti.pipeline_stage) + 1].label} »
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════ */

// ─── Kanban Column (Desktop) ───────────────────────────────────────
function KanbanColumn({ col, onCardClick, onQuickAdvance, advancing }: {
  col: { key: ConvertiPipelineStage; label: string; color: string; border: string; bg: string; Icon: LucideIcon; cards: Converti[]; count: number };
  onCardClick: (c: Converti) => void;
  onQuickAdvance: (c: Converti) => void;
  advancing: string | null;
}) {
  return (
    <div className="flex-shrink-0 w-[280px] snap-start">
      <div className={`glass rounded-2xl border-t-[3px] ${col.border} overflow-hidden`}>
        {/* Column header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg ${col.bg}/20 flex items-center justify-center`}>
              <col.Icon className={`w-4 h-4 ${col.color}`} />
            </div>
            <h3 className="text-sm font-semibold text-cream truncate">{col.label}</h3>
          </div>
          <span className="text-xs font-bold text-muted bg-white/5 px-2 py-0.5 rounded-full">{col.count}</span>
        </div>

        {/* Cards */}
        <div className="p-3 space-y-3 min-h-[120px] max-h-[calc(100vh-320px)] overflow-y-auto">
          {col.cards.map(c => (
            <ConvertiCard key={c.id} c={c} onCardClick={onCardClick} onQuickAdvance={onQuickAdvance} advancing={advancing} />
          ))}
          {col.cards.length === 0 && (
            <p className="text-muted text-xs text-center py-8 opacity-50">Vide</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Column Header ──────────────────────────────────────────
function MobileColumnHeader({ col }: {
  col: { key: ConvertiPipelineStage; label: string; color: string; border: string; bg: string; Icon: LucideIcon; cards: Converti[]; count: number };
}) {
  return (
    <div className={`flex items-center justify-between px-1`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg ${col.bg}/20 flex items-center justify-center`}>
          <col.Icon className={`w-4 h-4 ${col.color}`} />
        </div>
        <h3 className="text-sm font-semibold text-cream">{col.label}</h3>
      </div>
      <span className="text-xs font-bold text-muted bg-white/5 px-2 py-0.5 rounded-full">{col.count}</span>
    </div>
  );
}

// ─── Converti Card ─────────────────────────────────────────────────
function ConvertiCard({ c, onCardClick, onQuickAdvance, advancing }: {
  c: Converti;
  onCardClick: (c: Converti) => void;
  onQuickAdvance: (c: Converti) => void;
  advancing: string | null;
}) {
  const timeInfo = timeSince(c.pipeline_updated_at);
  const isDanger = timeInfo.danger;
  const canAdvance = getStageIndex(c.pipeline_stage) < PIPELINE_STAGES.length - 1;

  return (
    <div
      className={`relative rounded-xl p-3 cursor-pointer transition-all duration-200 hover:brightness-110 ${
        isDanger
          ? 'bg-accent-400/5 border-2 border-evangile-600 animate-pulse-gold'
          : 'glass'
      }`}
      onClick={() => onCardClick(c)}
    >
      {/* Name */}
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-sm font-bold text-cream leading-tight truncate pr-2">
          {c.first_name} {c.last_name}
        </p>
        <span className={`text-[10px] font-semibold flex-shrink-0 whitespace-nowrap ${isDanger ? 'text-accent-500' : 'text-muted'}`}>
          {isDanger && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
          {timeInfo.text}
        </span>
      </div>

      {isDanger && (
        <p className="text-[10px] text-accent-500 font-bold mb-1.5">⚠ Âme en danger !</p>
      )}

      {/* Phone + quartier */}
      <div className="space-y-0.5 mb-2">
        {c.phone && (
          <p className="text-xs text-muted flex items-center gap-1 truncate">
            <Phone className="w-3 h-3 flex-shrink-0" />
            {c.phone}
          </p>
        )}
        {c.quartier && (
          <p className="text-xs text-muted flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {c.quartier}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {c.source && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-medium">
            {SOURCE_LABELS[c.source] ?? c.source}
          </span>
        )}
        {c.needs_pastoral_care && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-400/15 text-accent-500 font-medium flex items-center gap-0.5">
            <Heart className="w-2.5 h-2.5" />
            Pastoral
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <a
          href={c.phone ? `tel:${c.phone}` : undefined}
          onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
        >
          <Phone className="w-3 h-3" />
          Appeler
        </a>
        <button
          onClick={e => { e.stopPropagation(); onCardClick(c); }}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Home className="w-3 h-3" />
          Visiter
        </button>
        {canAdvance && (
          <button
            onClick={e => { e.stopPropagation(); onQuickAdvance(c); }}
            disabled={advancing === c.id}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {advancing === c.id ? (
              <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
            Avancer
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Info Row (drawer) ─────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-1">
      <Icon className="w-4 h-4 text-muted flex-shrink-0" />
      <span className="text-xs text-muted w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-cream">{value}</span>
    </div>
  );
}