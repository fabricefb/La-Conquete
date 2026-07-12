import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Save, RotateCcw, Palette, Type, RectangleHorizontal, Square, Minus, Maximize, Loader2 } from 'lucide-react';
import type { ThemeSettings, ButtonStyle, CardStyle, BorderRadius } from '../../../types';

// ─── Defaults ───────────────────────────────────────────────────
const DEFAULT_THEME: ThemeSettings = {
  id: 1,
  primary_color: '#d4a843',
  secondary_color: '#d8e3fb',
  accent_color: '#e8c468',
  button_style: 'pill',
  card_style: 'glass',
  border_radius: 'medium',
  title_font: 'Cormorant Garamond',
  body_font: 'Inter',
  updated_at: new Date().toISOString(),
};

// ─── Font catalogues ────────────────────────────────────────────
const TITLE_FONTS = [
  'Cormorant Garamond',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'DM Serif Display',
] as const;

const BODY_FONTS = [
  'Inter',
  'DM Sans',
  'Nunito',
  'Source Sans 3',
  'Outfit',
] as const;

// ─── Border-radius map ──────────────────────────────────────────
const RADIUS_MAP: Record<BorderRadius, string> = {
  none: '0px',
  small: '4px',
  medium: '12px',
  large: '20px',
  full: '9999px',
};

const RADIUS_LABELS: Record<BorderRadius, string> = {
  none: 'Aucun',
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
  full: 'Complet',
};

// ─── Button style config ────────────────────────────────────────
const BUTTON_STYLES: { value: ButtonStyle; label: string }[] = [
  { value: 'pill', label: 'Pillule' },
  { value: 'rounded', label: 'Arrondi' },
  { value: 'sharp', label: 'Carré' },
  { value: 'outline', label: 'Contour' },
  { value: 'gradient', label: 'Dégradé' },
];

// ─── Card style config ──────────────────────────────────────────
const CARD_STYLES: { value: CardStyle; label: string }[] = [
  { value: 'glass', label: 'Verre' },
  { value: 'flat', label: 'Plat' },
  { value: 'bordered', label: 'Bordé' },
  { value: 'shadowed', label: 'Ombré' },
  { value: 'glass-bordered', label: 'Verre bordé' },
];

// ─── Google Fonts loader ────────────────────────────────────────
const FONT_LINK_ID = 'theme-tab-google-fonts';

