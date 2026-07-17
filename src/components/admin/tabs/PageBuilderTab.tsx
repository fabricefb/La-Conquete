import { useState, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, ChevronUp, ChevronDown, Save, Loader2, GripVertical,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface SectionEntry {
  id: string;
  visible: boolean;
  config: Record<string, unknown>;
}

interface PageDef {
  key: string;
  label: string;
  sections: string[];
}

/* ═══════════════════════════════════════════════════════════════════
   Page & Section Definitions
   ═══════════════════════════════════════════════════════════════════ */

const PAGES: PageDef[] = [
  { key: 'home', label: 'Accueil', sections: ['hero', 'topbar', 'pillars', 'about', 'quote', 'pastors', 'testimonials'] },
  { key: 'about', label: 'À propos', sections: ['hero', 'vision', 'mission', 'values', 'pastors'] },
  { key: 'activities', label: 'Activités', sections: ['hero', 'schedule', 'ministries', 'cta'] },
  { key: 'events', label: 'Événements', sections: ['hero', 'upcoming', 'past'] },
  { key: 'contact', label: 'Contact', sections: ['hero', 'form', 'map', 'info'] },
  { key: 'media', label: 'Médias', sections: ['hero', 'gallery', 'videos'] },
  { key: 'departments', label: 'Départements', sections: ['hero', 'list'] },
  { key: 'emissions', label: 'Émissions', sections: ['hero', 'list'] },
  { key: 'predications', label: 'Prédications', sections: ['hero', 'list'] },
  { key: 'vision', label: 'Vision', sections: ['hero', 'vision', 'mission', 'values', 'timeline'] },
  { key: 'culte', label: 'Culte', sections: ['hero', 'schedule'] },
  { key: 'jeunesse', label: 'Jeunesse', sections: ['hero', 'activities'] },
  { key: 'blog', label: 'Blog', sections: ['hero', 'list'] },
  { key: 'pasteurs', label: 'Pasteurs', sections: ['hero', 'grid'] },
  { key: 'ministeres', label: 'Ministères', sections: ['hero', 'grid'] },
  { key: 'enseignements', label: 'Enseignements', sections: ['hero', 'list'] },
  { key: 'extensions', label: 'Extensions', sections: ['hero', 'list'] },
  { key: 'communiques', label: 'Communiqués', sections: ['hero', 'list'] },
  { key: 'annonces', label: 'Annonces', sections: ['hero', 'list'] },
  { key: 'dons', label: 'Dons', sections: ['hero', 'form'] },
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function buildDefaultSections(pageDef: PageDef): SectionEntry[] {
  return pageDef.sections.map((id, i) => ({
    id,
    visible: true,
    config: {},
    order: i,
  }));
}

function storageKey(pageKey: string) {
  return `builder_config_${pageKey}`;
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function PageBuilderTab() {
  const { addToast } = useToast();

  const [selectedPage, setSelectedPage] = useState(PAGES[0].key);
  const [sections, setSections] = useState<SectionEntry[]>(() => buildDefaultSections(PAGES[0]));
  const [originalSections, setOriginalSections] = useState<SectionEntry[]>(() => buildDefaultSections(PAGES[0]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentPage = PAGES.find(p => p.key === selectedPage) ?? PAGES[0];

  const hasChanges =
    JSON.stringify(sections) !== JSON.stringify(originalSections);

  /* ── Load config for the selected page ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const defaults = buildDefaultSections(currentPage);

      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', storageKey(currentPage.key))
        .single();

      if (cancelled) return;

      if (data?.value) {
        try {
          const parsed: SectionEntry[] = typeof data.value === 'string'
            ? JSON.parse(data.value)
            : data.value;

          // Merge saved config onto defaults (preserves new sections added to code)
          const savedMap = new Map(parsed.map(s => [s.id, s]));
          const merged = defaults.map(d => {
            const saved = savedMap.get(d.id);
            if (saved) {
              return {
                id: d.id,
                visible: saved.visible ?? d.visible,
                config: saved.config ?? d.config,
                order: saved.order ?? d.order,
              };
            }
            return d;
          });

          // Sort by saved order if available, otherwise keep default order
          const ordered = savedMap.size > 0
            ? merged.sort((a, b) => {
                const aOrder = savedMap.get(a.id)?.order ?? defaults.findIndex(d => d.id === a.id);
                const bOrder = savedMap.get(b.id)?.order ?? defaults.findIndex(d => d.id === b.id);
                return aOrder - bOrder;
              })
            : merged;

          setSections(ordered);
          setOriginalSections(JSON.parse(JSON.stringify(ordered)));
        } catch {
          setSections(defaults);
          setOriginalSections(JSON.parse(JSON.stringify(defaults)));
        }
      } else {
        setSections(defaults);
        setOriginalSections(JSON.parse(JSON.stringify(defaults)));
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [selectedPage, currentPage]);

  /* ── Toggle visibility ── */
  const toggleVisibility = useCallback((index: number) => {
    setSections(prev =>
      prev.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s)),
    );
  }, []);

  /* ── Move up ── */
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSections(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  /* ── Move down ── */
  const moveDown = useCallback((index: number) => {
    setSections(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const configToSave = sections.map((s, i) => ({
        id: s.id,
        visible: s.visible,
        config: s.config,
        order: i,
      }));

      const results = await Promise.allSettled([
        // Try update first
        supabase
          .from('site_settings')
          .update({
            value: JSON.stringify(configToSave),
            updated_at: new Date().toISOString(),
          })
          .eq('key', storageKey(currentPage.key)),
        // Try insert as fallback (handled below)
      ]);

      const updateResult = results[0];
      let saved = false;

      if (
        updateResult.status === 'fulfilled' &&
        !updateResult.value?.error
      ) {
        if (updateResult.value.count === 0) {
          // No row updated — insert
          const insertResult = await supabase
            .from('site_settings')
            .insert({
              key: storageKey(currentPage.key),
              value: JSON.stringify(configToSave),
              type: 'json',
              category: 'general',
              label: `Builder config — ${currentPage.label}`,
              sort_order: 500,
              updated_at: new Date().toISOString(),
            });

          if (insertResult.error) {
            addToast(`Erreur insertion : ${insertResult.error.message}`, 'error');
            setSaving(false);
            return;
          }
        }
        saved = true;
      } else {
        // Anti-pattern fix: check both status and error
        const err =
          updateResult.status === 'rejected'
            ? updateResult.reason
            : updateResult.value?.error;

        addToast(`Erreur sauvegarde : ${err?.message ?? 'inconnue'}`, 'error');
        setSaving(false);
        return;
      }

      if (saved) {
        setOriginalSections(JSON.parse(JSON.stringify(sections)));
        addToast(
          `Configuration de "${currentPage.label}" enregistrée`,
          'success',
        );
      }
    } catch (err: any) {
      addToast(`Erreur : ${err?.message || 'inconnue'}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [sections, currentPage, addToast]);

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    const defaults = buildDefaultSections(currentPage);
    setSections(defaults);
    setOriginalSections(JSON.parse(JSON.stringify(defaults)));
    addToast('Réinitialisé aux valeurs par défaut', 'info');
  }, [currentPage, addToast]);

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white/90">
            Constructeur de pages
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Gérez la visibilité et l'ordre des sections de chaque page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/5 hover:text-white/90"
          >
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || loading}
            className="flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Enregistrer
          </button>
        </div>
      </div>

      {/* ── Page selector ── */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label className="text-sm font-medium text-white/60 shrink-0">
          Page :
        </label>
        <select
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/90 outline-none transition focus:border-amber-500/50 sm:max-w-xs [&>option]:bg-zinc-900 [&>option]:text-white"
        >
          {PAGES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>

        {hasChanges && (
          <span className="text-xs text-amber-400/80">
            • Modifications non enregistrées
          </span>
        )}
      </div>

      {/* ── Section list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                section.visible
                  ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  : 'border-white/5 bg-white/[0.01] opacity-50'
              }`}
            >
              {/* Drag handle (decorative) */}
              <GripVertical className="h-4 w-4 shrink-0 text-white/15" />

              {/* Section label */}
              <span className="flex-1 text-sm text-white/80">
                <span className="font-mono text-xs text-white/40 mr-2">
                  {section.id}
                </span>
                {section.id.charAt(0).toUpperCase() + section.id.slice(1)}
              </span>

              {/* Reorder arrows */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="rounded p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Monter"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === sections.length - 1}
                  className="rounded p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Descendre"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={() => toggleVisibility(index)}
                className={`rounded p-1.5 transition ${
                  section.visible
                    ? 'text-amber-400 hover:bg-amber-400/10'
                    : 'text-white/25 hover:bg-white/10 hover:text-white/60'
                }`}
                title={section.visible ? 'Masquer' : 'Afficher'}
              >
                {section.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}

          {sections.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">
              Aucune section définie pour cette page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}