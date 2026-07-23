import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { db, buildSettingsMap } from '../lib/supabase';
import type { Location } from '../types';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useToast } from '../contexts/ToastContext';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { InteractiveMap } from '../components/InteractiveMap';
import { UniversalHero } from '../components/UniversalHero';
import { MapPin, Phone, Mail, Globe, Clock, Send, Navigation } from '../lib/icons';
import { IconBox } from '../components/IconBox';
import type { Page } from '../lib/navigation';

// ─── Types ─────────────────────────────────────────────────────────
interface ContactPageProps {
  onNavigate: (page: Page) => void;
}

// ─── Static service times ─────────────────────────────────────────
const SERVICE_TIMES = [
  { day: 'Dimanche', service: 'Culte Principal', time: '10h00 – 13h00', Icon: Clock },
  { day: 'Mardi', service: 'Étude Biblique', time: '19h00 – 21h00', Icon: Clock },
  { day: 'Jeudi', service: 'Intercession', time: '18h30 – 20h30', Icon: Clock },
  { day: 'Vendredi', service: "Veillée d'Adoration", time: '22h00 – 02h00', Icon: Clock },
] as const;

// ─── Social link config ───────────────────────────────────────────
interface SocialLinkDef {
  key: string;
  label: string;
  fallbackHref: string;
  IconComponent: React.FC<{ className?: string }>;
}

const SOCIAL_LINKS: SocialLinkDef[] = [
  { key: 'facebook_url', label: 'Facebook', fallbackHref: '#', IconComponent: Globe },
  { key: 'youtube_url', label: 'YouTube', fallbackHref: '#', IconComponent: Globe },
  { key: 'whatsapp_url', label: 'WhatsApp', fallbackHref: '#', IconComponent: Globe },
  { key: 'instagram_url', label: 'Instagram', fallbackHref: '#', IconComponent: Globe },
];

