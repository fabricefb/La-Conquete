import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { db } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import {
  Bell, Phone, Mail, Send, Plus, Search, MessageSquare, Heart, Upload, Download,
  Filter, FileText, Radio, Users, Clock, CheckCircle, Eye, Image, Video, Music,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import type {
  PrayerRequest as PrayerReqType,
  PrayerRequestStatus,
  PrayerRequestVisibility,
  CommunicationMessage,
  MediaLibraryItem,
} from '../types';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

interface CommunicationPageProps {
  onNavigate: (page: Page) => void;
}

type TabKey = 'priere' | 'communication' | 'medias' | 'newsletter';

const TABS: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'priere', label: 'Requêtes de Prière', icon: Heart },
  { key: 'communication', label: 'Centre de Communication', icon: MessageSquare },
  { key: 'medias', label: 'Bibliothèque Médias', icon: FileText },
  { key: 'newsletter', label: 'Newsletter', icon: Mail },
];

const STATUS_BADGES: Record<PrayerRequestStatus, { label: string; color: string; bg: string }> = {
  nouveau: { label: 'Nouveau', color: 'text-sky-300', bg: 'bg-sky-500/15' },
  en_priere: { label: 'En prière', color: 'text-amber-300', bg: 'bg-amber-500/15' },
  repondu: { label: 'Répondu', color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
  suivi_pastoral: { label: 'Suivi pastoral', color: 'text-rose-300', bg: 'bg-rose-500/15' },
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
  push: 'Push',
  in_app: 'In-App',
};

const CHANNEL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  sms: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  push: Bell,
  in_app: MessageSquare,
};

const MSG_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Brouillon', color: 'text-muted', bg: 'bg-white/5' },
  scheduled: { label: 'Programmé', color: 'text-amber-300', bg: 'bg-amber-500/15' },
  sent: { label: 'Envoyé', color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
  failed: { label: 'Échoué', color: 'text-rose-300', bg: 'bg-rose-500/15' },
};

const MEDIA_CATEGORIES: { value: MediaLibraryItem['category']; label: string }[] = [
  { value: 'tract', label: 'Trait' },
  { value: 'guide', label: 'Guide' },
  { value: 'affiche', label: 'Affiche' },
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Vidéo' },
  { value: 'document', label: 'Document' },
  { value: 'autre', label: 'Autre' },
];

const TARGET_TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous les membres' },
  { value: 'department', label: 'Département' },
  { value: 'cellule', label: 'Cellule de maison' },
  { value: 'role', label: 'Rôle spécifique' },
  { value: 'custom', label: 'Sélection personnalisée' },
];

/* ═══════════════════════════════════════════════════════════════════
   IntersectionObserver reveal
   ═══════════════════════════════════════════════════════════════════ */

function useEvtReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function EvtReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useEvtReveal();
  return (
    <div ref={ref} className={`evt-reveal ${inView ? 'in' : ''} ${delay ? `evt-reveal-delay-${delay}` : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function getFileTypeIcon(fileType: string): React.FC<{ className?: string }> {
  if (fileType?.startsWith('video')) return Video;
  if (fileType?.startsWith('audio')) return Music;
  if (fileType?.startsWith('image')) return Image;
  return FileText;
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 1 — Requêtes de Prière
   ═══════════════════════════════════════════════════════════════════ */

interface PrayerFormData {
  title: string;
  content: string;
  is_anonymous: boolean;
  visibility: PrayerRequestVisibility;
}

function PrayerTab({ profile, addToast }: { profile: any; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [requests, setRequests] = useState<PrayerReqType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PrayerFormData>({ title: '', content: '', is_anonymous: false, visibility: 'public' });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const isIntercessor = profile ? (profile.is_admin === true || profile.role_level >= 4) : false;

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await db.getPrayerRequests();
      setRequests((data as unknown as PrayerReqType[]) || []);
    } catch (err) {
      console.error('Load prayer requests error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) {
      addToast('Veuillez remplir le titre et la description.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await db.createPrayerRequest({
        title: form.title.trim(),
        content: form.content.trim(),
        is_anonymous: form.is_anonymous,
        visibility: form.visibility,
      });
      addToast('Requête de prière soumise avec succès.', 'success');
      setForm({ title: '', content: '', is_anonymous: false, visibility: 'public' });
      setShowForm(false);
      loadRequests();
    } catch (err) {
      console.error('Submit prayer request error:', err);
      addToast("Erreur lors de la soumission de la requête.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePray(req: PrayerReqType) {
    try {
      await db.updatePrayerRequestStatus(req.id, 'en_priere');
      addToast('Nous prions avec vous ! 🙏', 'success');
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'en_priere' as PrayerRequestStatus, prayer_count: (r as any).prayer_count + 1 } : r));
    } catch {
      addToast('Erreur lors de la mise à jour.', 'error');
    }
  }

  async function handleMarkReplied(reqId: string) {
    if (!responseText.trim()) {
      addToast('Veuillez écrire une réponse.', 'error');
      return;
    }
    try {
      await db.updatePrayerRequestStatus(reqId, 'repondu');
      addToast('Requête marquée comme répondue.', 'success');
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'repondu' as PrayerRequestStatus } : r));
      setRespondingTo(null);
      setResponseText('');
    } catch {
      addToast('Erreur lors de la mise à jour.', 'error');
    }
  }

  const filtered = requests.filter(r =>
    r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r as any).title?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header & actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-headline-lg font-display text-cream">Mur de Prière</h2>
          <p className="text-body-lg text-muted mt-1">Portez les besoins les uns des autres dans la prière</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Soumettre une requête
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="text-label-lg text-cream font-sans uppercase tracking-wider">Nouvelle requête de prière</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted mb-1.5">Titre</label>
              <input
                type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre de la requête"
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Visibilité</label>
              <select
                value={form.visibility}
                onChange={e => setForm(f => ({ ...f, visibility: e.target.value as PrayerRequestVisibility }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              >
                <option value="public">Publique</option>
                <option value="intercesseurs">Intercesseurs</option>
                <option value="pastoral">Pastorale</option>
                <option value="confidentiel">Confidentiel</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Description</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Décrivez votre besoin de prière…"
              rows={4}
              className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button" role="switch" aria-checked={form.is_anonymous}
              onClick={() => setForm(f => ({ ...f, is_anonymous: !f.is_anonymous }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${form.is_anonymous ? 'bg-gold-500' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.is_anonymous ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-muted">Soumettre anonymement</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={submitting} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
              <Send className="h-4 w-4" />
              {submitting ? 'Envoi en cours…' : 'Soumettre'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost px-5 py-2.5 text-sm font-medium">Annuler</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/50" />
        <input
          type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher une requête…"
          className="input-surface w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
        />
      </div>

      {/* Prayer requests list */}
      {loading ? (
        <div className="glass-card flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Heart className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-muted text-sm">Aucune requête de prière pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const badge = STATUS_BADGES[(req as any).status as PrayerRequestStatus] || STATUS_BADGES.nouveau;
            return (
              <div key={req.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="text-base font-semibold text-cream">
                        {(req as any).title || 'Requête de prière'}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.color} ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted line-clamp-2">{req.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted/60">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {req.is_anonymous ? 'Anonyme' : req.author_name || 'Anonyme'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateShort(req.created_at)}
                      </span>
                      {(req as any).prayer_count > 0 && (
                        <span className="flex items-center gap-1 text-amber-300">
                          <Heart className="h-3 w-3" />
                          {(req as any).prayer_count} prière{(req as any).prayer_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isIntercessor && (req as any).status !== 'repondu' && (
                      <button
                        onClick={() => setRespondingTo(respondingTo === req.id ? null : req.id)}
                        className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-300"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Marquer répondu
                      </button>
                    )}
                    {(req as any).status !== 'en_priere' && (req as any).status !== 'repondu' && (
                      <button
                        onClick={() => handlePray(req)}
                        className="btn-gold flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        Prier pour cette demande
                      </button>
                    )}
                  </div>
                </div>
                {/* Response form for intercessors */}
                {respondingTo === req.id && (
                  <div className="mt-4 pt-4 border-t border-line space-y-3">
                    <textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="Écrivez votre réponse pastorale…"
                      rows={3}
                      className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleMarkReplied(req.id)} className="btn-gold px-4 py-2 text-xs font-medium">
                        <CheckCircle className="h-3.5 w-3.5 inline mr-1.5" />
                        Confirmer la réponse
                      </button>
                      <button onClick={() => { setRespondingTo(null); setResponseText(''); }} className="btn-ghost px-4 py-2 text-xs font-medium">Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 2 — Centre de Communication
   ═══════════════════════════════════════════════════════════════════ */

interface MessageFormData {
  title: string;
  content: string;
  channel: CommunicationMessage['channel'];
  target_type: CommunicationMessage['target_type'];
  target_label: string;
  target_ids: string[];
  scheduled_at: string;
}

const EMPTY_MSG_FORM: MessageFormData = {
  title: '', content: '', channel: 'sms', target_type: 'all', target_label: 'Tous les membres', target_ids: [], scheduled_at: '',
};

function CommunicationTab({ profile, addToast }: { profile: any; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MessageFormData>(EMPTY_MSG_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    try {
      const data = await db.getCommunicationMessages();
      setMessages((data as unknown as CommunicationMessage[]) || []);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  }

  /** Fetch all member phone numbers from user_profiles */
  async function fetchAllMemberPhones(): Promise<string[]> {
    const { data } = await supabase
      .from('user_profiles')
      .select('phone')
      .not('phone', 'is', null)
      .neq('phone', '');
    return (data || []).map((r: any) => r.phone).filter(Boolean);
  }

  /** Fetch phone numbers for specific user IDs */
  async function fetchPhonesByIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from('user_profiles')
      .select('phone')
      .in('id', ids)
      .not('phone', 'is', null)
      .neq('phone', '');
    return (data || []).map((r: any) => r.phone).filter(Boolean);
  }

  async function handleSend() {
    if (!form.title.trim() || !form.content.trim()) {
      addToast('Veuillez remplir le titre et le contenu.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Save message to database
      const saved = await db.createCommunicationMessage(form);
      console.log('[Communication] Message saved:', saved);

      // 2. If SMS or WhatsApp, send via secure Edge Function
      if (form.channel === 'sms' || form.channel === 'whatsapp') {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          if (!supabaseUrl) throw new Error('Supabase URL non configurée');

          // Get auth token for Edge Function
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) throw new Error('Non authentifié');

          // Resolve target phone numbers
          const targetPhones = form.target_type === 'all'
            ? await fetchAllMemberPhones()
            : form.target_ids.length > 0
              ? await fetchPhonesByIds(form.target_ids)
              : [];

          if (targetPhones.length === 0) {
            addToast('Aucun destinataire trouvé avec un numéro de téléphone.', 'error');
          } else {
            let sent = 0;
            for (const phone of targetPhones) {
              const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  to: phone,
                  message: `[${form.title}] ${form.content}`,
                  channel: form.channel,
                }),
              });
              const data = await res.json();
              if (res.ok && data.success) sent++;
              else console.warn(`[SMS] Failed to ${phone}:`, data.error);
            }
            addToast(`${sent}/${targetPhones.length} message(s) envoyé(s) via ${form.channel.toUpperCase()}.`, sent > 0 ? 'success' : 'error');
          }
        } catch (smsErr: any) {
          console.error('[Communication] SMS error:', smsErr);
          addToast(smsErr.message || 'Erreur lors de l\'envoi SMS. Vérifiez la configuration Edge Function.', 'error');
        }
      } else {
        addToast('Message enregistré avec succès.', 'success');
      }

      setForm(EMPTY_MSG_FORM);
      setShowForm(false);
      loadMessages();
    } catch (err) {
      console.error('Send message error:', err);
      addToast("Erreur lors de l'enregistrement du message.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const needsEdgeFunction = form.channel === 'sms' || form.channel === 'whatsapp';

  const filtered = messages.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-headline-lg font-display text-cream">Centre de Communication</h2>
          <p className="text-body-lg text-muted mt-1">Gérez les envois de messages multi-canaux</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Nouveau message
        </button>
      </div>

      {/* New message form */}
      {showForm && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="text-label-lg text-cream font-sans uppercase tracking-wider">Composer un message</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm text-muted mb-1.5">Titre</label>
              <input
                type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre du message"
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Canal</label>
              <select
                value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value as CommunicationMessage['channel'] }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="push">Notification Push</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Type de destinataire</label>
              <select
                value={form.target_type}
                onChange={e => setForm(f => ({ ...f, target_type: e.target.value as CommunicationMessage['target_type'], target_label: TARGET_TYPES.find(t => t.value === e.target.value)?.label || '' }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              >
                {TARGET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {form.target_type !== 'all' && (
              <div className="sm:col-span-2">
                <label className="block text-sm text-muted mb-1.5">Sélection de la cible</label>
                <input
                  type="text" value={form.target_label}
                  onChange={e => setForm(f => ({ ...f, target_label: e.target.value }))}
                  placeholder="Rechercher et sélectionner…"
                  className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-muted mb-1.5">Programmer l'envoi (optionnel)</label>
              <input
                type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Contenu</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Rédigez votre message…"
              rows={5}
              className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 resize-none"
            />
          </div>

          {/* Edge Function Notice */}
          {needsEdgeFunction && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Send className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-sky-300">Envoi sécurisé via Supabase Edge Function</p>
                  <p className="text-xs text-muted mt-1">
                    Les SMS/WhatsApp sont envoyés par le serveur (vos clés Twilio ne sont jamais exposées côté client).
                  </p>
                  <div className="mt-2 rounded bg-bg/50 p-3 font-mono text-[11px] text-muted space-y-1">
                    <div className="text-sky-400/70"># Supabase Dashboard → Edge Functions → Secrets :</div>
                    <div>TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx</div>
                    <div>TWILIO_AUTH_TOKEN=votre_token_ici</div>
                    <div>TWILIO_PHONE_NUMBER=+243xxxxxxxx</div>
                    <div>WHATSAPP_BUSINESS_PHONE_NUMBER=+243xxxxxxxx</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSend} disabled={submitting} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
              <Send className="h-4 w-4" />
              {submitting ? 'Enregistrement…' : (form.scheduled_at ? 'Programmer' : 'Enregistrer')}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_MSG_FORM); }} className="btn-ghost px-5 py-2.5 text-sm font-medium">Annuler</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/50" />
        <input
          type="text" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher un message…"
          className="input-surface w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
        />
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="glass-card flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-muted text-sm">Aucun message envoyé pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => {
            const ChannelIcon = CHANNEL_ICONS[msg.channel] || MessageSquare;
            const statusBadge = MSG_STATUS[msg.status] || MSG_STATUS.draft;
            return (
              <div key={msg.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
                      <ChannelIcon className="h-5 w-5 text-sky-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-cream truncate">{msg.title}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.color} ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted/60">
                        <span className="text-amber-300">{CHANNEL_LABELS[msg.channel]}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{msg.target_label}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{msg.recipient_count} destinataire{msg.recipient_count > 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateShort(msg.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 3 — Bibliothèque Médias
   ═══════════════════════════════════════════════════════════════════ */

interface MediaFormData {
  title: string;
  description: string;
  category: MediaLibraryItem['category'];
  file_url: string;
  access_role: MediaLibraryItem['access_role'];
}

const EMPTY_MEDIA_FORM: MediaFormData = {
  title: '', description: '', category: 'document', file_url: '', access_role: 'membre',
};

function MediasTab({ profile, addToast }: { profile: any; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MediaFormData>(EMPTY_MEDIA_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await db.getMediaLibrary();
      setItems((data as unknown as MediaLibraryItem[]) || []);
    } catch (err) {
      console.error('Load media library error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!form.title.trim() || !form.file_url.trim()) {
      addToast('Veuillez remplir le titre et le fichier/URL.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await db.createMediaLibraryItem(form);
      addToast('Média ajouté avec succès.', 'success');
      setForm(EMPTY_MEDIA_FORM);
      setShowForm(false);
      loadItems();
    } catch (err) {
      console.error('Upload media error:', err);
      addToast("Erreur lors de l'ajout du média.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(item: MediaLibraryItem) {
    try {
      await db.incrementMediaDownload(item.id);
      setItems(prev => prev.map(m => m.id === item.id ? { ...m, download_count: m.download_count + 1 } : m));
      window.open(item.file_url, '_blank');
      addToast('Téléchargement en cours…', 'info');
    } catch {
      addToast('Erreur lors du téléchargement.', 'error');
    }
  }

  const filtered = items
    .filter(m => categoryFilter === 'all' || m.category === categoryFilter)
    .filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-headline-lg font-display text-cream">Bibliothèque Médias</h2>
          <p className="text-body-lg text-muted mt-1">Ressources, documents et supports de communication</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Upload className="h-4 w-4" />
          Ajouter un média
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="text-label-lg text-cream font-sans uppercase tracking-wider">Ajouter un média</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted mb-1.5">Titre</label>
              <input
                type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre du média"
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Catégorie</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as MediaLibraryItem['category'] }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              >
                {MEDIA_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Accès</label>
              <select
                value={form.access_role}
                onChange={e => setForm(f => ({ ...f, access_role: e.target.value as MediaLibraryItem['access_role'] }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              >
                <option value="public">Public</option>
                <option value="membre">Membres</option>
                <option value="pasteur">Pasteurs</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description du média…"
              rows={3}
              className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Fichier (URL ou sélection)</label>
            <div className="flex gap-2">
              <input
                type="text" value={form.file_url}
                onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
                placeholder="Collez une URL ou cliquez pour sélectionner un fichier"
                className="input-surface flex-1 rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
              <label className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer">
                <Upload className="h-4 w-4" />
                Parcourir
                <input type="file" className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleUpload} disabled={submitting} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {submitting ? 'Envoi en cours…' : 'Ajouter'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_MEDIA_FORM); }} className="btn-ghost px-5 py-2.5 text-sm font-medium">Annuler</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/50" />
          <input
            type="text" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un média…"
            className="input-surface w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-surface rounded-lg px-3 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
          >
            <option value="all">Toutes catégories</option>
            {MEDIA_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Media grid */}
      {loading ? (
        <div className="glass-card flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-muted text-sm">Aucun média dans la bibliothèque.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const TypeIcon = getFileTypeIcon(item.file_type);
            const catLabel = MEDIA_CATEGORIES.find(c => c.value === item.category)?.label || item.category;
            return (
              <div key={item.id} className="glass-card overflow-hidden group">
                {/* Thumbnail */}
                <div className="relative h-36 bg-white/5 flex items-center justify-center overflow-hidden">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <TypeIcon className="h-12 w-12 text-muted/30" />
                  )}
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-bg/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium text-cream">
                    <TypeIcon className="h-3 w-3" />
                    {item.file_type || 'fichier'}
                  </span>
                </div>
                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-cream line-clamp-1">{item.title}</h3>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                      {catLabel}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted/60">
                      <Download className="h-3 w-3" />
                      {item.download_count} téléchargement{item.download_count > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => handleDownload(item)}
                      className="flex items-center gap-1 text-xs font-medium text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 4 — Newsletter
   ═══════════════════════════════════════════════════════════════════ */

interface NewsletterFormData {
  title: string;
  content: string;
  audience: 'all' | 'members' | 'pastors' | 'department';
  department_id: string;
  scheduled_at: string;
}

const EMPTY_NEWSLETTER: NewsletterFormData = {
  title: '', content: '', audience: 'all', department_id: '', scheduled_at: '',
};

interface NewsletterItem {
  id: string;
  title: string;
  audience: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

function NewsletterTab({ profile, addToast }: { profile: any; addToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [newsletters, setNewsletters] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewsletterFormData>(EMPTY_NEWSLETTER);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNewsletters();
  }, []);

  async function loadNewsletters() {
    setLoading(true);
    try {
      const data = await db.getNewsletters();
      setNewsletters((data as unknown as NewsletterItem[]) || []);
    } catch (err) {
      console.error('Load newsletters error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNewsletter() {
    if (!form.title.trim() || !form.content.trim()) {
      addToast('Veuillez remplir le titre et le contenu.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      console.log('[Newsletter] Saving:', form);
      await db.createNewsletter(form);
      addToast('Newsletter enregistrée avec succès.', 'success');
      setForm(EMPTY_NEWSLETTER);
      setShowForm(false);
      loadNewsletters();
    } catch (err) {
      console.error('Save newsletter error:', err);
      addToast("Erreur lors de l'enregistrement.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const AUDIENCE_LABELS: Record<string, string> = {
    all: 'Tous',
    members: 'Membres',
    pastors: 'Pasteurs',
    department: 'Département',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-headline-lg font-display text-cream">Newsletter</h2>
          <p className="text-body-lg text-muted mt-1">Composez et planifiez vos newsletters</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" />
          Nouvelle newsletter
        </button>
      </div>

      {/* Compose form */}
      {showForm && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="text-label-lg text-cream font-sans uppercase tracking-wider">Composer une newsletter</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted mb-1.5">Titre</label>
              <input
                type="text" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre de la newsletter"
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Audience</label>
              <select
                value={form.audience}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value as NewsletterFormData['audience'] }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              >
                <option value="all">Tous les contacts</option>
                <option value="members">Membres uniquement</option>
                <option value="pastors">Pasteurs</option>
                <option value="department">Un département</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Date et heure d'envoi</label>
              <input
                type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Contenu</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Rédigez le contenu de votre newsletter…"
              rows={8}
              className="input-surface w-full rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold-400/40 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSendNewsletter} disabled={submitting} className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
              <Send className="h-4 w-4" />
              {submitting ? 'Enregistrement…' : (form.scheduled_at ? 'Programmer' : 'Enregistrer')}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_NEWSLETTER); }} className="btn-ghost px-5 py-2.5 text-sm font-medium">Annuler</button>
          </div>
        </div>
      )}

      {/* Newsletter history */}
      {loading ? (
        <div className="glass-card flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
        </div>
      ) : newsletters.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Mail className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-muted text-sm">Aucune newsletter envoyée pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => {
            const statusBadge = MSG_STATUS[nl.status] || MSG_STATUS.draft;
            return (
              <div key={nl.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10">
                      <Radio className="h-5 w-5 text-gold-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-cream truncate">{nl.title}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.color} ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted/60">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{AUDIENCE_LABELS[nl.audience] || nl.audience}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{nl.recipient_count} destinataire{nl.recipient_count > 1 ? 's' : ''}</span>
                        {nl.scheduled_at && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Programmé: {formatDateFR(nl.scheduled_at)}</span>
                        )}
                        {nl.sent_at && (
                          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Envoyé: {formatDateFR(nl.sent_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════ */

export function CommunicationPage({ onNavigate }: CommunicationPageProps) {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const { colorMode, toggleColorMode } = useDynamicTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('priere');

  // Guard: not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-cream font-sans">
        <SiteHeader onNavigate={onNavigate} activePage="communication" theme={colorMode} onToggleTheme={toggleColorMode} />
        <div className="flex min-h-[80vh] items-center justify-center px-margin-mobile md:px-margin-desktop">
          <div className="glass-card max-w-md p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-400/10">
              <Bell className="h-10 w-10 text-gold-400" />
            </div>
            <h2 className="text-headline-lg font-display gold-text mb-3">Centre de Communication</h2>
            <p className="text-body-lg text-muted mb-8">
              Connectez-vous pour accéder au centre de communication, au mur de prière et à la bibliothèque de médias.
            </p>
            <button onClick={() => onNavigate('connexion')} className="btn-gold px-8 py-3">
              Se connecter
            </button>
          </div>
        </div>
        <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
        <MobileNav onNavigate={onNavigate} active="communication" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-cream">
      <SiteHeader onNavigate={onNavigate} activePage="communication" theme={colorMode} onToggleTheme={toggleColorMode} />

      <main className="pt-16">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-gold opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-100/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-8xl px-margin-mobile md:px-margin-desktop py-xl">
            {/* Page header */}
            <EvtReveal>
              <div className="mb-8">
                <h1 className="text-headline-xl font-display text-cream mb-2">
                  Centre de Communication
                </h1>
                <p className="text-body-lg text-muted max-w-2xl">
                  Prières, messagerie, médias et newsletters — tout au même endroit.
                </p>
              </div>
            </EvtReveal>

            {/* Tab navigation */}
            <EvtReveal delay={1}>
              <div className="mb-8 flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gold-400/10 text-gold-300 border border-gold-400/20'
                          : 'text-muted hover:text-cream hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </EvtReveal>

            {/* Tab content */}
            <EvtReveal delay={2}>
              <div className="min-h-[50vh]">
                {activeTab === 'priere' && <PrayerTab profile={profile} addToast={addToast} />}
                {activeTab === 'communication' && <CommunicationTab profile={profile} addToast={addToast} />}
                {activeTab === 'medias' && <MediasTab profile={profile} addToast={addToast} />}
                {activeTab === 'newsletter' && <NewsletterTab profile={profile} addToast={addToast} />}
              </div>
            </EvtReveal>
          </div>
        </div>
      </main>

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="communication" />
    </div>
  );
}