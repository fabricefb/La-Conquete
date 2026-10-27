/* ═══════════════════════════════════════════════════════════════════
   Départements ouverts aux inscriptions de membres
   Phase 1 : Média & Communication, puis Évangélisation.
   ═══════════════════════════════════════════════════════════════════ */

export type JoinableDepartmentKey = 'media' | 'evangelism';

const MATCHERS: { key: JoinableDepartmentKey; test: (name: string) => boolean }[] = [
  {
    key: 'media',
    test: (name) => /m[ée]dia|communication|presse/i.test(name),
  },
  {
    key: 'evangelism',
    test: (name) => /[ée]vang[ée]lis/i.test(name),
  },
];

export function joinableDepartmentKey(name: string): JoinableDepartmentKey | null {
  return MATCHERS.find((m) => m.test(name))?.key ?? null;
}

export function isJoinableDepartment(name: string): boolean {
  return joinableDepartmentKey(name) !== null;
}

/**
 * Ordre d'affichage des départements dans le parcours d'adhésion :
 * Média & Communication, Évangélisation, puis les autres (en attente de
 * configuration) dans leur ordre d'origine.
 */
export function sortDepartmentsForMembership<T extends { name: string }>(departments: T[]): T[] {
  return [...departments].sort((a, b) => {
    const rank = (name: string) => {
      const key = joinableDepartmentKey(name);
      if (key === 'media') return 0;
      if (key === 'evangelism') return 1;
      return 2;
    };
    return rank(a.name) - rank(b.name);
  });
}

export const JOINABLE_DEPARTMENT_LABELS: Record<JoinableDepartmentKey, string> = {
  media: 'Média & Communication',
  evangelism: 'Évangélisation',
};
