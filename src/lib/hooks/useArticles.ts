import { useEffect, useState } from 'react';
import { db, isSupabaseConfigured } from '../supabase';
import { ARTICLES, toArticle, type Article } from '../articles';

/* Les articles éditoriaux viennent de la table `articles` quand elle est
   disponible ; sinon on garde les articles rédigés dans le dépôt. */
export function useArticles(): Article[] {
  const [articles, setArticles] = useState<Article[]>(ARTICLES);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    db.getPublishedArticles()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setArticles(rows.map(toArticle));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return articles;
}
