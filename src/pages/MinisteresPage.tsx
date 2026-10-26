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
  Shield, Sparkles, Send, Video, Flame, Crown, ArrowRight, type LucideIcon,
} from '../lib/icons';
import type { Page } from '../lib/navigation';

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

interface MinistryItem {
  Icon: LucideIcon;
  title: string;
  description: string;
  groups?: string[];
}

const MINISTRIES_FALLBACK: MinistryItem[] = [
  { Icon: Music, title: 'Louange', description: 'Ministère de la musique et de la louange pour glorifier Dieu.', groups: ['Groupe ARCO', 'Chorale des Mamans (Miriame)', 'Cano Vocal'] },
  { Icon: BookOpen, title: 'Ecodime', description: 'École Dominicale — formation biblique pour tous les âges.', groups: ['Enfants', 'Adolescents', 'Jeunes', 'Adultes'] },
  { Icon: Heart, title: 'Département des Sœurs', description: "Ministère dédié aux femmes de l'église : prière, conférences, œuvres sociales et mentorat spirituel.", groups: ['Femmes mariées', 'Jeunes femmes', 'Mamans'] },
  { Icon: Users, title: 'Département des Papas', description: "Ministère dédié aux hommes de l'église : retraites spirituelles, mentorat et projets communautaires.", groups: ['Hommes mariés', 'Jeunes hommes', 'Pères'] },
  { Icon: Shield, title: 'Protocole', description: "Organisation et coordination des événements, accueil des visiteurs et logistique des services.", groups: ["Équipe d'accueil", 'Coordination', 'Logistique'] },
  { Icon: Video, title: 'Média et Communication', description: 'Diffusion des cultes, gestion des réseaux sociaux, communication interne et production multimédia.', groups: ['Équipe technique', 'Réseaux sociaux', 'Communication'] },
  { Icon: Crown, title: 'Les Anciens', description: 'Conseil des anciens : gouvernance, conseil pastoral, mentorat et résolution de conflits.', groups: ['Conseil pastoral', 'Anciens', 'Conseillers'] },
  { Icon: HandHeart, title: 'Les Diacres', description: "Service diaconal : assistance pastorale, visites aux malades et soutien aux nécessiteux.", groups: ['Diacres', 'Assistants', 'Serviteurs'] },
  { Icon: Star, title: 'Social', description: "Œuvres sociales et soutien communautaire : aide aux nécessiteux, projets et assistance sociale.", groups: ['Aide humanitaire', 'Soutien social', 'Bénévoles'] },
  { Icon: Sparkles, title: 'Propreté', description: "Entretien et maintenance des locaux, aménagement, hygiène et salubrité.", groups: ["Équipe d'entretien", 'Maintenance', 'Propreté'] },
  { Icon: Flame, title: 'Intercession', description: "Ministère de la prière et de l'intercession : veillées, jeûne et prière pour les malades.", groups: ['Intercesseurs', 'Prière', 'Jeûne'] },
];

const ICON_MAP: Record<string, LucideIcon> = {
  Music, BookOpen, Compass, HandHeart, Users, Star, Heart,
  Shield, Sparkles, Send, Video, Flame, Crown,
};

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
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loaded]);

  const useDB = dbMinistries.length > 0;

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="ministeres" onNavigate={onNavigate} />
      <MobileNav active="ministeres" onNavigate={onNavigate} />

      <UniversalHero pageKey="ministeres" defaultBadge="Servir ensemble" defaultTitle="Nos ministères" defaultSubtitle="Chaque membre est un ministre. Découvrez les espaces de service où vous pouvez vous investir." bgImage="/church-photo-2.webp" />

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="reveal">
            <p className="section-label">Découvrir</p>
            <h2 className="section-title mt-4">Les ministères de l'église</h2>
            <div className="rule-accent mt-6" />
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
              Onze départements portent la vie de l'église, du dimanche matin aux visites de quartier.
              Les responsables de chaque ministère accueillent les nouveaux serviteurs.
            </p>
          </div>

          <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {useDB
              ? dbMinistries.map((m, i) => {
                  const IconComponent = ICON_MAP[m.icon_name] || Star;
                  return (
                    <article key={m.id} className={`reveal reveal-delay-${(i % 3) + 1} flex h-full flex-col bg-bg-card p-6`}>
                      <div className="flex items-start justify-between">
                        <IconBox pageKey="ministeres" elementId={`ministere-icon-${i}`} className="inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                          <IconComponent className="h-5 w-5" />
                        </IconBox>
                        <span className="stat-figure text-[2rem] text-evangile-600/20">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="card-title mt-5">{m.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{m.description}</p>
                      {m.schedule && (
                        <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
                          <span className="font-semibold uppercase tracking-[0.12em] text-evangile-600">Horaires</span>
                          <span className="mt-1 block">{m.schedule}</span>
                        </p>
                      )}
                    </article>
                  );
                })
              : MINISTRIES_FALLBACK.map((m, i) => (
                  <article key={m.title} className={`reveal reveal-delay-${(i % 3) + 1} flex h-full flex-col bg-bg-card p-6`}>
                    <div className="flex items-start justify-between">
                      <IconBox pageKey="ministeres" elementId={`ministere-icon-${i}`} className="inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                        <m.Icon className="h-5 w-5" />
                      </IconBox>
                      <span className="stat-figure text-[2rem] text-evangile-600/20">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="card-title mt-5">{m.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{m.description}</p>
                    {m.groups && (
                      <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                        <span className="font-semibold uppercase tracking-[0.12em] text-evangile-600">Groupes</span>
                        <span className="mt-1 block">{m.groups.join(' · ')}</span>
                      </p>
                    )}
                  </article>
                ))
            }
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
        <div className="reveal mx-auto flex max-w-4xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Impliquez-vous</p>
            <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">Servir dans un ministère</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Dites-nous le domaine qui vous attire : un responsable vous contactera pour un entretien et une
              intégration dans l'équipe.
            </p>
          </div>
          <button onClick={() => onNavigate('contact')} className="btn-primary shrink-0">
            Rejoindre un ministère <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
