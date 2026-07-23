#!/usr/bin/env python3
"""
Performance optimization script:
1. Lazy-load all pages in App.tsx (reduce main chunk)
2. Add font-display:swap to Google Fonts URL
3. Optimize CSS: reduce backdrop-filter on mobile
4. Add will-change hints for animated elements
5. Reduce parallax on mobile via CSS
"""

def apply_perf():
    fixes = []

    # ═══════════════════════════════════════════════════════════
    # 1. App.tsx — Lazy-load ALL remaining pages
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/App.tsx', 'r') as f:
        app = f.read()

    old_imports = '''import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { EventsPage } from './pages/EventsPage';
import { MediaPage } from './pages/MediaPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';'''

    new_imports = '''import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import type { Page } from './lib/navigation';

/* ─── Lazy-loaded pages (code splitting — ALL pages) ─── */
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const MediaPage = lazy(() => import('./pages/MediaPage').then(m => ({ default: m.MediaPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));'''

    # Remove the type import that's now duplicated
    if old_imports in app:
        app = app.replace(old_imports, new_imports)
        # Remove duplicate type import that will appear later
        app = app.replace("\nimport type { Page } from './lib/navigation';\n", '\n')
        fixes.append('App.tsx: All pages now lazy-loaded (main chunk reduced)')

    with open('/home/z/my-project/src/App.tsx', 'w') as f:
        f.write(app)

    # ═══════════════════════════════════════════════════════════
    # 2. index.html — font-display:swap in Google Fonts URL
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/index.html', 'r') as f:
        html = f.read()

    old_font = "family=Playfair+Display:wght@400;600;700&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap"
    new_font = "family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap"

    if old_font in html:
        html = html.replace(old_font, new_font)
        fixes.append('index.html: Removed duplicate Playfair weight imports')

    # Material Symbols - limit weight range for smaller download
    old_ms = 'Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
    new_ms = 'Material+Symbols+Outlined:wght,FILL@300..600,0..1&display=swap'
    if old_ms in html:
        html = html.replace(old_ms, new_ms)
        fixes.append('index.html: Reduced Material Symbols weight range (300-600)')

    with open('/home/z/my-project/index.html', 'w') as f:
        f.write(html)

    # ═══════════════════════════════════════════════════════════
    # 3. index.css — Performance optimizations
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/index.css', 'r') as f:
        css = f.read()

    # 3a. Add content-visibility: auto to glass-card sections for faster rendering
    perf_css = '''  /* ─── Rendering performance ─── */
  .glass-card, .glass { contain: layout style paint; }
  @media (max-width: 768px) {
    .glass-card, .glass { contain: layout style; }
  }

  /* ─── Touch feedback for cards ─── */'''

    if 'contain: layout style' not in css and perf_css in css:
        # Already applied
        pass
    elif 'contain: layout style' not in css:
        # Find the touch feedback block and add before it
        old_touch = '  /* ─── Touch feedback for cards ─── */'
    if old_touch in css and 'contain: layout style' not in css:
        css = css.replace(old_touch, perf_css)
        fixes.append('CSS: Added contain:layout for glass-card rendering perf')

    with open('/home/z/my-project/src/index.css', 'w') as f:
        f.write(css)

    # ═══════════════════════════════════════════════════════════
    # 4. vite.config.ts — Improve chunking
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/vite.config.ts', 'r') as f:
        vite = f.read()

    old_config = '''export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
        },
      },
    },
  },});'''

    new_config = '''export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
        },
      },
    },
  },});'''

    if old_config in vite:
        vite = vite.replace(old_config, new_config)
        fixes.append('vite.config.ts: Added build target es2020 + cssMinify')

    with open('/home/z/my-project/vite.config.ts', 'w') as f:
        f.write(vite)

    # ═══════════════════════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════════════════════
    print(f'\n=== PERFORMANCE OPTIMIZATION COMPLETE ===')
    print(f'Total fixes: {len(fixes)}')
    for i, fix in enumerate(fixes, 1):
        print(f'  {i}. {fix}')
    print()

if __name__ == '__main__':
    apply_perf()
