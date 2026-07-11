import { useEffect, useState } from 'react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { EventsPage } from './pages/EventsPage';
import { MediaPage } from './pages/MediaPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DynamicThemeProvider } from './contexts/DynamicTheme';
import type { Page } from './lib/navigation';

const VALID_PAGES: Page[] = ['home', 'about', 'activities', 'events', 'media', 'contact', 'admin'];
function getPage(): Page {
  const h = window.location.hash.replace('#', '');
  return VALID_PAGES.includes(h as Page) ? (h as Page) : 'home';
}

function AppRouter() {
  const [page, setPage] = useState<Page>(getPage);

  useEffect(() => { window.location.hash = page; }, [page]);
  useEffect(() => {
    const fn = () => setPage(getPage());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const nav = { onNavigate: setPage };

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
}

export default function App() {
  return (
    <DynamicThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </DynamicThemeProvider>
  );
}