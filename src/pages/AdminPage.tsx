import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isLocalAdminSession } from '../lib/localBackend';
import AdminLogin from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { DashboardTab } from '../components/admin/tabs/DashboardTab';
import { SettingsTab } from '../components/admin/tabs/SettingsTab';
import { ContentsTab } from '../components/admin/tabs/ContentsTab';
import { ArticlesTab } from '../components/admin/tabs/ArticlesTab';
import { LocationsTab } from '../components/admin/tabs/LocationsTab';
import { EventsTab } from '../components/admin/tabs/EventsTab';
import { DepartmentsTab } from '../components/admin/tabs/DepartmentsTab';
import { MinistriesTab } from '../components/admin/tabs/MinistriesTab';
import { MediaCommunicationTab } from '../components/admin/tabs/MediaCommunicationTab';
import { TestimonialsTab } from '../components/admin/tabs/TestimonialsTab';
import { MessagesTab } from '../components/admin/tabs/MessagesTab';
import { ThemeTab } from '../components/admin/tabs/ThemeTab';
import { PastorsTab } from '../components/admin/tabs/PastorsTab';
import { AssignmentsTab } from '../components/admin/tabs/AssignmentsTab';
import { AlertsTab } from '../components/admin/tabs/AlertsTab';
import { PipelineTab } from '../components/admin/tabs/PipelineTab';
import { OnboardingTab } from '../components/admin/tabs/OnboardingTab';
import { UsersTab } from '../components/admin/tabs/UsersTab';
import { CreneauxTab } from '../components/admin/tabs/CreneauxTab';
import { ProtocolTab } from '../components/admin/tabs/ProtocolTab';
import { HomeEditorTab } from '../components/admin/tabs/HomeEditorTab';
import { AnimationsTab } from '../components/admin/tabs/AnimationsTab';
import { LiveStreamTab } from '../components/admin/tabs/LiveStreamTab';
import { AudioTab } from '../components/admin/tabs/AudioTab';
import { GuideTab } from '../components/admin/tabs/GuideTab';
import { EvangelismTab } from '../components/admin/tabs/EvangelismTab';
import { PredicationsTab } from '../components/admin/tabs/PredicationsTab';
import { AnnoncesTab } from '../components/admin/tabs/AnnoncesTab';
import { CommuniquesTab } from '../components/admin/tabs/CommuniquesTab';
import { EmissionsTab } from '../components/admin/tabs/EmissionsTab';
import { ActivityCardsTab } from '../components/admin/tabs/ActivityCardsTab';
import { VisualsTab } from '../components/admin/tabs/VisualsTab';
import { ShieldOff, Eye, Shield } from '../lib/icons';
import { AdminAccessProvider } from '../contexts/AdminAccessContext';
import { PASTORAL_TABS } from '../lib/adminAccess';
import type { AdminTab } from '../types';
import type { Page } from '../lib/navigation';

