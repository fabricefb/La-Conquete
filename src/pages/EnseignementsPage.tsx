import { useEffect, useState, useMemo } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { IconBox } from '../components/IconBox';
import { Play, Calendar, BookOpen, FileText, Download, Search } from '../lib/icons';
import { supabase } from '../lib/supabase';
import type { Page } from '../lib/navigation';

// ─── Types ────────────────────────────────────────────────────────
interface Enseignement {
  id: string;
  title: string;
  speaker: string;
  date: string;
  category: string;
  description: string;
  audioUrl?: string;
  pdfUrl?: string;
}

// ─── Static fallback ──────────────────────────────────────────────
const FALLBACK: Enseignement[] = [
  { id: '1', title: 'La Conquête des Âmes', speaker: 'Pst Josué Romain KAZADI', date: '2024-11-10', category: 'Foi', description: 'Comment devenir un pêcheur d\'hommes efficace selon les principes bibliques.', audioUrl: '#', pdfUrl: '#' },
  { id: '2', title: 'La Puissance de la Prière', speaker: 'Pst Josué Romain KAZADI', date: '2024-10-27', category: 'Prière', description: 'Les clés pour une vie de prière puissante et transformative.' },
  { id: '3', title: 'Marcher par l\'Esprit', speaker: 'Pst Maurisse ESOSA', date: '2024-10-20', category: 'Saint-Esprit', description: 'Comprendre et vivre la direction du Saint-Esprit au quotidien.' },
  { id: '4', title: 'L\'Identité du Croyant', speaker: 'Pst Josué Romain KAZADI', date: '2024-10-06', category: 'Identité', description: 'Qui sommes-nous en Christ ? Découvrir notre vraie identité spirituelle.' },
  { id: '5', title: 'La Dîme et la Providence', speaker: 'Pst Maurisse ESOSA', date: '2024-09-29', category: 'Finances', description: 'Les principes bibliques de la prospérité et de la gestion des ressources.' },
  { id: '6', title: 'Les Dons Spirituels', speaker: 'Pst Josué Romain KAZADI', date: '2024-09-15', category: 'Saint-Esprit', description: 'Découvrir, développer et exercer les dons que le Saint-Esprit a placés en nous.' },
];

const SERIES = [
  { title: 'La Conquête Spirituelle', count: 8, desc: 'Une série sur la vie de victoire en Christ.' },
  { title: 'Fondements de la Foi', count: 12, desc: 'Les bases essentielles de la vie chrétienne.' },
  { title: 'Famille selon Dieu', count: 6, desc: 'Construire un foyer qui honore le Seigneur.' },
];

const STUDIES = [
  { title: 'L\'Épître aux Romains — Chapitre 1-4', sessions: 8 },
  { title: 'Le Livre de Daniel — Prophétie et Foi', sessions: 12 },
  { title: 'Les Béatitudes — Le Royaume inversé', sessions: 6 },
];

// ─── Component ─────────────────────────────────────────────────────
export function EnseignementsPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [items, setItems] = useState<Enseignement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    async function fetchEnseignements() {
      try {
        const { data } = await supabase.from('contents').select('*').eq('type', 'enseignement').order('created_at', { ascending: false }).limit(20);
        if (!cancelled && data && data.length > 0) {
          setItems(data.map((d: any) => ({
            id: d.id, title: d.title || d.value || '', speaker: d.speaker || '', date: d.created_at, category: d.category || 'Enseignement', description: d.description || d.value || '',
            audioUrl: d.audio_url || '', pdfUrl: d.pdf_url || '',
          })));
        } else {
          if (!cancelled) setItems(FALLBACK);
        }
      } catch { if (!cancelled) setItems(FALLBACK); }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchEnseignements();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => ['Tous', ...Array.from(new Set(items.map(i => i.category)))], [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeFilter !== 'Tous') list = list.filter(i => i.category === activeFilter);
    if (search) list = list.filter(i => (i.title || '').toLowerCase().includes(search.toLowerCase()) || (i.speaker || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [items, activeFilter, search]);

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="enseignements" onNavigate={onNavigate} />
      <MobileNav active="enseignements" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <UniversalHero pageKey="enseignements" defaultBadge="Croître dans la foi" defaultTitle="Enseignements & Études Bibliques" />

      {/* ═══ DERNIÈRES PRÉDICATIONS ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Ressources</p>
          <h2 className="reveal reveal-delay-1 mb-8 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Dernières Prédications</h2>

          {/* Search & Filter */}
          <div className="reveal reveal-delay-2 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input-surface w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-cream" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c} onClick={() => setActiveFilter(c)} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${activeFilter === c ? 'bg-evangile-600 text-white' : 'glass text-muted hover:text-cream'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-5 animate-pulse"><div className="h-4 w-3/4 rounded bg-white/10" /><div className="mt-3 h-3 w-1/2 rounded bg-white/5" /></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item, i) => (
                <div key={item.id} className={`reveal reveal-delay-${(i % 4) + 1} glass-card card-parallax rounded-2xl p-5 flex flex-col transition-all duration-300`}>
                  <div className="mb-3 flex items-center gap-3">
                    {item.audioUrl && (
                      <button className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-evangile-600 text-white transition-transform hover:scale-110">
                        <Play className="h-4 w-4 ml-0.5" />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base font-semibold text-cream truncate">{item.title}</h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                        <span>{item.speaker}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted line-clamp-2 flex-1">{item.description}</p>
                  <span className="mt-3 inline-block self-start rounded-full bg-accent-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-400">{item.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ SÉRIES ═══ */}
      <section className="py-20 lg:py-28 px-4 bg-radial-ember">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Formations</p>
          <h2 className="reveal reveal-delay-1 mb-10 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Séries d'Enseignement</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {SERIES.map((s, i) => (
              <div key={s.title} className={`reveal reveal-delay-${i + 1} glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]`}>
                <p className="text-xs font-bold uppercase tracking-widest text-accent-400">{s.count} enseignements</p>
                <h3 className="mt-2 font-serif text-lg font-semibold text-cream">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ÉTUDES BIBLIQUES ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-3xl">
          <p className="reveal section-label mb-3 text-center">Plonger dans la Parole</p>
          <h2 className="reveal reveal-delay-1 mb-10 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Études Bibliques</h2>
          <div className="space-y-3">
            {STUDIES.map((s, i) => (
              <div key={s.title} className={`reveal reveal-delay-${(i % 4) + 1} glass-card rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.01]`}>
                <IconBox pageKey="enseignements" elementId={`study-icon-${i}`} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400">
                  <BookOpen className="h-5 w-5" />
                </IconBox>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-cream truncate">{s.title}</h3>
                  <p className="text-xs text-muted">{s.sessions} sessions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RESSOURCES TÉLÉCHARGEABLES ═══ */}
      <section className="py-20 px-4 bg-radial-primary">
        <div className="reveal mx-auto max-w-2xl text-center">
          <FileText className="mx-auto mb-4 h-8 w-8 text-accent-400/60" />
          <p className="section-label justify-center">Ressources</p>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-cream sm:text-4xl">Téléchargements</h2>
          <p className="mt-4 text-muted">Les supports PDF des enseignements seront bientôt disponibles.</p>
          <button className="mt-6 btn-ghost"><Download className="h-4 w-4" /> Bientôt disponible</button>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}