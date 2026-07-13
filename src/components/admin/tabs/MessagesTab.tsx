import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { Trash2, Mail, Eye, Phone, User, CheckCircle, Clock, MessageSquare } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  visitor_type: string | null;
  status: string;
  assigned_to: string | null;
  handled_at: string | null;
  handler_notes: string | null;
  created_at: string;
}

const VISITOR_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  visiteur: 'Visiteur',
  membre: 'Membre',
  autre: 'Autre',
};

const VISITOR_COLORS: Record<string, string> = {
  nouveau: 'bg-emerald-500/15 text-emerald-400',
  visiteur: 'bg-sky-500/15 text-sky-400',
  membre: 'bg-gold-400/15 text-gold-400',
  autre: 'bg-white/5 text-muted',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  nouveau: { label: 'Nouveau', color: 'bg-amber-500/15 text-amber-400', Icon: MessageSquare },
  en_cours: { label: 'En cours', color: 'bg-sky-500/15 text-sky-400', Icon: Clock },
  traite: { label: 'Traité', color: 'bg-emerald-500/15 text-emerald-400', Icon: CheckCircle },
  ferme: { label: 'Fermé', color: 'bg-white/5 text-muted', Icon: CheckCircle },
};

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
  onStatusChange,
  onAddNotes,
  deleteConfirm,
  setDeleteConfirm,
}: {
  message: ContactMessage;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onAddNotes: (notes: string) => void;
  deleteConfirm: boolean;
  setDeleteConfirm: (v: boolean) => void;
}) {
  const [notes, setNotes] = useState(message.handler_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const statusCfg = STATUS_CONFIG[message.status] || STATUS_CONFIG.nouveau;
  const visitorCfg = message.visitor_type ? VISITOR_COLORS[message.visitor_type] : null;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onAddNotes(notes);
    setSavingNotes(false);
  };

  return (
    <div className={`glass rounded-2xl transition ${!message.is_read ? 'ring-1 ring-gold-400/20' : ''}`}>
      {/* Row header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left"
      >
        {/* Unread dot */}
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${message.is_read ? 'bg-surface-2' : 'bg-gold-400'}`} />

        {/* Visitor type badge */}
        {visitorCfg && (
          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium ${visitorCfg}`}>
            {VISITOR_LABELS[message.visitor_type!] || message.visitor_type}
          </span>
        )}

        {/* Name */}
        <span className={`text-sm ${message.is_read ? 'font-medium text-cream/80' : 'font-semibold text-cream'}`}>
          {message.name}
        </span>

        {/* Subject */}
        <span className="hidden flex-1 truncate text-sm text-muted sm:block">
          {message.subject}
        </span>

        {/* Status badge */}
        <span className={`shrink-0 hidden items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${statusCfg.color}`}>
          <statusCfg.Icon className="h-3 w-3" />
          {statusCfg.label}
        </span>

        {/* Date */}
        <span className="shrink-0 text-xs text-muted">
          {formatDate(message.created_at)}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-line px-5 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Nom</span>
              <p className="text-sm text-cream">{message.name}</p>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Téléphone</span>
              {message.phone ? (
                <a
                  href={`tel:${message.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {message.phone}
                </a>
              ) : (
                <p className="text-sm text-muted">Non renseigné</p>
              )}
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Email</span>
              {message.email ? (
                <a
                  href={`mailto:${message.email}`}
                  className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {message.email}
                </a>
              ) : (
                <p className="text-sm text-muted">Non renseigné</p>
              )}
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

          {/* Status handling (créneau) */}
          <div>
            <span className="mb-2 block text-xs font-medium text-muted">Statut du créneau</span>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG.nouveau][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                    message.status === key
                      ? `${cfg.color} border-current/20`
                      : 'border-line text-muted hover:text-cream hover:border-white/20'
                  }`}
                >
                  <cfg.Icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Handler notes */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Notes de suivi</span>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter des notes de suivi..."
                className="input-surface flex-1 px-3 py-2 text-sm resize-none"
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === (message.handler_notes || '')}
                className="btn-gold px-3 py-2 text-xs disabled:opacity-50"
              >
                {savingNotes ? '...' : 'Sauver'}
              </button>
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
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      q = q.eq('status', filterStatus);
    }

    const { data, error } = await q;

    if (error) {
      addToast('Erreur lors du chargement des messages', 'error');
    } else {
      setMessages((data as ContactMessage[]) ?? []);
    }
    setLoading(false);
  }, [addToast, filterStatus]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const unreadCount = messages.filter(m => !m.is_read).length;
  const nouveauCount = messages.filter(m => m.status === 'nouveau').length;
  const enCoursCount = messages.filter(m => m.status === 'en_cours').length;

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

  const handleStatusChange = async (message: ContactMessage, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'en_cours') {
      updates.assigned_to = profile?.id || null;
    }
    if (newStatus === 'traite' || newStatus === 'ferme') {
      updates.handled_at = new Date().toISOString();
      updates.assigned_to = profile?.id || null;
    }

    const { error } = await supabase
      .from('contact_messages')
      .update(updates)
      .eq('id', message.id);

    if (error) {
      addToast('Erreur lors de la mise à jour du statut', 'error');
    } else {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, ...updates } : m),
      );
      addToast('Statut mis à jour', 'success');
    }
  };

  const handleAddNotes = async (message: ContactMessage, notes: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ handler_notes: notes })
      .eq('id', message.id);

    if (error) {
      addToast('Erreur lors de la sauvegarde des notes', 'error');
    } else {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, handler_notes: notes } : m),
      );
      addToast('Notes sauvegardées', 'success');
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
        <h2 className="font-serif text-2xl font-semibold text-cream">Messages de Contact</h2>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="rounded-full bg-gold-400/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gold-400">
              {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </span>
          )}
          {nouveauCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
              {nouveauCount} nouveau{x}
            </span>
          )}
          {enCoursCount > 0 && (
            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sky-400">
              {enCoursCount} en cours
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'nouveau', label: 'Nouveaux' },
          { key: 'en_cours', label: 'En cours' },
          { key: 'traite', label: 'Traités' },
          { key: 'ferme', label: 'Fermés' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
              filterStatus === f.key
                ? 'border-gold-400/50 bg-gold-400/10 text-gold-400'
                : 'border-line text-muted hover:text-cream hover:border-white/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList />
      ) : messages.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-muted">
            {filterStatus === 'all' ? 'Aucun message reçu.' : `Aucun message "${STATUS_CONFIG[filterStatus]?.label || filterStatus}".`}
          </p>
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
              onStatusChange={(s) => handleStatusChange(msg, s)}
              onAddNotes={(n) => handleAddNotes(msg, n)}
              deleteConfirm={deleteConfirmId === msg.id}
              setDeleteConfirm={(v) => setDeleteConfirmId(v ? msg.id : null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}