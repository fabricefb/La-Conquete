'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Clock, Zap, Eye, EyeOff, Save, RotateCcw, Loader2, Play, Square } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

/** Structure complète des paramètres d'animation */
interface AnimationSettings {
  // Durées (en secondes)
  revealDuration: number;
  hoverDuration: number;
  pageTransition: number;
  marqueeDuration: number;
  // Courbes d'easing
  revealEasing: string;
  hoverEasing: string;
  // Toggles
  scrollReveal: boolean;
  hoverEffects: boolean;
  parallax: boolean;
  particles: boolean;
}

/** Option de courbe d'easing pour les sélecteurs */
interface EasingOption {
  value: string;
  label: string;
}

// ─── Valeurs par défaut ──────────────────────────────────────────

const DEFAULT_SETTINGS: AnimationSettings = {
  revealDuration: 0.6,
  hoverDuration: 0.3,
  pageTransition: 0.5,
  marqueeDuration: 25,
  revealEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  hoverEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  scrollReveal: true,
  hoverEffects: true,
  parallax: false,
  particles: false,
};

// ─── Catalogue des courbes d'easing ──────────────────────────────

const EASING_OPTIONS: EasingOption[] = [
  { value: 'ease', label: 'Standard (ease)' },
  { value: 'ease-in', label: 'Entrée (ease-in)' },
  { value: 'ease-out', label: 'Sortie (ease-out)' },
  { value: 'ease-in-out', label: 'Entrée/Sortie (ease-in-out)' },
  { value: 'cubic-bezier(0.22, 1, 0.36, 1)', label: 'Conquête' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Doux' },
  { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'Élastique' },
  { value: 'linear', label: 'Linéaire' },
  { value: 'steps(4, end)', label: 'Marche' },
];

// ─── Configuration des curseurs de durée ─────────────────────────

interface SliderConfig {
  key: keyof Pick<AnimationSettings, 'revealDuration' | 'hoverDuration' | 'pageTransition' | 'marqueeDuration'>;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  cssVar: string;
}

const DURATION_SLIDERS: SliderConfig[] = [
  {
    key: 'revealDuration',
    label: 'Révélation au défilement',
    min: 0.3,
    max: 2,
    step: 0.1,
    unit: 's',
    cssVar: '--anim-reveal-duration',
  },
  {
    key: 'hoverDuration',
    label: 'Effet au survol',
    min: 0.1,
    max: 1,
    step: 0.1,
    unit: 's',
    cssVar: '--anim-hover-duration',
  },
  {
    key: 'pageTransition',
    label: 'Transition entre pages',
    min: 0.2,
    max: 1.5,
    step: 0.1,
    unit: 's',
    cssVar: '', // Non exposé en CSS var
  },
  {
    key: 'marqueeDuration',
    label: 'Défilement du bandeau',
    min: 10,
    max: 60,
    step: 1,
    unit: 's',
    cssVar: '--anim-marquee-duration',
  },
];

// ─── Configuration des toggles ───────────────────────────────────

interface ToggleConfig {
  key: keyof Pick<AnimationSettings, 'scrollReveal' | 'hoverEffects' | 'parallax' | 'particles'>;
  label: string;
  description: string;
}

const TOGGLE_CONFIGS: ToggleConfig[] = [
  {
    key: 'scrollReveal',
    label: 'Révélation au défilement',
    description: 'Les éléments apparaissent progressivement lors du défilement',
  },
  {
    key: 'hoverEffects',
    label: 'Effets au survol',
    description: 'Animations interactives lors du passage de la souris',
  },
  {
    key: 'parallax',
    label: 'Effet parallaxe',
    description: 'Mouvement de profondeur sur les arrière-plans',
  },
  {
    key: 'particles',
    label: 'Animations de particules',
    description: 'Particules décoratives en arrière-plan',
  },
];

// ─── Composant principal ─────────────────────────────────────────

export function AnimationsTab() {
  const { addToast } = useToast();

  // État des paramètres
  const [settings, setSettings] = useState<AnimationSettings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<AnimationSettings>(DEFAULT_SETTINGS);

  // États d'interface
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // État de la prévisualisation
  const [revealPreviewVisible, setRevealPreviewVisible] = useState(false);
  const [hoverPreviewTransform, setHoverPreviewTransform] = useState(false);
  const [isRevealAnimating, setIsRevealAnimating] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Détection de modifications ──
  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  // ── Chargement des paramètres depuis Supabase ──
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'animation_settings')
        .single();

      if (!error && data?.value) {
        try {
          const parsed = JSON.parse(data.value) as Partial<AnimationSettings>;
          // Fusionner avec les valeurs par défaut pour les clés manquantes
          const merged: AnimationSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
          };
          setSettings(merged);
          setInitialSettings(merged);
        } catch {
          // JSON invalide — on garde les valeurs par défaut
          addToast('Les paramètres d\'animation sauvegardés sont corrompus, valeurs par défaut appliquées', 'error');
        }
      }
      setLoading(false);
    };

    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mise à jour d'un curseur de durée ──
  const handleSliderChange = useCallback(
    (key: SliderConfig['key'], value: number) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Mise à jour d'un sélecteur d'easing ──
  const handleEasingChange = useCallback(
    (field: 'revealEasing' | 'hoverEasing', value: string) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ── Basculement d'un toggle ──
  const handleToggle = useCallback(
    (key: ToggleConfig['key']) => {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  // ── Application des variables CSS sur le document ──
  const applyCSSVariables = useCallback((s: AnimationSettings) => {
    const root = document.documentElement.style;
    root.setProperty('--anim-reveal-duration', `${s.revealDuration}s`);
    root.setProperty('--anim-hover-duration', `${s.hoverDuration}s`);
    root.setProperty('--anim-reveal-ease', s.revealEasing);
    root.setProperty('--anim-hover-ease', s.hoverEasing);
    root.setProperty('--anim-marquee-duration', `${s.marqueeDuration}s`);
  }, []);

  // ── Enregistrement dans Supabase ──
  const handleSave = useCallback(async () => {
    setSaving(true);

    // Appliquer les CSS custom properties immédiatement
    applyCSSVariables(settings);

    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key: 'animation_settings',
          value: JSON.stringify(settings),
          type: 'json',
          category: 'general',
          label: 'Paramètres d\'animation',
          sort_order: 700,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );

    setSaving(false);

    if (error) {
      addToast("Erreur lors de la sauvegarde des animations", 'error');
    } else {
      addToast('Paramètres d\'animation sauvegardés avec succès', 'success');
      setInitialSettings({ ...settings });
    }
  }, [settings, applyCSSVariables, addToast]);

  // ── Réinitialisation aux valeurs par défaut ──
  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    addToast('Paramètres réinitialisés aux valeurs par défaut', 'info');
  }, [addToast]);

  // ── Prévisualisation : lancer la révélation ──
  const handleTestReveal = useCallback(() => {
    // Réinitialiser d'abord
    setRevealPreviewVisible(false);
    setIsRevealAnimating(true);

    // Forcer le reflow pour que la transition fonctionne
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRevealPreviewVisible(true);
      });
    });

    // Terminer l'animation après la durée configurée
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setIsRevealAnimating(false);
    }, settings.revealDuration * 1000 + 100);
  }, [settings.revealDuration]);

  // ── Nettoyage du timer au démontage ──
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // ── Rendu squelette pendant le chargement ──
  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 animate-pulse">
            <div className="h-5 w-48 bg-white/5 rounded" />
            <div className="h-10 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1 : Durées d'animation ──────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-cream">
            Durées d&apos;animation
          </h2>
        </div>

        <div className="space-y-6">
          {DURATION_SLIDERS.map((slider) => (
            <div key={slider.key}>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor={`anim-${slider.key}`}
                  className="text-sm text-muted"
                >
                  {slider.label}
                </label>
                {/* Badge de la valeur actuelle en police mono */}
                <span className="px-2 py-0.5 rounded bg-white/5 text-xs font-mono text-amber-300">
                  {settings[slider.key]}
                  {slider.unit}
                </span>
              </div>
              <input
                id={`anim-${slider.key}`}
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={settings[slider.key]}
                onChange={(e) =>
                  handleSliderChange(slider.key, parseFloat(e.target.value))
                }
                className="w-full h-2 rounded-lg appearance-none cursor-pointer
                  bg-white/10 accent-amber-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
                  [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400
                  [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md
                  [&::-moz-range-thumb]:cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-muted/60">
                  {slider.min}{slider.unit}
                </span>
                <span className="text-[11px] text-muted/60">
                  {slider.max}{slider.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2 : Courbes d'easing ───────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-cream">
            Courbes d&apos;easing
          </h2>
        </div>

        <div className="space-y-6">
          {/* Sélecteur : Révélation */}
          <div>
            <label
              htmlFor="easing-reveal"
              className="block text-sm text-muted mb-2"
            >
              Easing de révélation
            </label>
            <select
              id="easing-reveal"
              value={settings.revealEasing}
              onChange={(e) => handleEasingChange('revealEasing', e.target.value)}
              className="input-surface w-full rounded-lg px-3 py-2.5 text-sm
                bg-white/5 border border-white/10 text-cream
                focus:outline-none focus:ring-2 focus:ring-amber-500/40
                [&>option]:bg-neutral-900 [&>option]:text-cream"
            >
              {EASING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Mini aperçu de la courbe de révélation */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-muted/70 min-w-[72px]">Aperçu :</span>
              <div
                className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden"
                style={{ maxWidth: 200 }}
              >
                <div
                  className="h-full rounded-full bg-amber-400 animate-easing-preview"
                  style={{
                    width: '100%',
                    animation: `easing-demo-reveal ${settings.revealDuration}s ${settings.revealEasing} infinite alternate`,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono text-muted/60 truncate max-w-[180px]">
                {settings.revealEasing}
              </span>
            </div>
          </div>

          {/* Sélecteur : Survol */}
          <div>
            <label
              htmlFor="easing-hover"
              className="block text-sm text-muted mb-2"
            >
              Easing au survol
            </label>
            <select
              id="easing-hover"
              value={settings.hoverEasing}
              onChange={(e) => handleEasingChange('hoverEasing', e.target.value)}
              className="input-surface w-full rounded-lg px-3 py-2.5 text-sm
                bg-white/5 border border-white/10 text-cream
                focus:outline-none focus:ring-2 focus:ring-amber-500/40
                [&>option]:bg-neutral-900 [&>option]:text-cream"
            >
              {EASING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Mini aperçu de la courbe de survol */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-muted/70 min-w-[72px]">Aperçu :</span>
              <div
                className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden"
                style={{ maxWidth: 200 }}
              >
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: '100%',
                    animation: `easing-demo-hover ${settings.hoverDuration}s ${settings.hoverEasing} infinite alternate`,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono text-muted/60 truncate max-w-[180px]">
                {settings.hoverEasing}
              </span>
            </div>
          </div>
        </div>

        {/* Styles d'animation inline pour les aperçus d'easing */}
        <style>{`
          @keyframes easing-demo-reveal {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes easing-demo-hover {
            0% { width: 30%; }
            100% { width: 100%; }
          }
        `}</style>
      </section>

      {/* ── Section 3 : Toggles d'activation ────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          {settings.hoverEffects ? (
            <Eye className="w-5 h-5 text-amber-400" />
          ) : (
            <EyeOff className="w-5 h-5 text-muted" />
          )}
          <h2 className="text-lg font-semibold text-cream">
            Activation des effets
          </h2>
        </div>

        <div className="space-y-4">
          {TOGGLE_CONFIGS.map((toggle) => {
            const isOn = settings[toggle.key] as boolean;
            return (
              <div
                key={toggle.key}
                className="flex items-center justify-between p-3 rounded-xl
                  bg-white/[0.02] border border-white/[0.04]
                  hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-cream">
                    {toggle.label}
                  </p>
                  <p className="text-xs text-muted mt-0.5 truncate">
                    {toggle.description}
                  </p>
                </div>
                {/* Interrupteur personnalisé */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={toggle.label}
                  onClick={() => handleToggle(toggle.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer
                    rounded-full border-2 border-transparent
                    transition-colors duration-200 ease-in-out
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-amber-500/50 focus-visible:ring-offset-2
                    focus-visible:ring-offset-neutral-900
                    ${isOn ? 'bg-amber-500' : 'bg-white/10'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5
                      rounded-full bg-white shadow-sm
                      transform transition-transform duration-200 ease-in-out
                      ${isOn ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 4 : Prévisualisation en direct ──────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-cream">
              Prévisualisation en direct
            </h2>
          </div>
          <button
            type="button"
            onClick={handleTestReveal}
            disabled={isRevealAnimating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
              text-sm font-medium text-neutral-900 bg-amber-400
              hover:bg-amber-300 active:bg-amber-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            {isRevealAnimating ? (
              <>
                <Square className="w-4 h-4" />
                En cours…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Tester
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aperçu : Révélation (fade-up) */}
          <div className="relative">
            <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">
              Révélation (fade-up)
            </p>
            <div className="relative h-40 rounded-xl bg-white/[0.03] border border-white/[0.06]
              overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-4"
                style={{
                  opacity: revealPreviewVisible ? 1 : 0,
                  transform: revealPreviewVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity ${settings.revealDuration}s ${settings.revealEasing}, transform ${settings.revealDuration}s ${settings.revealEasing}`,
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
                  <Eye className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-cream">Élément révélé</p>
                <p className="text-xs text-muted mt-1 text-center">
                  Apparition progressive vers le haut
                </p>
              </div>
              {/* Indicateur d'état vide */}
              {!revealPreviewVisible && !isRevealAnimating && (
                <p className="text-xs text-muted/40">
                  Cliquez sur « Tester » pour lancer
                </p>
              )}
            </div>
            <div className="mt-2 flex gap-3 text-[11px] font-mono text-muted/60">
              <span>Durée : {settings.revealDuration}s</span>
              <span>•</span>
              <span>Easing : {EASING_OPTIONS.find(o => o.value === settings.revealEasing)?.label ?? settings.revealEasing}</span>
            </div>
          </div>

          {/* Aperçu : Effet au survol */}
          <div className="relative">
            <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">
              Survol (hover)
            </p>
            <div
              className="relative h-40 rounded-xl bg-white/[0.03] border border-white/[0.06]
                overflow-hidden flex items-center justify-center cursor-pointer"
              onMouseEnter={() => setHoverPreviewTransform(true)}
              onMouseLeave={() => setHoverPreviewTransform(false)}
            >
              <div
                className="flex flex-col items-center justify-center p-4"
                style={{
                  transform: hoverPreviewTransform
                    ? 'translateY(-6px) scale(1.04)'
                    : 'translateY(0) scale(1)',
                  boxShadow: hoverPreviewTransform
                    ? '0 12px 32px rgba(212, 168, 67, 0.15)'
                    : '0 0 0 rgba(0, 0, 0, 0)',
                  transition: `transform ${settings.hoverDuration}s ${settings.hoverEasing}, box-shadow ${settings.hoverDuration}s ${settings.hoverEasing}`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3
                    transition-colors duration-300"
                  style={{
                    backgroundColor: hoverPreviewTransform
                      ? 'rgba(212, 168, 67, 0.3)'
                      : 'rgba(212, 168, 67, 0.1)',
                  }}
                >
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-cream">
                  Survoler cette carte
                </p>
                <p className="text-xs text-muted mt-1 text-center">
                  Passez la souris pour voir l&apos;effet
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-3 text-[11px] font-mono text-muted/60">
              <span>Durée : {settings.hoverDuration}s</span>
              <span>•</span>
              <span>Easing : {EASING_OPTIONS.find(o => o.value === settings.hoverEasing)?.label ?? settings.hoverEasing}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Barre d'actions fixe en bas ─────────────────────────── */}
      <div
        className="sticky bottom-0 z-10 flex items-center justify-between gap-4
          glass rounded-2xl p-4 border border-white/[0.06]"
      >
        {/* Indicateur de modification */}
        <div className="text-xs text-muted">
          {hasChanges ? (
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Modifications non enregistrées
            </span>
          ) : (
            <span className="text-muted/50">Aucune modification</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton Réinitialiser */}
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-medium text-cream/70 bg-white/[0.05]
              border border-white/[0.08]
              hover:bg-white/[0.08] hover:text-cream
              active:bg-white/[0.1]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>

          {/* Bouton Sauvegarder */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
              text-sm font-semibold text-neutral-900 bg-amber-400
              hover:bg-amber-300 active:bg-amber-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}