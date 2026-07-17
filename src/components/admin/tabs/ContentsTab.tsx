import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import ImageUpload from '../ImageUpload';
import {
  Save, Plus, Trash2, X, ChevronDown, ChevronRight,
  Loader2, Home, Info, Flame, Compass, Quote, Users,
  MessageSquare, Calendar, Radio, Video, Building2,
  Megaphone, Heart, MapPin, BookOpen, Eye,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

type ContentType = 'text' | 'html' | 'image_url' | 'url';

interface PageContent {
  id: string;
  page: string;
  section_key: string;
  field_key: string;
  label: string;
  value: string;
  type: ContentType;
  sort_order: number;
  updated_at: string;
}

// ─── Page definitions with icons & section labels ──────────────────

interface SectionDef {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface PageDef {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  sections: SectionDef[];
}

const PAGES: PageDef[] = [
  {
    key: 'home',
    label: 'Page d\'accueil',
    icon: Home,
    description: 'Hero, Piliers, À propos, Citation',
    sections: [
      { key: 'topbar', label: 'Bande passante', icon: Megaphone, description: 'Téléphone, email de contact' },
      { key: 'hero', label: 'Héro plein écran', icon: Home, description: 'Image de fond, sous-titre du héro' },
      { key: 'pillars', label: 'Trois Piliers', icon: Flame, description: 'Foi, Communauté, Mission' },
      { key: 'about', label: 'Qui sommes-nous', icon: Info, description: 'Textes, image et citation' },
      { key: 'quote', label: 'Citation biblique', icon: Quote, description: 'Texte et référence de la citation' },
    ],
  },
  {
    key: 'about',
    label: 'À propos',
    icon: Info,
    description: 'Héro, Vision, Mission, Valeurs',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Badge, titre, sous-titre' },
      { key: 'vision', label: 'Vision', icon: Eye, description: 'Texte de la vision' },
      { key: 'mission', label: 'Mission', icon: Flame, description: 'Texte de la mission' },
      { key: 'values', label: 'Valeurs', icon: Heart, description: 'Titre, sous-titre des valeurs' },
    ],
  },
  {
    key: 'activities',
    label: 'Activités / Culte',
    icon: Calendar,
    description: 'Héro, Ministères, CTA',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Badge, titre, sous-titre' },
      { key: 'ministries', label: 'Ministères', icon: Users, description: 'Titre et sous-titre' },
      { key: 'cta', label: 'Appel à action', icon: Compass, description: 'Titre et description' },
    ],
  },
  {
    key: 'events',
    label: 'Événements',
    icon: Calendar,
    description: 'Héro de la page',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Badge, titre, sous-titre' },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    icon: MapPin,
    description: 'Héro de la page',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Sous-titre' },
    ],
  },
  {
    key: 'departments',
    label: 'Départements',
    icon: Building2,
    description: 'Héro de la page',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Sous-titre' },
    ],
  },
  {
    key: 'media',
    label: 'Médias',
    icon: Video,
    description: 'Héro de la page',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Sous-titre' },
    ],
  },
  {
    key: 'emissions',
    label: 'Émissions',
    icon: Radio,
    description: 'Héro de la page',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Sous-titre' },
    ],
  },
  {
    key: 'predications',
    label: 'Prédications',
    icon: BookOpen,
    description: 'Héro de la page',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Sous-titre' },
    ],
  },
];

// ─── Default seeds: auto-create page_contents rows when page is empty ─

interface SeedField {
  field_key: string;
  label: string;
  type: ContentType;
  value: string;
}

