import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';

interface SectionVisibility {
  visible: boolean;
  config: Record<string, unknown>;
}

/**
 * Hook universel pour charger la config builder d'une page.
 * Charge DEUX clés depuis site_settings :
 *   - `builder_config_{pageKey}`  → visibilité des sections
 *   - `builder_elements_{pageKey}` → visibilité des éléments décoratifs (icones, etc.)
 */
export function usePageBuilderConfig(pageKey: string) {
  const [config, setConfig] = useState<Record<string, SectionVisibility>>({});
  const [elements, setElements] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sectionData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `builder_config_${pageKey}`)
        .single();

      if (cancelled) return;

      if (sectionData?.value) {
        try {
          const parsed = typeof sectionData.value === 'string'
            ? JSON.parse(sectionData.value) as any[]
            : sectionData.value as any[];
          if (Array.isArray(parsed)) {
            const cfg: Record<string, SectionVisibility> = {};
            for (const s of parsed) {
              cfg[s.id] = { visible: !!s.visible, config: s.config || {} };
            }
            setConfig(cfg);
          }
        } catch { /* keep empty */ }
      }

      // Load elements config
      const { data: elemData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `builder_elements_${pageKey}`)
        .single();

      if (cancelled) return;

      if (elemData?.value) {
        try {
          const parsed = typeof elemData.value === 'string'
            ? JSON.parse(elemData.value) as any[]
            : elemData.value as any[];
          if (Array.isArray(parsed)) {
            const elMap: Record<string, boolean> = {};
            for (const el of parsed) {
              elMap[el.id] = el.visible !== false;
            }
            setElements(elMap);
          }
        } catch { /* keep empty */ }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pageKey]);

  const isSectionVisible = useCallback((sectionId: string): boolean => {
    const cfg = config[sectionId];
    if (!cfg) return true;
    return cfg.visible;
  }, [config]);

  const getSectionConfig = useCallback((sectionId: string, key: string, fallback: unknown = ''): unknown => {
    return config[sectionId]?.config?.[key] ?? fallback;
  }, [config]);

  const isElementVisible = useCallback((elementId: string, defaultVisible = true): boolean => {
    const val = elements[elementId];
    if (val === undefined) return defaultVisible;
    return val;
  }, [elements]);

  return { isSectionVisible, isElementVisible, getSectionConfig, builderConfig: config, elementsConfig: elements };
}