import { useState, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { downloadLocalBackup } from '../../lib/localBackend';
import {
  Settings, FileText, MapPin, Calendar, Users,
  Image, MessageSquare, Palette, LogOut, ChevronRight,
  Menu, X, Crown, Bell, Heart,
  ClipboardList, Shield, Clock, Building2, LayoutDashboard,
  UserCheck, BookOpen, Zap, Radio, MonitorPlay, Headphones,
  Megaphone, Tv, ScrollText, Newspaper, HardDrive, Download,
} from 'lucide-react';
import type { AdminTab } from '../../types';
import type { Page } from '../../lib/navigation';

// ─── Grouped tab definitions ──────────────────────────────────────
interface TabDef { id: AdminTab; label: string; Icon: typeof Settings }
interface TabGroup { title: string; tabs: TabDef[] }

const tabGroups: TabGroup[] = [
  {
    title: 'Monitoring',
    tabs: [
      { id: 'dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
      { id: 'users', label: 'Utilisateurs', Icon: Shield },
      { id: 'alerts', label: 'Alertes & Visites', Icon: Bell },
    ],
  },
  {
    title: 'Pages',
    tabs: [
      { id: 'homepage_builder', label: "Accueil — sections", Icon: LayoutDashboard },
      { id: 'guide', label: 'Guide', Icon: BookOpen },
    ],
  },
  {
    title: 'Contenu',
    tabs: [
      { id: 'contents', label: 'Autres pages', Icon: FileText },
      { id: 'visuals', label: 'Photos & vidéos', Icon: Image },
      { id: 'articles', label: 'Articles & actualités', Icon: Newspaper },
      { id: 'activity_cards', label: 'Cartes Explorer', Icon: Image },
      { id: 'predications', label: 'Prédications', Icon: Radio },
      { id: 'audio', label: 'Audio', Icon: Headphones },
      { id: 'theme', label: 'Thème', Icon: Palette },
      { id: 'animations', label: 'Animations', Icon: Zap },
      { id: 'testimonials', label: 'Témoignages', Icon: MessageSquare },
      { id: 'messages', label: 'Messages', Icon: MessageSquare },
      { id: 'annonces', label: 'Annonces', Icon: Megaphone },
      { id: 'communiques', label: 'Communiqués', Icon: ScrollText },
      { id: 'emissions', label: 'Émissions', Icon: Tv },
    ],
  },
  {
    title: 'Organisation',
    tabs: [
      { id: 'departments', label: 'Départements', Icon: Building2 },
      { id: 'ministries', label: 'Ministères', Icon: Users },
      { id: 'assignments', label: 'Affectations', Icon: Users },
      { id: 'creneaux', label: 'Créneaux', Icon: Clock },
      { id: 'events', label: 'Événements', Icon: Calendar },
      { id: 'locations', label: 'Lieux & extensions', Icon: MapPin },
      { id: 'media_communication', label: 'Média & Communication', Icon: MonitorPlay },
    ],
  },
  {
    title: 'Pastorale',
    tabs: [
      { id: 'pastors', label: 'Équipe Pastorale', Icon: Crown },
      { id: 'pipeline', label: 'Pipeline Âmes', Icon: Heart },
      { id: 'onboarding', label: 'Onboarding', Icon: ClipboardList },
      { id: 'protocol', label: 'Protocole', Icon: UserCheck },
      { id: 'evangelism', label: 'Évangélisation', Icon: Heart },
    ],
  },
  {
    title: 'Système',
    tabs: [
      { id: 'settings', label: 'Paramètres', Icon: Settings },
      { id: 'live_stream', label: 'Live / Direct', Icon: Radio },
    ],
  },
];

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onNavigate: (page: Page) => void;
  children: ReactNode;
  isFullAdmin?: boolean;
}

// Onglets autorisés pour les pasteurs (liste blanche)
const ALLOWED_TABS_FOR_PASTOR = new Set<AdminTab>([
  'homepage_builder', 'guide',
  'predications', 'audio', 'testimonials', 'messages',
  'annonces', 'communiques', 'emissions', 'articles',
  'visuals',
  'creneaux', 'media_communication',
  'pipeline', 'onboarding', 'protocol', 'evangelism',
]);

// Onglets masqués pour les utilisateurs niveau 4 (diacre, collaborateur, etc.)
const HIDDEN_TABS_FOR_LEVEL4 = new Set<AdminTab>([
  'theme', 'settings',
  'pipeline', 'creneaux',
]);

function SidebarNav({
  activeTab,
  onTabChange,
  onClose,
  isFullAdmin = true,
  userRoleLevel = 0,
  isPrincipalPastor = false,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onClose?: () => void;
  isFullAdmin?: boolean;
  userRoleLevel?: number;
  isPrincipalPastor?: boolean;
}) {
  // Filtrer les onglets selon le rôle
  let allowedTabs: Set<AdminTab> | null = null;
  let hiddenTabs = new Set<AdminTab>();
  if (isPrincipalPastor || (!isFullAdmin && userRoleLevel >= 5)) {
    allowedTabs = ALLOWED_TABS_FOR_PASTOR;
  } else if (!isFullAdmin && userRoleLevel >= 4) {
    hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;
  } else if (!isFullAdmin) {
    allowedTabs = ALLOWED_TABS_FOR_PASTOR;
  }

  const visibleGroups = (allowedTabs === null && hiddenTabs.size === 0) ? tabGroups
    : tabGroups.map(g => ({
      ...g,
      tabs: g.tabs.filter(t =>
        (allowedTabs === null || allowedTabs.has(t.id)) && !hiddenTabs.has(t.id)
      ),
    })).filter(g => g.tabs.length > 0);

  return (
    <nav className="flex-1 overflow-y-auto py-5">
      {visibleGroups.map((group, gi) => (
        <div key={group.title} className={gi > 0 ? 'mt-6' : ''}>
          {/* ── Section header ── */}
          <div className="mb-1 flex items-center gap-2 px-4">
            <span className="h-1.5 w-1.5 shrink-0 bg-evangile-600" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted">
              {group.title}
            </span>
          </div>
          {/* ── Tab items ── */}
          <div className="flex flex-col">
            {group.tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { onTabChange(id); onClose?.(); }}
                className={`group flex items-center gap-2.5 border-l-2 py-2 pl-[14px] pr-4 text-left text-[13px] font-medium transition-colors duration-200 ${
                  activeTab === id
                    ? 'border-evangile-600 bg-white/[0.04] text-cream'
                    : 'border-transparent text-muted hover:border-line hover:bg-white/[0.02] hover:text-cream'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    activeTab === id ? 'text-[rgb(var(--accent-red-rgb))]' : 'text-muted group-hover:text-cream'
                  }`}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout({ activeTab, onTabChange, onNavigate, children, isFullAdmin = true }: AdminLayoutProps) {
  const { profile, signOut, isLocalMode } = useAuth();
  const { addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userRoleLevel = profile?.role_level ?? 0;
  const isPrincipalPastor = profile?.is_principal_pastor ?? false;

  async function handleSignOut() {
    try {
      await signOut();
      addToast('Déconnexion réussie', 'success');
    } catch {
      addToast('Erreur lors de la déconnexion', 'error');
    }
  }

  async function handleBackup() {
    try {
      await downloadLocalBackup();
      addToast('Sauvegarde exportée', 'success');
    } catch {
      addToast('Export impossible', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* ─── Top bar ─── */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600/50 hover:text-cream lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="logo-plate transition-opacity duration-200 hover:opacity-80"
              aria-label="La Conquête — Voir le site"
            >
              <img
                src="/logo-conquete.png"
                alt="Église Évangélique La Conquête"
                className="h-9 w-auto object-contain"
              />
            </button>
            <span className="hidden h-8 w-px shrink-0 bg-line sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 shrink-0 bg-evangile-600" />
              <span className="font-hero text-lg uppercase leading-none tracking-[0.08em] text-cream">
                Back-office
              </span>
            </div>
            {isLocalMode && (
              <span className="shrink-0 border border-evangile-600/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-red-rgb))]">
                Local
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('home')}
              className="btn-ghost hidden px-3 py-2 text-[10px] uppercase tracking-[0.16em] sm:flex"
            >
              Voir le site
              <ChevronRight className="h-3 w-3" />
            </button>
            <div className="flex items-center gap-2.5 border border-line bg-white/[0.03] px-2.5 py-1.5">
              <span className="flex h-6 w-6 items-center justify-center bg-accent-400/15 font-hero text-[11px] leading-none text-accent-400">
                {(profile?.full_name ?? profile?.email ?? 'A').charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[130px] truncate text-xs text-cream sm:inline">
                {profile?.full_name ?? profile?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600/50 hover:text-[rgb(var(--accent-red-rgb))]"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ─── Sidebar (desktop) ─── */}
        <aside className="hidden border-r border-line bg-bg/50 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:w-60 lg:flex-col">
          <SidebarNav activeTab={activeTab} onTabChange={onTabChange} isFullAdmin={isFullAdmin} userRoleLevel={userRoleLevel} isPrincipalPastor={isPrincipalPastor} />
        </aside>

        {/* ─── Mobile sidebar overlay ─── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <aside className="relative flex h-full w-72 flex-col border-r border-line bg-bg">
              <div className="flex h-16 items-center justify-between border-b border-line px-4">
                <div className="flex items-center gap-3">
                  <span className="logo-plate">
                    <img
                      src="/logo-conquete.png"
                      alt="Église Évangélique La Conquête"
                      className="h-8 w-auto object-contain"
                    />
                  </span>
                  <span className="font-hero text-lg uppercase leading-none tracking-[0.06em] text-cream">
                    Back-office
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:text-cream"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarNav activeTab={activeTab} onTabChange={onTabChange} onClose={() => setSidebarOpen(false)} isFullAdmin={isFullAdmin} userRoleLevel={userRoleLevel} isPrincipalPastor={isPrincipalPastor} />
            </aside>
          </div>
        )}

        {/* ─── Main content ─── */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
            {isLocalMode && (
              <div className="mb-6 flex flex-col gap-3 border border-line border-l-2 border-l-evangile-600 bg-bg-card px-4 py-3 sm:flex-row sm:items-center">
                <HardDrive className="h-4 w-4 shrink-0 text-[rgb(var(--accent-red-rgb))]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream">
                    Mode local
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Aucune donnée envoyée sur Internet — tout est enregistré dans{' '}
                    <code className="bg-white/10 px-1 text-cream">.local-admin/</code> sur cet ordinateur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleBackup()}
                  className="btn-ghost shrink-0 px-3 py-2 text-[10px] uppercase tracking-[0.14em]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Exporter
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}