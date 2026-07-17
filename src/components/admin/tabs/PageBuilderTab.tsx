import { useState, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, ChevronUp, ChevronDown, Save, Loader2, GripVertical,
  Sparkles, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface SectionEntry {
  id: string;
  order: number;
  visible: boolean;
  config: Record<string, unknown>;
}

interface ElementEntry {
  id: string;
  label: string;
  visible: boolean;
}

interface PageDef {
  key: string;
  label: string;
  sections: string[];
}

/* ═══════════════════════════════════════════════════════════════════
   Registre des éléments décoratifs par page
   Chaque élément a un id unique et un label descriptif pour l'admin.
   ═══════════════════════════════════════════════════════════════════ */

const PAGE_ELEMENTS: Record<string, { id: string; label: string }[]> = {
  home: [
    { id: 'pillars-icon-0', label: 'Piliers — Icône Couronne (Foi)' },
    { id: 'pillars-icon-1', label: 'Piliers — Icône Flamme (Communauté)' },
    { id: 'pillars-icon-2', label: 'Piliers — Icône Boussole (Mission)' },
    { id: 'unique-float-cross', label: 'Section Unique — Croix flottante' },
  ],
  about: [
    { id: 'vision-bookopen-icon', label: 'Vision — Icône Livre ouvert' },
    { id: 'mission-heart-icon', label: 'Mission — Icône Cœur' },
    { id: 'contact-mappin-icon', label: 'Contact strip — Icône Adresse' },
    { id: 'contact-phone-icon', label: 'Contact strip — Icône WhatsApp' },
    { id: 'contact-mail-icon-1', label: 'Contact strip — Icône Email 1' },
    { id: 'contact-mail-icon-2', label: 'Contact strip — Icône Email 2' },
  ],
  events: [
    { id: 'service-icon-0', label: 'Cultes hebdo — Icône Dimanche matin' },
    { id: 'service-icon-1', label: 'Cultes hebdo — Icône Dimanche soir' },
    { id: 'service-icon-2', label: 'Cultes hebdo — Icône Mercredi' },
    { id: 'service-icon-3', label: 'Cultes hebdo — Icône Vendredi' },
    { id: 'service-icon-4', label: 'Cultes hebdo — Icône Jeudi' },
    { id: 'service-icon-5', label: 'Cultes hebdo — Icône Samedi' },
  ],
  vision: [
    { id: 'mission-icon-0', label: 'Mission — Icône Croix (Adorer)' },
    { id: 'mission-icon-1', label: 'Mission — Icône Livre (Équiper)' },
    { id: 'mission-icon-2', label: 'Mission — Icône Envoi (Envoyer)' },
    { id: 'values-icon-0', label: 'Valeurs — Icône Flamme (Foi)' },
    { id: 'values-icon-1', label: 'Valeurs — Icône Étoile (Excellence)' },
    { id: 'values-icon-2', label: 'Valeurs — Icône Utilisateurs (Unité)' },
    { id: 'values-icon-3', label: 'Valeurs — Icône Bouclier (Service)' },
    { id: 'values-icon-4', label: 'Valeurs — Icône Couronne (Intégrité)' },
    { id: 'values-icon-5', label: 'Valeurs — Icône Cœur (Amour)' },
  ],
  culte: [
    { id: 'schedule-clock-icon-0', label: 'Horaires — Icône Dimanche' },
    { id: 'schedule-clock-icon-1', label: 'Horaires — Icône Mercredi' },
    { id: 'schedule-clock-icon-2', label: 'Horaires — Icône Vendredi' },
    { id: 'schedule-clock-icon-3', label: 'Horaires — Icône Jeudi' },
    { id: 'practical-icon-0', label: 'Infos pratiques — Icône Parking' },
    { id: 'practical-icon-1', label: 'Infos pratiques — Icône Transport' },
    { id: 'practical-icon-2', label: 'Infos pratiques — Icône Garderie' },
    { id: 'practical-icon-3', label: 'Infos pratiques — Icône Contact' },
  ],
  jeunesse: [
    { id: 'activity-icon-0', label: 'Activités — Icône Musique' },
    { id: 'activity-icon-1', label: 'Activités — Icône Étude biblique' },
    { id: 'activity-icon-2', label: 'Activités — Icône Événement' },
    { id: 'activity-icon-3', label: 'Activités — Icône Sport' },
    { id: 'activity-icon-4', label: 'Activités — Icône Gaming' },
    { id: 'activity-icon-5', label: 'Activités — Icône Partage' },
  ],
  ministeres: [
    { id: 'ministere-icon-0', label: 'Ministères — Icône Musique' },
    { id: 'ministere-icon-1', label: 'Ministères — Icône Enseignement' },
    { id: 'ministere-icon-2', label: 'Ministères — Icône Évangélisation' },
    { id: 'ministere-icon-3', label: 'Ministères — Icône Aide sociale' },
    { id: 'ministere-icon-4', label: 'Ministères — Icône Accueil' },
    { id: 'ministere-icon-5', label: 'Ministères — Icône Enfants' },
    { id: 'ministere-icon-6', label: 'Ministères — Icône Communication' },
    { id: 'ministere-icon-7', label: 'Ministères — Icône Intercession' },
    { id: 'ministere-icon-8', label: 'Ministères — Icône Leadership' },
    { id: 'ministere-icon-9', label: 'Ministères — Icône Formation' },
    { id: 'ministere-icon-10', label: 'Ministères — Icône Multimédia' },
    { id: 'ministere-icon-11', label: 'Ministères — Icône Louange' },
  ],
  enseignements: [
    { id: 'study-icon-0', label: 'Études bibliques — Icône Livre 1' },
    { id: 'study-icon-1', label: 'Études bibliques — Icône Livre 2' },
    { id: 'study-icon-2', label: 'Études bibliques — Icône Livre 3' },
  ],
  contact: [
    { id: 'info-mappin-icon', label: 'Coordonnées — Icône Adresse' },
    { id: 'info-phone-icon', label: 'Coordonnées — Icône Téléphone' },
    { id: 'info-mail-icon', label: 'Coordonnées — Icône Email' },
    { id: 'service-clock-icon-0', label: 'Cultes — Icône Horaire 1' },
    { id: 'service-clock-icon-1', label: 'Cultes — Icône Horaire 2' },
    { id: 'service-clock-icon-2', label: 'Cultes — Icône Horaire 3' },
    { id: 'service-clock-icon-3', label: 'Cultes — Icône Horaire 4' },
  ],
  emissions: [
    { id: 'newsletter-mail-icon', label: 'Newsletter — Icône Enveloppe' },
  ],
  communiques: [
    { id: 'filetext-icon', label: 'Liste — Icône Document' },
  ],
  annonces: [
    { id: 'bell-icon', label: 'Liste — Icône Cloche' },
  ],
  departments: [
    { id: 'dept-icon', label: 'Cartes — Icônes départements' },
    { id: 'login-cta-icon', label: 'Connexion — Icône Login' },
    { id: 'evangelisation-compass-icon', label: 'Évangélisation — Icône Boussole' },
    { id: 'serve-handheart-icon', label: 'Service — Icône Main-cœur' },
  ],
};

/* ═══════════════════════════════════════════════════════════════════
   Page & Section Definitions
   ═══════════════════════════════════════════════════════════════════ */

const PAGES: PageDef[] = [
  /* ─── Accueil ─── */
  { key: 'home', label: 'Accueil', sections: ['topbar', 'hero', 'pillars', 'about', 'explore', 'quote', 'pastors', 'testimonials', 'cta', 'map'] },
  /* ─── À Propos ─── */
  { key: 'about', label: 'À propos', sections: ['hero', 'about', 'vision', 'mission', 'values', 'pastors', 'giving'] },
  /* ─── Vie de l'Église ─── */
  { key: 'culte', label: 'Culte & Rassemblements', sections: ['hero', 'schedule', 'practicals'] },
  { key: 'events', label: 'Événements', sections: ['hero', 'upcoming', 'weekly', 'past'] },
  { key: 'jeunesse', label: 'Jeunesse', sections: ['hero', 'activities', 'program', 'gallery', 'testimonials'] },
  { key: 'ministeres', label: 'Ministères', sections: ['hero', 'louange', 'evangelisation', 'diaconie', 'groupes'] },
  { key: 'departments', label: 'Tous les départements', sections: ['hero', 'list', 'evangelisation', 'join'] },
  { key: 'pasteurs', label: 'Équipe pastorale', sections: ['hero', 'principaux', 'equipe'] },
  { key: 'extensions', label: 'Extensions', sections: ['hero', 'list'] },
  /* ─── Vie spirituelle ─── */
  { key: 'enseignements', label: 'Enseignements', sections: ['hero', 'list', 'series', 'studies'] },
  { key: 'predications', label: 'Prédications', sections: ['hero', 'list', 'series'] },
  { key: 'blog', label: 'Blog', sections: ['hero', 'featured', 'list'] },
  /* ─── Média ─── */
  { key: 'media', label: 'Médias — Contenus', sections: ['hero', 'videos', 'emissions', 'live', 'photos'] },
  { key: 'emissions', label: 'Médias — Émissions', sections: ['hero', 'list', 'featured'] },
  /* ─── Communication ─── */
  { key: 'communiques', label: 'Communiqués', sections: ['hero', 'list'] },
  { key: 'annonces', label: 'Annonces', sections: ['hero', 'list'] },
  /* ─── Contact & Dons ─── */
  { key: 'contact', label: 'Contact', sections: ['hero', 'services', 'form', 'social', 'map', 'info'] },
  { key: 'dons', label: 'Dons', sections: ['hero', 'methods', 'steps'] },
  /* ─── Vision ─── */
  { key: 'vision', label: 'Vision & Mission', sections: ['hero', 'mission', 'values', 'timeline'] },
  /* ─── Activités (legacy) ─── */
  { key: 'activities', label: 'Activités / Culte', sections: ['hero', 'schedule', 'ministries', 'cta'] },
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

function buildDefaultElements(pageKey: string): ElementEntry[] {
  return (PAGE_ELEMENTS[pageKey] ?? []).map(e => ({
    id: e.id,
    label: e.label,
    visible: true,
  }));
}

function sectionsStorageKey(pageKey: string) {
  return `builder_config_${pageKey}`;
}

function elementsStorageKey(pageKey: string) {
  return `builder_elements_${pageKey}`;
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function PageBuilderTab() {
  const { addToast } = useToast();

  const [selectedPage, setSelectedPage] = useState(PAGES[0].key);
  const [sections, setSections] = useState<SectionEntry[]>(() => buildDefaultSections(PAGES[0]));
  const [originalSections, setOriginalSections] = useState<SectionEntry[]>(() => buildDefaultSections(PAGES[0]));
  const [elements, setElements] = useState<ElementEntry[]>(() => buildDefaultElements(PAGES[0].key));
  const [originalElements, setOriginalElements] = useState<ElementEntry[]>(() => buildDefaultElements(PAGES[0].key));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentPage = PAGES.find(p => p.key === selectedPage) ?? PAGES[0];
  const hasSectionChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);
  const hasElementChanges = JSON.stringify(elements) !== JSON.stringify(originalElements);
  const hasChanges = hasSectionChanges || hasElementChanges;

  /* ── Load config for the selected page ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const defaults = buildDefaultSections(currentPage);
      const elemDefaults = buildDefaultElements(currentPage.key);

      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', sectionsStorageKey(currentPage.key))
        .single();

      if (cancelled) return;

      if (data?.value) {
        try {
          const parsed: SectionEntry[] = typeof data.value === 'string'
            ? JSON.parse(data.value)
            : data.value;

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

      // Load elements
      const { data: elemData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', elementsStorageKey(currentPage.key))
        .single();

      if (cancelled) return;

      if (elemData?.value) {
        try {
          const parsed: ElementEntry[] = typeof elemData.value === 'string'
            ? JSON.parse(elemData.value)
            : elemData.value;

          const savedElMap = new Map(parsed.map(e => [e.id, e]));
          const mergedElems = elemDefaults.map(d => {
            const saved = savedElMap.get(d.id);
            if (saved) {
              return { ...d, visible: saved.visible !== false };
            }
            return d;
          });

          setElements(mergedElems);
          setOriginalElements(JSON.parse(JSON.stringify(mergedElems)));
        } catch {
          setElements(elemDefaults);
          setOriginalElements(JSON.parse(JSON.stringify(elemDefaults)));
        }
      } else {
        setElements(elemDefaults);
        setOriginalElements(JSON.parse(JSON.stringify(elemDefaults)));
      }

      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [selectedPage, currentPage]);

  /* ── Toggle section visibility ── */
  const toggleVisibility = useCallback((index: number) => {
    setSections(prev =>
      prev.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s)),
    );
  }, []);

  /* ── Toggle element visibility ── */
  const toggleElementVisibility = useCallback((elementId: string) => {
    setElements(prev =>
      prev.map(e => (e.id === elementId ? { ...e, visible: !e.visible } : e)),
    );
  }, []);

  /* ── Toggle all elements ── */
  const toggleAllElements = useCallback((visible: boolean) => {
    setElements(prev => prev.map(e => ({ ...e, visible })));
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
      // Save sections
      const sectionConfig = sections.map((s, i) => ({
        id: s.id,
        visible: s.visible,
        config: s.config,
        order: i,
      }));

      // Save elements
      const elementConfig = elements.map(e => ({
        id: e.id,
        label: e.label,
        visible: e.visible,
      }));

      // Upsert sections config
      const upsertResult = await supabase
        .from('site_settings')
        .upsert({
          key: sectionsStorageKey(currentPage.key),
          value: JSON.stringify(sectionConfig),
          type: 'json',
          category: 'general',
          label: `Builder config — ${currentPage.label}`,
          sort_order: 500,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (upsertResult.error) {
        addToast(`Erreur sauvegarde sections : ${upsertResult.error.message}`, 'error');
        setSaving(false);
        return;
      }

      // Upsert elements config (only if there are elements for this page)
      if (elementConfig.length > 0) {
        const elUpsertResult = await supabase
          .from('site_settings')
          .upsert({
            key: elementsStorageKey(currentPage.key),
            value: JSON.stringify(elementConfig),
            type: 'json',
            category: 'general',
            label: `Builder éléments — ${currentPage.label}`,
            sort_order: 501,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });

        if (elUpsertResult.error) {
          addToast(`Erreur sauvegarde éléments : ${elUpsertResult.error.message}`, 'error');
          setSaving(false);
          return;
        }
      }

      setOriginalSections(JSON.parse(JSON.stringify(sections)));
      setOriginalElements(JSON.parse(JSON.stringify(elements)));
      addToast(`Configuration de "${currentPage.label}" enregistrée`, 'success');
    } catch (err: any) {
      addToast(`Erreur : ${err?.message || 'inconnue'}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [sections, elements, currentPage, addToast]);

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    const defaults = buildDefaultSections(currentPage);
    const elemDefaults = buildDefaultElements(currentPage.key);
    setSections(defaults);
    setOriginalSections(JSON.parse(JSON.stringify(defaults)));
    setElements(elemDefaults);
    setOriginalElements(JSON.parse(JSON.stringify(elemDefaults)));
    addToast('Réinitialisé aux valeurs par défaut', 'info');
  }, [currentPage, addToast]);

  const currentElements = PAGE_ELEMENTS[currentPage.key] ?? [];

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
            Gérez la visibilité et l'ordre des sections et éléments décoratifs de chaque page.
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════
              SECTION: Sections
              ═══════════════════════════════════════════════════════ */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/40">
              Sections de la page
            </h3>
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
                  <GripVertical className="h-4 w-4 shrink-0 text-white/15" />

                  <span className="flex-1 text-sm text-white/80">
                    <span className="font-mono text-xs text-white/40 mr-2">
                      {section.id}
                    </span>
                    {section.id.charAt(0).toUpperCase() + section.id.slice(1)}
                  </span>

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
          </div>

          {/* ═══════════════════════════════════════════════════════
              SECTION: Éléments décoratifs (icones, etc.)
              ═══════════════════════════════════════════════════════ */}
          {currentElements.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Éléments décoratifs (icones)
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAllElements(true)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-white/40 transition hover:bg-white/5 hover:text-white/70"
                    title="Tout afficher"
                  >
                    Tout afficher
                  </button>
                  <span className="text-white/20">|</span>
                  <button
                    onClick={() => toggleAllElements(false)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-white/40 transition hover:bg-white/5 hover:text-white/70"
                    title="Tout masquer"
                  >
                    Tout masquer
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {elements.map((el) => (
                  <div
                    key={el.id}
                    className={`group flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                      el.visible
                        ? 'border-white/5 bg-white/[0.015] hover:bg-white/[0.03]'
                        : 'border-white/5 bg-white/[0.005] opacity-40'
                    }`}
                  >
                    {/* Icon indicator */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-evangile-600/20 bg-evangile-600/5 text-evangile-500/60">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>

                    {/* Label */}
                    <span className="flex-1 text-sm text-white/70">
                      <span className="font-mono text-[10px] text-white/30 mr-2">
                        {el.id}
                      </span>
                      {el.label}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleElementVisibility(el.id)}
                      className="transition"
                      title={el.visible ? 'Masquer cet élément' : 'Afficher cet élément'}
                    >
                      {el.visible ? (
                        <ToggleRight className="h-5 w-5 text-amber-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-white/25" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}