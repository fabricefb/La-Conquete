import { useEffect, useMemo, useState } from 'react';
import { diffCountdown, getNextService } from '../../lib/services';

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

export function ServiceCountdown({ className = '' }: { className?: string }) {
  const next = useMemo(() => getNextService(), []);
  const [left, setLeft] = useState(() => diffCountdown(next.at));

  useEffect(() => {
    const id = window.setInterval(() => setLeft(diffCountdown(next.at)), 1000);
    return () => window.clearInterval(id);
  }, [next.at]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="section-eyebrow">Prochain culte</p>
        <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-muted">
          {next.day} · {next.service} · {next.time}
        </p>
      </div>

      <div className="mt-4 grid max-w-lg grid-cols-4 border border-line">
        {UNITS.map(({ key, label }, i) => (
          <div
            key={key}
            className={`flex flex-col items-center py-4 sm:py-5 ${i > 0 ? 'border-l border-line' : ''}`}
          >
            <span className="countdown-figure tabular-nums">{pad(left[key])}</span>
            <span className="countdown-unit mt-2">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
