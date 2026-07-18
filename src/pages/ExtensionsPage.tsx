import { useState } from 'react';
import { MapPin, Clock, Users, Calendar, ChevronDown, Image, Building2, Facebook, MonitorPlay, Mail } from '../lib/icons';
import { UniversalHero } from '../components/UniversalHero';
import type { Page } from '../lib/navigation';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';

/* ─── Mock data (à remplacer par Supabase) ─────────────────────── */

interface ExtensionPastor {
  name: string;
  role: string;
  photo: string;
  bio?: string;
  social_links?: Record<string, string>;
}

interface Extension {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  pastors: ExtensionPastor[];
  activities: { title: string; schedule: string; description: string }[];
  photos: string[];
  program: { day: string; time: string; label: string }[];
}

const EXTENSIONS: Extension[] = [
  {
    id: 'ext-1',
    name: 'La Conquête — Matonge',
    city: 'Kinshasa, RD Congo',
    address: '123 Avenue de la Paix, Matonge, Kinshasa',
    description: 'Première extension de l\'Église Évangélique La Conquête dans le quartier de Matonge. Un lieu de prière et de communion au cœur de la capitale.',
    pastors: [
      { name: 'Pasteur Jean Mukendi', role: 'Responsable d\'extension', photo: 'https://ui-avatars.com/api/?name=Jean+Mukendi&background=0F2147&color=F87171&size=200', bio: 'Homme de Dieu dévoué, il conduit l\'extension de Matonge avec passion et fidélité depuis sa création.' },
      { name: 'Pasteure Marie Lushima', role: 'Co-responsable', photo: 'https://ui-avatars.com/api/?name=Marie+Lushima&background=0F2147&color=F87171&size=200', bio: 'Diplômée en théologie, elle accompagne les fidèles avec sagesse et bienveillance.' },
    ],
    activities: [
      { title: 'École du dimanche', schedule: 'Chaque dimanche, 08h00', description: 'Enseignement biblique pour enfants et adolescents' },
      { title: 'Groupe de jeunesse', schedule: 'Vendredi, 17h30', description: 'Louange, étude biblique et activités communautaires pour les jeunes' },
      { title: 'Groupe de prière', schedule: 'Mercredi, 18h00', description: 'Moment de prière communautaire et intercession' },
    ],
    photos: [
      'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1510590337019-5ef8d2d2b47e?w=600&h=400&fit=crop',
    ],
    program: [
      { day: 'Dimanche', time: '09h00 — 11h30', label: 'Culte principal' },
      { day: 'Mercredi', time: '18h00 — 19h30', label: 'Prière et intercession' },
      { day: 'Vendredi', time: '17h30 — 19h00', label: 'Jeunesse' },
    ],
  },
  {
    id: 'ext-2',
    name: 'La Conquête — Lemba',
    city: 'Kinshasa, RD Congo',
    address: '45 Boulevard Lumumba, Lemba, Kinshasa',
    description: 'Notre extension de Lemba sert la communauté locale avec des cultes vibrants et des programmes de développement social.',
    pastors: [
      { name: 'Pasteur David Kabongo', role: 'Responsable d\'extension', photo: 'https://ui-avatars.com/api/?name=David+Kabongo&background=0F2147&color=F87171&size=200', bio: 'Serviteur zélé, il a planté l\'extension de Lemba avec une vision claire pour la communauté locale.' },
    ],
    activities: [
      { title: 'Culte de jeunesse', schedule: 'Samedi, 15h00', description: 'Culte dédié aux jeunes avec louange et prédication' },
      { title: 'Alpha Course', schedule: 'Mardi, 18h00', description: 'Cours d\'initiation à la foi chrétienne pour nouveaux croyants' },
    ],
    photos: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop',
    ],
    program: [
      { day: 'Dimanche', time: '10h00 — 12h00', label: 'Culte principal' },
      { day: 'Mardi', time: '18h00 — 19h30', label: 'Alpha Course' },
      { day: 'Samedi', time: '15h00 — 17h00', label: 'Jeunesse' },
    ],
  },
  {
    id: 'ext-3',
    name: 'La Conquête — Lubumbashi',
    city: 'Lubumbashi, RD Congo',
    address: '78 Avenue Kasongo, Lubumbashi',
    description: 'Première extension provinciale de La Conquête à Lubumbashi, portant la vision de l\'église dans le Katanga.',
    pastors: [
      { name: 'Pasteur Samuel Ilunga', role: 'Responsable provincial', photo: 'https://ui-avatars.com/api/?name=Samuel+Ilunga&background=0F2147&color=F87171&size=200', bio: 'Visionnaire et bâtisseur, il porte la flamme de La Conquête dans la province du Katanga.' },
      { name: 'Pasteure Grâce Kyungu', role: 'Co-responsable', photo: 'https://ui-avatars.com/api/?name=Grace+Kyungu&background=0F2147&color=F87171&size=200', bio: 'Passionnée par l\'enseignement biblique, elle forme les nouveaux convertis avec patience et amour.' },
    ],
    activities: [
      { title: 'École biblique', schedule: 'Samedi, 09h00', description: 'Formation théologique de base pour tous les membres' },
      { title: 'Aide sociale', schedule: 'En continu', description: 'Programme d\'aide aux familles vulnérables' },
    ],
    photos: [
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1438031653695-883f8c900b85?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
    ],
    program: [
      { day: 'Dimanche', time: '09h30 — 12h00', label: 'Culte principal' },
      { day: 'Mercredi', time: '17h30 — 19h00', label: 'Prière' },
      { day: 'Samedi', time: '09h00 — 11h00', label: 'École biblique' },
    ],
  },
];

