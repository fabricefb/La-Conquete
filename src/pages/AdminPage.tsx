import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminLogin from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { SettingsTab } from '../components/admin/tabs/SettingsTab';
import { ContentsTab } from '../components/admin/tabs/ContentsTab';
import { LocationsTab } from '../components/admin/tabs/LocationsTab';
import { EventsTab } from '../components/admin/tabs/EventsTab';
import { MinistriesTab } from '../components/admin/tabs/MinistriesTab';
import { MediaTab } from '../components/admin/tabs/MediaTab';
import { TestimonialsTab } from '../components/admin/tabs/TestimonialsTab';
import { MessagesTab } from '../components/admin/tabs/MessagesTab';
import { ThemeTab } from '../components/admin/tabs/ThemeTab';
import type { AdminTab } from '../types';
import type { Page } from '../lib/navigation';

interface AdminPageProps {
  onNavigate: (page: Page) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('settings');

  // While checking auth session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400" />
          <p className="text-sm text-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) {
    return <AdminLogin />;
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-cream">
        <div className="glass rounded-2xl p-10 text-center max-w-md">
          <p className="font-serif text-xl font-semibold mb-2">Accès refusé</p>
          <p className="text-sm text-muted mb-6">Votre compte n'a pas les droits d'administration.</p>
          <button onClick={() => onNavigate('home')} className="btn-gold">
            Retour au site
          </button>
        </div>
      </div>
    );
  }

  // Admin → show back-office
  function renderTab() {
    switch (activeTab) {
      case 'settings': return <SettingsTab />;
      case 'contents': return <ContentsTab />;
      case 'locations': return <LocationsTab />;
      case 'events': return <EventsTab />;
      case 'ministries': return <MinistriesTab />;
      case 'media': return <MediaTab />;
      case 'testimonials': return <TestimonialsTab />;
      case 'messages': return <MessagesTab />;
      case 'theme': return <ThemeTab />;
      default: return <SettingsTab />;
    }
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate}>
      {renderTab()}
    </AdminLayout>
  );
}