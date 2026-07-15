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