import { useEffect, useState } from 'react';
import { getContent, supabase } from '../lib/supabase';
import { usePageContents } from '../lib/hooks/usePageContents';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { IconBox } from '../components/IconBox';
import { ArrowRight, Compass, Flame, MapPin, Phone, Send, Users } from '../lib/icons';
import { CHURCH } from '../lib/church';
import { KAKANA, type ExtensionCard } from '../lib/extensions';
import type { Page } from '../lib/navigation';

interface MissionsPageProps {
  onNavigate: (page: Page) => void;
}

const PILLARS = [
  {
    Icon: Compass,
    title: 'Des âmes',
    text: "Chaque extension naît d'un quartier ou d'un village où des familles vivent, travaillent et doivent entendre l'Évangile dans leur propre quotidien.",
  },
  {
    Icon: Users,
    title: 'Des pasteurs',
    text: "Chaque implantation est portée par un pasteur et une équipe locale, en lien avec le bureau pastoral de Lubumbashi.",
  },
  {
    Icon: Flame,
    title: 'Des terres',
    text: "La conquête des terres habitables et cultivables se traduit par des lieux de culte, des formations et un accompagnement durable des communautés.",
  },
] as const;

function isKakana(extension: ExtensionCard): boolean {
  return extension.name.toLowerCase().includes('kakana');
}

function mergeWithKakana(rows: ExtensionCard[]): ExtensionCard[] {
  const active = rows.filter((row) => row.is_active && !row.is_main);
  if (active.length === 0) return [KAKANA];

  return active.map((row) => {
    if (!isKakana(row)) return row;
    return {
      ...row,
      image_url: row.image_url || KAKANA.image_url,
      description: row.description || KAKANA.description,
    };
  });
}

