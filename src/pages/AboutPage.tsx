import { useState, useEffect } from 'react';
import { db, buildContentMap, getContent } from '../lib/supabase';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { IconBox } from '../components/IconBox';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { MapPin, Phone, Mail, Heart, HandHeart, BookOpen } from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Pastor } from '../types';

interface PageProps { onNavigate: (page: Page) => void; }

/* ── Hardcoded fallback pastors (used only if DB is empty) ── */
const FALLBACK_PASTORS: Pastor[] = [
  { id: 'fb-1', name: 'Pst Josué Romain KAZADI', role: 'Pasteur Principal — Fondateur', bio: 'Homme de Dieu visionnaire et passionné, le Pasteur Josué Romain KAZADI est le fondateur de l\'Église Évangélique La Conquête. Sous sa direction, l\'église poursuit sa mission de gagner des âmes, d\'équiper les croyants et de transformer les communautés à Lubumbashi et au-delà.', photo_url: '/pasteur-kazadi.jpg', thought: 'La Parole de Dieu est notre boussole. Elle guide nos pas, éclaire notre chemin et nous donne la force de conquérir chaque jour.', sort_order: 0, is_main: true, is_active: true, video_url: '', social_links: {} as any, extended_bio: '', media_urls: [], email: '' as any, phone: '' as any, created_at: '', updated_at: '' },
  { id: 'fb-2', name: 'Theresse KATEBA', role: "Épouse du Pasteur — Co-fondatrice", bio: '', photo_url: '/theresse-kateba.jpg', thought: '', sort_order: 1, is_main: false, is_active: true, video_url: '', social_links: {} as any, extended_bio: '', media_urls: [], email: '' as any, phone: '' as any, created_at: '', updated_at: '' },
  { id: 'fb-3', name: 'Maurisse ESOSA', role: 'Pasteur Associé', bio: '', photo_url: '/maurisse-esosa.jpg', thought: '', sort_order: 2, is_main: false, is_active: true, video_url: '', social_links: {} as any, extended_bio: '', media_urls: [], email: '' as any, phone: '' as any, created_at: '', updated_at: '' },
];

/* ── Predications ── */
const PREDICATIONS = [
  { title: 'La Conquête des Âmes', img: '/predication-1.jpg' },
  { title: 'La Puissance de la Prière', img: '/priere.jpg' },
  { title: 'La Parole qui Transforme', img: '/bible.jpg' },
];

/* ── Values ── */
interface ValueItem { icon: string; title: string; description: string; }

const FALLBACK_VALUES: ValueItem[] = [
  { icon: '❤️', title: 'Foi', description: 'Nous croyons en la puissance transformative de la foi en Jésus-Christ. Elle est le fondement de tout ce que nous faisons et la source de notre espérance.' },
  { icon: '✝️', title: 'Amour', description: "L'amour de Dieu nous motive à aimer notre prochain authentiquement. Nous cultivons une communauté où chacun est accueilli et valorisé." },
  { icon: '⭐', title: 'Excellence', description: 'Nous nous efforçons de servir Dieu avec excellence dans chaque domaine, offrant le meilleur de nous-mêmes pour honorer Celui qui nous a tout donné.' },
  { icon: '🤲', title: 'Service', description: "Suivre l'exemple du Christ, c'est servir les autres. Chaque membre est encouragé à découvrir ses dons et à les mettre au service de la communauté." },
];

/* ── Giving info ── */
const GIVING = [
  { label: 'M-Pesa', value: '+243 831 685 713' },
  { label: 'Orange Money', value: '+243 892 170 701' },
  { label: 'EQUITY BCDC (USD)', value: '16610-00997-08928' },
  { label: 'EQUITY BCDC (FC)', value: '16620-00997-10572' },
];

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>{children}</div>;
}

