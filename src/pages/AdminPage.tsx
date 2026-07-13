import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AdminLogin from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { DashboardTab } from '../components/admin/tabs/DashboardTab';
import { SettingsTab } from '../components/admin/tabs/SettingsTab';
import { ContentsTab } from '../components/admin/tabs/ContentsTab';
import { LocationsTab } from '../components/admin/tabs/LocationsTab';
import { EventsTab } from '../components/admin/tabs/EventsTab';
import { DepartmentsTab } from '../components/admin/tabs/DepartmentsTab';
import { MinistriesTab } from '../components/admin/tabs/MinistriesTab';
import { MediaTab } from '../components/admin/tabs/MediaTab';
import { TestimonialsTab } from '../components/admin/tabs/TestimonialsTab';
import { MessagesTab } from '../components/admin/tabs/MessagesTab';
import { ThemeTab } from '../components/admin/tabs/ThemeTab';
import { PastorsTab } from '../components/admin/tabs/PastorsTab';
import { AssignmentsTab } from '../components/admin/tabs/AssignmentsTab';
import { InventoryTab } from '../components/admin/tabs/InventoryTab';
import { AlertsTab } from '../components/admin/tabs/AlertsTab';
import { PipelineTab } from '../components/admin/tabs/PipelineTab';
import { OnboardingTab } from '../components/admin/tabs/OnboardingTab';
import { UsersTab } from '../components/admin/tabs/UsersTab';
import { CreneauxTab } from '../components/admin/tabs/CreneauxTab';
import { ProtocolTab } from '../components/admin/tabs/ProtocolTab';
import { RefreshCw, ShieldOff, Eye } from '../lib/icons';
import type { AdminTab } from '../types';
import type { Page } from '../lib/navigation';

interface AdminPageProps {
  onNavigate: (page: Page) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user, isAdmin, isFullAdmin, loading, profileLoading, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [fixing, setFixing] = useState(false);
  const [diagInfo, setDiagInfo] = useState<string | null>(null);

  // Force fix: check admin status directly from DB and update profile
  const handleForceFix = async () => {
    if (!user) return;
    setFixing(true);
    setDiagInfo(null);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, is_admin, role_level, role')
        .eq('id', user.id)
        .single();

      if (error) {
        setDiagInfo(`Erreur DB: ${error.message}`);
      } else if (!data) {
        setDiagInfo('Aucun profil trouvé en base. Exécutez le SQL de création de profil.');
      } else {
        const d = data as any;
        setDiagInfo(`Profil trouvé: is_admin=${d.is_admin}, role_level=${d.role_level}, role=${d.role}`);

        if (!d.is_admin && d.role_level < 5) {
          // Auto-fix: update the profile to admin
          const { error: updateErr } = await supabase
            .from('user_profiles')
            .update({ is_admin: true, role_level: 6 })
            .eq('id', user.id);
          if (updateErr) {
            setDiagInfo(prev => `${prev} | Erreur mise à jour: ${updateErr.message}`);
          } else {
            setDiagInfo(prev => `${prev} | Correction appliquée ! Rechargement...`);
            await refreshProfile();
          }
        } else {
          // Profile is admin in DB, refresh to sync
          await refreshProfile();
          setDiagInfo(prev => `${prev} | Profil rafraîchi.`);
        }
      }
    } catch (err: any) {
      setDiagInfo(`Erreur: ${err.message}`);
    } finally {
      setFixing(false);
    }
  };

  // While checking auth session or loading profile after login
  if (loading || profileLoading) {
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

  // Logged in but not admin → show diagnostic + fix button
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-cream px-4">
        <div className="glass rounded-2xl p-10 text-center max-w-lg w-full">
          <ShieldOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="font-serif text-xl font-semibold mb-2">Accès refusé</p>
          <p className="text-sm text-muted mb-4">Votre compte n'a pas les droits d'administration.</p>

          {/* Diagnostic info */}
          <div className="bg-white/5 rounded-xl p-4 mb-4 text-left text-xs font-mono space-y-1 border border-white/10">
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

          {diagInfo && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 text-xs text-blue-300">
              {diagInfo}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleForceFix}
              disabled={fixing}
              className="btn-gold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${fixing ? 'animate-spin' : ''}`} />
              {fixing ? 'Vérification…' : 'Diagnostiquer & Corriger'}
            </button>
            <button onClick={() => onNavigate('home')} className="btn-ghost">
              Retour au site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin → show back-office
  function renderTab() {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab onTabChange={setActiveTab} />;
      case 'settings': return <SettingsTab />;
      case 'contents': return <ContentsTab />;
      case 'locations': return <LocationsTab />;
      case 'events': return <EventsTab />;
      case 'departments': return <DepartmentsTab />;
      case 'assignments': return <AssignmentsTab />;
      case 'creneaux': return <CreneauxTab />;
      case 'ministries': return <MinistriesTab />;
      case 'inventory': return <InventoryTab />;
      case 'alerts': return <AlertsTab />;
      case 'pipeline': return <PipelineTab />;
      case 'media': return <MediaTab />;
      case 'testimonials': return <TestimonialsTab />;
      case 'messages': return <MessagesTab />;
      case 'pastors': return <PastorsTab />;
      case 'onboarding': return <OnboardingTab />;
      case 'users': return <UsersTab />;
      case 'theme': return <ThemeTab />;
      case 'protocol': return <ProtocolTab />;
      default: return <DashboardTab onTabChange={setActiveTab} />;
    }
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate}>
      {/* Bannière lecture seule pour Pasteur principal */}
      {isAdmin && !isFullAdmin && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <Eye className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">Mode Pasteur principal — Consultation</p>
            <p className="text-xs text-amber-300/70 mt-0.5">Vous pouvez voir les statistiques et rapports. Les ajouts, suppressions et assignations de rôles sont réservés à l'Admin.</p>
          </div>
        </div>
      )}
      {renderTab()}
    </AdminLayout>
  );
}