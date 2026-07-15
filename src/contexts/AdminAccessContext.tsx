import { createContext, useContext } from 'react';

/**
 * Contexte pour savoir si l'utilisateur courant est un admin complet
 * (pas seulement pasteur principal en consultation).
 *
 * Utilisation dans un onglet admin :
 *   const { isFullAdmin } = useAdminAccess();
 *   if (!isFullAdmin) return <p>Accès en lecture seule.</p>;
 */
interface AdminAccess {
  isFullAdmin: boolean;
}

const Ctx = createContext<AdminAccess>({ isFullAdmin: true });

export function AdminAccessProvider({ isFullAdmin, children }: { isFullAdmin: boolean; children: React.ReactNode }) {
  return <Ctx.Provider value={{ isFullAdmin }}>{children}</Ctx.Provider>;
}

export function useAdminAccess() {
  return useContext(Ctx);
}