export function AboutPage({ onNavigate }: PageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);

  useReveal();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [contents, pastorsData] = await Promise.all([
          db.getPageContents('about'),
          db.getActivePastors().catch(() => []),
        ]);
        if (!cancelled) {
          setContentMap(buildContentMap(contents));
          setPastors(pastorsData.length > 0 ? pastorsData : FALLBACK_PASTORS);
          setLoading(false);
        }
      } catch { if (!cancelled) setLoading(false); }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const heroBadge = getContent(contentMap, 'hero', 'badge', 'À propos de nous');
  const heroTitle = getContent(contentMap, 'hero', 'title', 'Qui sommes-nous');
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', '');

  const visionText = getContent(contentMap, 'vision', 'text', 'La Conquête des âmes, La Conquête des terres habitables et cultivables.');
  const missionText = getContent(contentMap, 'mission', 'text', 'Nous œuvrons au moyen de la Parole de Dieu, à gagner les âmes pour Jésus. Nous les équipons, les instruisons et les envoyons comme agents de transformation dans les nations. Nous motivons et équipons également nos membres pour la conquête des terres.');

  const valuesTitle = getContent(contentMap, 'values', 'title', 'Nos Valeurs');
  const valuesSubtitle = getContent(contentMap, 'values', 'subtitle', 'Les piliers qui guident notre vie communautaire et notre engagement au service de Dieu.');

  const values: ValueItem[] = (() => {
    const dv: ValueItem[] = [];
    let idx = 1;
    while (true) {
      const t = getContent(contentMap, `value_${idx}`, 'title', '');
      if (!t) break;
      dv.push({ icon: getContent(contentMap, `value_${idx}`, 'icon', FALLBACK_VALUES[(idx - 1) % FALLBACK_VALUES.length].icon), title: t, description: getContent(contentMap, `value_${idx}`, 'desc', FALLBACK_VALUES[(idx - 1) % FALLBACK_VALUES.length].description) });
      idx++;
    }
    return dv.length > 0 ? dv : FALLBACK_VALUES;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans">
        <SiteHeader activePage="about" onNavigate={onNavigate} />
        <MobileNav active="about" onNavigate={onNavigate} />
        <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-primary">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <div className="mb-4 h-6 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="mb-4 h-10 w-72 animate-pulse rounded-xl bg-white/10 mx-auto" />
          </div>
        </section>
        <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="about" onNavigate={onNavigate} />
      <MobileNav active="about" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-primary">
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <span className="reveal mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            {heroBadge}
          </span>
          <h1 className="reveal reveal-delay-1 font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:text-6xl">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="reveal reveal-delay-2 mt-6 text-lg leading-relaxed text-muted sm:text-xl">{heroSubtitle}</p>
          )}
        </div>
      </section>

      {/* ═══ VISION & MISSION ═══ */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Vision */}
            <RevealSection>
              <div className="glass rounded-3xl p-8 bg-radial-primary">
                <div className="mb-4 flex items-center gap-3">
                  <IconBox pageKey="about" elementId="vision-bookopen-icon" className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400">
                    <BookOpen className="h-5 w-5" />
                  </IconBox>
                  <h2 className="section-label mb-0">Notre Vision</h2>
                </div>
                <p className="mt-4 text-base leading-relaxed text-cream/90 sm:text-lg">
                  {visionText}
                </p>
              </div>
            </RevealSection>
            {/* Mission */}
            <RevealSection className="reveal-delay-1">
              <div className="glass rounded-3xl p-8">
                <div className="mb-4 flex items-center gap-3">
                  <IconBox pageKey="about" elementId="mission-heart-icon" className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400">
                    <Heart className="h-5 w-5" />
                  </IconBox>
                  <h2 className="section-label mb-0">Notre Mission</h2>
                </div>
                <p className="mt-4 text-base leading-relaxed text-cream/90 sm:text-lg">
                  {missionText}
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══ PASTOR PRINCIPAL ═══ */}
      {pastors.find(p => p.is_main) && (() => {
        const main = pastors.find(p => p.is_main)!;
        return (
      <section className="py-20 px-4 bg-radial-ember">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">Direction spirituelle</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">Notre Pasteur</h2>
          </RevealSection>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <RevealSection>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-accent-600/30 to-ember-500/20 blur-xl" />
                  <img
                    src={main.photo_url || '/pasteur-kazadi.jpg'}
                    alt={main.name}
                    className="relative h-80 w-64 rounded-3xl object-cover shadow-2xl sm:h-96 sm:w-72"
                  />
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-500 px-5 py-1.5 text-xs font-bold uppercase tracking-widest text-black shadow-lg">
                    Fondateur
                  </div>
                </div>
              </div>
            </RevealSection>

            <RevealSection className="reveal-delay-1">
              <h3 className="font-serif text-3xl font-bold text-cream sm:text-4xl">{main.name}</h3>
              <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-accent-400">{main.role}</p>
              <p className="mt-6 text-base leading-relaxed text-cream/80">{main.bio}</p>

              {main.thought && (
                <blockquote className="mt-8 border-l-2 border-accent-400/40 pl-5">
                  <p className="text-sm italic leading-relaxed text-muted">« {main.thought} »</p>
                  <p className="mt-2 text-xs font-semibold text-accent-400">— {main.name}</p>
                </blockquote>
              )}
            </RevealSection>
          </div>
        </div>
      </section>
        );
      })()}

      {/* ═══ EQUIPE PASTORALE ═══ */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">Ensemble au service</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">Équipe Pastorale</h2>
            <p className="mt-4 text-muted max-w-2xl mx-auto">
              Des hommes et des femmes dévoués qui accompagnent le pasteur principal dans la vision et l'œuvre de Dieu au sein de notre église.
            </p>
          </RevealSection>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {pastors.map((member, i) => (
              <RevealSection key={member.id} className={i < 3 ? `reveal-delay-${i + 1}` : ''}>
                <div className="glass card-parallax rounded-3xl overflow-hidden">
                  <div className="h-64 overflow-hidden">
                    <img src={member.photo_url || '/pasteur-kazadi.jpg'} alt={member.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-serif text-lg font-semibold text-cream">{member.name}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-accent-400">{member.role}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Placeholder for extension pastors */}
          <RevealSection className="mt-12">
            <div className="glass rounded-3xl p-8 text-center border border-dashed border-accent-400/20">
              <p className="text-sm text-muted">
                <span className="font-semibold text-accent-400">Pasteurs des extensions</span> — Les portraits des pasteurs responsables de nos églises extensions seront ajoutés prochainement.
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══ GALERIE PHOTOS ═══ */}
      <section className="py-20 px-4 bg-radial-primary">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">Moments de grâce</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">Notre Galerie</h2>
          </RevealSection>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { src: '/church-photo-1.jpg', alt: 'Vie de église' },
              { src: '/church-photo-2.jpg', alt: 'Moment de prière' },
              { src: '/church-photo-3.jpg', alt: 'Assemblée' },
              { src: '/predication-1.jpg', alt: 'Prédication' },
              { src: '/priere.jpg', alt: 'Prière' },
              { src: '/bible.jpg', alt: 'Étude biblique' },
            ].map((img, i) => (
              <RevealSection key={img.src}>
                <div className="overflow-hidden rounded-2xl">
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="h-56 w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PREDICATIONS ═══ */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">Écouter et grandir</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">Prédications</h2>
          </RevealSection>
          <div className="grid gap-6 sm:grid-cols-3">
            {PREDICATIONS.map((pred, i) => (
              <RevealSection key={pred.title} className={`reveal-delay-${i + 1}`}>
                <div className="glass rounded-3xl overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                  <div className="relative h-48 overflow-hidden">
                    <img src={pred.img} alt={pred.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-serif text-lg font-semibold text-white">{pred.title}</h3>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DÎMES & OFFRANDES ═══ */}
      <section className="py-20 px-4 bg-radial-ember">
        <div className="mx-auto max-w-4xl">
          <RevealSection className="text-center">
            <div className="mb-4 flex justify-center">
              <HandHeart className="h-8 w-8 text-accent-400/60" />
            </div>
            <p className="section-label justify-center">Soutenir l'œuvre</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">Dîmes, Offrandes & Dons</h2>
            <p className="mt-4 text-muted max-w-2xl mx-auto">
              Vos contributions permettent à l'église de poursuivre sa mission d'évangélisation, de soutenir les plus vulnérables et d'équiper les croyants.
            </p>
          </RevealSection>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {GIVING.map((item, i) => (
              <RevealSection key={item.label} className={`reveal-delay-${i + 1}`}>
                <div className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.02]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">{item.label}</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-cream">{item.value}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="reveal section-label mb-3 text-center">{valuesTitle}</h2>
          {valuesSubtitle && (
            <p className="reveal reveal-delay-1 mb-12 text-center text-base text-muted sm:text-lg">{valuesSubtitle}</p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <div
                key={value.title}
                className={`reveal ${i < 4 ? `reveal-delay-${i + 1}` : ''} glass rounded-3xl p-7 transition-transform duration-300 hover:scale-[1.02]`}
              >
                <span className="mb-4 block text-3xl">{value.icon}</span>
                <h3 className="font-serif mb-3 text-xl font-semibold text-cream">{value.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT STRIP ═══ */}
      <section className="py-20 px-4 bg-radial-primary">
        <div className="mx-auto max-w-6xl">
          <RevealSection className="text-center">
            <p className="section-label justify-center">Nous rejoindre</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-cream">SOYEZ LES BIENVENUS CHEZ VOUS</h2>
          </RevealSection>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: MapPin, label: 'Adresse', value: '520, Av. N\'Djamena, Commune de Lubumbashi, Haut Katanga, RD Congo' },
              { Icon: Phone, label: 'WhatsApp', value: '+243 844 107 079', href: 'https://wa.me/243844107079' },
              { Icon: Mail, label: 'Email', value: 'egliseevangeliquelaconquete@gmail.com', href: 'mailto:egliseevangeliquelaconquete@gmail.com' },
              { Icon: Mail, label: 'Info', value: 'info@laconquete.org', href: 'mailto:info@laconquete.org' },
            ].map(({ Icon, label, value, href }, i) => (
              <RevealSection key={label} className={`reveal-delay-${i + 1}`}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105 block">
                    <IconBox pageKey="about" elementId={`contact-${label.toLowerCase().replace(/\s/g, '-')}-icon`} className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400"><Icon className="h-5 w-5" /></IconBox>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
                    <p className="text-sm font-medium text-cream">{value}</p>
                  </a>
                ) : (
                  <div className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105">
                    <IconBox pageKey="about" elementId={`contact-${label.toLowerCase().replace(/\s/g, '-')}-icon`} className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400"><Icon className="h-5 w-5" /></IconBox>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
                    <p className="text-sm font-medium text-cream">{value}</p>
                  </div>
                )}
              </RevealSection>
            ))}
          </div>

          <RevealSection className="mt-10 text-center">
            <p className="text-xs text-muted/60">
              Réf. : à côté de la cour d'ordre militaire
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-4">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="section-label mb-4">Rejoignez-nous</h2>
          <p className="mb-8 text-cream/70">
            Vous désirez en savoir plus sur notre communauté ou participer à notre prochaine rencontre ? Nous serions ravis de vous accueillir.
          </p>
          <button onClick={() => onNavigate('contact')} className="btn-gold">
            Nous contacter
          </button>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      <MobileNav active="about" onNavigate={onNavigate} />
    </div>
  );
}