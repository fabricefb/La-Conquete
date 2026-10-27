import { useDynamicTheme } from '../contexts/DynamicTheme';
import { useReveal } from '../lib/hooks';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { Mail, Phone, MapPin, Shield, ArrowLeft } from '../lib/icons';
import { CHURCH } from '../lib/church';
import type { Page } from '../lib/navigation';

interface ConfidentialitePageProps {
  onNavigate: (page: Page) => void;
}

const UPDATED = '27 octobre 2026';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Qui traite vos données',
    body: [
      `Le responsable du traitement est ${CHURCH.name}, ${CHURCH.address.full}.`,
      `Pour toute question relative à vos données personnelles, vous pouvez écrire à ${CHURCH.email} ou appeler le ${CHURCH.phone.display}.`,
    ],
  },
  {
    title: '2. Données que nous collectons',
    body: [
      'Lors de la création d’un compte : votre nom complet, votre numéro de téléphone (obligatoire), votre adresse email si vous choisissez de la renseigner, votre mot de passe, et, si vous le souhaitez, votre genre.',
      'Votre statut déclaré : visiteur, en découverte, ou membre de l’église.',
      'Votre activité sur le site : demandes pour rejoindre un département, demandes de prière, demandes de visite, messages envoyés au bureau pastoral, témoignages, réponses au questionnaire d’accueil et notifications reçues.',
      'Des données techniques limitées : date de dernière connexion, préférence de thème clair ou sombre, et installation de l’application sur votre téléphone.',
      'Nous ne collectons ni adresse postale, ni donnée bancaire, ni pièce d’identité, ni donnée de géolocalisation.',
    ],
  },
  {
    title: '3. Pourquoi nous les utilisons',
    body: [
      'Créer et sécuriser votre compte, vous permettre de vous connecter et de retrouver votre espace personnel.',
      'Gérer la vie de l’église : suivi des membres, demandes pour rejoindre un département, suivi pastoral des demandes de prière et de visite, réponses à vos messages.',
      'Vous informer des activités, cultes et annonces de l’église lorsque vous êtes inscrit.',
      'Nous n’utilisons jamais vos données à des fins publicitaires et ne les vendons à personne.',
    ],
  },
  {
    title: '4. Connexion avec Google',
    body: [
      'Si vous choisissez « Continuer avec Google », Google nous transmet votre nom, votre adresse email et votre photo de profil, uniquement pour créer ou ouvrir votre compte.',
      'Nous ne recevons jamais votre mot de passe Google et n’accédons à aucune autre donnée de votre compte Google (contacts, agenda, fichiers, messages).',
      'Vous pouvez continuer à utiliser le site avec seulement votre numéro de téléphone, sans passer par Google.',
    ],
  },
  {
    title: '5. Qui héberge vos données',
    body: [
      'La base de données et l’authentification sont hébergées par Supabase, sur une infrastructure sécurisée. Les mots de passe y sont enregistrés sous forme chiffrée et ne sont jamais lisibles, ni par l’église, ni par l’administrateur du site.',
      'Le site est hébergé par Cloudflare Pages. Les vidéos et publications restent hébergées par YouTube, Facebook et Instagram, et s’ouvrent sur leurs plateformes respectives.',
      'Seules les personnes habilitées de l’église (direction pastorale et administration) accèdent aux informations nécessaires à leur service, dans le cadre de leurs fonctions.',
    ],
  },
  {
    title: '6. Combien de temps nous les conservons',
    body: [
      'Vos données de compte sont conservées tant que votre compte existe.',
      'Les demandes de prière, de visite, de contact et de département sont conservées le temps nécessaire à leur traitement et au suivi pastoral.',
      'Vous pouvez demander la suppression de votre compte et de vos données à tout moment : elles sont alors effacées, sauf ce que la loi nous obligerait à conserver.',
    ],
  },
  {
    title: '7. Vos droits',
    body: [
      'Vous pouvez demander à consulter les données que nous détenons sur vous, les faire corriger, les faire supprimer, ou vous opposer à leur utilisation.',
      `Pour exercer ces droits, écrivez à ${CHURCH.email} ou appelez le ${CHURCH.phone.display}. Nous répondons dans les meilleurs délais.`,
      'Un membre peut aussi mettre à jour son nom, son téléphone et ses informations depuis son espace personnel.',
    ],
  },
  {
    title: '8. Cookies et stockage local',
    body: [
      'Le site n’utilise aucun cookie publicitaire et aucun outil de suivi commercial.',
      'Votre navigateur conserve uniquement ce qui est nécessaire au fonctionnement : votre session de connexion, votre préférence de thème et l’état d’installation de l’application. Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur ; vous serez alors simplement déconnecté.',
    ],
  },
  {
    title: '9. Mineurs',
    body: [
      'Si vous êtes mineur, demandez l’accord d’un parent ou d’un tuteur avant de créer un compte et de transmettre vos informations.',
    ],
  },
  {
    title: '10. Modifications',
    body: [
      `Cette politique peut être mise à jour pour suivre l’évolution du site. La date de dernière mise à jour est indiquée en haut de cette page.`,
      'En cas de changement important, une information est publiée sur le site.',
    ],
  },
];

export function ConfidentialitePage({ onNavigate }: ConfidentialitePageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  useReveal();

  return (
    <div className="min-h-screen bg-bg mobile-bottom-pad">
      <SiteHeader activePage="home" onNavigate={onNavigate} />
      <MobileNav active="home" onNavigate={onNavigate} />

      <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <button
            onClick={() => onNavigate('home')}
            className="mb-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-cream"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au site
          </button>

          <div className="reveal">
            <div className="flex h-14 w-14 items-center justify-center border border-line bg-bg-card">
              <Shield className="h-6 w-6 text-evangile-500" />
            </div>

            <p className="section-eyebrow mt-8">Vos données</p>
            <h1 className="section-title mt-4 text-[clamp(2rem,5vw,3rem)]">
              Politique de confidentialité
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              Ce site appartient à {CHURCH.name}, à {CHURCH.address.city} ({CHURCH.address.country}).
              Cette page explique simplement quelles informations sont enregistrées, pourquoi,
              et comment vous pouvez les faire corriger ou supprimer.
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted/70">
              Dernière mise à jour : {UPDATED}
            </p>
          </div>

          <div className="mt-12 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.title} className="reveal border-t border-line pt-8">
                <h2 className="font-serif text-xl font-semibold text-cream sm:text-2xl">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3">
                  {section.body.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted sm:text-[15px]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="reveal mt-12 border-t border-line pt-8">
            <h2 className="font-serif text-xl font-semibold text-cream sm:text-2xl">
              Nous contacter
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                href={`mailto:${CHURCH.email}`}
                className="flex items-start gap-3 border border-line bg-bg-card p-4 transition-colors hover:border-evangile-500/40"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Email</span>
                  <span className="mt-1 block break-all text-sm text-cream">{CHURCH.email}</span>
                </span>
              </a>
              <a
                href={CHURCH.phone.href}
                className="flex items-start gap-3 border border-line bg-bg-card p-4 transition-colors hover:border-evangile-500/40"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Téléphone</span>
                  <span className="mt-1 block text-sm text-cream">{CHURCH.phone.display}</span>
                </span>
              </a>
              <div className="flex items-start gap-3 border border-line bg-bg-card p-4 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Adresse</span>
                  <span className="mt-1 block text-sm text-cream">{CHURCH.address.full}</span>
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="footer-spacer" />
      <SiteFooter theme={colorMode} onToggleTheme={toggleColorMode} onNavigate={onNavigate} />
    </div>
  );
}
