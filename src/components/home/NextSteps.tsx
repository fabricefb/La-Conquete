import { ArrowRight } from '../../lib/icons';
import type { Page } from '../../lib/navigation';

interface NextStepsProps {
  onNavigate: (page: Page) => void;
  onOpenAuth: (view?: 'login' | 'signup') => void;
}

interface Step {
  num: string;
  title: string;
  description: string;
  onAction: () => void;
  secondary?: { label: string; onAction: () => void };
}

export function NextSteps({ onNavigate, onOpenAuth }: NextStepsProps) {
  const steps: Step[] = [
    {
      num: '01',
      title: 'Devenir membre',
      description: "Faites le pas pour vous enraciner dans la vie de l'église.",
      onAction: () => onOpenAuth('signup'),
      secondary: { label: 'Je suis déjà membre', onAction: () => onOpenAuth('login') },
    },
    {
      num: '02',
      title: 'Demande de prière',
      description: 'Partagez vos sujets de prière avec notre équipe.',
      onAction: () => onNavigate('contact'),
    },
    {
      num: '03',
      title: 'Nos programmes spéciaux',
      description: 'Notre conférence et autres.',
      onAction: () => onNavigate('events'),
    },
  ];

  return (
    <section aria-label="Votre prochain pas" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">Passer à l'action</p>
            </div>
            <h2 className="section-title mt-4">Votre prochain pas</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted lg:text-right">
            Trois manières de nous rejoindre, de confier un sujet de prière ou de découvrir ce que nous préparons.
          </p>
        </div>

        <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
          {steps.map(({ num, title, description, onAction, secondary }) => (
            <article
              key={num}
              className="group relative flex h-full flex-col bg-bg p-6 transition-colors duration-300 hover:bg-bg-card sm:p-8"
            >
              <span className="font-hero text-5xl leading-none text-evangile-600/35">{num}</span>
              <span className="mt-5 h-px w-10 bg-evangile-600" />
              <h3 className="card-title mt-5">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{description}</p>

              <div className="mt-7 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={onAction}
                  className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-evangile-500 transition-colors hover:text-evangile-400"
                >
                  En savoir plus
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <div className="mt-3 min-h-[1.25rem]">
                  {secondary && (
                    <button
                      type="button"
                      onClick={secondary.onAction}
                      className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-cream"
                    >
                      {secondary.label}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
