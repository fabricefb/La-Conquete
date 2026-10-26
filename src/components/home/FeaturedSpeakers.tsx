import { useReveal } from '../../lib/hooks';
import { ArrowRight, Mic } from '../../lib/icons';
import { imageSrcSet } from '../../lib/images';
import type { Page } from '../../lib/navigation';

export interface FeaturedSpeaker {
  id: number;
  image: string;
  name: string;
  role: string;
  text: string;
}

interface FeaturedSpeakersProps {
  speakers: FeaturedSpeaker[];
  label: string;
  title: string;
  description: string;
  onNavigate: (page: Page) => void;
}

function RevealBlock({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function FeaturedSpeakers({
  speakers,
  label,
  title,
  description,
  onNavigate,
}: FeaturedSpeakersProps) {
  const gridClass =
    speakers.length === 1
      ? 'lg:grid-cols-1'
      : speakers.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section id="orateurs" className="border-y border-line bg-bg-card px-4 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <RevealBlock className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">{label}</p>
            </div>
            <h2 className="section-title mt-4">{title}</h2>
            {description && (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          <button type="button" onClick={() => onNavigate('pasteurs')} className="btn-link shrink-0">
            Le bureau pastoral
            <ArrowRight className="h-4 w-4" />
          </button>
        </RevealBlock>

        <div className={`mt-10 grid gap-px bg-line ${gridClass}`}>
          {speakers.map((speaker, index) => (
            <RevealBlock key={speaker.id} className={`reveal-delay-${(index % 4) + 1}`}>
              <article className="group relative h-full min-h-[460px] overflow-hidden bg-ink-950 sm:min-h-[540px]">
                <img
                  src={speaker.image}
                  srcSet={imageSrcSet(speaker.image)}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  alt={speaker.name}
                  className="photo-claro photo-hover-clear absolute inset-0 h-full w-full object-cover object-top transition-[transform,filter] duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950/25 via-transparent to-transparent" />
                <div className="grid-lines absolute inset-0 opacity-25" />

                <div className="absolute left-0 top-0 flex items-center gap-2.5 border-b border-r border-white/15 bg-ink-950/60 px-4 py-2.5 backdrop-blur-sm">
                  <Mic className="h-3.5 w-3.5 text-evangile-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/70">
                    Orateur {String(index + 1).padStart(2, '0')}
                  </p>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <span className="block h-px w-10 bg-evangile-500" />
                  <h3 className="mt-4 font-hero text-3xl uppercase leading-[0.95] text-white sm:text-4xl">
                    {speaker.name}
                  </h3>
                  {speaker.role && (
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-evangile-400">
                      {speaker.role}
                    </p>
                  )}
                  {speaker.text && (
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
                      {speaker.text}
                    </p>
                  )}
                </div>
              </article>
            </RevealBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
