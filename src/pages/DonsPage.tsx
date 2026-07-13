import { useState, useEffect } from 'react';
import { db, buildSettingsMap } from '../lib/supabase';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Heart, CreditCard, Smartphone, MessageCircle, Phone, Mail, Copy, Check, ArrowRight, Shield, Users, BookOpen } from '../lib/icons';
import type { Page } from '../lib/navigation';

/* ─── Types ───────────────────────────────────────────────────────── */
interface DonsPageProps {
  onNavigate: (page: Page) => void;
}

interface DonOption {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  instructions: string[];
}

/* ─── Don options ─────────────────────────────────────────────────── */
const DON_OPTIONS: DonOption[] = [
  {
    id: 'mobile-money',
    title: 'Mobile Money',
    description: 'Envoyez votre don directement par Mobile Money',
    icon: Smartphone,
    color: 'from-green-500 to-emerald-600',
    instructions: [
      'Composez *126# ou ouvrez votre application Mobile Money',
      'Sélectionnez "Envoyer de l\'argent"',
      'Entrez le numéro du compte de l\'église',
      'Saisissez le montant de votre don',
      'Confirmez avec votre code PIN',
    ],
  },
  {
    id: 'virement',
    title: 'Virement bancaire',
    description: 'Effectuez un virement directement sur le compte bancaire',
    icon: CreditCard,
    color: 'from-blue-500 to-indigo-600',
    instructions: [
      'Rendez-vous dans votre agence bancaire',
      'Ou utilisez votre application bancaire',
      'Effectuez le virement sur le compte indiqué ci-dessous',
      'Mentionnez "Don La Conquête" dans le libellé',
    ],
  },
  {
    id: 'whatsapp',
    title: 'Contactez-nous',
    description: 'Écrivez-nous directement pour organiser votre don',
    icon: MessageCircle,
    color: 'from-emerald-500 to-green-600',
    instructions: [
      'Cliquez sur le bouton ci-dessous',
      'Envoyez-nous un message avec votre nom',
      'Nous vous guiderons pour les modalités de don',
    ],
  },
];

