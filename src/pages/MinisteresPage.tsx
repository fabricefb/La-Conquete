import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { IconBox } from '../components/IconBox';
import {
  Music, BookOpen, Compass, HandHeart, Users, Star, Heart,
  Shield, Sparkles, Send, Video, Flame, Crown, type LucideIcon,
} from '../lib/icons';
import type { Page } from '../lib/navigation';

// ─── DB-backed ministry ─────────────────────────────────────────
interface MinistryDB {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  schedule: string;
  contact?: string;
  image_url?: string;
  accent_color?: string;
  is_active: boolean;
  sort_order: number;
}

// ─── Fallback (used when DB is empty or fails) ──────────────────
interface MinistryItem {
  Icon: LucideIcon;
  title: string;
  description: string;
  schedule: string;
  contact: string;
}

const MINISTRIES_FALLBACK: MinistryItem[] = [
  { Icon: Music, title: 'Louange & Adoration', description: 'Mener l\'assemblée dans la présence de Dieu par la louange et l\'adoration authentique.', schedule: 'Dimanche — Répétition le samedi 15h', contact: 'louange@laconquete.org' },
  { Icon: BookOpen, title: 'Enseignement', description: 'Approfondir la connaissance de la Parole de Dieu à travers des études structurées et accessibles.', schedule: 'Mercredi 18h00', contact: 'enseignement@laconquete.org' },
  { Icon: Compass, title: 'Évangélisation', description: 'Proclamer l\'Évangile dans les quartiers, les marchés et les lieux publics de Lubumbashi.', schedule: 'Samedi 08h00', contact: 'evangelisation@laconquete.org' },
  { Icon: HandHeart, title: 'Diaconie', description: 'Assister les membres en difficulté et organiser des actions sociales au service de la communauté.', schedule: 'Vendredi 16h00', contact: 'diaconie@laconquete.org' },
  { Icon: Users, title: 'Jeunesse', description: 'Accompagner les jeunes dans leur foi, leur identité et leur destinée à travers des activités dynamiques.', schedule: 'Jeudi 18h00', contact: 'jeunesse@laconquete.org' },
  { Icon: Star, title: 'Enfants', description: 'Enseigner la Parole de Dieu aux enfants de manière ludique et adaptée à leur âge.', schedule: 'Dimanche 09h00', contact: 'enfants@laconquete.org' },
  { Icon: Heart, title: 'Couples & Familles', description: 'Fortifier les mariages et les familles par des enseignements, des rencontres et un accompagnement personnalisé.', schedule: '1er samedi du mois 10h', contact: 'familles@laconquete.org' },
  { Icon: Shield, title: 'Hommes', description: 'Rassembler les hommes autour de la Parole pour développer leur leadership spirituel et familial.', schedule: '2e samedi du mois 08h', contact: 'hommes@laconquete.org' },
  { Icon: Sparkles, title: 'Femmes', description: 'Encourager les sœurs à vivre pleinement leur identité en Christ et à servir avec excellence.', schedule: '3e samedi du mois 10h', contact: 'femmes@laconquete.org' },
  { Icon: Send, title: 'Communication', description: 'Gérer la communication interne et externe de l\'église à travers les réseaux et les médias.', schedule: 'Réunion hebdomadaire', contact: 'communication@laconquete.org' },
  { Icon: Video, title: 'Multimédia', description: 'Assurer la production technique des cultes : son, vidéo, streaming et supports visuels.', schedule: 'Dimanche — Setup 07h30', contact: 'multimedia@laconquete.org' },
  { Icon: Flame, title: 'Intercession', description: 'Porter les charges de l\'église, de la nation et des nations dans la prière fervente.', schedule: 'Vendredi 19h00', contact: 'intercession@laconquete.org' },
];

const ICON_MAP: Record<string, LucideIcon> = {
  Music, BookOpen, Compass, HandHeart, Users, Star, Heart,
  Shield, Sparkles, Send, Video, Flame, Crown,
};

// ─── Component ─────────────────────────────────────────────────────
export function MinisteresPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [dbMinistries, setDbMinistries] = useState<MinistryDB[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('ministries')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setDbMinistries(data as MinistryDB[]);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loaded]);

  const useDB = dbMinistries.length > 0;

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="ministeres" onNavigate={onNavigate} />
      <MobileNav active="ministeres" onNavigate={onNavigate} />

      <UniversalHero pageKey="ministeres" defaultBadge="Servir ensemble" defaultTitle="Nos Ministères" defaultSubtitle="Chaque membre est un ministre. Découvrez les différents espaces de service où vous pouvez vous investir." />

      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="relative mb-16 text-center">
            <div className="absolute inset-0 -z-10 bg-radial-primary" style={{ minHeight: 200 }} />
            <p className="reveal section-label justify-center">Découvrir</p>
            <h2 className="reveal reveal-delay-1 mt-4 font-serif text-3xl font-semibold text-cream sm:text-4xl">
              Les ministères de l'église
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useDB
              ? dbMinistries.map((m, i) => {
                  const IconComponent = ICON_MAP[m.icon_name] || Star;
                  return (
                    <div
                      key={m.id}
                      className={`reveal ${i < 3 ? `reveal-delay-${i + 1}` : ''} glass-card card-parallax rounded-2xl p-6 flex flex-col transition-all duration-300`}
                    >
                      <IconBox pageKey="ministeres" elementId={`ministere-icon-${i}`} className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-400/5 text-accent-400">
                        <IconComponent className="h-6 w-6" />
                      </IconBox>
                      <h3 className="font-serif text-xl font-semibold text-cream">{m.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{m.description}</p>
                      <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                        <p className="flex items-center gap-2 text-xs text-muted">
                          <span className="font-semibold text-accent-400">Horaires :</span> {m.schedule}
                        </p>
                      </div>
                    </div>
                  );
                })
              : MINISTRIES_FALLBACK.map((m, i) => (
                  <div
                    key={m.title}
                    className={`reveal ${i < 3 ? `reveal-delay-${i + 1}` : ''} glass-card card-parallax rounded-2xl p-6 flex flex-col transition-all duration-300`}
                  >
                    <IconBox pageKey="ministeres" elementId={`ministere-icon-${i}`} className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-400/5 text-accent-400">
                      <m.Icon className="h-6 w-6" />
                    </IconBox>
                    <h3 className="font-serif text-xl font-semibold text-cream">{m.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{m.description}</p>
                    <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                      <p className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold text-accent-400">Horaires :</span> {m.schedule}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold text-accent-400">Contact :</span> {m.contact}
                      </p>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-radial-ember">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="section-label mb-4">Impliquez-vous</p>
          <p className="mb-8 text-cream/70">
            Vous désirez servir dans l'un de ces ministères ? Remplissez le formulaire de contact en précisant votre domaine d'intérêt.
          </p>
          <button onClick={() => onNavigate('contact')} className="btn-primary">Rejoindre un ministère</button>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}