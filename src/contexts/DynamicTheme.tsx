import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase, db } from '../lib/supabase';
import type { ThemeSettings, Theme, BorderRadius } from '../types';

// ─── Font catalogues ──────────────────────────────────────────────
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

// ─── Border-radius mapping ────────────────────────────────────────
const RADIUS_MAP: Record<BorderRadius, string> = {
  none: '0px',
  small: '4px',
  medium: '12px',
  large: '20px',
  full: '9999px',
};

// ─── Context shape ────────────────────────────────────────────────
interface DynamicThemeContextValue {
  themeSettings: ThemeSettings | null;
  isCustomTheme: boolean;
  applyTheme: (settings: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
  colorMode: Theme;
  toggleColorMode: () => void;
  loading: boolean;
}

const DynamicThemeContext = createContext<DynamicThemeContextValue | null>(null);

// ─── Google Fonts loader ──────────────────────────────────────────
const FONT_LINK_ID = 'dynamic-theme-google-fonts';

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

// ─── localStorage helpers ─────────────────────────────────────────
const STORAGE_KEY = 'la-conquete-theme';

function getStoredColorMode(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'dark';
}

// ─── CSS variable names to clear on reset ─────────────────────────
const CUSTOM_CSS_VARS = [
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

// ─── Provider ─────────────────────────────────────────────────────
export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [isCustomTheme, setIsCustomTheme] = useState(false);
  const [colorMode, setColorMode] = useState<Theme>(getStoredColorMode);
  const [loading, setLoading] = useState(true);

  // ── Apply CSS variables from settings ──────────────────────────
  const applyTheme = useCallback((settings: Partial<ThemeSettings>) => {
    const el = document.documentElement;
    const style = el.style;

    if (settings.primary_color !== undefined) style.setProperty('--custom-primary', settings.primary_color);
    if (settings.secondary_color !== undefined) style.setProperty('--custom-secondary', settings.secondary_color);
    if (settings.accent_color !== undefined) style.setProperty('--custom-accent', settings.accent_color);
    if (settings.button_style !== undefined) style.setProperty('--custom-btn-style', settings.button_style);
    if (settings.card_style !== undefined) style.setProperty('--custom-card-style', settings.card_style);
    if (settings.border_radius !== undefined) style.setProperty('--custom-radius', RADIUS_MAP[settings.border_radius]);
    if (settings.title_font !== undefined) style.setProperty('--custom-title-font', settings.title_font);
    if (settings.body_font !== undefined) style.setProperty('--custom-body-font', settings.body_font);

    style.setProperty('--custom-theme-active', '1');

    if (settings.title_font || settings.body_font) {
      loadGoogleFonts(
        settings.title_font ?? 'Inter',
        settings.body_font ?? 'Inter',
      );
    }

    setIsCustomTheme(true);
  }, []);

  // ── Reset custom CSS variables ─────────────────────────────────
  const resetTheme = useCallback(() => {
    const style = document.documentElement.style;
    for (const cssVar of CUSTOM_CSS_VARS) {
      style.removeProperty(cssVar);
    }
    setIsCustomTheme(false);
    setThemeSettings(null);
  }, []);

  // ── Toggle dark / light ────────────────────────────────────────
  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  // ── Sync color-mode class on <html> ───────────────────────────
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('dark', 'light');
    el.classList.add(colorMode);
  }, [colorMode]);

  // ── Fetch theme settings on mount ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const settings = await db.getThemeSettings();
        if (cancelled) return;
        if (settings) {
          setThemeSettings(settings);
          applyTheme(settings);
        }
      } catch {
        // Silently fail — site works with defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [applyTheme]);

  // ── Context value ─────────────────────────────────────────────
  const value = useMemo<DynamicThemeContextValue>(
    () => ({
      themeSettings,
      isCustomTheme,
      applyTheme,
      resetTheme,
      colorMode,
      toggleColorMode,
      loading,
    }),
    [themeSettings, isCustomTheme, applyTheme, resetTheme, colorMode, toggleColorMode, loading],
  );

  return (
    <DynamicThemeContext.Provider value={value}>
      {children}
    </DynamicThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useDynamicTheme(): DynamicThemeContextValue {
  const ctx = useContext(DynamicThemeContext);
  if (ctx === null) {
    throw new Error('useDynamicTheme must be used within a <DynamicThemeProvider>');
  }
  return ctx;
}