import { useState } from 'react';
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
  tag?: string;
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
  const [activeId, setActiveId] = useState<number | null>(null);
  const toggle = (id: number) => setActiveId((cur) => (cur === id ? null : id));

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

        <RevealBlock className="mt-10">
          <div className="flex flex-col gap-px bg-line sm:h-[440px] sm:flex-row">
            {speakers.map((speaker, index) => {
              const active = activeId === speaker.id;
              return (
                <div
                  key={speaker.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={active}
                  aria-label={`${speaker.name}${speaker.role ? ` — ${speaker.role}` : ''}`}
                  onClick={() => toggle(speaker.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(speaker.id);
                    }
                  }}
                  className={`group relative flex min-h-[340px] cursor-pointer flex-col justify-end overflow-hidden bg-ink-950 outline-none transition-[flex-grow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-evangile-500 sm:min-h-0 sm:basis-0 sm:grow ${
                    active ? 'sm:grow-[2.8]' : ''
                  }`}
                >
                  <img
                    src={speaker.image}
                    srcSet={imageSrcSet(speaker.image)}
                    sizes="(min-width: 640px) 30vw, 100vw"
                    alt={speaker.name}
                    className="photo-claro photo-hover-clear absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" />
                  <div className="grid-lines absolute inset-0 opacity-25" />

                  <div className="absolute left-0 top-0 z-10 flex items-center gap-2.5 border-b border-r border-white/15 bg-ink-950/60 px-3.5 py-2 backdrop-blur-sm">
                    <Mic className="h-3.5 w-3.5 text-evangile-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
                      {speaker.tag ?? `Orateur ${index + 1}`}
                    </p>
                  </div>

                  <div className="relative z-10 p-5 sm:p-6">
                    <span className="block h-px w-8 bg-evangile-500" />
                    <h3
                      className={`mt-3 font-hero text-2xl uppercase leading-[0.95] text-white transition-transform duration-500 sm:text-[1.7rem] ${
                        active ? '-translate-y-1.5 sm:group-hover:-translate-y-2' : 'sm:group-hover:-translate-y-2'
                      }`}
                    >
                      {speaker.name}
                    </h3>
                    {speaker.role && (
                      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-evangile-400">
                        {speaker.role}
                      </p>
                    )}
                    {speaker.text && (
                      <p
                        className={`mt-3 max-w-md text-sm leading-relaxed text-white/85 transition-all duration-500 ${
                          active
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-3 opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100'
                        }`}
                      >
                        {speaker.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </RevealBlock>
      </div>
    </section>
  );
}
