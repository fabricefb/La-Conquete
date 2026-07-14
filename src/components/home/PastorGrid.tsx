/* ═══════════════════════════════════════════════════════════════════
   PastorGrid.tsx
   Grille de l'équipe pastorale avec overlay animé au survol.
   Style inspiré du template Master-Lawyer.
   ═══════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import type { Pastor } from '../../types';

interface PastorGridProps {
  pastors: Pastor[];
  columns?: number;
}

export function PastorGrid({ pastors, columns = 4 }: PastorGridProps) {
  if (pastors.length === 0) return null;

  /* Grille responsive : 1 col mobile, 2 tablette, columns desktop */
  const gridCols: Record<number, string> = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-6 grid-cols-1 ${gridCols[columns] || 'md:grid-cols-2 lg:grid-cols-4'}`}>
      {pastors.map((pastor) => (
        <PastorCard key={pastor.id} pastor={pastor} />
      ))}
    </div>
  );
}

/* ─── Carte pasteur individuelle ───────────────────────────────── */
function PastorCard({ pastor }: { pastor: Pastor }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Photo */}
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={pastor.photo_url}
          alt={pastor.name}
          className={`h-full w-full object-cover transition-transform duration-700 ${
            isHovered ? 'scale-110' : 'scale-100'
          }`}
        />
      </div>

      {/* Gradient permanent en bas */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Nom permanent en bas */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
        <p className="font-serif text-lg font-semibold text-white leading-tight">
          {pastor.name}
        </p>
        <p className="text-xs font-medium text-gold-300 mt-0.5">
          {pastor.role}
        </p>
      </div>

      {/* Overlay animé au survol — Master-Lawyer style */}
      <div
        className={`absolute inset-0 flex flex-col justify-center p-6 transition-all duration-500 ${
          isHovered
            ? 'opacity-100 bg-ink-900/95'
            : 'opacity-0 bg-transparent'
        }`}
      >
        {/* Nom en haut de l'overlay */}
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-2">
          {pastor.role}
        </p>
        <h3 className="font-serif text-2xl font-bold text-white mb-4">
          {pastor.name}
        </h3>

        {/* Séparateur doré */}
        <div className="w-12 h-0.5 bg-gold-400/60 mb-4" />

        {/* Bio */}
        <p className="text-sm leading-relaxed text-cream/80 line-clamp-5">
          {pastor.bio || pastor.thought || 'Serviteur de Dieu dévoué au service de la communauté.'}
        </p>

        {/* Citation personnelle si disponible */}
        {pastor.thought && pastor.bio && (
          <blockquote className="mt-4 border-l-2 border-gold-400/40 pl-3">
            <p className="text-xs italic text-cream/60 leading-relaxed">
              « {pastor.thought} »
            </p>
          </blockquote>
        )}

        {/* Bouton découverte */}
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-gold-400 transition-all group-hover:gap-3">
            En savoir plus
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}