import { useEffect, useMemo, useState } from 'react';
import { diffCountdown, getNextService, type UpcomingSpecial } from '../../lib/services';

/* ═══════════════════════════════════════════════════════════════════════
   COMPTE À REBOURS — prochain culte
   Registre institutionnel : chiffres Bebas géants en rouge dans des
   cadres d'angle droit séparés par un filet.
   ─────────────────────────────────────────────────────────────────────── */

const UNITS: Array<{ key: 'days' | 'hours' | 'minutes' | 'seconds'; label: string }> = [
  { key: 'days', label: 'Jours' },
  { key: 'hours', label: 'Heures' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Secondes' },
];

const pad = (n: number) => String(n).padStart(2, '0');

export function ServiceCountdown({
  className = '',
  special = null,
}: {
  className?: string;
  /** Culte spécial programmé : remplace le programme hebdomadaire du hero. */
  special?: UpcomingSpecial | null;
}) {
  const target = useMemo(() => {
    if (special && special.at.getTime() > Date.now()) {
      return {
        eyebrow: special.label,
        detail: special.detail,
        at: special.at,
        isSpecial: true,
      };
    }
    const next = getNextService();
    return {
      eyebrow: 'Prochain culte',
      detail: `${next.day} · ${next.service} · ${next.time}`,
      at: next.at,
      isSpecial: false,
    };
  }, [special]);

  const [left, setLeft] = useState(() => diffCountdown(target.at));

  useEffect(() => {
    const id = window.setInterval(() => setLeft(diffCountdown(target.at)), 1000);
    return () => window.clearInterval(id);
  }, [target.at]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="section-eyebrow">{target.eyebrow}</p>
        <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-muted">
          {target.detail}
        </p>
      </div>

      <div className="mt-3 grid max-w-md grid-cols-4 border border-line">
        {UNITS.map(({ key, label }, i) => (
          <div
            key={key}
            className={`flex flex-col items-center py-3 sm:py-3.5 ${i > 0 ? 'border-l border-line' : ''}`}
          >
            <span className="countdown-figure tabular-nums">{pad(left[key])}</span>
            <span className="countdown-unit mt-1.5">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
