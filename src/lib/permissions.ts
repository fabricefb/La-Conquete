/* ═══════════════════════════════════════════════════════════════════
   Système de permissions V2 — La Conquête
   Niveau + Périmètre + Catégorie pastorale
   ═══════════════════════════════════════════════════════════════════ */

import { ROLE_LEVELS, type PastorCategory } from '../types';
import type { UserProfile } from '../types';

// ─── Helpers de niveau ────────────────────────────────────────────

export function can(user: UserProfile | null, requiredLevel: number): boolean {
  if (!user) return requiredLevel === 0;
  return user.role_level >= requiredLevel;
}

export function isAtLeast(user: UserProfile | null, level: number): boolean {
  return can(user, level);
}

export function isMember(user: UserProfile | null): boolean {
  return can(user, ROLE_LEVELS.MEMBER);
}

export function isDeptMember(user: UserProfile | null): boolean {
  return can(user, ROLE_LEVELS.DEPT_MEMBER);
}

export function isDeptLeader(user: UserProfile | null): boolean {
  return can(user, ROLE_LEVELS.DEPT_LEADER);
}

export function isPastorAssoc(user: UserProfile | null): boolean {
  return can(user, ROLE_LEVELS.PASTOR_ASSOC);
}

export function isPastorPrincipal(user: UserProfile | null): boolean {
  return user?.is_principal_pastor === true || user?.role_level >= ROLE_LEVELS.PASTOR_PRINCIPAL;
}

export function isAdmin(user: UserProfile | null): boolean {
  return user?.is_admin === true || user?.role_level >= ROLE_LEVELS.ADMIN;
}

// ─── Périmètre d'action ───────────────────────────────────────────

export type ScopeFilter = Record<string, unknown> | null;

/**
 * Retourne le filtre à appliquer aux requêtes Supabase
 * en fonction du rôle et de l'extension de l'utilisateur.
 */
export function getScopeFilter(user: UserProfile | null): ScopeFilter {
  if (!user) return null;

  // Admin et pasteur principal voient tout
  if (isAdmin(user) || isPastorPrincipal(user)) return {};

  // Pasteur associé : filtré par son extension
  if (isPastorAssoc(user) && user.extension_id) {
    return { extension_id: user.extension_id };
  }

  // Chef de département / membre de département : ses départements
  // (géré au niveau des requêtes spécifiques via department_members)
  if (isDeptMember(user)) return null;

  // Membre simple : ses propres données
  return { user_id: user.id };
}

/**
 * Vérifie si l'utilisateur peut agir sur un profil cible
 * en fonction du périmètre d'extension.
 */
export function canActOnUser(
  actor: UserProfile | null,
  target: { id: string; extension_id: string | null } | null
): boolean {
  if (!actor || !target) return false;

  // Admin et pasteur principal peuvent tout voir
  if (isAdmin(actor) || isPastorPrincipal(actor)) return true;

  // Pasteur associé : seulement les membres de son extension
  if (isPastorAssoc(actor)) {
    return actor.extension_id !== null && actor.extension_id === target.extension_id;
  }

  // Chacun peut voir son propre profil
  return actor.id === target.id;
}

// ─── Permissions par catégorie pastorale ───────────────────────────

interface CategoryPermissions {
  publishSpiritual: boolean;   // communiqués spirituels
  publishLogistic: boolean;    // communiqués logistiques
  financialFull: boolean;      // gestion financière complète
  financialRead: boolean;      // lecture financière
  sacramentsPreside: boolean;  // présider les sacrements
  sacramentsAssist: boolean;   // assister aux sacrements
  viewAllExtensions: boolean;  // voir les autres extensions
  manageMembers: boolean;      // gérer les membres (listes, profils)
}

const CATEGORY_PERMISSIONS: Record<NonNullable<PastorCategory>, CategoryPermissions> = {
  ancien: {
    publishSpiritual: true,
    publishLogistic: false,
    financialFull: false,
    financialRead: true,
    sacramentsPreside: true,
    sacramentsAssist: true,
    viewAllExtensions: true,
    manageMembers: true,
  },
  diacre: {
    publishSpiritual: false,
    publishLogistic: true,
    financialFull: true,
    financialRead: true,
    sacramentsPreside: false,
    sacramentsAssist: true,
    viewAllExtensions: false,
    manageMembers: true,
  },
  collaborateur: {
    publishSpiritual: false,
    publishLogistic: false,
    financialFull: false,
    financialRead: false,
    sacramentsPreside: false,
    sacramentsAssist: false,
    viewAllExtensions: false,
    manageMembers: false,
  },
  partenaire: {
    publishSpiritual: false,
    publishLogistic: false,
    financialFull: false,
    financialRead: false,
    sacramentsPreside: false,
    sacramentsAssist: false,
    viewAllExtensions: false,
    manageMembers: false,
  },
  assistant_pastor: {
    publishSpiritual: false,
    publishLogistic: false,
    financialFull: false,
    financialRead: false,
    sacramentsPreside: false,
    sacramentsAssist: false,
    viewAllExtensions: false,
    manageMembers: false,
  },
};

export function getCategoryPermissions(user: UserProfile | null): CategoryPermissions {
  if (!user || !user.pastor_category) {
    return {
      publishSpiritual: false,
      publishLogistic: false,
      financialFull: false,
      financialRead: false,
      sacramentsPreside: false,
      sacramentsAssist: false,
      viewAllExtensions: false,
      manageMembers: false,
    };
  }
  return CATEGORY_PERMISSIONS[user.pastor_category];
}

// ─── Labels et couleurs ───────────────────────────────────────────

import { ROLE_LABELS, ROLE_COLORS, PASTOR_CATEGORY_LABELS } from '../types';

export function getRoleLabel(user: UserProfile | null): string {
  if (!user) return 'Visiteur';
  return ROLE_LABELS[user.role_level] || 'Membre';
}

export function getRoleBadgeClass(user: UserProfile | null): string {
  if (!user) return '';
  return ROLE_COLORS[user.role_level] || ROLE_COLORS[1];
}

export function getFullRoleLabel(user: UserProfile | null): string {
  if (!user) return 'Visiteur';
  const roleLabel = getRoleLabel(user);
  const catLabel = user.pastor_category ? ` · ${PASTOR_CATEGORY_LABELS[user.pastor_category]}` : '';
  return `${roleLabel}${catLabel}`;
}