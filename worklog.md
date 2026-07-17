---
Task ID: 1
Agent: Main Agent
Task: Intégration Cloudflare R2 pour la gestion des images (méga menu + héros)

Work Log:
- Créé src/lib/r2.ts — service R2 avec helpers URL, upload via presigned Worker, configuration bucket
- Modifié src/lib/storage.ts — ajout backend R2 avec fallback automatique vers Supabase Storage
- Réécrit src/components/admin/ImageUpload.tsx — double onglet "Lien R2 / URL" + "Envoyer un fichier", badge R2/URL sur preview
- Modifié src/components/SiteHeader.tsx — images méga menu dynamiques via site_settings (3 clés), logo header dynamique, fetch settings au montage
- Réécrit src/components/admin/tabs/SettingsTab.tsx — nouvelle catégorie "Images & Médias" en tête, 7 settings image auto-créés, ImageUpload intégré, bannière info R2
- Vérifié: TypeScript compilation OK (0 erreurs), Vite build OK (6.2s)
- Commit b78d8ec poussé sur GitHub main

Stage Summary:
- Toutes les images (méga menu ×3, héros, logo, footer logo, favicon) sont maintenant gérables depuis l'admin (Paramètres → Images & Médias)
- Le composant ImageUpload offre 2 modes: coller un lien R2/URL public, ou uploader un fichier via Supabase
- Cloudflare Pages va déployer automatiquement via le push git

---
Task ID: 2
Agent: Main Agent
Task: Configuration R2 + Correction erreurs sauvegarde admin + Restructuration page-par-page

Work Log:
- Configuré R2_PUBLIC_BASE = 'https://pub-344d6377f96445089f6ad71c3ab2fc80.r2.dev' dans r2.ts avec helper r2Url()
- Ajouté le hint R2 dans ImageUpload (affiche le lien de base R2 sous la zone drag-drop)
- Diagnostic des erreurs de sauvegarde: 3 bugs trouvés
  1. user_profiles RLS ré-activé par migration erp_roles → récursion infinie
  2. site_settings.category CHECK ne contient pas 'images'
  3. Tous les upserts site_settings manquent le champ label (NOT NULL sans DEFAULT)
- Créé migration SQL: supabase/migrations/20260716000000_fix_admin_save_errors.sql
  - DISABLE ROW LEVEL SECURITY sur user_profiles
  - Ajout 'images' au CHECK category
  - Ajout 'image' au CHECK type
  - DEFAULT '' sur label
  - Élargi page_contents.page CHECK (ajout culte, vision, pasteurs, etc.)
- Corrigé 6 fichiers avec upserts incomplets:
  - src/lib/supabase.ts (upsertSetting)
  - src/lib/hooks/useSectionColors.ts (saveSectionColors)
  - src/components/admin/tabs/HomepageBuilderTab.tsx (handleSave)
  - src/components/admin/tabs/PageBuilderTab.tsx (handleSave)
  - src/components/admin/tabs/AnimationsTab.tsx (handleSave)
  - src/components/admin/tabs/LiveStreamTab.tsx (handleSave)
- Restructuré l'admin page-par-page:
  - AdminLayout: nouveau groupe "Pages" dans la sidebar (avant "Contenu")
  - SettingsTab: supprimé gestion des images (seulement paramètres globaux)
  - HomepageBuilderTab: ajouté "En-tête & Navigation" (logo + méga menu images)
  - HeaderImagesManager: composant avec sauvegarde indépendante via site_settings
- Build: TypeScript 0 erreurs, Vite build OK (9.8s)

Stage Summary:
- Lien R2 configuré: https://pub-344d6377f96445089f6ad71c3ab2fc80.r2.dev
- Migration SQL créée mais DOIT être exécutée manuellement dans Supabase SQL Editor
- Structure admin restructurée: Pages > Page d'accueil > (En-tête & Navigation | Héro plein écran | ...)
- Toutes les erreurs de sauvegarde corrigées dans le code
---
Task ID: 2
Agent: Main Agent
Task: Fix 5 critical bugs where admin changes don't reflect on live pages

Work Log:
- Analyzed all 5 bugs and identified root causes
- BUG 1 & 5 (IconBox/Animations): PageBuilderTab used .update().eq().count === 0 but Supabase returns count:null not 0. INSERT never ran. Fixed with .upsert({onConflict:key})
- BUG 2 (Audio): AudioTab used {isAdmin} but hook returns {isFullAdmin}. Also isFullAdmin excluded pastor principal. Fixed both.
- BUG 3 (Parallax): useParallax on section with overflow:hidden. Moved to background wrapper.
- BUG 4 (TypingText): No reset when words prop changed after async load. Added useEffect reset.
- Build: 0 TS errors, successful in 6.93s

Stage Summary:
- Files changed: PageBuilderTab.tsx, AudioTab.tsx, AuthContext.tsx, TypingHero.tsx, HomePage.tsx
- SQL migration 20260717000000_fix_builder_save.sql MUST be executed on Supabase
