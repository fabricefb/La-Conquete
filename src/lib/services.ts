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

/* ═══════════════════════════════════════════════════════════════════════
   CULTES SPÉCIAUX — programmés au back-office (table worship_services)
   Quand un culte spécial à venir existe, le hero de l'accueil remplace le
   programme hebdomadaire par ce culte et son compte à rebours.
   ─────────────────────────────────────────────────────────────────────── */

export const SPECIAL_SERVICE_TYPES = [
  'seminaire',
  'veillee',
  'culte_special',
  'conference',
  'exposition',
  'retraite',
] as const;

export const SPECIAL_SERVICE_LABELS: Record<string, string> = {
  seminaire: 'Séminaire',
  veillee: 'Veillée',
  culte_special: 'Culte spécial',
  conference: 'Conférence',
  exposition: 'Exposition',
  retraite: 'Retraite',
};

const FR_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FR_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « dimanche 8 novembre 2026 » à partir d'une date ISO (yyyy-mm-dd). */
export function formatSpecialDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${FR_DAYS[date.getUTCDay()].toLowerCase()} ${d} ${FR_MONTHS[m - 1]} ${y}`;
}

/** Instant de début du culte, exprimé en heure de Lubumbashi (UTC+2). */
export function specialServiceAt(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, min, 0) - LUBUMBASHI_UTC_OFFSET_MINUTES * 60000);
}

export interface UpcomingSpecial {
  /** Libellé du type : « Veillée », « Conférence »… */
  label: string;
  /** Phrase du programme : « samedi 8 novembre 2026 · 18h00 » */
  detail: string;
  at: Date;
}

export function buildUpcomingSpecial(row: {
  date: string;
  time: string;
  type: string;
}): UpcomingSpecial {
  const label = SPECIAL_SERVICE_LABELS[row.type] ?? 'Culte spécial';
  const time = (row.time || '').slice(0, 5).replace(':', 'h');
  return {
    label,
    detail: `${formatSpecialDate(row.date)} · ${time}`,
    at: specialServiceAt(row.date, row.time),
  };
}
