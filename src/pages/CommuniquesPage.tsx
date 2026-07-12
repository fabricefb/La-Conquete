import { FileText, ArrowRight } from '../lib/icons';
import type { Page } from '../lib/navigation';

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

export function CommuniquesPage() {
  return (
    <div className="min-h-screen bg-bg pt-16">
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-radial-gold" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="section-label">Informations officielles</span>
          <h1 className="mt-6 text-4xl font-bold text-cream sm:text-5xl">
            Nos <span className="gold-text">Communiqués</span>
          </h1>
          <p className="mt-4 text-muted max-w-2xl mx-auto leading-relaxed">
            Les annonces et communications officielles de l'Église Évangélique La Conquête.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24">
        <div className="space-y-4">
          {COMMUNIQUES.map(c => (
            <div key={c.id} className="glass rounded-2xl p-6 transition-all duration-300 hover:bg-white/5 group cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10">
                  <FileText className="h-5 w-5 text-gold-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gold-500">{c.category}</span>
                    <span className="text-xs text-muted">{new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-cream group-hover:text-gold-300 transition-colors">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{c.excerpt}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted group-hover:text-gold-400 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}