/* ─── Verse scripture ─────────────────────────────────────────────── */
const VERSES = [
  { ref: '2 Corinthiens 9:7', text: '"Que chacun donne comme il l\'a résolu dans son cœur, non avec tristesse ni par contrainte, car Dieu aime celui qui donne avec joie."' },
  { ref: 'Luc 6:38', text: '"Donnez, et il vous sera donné : on versera dans votre sein une bonne mesure, pressée, secouée et qui déborde."' },
  { ref: 'Malachie 3:10', text: '"Apportez toutes les dîmes à la maison du trésor... Mettez-moi ainsi à l\'épreuve, dit l\'Éternel des armées."' },
];

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */
export function DonsPage({ onNavigate }: DonsPageProps) {
  const { ref: r1, inView: v1 } = useReveal();
  const { ref: r2, inView: v2 } = useReveal();
  const { ref: r3, inView: v3 } = useReveal();
  const { theme, applyTheme } = useDynamicTheme();
  const [activeTab, setActiveTab] = useState(DON_OPTIONS[0].id);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');

  useEffect(() => { applyTheme('default'); }, [applyTheme]);

  // Load settings (phone, bank details, etc.)
  useEffect(() => {
    buildSettingsMap().then(s => setSettings(s || {})).catch(() => {});
  }, []);

  const churchPhone = settings['church_phone'] || '+243 000 000 000';
  const bankName = settings['bank_name'] || 'À configurer';
  const bankAccount = settings['bank_account'] || 'À configurer';
  const bankNumber = settings['bank_number'] || 'À configurer';
  const mobileMoneyNumber = settings['mobile_money'] || '+243 000 000 000';
  const whatsappNumber = settings['whatsapp'] || '243000000000';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    }).catch(() => {});
  };

  const activeOption = DON_OPTIONS.find(o => o.id === activeTab) || DON_OPTIONS[0];

  const handleWhatsAppDon = () => {
    const msg = encodeURIComponent('Bonjour, je souhaite faire un don à l\'Église Évangélique La Conquête. Pourriez-vous me donner les informations de paiement ?');
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader onNavigate={onNavigate} activePage="dons" theme={theme} onToggleTheme={() => applyTheme(theme === 'dark' ? 'light' : 'dark')} />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        <div className="bg-radial-gold absolute inset-0 pointer-events-none" />
        <div className="mx-auto max-w-3xl text-center relative">
          <div className={`reveal ${v1 ? 'in' : ''} ${v1 ? 'animate-fade-up' : ''}`}>
            <span className="section-label mb-4 inline-flex">Soutenir l'œuvre</span>
            <h1 className="text-headline-lg mt-4 mb-6">
              <span className="gold-text">Faire un don</span>
            </h1>
            <p className="text-body-lg text-muted max-w-xl mx-auto leading-relaxed">
              Votre générosité permet à l'église de poursuivre sa mission d'enseignement,
              d'entraide communautaire et d'évangélisation. Chaque don compte.
            </p>
          </div>
        </div>
      </section>

      {/* ── Scripture ──────────────────────────────────────────── */}
      <section className="py-8 px-4">
        <div ref={r1} className={`mx-auto max-w-2xl text-center reveal ${v1 ? 'in' : ''}`}>
          <div className="glass-card rounded-2xl p-8">
            <p className="text-sm text-muted italic leading-relaxed mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px' }}>
              {VERSES[0].text}
            </p>
            <p className="text-xs font-semibold text-gold-500 tracking-wider uppercase">
              — {VERSES[0].ref}
            </p>
          </div>
        </div>
      </section>

      {/* ── Don Options Tabs ──────────────────────────────────── */}
      <section className="py-12 px-4" ref={r2}>
        <div className={`mx-auto max-w-5xl reveal ${v2 ? 'in' : ''}`}>
          <h2 className="text-headline-md text-center mb-10">
            Choisissez votre <span className="gold-text">méthode de don</span>
          </h2>

          {/* Tab buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10 justify-center">
            {DON_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = activeTab === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setActiveTab(opt.id)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'border-gold-400/50 bg-gold-400/5 shadow-lg shadow-gold-500/10'
                      : 'border-line hover:border-gold-400/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? 'text-cream' : 'text-muted'}`}>
                      {opt.title}
                    </p>
                    <p className="text-xs text-muted/70 mt-0.5 hidden sm:block">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="glass-card rounded-2xl p-8 sm:p-10">
            {activeTab === 'mobile-money' && (
              <div className="grid sm:grid-cols-2 gap-10">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-cream">Mobile Money</h3>
                      <p className="text-xs text-muted">Paiement rapide et sécurisé</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    {activeOption.instructions.map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-gold-500/10 text-gold-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-muted leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/[0.03] border border-line rounded-xl p-4">
                    <p className="text-xs text-muted mb-2 font-medium">Numéro Mobile Money</p>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-cream flex-1">{mobileMoneyNumber}</p>
                      <button
                        onClick={() => copyToClipboard(mobileMoneyNumber, 'mm')}
                        className="w-9 h-9 rounded-lg border border-line flex items-center justify-center text-muted hover:text-gold-400 hover:border-gold-400/40 transition-colors cursor-pointer"
                      >
                        {copied === 'mm' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-2">Nom du bénéficiaire : <span className="text-cream font-medium">Église Évangélique La Conquête</span></p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center">
                  <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 flex items-center justify-center mb-6">
                    <Smartphone className="w-20 h-20 text-green-400/40" />
                  </div>
                  <p className="text-sm text-muted text-center">Disponible 24h/24, 7j/7</p>
                </div>
              </div>
            )}

            {activeTab === 'virement' && (
              <div className="grid sm:grid-cols-2 gap-10">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-cream">Virement bancaire</h3>
                      <p className="text-xs text-muted">Transfert direct sur le compte</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/[0.03] border border-line rounded-xl p-4">
                      <p className="text-xs text-muted mb-1">Banque</p>
                      <p className="text-sm font-bold text-cream">{bankName}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-line rounded-xl p-4">
                      <p className="text-xs text-muted mb-1">Titulaire du compte</p>
                      <p className="text-sm font-bold text-cream">{bankAccount}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-line rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted mb-1">Numéro de compte</p>
                          <p className="text-sm font-bold text-cream">{bankNumber}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(bankNumber, 'bank')}
                          className="w-9 h-9 rounded-lg border border-line flex items-center justify-center text-muted hover:text-gold-400 hover:border-gold-400/40 transition-colors cursor-pointer"
                        >
                          {copied === 'bank' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-gold-500/5 border border-gold-400/20">
                    <p className="text-xs text-muted">
                      <strong className="text-gold-400">Important :</strong> Mentionnez "Don La Conquête" dans le libellé du virement afin que nous puissions identifier votre don.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center">
                  <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center mb-6">
                    <CreditCard className="w-20 h-20 text-blue-400/40" />
                  </div>
                  <p className="text-sm text-muted text-center">Pour les dons importants</p>
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-emerald-400/60" />
                </div>
                <h3 className="text-lg font-bold text-cream mb-2">Écrivez-nous sur WhatsApp</h3>
                <p className="text-sm text-muted max-w-md mx-auto mb-8 leading-relaxed">
                  Envoyez-nous un message et nous vous guiderons personnellement pour les modalités de votre don.
                  Nous sommes disponibles pour répondre à toutes vos questions.
                </p>
                <button
                  onClick={handleWhatsAppDon}
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl px-8 py-4 text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contacter sur WhatsApp
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted">
                  <a href={`tel:${churchPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-cream transition-colors">
                    <Phone className="w-4 h-4" /> {churchPhone}
                  </a>
                  <a href={`mailto:info@laconquete.cd`} className="flex items-center gap-2 hover:text-cream transition-colors">
                    <Mail className="w-4 h-4" /> info@laconquete.cd
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Impact Section ─────────────────────────────────────── */}
      <section className="py-16 px-4" ref={r3}>
        <div className={`mx-auto max-w-5xl reveal ${v3 ? 'in' : ''}`}>
          <h2 className="text-headline-md text-center mb-12">
            Votre don <span className="gold-text">change des vies</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: 'Enseignement', desc: 'Financer les études bibliques, les matériaux et la formation des leaders.' },
              { icon: Users, title: 'Entraide', desc: 'Soutenir les familles dans le besoin, les actions sociales et l\'assistance communautaire.' },
              { icon: Shield, title: 'Infrastructure', desc: 'Contribuer à l\'entretien et au développement des lieux de culte et extensions.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="glass-card rounded-2xl p-6 text-center card-parallax">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-gold-400" />
                  </div>
                  <h3 className="text-base font-bold text-cream mb-2">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Additional Verses ──────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {VERSES.slice(1).map((v, i) => (
            <div key={i} className="glass-card rounded-xl p-6 text-center">
              <p className="text-sm text-muted italic leading-relaxed mb-1.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}>
                {v.text}
              </p>
              <p className="text-xs font-semibold text-gold-500 tracking-wider uppercase">— {v.ref}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} activePage="dons" />
    </div>
  );
}