import { useState, useEffect } from 'react';
import { db, buildSettingsMap } from '../lib/supabase';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { UniversalHero } from '../components/UniversalHero';
import { MessageCircle, BookOpen, Users, Shield, Check, Copy, ArrowRight } from '../lib/icons';
import type { Page } from '../lib/navigation';
import { CHURCH, GIVING_ACCOUNTS, churchSetting } from '../lib/church';

interface DonsPageProps {
  onNavigate: (page: Page) => void;
}

const QUOTE_TEXT = 'Nous ne bâtissons pas seulement des murs, nous élevons des destinées pour la gloire éternelle.';
const QUOTE_AUTHOR = CHURCH.pastor.name;

const AMOUNTS = ['20', '50', '100', 'Autre'];

const IMPACT = [
  { icon: BookOpen, title: 'Enseignement', desc: 'Financer les études bibliques, les supports de formation et l\u2019équipement des responsables.' },
  { icon: Users, title: 'Entraide', desc: 'Soutenir les familles dans le besoin, les actions sociales et l\u2019assistance communautaire.' },
  { icon: Shield, title: 'Infrastructure', desc: 'Entretenir les lieux de culte et accompagner le développement des extensions.' },
];

export function DonsPage({ onNavigate }: DonsPageProps) {
  const { resetTheme } = useDynamicTheme();
  const [selectedAmount, setSelectedAmount] = useState('50');
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { resetTheme(); }, [resetTheme]);

  useEffect(() => {
    db.getSettings().then((s) => setSettings(buildSettingsMap(s) || {})).catch(() => {});
  }, []);

  const churchPhone = churchSetting(settings, 'church_phone', CHURCH.phone.display);
  const whatsappNumber = settings['whatsapp'] || CHURCH.phone.href.replace(/\D/g, '');
  const isCustom = selectedAmount === 'Autre';
  const chosenAmount = isCustom ? customAmount.trim() : selectedAmount;

  const handleWhatsAppDon = () => {
    const montant = chosenAmount ? `${chosenAmount} USD` : 'un don libre';
    const rythme = frequency === 'once' ? 'don unique' : 'don mensuel';
    const msg = encodeURIComponent(
      `Bonjour, je souhaite soutenir l'Église Évangélique La Conquête. Montant : ${montant} (${rythme}). Pourriez-vous m'indiquer les modalités de paiement ? Merci.`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader onNavigate={onNavigate} activePage="dons" />

      <UniversalHero pageKey="dons" defaultBadge="Soutenir l'œuvre" defaultTitle="Faire un don" defaultSubtitle="Votre générosité permet à l'église de poursuivre sa mission d'enseignement, d'entraide communautaire et d'évangélisation. Chaque don compte." />

      {/* ── Citation ─────────────────────────────────────────── */}
      <section className="border-b border-line px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <span className="block h-1 w-12 bg-evangile-600" aria-hidden="true" />
          <blockquote className="mt-8">
            <p className="verse-quote text-[clamp(1.4rem,2.6vw,2rem)] leading-snug">
              « {QUOTE_TEXT} »
            </p>
            <cite className="mt-6 block text-[11px] font-semibold uppercase not-italic tracking-[0.24em] text-muted">
              {QUOTE_AUTHOR}
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ── Don ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="section-label">La mission</p>
            <h2 className="section-title mt-4">Soutenir la mission</h2>
            <div className="rule-accent mt-6" />
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-cream/80">
              Votre générosité permet à l'Évangile de franchir de nouvelles frontières. Par vos dons, vous soutenez
              nos programmes locaux, l'accompagnement des familles et le développement de nos extensions.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
              {IMPACT.slice(0, 2).map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-bg p-5">
                  <Icon className="h-5 w-5 text-evangile-600" />
                  <h3 className="mt-3 text-sm font-semibold text-cream">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="border-b border-line px-6 py-5">
              <h3 className="card-title">Faire un don</h3>
              <p className="mt-1 text-xs text-muted">Choisissez un montant, puis finalisez par WhatsApp avec le bureau pastoral.</p>
            </div>

            <div className="px-6 py-6">
              <p className="person-role">Montant</p>
              <div className="mt-3 grid grid-cols-4 gap-px bg-line">
                {AMOUNTS.map((amt) => {
                  const active = selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => setSelectedAmount(amt)}
                      aria-pressed={active}
                      className={`bg-bg py-3 text-sm font-semibold transition-colors ${
                        active ? 'bg-evangile-600 text-white' : 'text-muted hover:text-cream'
                      }`}
                    >
                      {amt === 'Autre' ? 'Autre' : `$${amt}`}
                    </button>
                  );
                })}
              </div>

              {isCustom && (
                <div className="mt-3">
                  <label htmlFor="don-montant" className="sr-only">Montant personnalisé en dollars</label>
                  <input
                    id="don-montant"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="Montant en USD"
                    className="input-surface w-full px-4 py-3 text-sm"
                  />
                </div>
              )}

              <p className="person-role mt-6">Fréquence</p>
              <div className="mt-3 grid grid-cols-2 gap-px bg-line">
                <button
                  onClick={() => setFrequency('once')}
                  aria-pressed={frequency === 'once'}
                  className={`py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
                    frequency === 'once' ? 'bg-evangile-600 text-white' : 'bg-bg text-muted hover:text-cream'
                  }`}
                >
                  Une seule fois
                </button>
                <button
                  onClick={() => setFrequency('monthly')}
                  aria-pressed={frequency === 'monthly'}
                  className={`py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
                    frequency === 'monthly' ? 'bg-evangile-600 text-white' : 'bg-bg text-muted hover:text-cream'
                  }`}
                >
                  Mensuel
                </button>
              </div>

              <button onClick={handleWhatsAppDon} className="btn-primary mt-6 w-full">
                <MessageCircle className="h-4 w-4" />
                Continuer sur WhatsApp
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                Le message s'ouvre pré-rempli. Aucun paiement n'est prélevé sur ce site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comptes ──────────────────────────────────────────── */}
      <section className="border-y border-line bg-bg-card px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="section-label">Coordonnées de don</p>
          <h2 className="section-title mt-4">Où envoyer votre don</h2>
          <div className="rule-accent mt-6" />

          <div className="mt-8 border border-line bg-bg">
            {GIVING_ACCOUNTS.map((account, i) => (
              <div
                key={account.label}
                className={`flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <div>
                  <p className="person-role">{account.label}</p>
                  <p className="mt-2 font-mono text-base font-semibold tracking-wide text-cream">{account.value}</p>
                </div>
                <button
                  onClick={() => copyValue(account.value)}
                  className="inline-flex items-center gap-2 border border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:border-evangile-600 hover:text-evangile-600"
                >
                  {copied === account.value ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === account.value ? 'Copié' : 'Copier'}
                </button>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted">
            Une question sur votre don ? Appelez le{' '}
            <a href={CHURCH.phone.href} className="font-semibold text-cream underline decoration-evangile-600 decoration-2 underline-offset-4">
              {churchPhone}
            </a>{' '}
            ou écrivez à{' '}
            <a href={`mailto:${CHURCH.email}`} className="font-semibold text-cream underline decoration-evangile-600 decoration-2 underline-offset-4">
              {CHURCH.email}
            </a>.
          </p>
        </div>
      </section>

      {/* ── Impact ───────────────────────────────────────────── */}
      <section className="px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="section-label">Votre impact</p>
          <h2 className="section-title mt-4">Votre don change des vies</h2>
          <div className="rule-accent mt-6" />

          <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
            {IMPACT.map(({ icon: Icon, title, desc }, i) => (
              <article key={title} className="bg-bg p-7">
                <div className="flex items-start justify-between">
                  <Icon className="h-6 w-6 text-evangile-600" />
                  <span className="stat-figure text-[2.25rem] text-evangile-600/25">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="card-title mt-5">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rappel ───────────────────────────────────────────── */}
      <section className="border-t border-line px-4 py-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Les dîmes et offrandes sont reçues au bureau pastoral, du lundi au vendredi de 10h à 18h00, et le dimanche
            avant et après le culte.
          </p>
          <button onClick={() => onNavigate('contact')} className="btn-ghost">
            Nous contacter <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="footer-spacer" />
      <SiteFooter onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active={'home' as Page} />
    </div>
  );
}