// ─── Reveal wrapper ───────────────────────────────────────────────
function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export function ContactPage({ onNavigate }: ContactPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const { addToast } = useToast();

  // ── Data state ─────────────────────────────────────────────────
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // ── Form state ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    visitorType: '' as '' | 'nouveau' | 'visiteur' | 'membre' | 'autre',
    subject: '',
    customSubject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const SUBJECT_SUGGESTIONS = [
    'Demande de prière',
    'Demande de visite pastorale',
    'Information sur un culte',
    'Question sur l\'église',
    'Témoignage',
    'Demande d\'informations générales',
    'Autre',
  ];

  // ── Fetch settings on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const settings = await db.getSettings();
        if (!cancelled) {
          setSettingsMap(buildSettingsMap(settings));
        }
      } catch {
        // Silently fall back to defaults
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch locations on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        const data = await db.getActiveLocations();
        if (!cancelled) {
          setLocations(data);
          const main = data.find((l) => l.is_main);
          setSelectedLocation(main ?? data[0] ?? null);
        }
      } catch {
        // Silently fail
      }
    }

    loadLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived values from settings ───────────────────────────────
  const phone = settingsMap['phone'] ?? '';
  const email = settingsMap['email'] ?? '';
  const address = settingsMap['address'] ?? '';
  const city = settingsMap['city'] ?? '';

  // ── Form submission ────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSending(true);

      try {
        await db.submitContactMessage(
          form.name,
          form.phone,
          form.email || null,
          form.visitorType || null,
          form.subject === 'Autre' ? form.customSubject : form.subject,
          form.message,
        );
        setSent(true);
        addToast('Votre message a été envoyé avec succès !', 'success');
        setForm({ name: '', phone: '', email: '', visitorType: '', subject: '', customSubject: '', message: '' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
        addToast(`Erreur : ${message}`, 'error');
      } finally {
        setSending(false);
      }
    },
    [form, addToast],
  );

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">
      <SiteHeader
        onNavigate={onNavigate}
        activePage="contact"
      />

      {/* ─── HERO ─── */}
      <UniversalHero pageKey="contact" defaultBadge="Contactez-nous" defaultTitle="Contact" defaultSubtitle="Que vous ayez une question, un témoignage ou souhaitiez en savoir plus, nous sommes là pour vous." />

      {/* ─── CONTACT INFO + FORM ─── */}
      <section className="py-12 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">

            {/* ─── LEFT: Contact info ─── */}
            <RevealSection className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                <h2 className="font-serif text-3xl font-semibold text-cream">Nos coordonnées</h2>

                {/* Contact cards */}
                <div className="flex flex-col gap-4">
                  {/* Address */}
                  <div className="glass rounded-2xl p-5 flex items-start gap-4">
                    <IconBox pageKey="contact" elementId="info-mappin-icon" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400">
                      <MapPin className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Adresse</p>
                      <p className="mt-1 text-sm text-cream">
                        {address && city ? `${address}, ${city}` : 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="glass rounded-2xl p-5 flex items-start gap-4">
                    <IconBox pageKey="contact" elementId="info-phone-icon" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400">
                      <Phone className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Téléphone</p>
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="mt-1 block text-sm text-cream hover:text-accent-400 transition-colors"
                        >
                          {phone}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-muted">Non renseigné</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="glass rounded-2xl p-5 flex items-start gap-4">
                    <IconBox pageKey="contact" elementId="info-mail-icon" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-400/20 text-accent-400">
                      <Mail className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Email</p>
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="mt-1 block text-sm text-cream hover:text-accent-400 transition-colors"
                        >
                          {email}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-muted">Non renseigné</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social links */}
                {SOCIAL_LINKS.some((s) => settingsMap[s.key]) && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                      Réseaux sociaux
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {SOCIAL_LINKS.map(({ key, label, fallbackHref, IconComponent }) => {
                        const href = settingsMap[key] || fallbackHref;
                        if (!settingsMap[key]) return null;
                        return (
                          <a
                            key={key}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-400"
                          >
                            <IconComponent className="h-3.5 w-3.5" />
                            {label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </RevealSection>

            {/* ─── RIGHT: Contact form ─── */}
            <RevealSection className="lg:col-span-3 reveal-delay-1">
              <div className="glass rounded-4xl p-5 md:p-8">
                <h2 className="mb-6 font-serif text-2xl font-semibold text-cream">
                  Envoyez-nous un message
                </h2>

                {sent ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-400/20 text-accent-400">
                      <Send className="h-7 w-7" />
                    </div>
                    <h3 className="font-serif text-2xl font-semibold text-cream">
                      Message envoyé !
                    </h3>
                    <p className="mt-2 text-muted">
                      Nous vous répondrons dans les plus brefs délais.
                    </p>
                    <button
                      onClick={() => setSent(false)}
                      className="btn-ghost mt-6 text-sm px-5 py-2.5"
                    >
                      Envoyer un autre message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Type de visiteur */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">
                        Vous êtes <span className="text-accent-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { val: 'nouveau', label: 'Nouveau' },
                          { val: 'visiteur', label: 'Visiteur' },
                          { val: 'membre', label: 'Membre' },
                          { val: 'autre', label: 'Autre' },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, visitorType: opt.val as typeof f.visitorType }))}
                            className={`rounded-xl px-3 py-3 text-xs font-medium border transition-all ${
                              form.visitorType === opt.val
                                ? 'border-accent-400/50 bg-accent-400/10 text-accent-400'
                                : 'border-line text-muted hover:text-cream hover:border-white/20'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">
                          Nom complet <span className="text-accent-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="Jean Dupont"
                          className="input-surface w-full px-4 py-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">
                          Téléphone <span className="text-accent-400">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          placeholder="+243 812 345 678"
                          className="input-surface w-full px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">
                        Adresse email <span className="text-muted/50">(optionnel)</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="vous@email.com"
                        className="input-surface w-full px-4 py-3 text-sm"
                      />
                    </div>
                    {/* Sujets suggérés */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">
                        Sujet <span className="text-accent-400">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {SUBJECT_SUGGESTIONS.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, subject: s }))}
                            className={`rounded-lg px-3 py-2.5 text-xs font-medium border transition-all ${
                              form.subject === s
                                ? 'border-accent-400/50 bg-accent-400/10 text-accent-400'
                                : 'border-line text-muted hover:text-cream hover:border-white/20'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {(form.subject === 'Autre' || !form.subject) && (
                        <input
                          type="text"
                          required={!form.subject || form.subject === 'Autre'}
                          value={form.subject === 'Autre' ? form.customSubject : form.subject ? '' : form.customSubject}
                          onChange={(e) => {
                            if (form.subject === 'Autre') {
                              setForm(f => ({ ...f, customSubject: e.target.value }));
                            } else if (!form.subject) {
                              setForm(f => ({ ...f, customSubject: e.target.value }));
                            }
                          }}
                          placeholder="Décrivez votre sujet..."
                          className="input-surface w-full px-4 py-3 text-sm"
                        />
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted">
                        Message <span className="text-accent-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={form.message}
                        onChange={(e) => updateField('message', e.target.value)}
                        placeholder="Votre message…"
                        className="input-surface w-full resize-none px-4 py-3 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending}
                      className="btn-gold self-start"
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {sending ? 'Envoi…' : 'Envoyer'}
                    </button>
                  </form>
                )}
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── SERVICE TIMES ─── */}
      <section className="py-12 md:py-20 lg:py-24 bg-radial-primary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">Horaires</p>
            <h2 className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">Nos cultes</h2>
          </RevealSection>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_TIMES.map(({ day, service, time, Icon }, i) => (
              <RevealSection key={day} className={`reveal-delay-${i + 1}`}>
                <div className="glass rounded-3xl p-6 text-center transition-all duration-300 hover:scale-105 active:scale-95">
                  <IconBox pageKey="contact" elementId={`service-clock-icon-${i}`} className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-400/20 text-accent-400">
                    <Icon className="h-5 w-5" />
                  </IconBox>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent-400">{day}</p>
                  <h3 className="mt-1 font-serif text-lg font-semibold text-cream">{service}</h3>
                  <p className="mt-1 text-sm text-muted">{time}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MAP SECTION ─── */}
      <section className="py-12 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-12 text-center">
            <p className="section-label justify-center">Nous trouver</p>
            <h2 className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">
              Nos lieux de culte
            </h2>
          </RevealSection>

          {locations.length > 0 && (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Location list (1/3) */}
              <RevealSection>
                <div className="flex flex-col gap-3">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc)}
                      className={`glass rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.01] ${
                        selectedLocation?.id === loc.id
                          ? 'border-accent-400/40 bg-accent-400/5'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            loc.is_main ? 'text-accent-400' : 'text-ember-400'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-cream">{loc.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {loc.address}, {loc.city}
                          </p>
                          {loc.service_times && (
                            <p className="mt-1 text-xs text-muted/60">{loc.service_times}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </RevealSection>

              {/* Interactive map (2/3) */}
              <RevealSection className="lg:col-span-2 reveal-delay-1">
                <InteractiveMap
                  locations={locations}
                  onSelect={setSelectedLocation}
                  className="h-[300px] sm:h-[400px] md:h-[500px]"
                />
              </RevealSection>
            </div>
          )}

          {/* Selected location detail */}
          {selectedLocation && (
            <RevealSection className="mt-8">
              <div className="glass rounded-3xl p-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-400/20 text-accent-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-cream">
                      {selectedLocation.name}
                    </h3>
                    <p className="text-sm text-muted">
                      {selectedLocation.address}, {selectedLocation.city}
                      {selectedLocation.country ? `, ${selectedLocation.country}` : ''}
                    </p>
                    {selectedLocation.pastor_name && (
                      <p className="mt-1 text-xs text-muted/70">
                        Pasteur : {selectedLocation.pastor_name}
                      </p>
                    )}
                    {selectedLocation.phone && (
                      <a
                        href={`tel:${selectedLocation.phone}`}
                        className="mt-1 flex items-center gap-1.5 text-xs text-muted hover:text-accent-400 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        {selectedLocation.phone}
                      </a>
                    )}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${selectedLocation.address}, ${selectedLocation.city}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm px-5 py-2.5 shrink-0 flex items-center gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Itinéraire
                </a>
              </div>
            </RevealSection>
          )}
        </div>
      </section>

      <SiteFooter
        onNavigate={onNavigate}
        theme={colorMode}
        onToggleTheme={toggleColorMode}
      />
      <MobileNav
        onNavigate={onNavigate}
        active="contact"
      />
    </div>
  );
}