/* ─── Accordion Section ─────────────────────────────────────────── */

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5 cursor-pointer"
      >
        <span className="text-lg font-semibold text-cream">{title}</span>
        <ChevronDown className={`h-5 w-5 text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-400 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

/* ─── Extension Pastor Card (hover bio overlay, no border, PNG-ready) ── */

function ExtensionPastorCard({ pastor }: { pastor: ExtensionPastor }) {
  const hasSocials =
    pastor.social_links &&
    Object.values(pastor.social_links).some((v) => v && v.trim() !== '');

  return (
    <div className="group relative aspect-[3/4] overflow-hidden">
      {/* Photo — PNG-friendly (object-contain for transparent PNGs) */}
      {pastor.photo ? (
        <img
          src={pastor.photo}
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
          <span className="font-serif text-3xl font-bold tracking-wider text-cream/60">
            {pastor.name.split(' ').filter(Boolean).slice(-1)[0]?.[0]}{pastor.name.split(' ')[0]?.[0]}
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

/* ─── Single Extension Card ─────────────────────────────────────── */

function ExtensionCard({ ext, index }: { ext: Extension; index: number }) {
  return (
    <div
      className="animate-fade-up glass rounded-2xl overflow-hidden"
      style={{ animationDelay: `${(index % 4) * 0.1}s` }}
    >
      {/* Header */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={ext.photos[0]}
          alt={ext.name}
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <h3 className="text-2xl font-bold text-white">{ext.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4 text-accent-400" />
            <span className="text-sm text-white/80">{ext.city}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Description */}
        <p className="text-sm text-muted leading-relaxed">{ext.description}</p>

        {/* Address */}
        <div className="flex items-start gap-3 text-sm">
          <Building2 className="h-4 w-4 text-accent-500 mt-0.5 shrink-0" />
          <span className="text-cream/80">{ext.address}</span>
        </div>

        {/* Activities */}
        <AccordionSection title="Activités">
          <div className="space-y-3">
            {ext.activities.map(a => (
              <div key={a.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-400/10">
                  <Users className="h-4 w-4 text-accent-500" />
                </div>
                <div>
                  <p className="font-medium text-cream text-sm">{a.title}</p>
                  <p className="text-xs text-muted mt-0.5">{a.description}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3 text-accent-500/60" />
                    <span className="text-xs text-accent-500/80">{a.schedule}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* Gallery */}
        <AccordionSection title="Galerie photos">
          <div className="grid grid-cols-3 gap-2">
            {ext.photos.map((photo, i) => (
              <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <img src={photo} alt={`${ext.name} photo ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                  <Image className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* Program */}
        <AccordionSection title="Programme">
          <div className="space-y-2">
            {ext.program.map(p => (
              <div key={p.day + p.label} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-400/10">
                  <Calendar className="h-5 w-5 text-accent-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-cream text-sm">{p.day}</p>
                    <span className="text-xs text-accent-500/80">{p.time}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{p.label}</p>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}

/* ─── Page Component ────────────────────────────────────────────── */

interface ExtensionsPageProps {
  onNavigate: (page: Page) => void;
  openAuth?: (view?: 'login' | 'signup') => void;
}

export function ExtensionsPage({ onNavigate }: ExtensionsPageProps) {
  // Collect all extension pastors
  const allExtensionPastors = EXTENSIONS.flatMap(ext =>
    ext.pastors.map(p => ({ ...p, extension: ext.name }))
  );

  return (
    <>
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="extensions" />
      <div className="min-h-screen bg-bg">
        {/* Hero */}
        <UniversalHero pageKey="extensions" defaultBadge="Notre rayonnement" defaultTitle="Nos Extensions" defaultSubtitle="L'Église Évangélique La Conquête s'étend au-delà de son siège principal. Découvrez nos différentes extensions, leurs pasteurs, leurs activités et leurs programmes." />

        {/* Extensions Grid */}
        <section className="mx-auto max-w-5xl px-4 pb-24">
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
            {EXTENSIONS.map((ext, i) => (
              <ExtensionCard key={ext.id} ext={ext} index={i} />
            ))}
          </div>
        </section>

        {/* ═══ PASTORS OF EXTENSIONS — Special Section ═══ */}
        {allExtensionPastors.length > 0 && (
          <section className="py-24 px-4 bg-radial-primary">
            <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
              <div className="animate-fade-up mb-14 text-center">
                <p className="section-label justify-center">Nos pasteurs d'extensions</p>
                <h2 className="mt-4 font-serif text-3xl md:text-4xl font-semibold text-cream">
                  Ceux qui portent la vision loin
                </h2>
                <p className="mt-4 text-muted max-w-2xl mx-auto">
                  Des hommes et des femmes appelés par Dieu pour étendre l'Évangile au-delà de notre siège principal.
                </p>
              </div>

              {/* Grid: max 4 columns, PNG photos, bio on hover */}
              <div className="animate-fade-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ animationDelay: '0.15s' }}>
                {allExtensionPastors.map((pastor) => (
                  <div key={pastor.name + pastor.extension} className="relative">
                    <ExtensionPastorCard pastor={pastor} />
                    {/* Extension label under the card */}
                    <p className="mt-2 text-xs text-accent-400 text-center font-medium">
                      {pastor.extension}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      <SiteFooter onNavigate={onNavigate} />
    </>
  );
}