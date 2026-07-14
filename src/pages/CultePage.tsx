import { useEffect, useState } from 'react';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Clock, MonitorPlay, Navigation, Phone } from '../lib/icons';
import { Car, Bus, Baby } from 'lucide-react';
import type { Page } from '../lib/navigation';

// ─── Data ─────────────────────────────────────────────────────────
const SCHEDULES = [
  { day: 'Dimanche', time: '09h00', label: 'Culte du matin', desc: 'Louange, adoration et prédication' },
  { day: 'Dimanche', time: '11h00', label: 'Culte principal', desc: 'Enseignement approfondi et ministère' },
  { day: 'Mercredi', time: '18h00', label: 'Étude biblique', desc: 'Enseignement de la Parole pour tous' },
  { day: 'Vendredi', time: '19h00', label: 'Veillée de prière', desc: 'Intercession et adoration nocturne' },
] as const;

const PRACTICALS = [
  { Icon: Car, title: 'Parking', desc: 'Parking gratuit disponible devant et autour de l\'église.' },
  { Icon: Bus, title: 'Transport en commun', desc: 'Ligne 4 — arrêt « Cour Militaire » à 200 m.' },
  { Icon: Baby, title: 'Accueil enfants', desc: 'Salle dédiée pour les 0-5 ans pendant les cultes dominicaux.' },
  { Icon: Phone, title: 'Information', desc: 'Appelez-nous au +243 844 107 079 pour toute question.' },
] as const;

// ─── Component ─────────────────────────────────────────────────────
export function CultePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Simulated live check — replace with real API
    const day = new Date().getDay();
    const hour = new Date().getHours();
    setIsLive(day === 0 && (hour === 9 || hour === 11));

    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="bg-bg min-h-screen">
      <SiteHeader activePage="culte" theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
      <MobileNav active="culte" onNavigate={onNavigate} />

      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-[44vh] items-center justify-center overflow-hidden pt-16 spirit-breath">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg z-10" />
        <div className="relative z-20 mx-auto max-w-4xl px-4 text-center">
          <span className="reveal mb-4 inline-block rounded-full border border-evangile-600/30 bg-evangile-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-evangile-500">
            Rassemblés pour Lui
          </span>
          <h1 className="reveal reveal-delay-1 font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:text-6xl">
            Nos <span className="brand-text">Cultes</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-6 text-lg leading-relaxed text-muted sm:text-xl">
            Rejoignez-nous pour des moments de louange, d'enseignement et de communion fraternelle.
          </p>
        </div>
      </section>

      {/* ═══ HORAIRES ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Programme hebdomadaire</p>
          <h2 className="reveal reveal-delay-1 mb-12 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Horaires des Cultes</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SCHEDULES.map((s, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03]`}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-evangile-600/20 text-evangile-500">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-evangile-500">{s.day}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-cream">{s.time}</p>
                <p className="mt-2 font-semibold text-cream/90">{s.label}</p>
                <p className="mt-1 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIVE STREAMING ═══ */}
      <section className="py-20 lg:py-28 px-4 bg-radial-primary">
        <div className="mx-auto max-w-4xl">
          <div className="reveal mb-8 flex items-center justify-center gap-3">
            <p className="section-label justify-center">En direct</p>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-evangile-600/20 px-3 py-1 text-xs font-bold uppercase text-evangile-500">
                <span className="live-dot" /> EN DIRECT
              </span>
            )}
          </div>
          <h2 className="reveal reveal-delay-1 mb-8 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Live Streaming</h2>
          <div className="reveal reveal-delay-2 glass-card rounded-2xl overflow-hidden">
            <div className="relative aspect-video bg-conquete-700/60 flex items-center justify-center">
              <div className="text-center">
                <MonitorPlay className="mx-auto mb-3 h-12 w-12 text-evangile-500/60" />
                <p className="text-sm text-muted">Le direct sera disponible pendant les cultes</p>
                <p className="mt-1 text-xs text-muted/60">Dimanche 09h00 & 11h00</p>
              </div>
            </div>
          </div>
          <p className="reveal mt-4 text-center text-xs text-muted/60">
            Rejoignez-nous sur{' '}
            <a href="#" className="text-evangile-500 hover:underline">YouTube</a> et{' '}
            <a href="#" className="text-evangile-500 hover:underline">Facebook</a> pour le live.
          </p>
        </div>
      </section>

      {/* ═══ CARTE ═══ */}
      <section className="py-20 lg:py-28 px-4">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Nous trouver</p>
          <h2 className="reveal reveal-delay-1 mb-8 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Localisation</h2>
          <div className="reveal reveal-delay-2 glass-card rounded-2xl overflow-hidden">
            <iframe
              title="Localisation de l'église"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.123456!2d29.2234!3d-11.6602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTHCsDM5JzM2LjciTiAyOcKwMTMnMjQuMiJF!5e0!3m2!1sfr!2scd!4v1700000000000"
              className="h-80 w-full border-0 sm:h-96"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="reveal mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <Navigation className="h-4 w-4 text-evangile-500" />
            <span>520, Av. N'Djamena, Commune de Lubumbashi, Haut Katanga, RD Congo</span>
          </div>
        </div>
      </section>

      {/* ═══ INFOS PRATIQUES ═══ */}
      <section className="py-20 lg:py-28 px-4 bg-radial-ember">
        <div className="mx-auto max-w-6xl">
          <p className="reveal section-label mb-3 text-center">Bon à savoir</p>
          <h2 className="reveal reveal-delay-1 mb-10 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl">Infos Pratiques</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRACTICALS.map((p, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} glass-card rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03]`}>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-evangile-600/20 text-evangile-500">
                  <p.Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-cream">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-4">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="section-label mb-4">Planifiez votre visite</p>
          <p className="mb-8 text-cream/70">
            Première visite ? Nous serions ravis de vous accueillir et de répondre à toutes vos questions.
          </p>
          <button onClick={() => onNavigate('contact')} className="btn-primary">Nous contacter</button>
        </div>
      </section>

      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}