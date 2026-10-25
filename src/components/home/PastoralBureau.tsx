import { ArrowRight } from '../../lib/icons';
import type { Page } from '../../lib/navigation';

export interface BureauPastor {
  id: string;
  full_name: string;
  title?: string;
  photo_url?: string;
  pastor_category?: string | null;
}

interface PastoralBureauProps {
  pastors: BureauPastor[];
  label: string;
  title: string;
  onNavigate: (page: Page) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getBadge(pastor: BureauPastor, isPrincipal: boolean): string {
  if (isPrincipal) return 'Pasteur principal';
  if (pastor.pastor_category === 'assistant_pastor') return 'Pasteur associé';
  const role = (pastor.title || '').toLowerCase();
  if (role.includes('co-fondatrice')) return 'Co-fondatrice';
  if (role.includes('associé')) return 'Pasteur associé';
  return pastor.title || 'Bureau pastoral';
}

interface PastorPortraitProps {
  pastor: BureauPastor;
  index: number;
  total: number;
  isPrincipal: boolean;
  className?: string;
  onNavigate: (page: Page) => void;
}

function PastorPortrait({ pastor, index, total, isPrincipal, className = '', onNavigate }: PastorPortraitProps) {
  const badge = getBadge(pastor, isPrincipal);

  return (
    <button
      type="button"
      onClick={() => onNavigate('pasteurs')}
      className={`group relative block w-full overflow-hidden text-left ${className}`}
      aria-label={`Voir la fiche de ${pastor.full_name}`}
    >
      {pastor.photo_url ? (
        <img
          src={pastor.photo_url}
          alt={pastor.full_name}
          className="photo-claro absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900 pb-16 sm:pb-0">
          <div className="grid-lines absolute inset-0 opacity-60" />
          <span className="font-hero text-[clamp(4rem,12vw,7rem)] leading-none text-white/20">
            {getInitials(pastor.full_name)}
          </span>
          <span className="absolute bottom-0 left-0 h-24 w-px bg-evangile-600/70" />
          <span className="absolute bottom-0 left-0 h-px w-24 bg-evangile-600/70" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-ink-950/5" />
      {isPrincipal && <span className="absolute inset-x-0 top-0 z-10 h-0.5 bg-evangile-600" />}

      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-5">
        <span className="whitespace-nowrap bg-evangile-600 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white sm:px-2.5 sm:tracking-[0.16em]">
          {badge}
        </span>
        <span className="hidden font-hero text-sm leading-none text-white/45 sm:inline">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
        <h3 className="person-name text-white">{pastor.full_name}</h3>
        {pastor.title && (
          <p className="person-role mt-1.5 text-[9px] tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.22em]">
            {pastor.title}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/0 transition-colors duration-300 group-hover:text-white/70 group-focus-visible:text-white/70">
          Voir la fiche
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

export function PastoralBureau({ pastors, label, title, onNavigate }: PastoralBureauProps) {
  const shown = pastors.slice(0, 3);
  if (shown.length === 0) return null;

  const principal = shown.find((p) => p.pastor_category === 'pastor_principal') ?? shown[0];
  const ordered = [principal, ...shown.filter((p) => p.id !== principal.id)];

  return (
    <section id="bureau-pastoral" className="border-t border-line bg-radial-primary py-12 md:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">{label}</p>
            </div>
            <h2 className="section-title mt-4" style={{ color: 'rgb(var(--text-rgb))' }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pasteurs')}
            className="btn-link -ml-2 self-start sm:self-auto"
          >
            Toute l'équipe
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-[1.32fr_1fr_1fr]">
          {ordered.map((pastor, i) => (
            <PastorPortrait
              key={pastor.id}
              pastor={pastor}
              index={i}
              total={ordered.length}
              isPrincipal={i === 0}
              className={
                i === 0
                  ? 'col-span-2 aspect-[4/5] sm:col-span-2 sm:aspect-[16/10] lg:col-span-1 lg:aspect-auto lg:h-[560px]'
                  : 'aspect-[3/4] lg:aspect-auto lg:h-[560px]'
              }
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
