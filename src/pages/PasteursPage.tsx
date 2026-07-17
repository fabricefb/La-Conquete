import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { supabase } from '../lib/supabase';
import { Globe, Mail, Phone } from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Pastor } from '../types';

// ─── Fallback data ────────────────────────────────────────────────
const FALLBACK: Pastor[] = [
  { id: 'fb-1', name: 'Pst Josué Romain KAZADI', role: 'Pasteur Principal — Fondateur', bio: 'Homme de Dieu visionnaire et passionné, il conduit l\'église avec sagesse et détermination.', photo_url: '/pasteur-kazadi.jpg', thought: 'La Parole de Dieu est notre boussole.', sort_order: 0, is_main: true, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-2', name: 'Theresse KATEBA', role: 'Épouse du Pasteur — Co-fondatrice', bio: 'Dédie sa vie à l\'accompagnement des femmes et des familles dans la foi.', photo_url: '/pasteur-femme.jpg', thought: '', sort_order: 1, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-3', name: 'Maurisse ESOSA', role: 'Pasteur Associé', bio: 'Serviteur fidèle, il appuie la vision pastorale avec zèle et humilité.', photo_url: '/maurisse-esosa.jpg', thought: '', sort_order: 2, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-4', name: 'Theresse KATEBA', role: 'Responsable Femmes', bio: 'Animée par l\'amour de Christ, elle œuvre pour l\'épanouissement spirituel des sœurs.', photo_url: '/theresse-kateba.jpg', thought: '', sort_order: 3, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
];

const CATEGORIES = [
  { key: 'principaux', label: 'Pasteurs Principaux', filter: (p: Pastor) => p.is_main },
  { key: 'equipe', label: 'Équipe Pastorale', filter: (p: Pastor) => !p.is_main },
] as const;

// ─── Skeleton ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
      <div className="h-64 bg-white/5" />
      <div className="p-6 space-y-3">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-3/4 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────
export function PasteursPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [pastors]);

  useEffect(() => {
    let cancelled = false;
    async function fetchPastors() {
      try {
        const { data, error } = await supabase.from('pastors').select('*').eq('is_active', true).order('sort_order');
        if (!cancelled) {
          setPastors((data && data.length > 0 ? data : FALLBACK) as Pastor[]);
          if (error) console.warn('Pasteurs fetch error:', error.message);
        }
      } catch {
        if (!cancelled) setPastors(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPastors();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="pasteurs" onNavigate={onNavigate} />
      <MobileNav active="pasteurs" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <UniversalHero pageKey="pasteurs" defaultBadge="Serviteurs de Dieu" defaultTitle="Notre Équipe Pastorale" defaultSubtitle="Des hommes et des femmes appelés et équipés pour servir l'Église et la communauté." />

      {/* ═══ PASTOR CATEGORIES ═══ */}
      {CATEGORIES.map((cat, ci) => {
        const members = pastors.filter(cat.filter);
        if (members.length === 0) return null;
        return (
          <section key={cat.key} className={`py-20 lg:py-28 px-4 ${ci % 2 === 1 ? 'bg-radial-ember' : ''}`}>
            <div className="mx-auto max-w-6xl">
              <p className="reveal section-label mb-3 text-center">{cat.label}</p>
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: members.length || 2 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {members.map((p, i) => (
                    <div key={p.id} className={`reveal reveal-delay-${(i % 4) + 1} glass-card card-parallax rounded-2xl overflow-hidden`}>
                      <div className="relative h-64 overflow-hidden">
                        <img src={p.photo_url || '/pasteur-kazadi.jpg'} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                        <div className="pastor-overlay absolute inset-0" />
                      </div>
                      <div className="p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-evangile-500">{p.role}</p>
                        <h3 className="mt-1 font-serif text-lg font-semibold text-cream">{p.name}</h3>
                        {p.bio && <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">{p.bio}</p>}
                        <div className="mt-4 flex gap-2">
                          <a href="#" className="rounded-lg border border-white/10 p-2 text-muted transition-colors hover:border-evangile-600/40 hover:text-evangile-500"><Globe className="h-4 w-4" /></a>
                          <a href="#" className="rounded-lg border border-white/10 p-2 text-muted transition-colors hover:border-evangile-600/40 hover:text-evangile-500"><Mail className="h-4 w-4" /></a>
                          <a href="#" className="rounded-lg border border-white/10 p-2 text-muted transition-colors hover:border-evangile-600/40 hover:text-evangile-500"><Phone className="h-4 w-4" /></a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-4 bg-radial-primary">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="section-label mb-4">Rejoignez l'équipe</p>
          <p className="mb-8 text-cream/70">
            Vous sentez l'appel de Dieu sur votre vie ? Contactez-nous pour en discuter.
          </p>
          <button onClick={() => onNavigate('contact')} className="btn-primary">Nous contacter</button>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}