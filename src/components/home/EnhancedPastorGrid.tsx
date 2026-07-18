import { Facebook, MonitorPlay, Mail } from '../../lib/icons';

interface Pastor {
  id: string;
  full_name: string;
  title?: string;
  photo_url?: string;
  bio?: string;
  pastor_category?: string | null;
  social_links?: Record<string, string>;
}

interface EnhancedPastorGridProps {
  pastors: Pastor[];
  columns?: number;
  showBio?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  ancien: 'Ancien',
  diacre: 'Diacre',
  collaborateur: 'Collaborateur',
  partenaire: 'Partenaire',
  assistant_pastor: 'Assistant pasteur',
  pastor_principal: 'Pasteur Principal',
};

const CATEGORY_COLORS: Record<string, string> = {
  pastor_principal: 'bg-amber-500/90 text-white',
  ancien: 'bg-blue-500/90 text-white',
  diacre: 'bg-purple-500/90 text-white',
  collaborateur: 'bg-green-500/90 text-white',
  assistant_pastor: 'bg-amber-500/90 text-white',
  partenaire: 'bg-cyan-500/90 text-white',
};

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EnhancedPastorGrid({ pastors, columns: _columns = 4, showBio = true }: EnhancedPastorGridProps) {
  const cols = _columns >= 1 && _columns <= 4 ? _columns : 4;
  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid grid-cols-1 gap-6 ${colClasses[cols] || colClasses[4]}`}>
      {pastors.map((pastor) => (
        <PastorCard key={pastor.id} pastor={pastor} showBio={showBio} />
      ))}
    </div>
  );
}

function PastorCard({ pastor, showBio = true }: { pastor: Pastor; showBio?: boolean }) {
  const initials = getInitials(pastor.full_name);
  const category = pastor.pastor_category ?? '';
  const categoryLabel = CATEGORY_LABELS[category] || category;
  const categoryColor = CATEGORY_COLORS[category] || 'bg-gray-500/90 text-white';

  const hasSocials =
    pastor.social_links &&
    Object.values(pastor.social_links).some((v) => v && v.trim() !== '');

  return (
    <div className="group relative aspect-[3/4] overflow-hidden">
      {/* Image or Initials fallback */}
      {pastor.photo_url ? (
        <img
          src={pastor.photo_url}
          alt={pastor.full_name}
          className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(227,34,31,0.25) 0%, rgba(15,33,71,0.85) 100%)',
          }}
        >
          <span
            className="font-serif text-4xl font-bold tracking-wider"
            style={{ color: 'rgb(var(--text-rgb) / 0.6)' }}
          >
            {initials}
          </span>
        </div>
      )}

      {/* Category badge */}
      {category && categoryLabel && (
        <div className="absolute left-3 right-3 top-3 z-10">
          <span
            className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${categoryColor}`}
          >
            {categoryLabel}
          </span>
        </div>
      )}

      {/* Bottom content — always visible (name + title) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <h3
          className="font-semibold text-lg leading-tight text-cream drop-shadow-lg"
        >
          {pastor.full_name}
        </h3>
        {pastor.title && (
          <p className="mt-0.5 text-sm text-cream/80 drop-shadow-md">{pastor.title}</p>
        )}
      </div>

      {/* Bio overlay — appears ONLY on hover, disappears on mouse leave */}
      {showBio && pastor.bio && (
        <div
          className="absolute inset-0 z-20 flex items-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(to top, rgba(6,13,29,0.95) 0%, rgba(6,13,29,0.85) 40%, rgba(6,13,29,0.6) 70%, transparent 100%)',
          }}
        >
          <div className="w-full">
            <h3 className="font-semibold text-lg leading-tight text-cream">
              {pastor.full_name}
            </h3>
            {pastor.title && (
              <p className="mt-0.5 text-sm text-cream/80">{pastor.title}</p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-cream/90 line-clamp-5">
              {pastor.bio}
            </p>

            {/* Social links inside bio overlay */}
            {hasSocials && (
              <div className="mt-4 flex gap-2">
                {pastor.social_links?.facebook && (
                  <a
                    href={pastor.social_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/10 border border-white/20 text-cream"
                    aria-label={`Facebook de ${pastor.full_name}`}
                  >
                    <Facebook className="h-3.5 w-3.5" />
                  </a>
                )}
                {pastor.social_links?.youtube && (
                  <a
                    href={pastor.social_links.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/10 border border-white/20 text-cream"
                    aria-label={`YouTube de ${pastor.full_name}`}
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                  </a>
                )}
                {pastor.social_links?.email && (
                  <a
                    href={`mailto:${pastor.social_links.email}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/10 border border-white/20 text-cream"
                    aria-label={`Email de ${pastor.full_name}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}