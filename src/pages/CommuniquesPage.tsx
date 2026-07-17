import { FileText, ArrowRight } from '../lib/icons';
import { IconBox } from '../components/IconBox';
import { UniversalHero } from '../components/UniversalHero';
import type { Page } from '../lib/navigation';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';

interface CommuniquesPageProps {
  onNavigate: (page: Page) => void;
  openAuth?: (view?: 'login' | 'signup') => void;
}

const COMMUNIQUES = [
  {
    id: '1',
    title: 'Retraite spirituelle annuelle 2026',
    date: '2026-07-15',
    excerpt: 'L\'église organise sa retraite spirituelle annuelle du 25 au 27 juillet 2026. Tous les membres sont invités à s\'inscrire auprès du secrétariat.',
    category: 'Événement',
  },
  {
    id: '2',
    title: 'Nouveau programme de formation biblique',
    date: '2026-07-10',
    excerpt: 'L\'école biblique La Conquête lance un nouveau cycle de formation en théologie pratique. Les cours débuteront en septembre 2026.',
    category: 'Formation',
  },
  {
    id: '3',
    title: 'Campaign d\'évangélisation quartier Matonge',
    date: '2026-07-05',
    excerpt: 'Une grande campagne d\'évangélisation est prévue dans le quartier Matonge du 10 au 12 août. Bénévoles et pasteurs sont appelés à participer.',
    category: 'Évangélisation',
  },
];

export function CommuniquesPage({ onNavigate }: CommuniquesPageProps) {
  return (
    <>
      <SiteHeader onNavigate={onNavigate} />
      <MobileNav onNavigate={onNavigate} active="communiques" />
    <div className="min-h-screen bg-bg">
      <UniversalHero pageKey="communiques" defaultBadge="Informations officielles" defaultTitle="Nos Communiqués" defaultSubtitle="Les annonces et communications officielles de l'Église Évangélique La Conquête." />

      <section className="mx-auto max-w-3xl px-4 pb-24">
        <div className="space-y-4">
          {COMMUNIQUES.map(c => (
            <div key={c.id} className="glass rounded-2xl p-6 transition-all duration-300 hover:bg-white/5 group cursor-pointer">
              <div className="flex items-start gap-4">
                <IconBox pageKey="communiques" elementId="filetext-icon" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evangile-600/10">
                  <FileText className="h-5 w-5 text-evangile-600" />
                </IconBox>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-evangile-600">{c.category}</span>
                    <span className="text-xs text-muted">{new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-cream group-hover:text-evangile-400 transition-colors">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{c.excerpt}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted group-hover:text-evangile-500 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
      <SiteFooter />
    </>
  );
}