import { Bell, ArrowRight } from '../lib/icons';
import type { Page } from '../lib/navigation';

interface AnnoncesPageProps {
  onNavigate: (page: Page) => void;
  openAuth?: (view?: 'login' | 'signup') => void;
}

const ANNONCES = [
  {
    id: '1',
    title: 'Inscription à l\'école du dimanche',
    date: '2026-07-12',
    content: 'Les inscriptions pour la nouvelle session de l\'école du dimanche sont ouvertes. Parents, veuillez inscrire vos enfants au secrétariat avant le 20 juillet.',
    urgent: false,
  },
  {
    id: '2',
    title: 'Culte spécial de Thanksgiving',
    date: '2026-07-11',
    content: 'Un culte spécial de Thanksgiving aura lieu ce dimanche à 10h. Tous les membres sont invités à venir avec un plat pour le repas de partage après le culte.',
    urgent: true,
  },
  {
    id: '3',
    title: 'Collecte pour les familles nécessiteuses',
    date: '2026-07-08',
    content: 'La commission d\'aide sociale lance une collecte de vêtements et de vivres pour les familles en difficulté. Dépôts à la sacristie après chaque culte.',
    urgent: false,
  },
  {
    id: '4',
    title: 'Réunion de prière exceptionnelle',
    date: '2026-07-06',
    content: 'Une réunion de prière exceptionnelle est organisée ce mercredi à 18h pour intercéder pour la nation et les familles de l\'église.',
    urgent: true,
  },
];

export function AnnoncesPage() {
  return (
    <div className="min-h-screen bg-bg pt-16">
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-radial-primary" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="section-label">Restez informé</span>
          <h1 className="mt-6 text-4xl font-bold text-cream sm:text-5xl">
            <span className="gold-text">Annonces</span>
          </h1>
          <p className="mt-4 text-muted max-w-2xl mx-auto leading-relaxed">
            Les dernières annonces et informations importantes de la vie de l'église.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24">
        <div className="space-y-4">
          {ANNONCES.map(a => (
            <div key={a.id} className={`glass rounded-2xl p-6 transition-all duration-300 hover:bg-white/5 group cursor-pointer ${a.urgent ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.urgent ? 'bg-red-500/15' : 'bg-evangile-600/10'}`}>
                  <Bell className={`h-5 w-5 ${a.urgent ? 'text-red-400' : 'text-evangile-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {a.urgent && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wider">Urgent</span>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-cream group-hover:text-evangile-400 transition-colors">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{a.content}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted group-hover:text-evangile-500 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}