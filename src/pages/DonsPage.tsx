import { useState, useEffect } from 'react';
import { db, buildSettingsMap } from '../lib/supabase';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { UniversalHero } from '../components/UniversalHero';
import { Heart, CreditCard, Smartphone, MessageCircle, Phone, Mail, Shield, Users, BookOpen, Radio, HandHeart } from '../lib/icons';
import type { Page } from '../lib/navigation';

/* ─── Types ───────────────────────────────────────────────────────── */
interface DonsPageProps {
  onNavigate: (page: Page) => void;
}

/* ─── Verse ───────────────────────────────────────────────────────── */
const QUOTE_TEXT = "Nous ne bâtissons pas seulement des murs, nous élevons des destinées pour la gloire éternelle.";
const QUOTE_AUTHOR = "Pasteur Jean-Luc & Marie-Claire";

/* ─── Don amounts ─────────────────────────────────────────────────── */
const AMOUNTS = ['$20', '$50', '$100', 'Autre'];

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */
export function DonsPage({ onNavigate }: DonsPageProps) {
  const { resetTheme } = useDynamicTheme();
  const [selectedAmount, setSelectedAmount] = useState('$50');
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => { resetTheme(); }, [resetTheme]);

  // Load settings (phone, bank details, etc.)
  useEffect(() => {
    db.getSettings().then(settings => setSettings(buildSettingsMap(settings) || {})).catch(() => {});
  }, []);

  const churchPhone = settings['church_phone'] || '+243 000 000 000';
  const whatsappNumber = settings['whatsapp'] || '243000000000';

  const handleWhatsAppDon = () => {
    const msg = encodeURIComponent('Bonjour, je souhaite faire un don à l\'Église Évangélique La Conquête. Pourriez-vous me donner les informations de paiement ?');
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader onNavigate={onNavigate} activePage="dons" />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <UniversalHero pageKey="dons" defaultBadge="Soutenir l'œuvre" defaultTitle="Faire un don" defaultSubtitle="Votre générosité permet à l'église de poursuivre sa mission d'enseignement, d'entraide communautaire et d'évangélisation. Chaque don compte." />

      {/* ── Quote Section ─────────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden px-4 md:px-8">
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="animate-fade-up mb-6 block">
            <span className="text-accent-400 text-5xl mb-4 block">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto text-accent-400/60">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
              </svg>
            </span>
          </div>
          <h2 className="animate-fade-up font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-cream mb-6 italic leading-tight" style={{ animationDelay: '0.1s' }}>
            &laquo; {QUOTE_TEXT.split('destinées').map((part, i) =>
              i === 0 ? <>{part}<span className="gold-text">destinées</span></> : part
            )} &raquo;
          </h2>
          <div className="animate-fade-up w-16 h-px bg-accent-400/30 mx-auto mb-4" style={{ animationDelay: '0.2s' }} />
          <p className="animate-fade-up text-sm font-semibold uppercase tracking-widest text-muted" style={{ animationDelay: '0.3s' }}>
            {QUOTE_AUTHOR}
          </p>
        </div>
      </section>

      {/* ── Donation Section ──────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 relative">
        {/* Decorative blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-400/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-conquete-blue/20 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="animate-fade-up">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-cream mb-6">
              Soutenir la Mission
            </h2>
            <p className="text-lg leading-relaxed text-muted mb-8">
              Votre générosité permet à l'Évangile de franchir de nouvelles frontières. Par vos dons, vous soutenez non seulement nos programmes locaux, mais aussi notre expansion numérique mondiale et nos actions humanitaires.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-accent-400/10 p-3 rounded-lg shrink-0">
                  <Radio className="h-5 w-5 text-accent-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-cream">Streaming HD</h4>
                  <p className="text-xs text-muted">Maintenir la qualité broadcast mondiale.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-accent-400/10 p-3 rounded-lg shrink-0">
                  <HandHeart className="h-5 w-5 text-accent-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-cream">Impact Social</h4>
                  <p className="text-xs text-muted">Aide directe aux familles démunies.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Donation Card */}
          <div className="animate-fade-up glass-card p-8 rounded-xl shadow-2xl border border-white/10" style={{ animationDelay: '0.15s' }}>
            <h3 className="font-serif text-2xl font-semibold text-cream mb-6 text-center">
              Faire un Don
            </h3>

            {/* Amount buttons */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  className={`px-5 py-2.5 border rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                    selectedAmount === amt
                      ? 'border-accent-400 text-accent-400 bg-accent-400/10'
                      : 'border-white/20 text-muted hover:border-accent-400/50 hover:text-accent-400'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Frequency toggle */}
            <div className="mb-6">
              <label className="block font-semibold text-cream mb-2 text-sm opacity-70">Fréquence</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFrequency('once')}
                  className={`py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                    frequency === 'once'
                      ? 'bg-accent-400/15 text-accent-400 border border-accent-400/40'
                      : 'bg-white/5 text-muted border border-transparent'
                  }`}
                >
                  Une seule fois
                </button>
                <button
                  onClick={() => setFrequency('monthly')}
                  className={`py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                    frequency === 'monthly'
                      ? 'bg-accent-400/15 text-accent-400 border border-accent-400/40'
                      : 'bg-white/5 text-muted border border-transparent'
                  }`}
                >
                  Mensuel
                </button>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleWhatsAppDon}
              className="w-full py-3.5 bg-accent-400 text-white rounded-xl font-semibold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Heart className="h-4 w-4" />
              Contribuer maintenant
            </button>
            <p className="text-center text-[10px] text-muted opacity-50 uppercase tracking-widest mt-3">
              Paiement sécurisé via Mobile Money &amp; Virement
            </p>
          </div>
        </div>
      </section>

      {/* ── Impact Section ─────────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="animate-fade-up font-serif text-3xl md:text-4xl font-semibold text-center text-cream mb-12">
            Votre don <span className="gold-text">change des vies</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: 'Enseignement', desc: 'Financer les études bibliques, les matériaux et la formation des leaders.' },
              { icon: Users, title: 'Entraide', desc: "Soutenir les familles dans le besoin, les actions sociales et l'assistance communautaire." },
              { icon: Shield, title: 'Infrastructure', desc: "Contribuer à l'entretien et au développement des lieux de culte et extensions." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="animate-fade-up glass-card rounded-2xl p-6 text-center" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="w-12 h-12 rounded-xl bg-accent-400/10 border border-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-accent-400" />
                  </div>
                  <h3 className="text-base font-bold text-cream mb-2">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trust Badges ───────────────────────────────────────── */}
      <section className="py-10 px-4 md:px-8 border-t border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-400" />
            <span>Paiement Sécurisé</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent-400" />
            <span>Reçu Fiscal Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-accent-400" />
            <a href={`tel:${churchPhone.replace(/\s/g, '')}`} className="hover:text-cream transition-colors">{churchPhone}</a>
          </div>
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active={"home" as Page} />
    </div>
  );
}