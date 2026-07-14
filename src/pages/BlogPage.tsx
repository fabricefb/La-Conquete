import { useEffect, useState, useMemo } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Search, Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight } from '../lib/icons';
import { supabase } from '../lib/supabase';
import type { Page } from '../lib/navigation';

// ─── Types ────────────────────────────────────────────────────────
interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  imageUrl: string;
  isFeatured: boolean;
}

const CATEGORIES = ['Tous', 'Enseignement', 'Témoignage', 'Événement', 'Annonce'] as const;
type Cat = (typeof CATEGORIES)[number];

// ─── Fallback ─────────────────────────────────────────────────────
const FALLBACK: BlogArticle[] = [
  { id: '1', title: 'Comment développer une vie de prière puissante', excerpt: 'La prière n\'est pas une option pour le croyant — c\'est sa respiration spirituelle. Découvrez les principes bibliques pour une vie de prière efficace.', category: 'Enseignement', date: '2024-11-12', readTime: '5 min', imageUrl: '/priere.jpg', isFeatured: true },
  { id: '2', title: 'Témoignage : Ma guérison divine', excerpt: 'Sœur Marie partage comment la fidélité de Dieu s\'est manifestée dans sa vie à travers une guérison miraculeuse.', category: 'Témoignage', date: '2024-11-08', readTime: '4 min', imageUrl: '/bible.jpg', isFeatured: false },
  { id: '3', title: 'Retour en images : Conférence des Jeunes 2024', excerpt: 'Plus de 300 jeunes se sont rassemblés pour trois jours de louange, d\'enseignement et de communion.', category: 'Événement', date: '2024-10-28', readTime: '3 min', imageUrl: '/church-photo-1.jpg', isFeatured: false },
  { id: '4', title: 'Les 7 piliers d\'une famille forte', excerpt: 'Dieu a un plan pour votre foyer. Voici les principes fondamentaux pour bâtir une famille selon le cœur de Dieu.', category: 'Enseignement', date: '2024-10-20', readTime: '6 min', imageUrl: '/church-photo-2.jpg', isFeatured: false },
  { id: '5', title: 'Programme de fin d\'année 2024', excerpt: 'Découvrez le programme complet des activités prévues pour les mois de novembre et décembre.', category: 'Annonce', date: '2024-10-15', readTime: '2 min', imageUrl: '/church-photo-3.jpg', isFeatured: false },
  { id: '6', title: 'Comprendre la dîme : Au-delà du chiffre', excerpt: 'La dîme n\'est pas un fardeau mais un privilège. Approfondissons ce que la Bible enseigne sur la générosité.', category: 'Enseignement', date: '2024-10-10', readTime: '7 min', imageUrl: '/predication-1.jpg', isFeatured: false },
  { id: '7', title: 'Mon voyage de l\'athéisme à la foi', excerpt: 'Frère Jean raconte comment une simple invitation a changé le cours de sa vie éternelle.', category: 'Témoignage', date: '2024-10-01', readTime: '5 min', imageUrl: '/bible.jpg', isFeatured: false },
];

// ─── Component ─────────────────────────────────────────────────────
export function BlogPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<Cat>('Tous');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [articles]);

  useEffect(() => {
    let cancelled = false;
    async function fetchBlog() {
      try {
        const { data } = await supabase.from('contents').select('*').eq('type', 'blog').order('created_at', { ascending: false }).limit(30);
        if (!cancelled && data && data.length > 0) {
          setArticles(data.map((d: Record<string, string>) => ({
            id: d.id, title: d.title || '', excerpt: d.description || d.value || '', category: d.category || 'Enseignement',
            date: d.created_at, readTime: `${Math.max(2, Math.ceil((d.value || '').length / 200))} min`, imageUrl: d.image_url || '/church-photo-1.jpg', isFeatured: d.is_featured === 'true',
          })));
        } else { if (!cancelled) setArticles(FALLBACK); }
      } catch { if (!cancelled) setArticles(FALLBACK); }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchBlog();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCat !== 'Tous') list = list.filter(a => a.category === activeCat);
    if (search) list = list.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [articles, activeCat, search]);

  const featured = filtered.find(a => a.isFeatured);
  const regular = filtered.filter(a => !a.isFeatured);
  const paged = regular.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(regular.length / PER_PAGE);

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="blog" onNavigate={onNavigate} />
      <MobileNav active="blog" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 spirit-breath">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg z-10" />
        <div className="relative z-20 mx-auto max-w-4xl px-4 text-center">
          <span className="reveal mb-4 inline-block rounded-full border border-evangile-600/30 bg-evangile-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-evangile-500">
            Restez informé
          </span>
          <h1 className="reveal reveal-delay-1 font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:text-6xl">
            Actualités & <span className="brand-text">Enseignements</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-6 text-lg text-muted sm:text-xl max-w-2xl mx-auto">
            Articles, témoignages et annonces pour nourrir votre foi et vous tenir au courant de la vie de l'église.
          </p>
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-7xl">
          {/* Search & Filters */}
          <div className="reveal mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un article..." className="input-surface w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-cream" />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setActiveCat(c); setPage(1); }} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${activeCat === c ? 'bg-evangile-600 text-white' : 'glass text-muted hover:text-cream'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-48 bg-white/5" />
                  <div className="p-5 space-y-3"><div className="h-3 w-16 rounded bg-white/10" /><div className="h-5 w-full rounded bg-white/10" /><div className="h-3 w-3/4 rounded bg-white/5" /></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && page === 1 && (
                <div className="reveal mb-10 glass-card rounded-2xl overflow-hidden sm:flex">
                  <div className="sm:w-1/2 h-64 sm:h-auto overflow-hidden">
                    <img src={featured.imageUrl} alt={featured.title} className="blog-img-zoom h-full w-full object-cover" />
                  </div>
                  <div className="p-6 sm:p-8 sm:w-1/2 flex flex-col justify-center">
                    <span className="mb-2 inline-block w-fit rounded-full bg-evangile-600/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-evangile-500">{featured.category}</span>
                    <h2 className="font-serif text-2xl font-bold text-cream sm:text-3xl">{featured.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{featured.excerpt}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(featured.date).toLocaleDateString('fr-FR')}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{featured.readTime}</span>
                    </div>
                    <button className="mt-5 btn-ghost w-fit text-sm">Lire l'article <ArrowRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {/* Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paged.map((a, i) => (
                  <article key={a.id} className={`reveal reveal-delay-${(i % 4) + 1} glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]`}>
                    <div className="relative h-48 overflow-hidden">
                      <img src={a.imageUrl} alt={a.title} className="blog-img-zoom h-full w-full object-cover" />
                      <span className="absolute top-3 left-3 rounded-full bg-evangile-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">{a.category}</span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg font-semibold text-cream line-clamp-2">{a.title}</h3>
                      <p className="mt-2 text-sm text-muted line-clamp-2">{a.excerpt}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted">
                        <span>{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                        <span>{a.readTime}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="reveal mt-10 flex items-center justify-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-xl border border-white/10 p-2 text-muted transition-colors hover:border-evangile-600/40 hover:text-cream disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`h-9 w-9 rounded-xl text-sm font-semibold transition-all ${page === i + 1 ? 'bg-evangile-600 text-white' : 'glass text-muted hover:text-cream'}`}>{i + 1}</button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-xl border border-white/10 p-2 text-muted transition-colors hover:border-evangile-600/40 hover:text-cream disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}