function itineraryUrl(extension: ExtensionCard): string | null {
  const hasGps = extension.latitude != null && extension.longitude != null;
  const destination = hasGps
    ? `${extension.latitude},${extension.longitude}`
    : [extension.address, extension.city, extension.country].filter(Boolean).join(', ');

  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function MissionsPage({ onNavigate }: MissionsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const cm = usePageContents('missions');
  const [extensions, setExtensions] = useState<ExtensionCard[]>([KAKANA]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (!cancelled && data && data.length > 0) {
          setExtensions(mergeWithKakana(data as ExtensionCard[]));
        }
      } catch {
        /* Kakana reste affichée si la base est indisponible */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  const featured = extensions.find(isKakana) ?? extensions[0];
  const others = extensions.filter((extension) => extension.id !== featured?.id);
  const pastors = extensions.filter((extension) => extension.pastor_name);

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="missions" onNavigate={onNavigate} />
      <MobileNav active="missions" onNavigate={onNavigate} />

      <UniversalHero
        pageKey="missions"
        defaultBadge="Église missionnaire"
        defaultTitle="Missions & extensions"
        defaultSubtitle="La conquête des âmes et des terres se vit aussi hors des murs du temple, dans les villages et les quartiers où l'église s'implante."
        bgImage="/church-photo-2.webp"
      />

      {/* ═══ VISION MISSIONNAIRE ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="reveal lg:col-span-7">
              <p className="section-label">{getContent(cm, 'vision', 'label', 'Pourquoi des extensions')}</p>
              <h2 className="section-title mt-4">{getContent(cm, 'vision', 'title', 'Une église qui envoie')}</h2>
              <div className="rule-accent mt-6" />
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-cream/80 sm:text-base">
                {getContent(
                  cm,
                  'vision',
                  'text',
                  "La Conquête n'est pas seulement une communauté rassemblée à Lubumbashi. Elle est une église missionnaire : elle forme, envoie et accompagne des équipes pour que l'Évangile soit annoncé là où les gens vivent.",
                )}
              </p>
            </div>
            <div className="reveal reveal-delay-1 lg:col-span-5">
              <blockquote className="panel p-6 md:p-8">
                <p className="verse-quote text-[clamp(1.25rem,2.4vw,1.7rem)] leading-snug">
                  « {CHURCH.vision} »
                </p>
                <cite className="mt-5 block text-[11px] font-semibold uppercase not-italic tracking-[0.24em] text-evangile-600">
                  {CHURCH.visionReference}
                </cite>
              </blockquote>
            </div>
          </div>

          <div className="mt-12 grid gap-px bg-line sm:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <div key={pillar.title} className={`reveal reveal-delay-${i + 1} bg-bg-card p-6 md:p-8`}>
                <IconBox pageKey="missions" elementId={`mission-pillar-${i}`} className="inline-flex h-11 w-11 items-center justify-center border border-line text-evangile-600">
                  <pillar.Icon className="h-5 w-5" />
                </IconBox>
                <h3 className="card-title mt-5">
                  {getContent(cm, 'pillars', `pillar_${i + 1}_title`, pillar.title)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {getContent(cm, 'pillars', `pillar_${i + 1}_text`, pillar.text)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ IMPLANTATION À LA UNE ═══ */}
      {featured && (
        <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="reveal">
              <p className="section-label">{getContent(cm, 'implantations', 'label', 'Nos implantations')}</p>
              <h2 className="section-title mt-4">
                {getContent(cm, 'implantations', 'title', "Une présence qui s'étend")}
              </h2>
              <div className="rule-accent mt-6" />
            </div>

            <article className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
              <div className="reveal lg:col-span-5">
                {featured.image_url ? (
                  <figure className="aspect-[4/3] overflow-hidden border border-line bg-bg">
                    <img
                      src={featured.image_url}
                      alt={`Extension ${featured.name}`}
                      width={640}
                      height={480}
                      loading="lazy"
                      decoding="async"
                      className="photo-claro h-full w-full object-cover"
                    />
                  </figure>
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center border border-line bg-bg">
                    <MapPin className="h-10 w-10 text-evangile-600/50" />
                  </div>
                )}
              </div>

              <div className="reveal reveal-delay-1 lg:col-span-7">
                <div className="flex h-full flex-col justify-between border border-line bg-bg p-6 md:p-8">
                  <div>
                    <p className="person-role">Extension · En construction</p>
                    <h3 className="mt-3 font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-tight text-cream">
                      {featured.name}
                    </h3>
                    <p className="mt-4 flex items-start gap-2 text-sm text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-evangile-600" />
                      <span>
                        {[featured.address, featured.city, featured.country].filter(Boolean).join(', ')}
                      </span>
                    </p>

                    {featured.description && (
                      <p className="mt-5 text-sm leading-relaxed text-cream/80">{featured.description}</p>
                    )}

                    <dl className="mt-6 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
                      <div className="bg-bg p-4">
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Première pierre</dt>
                        <dd className="mt-1 text-sm font-semibold text-cream">20 juillet 2025</dd>
                      </div>
                      <div className="bg-bg p-4">
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Distance</dt>
                        <dd className="mt-1 text-sm font-semibold text-cream">≈ 50 km de Lubumbashi</dd>
                      </div>
                      <div className="bg-bg p-4">
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Statut</dt>
                        <dd className="mt-1 text-sm font-semibold text-cream">Chantier en cours</dd>
                      </div>
                    </dl>

                    {featured.pastor_name && (
                      <div className="mt-6 border-l-2 border-evangile-600 pl-4">
                        <p className="person-role">Pasteur d'extension</p>
                        <p className="mt-1 text-sm font-semibold text-cream">{featured.pastor_name}</p>
                      </div>
                    )}

                    {featured.service_times && (
                      <p className="mt-5 text-sm text-muted">
                        <span className="font-semibold text-cream">Horaires :</span> {featured.service_times}
                      </p>
                    )}

                    {featured.phone && (
                      <a href={`tel:${featured.phone.replace(/\s+/g, '')}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-evangile-600 hover:underline">
                        <Phone className="h-4 w-4" /> {featured.phone}
                      </a>
                    )}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
                    <button onClick={() => onNavigate('dons')} className="btn-primary">
                      Soutenir cette extension <ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={() => onNavigate('contact')} className="btn-ghost">
                      Demander l'itinéraire
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {/* ═══ AUTRES EXTENSIONS ═══ */}
      {others.length > 0 && (
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="reveal">
              <p className="section-label">{getContent(cm, 'network', 'label', 'Le réseau')}</p>
              <h2 className="section-title mt-4">
                {getContent(cm, 'network', 'title', 'Les autres implantations')}
              </h2>
              <div className="rule-accent mt-6" />
            </div>

            <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
              {others.map((extension, i) => {
                const mapUrl = itineraryUrl(extension);
                return (
                  <article key={extension.id} className={`reveal reveal-delay-${(i % 3) + 1} flex h-full flex-col bg-bg-card p-6`}>
                    <span className="stat-figure text-[2rem] text-evangile-600/20">
                      {String(i + 2).padStart(2, '0')}
                    </span>
                    <h3 className="card-title mt-4">{extension.name}</h3>
                    <p className="mt-3 flex items-start gap-2 text-sm text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-evangile-600" />
                      <span>{[extension.address, extension.city, extension.country].filter(Boolean).join(', ')}</span>
                    </p>

                    {extension.pastor_name && (
                      <p className="mt-4 text-sm text-muted">
                        <span className="font-semibold text-cream">Pasteur :</span> {extension.pastor_name}
                      </p>
                    )}
                    {extension.service_times && (
                      <p className="mt-2 text-sm text-muted">
                        <span className="font-semibold text-cream">Horaires :</span> {extension.service_times}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap gap-4 border-t border-line pt-5">
                      {extension.phone && (
                        <a href={`tel:${extension.phone.replace(/\s+/g, '')}`} className="btn-link">
                          <Phone className="h-4 w-4" /> Appeler
                        </a>
                      )}
                      {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-link">
                          <Compass className="h-4 w-4" /> Itinéraire
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PASTEURS D'EXTENSION ═══ */}
      {pastors.length > 0 && (
        <section className="border-y border-line bg-bg-card px-4 py-16 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="reveal">
              <p className="section-label">{getContent(cm, 'pastors', 'label', 'Responsables')}</p>
              <h2 className="section-title mt-4">
                {getContent(cm, 'pastors', 'title', "Les pasteurs d'extension")}
              </h2>
              <div className="rule-accent mt-6" />
            </div>
            <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
              {pastors.map((extension) => (
                <div key={extension.id} className="bg-bg p-6">
                  <p className="person-role">Pasteur d'extension</p>
                  <p className="mt-2 text-lg font-semibold text-cream">{extension.pastor_name}</p>
                  <p className="mt-1 text-sm text-muted">{extension.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {[extension.city, extension.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CTA ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="reveal mx-auto flex max-w-4xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">{getContent(cm, 'cta', 'eyebrow', 'Faire grandir le réseau')}</p>
            <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">
              {getContent(cm, 'cta', 'title', 'Soutenir une implantation')}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              {getContent(
                cm,
                'cta',
                'text',
                'Vos dons et votre prière accompagnent les pasteurs, les équipes et les chantiers des extensions.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('dons')} className="btn-primary">
              Faire un don <Send className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-ghost">Parler au bureau pastoral</button>
          </div>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
