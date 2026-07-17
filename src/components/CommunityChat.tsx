'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MessageSquare, Users, LogIn, Loader2, X,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* ═══════════════════════════════════════════════════════════════════
   Types & Helpers
   ═══════════════════════════════════════════════════════════════════ */
interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface OnlineUser {
  id: string;
  full_name: string;
}

const DEMO_MESSAGES: ChatMessage[] = [
  { id: 'm1', user_id: 'u1', user_name: 'Marie Nzuzi', content: 'Bonjour à tous ! Que Dieu vous bénisse 🙏', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'm2', user_id: 'u2', user_name: 'Jean-Marc', content: 'Bonjour sœur Marie ! Joyeuse semaine.', created_at: new Date(Date.now() - 240000).toISOString() },
  { id: 'm3', user_id: 'u3', user_name: 'Pasteur Kazadi', content: 'N\'oubliez pas la réunion de prière ce mercredi à 18h. La présence de chacun compte !', created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'm4', user_id: 'u4', user_name: 'Grace Mbala', content: 'Amen Pasteur ! On sera là. Que le Seigneur nous rassemble.', created_at: new Date(Date.now() - 60000).toISOString() },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ═══════════════════════════════════════════════════════════════════
   CommunityChat Component
   ═══════════════════════════════════════════════════════════════════ */
export function CommunityChat() {
  const { user, profile, signIn } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [onlineUsers] = useState<OnlineUser[]>([
    { id: 'u1', full_name: 'Marie Nzuzi' },
    { id: 'u3', full_name: 'Pasteur Kazadi' },
    { id: 'u4', full_name: 'Grace Mbala' },
    { id: 'u5', full_name: 'Ancien Esaïe' },
  ]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, user_id, user_name, content, created_at')
        .order('created_at', { ascending: true })
        .limit(50);
      if (!error && data && data.length > 0) {
        setMessages(data as ChatMessage[]);
      }
    } catch {
      /* keep demo */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;
    setSending(true);
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    const msg: ChatMessage = {
      id: tempId,
      user_id: user?.id || 'demo',
      user_name: profile?.full_name || 'Vous',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);

    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            user_name: profile?.full_name || 'Membre',
            content: text,
          });
        if (!error) {
          // Replace temp message with real one handled by realtime
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
      } catch {
        /* message already added locally */
      }
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass rounded-2xl flex flex-col h-[480px] max-h-[70vh] overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-400/15">
            <MessageSquare className="h-4.5 w-4.5 text-accent-500" />
          </div>
          <div>
            <h3 className="font-headline text-sm text-cream">Communauté</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-muted">{onlineUsers.length} en ligne</span>
            </div>
          </div>
        </div>
        {/* Online avatars */}
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 4).map(u => (
            <div
              key={u.id}
              title={u.full_name}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-conquete-700 bg-accent-400/30 text-[10px] font-semibold text-cream"
            >
              {u.full_name.charAt(0)}
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-conquete-700 bg-white/10 text-[10px] text-muted">
              +{onlineUsers.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* ─── Messages ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : !user ? (
        /* Not authenticated */
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Users className="h-10 w-10 text-muted/30 mb-4" />
          <p className="text-sm text-cream/70 mb-1">Connectez-vous pour participer</p>
          <p className="text-xs text-muted mb-4">Rejoignez la conversation de la communauté.</p>
          <button
            onClick={() => signIn?.('demo@conquete.fr', 'demo').catch(() => {})}
            className="btn-primary text-xs px-5 py-2.5"
          >
            <LogIn className="h-4 w-4" />
            Se connecter
          </button>
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
            {messages.map(m => {
              const isOwn = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isOwn ? 'bg-evangile-600 text-white' : 'bg-white/10 text-cream/70'
                    }`}>
                      {m.user_name.charAt(0).toUpperCase()}
                    </div>
                    {/* Bubble */}
                    <div className={`${isOwn
                      ? 'bg-accent-400/20 rounded-2xl rounded-br-md'
                      : 'glass-card rounded-2xl rounded-bl-md'
                    } px-3.5 py-2.5`}>
                      {!isOwn && (
                        <p className="text-[10px] font-semibold text-accent-500 mb-0.5">{m.user_name}</p>
                      )}
                      <p className="text-sm text-cream leading-relaxed">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${isOwn ? 'text-muted/60 text-right' : 'text-muted/60'}`}>
                        {timeAgo(m.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Input ───────────────────────────────────────────── */}
          <div className="border-t border-white/10 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                className="input-surface flex-1 py-2.5 px-4 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-evangile-600 text-white transition hover:bg-evangile-700 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}