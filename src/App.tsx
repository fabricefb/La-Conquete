import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { EventsPage } from './pages/EventsPage';
import { MediaPage } from './pages/MediaPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DynamicThemeProvider } from './contexts/DynamicTheme';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AuthModal } from './components/auth/AuthModal';
import type { Page } from './lib/navigation';

/* ─── Lazy-loaded pages (code splitting) ─── */
const CrmPage = lazy(() => import('./pages/CrmPage').then(m => ({ default: m.CrmPage })));
const PastoralPage = lazy(() => import('./pages/PastoralPage').then(m => ({ default: m.PastoralPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage').then(m => ({ default: m.CommunicationPage })));
const EmissionsPage = lazy(() => import('./pages/EmissionsPage').then(m => ({ default: m.EmissionsPage })));
const PredicationsPage = lazy(() => import('./pages/PredicationsPage').then(m => ({ default: m.PredicationsPage })));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })));
const ExtensionsPage = lazy(() => import('./pages/ExtensionsPage').then(m => ({ default: m.ExtensionsPage })));
const CommuniquesPage = lazy(() => import('./pages/CommuniquesPage').then(m => ({ default: m.CommuniquesPage })));
const AnnoncesPage = lazy(() => import('./pages/AnnoncesPage').then(m => ({ default: m.AnnoncesPage })));

const VALID_PAGES: Page[] = ['home', 'about', 'activities', 'events', 'media', 'contact', 'admin', 'connexion', 'dashboard', 'crm', 'reports', 'communication', 'pastoral', 'emissions', 'predications', 'departments', 'extensions', 'annonces', 'communiques'];
function getPage(): Page {
  const h = window.location.hash.replace('#', '');
  return VALID_PAGES.includes(h as Page) ? (h as Page) : 'home';
}

/* ─── Page loading spinner ─── */
function PageLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
    </div>
  );
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

  useEffect(() => {
    // Handle #connexion route → open auth modal
    if (page === 'connexion') {
      openAuth('login');
      window.location.hash = '#home';
      return;
    }
    window.location.hash = page;
  }, [page, openAuth]);

  useEffect(() => {
    const fn = () => setPage(getPage());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const nav = { onNavigate: setPage, openAuth };

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        {(() => {
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
            case 'emissions': return <EmissionsPage {...nav} />;
            case 'predications': return <PredicationsPage {...nav} />;
            case 'departments': return <DepartmentsPage {...nav} />;
            case 'extensions': return <ExtensionsPage {...nav} />;
            case 'communiques': return <CommuniquesPage {...nav} />;
            case 'annonces': return <AnnoncesPage {...nav} />;
            default: return <HomePage {...nav} />;
          }
        })()}
      </Suspense>
      <AuthModal isOpen={authOpen} onClose={closeAuth} initialView={authView} />
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