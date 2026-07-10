import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Check, Mail, Eye } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-surface-2" />
            <div className="h-4 w-1/3 rounded bg-surface-2" />
            <div className="ml-auto h-3 w-24 rounded bg-surface-2" />
          </div>
          <div className="mt-2 h-3 w-1/2 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageRow({
  message,
  isExpanded,
  onToggle,
  onMarkRead,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
}: {
  message: ContactMessage;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  setDeleteConfirm: (v: boolean) => void;
}) {
  return (
    <div className={`glass rounded-2xl transition ${!message.is_read ? 'ring-1 ring-gold-400/20' : ''}`}>
      {/* Row header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left"
      >
        {/* Unread dot */}
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${message.is_read ? 'bg-surface-2' : 'bg-gold-400'}`} />

        {/* Name */}
        <span className={`text-sm ${message.is_read ? 'font-medium text-cream/80' : 'font-semibold text-cream'}`}>
          {message.name}
        </span>

        {/* Subject */}
        <span className="hidden flex-1 truncate text-sm text-muted sm:block">
          {message.subject}
        </span>

        {/* Date */}
        <span className="shrink-0 text-xs text-muted">
          {formatDate(message.created_at)}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-line px-5 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Nom</span>
              <p className="text-sm text-cream">{message.name}</p>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Email</span>
              <a
                href={`mailto:${message.email}`}
                className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition"
              >
                <Mail className="h-3.5 w-3.5" />
                {message.email}
              </a>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Sujet</span>
            <p className="text-sm font-medium text-cream">{message.subject}</p>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Message</span>
            <div className="rounded-xl bg-surface-2/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream/80">{message.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkRead}
              className="btn-gold inline-flex items-center gap-2 px-4 py-2 text-xs font-medium"
            >
              <Eye className="h-3.5 w-3.5" />
              {message.is_read ? 'Marquer comme non lu' : 'Marquer comme lu'}
            </button>

            {deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Confirmer ?</span>
                <button
                  onClick={onDelete}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500/20 px-3 text-xs font-medium text-red-400 hover:bg-red-500/30 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Oui
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="btn-ghost px-3 py-2 text-xs"
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 px-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MessagesTab() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      addToast('Erreur lors du chargement des messages', 'error');
    } else {
      setMessages(data as ContactMessage[]);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const unreadCount = messages.filter(m => !m.is_read).length;

  const handleToggleRead = async (message: ContactMessage) => {
    const newReadState = !message.is_read;

    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: newReadState })
      .eq('id', message.id);

    if (error) {
      addToast('Erreur lors de la mise à jour', 'error');
    } else {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, is_read: newReadState } : m),
      );
      addToast(newReadState ? 'Message marqué comme lu' : 'Message marqué comme non lu', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      addToast('Erreur lors de la suppression', 'error');
    } else {
      addToast('Message supprimé', 'success');
      setDeleteConfirmId(null);
      if (expandedId === id) setExpandedId(null);
      fetchMessages();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Messages</h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-gold-400/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold-400">
            {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <SkeletonList />
      ) : messages.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-muted">Aucun message reçu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <MessageRow
              key={msg.id}
              message={msg}
              isExpanded={expandedId === msg.id}
              onToggle={() => setExpandedId(prev => (prev === msg.id ? null : msg.id))}
              onMarkRead={() => handleToggleRead(msg)}
              onDelete={() => handleDelete(msg.id)}
              deleteConfirm={deleteConfirmId === msg.id}
              setDeleteConfirm={(v) => setDeleteConfirmId(v ? msg.id : null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}