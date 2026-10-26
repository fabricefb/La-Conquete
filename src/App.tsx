import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import type { Page } from './lib/navigation';

/* ─── Lazy-loaded pages (code splitting — ALL pages) ─── */
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const MediaPage = lazy(() => import('./pages/MediaPage').then(m => ({ default: m.MediaPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DynamicThemeProvider } from './contexts/DynamicTheme';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AuthModal } from './components/auth/AuthModal';
import { AudioPlayer } from './components/AudioPlayer';
import { BibleReader } from './components/BibleReader';
import { NotificationCenter } from './components/NotificationCenter';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

/* ─── Lazy-loaded pages (code splitting) ─── */
const CrmPage = lazy(() => import('./pages/CrmPage').then(m => ({ default: m.CrmPage })));
const PastoralPage = lazy(() => import('./pages/PastoralPage').then(m => ({ default: m.PastoralPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage').then(m => ({ default: m.CommunicationPage })));
const PredicationsPage = lazy(() => import('./pages/PredicationsPage').then(m => ({ default: m.PredicationsPage })));
const CommuniquesPage = lazy(() => import('./pages/CommuniquesPage').then(m => ({ default: m.CommuniquesPage })));
const AnnoncesPage = lazy(() => import('./pages/AnnoncesPage').then(m => ({ default: m.AnnoncesPage })));
const DonsPage = lazy(() => import('./pages/DonsPage').then(m => ({ default: m.DonsPage })));
const PasteursPage = lazy(() => import('./pages/PasteursPage').then(m => ({ default: m.PasteursPage })));
const MinisteresPage = lazy(() => import('./pages/MinisteresPage').then(m => ({ default: m.MinisteresPage })));
const MissionsPage = lazy(() => import('./pages/MissionsPage').then(m => ({ default: m.MissionsPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const CulteFormPage = lazy(() => import('./pages/CulteFormPage').then(m => ({ default: m.CulteFormPage })));
const FormOrateurBrandedPage = lazy(() => import('./pages/FormOrateurBrandedPage').then(m => ({ default: m.FormOrateurBrandedPage })));

const VALID_PAGES: Page[] = ['home', 'about', 'activities', 'events', 'media', 'contact', 'dons', 'admin', 'connexion', 'dashboard', 'crm', 'reports', 'communication', 'pastoral', 'predications', 'annonces', 'communiques', 'pasteurs', 'ministeres', 'missions', 'blog'];

/* Anciennes URL conservées : on redirige vers la page qui porte désormais
   l'information, sans casser les liens déjà partagés. */
const LEGACY_ROUTES: Record<string, Page> = {
  vision: 'about',
  culte: 'activities',
  jeunesse: 'activities',
  evangelisation: 'activities',
  enseignements: 'blog',
  emissions: 'media',
  emision: 'media',
  departments: 'ministeres',
};

function getPage(): Page {
  const h = window.location.hash.replace('#', '').replace(/^\/+/, '');
  const base = h.split('/')[0];
  const resolved = LEGACY_ROUTES[base] ?? base;
  return VALID_PAGES.includes(resolved as Page) ? (resolved as Page) : 'home';
}

/* ─── Page loading spinner ─── */
function PageLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="keep-radius w-8 h-8 border-2 border-accent-400/30 border-t-accent-500 rounded-full animate-spin" />
    </div>
  );
}

/* ─── Check if current route is a form-culte or form-orateur link ─── */
function getFormCulteToken(): string | null {
  const h = window.location.hash.replace('#', '').replace(/^\/+/, '');
  if (h.startsWith('form-culte/')) {
    return h.replace('form-culte/', '');
  }
  return null;
}
function getFormOrateurToken(): string | null {
  const h = window.location.hash.replace('#', '').replace(/^\/+/, '');
  if (h.startsWith('form-orateur/')) {
    return h.replace('form-orateur/', '');
  }
  return null;
}

/* ─── Auth modal state (global) ──────────────────────────── */
export const useAuthModal = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const openAuth = useCallback((view: 'login' | 'signup' = 'login') => {
    setAuthView(view);
    setAuthOpen(true);
  }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  return { authOpen, authView, openAuth, closeAuth };
};

/* ─── Router with auth modal support ─────────────────────── */
function AppRouter() {
  const [page, setPage] = useState<Page>(getPage);
  const { authOpen, authView, openAuth, closeAuth } = useAuthModal();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [bibleOpen, setBibleOpen] = useState(false);
  const [formToken, setFormToken] = useState<string | null>(getFormCulteToken);
  const [formOrateurToken, setFormOrateurToken] = useState<string | null>(getFormOrateurToken);

  // ── Redirect admin/pastor to #admin after login ──
  useEffect(() => {
    if (!authLoading && user && isAdmin && page === 'home') {
      // Only auto-redirect if user just landed on home after login
      // (not if they manually navigated back to home)
      const redirected = sessionStorage.getItem('lc_admin_redirected');
      if (!redirected) {
        sessionStorage.setItem('lc_admin_redirected', '1');
        setPage('admin');
      }
    }
    // Clear flag on logout
    if (!user) {
      sessionStorage.removeItem('lc_admin_redirected');
    }
  }, [authLoading, user, isAdmin, page, setPage]);

  useEffect(() => {
    // Do NOT overwrite hash if we're showing a form — form URLs must stay intact
    if (formToken || formOrateurToken) return;
    // Handle #connexion route → open auth modal
    if (page === 'connexion') {
      openAuth('login');
      window.location.hash = '#home';
      return;
    }
    // Préserve un sous-chemin (ex. #blog/mon-article) tant qu'on reste sur la page.
    const raw = window.location.hash.replace('#', '').replace(/^\/+/, '');
    if (raw.split('/')[0] === page && raw !== page) return;
    window.location.hash = page;
  }, [page, openAuth, formToken, formOrateurToken]);

  /* Pages publiques → registre « angles droits ». L'espace interne conserve
     ses pilules et ses switchs arrondis. */
  useEffect(() => {
    const INTERNAL: Page[] = ['admin', 'dashboard', 'crm', 'reports', 'communication', 'pastoral'];
    document.documentElement.classList.toggle('sharp', !INTERNAL.includes(page));
  }, [page]);

  useEffect(() => {
    const fn = () => {
      const token = getFormCulteToken();
      const orateurToken = getFormOrateurToken();
      if (token) {
        setFormToken(token);
        setFormOrateurToken(null);
      } else if (orateurToken) {
        setFormOrateurToken(orateurToken);
        setFormToken(null);
      } else {
        setFormToken(null);
        setFormOrateurToken(null);
        const raw = window.location.hash.replace('#', '').replace(/^\/+/, '');
        const legacyTarget = LEGACY_ROUTES[raw.split('/')[0]];
        if (legacyTarget) window.location.replace('#' + legacyTarget);
        setPage(getPage());
      }
    };
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const nav = { onNavigate: setPage, openAuth };

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        {formToken ? (
          <CulteFormPage token={formToken} />
        ) : formOrateurToken ? (
          <FormOrateurBrandedPage token={formOrateurToken} />
        ) : (
          (() => {
            switch (page) {
              case 'home': return <HomePage {...nav} />;
              case 'about': return <AboutPage {...nav} />;
              case 'activities': return <ActivitiesPage {...nav} />;
              case 'events': return <EventsPage {...nav} />;
              case 'media': return <MediaPage {...nav} />;
              case 'contact': return <ContactPage {...nav} />;
              case 'admin': return <AdminPage onNavigate={setPage} />;
              case 'dashboard': return <DashboardPage onNavigate={setPage} />;
              case 'crm': return <CrmPage {...nav} />;
              case 'pastoral': return <PastoralPage onNavigate={setPage} />;
              case 'reports': return <ReportsPage {...nav} />;
              case 'communication': return <CommunicationPage onNavigate={setPage} />;
              case 'predications': return <PredicationsPage {...nav} />;
              case 'communiques': return <CommuniquesPage {...nav} />;
              case 'annonces': return <AnnoncesPage {...nav} />;
              case 'dons': return <DonsPage {...nav} />;
              case 'pasteurs': return <PasteursPage {...nav} />;
              case 'ministeres': return <MinisteresPage {...nav} />;
              case 'missions': return <MissionsPage {...nav} />;
              case 'blog': return <BlogPage {...nav} />;
              default: return <HomePage {...nav} />;
            }
          })()
        )}
      </Suspense>
      <AuthModal isOpen={authOpen} onClose={() => { closeAuth(); sessionStorage.removeItem('lc_admin_redirected'); }} initialView={authView} />
      {/* ── Global Innovation Components ── */}
      <AudioPlayer />
      <PWAInstallPrompt />
      <BibleReader isOpen={bibleOpen} onClose={() => setBibleOpen(false)} />
      {page !== 'admin' && page !== 'dashboard' && <NotificationCenter />}
    </>
  );
}

/* ─── Global onboarding gate ─────────────────────────────────── */
function OnboardingOverlay() {
  const { user, profile, isAdmin, loading } = useAuth();

  // Safety net: if localStorage says onboarding was done, never block
  const localDone = user ? localStorage.getItem('lc_onboarding_done') === user.id : false;

  // Skip onboarding for admins — they go directly to the panel
  // Also skip if profile is null (don't trap users in a loop)
  const showOnboarding =
    !loading &&
    !localDone &&
    user !== null &&
    !isAdmin &&
    profile !== null &&
    !profile.onboarding_completed;

  if (!showOnboarding) return null;
  return <OnboardingFlow />;
}

export default function App() {
  return (
    <DynamicThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
          <OnboardingOverlay />
        </ToastProvider>
      </AuthProvider>
    </DynamicThemeProvider>
  );
}