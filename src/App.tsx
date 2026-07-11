import { useEffect, useState, useCallback } from 'react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { EventsPage } from './pages/EventsPage';
import { MediaPage } from './pages/MediaPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DynamicThemeProvider } from './contexts/DynamicTheme';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AuthModal } from './components/auth/AuthModal';
import type { Page } from './lib/navigation';

const VALID_PAGES: Page[] = ['home', 'about', 'activities', 'events', 'media', 'contact', 'admin', 'connexion'];
function getPage(): Page {
  const h = window.location.hash.replace('#', '');
  return VALID_PAGES.includes(h as Page) ? (h as Page) : 'home';
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
      {(() => {
        switch (page) {
          case 'home': return <HomePage {...nav} />;
          case 'about': return <AboutPage {...nav} />;
          case 'activities': return <ActivitiesPage {...nav} />;
          case 'events': return <EventsPage {...nav} />;
          case 'media': return <MediaPage {...nav} />;
          case 'contact': return <ContactPage {...nav} />;
          case 'admin': return <AdminPage onNavigate={setPage} />;
          default: return <HomePage {...nav} />;
        }
      })()}
      <AuthModal isOpen={authOpen} onClose={closeAuth} initialView={authView} />
    </>
  );
}

/* ─── Global onboarding gate ─────────────────────────────────── */
function OnboardingOverlay() {
  const { user, profile, isAdmin, loading } = useAuth();
  // Skip onboarding for admins — they go directly to the panel
  const showOnboarding =
    !loading &&
    user !== null &&
    !isAdmin &&
    (profile === null || !profile.onboarding_completed);

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