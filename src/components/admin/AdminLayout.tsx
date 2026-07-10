import { useState, type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Settings, FileText, MapPin, Calendar, Users,
  Image, MessageSquare, Palette, LogOut, ChevronRight,
  Menu, X, Church
} from 'lucide-react';
import type { AdminTab } from '../../types';
import type { Page } from '../../lib/navigation';

// ─── Tab definitions ─────────────────────────────────────────────
const tabs: { id: AdminTab; label: string; Icon: typeof Settings }[] = [
  { id: 'settings', label: 'Paramètres', Icon: Settings },
  { id: 'contents', label: 'Contenus', Icon: FileText },
  { id: 'locations', label: 'Lieux', Icon: MapPin },
  { id: 'events', label: 'Événements', Icon: Calendar },
  { id: 'ministries', label: 'Ministères', Icon: Users },
  { id: 'media', label: 'Médias', Icon: Image },
  { id: 'testimonials', label: 'Témoignages', Icon: MessageSquare },
  { id: 'messages', label: 'Messages', Icon: MessageSquare },
  { id: 'theme', label: 'Thème', Icon: Palette },
];

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, onNavigate, children }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();
  const { addToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            <Church className="h-5 w-5 text-gold-400" />
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
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400/20 text-[10px] font-bold text-gold-400">
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
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-0.5">
              {tabs.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-gold-400/10 text-gold-400'
                      : 'text-muted hover:text-cream hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </nav>
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
              <nav className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-0.5">
                  {tabs.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => { onTabChange(id); setSidebarOpen(false); }}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        activeTab === id
                          ? 'bg-gold-400/10 text-gold-400'
                          : 'text-muted hover:text-cream hover:bg-white/5'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </nav>
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