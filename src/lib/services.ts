/* ═══════════════════════════════════════════════════════════════════════
   HORAIRES DES CULTES — source unique
   Le compte à rebours de l'accueil et la page Contact lisent ce tableau :
   ils ne peuvent plus se contredire.
   ─────────────────────────────────────────────────────────────────────── */

export interface ServiceTime {
  /** Nom du jour, tel qu'affiché. */
  day: string;
  /** 0 = dimanche … 6 = samedi, convention Date.getDay(). */
  weekday: number;
  service: string;
  /** Plage lisible, telle qu'affichée. */
  time: string;
  /** Heure de début au format 24h « HH:MM », locale. */
  start: string;
}

export const SERVICE_TIMES: readonly ServiceTime[] = [
  { day: 'Dimanche', weekday: 0, service: 'Culte Principal', time: '10h00 – 13h00', start: '10:00' },
  { day: 'Mardi', weekday: 2, service: 'Étude Biblique', time: '19h00 – 21h00', start: '19:00' },
  { day: 'Jeudi', weekday: 4, service: 'Intercession', time: '18h30 – 20h30', start: '18:30' },
  { day: 'Vendredi', weekday: 5, service: "Veillée d'Adoration", time: '22h00 – 02h00', start: '22:00' },
] as const;

export interface NextService extends ServiceTime {
  at: Date;
}

/** Prochaine occurrence d'un culte à partir de `from` (inclusive). */
export function getNextService(from: Date = new Date()): NextService {
  let best: NextService | null = null;

  for (const s of SERVICE_TIMES) {
    const [h, m] = s.start.split(':').map(Number);
    const candidate = new Date(from);
    candidate.setHours(h, m, 0, 0);
    candidate.setDate(candidate.getDate() + ((s.weekday - candidate.getDay() + 7) % 7));
    if (candidate.getTime() < from.getTime()) candidate.setDate(candidate.getDate() + 7);
    if (!best || candidate.getTime() < best.at.getTime()) best = { ...s, at: candidate };
  }

  return best as NextService;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function diffCountdown(target: Date, from: Date = new Date()): CountdownParts {
  const ms = Math.max(0, target.getTime() - from.getTime());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}
