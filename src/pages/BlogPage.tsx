import { useEffect, useMemo, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { ArticleReader } from '../components/ArticleReader';
import { Search, ArrowRight, Clock } from '../lib/icons';
import { articleDate, readingTime, sortedArticles, type Article } from '../lib/articles';
import type { Page } from '../lib/navigation';

const CATEGORIES = ['Tous', 'Enseignement', 'Événement', 'Annonce', 'Vision'] as const;
type Cat = (typeof CATEGORIES)[number];

export function BlogPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [activeCat, setActiveCat] = useState<Cat>('Tous');
  const [search, setSearch] = useState('');
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [activeCat, search]);

  const filtered = useMemo(() => {
    let list = sortedArticles();
    if (activeCat !== 'Tous') list = list.filter(a => a.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => `${a.title} ${a.excerpt}`.toLowerCase().includes(q));
    }
    return list;
  }, [activeCat, search]);

  const [featured, ...rest] = filtered;

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="blog" onNavigate={onNavigate} />
      <MobileNav active="blog" onNavigate={onNavigate} />

      <UniversalHero
        pageKey="blog"
        defaultBadge="Restez informé"
        defaultTitle="Actualités & Enseignements"
        defaultSubtitle="Articles, annonces et nouvelles des extensions pour nourrir votre foi et vous tenir au courant de la vie de l'église."
      />

      <section className="py-16 md:py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un article..."
                className="input-surface w-full py-2.5 pl-10 pr-4 text-sm text-cream"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                    activeCat === c
                      ? 'border-evangile-600 bg-evangile-600 text-white'
                      : 'border-line text-muted hover:border-evangile-600/60 hover:text-cream'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <p className="py-20 text-center text-sm text-muted">Aucun article ne correspond à cette recherche.</p>
          )}

          {featured && (
            <article className="reveal mb-12 grid overflow-hidden border border-line bg-card lg:grid-cols-2">
              <div className="relative h-64 overflow-hidden lg:h-auto">
                <img
                  src={featured.image}
                  alt=""
                  className="photo-claro h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <div className="flex items-center gap-3">
                  <span className="rule-accent" />
                  <p className="section-eyebrow">{featured.category}</p>
                </div>
                <h2 className="card-title mt-4 text-cream">{featured.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">{featured.excerpt}</p>
                <div className="mt-6 flex items-center gap-5 text-xs uppercase tracking-[0.12em] text-muted">
                  <span>{articleDate(featured.date)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {readingTime(featured)}
                  </span>
                </div>
                <button onClick={() => setOpenArticle(featured)} className="btn-primary mt-8 w-fit">
                  Lire l'article
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a, i) => (
              <RevealCard key={a.slug} delay={i % 3}>
                <button
                  onClick={() => setOpenArticle(a)}
                  className="group flex h-full w-full flex-col border border-line bg-card text-left transition-colors hover:border-evangile-600/60"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={a.image}
                      alt=""
                      className="photo-claro h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <span className="absolute left-0 top-0 bg-evangile-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      {a.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{articleDate(a.date)}</p>
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-cream group-hover:text-accent-300 transition-colors">
                      {a.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{a.excerpt}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-400">
                      Lire
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      <ArticleReader article={openArticle} onClose={() => setOpenArticle(null)} onNavigate={onNavigate} />

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}

function RevealCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  return <div className={`reveal reveal-delay-${delay + 1} h-full`}>{children}</div>;
}
