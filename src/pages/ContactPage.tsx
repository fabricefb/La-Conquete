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
import { MapPin, Phone, Mail, Globe, Send, Navigation } from '../lib/icons';
import { SERVICE_TIMES } from '../lib/services';
import { CHURCH, churchSetting } from '../lib/church';
import { IconBox } from '../components/IconBox';
import type { Page } from '../lib/navigation';

// ─── Types ─────────────────────────────────────────────────────────
interface ContactPageProps {
  onNavigate: (page: Page) => void;
}

// ─── Static service times ─────────────────────────────────────────
// Source unique : src/lib/services.ts (aussi lue par le compte à rebours de l'accueil)

// ─── Social link config ───────────────────────────────────────────
interface SocialLinkDef {
  key: string;
  label: string;
  fallbackHref: string;
  IconComponent: React.FC<{ className?: string }>;
}

const SOCIAL_LINKS: SocialLinkDef[] = [
  { key: 'facebook_url', label: 'Facebook', fallbackHref: CHURCH.social.facebook, IconComponent: Globe },
  { key: 'instagram_url', label: 'Instagram', fallbackHref: CHURCH.social.instagram, IconComponent: Globe },
  { key: 'whatsapp_url', label: 'WhatsApp', fallbackHref: `https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}`, IconComponent: Globe },
  { key: 'youtube_url', label: 'YouTube', fallbackHref: '', IconComponent: Globe },
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
    'Conseil pastoral',
    'Baptême',
    'Mariage',
    'Rejoindre un département',
    'Information sur un culte',
    'Question sur l\'église',
    'Témoignage',
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

  // ── Derived values — réglage admin prioritaire, sinon source unique ──
  const phone = churchSetting(settingsMap, 'phone', CHURCH.phone.display);
  const phoneHref = settingsMap['phone'] ? `tel:${phone.replace(/[^+\d]/g, '')}` : CHURCH.phone.href;
  const email = churchSetting(settingsMap, 'email', CHURCH.email);
  const address = churchSetting(settingsMap, 'address', CHURCH.address.street);
  const city = churchSetting(settingsMap, 'city', CHURCH.address.city);

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
                <div>
                  <p className="section-label">Nous joindre</p>
                  <h2 className="section-title mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)]">Nos coordonnées</h2>
                  <div className="rule-accent mt-5" />
                </div>

                <div className="border border-line bg-bg-card">
                  <div className="flex items-start gap-4 border-b border-line p-5">
                    <IconBox pageKey="contact" elementId="info-mappin-icon" className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line text-evangile-600">
                      <MapPin className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <p className="person-role">Adresse</p>
                      <p className="mt-2 text-sm leading-relaxed text-cream">{address}, {city}</p>
                      <p className="mt-1 text-xs text-muted">{CHURCH.address.landmark} · {CHURCH.address.country}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 border-b border-line p-5">
                    <IconBox pageKey="contact" elementId="info-phone-icon" className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line text-evangile-600">
                      <Phone className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <p className="person-role">Téléphone</p>
                      <a href={phoneHref} className="mt-2 block text-sm text-cream transition-colors hover:text-evangile-600">
                        {phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5">
                    <IconBox pageKey="contact" elementId="info-mail-icon" className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line text-evangile-600">
                      <Mail className="h-4 w-4" />
                    </IconBox>
                    <div>
                      <p className="person-role">Email</p>
                      <a href={`mailto:${email}`} className="mt-2 block break-all text-sm text-cream transition-colors hover:text-evangile-600">
                        {email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Social links */}
                {SOCIAL_LINKS.some((s) => settingsMap[s.key] || s.fallbackHref) && (
                  <div>
                    <p className="person-role">Réseaux sociaux</p>
                    <div className="mt-3 flex flex-wrap items-center gap-px bg-line">
                      {SOCIAL_LINKS.map(({ key, label, fallbackHref, IconComponent }) => {
                        const href = settingsMap[key] || fallbackHref;
                        if (!href) return null;
                        return (
                          <a
                            key={key}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-bg px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:bg-bg-elevated hover:text-evangile-600"
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
              <div className="panel p-6 md:p-8">
                <h2 className="card-title">
                  Envoyez-nous un message
                </h2>
                <div className="rule mt-5 mb-6" />

                {sent ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-evangile-600 text-white">
                      <Send className="h-6 w-6" />
                    </div>
                    <h3 className="section-title text-[clamp(1.6rem,3vw,2.25rem)]">
                      Message envoyé
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
                          placeholder={CHURCH.phone.display}
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
                      className="btn-primary self-start"
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
      <section className="border-y border-line bg-bg-card py-12 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-12">
            <p className="section-label">Horaires</p>
            <h2 className="section-title mt-4">Nos cultes</h2>
            <div className="rule-accent mt-6" />
          </RevealSection>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_TIMES.map(({ day, service, time }, i) => (
              <RevealSection key={day} className={`reveal-delay-${i + 1}`}>
                <div className="h-full bg-bg-card p-6">
                  <span className="block h-1 w-10 bg-evangile-600" />
                  <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-evangile-600">{day}</p>
                  <h3 className="card-title mt-3">{service}</h3>
                  <p className="mt-2 text-sm text-muted">{time}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MAP SECTION ─── */}
      <section className="py-12 md:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection className="mb-12">
            <p className="section-label">Nous trouver</p>
            <h2 className="section-title mt-4">Nos lieux de culte</h2>
            <div className="rule-accent mt-6" />
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
                      className={`border p-4 text-left transition-colors ${
                        selectedLocation?.id === loc.id
                          ? 'border-evangile-600 bg-bg-card'
                          : 'border-line hover:bg-bg-elevated'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            selectedLocation?.id === loc.id ? 'text-evangile-600' : 'text-muted'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-cream">{loc.name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {loc.address}, {loc.city}
                          </p>
                          {loc.service_times && (
                            <p className="mt-1 text-xs text-muted/70">{loc.service_times}</p>
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
              <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line text-evangile-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="card-title text-xl">
                      {selectedLocation.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
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
                        className="mt-1 flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-evangile-600"
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
                  className="btn-ghost shrink-0 px-5 py-3 text-sm"
                >
                  <Navigation className="h-4 w-4" />
                  Itinéraire
                </a>
              </div>
            </RevealSection>
          )}
        </div>
      </section>

      <div className="footer-spacer" />
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