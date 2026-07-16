import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

/* ═══════════════════════════════════════════════════════════════════
   useSectionColors — Hook that loads per-section text & bg colors
   from site_settings and provides them to ANY page.

   Storage keys in Supabase (site_settings table):
     - "section_colors_home"         → JSON { sectionId: { text, bg } }
     - "section_colors_culte"        → JSON { sectionId: { text, bg } }
     - "section_colors_vision"       → JSON { sectionId: { text, bg } }
     - etc.

   Usage in any page:
     const { getSectionStyle, getColorMap } = useSectionColors('culte');
     const style = getSectionStyle('hero');
     // → { color: '#ffffff', backgroundColor: '#0F2147' } or {}
   ═══════════════════════════════════════════════════════════════════ */

interface SectionColorEntry {
  text: string;   // hex color for text
  bg: string;     // hex color for background
}

type SectionColorMap = Record<string, SectionColorEntry>;

interface UseSectionColorsReturn {
  colorMap: SectionColorMap;
  loading: boolean;
  /** Returns inline style object for a given section ID */
  getSectionStyle: (sectionId: string) => React.CSSProperties;
  /** Get just the text color for a section */
  getTextColor: (sectionId: string) => string | undefined;
  /** Get just the bg color for a section */
  getBgColor: (sectionId: string) => string | undefined;
}

export function useSectionColors(pageId: string): UseSectionColorsReturn {
  const [colorMap, setColorMap] = useState<SectionColorMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', `section_colors_${pageId}`)
          .single();

        if (!cancelled && data?.value) {
          try {
            const parsed = JSON.parse(data.value) as SectionColorMap;
            setColorMap(parsed);
          } catch {
            // Corrupted JSON, keep empty
          }
        }
      } catch {
        // Keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pageId]);

  const getSectionStyle = useCallback((sectionId: string): React.CSSProperties => {
    const entry = colorMap[sectionId];
    if (!entry) return {};
    const style: React.CSSProperties = {};
    if (entry.text) style.color = entry.text;
    if (entry.bg) style.backgroundColor = entry.bg;
    return style;
  }, [colorMap]);

  const getTextColor = useCallback((sectionId: string): string | undefined => {
    return colorMap[sectionId]?.text;
  }, [colorMap]);

  const getBgColor = useCallback((sectionId: string): string | undefined => {
    return colorMap[sectionId]?.bg;
  }, [colorMap]);

  return { colorMap, loading, getSectionStyle, getTextColor, getBgColor };
}

/* ═══════════════════════════════════════════════════════════════════
   Helper: Save section colors for a page (used by admin tabs)
   ═══════════════════════════════════════════════════════════════════ */

export async function saveSectionColors(
  pageId: string,
  colorMap: SectionColorMap,
): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      {
        key: `section_colors_${pageId}`,
        value: JSON.stringify(colorMap),
        type: 'json',
        category: 'general',
        label: `Couleurs de sections — ${pageId}`,
        sort_order: 600,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
  if (error) throw new Error(error.message);
}

export async function loadSectionColors(pageId: string): Promise<SectionColorMap> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', `section_colors_${pageId}`)
    .single();

  if (data?.value) {
    try {
      return JSON.parse(data.value) as SectionColorMap;
    } catch {
      return {};
    }
  }
  return {};
}