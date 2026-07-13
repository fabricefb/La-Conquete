---
Task ID: 1
Agent: main
Task: Clarifier rôles (Pasteur associé vs Pasteur principal vs Admin) + système rapports multi-églises + corrections

Work Log:
- Modifié `AuthContext.tsx` : ajouté `isFullAdmin` (Admin seulement, pas Pasteur principal), changé `isAdmin` pour être `is_admin === true` uniquement
- Modifié `permissions.ts` : fixé `isAdmin()` (level 6 seulement), `isPastorPrincipal()` (is_principal_pastor uniquement), ajouté `canViewAdmin()`
- Modifié `UsersTab.tsx` : descriptions des rôles clarifiées, Pasteur associé = level 4 + is_admin=false, boutons Couronne/Blocage/Accepter-Réfuser protégés par `isFullAdmin`
- Modifié `AdminPage.tsx` : bannière "Mode Pasteur principal — Consultation" quand pas isFullAdmin
- Créé SQL `15_cult_reports_extension.sql` : ajout extension_id à cult_reports + vue consolidée v_cult_reports_consolidated
- Modifié `ProtocolSection.tsx` : ajout sélecteur d'extension dans formulaire de rapport, soumission avec extension_id
- Modifié `ProtocolTab.tsx` : ajout section "Rapports consolidés multi-églises" avec fusion des chiffres
- Créé SQL `16_fix_department_members.sql` : fix structure + contrainte unique + auto-réparation
- Modifié `DashboardPage.tsx` : auto-réparation des demandes acceptées sans department_members, sections dynamiques pour tous les départements
- Créé `DepartmentSection.tsx` : composant générique pour tous les départements (aperçu, membres, activité, notes)
- Types mis à jour : CultReport inclut extension_id

Stage Summary:
- Hiérarchie des rôles clarifiée : Membre < Chef dép < Ancien/Diacre/Collaborateur < Pasteur associé < Pasteur principal (lecture seule admin) < Admin (accès total)
- Rapports de culte supportent multi-églises avec fusion automatique
- Bug "non assigné" corrigé par auto-réparation + SQL fix
- Les 7 départements ont maintenant chacun leur section sur le dashboard
- Build réussi sans erreur TypeScript ni Vite