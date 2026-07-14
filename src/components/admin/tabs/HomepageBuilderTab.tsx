import { useState, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, GripVertical, ToggleLeft, ToggleRight,
  ChevronDown, ChevronRight, Save, Loader2,
} from '../../../lib/icons';
import type { LucideIcon } from '../../../lib/icons';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import {
  LayoutDashboard, Clock, Sparkles, Radio, BookOpen,
  Star, Compass, Quote, Users, MessageSquare, Newspaper,
  Heart, Mail, Flame,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface SectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  config: Record<string, unknown>;
}

/* ═══════════════════════════════════════════════════════════════════
   Defaults
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'topbar', label: 'Barre supérieure', visible: true, order: 0, config: { show_clock: true, show_marquee: true, show_live: true } },
  { id: 'hero', label: 'Héro plein écran', visible: true, order: 1, config: { overlay_opacity: 75, animation_speed: 70, show_scroll_indicator: true, show_stats: true } },
  { id: 'verses', label: 'Versets bibliques', visible: true, order: 2, config: { auto_play: true, interval: 6, columns: 4 } },
  { id: 'pillars', label: 'Trois Piliers', visible: true, order: 3, config: { columns: 3, hover_scale: 102 } },
  { id: 'unique', label: 'Nous sommes uniques', visible: true, order: 4, config: { show_signature: true, image_offset: 40 } },
  { id: 'explore', label: 'Explorer', visible: true, order: 5, config: { columns: 4, hover_zoom: 110 } },
  { id: 'quote', label: 'Citation biblique', visible: true, order: 6, config: { show: true } },
  { id: 'pastors', label: 'Équipe pastorale', visible: true, order: 7, config: { columns: 4, show_bio: true, max_display: 8 } },
  { id: 'testimonials', label: 'Témoignages', visible: true, order: 8, config: { auto_play: true, interval: 5 } },
  { id: 'blog', label: 'Blog / Actualités', visible: true, order: 9, config: { columns: 3, max_posts: 3 } },
  { id: 'cta', label: 'Appel à action', visible: true, order: 10, config: { overlay_opacity: 85, show_heart: true } },
  { id: 'contact_strip', label: 'Bandeau contact', visible: true, order: 11, config: { columns: 3 } },
];

const SECTION_ICONS: Record<string, LucideIcon> = {
  topbar: Clock,
  hero: Sparkles,
  verses: BookOpen,
  pillars: Flame,
  unique: Star,
  explore: Compass,
  quote: Quote,
  pastors: Users,
  testimonials: MessageSquare,
  blog: Newspaper,
  cta: Heart,
  contact_strip: Mail,
};

/* ═══════════════════════════════════════════════════════════════════
   Shared UI Primitives
   ═══════════════════════════════════════════════════════════════════ */

