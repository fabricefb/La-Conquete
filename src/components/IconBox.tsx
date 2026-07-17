import { usePageBuilderConfig } from '../lib/hooks/usePageBuilderConfig';

/**
 * IconBox — wrapper pour les divs d'icônes décoratives.
 * Permet à l'admin de masquer/afficher chaque icône via le Page Builder.
 *
 * Usage :
 *   <IconBox pageKey="home" elementId="pillars-icon-0" className="mb-5 inline-flex h-12 w-12 ...">
 *     <Crown className="h-6 w-6" />
 *   </IconBox>
 *
 * Si l'élément est masqué dans le builder, le div ne rend rien (null).
 */

interface IconBoxProps {
  /** Clé de la page (ex: "home", "vision", "about") */
  pageKey: string;
  /** Identifiant unique de l'élément dans cette page (ex: "pillars-icon-0") */
  elementId: string;
  /** Classes CSS du div conteneur */
  className?: string;
  /** Visibilité par défaut si aucune config n'est trouvée */
  defaultVisible?: boolean;
  /** Enfant(s) — généralement un composant icône Lucide */
  children: React.ReactNode;
}

export function IconBox({
  pageKey,
  elementId,
  className = '',
  defaultVisible = true,
  children,
}: IconBoxProps) {
  const { isElementVisible, elementsConfig } = usePageBuilderConfig(pageKey);

  // Use elementsConfig directly (not just the memoized callback) so React
  // tracks it as a dependency and re-renders when the config changes.
  const visibilityState = elementId in elementsConfig ? elementsConfig[elementId] : defaultVisible;

  if (!visibilityState) {
    return null;
  }

  return <div className={className}>{children}</div>;
}