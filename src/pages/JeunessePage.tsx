import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { UniversalHero } from '../components/UniversalHero';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { IconBox } from '../components/IconBox';
import { Music, BookOpen, Heart, Users } from '../lib/icons';
import { PartyPopper, Dumbbell, Gamepad2 } from 'lucide-react';
import type { Page } from '../lib/navigation';
import { db, buildContentMap, getContent } from '../lib/supabase';

// ─── Fallback Data ──────────────────────────────────────────────
const FALLBACK_ACTIVITIES = [
  { Icon: Music, title: 'Louange Jeunesse', desc: 'Un moment de louange dynamique et authentique chaque jeudi.' },
  { Icon: BookOpen, title: 'Étude biblique', desc: 'Enseignement de la Parole adapté aux réalités des jeunes.' },
  { Icon: PartyPopper, title: 'Événements spéciaux', desc: 'Concerts, conférences, sorties et journées thématiques.' },
  { Icon: Dumbbell, title: 'Sport & Bien-être', desc: "Tournois sportifs et activités pour le corps et l'esprit." },
  { Icon: Gamepad2, title: ' Loisirs & Communauté', desc: 'Moments de détente et de lien fraternel entre jeunes.' },
  { Icon: Heart, title: 'Impact social', desc: 'Actions caritatives et visites dans la communauté.' },
] as const;

const FALLBACK_PROGRAM = [
  { date: 'Jeudi 18h00', title: 'Réunion hebdomadaire', desc: 'Louange, enseignement et partage en petits groupes.' },
  { date: 'Samedi 14h00', title: 'Formation leadership', desc: 'Module de formation pour les jeunes leaders de demain.' },
  { date: '1er Dimanche', title: 'Culte jeunesse', desc: 'Culte dédié avec une prédication adaptée aux jeunes.' },
  { date: 'Chaque trimestre', title: 'Conférence spéciale', desc: 'Invitation de speakers et temps fort de communion.' },
] as const;

const GALLERY = [
  '/church-photo-1.jpg', '/church-photo-2.jpg', '/church-photo-3.jpg',
  '/predication-1.jpg', '/priere.jpg', '/bible.jpg',
] as const;

const FALLBACK_TESTIMONIALS = [
  { name: 'Grace M.', text: 'Le ministère de la jeunesse m\'a permis de trouver ma place dans l\'église et de grandir dans ma foi.' },
  { name: 'Joël K.', text: 'Grâce aux formations, j\'ai découvert mon appel et je sers maintenant avec assurance.' },
] as const;