function SectionCard({
  title,
  icon: Icon,
  visible,
  onToggleVisible,
  expanded,
  onToggleExpanded,
  children,
}: {
  title: string;
  icon: LucideIcon;
  visible: boolean;
  onToggleVisible: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
            className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            title={visible ? 'Masquer la section' : 'Afficher la section'}
          >
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-red-400" />}
          </button>
          {expanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
        </div>
      </button>
      {expanded && <div className="border-t border-white/5 px-4 py-3">{children}</div>}
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="min-w-0 flex-shrink-0 text-sm text-white/70">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2"
      title={label}
    >
      {value ? (
        <ToggleRight className="h-6 w-6 text-amber-400" />
      ) : (
        <ToggleLeft className="h-6 w-6 text-white/30" />
      )}
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-white/70">{label}</span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono text-amber-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-500"
      />
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ControlRow label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
        />
        <span className="text-xs font-mono text-white/50">{value || '#000000'}</span>
      </div>
    </ControlRow>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="py-2">
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="py-2">
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 resize-none"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section Config Renderer
   ═══════════════════════════════════════════════════════════════════ */

function SectionConfigEditor({
  section,
  update,
}: {
  section: SectionConfig;
  update: (key: string, value: unknown) => void;
}) {
  const c = section.config;

  switch (section.id) {
    case 'topbar':
      return (
        <>
          <ControlRow label="Afficher l'horloge">
            <Toggle value={!!c.show_clock} onChange={(v) => update('show_clock', v)} />
          </ControlRow>
          <ControlRow label="Bandeau défilant">
            <Toggle value={!!c.show_marquee} onChange={(v) => update('show_marquee', v)} />
          </ControlRow>
          <ControlRow label="Indicateur en direct">
            <Toggle value={!!c.show_live} onChange={(v) => update('show_live', v)} />
          </ControlRow>
          <TextInput label="Texte défilant" value={(c.marquee_text as string) || ''} onChange={(v) => update('marquee_text', v)} placeholder="Texte du bandeau défilant..." />
        </>
      );

    case 'hero':
      return (
        <>
          <Slider label="Opacité de l'overlay" value={Number(c.overlay_opacity ?? 75)} onChange={(v) => update('overlay_opacity', v)} min={0} max={100} />
          <Slider label="Vitesse d'animation" value={Number(c.animation_speed ?? 70)} onChange={(v) => update('animation_speed', v)} min={10} max={100} />
          <ControlRow label="Indicateur de défilement">
            <Toggle value={!!c.show_scroll_indicator} onChange={(v) => update('show_scroll_indicator', v)} />
          </ControlRow>
          <ControlRow label="Statistiques">
            <Toggle value={!!c.show_stats} onChange={(v) => update('show_stats', v)} />
          </ControlRow>
          <TextInput label="Badge" value={(c.badge as string) || ''} onChange={(v) => update('badge', v)} placeholder="Ex: Bienvenue" />
          <TextInput label="Sous-titre" value={(c.subtitle as string) || ''} onChange={(v) => update('subtitle', v)} placeholder="Sous-titre du héros" />
          <TextInput label="Bouton CTA 1" value={(c.cta1 as string) || ''} onChange={(v) => update('cta1', v)} placeholder="Premier appel à action" />
          <TextInput label="Bouton CTA 2" value={(c.cta2 as string) || ''} onChange={(v) => update('cta2', v)} placeholder="Deuxième appel à action" />
          <ColorPicker label="Couleur de l'overlay" value={(c.overlay_color as string) || '#000000'} onChange={(v) => update('overlay_color', v)} />
        </>
      );

    case 'verses':
      return (
        <>
          <ControlRow label="Lecture automatique">
            <Toggle value={!!c.auto_play} onChange={(v) => update('auto_play', v)} />
          </ControlRow>
          <Slider label="Intervalle (secondes)" value={Number(c.interval ?? 6)} onChange={(v) => update('interval', v)} min={3} max={15} />
          <Slider label="Colonnes" value={Number(c.columns ?? 4)} onChange={(v) => update('columns', v)} min={2} max={4} />
        </>
      );

    case 'pillars':
      return (
        <>
          <Slider label="Colonnes" value={Number(c.columns ?? 3)} onChange={(v) => update('columns', v)} min={1} max={3} />
          <Slider label="Échelle au survol (%)" value={Number(c.hover_scale ?? 102)} onChange={(v) => update('hover_scale', v)} min={100} max={110} />
        </>
      );

    case 'unique':
      return (
        <>
          <ControlRow label="Afficher la signature">
            <Toggle value={!!c.show_signature} onChange={(v) => update('show_signature', v)} />
          </ControlRow>
          <Slider label="Décalage de l'image (%)" value={Number(c.image_offset ?? 40)} onChange={(v) => update('image_offset', v)} min={0} max={100} />
          <TextInput label="Titre" value={(c.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre de la section" />
          <TextInput label="Texte 1" value={(c.text1 as string) || ''} onChange={(v) => update('text1', v)} placeholder="Premier texte" />
          <TextInput label="Texte 2" value={(c.text2 as string) || ''} onChange={(v) => update('text2', v)} placeholder="Deuxième texte" />
          <TextArea label="Citation" value={(c.quote as string) || ''} onChange={(v) => update('quote', v)} placeholder="Citation inspirante..." />
        </>
      );

    case 'explore':
      return (
        <>
          <Slider label="Colonnes" value={Number(c.columns ?? 4)} onChange={(v) => update('columns', v)} min={2} max={4} />
          <Slider label="Zoom au survol (%)" value={Number(c.hover_zoom ?? 110)} onChange={(v) => update('hover_zoom', v)} min={100} max={120} />
        </>
      );

    case 'quote':
      return (
        <div className="py-4 text-center text-sm text-white/40">
          Pas de configuration disponible pour cette section.
        </div>
      );

    case 'pastors':
      return (
        <>
          <Slider label="Colonnes" value={Number(c.columns ?? 4)} onChange={(v) => update('columns', v)} min={2} max={4} />
          <ControlRow label="Afficher la biographie">
            <Toggle value={!!c.show_bio} onChange={(v) => update('show_bio', v)} />
          </ControlRow>
          <Slider label="Affichage maximum" value={Number(c.max_display ?? 8)} onChange={(v) => update('max_display', v)} min={4} max={12} />
        </>
      );

    case 'testimonials':
      return (
        <>
          <ControlRow label="Lecture automatique">
            <Toggle value={!!c.auto_play} onChange={(v) => update('auto_play', v)} />
          </ControlRow>
          <Slider label="Intervalle (secondes)" value={Number(c.interval ?? 5)} onChange={(v) => update('interval', v)} min={3} max={15} />
        </>
      );

    case 'blog':
      return (
        <>
          <Slider label="Colonnes" value={Number(c.columns ?? 3)} onChange={(v) => update('columns', v)} min={1} max={3} />
          <Slider label="Nombre d'articles" value={Number(c.max_posts ?? 3)} onChange={(v) => update('max_posts', v)} min={1} max={6} />
        </>
      );

    case 'cta':
      return (
        <>
          <Slider label="Opacité de l'overlay" value={Number(c.overlay_opacity ?? 85)} onChange={(v) => update('overlay_opacity', v)} min={0} max={100} />
          <ControlRow label="Afficher le cœur">
            <Toggle value={!!c.show_heart} onChange={(v) => update('show_heart', v)} />
          </ControlRow>
          <TextInput label="Titre" value={(c.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre de l'appel à action" />
          <TextInput label="Texte" value={(c.text as string) || ''} onChange={(v) => update('text', v)} placeholder="Description de l'appel à action" />
          <TextInput label="Bouton CTA" value={(c.cta as string) || ''} onChange={(v) => update('cta', v)} placeholder="Texte du bouton" />
        </>
      );

    case 'contact_strip':
      return (
        <>
          <Slider label="Colonnes" value={Number(c.columns ?? 3)} onChange={(v) => update('columns', v)} min={1} max={3} />
        </>
      );

    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function HomepageBuilderTab() {
  const { addToast } = useToast();
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ── Load config ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_builder_config')
        .single();

      if (!error && data?.value) {
        try {
          const parsed = JSON.parse(data.value) as SectionConfig[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSections(parsed);
          }
        } catch {
          // Corrupted JSON, keep defaults
        }
      }
      setLoading(false);
    };
    void load();
  }, []);

  // ── Toggle section visibility ──
  const toggleVisibility = useCallback((id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    );
  }, []);

  // ── Toggle section expanded in editor ──
  const toggleExpanded = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Update a config key for a section ──
  const updateSectionConfig = useCallback((sectionId: string, key: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, config: { ...s.config, [key]: value } } : s,
      ),
    );
  }, []);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: 'homepage_builder_config', value: JSON.stringify(sections), updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      addToast("Erreur lors de l'enregistrement de la configuration", 'error');
    } else {
      addToast('Configuration enregistrée avec succès', 'success');
    }
  }, [sections, addToast]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setSections(DEFAULT_SECTIONS);
    setActiveSection(null);
    setExpandedSections(new Set());
    addToast('Configuration réinitialisée', 'info');
  }, [addToast]);

  const activeSectionsCount = sections.filter((s) => s.visible).length;
  const activeSectionData = sections.find((s) => s.id === activeSection);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Section List ── */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-white/10 bg-black/20">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <LayoutDashboard className="h-5 w-5 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Page d&apos;accueil</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section.id] ?? Sparkles;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(isActive ? null : section.id)}
                className={`flex w-full items-center gap-2 border-b border-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
                  isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                }`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 text-white/20" />
                <Icon className="h-4 w-4 flex-shrink-0 text-white/50" />
                <span className={`flex-1 truncate text-sm ${section.visible ? 'text-white' : 'text-white/40 line-through'}`}>
                  {section.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id); }}
                  className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-white/10"
                >
                  {section.visible
                    ? <Eye className="h-3.5 w-3.5 text-white/50" />
                    : <EyeOff className="h-3.5 w-3.5 text-red-400/70" />}
                </button>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-xs text-white/50">
            {activeSectionsCount} section{activeSectionsCount !== 1 ? 's' : ''} active{activeSectionsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </aside>

      {/* ── Right Panel: Section Config ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-end border-b border-white/10 px-6 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="mr-2 rounded-md px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>

        <div className="flex-1 p-6">
          {!activeSection || !activeSectionData ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <LayoutDashboard className="mx-auto mb-3 h-10 w-10 text-white/10" />
                <p className="text-sm text-white/40">Sélectionnez une section pour la configurer</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl space-y-3">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Configuration — {activeSectionData.label}
              </h3>

              <SectionCard
                title={activeSectionData.label}
                icon={SECTION_ICONS[activeSectionData.id] ?? Sparkles}
                visible={activeSectionData.visible}
                onToggleVisible={() => toggleVisibility(activeSectionData.id)}
                expanded={expandedSections.has(activeSectionData.id) || true}
                onToggleExpanded={() => toggleExpanded(activeSectionData.id)}
              >
                <SectionConfigEditor
                  section={activeSectionData}
                  update={(key, value) => updateSectionConfig(activeSectionData.id, key, value)}
                />
              </SectionCard>

              <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs text-white/30">
                  Section : <span className="font-mono text-white/50">{activeSectionData.id}</span>
                  {' · '}Ordre : <span className="font-mono text-white/50">{activeSectionData.order}</span>
                  {' · '}Visible : <span className="font-mono text-white/50">{activeSectionData.visible ? 'Oui' : 'Non'}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}