function loadGoogleFonts(titleFont: string, bodyFont: string): void {
  const encodedTitle = titleFont.replace(/ /g, '+');
  const encodedBody = bodyFont.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encodedTitle}:wght@400;500;600;700&family=${encodedBody}:wght@300;400;500;600;700&display=swap`;

  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (link) {
    link.href = href;
  } else {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

// ─── CSS custom properties applier ──────────────────────────────
function applyThemeToDOM(settings: ThemeSettings): void {
  const style = document.documentElement.style;

  style.setProperty('--custom-primary', settings.primary_color);
  style.setProperty('--custom-secondary', settings.secondary_color);
  style.setProperty('--custom-accent', settings.accent_color);
  style.setProperty('--custom-btn-style', settings.button_style);
  style.setProperty('--custom-card-style', settings.card_style);
  style.setProperty('--custom-radius', RADIUS_MAP[settings.border_radius]);
  style.setProperty('--custom-title-font', settings.title_font);
  style.setProperty('--custom-body-font', settings.body_font);
  style.setProperty('--custom-theme-active', '1');

  loadGoogleFonts(settings.title_font, settings.body_font);
}

function clearThemeFromDOM(): void {
  const style = document.documentElement.style;
  const vars = [
    '--custom-primary',
    '--custom-secondary',
    '--custom-accent',
    '--custom-btn-style',
    '--custom-card-style',
    '--custom-radius',
    '--custom-title-font',
    '--custom-body-font',
    '--custom-theme-active',
  ] as const;
  for (const v of vars) {
    style.removeProperty(v);
  }
}

// ─── Helper: get button preview classes ─────────────────────────
function getButtonPreviewClasses(style: ButtonStyle): string {
  const base = 'px-5 py-2 text-sm font-medium transition-all';
  switch (style) {
    case 'pill':
      return `${base} rounded-full bg-gradient-to-r from-gold-300 to-gold-600 text-charcoal-900 hover:from-gold-200 hover:to-gold-500`;
    case 'rounded':
      return `${base} rounded-xl bg-gradient-to-r from-gold-300 to-gold-600 text-charcoal-900 hover:from-gold-200 hover:to-gold-500`;
    case 'sharp':
      return `${base} rounded-none bg-gradient-to-r from-gold-300 to-gold-600 text-charcoal-900 hover:from-gold-200 hover:to-gold-500`;
    case 'outline':
      return `${base} rounded-full border-2 border-gold-400 text-gold-400 bg-transparent hover:bg-gold-400/10`;
    case 'gradient':
      return `${base} rounded-full bg-gradient-to-r from-gold-200 via-gold-400 to-gold-600 text-charcoal-900 hover:from-gold-100 hover:via-gold-300 hover:to-gold-500`;
    default:
      return base;
  }
}

// ─── Helper: get card preview classes ───────────────────────────
function getCardPreviewClasses(style: CardStyle): string {
  switch (style) {
    case 'glass':
      return 'glass p-4 text-sm';
    case 'flat':
      return 'bg-white/5 rounded-2xl p-4 text-sm';
    case 'bordered':
      return 'border border-gold-400/30 rounded-2xl p-4 text-sm';
    case 'shadowed':
      return 'bg-white/5 rounded-2xl shadow-lg shadow-black/20 p-4 text-sm';
    case 'glass-bordered':
      return 'glass border border-gold-400/30 rounded-2xl p-4 text-sm';
    default:
      return 'glass p-4 text-sm';
  }
}

// ─── Component ──────────────────────────────────────────────────
export function ThemeTab() {
  const { addToast } = useToast();

  const [localSettings, setLocalSettings] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ── Fetch existing settings on mount ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      try {
        const settings = await db.getThemeSettings();
        if (cancelled) return;
        if (settings) {
          setLocalSettings(settings);
          applyThemeToDOM(settings);
        } else {
          applyThemeToDOM(DEFAULT_THEME);
        }
      } catch {
        // Use defaults silently
        if (!cancelled) {
          applyThemeToDOM(DEFAULT_THEME);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => { cancelled = true; };
  }, []);

  // ── Live preview: apply on every change ───────────────────────
  useEffect(() => {
    if (!loading) {
      applyThemeToDOM(localSettings);
    }
  }, [localSettings, loading]);

  // ── Font loading state ────────────────────────────────────────
  useEffect(() => {
    // Mark fonts as loaded once the Google Fonts link resolves
    const checkFonts = () => {
      document.fonts.ready.then(() => setFontsLoaded(true));
    };

    if (document.fonts) {
      checkFonts();
    } else {
      setFontsLoaded(true);
    }
  }, [localSettings.title_font, localSettings.body_font]);

  // ── Updaters ──────────────────────────────────────────────────
  const updateField = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setLocalSettings((prev: ThemeSettings) => ({ ...prev, [key]: value }));
  }, []);

  // ── Save handler ──────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await db.updateThemeSettings(localSettings);
      addToast('Thème sauvegardé avec succès', 'success');
    } catch {
      addToast('Erreur lors de la sauvegarde du thème', 'error');
    } finally {
      setSaving(false);
    }
  }, [localSettings, addToast]);

  // ── Reset handler ─────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    setSaving(true);
    try {
      clearThemeFromDOM();
      await db.updateThemeSettings(DEFAULT_THEME);
      setLocalSettings(DEFAULT_THEME);
      applyThemeToDOM(DEFAULT_THEME);
      addToast('Thème réinitialisé aux valeurs par défaut', 'info');
    } catch {
      addToast('Erreur lors de la réinitialisation', 'error');
    } finally {
      setSaving(false);
    }
  }, [addToast]);

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        <span className="ml-3 text-muted">Chargement des paramètres de thème…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Couleurs ──────────────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Palette className="h-5 w-5 text-gold-400" />
          <h2 className="font-serif text-xl font-semibold text-cream">Couleurs</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Primary color */}
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-2">
              Couleur primaire
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.primary_color}
                onChange={(e) => updateField('primary_color', e.target.value)}
                className="h-10 w-14 rounded-lg cursor-pointer border border-line bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
              />
              <input
                type="text"
                value={localSettings.primary_color}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                    updateField('primary_color', v);
                  }
                }}
                onBlur={(e) => {
                  let v = e.target.value;
                  if (!v.startsWith('#')) v = '#' + v;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    updateField('primary_color', v);
                  } else {
                    updateField('primary_color', localSettings.primary_color);
                  }
                }}
                className="input-surface w-full px-4 py-2.5 text-sm font-mono"
                maxLength={7}
              />
            </div>
          </div>

          {/* Secondary color */}
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-2">
              Couleur secondaire
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.secondary_color}
                onChange={(e) => updateField('secondary_color', e.target.value)}
                className="h-10 w-14 rounded-lg cursor-pointer border border-line bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
              />
              <input
                type="text"
                value={localSettings.secondary_color}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                    updateField('secondary_color', v);
                  }
                }}
                onBlur={(e) => {
                  let v = e.target.value;
                  if (!v.startsWith('#')) v = '#' + v;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    updateField('secondary_color', v);
                  } else {
                    updateField('secondary_color', localSettings.secondary_color);
                  }
                }}
                className="input-surface w-full px-4 py-2.5 text-sm font-mono"
                maxLength={7}
              />
            </div>
          </div>

          {/* Accent color */}
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-2">
              Couleur d&apos;accent
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={localSettings.accent_color}
                onChange={(e) => updateField('accent_color', e.target.value)}
                className="h-10 w-14 rounded-lg cursor-pointer border border-line bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
              />
              <input
                type="text"
                value={localSettings.accent_color}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                    updateField('accent_color', v);
                  }
                }}
                onBlur={(e) => {
                  let v = e.target.value;
                  if (!v.startsWith('#')) v = '#' + v;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    updateField('accent_color', v);
                  } else {
                    updateField('accent_color', localSettings.accent_color);
                  }
                }}
                className="input-surface w-full px-4 py-2.5 text-sm font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Color preview strip */}
        <div className="mt-5 flex gap-1 rounded-xl overflow-hidden h-10">
          <div
            className="flex-1 transition-colors duration-300"
            style={{ backgroundColor: localSettings.primary_color }}
            title="Primaire"
          />
          <div
            className="flex-1 transition-colors duration-300"
            style={{ backgroundColor: localSettings.secondary_color }}
            title="Secondaire"
          />
          <div
            className="flex-1 transition-colors duration-300"
            style={{ backgroundColor: localSettings.accent_color }}
            title="Accent"
          />
        </div>
        <div className="mt-1.5 flex gap-1">
          <span className="flex-1 text-center text-[10px] text-muted">Primaire</span>
          <span className="flex-1 text-center text-[10px] text-muted">Secondaire</span>
          <span className="flex-1 text-center text-[10px] text-muted">Accent</span>
        </div>

        {/* Quick color presets */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-cream/80 mb-2">Palettes rapides</label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Bleu lavande', p: '#d4a843', s: '#d8e3fb', a: '#e8c468' },
              { label: 'Royal navy', p: '#d4a843', s: '#1a1a2e', a: '#e8c468' },
              { label: 'For\u00eat profonde', p: '#2d6a4f', s: '#d8f3dc', a: '#95d5b2' },
              { label: 'Terre cuite', p: '#c1666b', s: '#fdf0d5', a: '#e8985e' },
              { label: 'Minuit dor\u00e9', p: '#f0c040', s: '#1a1a3e', a: '#f0c040' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  updateField('primary_color', preset.p);
                  updateField('secondary_color', preset.s);
                  updateField('accent_color', preset.a);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-cream hover:border-gold-400/40 transition"
              >
                <span className="flex h-4 w-4 rounded-full overflow-hidden">
                  <span className="w-1/2 h-full" style={{ backgroundColor: preset.p }} />
                  <span className="w-1/2 h-full" style={{ backgroundColor: preset.s }} />
                </span>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 2: Style des boutons ────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <RectangleHorizontal className="h-5 w-5 text-gold-400" />
          <h2 className="font-serif text-xl font-semibold text-cream">Style des boutons</h2>
        </div>

        <div className="flex flex-wrap gap-4">
          {BUTTON_STYLES.map(({ value, label }) => {
            const isSelected = localSettings.button_style === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateField('button_style', value)}
                className={`flex flex-col items-center gap-2 focus:outline-none ${
                  isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                } transition-all duration-200`}
              >
                <div
                  className={`p-1 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-bg'
                      : 'hover:ring-1 hover:ring-gold-400/40'
                  }`}
                >
                  <span className={getButtonPreviewClasses(value)}>
                    Exemple
                  </span>
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected ? 'text-gold-400' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Section 3: Style des cartes ─────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Square className="h-5 w-5 text-gold-400" />
          <h2 className="font-serif text-xl font-semibold text-cream">Style des cartes</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CARD_STYLES.map(({ value, label }) => {
            const isSelected = localSettings.card_style === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateField('card_style', value)}
                className={`flex flex-col items-center gap-2 text-left focus:outline-none transition-all duration-200 ${
                  isSelected ? 'scale-[1.02]' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-full transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-bg rounded-2xl'
                      : ''
                  }`}
                >
                  <div className={getCardPreviewClasses(value)}>
                    <div className="h-2 w-10 bg-gold-400/30 rounded mb-2" />
                    <div className="h-1.5 w-full bg-cream/10 rounded mb-1" />
                    <div className="h-1.5 w-3/4 bg-cream/10 rounded mb-1" />
                    <div className="h-1.5 w-1/2 bg-cream/10 rounded" />
                  </div>
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected ? 'text-gold-400' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Section 4: Rayon de bordure ─────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1">
            <Minus className="h-5 w-5 text-gold-400" />
            <Maximize className="h-5 w-5 text-gold-400" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-cream">Rayon de bordure</h2>
        </div>

        <div className="flex flex-wrap gap-4">
          {(Object.keys(RADIUS_MAP) as BorderRadius[]).map((radius) => {
            const isSelected = localSettings.border_radius === radius;
            return (
              <button
                key={radius}
                type="button"
                onClick={() => updateField('border_radius', radius)}
                className={`flex flex-col items-center gap-2 focus:outline-none transition-all duration-200 ${
                  isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`h-16 w-16 bg-gradient-to-br from-gold-400/20 to-gold-600/20 border border-gold-400/40 transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-bg'
                      : ''
                  }`}
                  style={{ borderRadius: RADIUS_MAP[radius] }}
                />
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected ? 'text-gold-400' : 'text-muted'
                  }`}
                >
                  {RADIUS_LABELS[radius]}
                </span>
                <span className="text-[10px] text-muted/60 font-mono">
                  {RADIUS_MAP[radius]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Section 5: Polices ───────────────────────────────── */}
      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Type className="h-5 w-5 text-gold-400" />
          <h2 className="font-serif text-xl font-semibold text-cream">Polices</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          {/* Title font select */}
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-2">
              Police de titre
            </label>
            <select
              value={localSettings.title_font}
              onChange={(e) => updateField('title_font', e.target.value)}
              className="input-surface w-full px-4 py-2.5 text-sm appearance-none cursor-pointer"
            >
              {TITLE_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Body font select */}
          <div>
            <label className="block text-sm font-medium text-cream/80 mb-2">
              Police de corps
            </label>
            <select
              value={localSettings.body_font}
              onChange={(e) => updateField('body_font', e.target.value)}
              className="input-surface w-full px-4 py-2.5 text-sm appearance-none cursor-pointer"
            >
              {BODY_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Font title previews */}
        <div className="mb-4">
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">
            Aperçu des polices de titre
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TITLE_FONTS.map((font) => {
              const isSelected = localSettings.title_font === font;
              return (
                <button
                  key={font}
                  type="button"
                  onClick={() => updateField('title_font', font)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? 'bg-gold-400/10 ring-1 ring-gold-400/40'
                      : 'bg-white/[0.02] hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`block text-lg truncate ${isSelected ? 'text-cream' : 'text-cream/60'}`}
                    style={{
                      fontFamily: `'${font}', serif`,
                      fontWeight: 600,
                      opacity: fontsLoaded ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    {font}
                  </span>
                  <span className="block text-[10px] text-muted mt-0.5">
                    Lorem ipsum dolor sit amet
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font body previews */}
        <div className="mb-5">
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">
            Aperçu des polices de corps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {BODY_FONTS.map((font) => {
              const isSelected = localSettings.body_font === font;
              return (
                <button
                  key={font}
                  type="button"
                  onClick={() => updateField('body_font', font)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? 'bg-gold-400/10 ring-1 ring-gold-400/40'
                      : 'bg-white/[0.02] hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`block text-sm truncate ${isSelected ? 'text-cream' : 'text-cream/60'}`}
                    style={{
                      fontFamily: `'${font}', sans-serif`,
                      opacity: fontsLoaded ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    {font}
                  </span>
                  <span
                    className="block text-[11px] text-muted mt-0.5 leading-tight"
                    style={{ fontFamily: `'${font}', sans-serif` }}
                  >
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Combined preview */}
        <div className="border-t border-line pt-4">
          <p className="text-xs text-muted mb-3 font-medium uppercase tracking-wider">
            Aperçu combiné
          </p>
          <div className="rounded-xl bg-white/[0.03] p-5 border border-line/50">
            <h3
              className="text-2xl font-semibold text-cream mb-2"
              style={{
                fontFamily: `'${localSettings.title_font}', serif`,
                opacity: fontsLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              Bienvenue dans notre église
            </h3>
            <p
              className="text-sm text-cream/70 leading-relaxed"
              style={{
                fontFamily: `'${localSettings.body_font}', sans-serif`,
                opacity: fontsLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              Nous sommes une communauté de foi vivante, engagée à servir Dieu et à partager Son amour avec chacun.
              Rejoignez-nous pour nos cultes dominicaux et nos moments de prière tout au long de la semaine.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Action bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 pb-4">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="btn-ghost flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-muted hover:text-cream disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-gold flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-charcoal-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sauvegarde…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Sauvegarder
            </>
          )}
        </button>
      </div>
    </div>
  );
}