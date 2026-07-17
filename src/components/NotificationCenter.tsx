import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Check, CheckCheck, Info, Calendar, FileText, AlertTriangle,
  Heart, MessageSquare, X, Loader2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { NotificationItem } from '../types';

/* ═══════════════════════════════════════════════════════════════════
   Notification type config
   ═══════════════════════════════════════════════════════════════════ */
const NOTIF_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-divin-100" />,
  event_reminder: <Calendar className="h-4 w-4 text-amber-400" />,
  new_content: <FileText className="h-4 w-4 text-evangile-600" />,
  pastoral: <Heart className="h-4 w-4 text-pink-400" />,
  alert: <AlertTriangle className="h-4 w-4 text-orange-400" />,
  prayer: <MessageSquare className="h-4 w-4 text-purple-400" />,
  reminder: <Calendar className="h-4 w-4 text-amber-400" />,
  general: <Bell className="h-4 w-4 text-cream/70" />,
};

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  { id: 'd1', user_id: '', title: 'Culte de dimanche', message: 'Rappel : Le culte dominical commence à 9h00. Venez avec votre Bible !', type: 'info', is_read: false, link: '', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'd2', user_id: '', title: 'Nouvelle prédication', message: '« La Foi qui Vainc le Monde » par Pasteur Kazadi est maintenant disponible.', type: 'new_comment', is_read: false, link: '', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'd3', user_id: '', title: 'Pensée du jour', message: '"Confie-toi en l\'Éternel de tout ton cœur." — Proverbes 3:5', type: 'info', is_read: false, link: '', created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: 'd4', user_id: '', title: 'Visite pastorale', message: 'Une visite pastorale est prévue pour votre secteur cette semaine.', type: 'general', is_read: true, link: '', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'd5', user_id: '', title: 'Réunion de prière', message: 'La réunion de prière de mercredi est reportée à 19h30.', type: 'alert', is_read: true, link: '', created_at: new Date(Date.now() - 172800000).toISOString() },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ═══════════════════════════════════════════════════════════════════
   NotificationCenter Component
   ═══════════════════════════════════════════════════════════════════ */
export function NotificationCenter() {
  const { user, profile, unreadCount } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!profile || !isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data && data.length > 0) {
        setNotifications(data as NotificationItem[]);
      }
    } catch {
      /* empty — no notifications yet */
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) fetchNotifications();
  }, [profile, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;
    const channel = supabase
      .channel('notif-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error('markAsRead error:', error.message);
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (!profile || !isSupabaseConfigured) { setMarkingAll(false); return; }
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    if (error) console.error('markAllAsRead error:', error.message);
    setMarkingAll(false);
  };

  const unreadLocal = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-cream/70 hover:bg-white/5 hover:text-cream transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {(unreadCount > 0 || unreadLocal > 0) && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-evangile-600 text-[10px] font-bold text-white leading-none px-1">
            {unreadCount > 0 ? unreadCount : unreadLocal}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="glass absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl shadow-glass-lg overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="font-headline text-sm text-cream">Notifications</h3>
            {unreadLocal > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 text-xs text-evangile-600 hover:text-evangile-400 transition disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Bell className="h-8 w-8 text-muted/30 mb-3" />
                <p className="text-sm text-muted">Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 transition hover:bg-white/5 border-b border-white/5 last:border-0 ${
                    !n.is_read ? 'border-l-2 border-evangile-600 bg-evangile-600/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {NOTIF_ICONS[n.type] || NOTIF_ICONS.general}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${!n.is_read ? 'font-semibold text-cream' : 'text-cream/80'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-evangile-600" />}
                      </div>
                      <p className="text-xs text-muted line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted/60 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}