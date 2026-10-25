import type { ReactNode } from 'react';
import { ArrowRight, Play, Youtube } from '../../lib/icons';
import { RECENT_TEACHINGS, YOUTUBE_CHANNEL, type Teaching } from '../../lib/teachings';
import type { Page } from '../../lib/navigation';

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function WatchLink({ item, className, children }: { item: Teaching; className: string; children: ReactNode }) {
  return (
    <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function RecentTeachings({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [featured, ...rest] = RECENT_TEACHINGS;
  if (!featured) return null;

  return (
    <section aria-label="Messages récents" className="border-y border-line bg-bg-card py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">Enseignements</p>
            </div>
            <h2 className="section-title mt-4">Messages récents</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Retrouvez les prédications, méditations et enseignements de nos cultes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
            <a
              href={YOUTUBE_CHANNEL.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link shrink-0"
            >
              <Youtube className="h-4 w-4" />
              {YOUTUBE_CHANNEL.handle}
            </a>
            <button
              type="button"
              onClick={() => onNavigate('enseignements')}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap border border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors duration-200 hover:border-evangile-600/60 hover:text-evangile-400"
            >
              Tous les enseignements
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:h-[31rem] lg:grid-cols-12">
          <WatchLink
            item={featured}
            className="group flex h-full flex-col border border-line bg-bg transition-colors hover:border-white/25 lg:col-span-7"
          >
            <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-0 lg:flex-1">
              <img
                src={featured.thumbnail}
                alt=""
                className="photo-claro-strong h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-transparent" />

              <span className="absolute left-0 top-0 inline-flex items-center gap-1.5 bg-evangile-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                <Youtube className="h-3.5 w-3.5" />
                YouTube
              </span>

              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center border border-white/40 bg-ink-950/50 text-white transition-colors group-hover:border-white group-hover:bg-ink-950/75">
                  <Play className="ml-0.5 h-6 w-6" />
                </span>
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <span className="h-1.5 w-1.5 bg-evangile-600" />
                <span>{formatDate(featured.publishedAt)}</span>
              </div>
              <h3 className="mt-3 font-hero text-3xl uppercase leading-[0.95] text-cream transition-colors group-hover:text-evangile-400 sm:text-4xl">
                {featured.title}
              </h3>
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="text-xs text-muted">{YOUTUBE_CHANNEL.label}</p>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-evangile-500">
                  Regarder
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </WatchLink>

          <div className="flex flex-col gap-px border border-line bg-line lg:col-span-5">
            {rest.map((item) => (
              <WatchLink
                key={item.id}
                item={item}
                className="group grid flex-1 grid-cols-[6.5rem_1fr] gap-4 bg-bg p-3 transition-colors hover:bg-bg-card-hover"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-ink-950/35">
                    <Play className="h-4 w-4 text-white" />
                  </span>
                </div>

                <div className="flex min-w-0 flex-col justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {formatDate(item.publishedAt)}
                  </p>
                  <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-cream transition-colors group-hover:text-evangile-400">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-[11px] text-muted">{YOUTUBE_CHANNEL.label}</p>
                </div>
              </WatchLink>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
