# Église Évangélique La Conquête — Site Web

Site web moderne pour l'Église Évangélique La Conquête de Lubumbashi (RDC).

## Stack technique

- **React 18** + **TypeScript**
- **Vite** (bundler)
- **Tailwind CSS** (design system)
- **Supabase** (base de données, stockage)
- **Leaflet / react-leaflet** (carte interactive)
- **Lucide React** (icônes)

## Fonctionnalités

- Mode sombre / clair avec persistance
- 7 pages : Accueil, Qui sommes-nous, Nos activités, Agenda, Médias, Contact, Admin
- Carte interactive des implantations (OpenStreetMap)
- Page d'administration pour gérer les extensions et leurs coordonnées GPS
- Design responsive (mobile, tablette, desktop)
- Animations scroll (IntersectionObserver)

## Installation

```bash
npm install
```

## Configuration

1. Copiez `.env.example` en `.env`
2. Renseignez vos clés Supabase :
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Appliquez la migration SQL dans `supabase/migrations/` via le tableau de bord Supabase

## Lancement

```bash
npm run dev
```

## Build production

```bash
npm run build
```

## Structure

```
src/
  components/     # Header, Footer, NavMobile, ThemeToggle, InteractiveMap
  pages/          # HomePage, AboutPage, ActivitiesPage, EventsPage, MediaPage, ContactPage, AdminPage
  lib/            # supabase.ts, navigation.ts, theme.ts, hooks.ts, icons.ts, date.ts
supabase/
  migrations/     # SQL de création des tables
```

## Page Admin

Accessible via le lien **Admin** en bas de page (footer). Permet de :
- Ajouter / modifier / supprimer des implantations
- Saisir les coordonnées GPS
- Définir le siège principal
- Activer / désactiver une implantation
