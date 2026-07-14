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

export function EnhancedPastorGrid({ pastors, columns: _columns = 4 }: EnhancedPastorGridProps) {
  const displayPastors = pastors.slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {displayPastors.map((pastor) => (
        <PastorCard key={pastor.id} pastor={pastor} />
      ))}
    </div>
  );
}

function PastorCard({ pastor }: { pastor: Pastor }) {
  const initials = getInitials(pastor.full_name);
  const category = pastor.pastor_category ?? '';
  const categoryLabel = CATEGORY_LABELS[category] || category;
  const categoryColor = CATEGORY_COLORS[category] || 'bg-gray-500/90 text-white';

  const hasSocials =
    pastor.social_links &&
    Object.values(pastor.social_links).some((v) => v && v.trim() !== '');

  return (
    <div
      className="group relative aspect-[3/4] overflow-hidden rounded-xl transition-all duration-300"
      style={{
        border: '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {/* Image or Initials fallback */}
      {pastor.photo_url ? (
        <img
          src={pastor.photo_url}
          alt={pastor.full_name}
          className="blog-img-zoom absolute inset-0 h-full w-full object-cover"
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

      {/* Gradient overlay */}
      <div className="pastor-overlay absolute inset-0" />

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

      {/* Bottom content — always visible */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <h3
          className="font-semibold text-lg leading-tight transition-transform duration-300 group-hover:-translate-y-1"
          style={{ color: 'rgb(var(--text-rgb))' }}
        >
          {pastor.full_name}
        </h3>
        {pastor.title && (
          <p className="text-muted mt-0.5 text-sm">{pastor.title}</p>
        )}

        {/* Bio — visible on hover */}
        {pastor.bio && (
          <p
            className="mt-2 line-clamp-2 text-xs leading-relaxed opacity-0 transition-all duration-300 group-hover:opacity-80"
            style={{ color: 'rgb(var(--text-muted-rgb))' }}
          >
            {pastor.bio}
          </p>
        )}

        {/* Social links — slide up on hover */}
        {hasSocials && (
          <div className="mt-3 flex gap-2 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {pastor.social_links?.facebook && (
              <a
                href={pastor.social_links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  background: 'rgb(var(--glass-bg-rgb) / 0.6)',
                  border: '1px solid rgb(var(--glass-border-rgb) / 0.3)',
                  color: 'rgb(var(--text-rgb))',
                }}
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
                className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  background: 'rgb(var(--glass-bg-rgb) / 0.6)',
                  border: '1px solid rgb(var(--glass-border-rgb) / 0.3)',
                  color: 'rgb(var(--text-rgb))',
                }}
                aria-label={`YouTube de ${pastor.full_name}`}
              >
                <MonitorPlay className="h-3.5 w-3.5" />
              </a>
            )}
            {pastor.social_links?.email && (
              <a
                href={`mailto:${pastor.social_links.email}`}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  background: 'rgb(var(--glass-bg-rgb) / 0.6)',
                  border: '1px solid rgb(var(--glass-border-rgb) / 0.3)',
                  color: 'rgb(var(--text-rgb))',
                }}
                aria-label={`Email de ${pastor.full_name}`}
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}