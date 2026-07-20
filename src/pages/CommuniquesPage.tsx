import { useState, useEffect } from 'react';
import { FileText, ArrowRight } from '../lib/icons';
import { IconBox } from '../components/IconBox';
import { UniversalHero } from '../components/UniversalHero';
import type { Page } from '../lib/navigation';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { supabase } from '../lib/supabase';

interface CommuniquesPageProps {
  onNavigate: (page: Page) => void;
  openAuth?: (view?: 'login' | 'signup') => void;
}

interface Communique {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
}

const FALLBACK_COMMUNIQUES: Communique[] = [
  {
    id: '1',
    title: 'Retraite spirituelle annuelle 2026',
    date: '2026-07-15',
    excerpt: 'L\'église organise sa retraite spirituelle annuelle du 25 au 27 juillet 2026. Tous les membres sont invités à s\'inscrire auprès du secrétariat.',
    category: 'Événement',
  },
  {
    id: '2',
    title: 'Nouveau programme de formation biblique',
    date: '2026-07-10',
    excerpt: 'L\'école biblique La Conquête lance un nouveau cycle de formation en théologie pratique. Les cours débuteront en septembre 2026.',
    category: 'Formation',
  },
  {
    id: '3',
    title: 'Campaign d\'évangélisation quartier Matonge',
    date: '2026-07-05',
    excerpt: 'Une grande campagne d\'évangélisation est prévue dans le quartier Matonge du 10 au 12 août. Bénévoles et pasteurs sont appelés à participer.',
    category: 'Évangélisation',
  },
];

export function CommuniquesPage({ onNavigate }: CommuniquesPageProps) {
  const [communiques, setCommuniques] = useState<Communique[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchCommuniques() {
      try {
        const { data, error } = await supabase
          .from('communications')
          .select('*')
          .eq('is_active', true)
          .order('published_at', { ascending: false });
        if (!cancelled) {
          if (error) console.warn('Communiques fetch error:', error.message);
          setCommuniques((data && data.length > 0 ? data : FALLBACK_COMMUNIQUES) as Communique[]);
        }
      } catch {
        if (!cancelled) setCommuniques(FALLBACK_COMMUNIQUES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCommuniques();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="communiques" />
    <div className="min-h-screen bg-bg">
      <UniversalHero pageKey="communiques" defaultBadge="Informations officielles" defaultTitle="Nos Communiqués" defaultSubtitle="Les annonces et communications officielles de l'Église Évangélique La Conquête." />

      <section className="mx-auto max-w-3xl px-4 pb-24">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-white/5" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-28 rounded bg-white/5" />
                    <div className="h-5 w-3/4 rounded bg-white/5" />
                    <div className="h-3 w-full rounded bg-white/5" />
                    <div className="h-3 w-2/3 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : communiques.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <IconBox pageKey="communiques" elementId="filetext-icon" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/10">
              <FileText className="h-7 w-7 text-accent-500" />
            </IconBox>
            <p className="mt-4 text-lg font-semibold text-cream">Aucun communiqué</p>
            <p className="mt-1 text-sm text-muted">Il n'y a pas de communiqués pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {communiques.map(c => (
              <div key={c.id} className="glass rounded-2xl p-6 transition-all duration-300 hover:bg-white/5 group cursor-pointer">
                <div className="flex items-start gap-4">
                  <IconBox pageKey="communiques" elementId="filetext-icon" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/10">
                    <FileText className="h-5 w-5 text-accent-500" />
                  </IconBox>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">{c.category}</span>
                      <span className="text-xs text-muted">{new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-cream group-hover:text-accent-300 transition-colors">{c.title}</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{c.excerpt}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted group-hover:text-accent-400 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
      <SiteFooter onNavigate={onNavigate} />
    </>
  );
}