// ─── Component ─────────────────────────────────────────────────────
export function JeunessePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [cm, setCm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getPageContents('jeunesse')
      .then(contents => setCm(buildContentMap(contents)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="bg-bg min-h-screen flex items-center justify-center">
        <div className="text-muted animate-pulse text-lg">Chargement…</div>
      </div>
    );
  }

  const activities = FALLBACK_ACTIVITIES.map((a, i) => ({
    ...a,
    title: getContent(cm, 'activities', `title_${i + 1}`, a.title),
    desc: getContent(cm, 'activities', `desc_${i + 1}`, a.desc),
  }));

  const program = FALLBACK_PROGRAM.map((p, i) => ({
    ...p,
    title: getContent(cm, 'program', `title_${i + 1}`, p.title),
    desc: getContent(cm, 'program', `desc_${i + 1}`, p.desc),
  }));

  const testimonials = FALLBACK_TESTIMONIALS.map((t, i) => ({
    ...t,
    name: getContent(cm, 'testimonials', `name_${i + 1}`, t.name),
    text: getContent(cm, 'testimonials', `text_${i + 1}`, t.text),
  }));

  const introText = getContent(cm, 'intro', 'text', "Le ministère de la jeunesse rassemble les 15-35 ans de notre église autour de la Parole, de la louange et du service. Nous croyons que les jeunes ne sont pas seulement l'avenir de l'Église — ils en sont le <span className=\"text-accent-400 font-semibold\">présent</span>.");

  return (
    <div className="bg-bg min-h-screen mobile-bottom-pad">
      <SiteHeader activePage="jeunesse" onNavigate={onNavigate} />
      <MobileNav active="jeunesse" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <UniversalHero pageKey="jeunesse" defaultBadge="Génération Conquête" defaultTitle="Ministère de la Jeunesse" defaultSubtitle="Une génération enflammée pour Dieu, équipée pour transformer sa communauté et son époque." />

      {/* ═══ QUI SOMMES-NOUS ═══ */}
      <section className="py-12 md:py-20 lg:py-28 px-4 bg-radial-primary">
        <div className="mx-auto max-w-4xl text-center">
          <p className="reveal section-label justify-center">À propos</p>
          <h2 className="reveal reveal-delay-1 mt-4 font-serif text-3xl font-semibold text-cream sm:text-4xl">Qui sommes-nous ?</h2>
          <p className="reveal reveal-delay-2 mt-6 text-base leading-relaxed text-muted sm:text-lg" dangerouslySetInnerHTML={{ __html: introText }} />
        </div>
      </section>

      {/* ═══ ACTIVITÉS ═══ */}
      <section className="py-12 md:py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Ce que nous faisons</p>
          <h2 className="reveal reveal-delay-1 mb-12 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Nos Activités</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((a, i) => (
              <div key={a.title} className={`reveal reveal-delay-${(i % 4) + 1} glass-card card-parallax rounded-2xl p-6 transition-all duration-300`}>
                <IconBox pageKey="jeunesse" elementId={`activity-icon-${i}`} className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-400/10 text-accent-400">
                  <a.Icon className="h-6 w-6" />
                </IconBox>
                <h3 className="font-serif text-xl font-semibold text-cream">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROGRAMME MENSUEL ═══ */}
      <section className="py-12 md:py-20 lg:py-28 px-4 bg-radial-ember">
        <div className="mx-auto max-w-3xl">
          <p className="reveal section-label mb-3 text-center">Calendrier</p>
          <h2 className="reveal reveal-delay-1 mb-10 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Programme</h2>
          <div className="space-y-4">
            {program.map((p, i) => (
              <div key={p.title} className={`reveal reveal-delay-${(i % 4) + 1} glass-card rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 hover:scale-[1.01]`}>
                <div className="flex-shrink-0 rounded-xl bg-accent-400/10 px-3 py-1.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent-400">{p.date}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-cream">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GALERIE ═══ */}
      <section className="py-12 md:py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">En images</p>
          <h2 className="reveal reveal-delay-1 mb-10 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Galerie Photos</h2>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {GALLERY.map((src, i) => (
              <div key={src} className={`reveal reveal-delay-${(i % 4) + 1} overflow-hidden rounded-2xl`}>
                <img src={src} alt={`Jeunesse ${i + 1}`} className="h-40 sm:h-52 w-full object-cover transition-transform duration-500 hover:scale-110" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TÉMOIGNAGES ═══ */}
      <section className="py-12 md:py-20 lg:py-28 px-4 bg-radial-primary">
        <div className="mx-auto max-w-4xl">
          <p className="reveal section-label mb-3 text-center">Ils témoignent</p>
          <h2 className="reveal reveal-delay-1 mb-10 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Témoignages</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <div key={t.name} className={`reveal reveal-delay-${i + 1} glass-card rounded-2xl p-6`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-400/10 text-accent-400 font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <p className="font-semibold text-cream">{t.name}</p>
                </div>
                <p className="text-sm leading-relaxed text-muted italic">« {t.text} »</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-12 md:py-20 px-4">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="section-label mb-4">Rejoins-nous</p>
          <p className="mb-8 text-cream/70">
            Tu as entre 15 et 35 ans ? Tu cherches une communauté où grandir et servir ? Viens nous rencontrer !
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Users className="h-5 w-5 text-accent-400" />
            <button onClick={() => onNavigate('contact')} className="btn-primary">Rejoindre la jeunesse</button>
          </div>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}