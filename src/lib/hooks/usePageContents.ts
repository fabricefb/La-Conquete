import { useEffect, useState } from 'react';
import { db, buildContentMap } from '../supabase';

/**
 * Hook universel pour charger les textes d'une page depuis page_contents.
 * Retourne un contentMap prêt à utiliser avec getContent().
 *
 * Usage dans une page :
 *   const cm = usePageContents('home');
 *   // puis :
 *   <p>{getContent(cm, 'pillars', 'heading_label', 'Nos Fondements')}</p>
 */
export function usePageContents(pageKey: string): Record<string, string> {
  const [contentMap, setContentMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    db.getPageContents(pageKey)
      .then(contents => {
        if (!cancelled) {
          setContentMap(buildContentMap(contents));
        }
      })
      .catch(() => { /* keep empty map on error */ });

    return () => { cancelled = true; };
  }, [pageKey]);

  return contentMap;
}