import { useState, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Settings, FileText, MapPin, Calendar, Users,
  Image, MessageSquare, Palette, LogOut, ChevronRight,
  Menu, X, Landmark, Crown, Package, Bell, Heart,
  ClipboardList, Shield, Clock, Building2, LayoutDashboard,
  UserCheck, Blocks, Zap, Radio,
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
      { id: 'homepage_builder', label: "Page d'accueil", Icon: LayoutDashboard },
      { id: 'page_builder', label: 'Autres pages', Icon: Blocks },
    ],
  },
  {
    title: 'Contenu',
    tabs: [
      { id: 'contents', label: 'Contenus', Icon: FileText },
      { id: 'media', label: 'Médias', Icon: Image },
      { id: 'theme', label: 'Thème', Icon: Palette },
      { id: 'animations', label: 'Animations', Icon: Zap },
      { id: 'testimonials', label: 'Témoignages', Icon: MessageSquare },
      { id: 'messages', label: 'Messages', Icon: MessageSquare },
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
      { id: 'locations', label: 'Lieux', Icon: MapPin },
      { id: 'inventory', label: 'Inventaire', Icon: Package },
    ],
  },
  {
    title: 'Pastorale',
    tabs: [
      { id: 'pastors', label: 'Équipe Pastorale', Icon: Crown },
      { id: 'pipeline', label: 'Pipeline Âmes', Icon: Heart },
      { id: 'onboarding', label: 'Onboarding', Icon: ClipboardList },
      { id: 'protocol', label: 'Protocole', Icon: UserCheck },
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

// Onglets masqués pour le pasteur principal (consultation uniquement)
const HIDDEN_TABS_FOR_PASTOR = new Set<AdminTab>([
  'theme', 'settings', 'inventory', 'media',
  'pipeline', 'onboarding', 'protocol', 'creneaux',
]);

// Onglets masqués pour les utilisateurs niveau 4 (diacre, collaborateur, etc.)
const HIDDEN_TABS_FOR_LEVEL4 = new Set<AdminTab>([
  'theme', 'settings', 'inventory', 'media',
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
  let hiddenTabs = new Set<AdminTab>();
  if (isPrincipalPastor) {
    hiddenTabs = HIDDEN_TABS_FOR_PASTOR;
  } else if (!isFullAdmin && userRoleLevel >= 4) {
    hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;
  } else if (!isFullAdmin) {
    hiddenTabs = HIDDEN_TABS_FOR_PASTOR;
  }

  const visibleGroups = hiddenTabs.size === 0 ? tabGroups : tabGroups.map(g => ({
    ...g,
    tabs: g.tabs.filter(t => !hiddenTabs.has(t.id)),
  })).filter(g => g.tabs.length > 0);

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      {visibleGroups.map((group, gi) => (
        <div key={group.title} className={gi > 0 ? 'mt-4' : ''}>
          {/* ── Section header ── */}
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted/60 mb-1 px-3">
            {group.title}
          </div>
          {/* ── Divider line ── */}
          <div className="h-px bg-line mb-1 mx-3" />
          {/* ── Tab items ── */}
          <div className="flex flex-col gap-0.5">
            {group.tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { onTabChange(id); onClose?.(); }}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-evangile-600/10 text-evangile-500'
                    : 'text-muted hover:text-cream hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
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
  const { profile, signOut } = useAuth();
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

  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* ─── Top bar ─── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/90 backdrop-blur-xl px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-cream transition lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-evangile-500" />
            <span className="font-serif text-lg font-semibold text-cream">Back-Office</span>
            <span className="hidden text-xs text-muted sm:inline">La Conquête</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-cream transition sm:flex"
          >
            Voir le site
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-evangile-600/20 text-[10px] font-bold text-evangile-500">
              {(profile?.full_name ?? profile?.email ?? 'A').charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-xs text-cream sm:inline max-w-[120px] truncate">
              {profile?.full_name ?? profile?.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-ember-400 hover:border-ember-500/40 transition"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* ─── Sidebar (desktop) ─── */}
        <aside className="hidden lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:w-56 lg:flex-col lg:border-r border-line bg-bg/50">
          <SidebarNav activeTab={activeTab} onTabChange={onTabChange} isFullAdmin={isFullAdmin} userRoleLevel={userRoleLevel} isPrincipalPastor={isPrincipalPastor} />
        </aside>

        {/* ─── Mobile sidebar overlay ─── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative flex h-full w-64 flex-col bg-bg border-r border-line">
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <span className="font-serif font-semibold text-cream">Navigation</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-cream transition"
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
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-5xl p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}