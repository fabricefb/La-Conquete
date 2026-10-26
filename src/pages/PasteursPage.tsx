import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useReveal } from '../lib/hooks';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { supabase } from '../lib/supabase';
import { Facebook, MonitorPlay, Mail, ArrowRight } from '../lib/icons';
import { imageSrcSet } from '../lib/images';
import type { Page } from '../lib/navigation';
import type { Pastor } from '../types';

const FALLBACK: Pastor[] = [
  { id: 'fb-1', name: 'Josué Romain Kazadi', role: 'Pasteur Principal', bio: 'Homme de Dieu visionnaire et passionné, il conduit l\'église avec sagesse et détermination.', photo_url: '/pasteur-romain-kazadi.webp', thought: 'La Parole de Dieu est notre boussole.', sort_order: 0, is_main: true, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-2', name: 'Dr David Kateba', role: '1er Pasteur Assistant', bio: '', photo_url: '/pasteur-david-kateba.webp', thought: '', sort_order: 1, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
  { id: 'fb-3', name: 'Richard Mukendi', role: '2e Pasteur Assistant', bio: '', photo_url: '/pasteur-richard-mukendi.webp', thought: '', sort_order: 2, is_main: false, is_active: true, video_url: '', social_links: {}, extended_bio: '', media_urls: [], email: '', phone: '', created_at: '', updated_at: '' },
];

const CATEGORIES = [
  { key: 'principaux', label: 'Pasteurs principaux', filter: (p: Pastor) => p.is_main },
  { key: 'equipe', label: 'Équipe pastorale', filter: (p: Pastor) => !p.is_main },
] as const;

function SkeletonCard() {
  return <div className="animate-pulse aspect-[3/4] bg-bg-elevated" />;
}

function PastorCard({ pastor }: { pastor: Pastor }) {
  const socialLinks = pastor.social_links || {};
  const hasSocials = Object.values(socialLinks).some((v) => v && v.trim() !== '');

  return (
    <article className="flex h-full flex-col">
      <figure className="portrait-frame">
        {pastor.photo_url ? (
          <img
            src={pastor.photo_url}
            srcSet={imageSrcSet(pastor.photo_url || '')}
            sizes="(min-width: 1024px) 25vw, 50vw"
            alt={pastor.name}
            className="photo-claro photo-hover-clear aspect-[3/4] w-full object-cover object-top transition-[transform,filter] duration-700 hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-bg-elevated">
            <span className="font-hero text-5xl text-cream/40">
              {pastor.name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </figure>

      <div className="flex flex-1 flex-col border border-t-0 border-line bg-bg-card p-5">
        <h3 className="person-name">{pastor.name}</h3>
        {pastor.role && <p className="person-role mt-2">{pastor.role}</p>}

        {pastor.bio && (
          <p className="mt-4 text-sm leading-relaxed text-muted line-clamp-4">{pastor.bio}</p>
        )}

        {pastor.thought && (
          <p className="mt-4 border-l-2 border-evangile-600 pl-4 font-serif text-sm italic leading-relaxed text-cream/70">
            « {pastor.thought} »
          </p>
        )}

        {hasSocials && (
          <div className="mt-5 flex gap-px border-t border-line pt-4">
            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
                aria-label={`Facebook de ${pastor.name}`}
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
            )}
            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
                aria-label={`YouTube de ${pastor.name}`}
              >
                <MonitorPlay className="h-3.5 w-3.5" />
              </a>
            )}
            {socialLinks.email && (
              <a
                href={`mailto:${socialLinks.email}`}
                className="inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
                aria-label={`Email de ${pastor.name}`}
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function PasteursPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

  useReveal();

  useEffect(() => {
    let cancelled = false;
    async function fetchPastors() {
      try {
        const { data } = await supabase.from('pastors').select('*').eq('is_active', true).order('sort_order');
        if (!cancelled) setPastors((data && data.length > 0 ? data : FALLBACK) as Pastor[]);
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
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="pasteurs" onNavigate={onNavigate} />
      <MobileNav active="pasteurs" onNavigate={onNavigate} />

      <UniversalHero pageKey="pasteurs" defaultBadge="Serviteurs de Dieu" defaultTitle="Notre équipe pastorale" defaultSubtitle="Des hommes et des femmes appelés et équipés pour servir l'Église et la communauté." bgImage="/church-photo-3.webp" />

      {CATEGORIES.map((cat, ci) => {
        const members = pastors.filter(cat.filter);
        if (!loading && members.length === 0) return null;
        return (
          <section key={cat.key} className={`px-4 py-16 md:py-24 ${ci > 0 ? 'border-t border-line' : ''}`}>
            <div className="mx-auto max-w-7xl">
              <div className="reveal">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="section-label">{ci === 0 ? 'Direction' : 'Ensemble'}</p>
                    <h2 className="section-title mt-4">{cat.label}</h2>
                  </div>
                  <span className="stat-figure hidden text-[3rem] text-evangile-600/20 sm:block">
                    {String(members.length || 0).padStart(2, '0')}
                  </span>
                </div>
                <div className="rule-accent mt-6" />
              </div>

              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                  : members.map((p) => (
                      <div key={p.id} className="reveal">
                        <PastorCard pastor={p} />
                      </div>
                    ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="border-t border-line bg-bg-card px-4 py-16 md:py-24">
        <div className="reveal mx-auto flex max-w-4xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Rejoindre l'équipe</p>
            <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">Vous sentez un appel ?</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Contactez le bureau pastoral pour en parler et être accompagné dans votre discernement.
            </p>
          </div>
          <button onClick={() => onNavigate('contact')} className="btn-primary shrink-0">
            Nous contacter <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