interface AdminPageProps {
  onNavigate: (page: Page) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user, isFullAdmin, hasBackOffice, loading, profileLoading, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => (isLocalAdminSession() ? 'homepage_builder' : 'dashboard'));
  const [tabChosen, setTabChosen] = useState(false);

  /* En local, on ouvre l'éditeur de la page d'accueil : c'est le point
     d'entrée qui suit l'ordre visuel du site. */
  useEffect(() => {
    if (user && !tabChosen && isLocalAdminSession()) setActiveTab('homepage_builder');
  }, [user, tabChosen]);

  function changeTab(tab: AdminTab) {
    setTabChosen(true);
    setActiveTab(tab);
  }

  // While checking auth session or loading profile after login
  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin border-2 border-line border-t-evangile-600" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">Chargement</p>
        </div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) {
    return <AdminLogin />;
  }

  // Logged in but without management access → show diagnostic + fix button
  if (!hasBackOffice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-cream">
        <div className="panel w-full max-w-lg border-t-2 border-t-evangile-600 p-10 text-center">
          <ShieldOff className="mx-auto h-10 w-10 text-[rgb(var(--accent-red-rgb))]" />
          <span className="section-label mt-5 justify-center">Accès restreint</span>
          <p className="mt-2 font-hero text-2xl uppercase leading-none tracking-[0.04em] text-cream">
            Accès refusé
          </p>
          <p className="mt-3 text-sm text-muted">
            Votre compte n'a pas les droits d'administration.
          </p>

          {/* Diagnostic info */}
          <div className="mt-5 border border-line bg-white/[0.03] p-4 text-left font-mono text-xs">
            <p><span className="text-muted">User ID:</span> {user.id}</p>
            <p><span className="text-muted">Email:</span> {user.email}</p>
            <p><span className="text-muted">Profile:</span> {profile ? 'Chargé' : 'NULL'}</p>
            {profile && (
              <>
                <p><span className="text-muted">is_admin:</span> {String(profile.is_admin)}</p>
                <p><span className="text-muted">role_level:</span> {String((profile as any).role_level)}</p>
              </>
            )}
          </div>

          <p className="mt-5 text-xs text-muted">
            Contactez l'administrateur principal si vous pensez que c'est une erreur.
          </p>
          <button onClick={() => onNavigate('home')} className="btn-ghost mt-6">
            Retour au site
          </button>
        </div>
      </div>
    );
  }

  // Admin → show back-office
  function renderTab() {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab onTabChange={changeTab} />;
      case 'settings': return <SettingsTab />;
      case 'contents': return <ContentsTab />;
      case 'articles': return <ArticlesTab />;
      case 'locations': return <LocationsTab />;
      case 'events': return <EventsTab />;
      case 'departments': return <DepartmentsTab />;
      case 'assignments': return <AssignmentsTab />;
      case 'creneaux': return <CreneauxTab />;
      case 'ministries': return <MinistriesTab />;
      case 'alerts': return <AlertsTab />;
      case 'pipeline': return <PipelineTab />;
      case 'media_communication': return <MediaCommunicationTab />;
      case 'testimonials': return <TestimonialsTab />;
      case 'messages': return <MessagesTab />;
      case 'pastors': return <PastorsTab />;
      case 'onboarding': return <OnboardingTab />;
      case 'users': return <UsersTab />;
      case 'theme': return <ThemeTab />;
      case 'protocol': return <ProtocolTab />;
      case 'homepage_builder': return <HomeEditorTab onOpenTab={changeTab} />;
      case 'guide': return <GuideTab />;
      case 'animations': return <AnimationsTab />;
      case 'live_stream': return <LiveStreamTab />;
      case 'audio': return <AudioTab />;
      case 'evangelism': return <EvangelismTab />;
      case 'predications': return <PredicationsTab />;
      case 'annonces': return <AnnoncesTab />;
      case 'communiques': return <CommuniquesTab />;
      case 'emissions': return <EmissionsTab />;
      case 'activity_cards': return <ActivityCardsTab />;
      case 'visuals': return <VisualsTab onTabChange={changeTab} />;
      default: return <DashboardTab onTabChange={changeTab} />;
    }
  }

  const activeTabAllowed = isFullAdmin || PASTORAL_TABS.has(activeTab);

  return (
    <AdminAccessProvider isFullAdmin={isFullAdmin}>
    <AdminLayout activeTab={activeTab} onTabChange={changeTab} onNavigate={onNavigate} isFullAdmin={isFullAdmin}>
      {/* Espace pastoral : périmètre volontairement séparé du back-office */}
      {!isFullAdmin && (
        <div className="mb-4 flex items-start gap-3 border border-line border-l-2 border-l-evangile-600 bg-bg-card px-4 py-3">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--accent-red-rgb))]" />
          <div>
            <p className="text-sm font-medium text-cream">Espace pastoral</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Vous gérez la vie de l'église et les contenus. Les comptes, les paramètres
              et la validation des chefs de département relèvent de l'administration.
            </p>
          </div>
        </div>
      )}
      {activeTabAllowed ? renderTab() : (
        <div className="panel flex flex-col items-center px-6 py-14 text-center">
          <Shield className="h-9 w-9 text-[rgb(var(--accent-red-rgb))]" />
          <p className="mt-4 font-hero text-2xl uppercase leading-none text-cream">
            Réservé à l'administration
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Cet écran fait partie du back-office. Les comptes, les rôles et les paramètres
            du site sont gérés par l'administrateur.
          </p>
        </div>
      )}
    </AdminLayout>
    </AdminAccessProvider>
  );
}