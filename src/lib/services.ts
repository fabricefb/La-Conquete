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
  { day: 'Dimanche', weekday: 0, service: 'Culte Principal', time: '08h00 – 10h30', start: '08:00' },
  { day: 'Mercredi', weekday: 3, service: "Culte d'enseignement et prière", time: '16h30 – 18h30', start: '16:30' },
  { day: 'Vendredi', weekday: 5, service: 'Culte de jeûne et prière', time: '16h00 – 18h30', start: '16:00' },
  { day: 'Samedi', weekday: 6, service: 'Génération Espoir — Culte de la jeunesse', time: '14h30 – 17h00', start: '14:30' },
] as const;

export interface NextService extends ServiceTime {
  at: Date;
}

/* Lubumbashi est à UTC+2 toute l'année (pas d'heure d'été). Le compte à
   rebours doit rester juste même pour un visiteur situé dans un autre fuseau. */
const LUBUMBASHI_UTC_OFFSET_MINUTES = 120;

function lubumbashiParts(from: Date) {
  const shifted = new Date(from.getTime() + LUBUMBASHI_UTC_OFFSET_MINUTES * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

/** Prochaine occurrence d'un culte à partir de `from` (inclusive). */
export function getNextService(from: Date = new Date()): NextService {
  const local = lubumbashiParts(from);
  const nowLocalMs = Date.UTC(
    local.year,
    local.month,
    local.date,
    local.hours,
    local.minutes,
    local.seconds,
    from.getUTCMilliseconds(),
  );

  let best: NextService | null = null;

  for (const s of SERVICE_TIMES) {
    const [h, m] = s.start.split(':').map(Number);
    const dayDelta = (s.weekday - local.weekday + 7) % 7;
    let candidateLocalMs = Date.UTC(local.year, local.month, local.date + dayDelta, h, m, 0, 0);
    if (candidateLocalMs < nowLocalMs) candidateLocalMs += 7 * 86400000;

    const at = new Date(candidateLocalMs - LUBUMBASHI_UTC_OFFSET_MINUTES * 60000);
    if (!best || at.getTime() < best.at.getTime()) best = { ...s, at };
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