const SEEDS: Record<string, Record<string, SeedField[]>> = {
  home: {
    topbar: [
      { field_key: 'phone', label: 'Téléphone', type: 'text', value: '+243 00 000 0000' },
      { field_key: 'email', label: 'Email', type: 'text', value: 'contact@laconquete.cd' },
    ],
    hero: [
      { field_key: 'bg_image', label: 'Image de fond', type: 'image_url', value: '' },
      { field_key: 'bg_images', label: 'Images diaporama (séparées par ,)', type: 'text', value: '' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: 'Une communauté de foi qui transforme des vies' },
    ],
    pillars: [
      { field_key: 'pillar_1_title', label: 'Pilier 1 — Titre', type: 'text', value: 'Foi' },
      { field_key: 'pillar_1_desc', label: 'Pilier 1 — Description', type: 'text', value: '' },
      { field_key: 'pillar_2_title', label: 'Pilier 2 — Titre', type: 'text', value: 'Communauté' },
      { field_key: 'pillar_2_desc', label: 'Pilier 2 — Description', type: 'text', value: '' },
      { field_key: 'pillar_3_title', label: 'Pilier 3 — Titre', type: 'text', value: 'Mission' },
      { field_key: 'pillar_3_desc', label: 'Pilier 3 — Description', type: 'text', value: '' },
    ],
    about: [
      { field_key: 'text_1', label: 'Texte principal', type: 'text', value: '' },
      { field_key: 'text_2', label: 'Texte secondaire', type: 'text', value: '' },
      { field_key: 'bible_text', label: 'Citation biblique', type: 'text', value: '' },
      { field_key: 'image', label: 'Photo', type: 'image_url', value: '' },
    ],
    quote: [
      { field_key: 'text', label: 'Texte de la citation', type: 'text', value: '' },
      { field_key: 'reference', label: 'Référence', type: 'text', value: '' },
    ],
  },

  // ── À propos ──────────────────────────────────────────────────────
  about: {
    hero: [
      { field_key: 'badge', label: 'Badge', type: 'text', value: '' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    vision: [
      { field_key: 'text', label: 'Texte de la vision', type: 'text', value: '' },
    ],
    mission: [
      { field_key: 'text', label: 'Texte de la mission', type: 'text', value: '' },
    ],
    values: [
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },

  // ── Activités / Culte ─────────────────────────────────────────────
  activities: {
    hero: [
      { field_key: 'badge', label: 'Badge', type: 'text', value: '' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    ministries: [
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    cta: [
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
    ],
  },

  // ── Événements ────────────────────────────────────────────────────
  events: {
    hero: [
      { field_key: 'badge', label: 'Badge', type: 'text', value: '' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },

  // ── Contact ───────────────────────────────────────────────────────
  contact: {
    hero: [
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },

  // ── Départements ──────────────────────────────────────────────────
  departments: {
    hero: [
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },

  // ── Médias ────────────────────────────────────────────────────────
  media: {
    hero: [
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },

  // ── Émissions ─────────────────────────────────────────────────────
  emissions: {
    hero: [
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },

  // ── Prédications ──────────────────────────────────────────────────
  predications: {
    hero: [
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
  },
};

async function seedPageIfEmpty(pageKey: string) {
  const pageSeeds = SEEDS[pageKey];
  if (!pageSeeds) return;

  // Check what sections already exist
  const { data: existing } = await supabase
    .from('page_contents')
    .select('section_key, field_key')
    .eq('page', pageKey);

  if (!existing || existing.length === 0) {
    // Page completely empty — seed everything
    const rows: any[] = [];
    let order = 0;
    for (const [sectionKey, fields] of Object.entries(pageSeeds)) {
      for (const f of fields) {
        rows.push({
          page: pageKey,
          section_key: sectionKey,
          field_key: f.field_key,
          label: f.label,
          value: f.value,
          type: f.type,
          sort_order: order++,
        });
      }
    }
    const { error: seedErr } = await supabase.from('page_contents').insert(rows);
    if (seedErr) { console.error('Seed error:', seedErr.message); return; }
    return;
  }

  // Page has some fields — seed only missing ones
  const existingKeys = new Set(existing.map((r: any) => `${r.section_key}.${r.field_key}`));
  const missing: any[] = [];
  let maxOrder = 0;
  for (const row of existing) {
    // We don't know sort_order from this query, just use existing.length
  }
  // Use existing.length as base order to avoid conflicts
  const baseOrder = existing.length;
  let order = baseOrder;
  for (const [sectionKey, fields] of Object.entries(pageSeeds)) {
    for (const f of fields) {
      if (!existingKeys.has(`${sectionKey}.${f.field_key}`)) {
        missing.push({
          page: pageKey,
          section_key: sectionKey,
          field_key: f.field_key,
          label: f.label,
          value: f.value,
          type: f.type,
          sort_order: order++,
        });
      }
    }
  }
  if (missing.length > 0) {
    const { error: missingErr } = await supabase.from('page_contents').insert(missing);
    if (missingErr) console.error('Seed missing error:', missingErr.message);
  }
}

// ─── Section label resolver ─────────────────────────────────────────

function getSectionLabel(pageKey: string, sectionKey: string): { label: string; icon: LucideIcon; description: string } {
  const page = PAGES.find((p) => p.key === pageKey);
  if (!page) return { label: sectionKey, icon: FileText, description: '' };
  const sec = page.sections.find((s) => s.key === sectionKey);
  if (sec) return { label: sec.label, icon: sec.icon, description: sec.description };

  // Dynamic sections (e.g., value_1, value_2 on about page)
  if (sectionKey.startsWith('value_')) {
    const num = sectionKey.replace('value_', '');
    return {
      label: `Valeur ${num}`,
      icon: Heart,
      description: 'Icône, titre et description',
    };
  }
  return { label: sectionKey, icon: FileText, description: '' };
}

function FileText_({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </svg>
  );
}
const FileText = FileText_;

// ─── Component ──────────────────────────────────────────────────────

export function ContentsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [activePage, setActivePage] = useState(PAGES[0].key);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [contents, setContents] = useState<PageContent[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  // is_active removed — column does not exist in DB
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Add-field modal state ──
  const [addModal, setAddModal] = useState<{ sectionKey: string } | null>(null);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<ContentType>('text');

  // ── Delete confirm state ──
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Fetch contents ──

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setActiveSection(null);

      // Auto-seed missing fields for pages that have seed definitions
      await seedPageIfEmpty(activePage);

      const { data, error } = await supabase
        .from('page_contents')
        .select('*')
        .eq('page', activePage)
        .order('section_key')
        .order('sort_order');

      if (cancelled) return;

      if (error) {
        addToast('Erreur lors du chargement', 'error');
      } else {
        const rows: PageContent[] = (data ?? []) as PageContent[];
        setContents(rows);
        const vals: Record<string, string> = {};
        for (const r of rows) {
          vals[r.id] = r.value;
        }
        setDraftValues(vals);

        // Auto-open first section
        if (rows.length > 0) {
          setActiveSection(rows[0].section_key);
        }
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [activePage, addToast]);

  // ── Grouped by section ──

  const sectionMap = new Map<string, PageContent[]>();
  for (const c of contents) {
    const list = sectionMap.get(c.section_key) ?? [];
    list.push(c);
    sectionMap.set(c.section_key, list);
  }
  const sectionKeys = Array.from(sectionMap.keys());

  // ── Handlers ──

  const handleValueChange = useCallback((id: string, val: string) => {
    setDraftValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  // handleActiveToggle removed — is_active column does not exist in DB

  // ── Save all changes for the active page ──

  const handleSave = useCallback(async () => {
    setSaving(true);
    const now = new Date().toISOString();

    const results = await Promise.allSettled(
      contents.map((item) => {
        const newVal = draftValues[item.id] ?? item.value;
        if (newVal === item.value) return Promise.resolve(null);
        return supabase
          .from('page_contents')
          .update({ value: newVal, updated_at: now })
          .eq('id', item.id);
      }),
    );

    // Supabase never rejects — errors come as { data, error } in fulfilled
    const errors: string[] = [];
    for (const r of results) {
      if (r.status === 'rejected') {
        errors.push(r.reason?.message || 'Erreur inconnue');
      } else if (r.value?.error) {
        errors.push(r.value.error.message || JSON.stringify(r.value.error));
      }
    }

    if (errors.length === 0) {
      addToast('Tous les contenus sauvegardés', 'success');
      // Refresh
      const { data } = await supabase
        .from('page_contents')
        .select('*')
        .eq('page', activePage)
        .order('section_key')
        .order('sort_order');
      if (data) {
        setContents(data as PageContent[]);
        const vals: Record<string, string> = {};
        for (const r of data) {
          vals[r.id] = r.value;
        }
        setDraftValues(vals);
      }
    } else {
      addToast(`Erreur : ${errors[0]}`, 'error');
      console.error('ContentsTab save errors:', errors);
    }

    setSaving(false);
  }, [contents, draftValues, activePage, addToast]);

  // ── Add field ──

  const handleAddField = useCallback(async () => {
    if (!addModal) return;
    const { sectionKey } = addModal;
    const key = newFieldKey.trim();
    const label = newFieldLabel.trim();

    if (!key || !label) {
      addToast('Remplissez la clé et le libellé', 'error');
      return;
    }

    const existing = sectionMap.get(sectionKey) ?? [];
    const maxSort = existing.reduce((max, c) => Math.max(max, c.sort_order), 0);

    const { error } = await supabase.from('page_contents').insert({
      page: activePage,
      section_key: sectionKey,
      field_key: key,
      label,
      value: '',
      type: newFieldType,
      sort_order: maxSort + 1,
    });

    if (error) {
      addToast("Erreur lors de l'ajout", 'error');
      return;
    }

    addToast('Champ ajouté', 'success');
    setAddModal(null);
    setNewFieldKey('');
    setNewFieldLabel('');
    setNewFieldType('text');

    // Refresh
    const { data } = await supabase
      .from('page_contents')
      .select('*')
      .eq('page', activePage)
      .order('section_key')
      .order('sort_order');
    if (data) {
      const rows = data as PageContent[];
      setContents(rows);
      const vals: Record<string, string> = {};
      for (const r of rows) {
        vals[r.id] = r.value;
      }
      setDraftValues(vals);
    }
  }, [addModal, newFieldKey, newFieldLabel, newFieldType, activePage, sectionMap, addToast]);

  // ── Delete field ──

  const handleDeleteField = useCallback(async (id: string) => {
    const { error } = await supabase.from('page_contents').delete().eq('id', id);
    if (error) {
      addToast('Erreur lors de la suppression', 'error');
      return;
    }
    addToast('Champ supprimé', 'success');
    setDeleteConfirmId(null);
    setContents((prev) => prev.filter((c) => c.id !== id));
    setDraftValues((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, [addToast]);

  // ── Dirty check ──

  const hasChanges = contents.some((item) => {
    return (draftValues[item.id] ?? '') !== item.value || (draftActive[item.id] ?? item.is_active) !== item.is_active;
  });

  // ── Current page def ──

  const currentPage = PAGES.find((p) => p.key === activePage);
  const activeSectionItems = activeSection ? (sectionMap.get(activeSection) ?? []) : [];
  const activeSectionInfo = activeSection ? getSectionLabel(activePage, activeSection) : null;

  // ── Render input by type ──

  const renderInput = (item: PageContent) => {
    const val = draftValues[item.id] ?? '';

    switch (item.type) {
      case 'text':
        return (
          <textarea
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            rows={3}
            className="input-surface w-full px-4 py-2.5 text-sm resize-y"
            placeholder={item.label}
          />
        );
      case 'html':
        return (
          <textarea
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            rows={6}
            className="input-surface w-full px-4 py-2.5 text-sm font-mono resize-y"
            placeholder="HTML autorisé"
          />
        );
      case 'image_url':
        return (
          <ImageUpload
            value={val}
            onChange={(v) => handleValueChange(item.id, v)}
            folder={`${activePage}/${item.section_key}`}
          />
        );
      case 'url':
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder="https://..."
          />
        );
      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={item.label}
          />
        );
    }
  };

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="flex h-full">
      {/* ─── Left Panel: Pages ─── */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-white/10 bg-black/20">
        <div className="border-b border-white/10 p-3">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">Pages</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {PAGES.map((pg) => {
            const PgIcon = pg.icon;
            const isActive = activePage === pg.key;
            const fieldCount = contents.filter((c) => c.page === pg.key).length;

            return (
              <button
                key={pg.key}
                type="button"
                onClick={() => setActivePage(pg.key)}
                className={`flex w-full items-center gap-2.5 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                }`}
              >
                <PgIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-amber-400' : 'text-white/80'}`}>
                    {pg.label}
                  </p>
                  <p className="text-[10px] text-white/30 truncate">{pg.description}</p>
                </div>
                {isActive && fieldCount > 0 && (
                  <span className="text-[10px] text-white/30">{fieldCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isFullAdmin || !hasChanges}
            className="btn-gold w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
            {hasChanges && <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">modifié</span>}
          </button>
        </div>
      </aside>

      {/* ─── Right Panel: Sections & Fields ─── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-3">
          <span className="text-sm text-white/40">{currentPage?.label ?? activePage}</span>
          {activeSectionInfo && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-white/20" />
              <span className="text-sm text-white">{activeSectionInfo.label}</span>
            </>
          )}
        </div>

        {contents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-white/10" />
              <p className="text-sm text-white/40">Aucun contenu pour cette page.</p>
              <p className="mt-1 text-xs text-white/20">Ajoutez des sections et champs ci-dessous.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1">
            {/* Sections list */}
            <div className="w-56 flex-shrink-0 border-r border-white/5 py-2">
              {sectionKeys.map((sk) => {
                const info = getSectionLabel(activePage, sk);
                const SecIcon = info.icon;
                const isActive = activeSection === sk;
                const count = (sectionMap.get(sk) ?? []).length;

                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setActiveSection(sk)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${
                      isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                    }`}
                  >
                    <SecIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-amber-400' : 'text-white/70'}`}>
                        {info.label}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/20">{count}</span>
                  </button>
                );
              })}

              {/* Add section button */}
              {isFullAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    // Create a new section by adding a field to a new section
                    const newKey = `section_${Date.now()}`;
                    setAddModal({ sectionKey: newKey });
                    setNewFieldKey('');
                    setNewFieldLabel('');
                    setNewFieldType('text');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs">Nouvelle section</span>
                </button>
              )}
            </div>

            {/* Fields editor */}
            <div className="flex-1 p-6">
              {activeSection && activeSectionInfo ? (
                <div className="space-y-5">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{activeSectionInfo.label}</h3>
                      {activeSectionInfo.description && (
                        <p className="mt-0.5 text-xs text-white/40">{activeSectionInfo.description}</p>
                      )}
                    </div>
                    {isFullAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddModal({ sectionKey: activeSection });
                          setNewFieldKey('');
                          setNewFieldLabel('');
                          setNewFieldType('text');
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50 hover:border-amber-500/30 hover:text-amber-400 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Champ
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  {activeSectionItems.map((item) => {
                    const isModified = (draftValues[item.id] ?? item.value) !== item.value;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 transition ${
                          isModified
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-white/5 bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <label className="text-sm font-medium text-white/90">{item.label}</label>
                            <div className="mt-0.5 flex items-center gap-2">
                              <code className="text-[10px] text-white/30 font-mono">{item.field_key}</code>
                              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/30">
                                {item.type}
                              </span>
                              {isModified && (
                                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">modifié</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isFullAdmin && (
                              deleteConfirmId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteField(item.id)}
                                    className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded"
                                  >
                                    Oui, supprimer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-[10px] text-white/40 hover:text-white/60 px-1.5 py-0.5 rounded"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {renderInput(item)}
                      </div>
                    );
                  })}

                  {activeSectionItems.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                      <p className="text-xs text-white/30">Aucun champ dans cette section.</p>
                      {isFullAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddModal({ sectionKey: activeSection });
                            setNewFieldKey('');
                            setNewFieldLabel('');
                            setNewFieldType('text');
                          }}
                          className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition"
                        >
                          + Ajouter un champ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-white/30">Sélectionnez une section</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Add Field Modal ─── */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-cream">
                Ajouter un champ
              </h3>
              <button
                type="button"
                onClick={() => setAddModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/50 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Clé du champ <span className="text-white/30">(identifiant unique, sans espaces)</span>
              </label>
              <input
                type="text"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
                placeholder="ex: hero_subtitle"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Libellé <span className="text-white/30">(nom affiché dans le formulaire)</span>
              </label>
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
                placeholder="ex: Sous-titre du héro"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Type de contenu</label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as ContentType)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                <option value="text">Texte</option>
                <option value="html">HTML</option>
                <option value="image_url">Image (upload + URL R2)</option>
                <option value="url">URL / Lien</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddModal(null)}
                className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-xl border border-white/10 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleAddField()}
                className="btn-gold px-5 py-2 text-sm font-medium rounded-xl transition"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}