import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SectionVisibility {
  visible: boolean;
  config: Record<string, unknown>;
}

/**
 * Hook universel pour charger la config builder d'une page.
 * Chaque page peut avoir une clé `builder_config_{pageKey}` dans site_settings.
 * Retourne `isSectionVisible(sectionId)` pour contrôler la visibilité.
 */
export function usePageBuilderConfig(pageKey: string) {
  const [config, setConfig] = useState<Record<string, SectionVisibility>>({});

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', `builder_config_${pageKey}`)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.value) {
          try {
            const parsed = typeof data.value === 'string'
              ? JSON.parse(data.value) as any[]
              : data.value as any[];
            if (Array.isArray(parsed)) {
              const cfg: Record<string, SectionVisibility> = {};
              for (const s of parsed) {
                cfg[s.id] = { visible: !!s.visible, config: s.config || {} };
              }
              setConfig(cfg);
            }
          } catch { /* keep empty */ }
        }
      })
      .catch(() => {});
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

  return { isSectionVisible, getSectionConfig, builderConfig: config };
}