import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { MonitorPlay, Navigation, Phone, ArrowRight, Globe } from '../lib/icons';
import { Car, Bus, Baby } from 'lucide-react';
import type { Page } from '../lib/navigation';
import { CHURCH } from '../lib/church';
import { SERVICE_TIMES } from '../lib/services';
import { db, buildContentMap, getContent, isSupabaseConfigured } from '../lib/supabase';

const PRACTICALS = [
  { Icon: Car, title: 'Stationnement', desc: "Stationnement aux abords de l'église, sur l'avenue N'Djamena." },
  { Icon: Bus, title: 'Transport en commun', desc: "Demandez le croisement Mama Yemo, sur l'avenue N'Djamena." },
  { Icon: Baby, title: 'Enfants', desc: 'Les enfants sont les bienvenus : un temps leur est réservé pendant le culte dominical.' },
  { Icon: Phone, title: 'Information', desc: `Appelez le ${CHURCH.phone.display} pour toute question pratique.` },
] as const;

export function CultePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [cm, setCm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured) {
      setLoading(false);
    } else {
      db.getPageContents('culte')
        .then((contents) => { if (!cancelled) setCm(buildContentMap(contents)); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => { cancelled = true; obs.disconnect(); };
  }, []);

  const liveUrl = getContent(cm, 'culte', 'live_url', '');
  const mapQuery = encodeURIComponent(CHURCH.address.full);

  if (loading) {
    return (
      <div className="bg-bg min-h-screen">
        <SiteHeader activePage="culte" onNavigate={onNavigate} />
        <div className="flex min-h-[60vh] items-center justify-center text-muted animate-pulse">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="culte" onNavigate={onNavigate} />

      <UniversalHero pageKey="culte" defaultBadge="Rassemblés pour Lui" defaultTitle="Nos cultes" defaultSubtitle="Rejoignez-nous pour des moments de louange, d'enseignement et de communion fraternelle." bgImage="/church-photo-1.webp" />

      {/* ═══ HORAIRES ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal">
            <p className="section-label">Programme hebdomadaire</p>
            <h2 className="section-title mt-4">Horaires des cultes</h2>
            <div className="rule-accent mt-6" />
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
              Quatre rendez-vous chaque semaine, au temple central de Lubumbashi. Entrée libre, sans inscription.
            </p>
          </div>

          <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_TIMES.map(({ day, service, time }, i) => (
              <div key={day} className={`reveal reveal-delay-${i + 1} bg-bg-card p-6`}>
                <span className="block h-1 w-10 bg-evangile-600" />
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-evangile-600">{day}</p>
                <h3 className="card-title mt-3">{service}</h3>
                <p className="mt-2 font-mono text-sm text-muted">{time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE ═══ */}
      <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="reveal">
            <p className="section-label">En direct</p>
            <h2 className="section-title mt-4">Culte en ligne</h2>
            <div className="rule-accent mt-6" />
          </div>

          <div className="reveal reveal-delay-1 mt-8 overflow-hidden border border-line">
            {liveUrl ? (
              <div className="relative aspect-video">
                <iframe
                  src={liveUrl}
                  className="h-full w-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title="Culte en direct"
                />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center bg-bg px-6 text-center">
                <MonitorPlay className="h-10 w-10 text-evangile-600/60" />
                <p className="mt-4 text-sm text-muted">Le direct est diffusé pendant le culte principal du dimanche.</p>
                <p className="mt-1 text-xs text-muted/70">
                  Le lien est publié sur la page Facebook officielle avant chaque diffusion.
                </p>
              </div>
            )}
          </div>

          <p className="reveal mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Globe className="h-4 w-4 text-evangile-600" />
            Suivez la diffusion sur
            <a href={CHURCH.social.facebook} target="_blank" rel="noopener noreferrer" className="font-semibold text-cream underline decoration-evangile-600 decoration-2 underline-offset-4">
              notre page Facebook
            </a>.
          </p>
        </div>
      </section>

      {/* ═══ LOCALISATION ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal">
            <p className="section-label">Nous trouver</p>
            <h2 className="section-title mt-4">Localisation</h2>
            <div className="rule-accent mt-6" />
          </div>

          <div className="reveal reveal-delay-1 mt-8 grid gap-px bg-line lg:grid-cols-[1fr_320px]">
            <div className="overflow-hidden border border-line bg-bg-card">
              <iframe
                title="Localisation de l'église"
                src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                className="h-80 w-full border-0 sm:h-[420px]"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex flex-col justify-between bg-bg-card p-6">
              <div>
                <p className="person-role">Adresse</p>
                <p className="mt-2 text-sm leading-relaxed text-cream">{CHURCH.address.full}</p>
                <p className="mt-3 text-xs leading-relaxed text-muted">Repère : {CHURCH.address.landmark}.</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-6"
              >
                <Navigation className="h-4 w-4" /> Itinéraire
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INFOS PRATIQUES ═══ */}
      <section className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal">
            <p className="section-label">Bon à savoir</p>
            <h2 className="section-title mt-4">Infos pratiques</h2>
            <div className="rule-accent mt-6" />
          </div>
          <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PRACTICALS.map(({ Icon, title, desc }, i) => (
              <div key={title} className={`reveal reveal-delay-${i + 1} bg-bg-card p-6`}>
                <Icon className="h-5 w-5 text-evangile-600" />
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.08em] text-cream">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="px-4 py-16 md:py-24">
        <div className="reveal mx-auto flex max-w-4xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Planifiez votre visite</p>
            <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">Première visite ?</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Nous serions ravis de vous accueillir et de répondre à vos questions avant votre venue.
            </p>
          </div>
          <button onClick={() => onNavigate('contact')} className="btn-primary">
            Nous contacter <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      <MobileNav active="culte" onNavigate={onNavigate} />
    </div>
  );
}
