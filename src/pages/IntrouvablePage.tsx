import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useReveal } from '../lib/hooks';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { ArrowLeft, Home, Lock, Mail } from '../lib/icons';
import { CHURCH } from '../lib/church';
import type { Page } from '../lib/navigation';

interface IntrouvablePageProps {
  onNavigate: (page: Page) => void;
}

/* Réponse volontairement neutre : l'adresse #admin ne doit révéler ni
   l'existence ni l'adresse réelle du back-office. */
export function IntrouvablePage({ onNavigate }: IntrouvablePageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  useReveal();

  return (
    <div className="min-h-screen bg-bg mobile-bottom-pad">
      <SiteHeader activePage="home" onNavigate={onNavigate} />
      <MobileNav active="home" onNavigate={onNavigate} />

      <main className="flex min-h-[70vh] items-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="reveal mx-auto w-full max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-line bg-bg-card">
            <Lock className="h-7 w-7 text-evangile-500" />
          </div>

          <p className="section-eyebrow mt-8">Erreur 404</p>
          <h1 className="section-title mt-4 text-[clamp(2rem,5vw,3.2rem)]">
            Cette page n’existe pas
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            L’adresse demandée est introuvable. Veuillez contacter l’administrateur
            du site si vous pensez qu’il s’agit d’une erreur.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => onNavigate('home')} className="btn-primary">
              <Home className="h-4 w-4" />
              Retour à l’accueil
            </button>
            <a href={`mailto:${CHURCH.email}`} className="btn-ghost">
              <Mail className="h-4 w-4" />
              Contacter l’administrateur
            </a>
          </div>

          <button
            onClick={() => onNavigate('contact')}
            className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-cream"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Aller à la page Contact
          </button>
        </div>
      </main>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
