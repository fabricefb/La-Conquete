import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { supabase } from '../lib/supabase';
import { Facebook, MonitorPlay, Mail } from '../lib/icons';
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
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-white/5 rounded-none" />
    </div>
  );
}

// ─── Pastor Card (same style as EnhancedPastorGrid: hover bio, no border, PNG-ready) ──
function PastorCard({ pastor }: { pastor: Pastor }) {
  const hasSocials =
    pastor.social_links &&
    Object.values(pastor.social_links).some((v) => v && v.trim() !== '');

  return (
    <div className="group relative aspect-[3/4] overflow-hidden">
      {/* Photo — PNG-friendly (object-contain for transparent PNGs) */}
      {pastor.photo_url ? (
        <img
          src={pastor.photo_url}
          alt={pastor.name}
          className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(227,34,31,0.25) 0%, rgba(15,33,71,0.85) 100%)',
          }}
        >
          <span className="font-serif text-4xl font-bold tracking-wider text-cream/60">
            {pastor.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Name — always visible at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <h3 className="font-semibold text-lg leading-tight text-cream drop-shadow-lg">
          {pastor.name}
        </h3>
        {pastor.role && (
          <p className="mt-0.5 text-sm text-cream/80 drop-shadow-md">{pastor.role}</p>
        )}
      </div>

      {/* Bio overlay — appears ONLY on hover */}
      {pastor.bio && (
        <div
          className="absolute inset-0 z-20 flex items-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(to top, rgba(6,13,29,0.95) 0%, rgba(6,13,29,0.85) 40%, rgba(6,13,29,0.6) 70%, transparent 100%)',
          }}
        >
          <div className="w-full">
            <h3 className="font-semibold text-lg leading-tight text-cream">
              {pastor.name}
            </h3>
            {pastor.role && (
              <p className="mt-0.5 text-sm text-cream/80">{pastor.role}</p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-cream/90 line-clamp-5">
              {pastor.bio}
            </p>

            {/* Social links inside bio overlay */}
            {hasSocials && (
              <div className="mt-4 flex gap-2">
                {pastor.social_links?.facebook && (
                  <a
                    href={pastor.social_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/10 border border-white/20 text-cream"
                    aria-label={`Facebook de ${pastor.name}`}
                  >
                    <Facebook className="h-3.5 w-3.5" />
                  </a>
                )}
                {pastor.social_links?.youtube && (
                  <a
                    href={pastor.social_links.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/10 border border-white/20 text-cream"
                    aria-label={`YouTube de ${pastor.name}`}
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                  </a>
                )}
                {pastor.social_links?.email && (
                  <a
                    href={`mailto:${pastor.social_links.email}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/10 border border-white/20 text-cream"
                    aria-label={`Email de ${pastor.name}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────
export function PasteursPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

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
            <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
              <div className="animate-fade-up mb-14 text-center">
                <p className="section-label justify-center">{cat.label}</p>
              </div>
              {loading ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: members.length || 2 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="animate-fade-up grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {members.map((p) => (
                    <PastorCard key={p.id} pastor={p} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-4 bg-radial-primary">
        <div className="animate-fade-up mx-auto max-w-2xl text-center">
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