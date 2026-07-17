import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Star, Eye, EyeOff, Youtube, Facebook, MessageCircle } from 'lucide-react';
import ImageUpload from '../ImageUpload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  event_date: string;
  location: string;
  is_live: boolean;
  is_featured: boolean;
  youtube_url: string;
  facebook_url: string;
  created_at: string;
}

interface EventComment {
  id: string;
  event_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

type EventFormData = Omit<Event, 'id' | 'created_at'>;

const EMPTY_FORM: EventFormData = {
  title: '',
  description: '',
  category: 'Cultes',
  image_url: '',
  event_date: '',
  location: '',
  is_live: false,
  is_featured: false,
  youtube_url: '',
  facebook_url: '',
};

const CATEGORIES = ['Cultes', 'Missions', 'Jeunesse', 'Communion', 'Formation', 'Évangélisation', 'Spécial', 'Autre'] as const;
// NOTE: The DB CHECK constraint on events.category may need updating to match.
// Run: ALTER TABLE events DROP CONSTRAINT events_category_check;
//       ALTER TABLE events ADD CONSTRAINT events_category_check
//         CHECK (category IN ('Cultes','Missions','Jeunesse','Communion','Formation','Évangélisation','Spécial','Autre'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toDatetimeLocal(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="flex gap-4">
        <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-1/3 rounded bg-white/5" />
          <div className="h-3 w-1/4 rounded bg-white/5" />
          <div className="h-3 w-1/2 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM);

  // Comments state
  const [commentsEventId, setCommentsEventId] = useState<string | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // ---- fetch events -------------------------------------------------------

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });

    if (error) {
      addToast('Erreur lors du chargement des événements', 'error');
    } else {
      setEvents((data as Event[]) ?? []);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ---- fetch comments for an event -----------------------------------------

  const fetchComments = useCallback(async (eventId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('event_comments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (!error) {
        setComments((data as EventComment[]) ?? []);
      }
    } catch {
      // comments table might not exist yet
    }
    setLoadingComments(false);
  }, []);

  const openComments = (eventId: string) => {
    if (commentsEventId === eventId) {
      setCommentsEventId(null);
      return;
    }
    setCommentsEventId(eventId);
    fetchComments(eventId);
  };

  const handleAddComment = async () => {
    if (!commentsEventId || !newComment.trim()) return;
    try {
      const { error } = await supabase.from('event_comments').insert({
        event_id: commentsEventId,
        author_name: 'Admin',
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment('');
      fetchComments(commentsEventId);
      addToast('Commentaire ajouté', 'success');
    } catch {
      addToast('Erreur d\'ajout du commentaire', 'error');
    }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('event_comments').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    if (commentsEventId) fetchComments(commentsEventId);
  };

  // ---- form helpers --------------------------------------------------------

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      category: event.category,
      image_url: event.image_url,
      event_date: toDatetimeLocal(event.event_date),
      location: event.location,
      is_live: event.is_live,
      is_featured: event.is_featured,
      youtube_url: event.youtube_url || '',
      facebook_url: event.facebook_url || '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleField = (field: keyof EventFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- save ----------------------------------------------------------------

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.event_date || !form.location.trim()) {
      addToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      event_date: new Date(form.event_date).toISOString(),
      youtube_url: form.youtube_url || null,
      facebook_url: form.facebook_url || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId);
        if (error) throw error;
        addToast('Événement mis à jour', 'success');
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        addToast('Événement créé', 'success');
      }
      closeForm();
      fetchEvents();
    } catch {
      addToast('Erreur lors de la sauvegarde', 'error');
    }
    setSaving(false);
  };

  // ---- delete --------------------------------------------------------------

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast('Événement supprimé', 'success');
    fetchEvents();
  };

  // ---- toggles -------------------------------------------------------------

  const toggleLive = async (event: Event) => {
    const { error } = await supabase.from('events').update({ is_live: !event.is_live }).eq('id', event.id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast(event.is_live ? 'En direct désactivé' : 'En direct activé', 'success');
    fetchEvents();
  };

  const toggleFeatured = async (event: Event) => {
    const { error } = await supabase.from('events').update({ is_featured: !event.is_featured }).eq('id', event.id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast(event.is_featured ? 'Retiré des mis en avant' : 'Ajouté aux mis en avant', 'success');
    fetchEvents();
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Événements</h2>
        {isFullAdmin && (
        <button onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Ajouter un événement
        </button>
        )}
      </div>

      {/* Form panel */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-5 border border-evangile-600/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? "Modifier l'événement" : 'Nouvel événement'}
            </h3>
            <button onClick={closeForm} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Titre <span className="text-red-400">*</span></label>
              <input type="text" value={form.title} onChange={(e) => handleField('title', e.target.value)} placeholder="Titre de l'événement" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Catégorie</label>
              <select value={form.category} onChange={(e) => handleField('category', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm">
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Date <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={form.event_date} onChange={(e) => handleField('event_date', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Lieu <span className="text-red-400">*</span></label>
              <input type="text" value={form.location} onChange={(e) => handleField('location', e.target.value)} placeholder="Adresse ou salle" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>

            {/* YouTube / Facebook links */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted flex items-center gap-1.5">
                <Youtube className="h-3.5 w-3.5 text-red-400" /> Lien YouTube
              </label>
              <input type="url" value={form.youtube_url} onChange={(e) => handleField('youtube_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-400" /> Lien Facebook
              </label>
              <input type="url" value={form.facebook_url} onChange={(e) => handleField('facebook_url', e.target.value)} placeholder="https://facebook.com/..." className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>

            <div className="md:col-span-2">
              <ImageUpload value={form.image_url || ''} onChange={(url: string) => handleField('image_url', url)} folder="events" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Description <span className="text-red-400">*</span></label>
              <textarea rows={4} value={form.description} onChange={(e) => handleField('description', e.target.value)} placeholder="Décrivez l'événement..." className="input-surface w-full px-4 py-2.5 text-sm resize-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => handleField('is_featured', e.target.checked)} className="h-4 w-4 rounded border-line accent-evangile-600" />
              <span className="text-sm text-cream/80 flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-evangile-500" /> Mis en avant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_live} onChange={(e) => handleField('is_live', e.target.checked)} className="h-4 w-4 rounded border-line accent-red-500" />
              <span className="text-sm text-cream/80 flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
                En direct
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={closeForm} className="btn-ghost flex items-center gap-2"><X className="h-4 w-4" /> Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Event list */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : events.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center"><p className="text-muted text-sm">Aucun événement pour le moment.</p></div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const showComments = commentsEventId === event.id;
            const eventComments = showComments ? comments : [];
            return (
              <div key={event.id} className="glass rounded-2xl overflow-hidden group">
                <div className="p-4">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 flex-shrink-0 rounded-xl overflow-hidden bg-white/5">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted text-xs">Pas d'image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif text-base font-semibold text-cream truncate">{event.title}</h4>
                            <span className="rounded-full bg-evangile-600/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-evangile-500">{event.category}</span>
                            {event.is_live && (
                              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-400">
                                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" /></span>
                                Live
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted line-clamp-1">{formatDate(event.event_date)} &middot; {event.location}</p>
                          {/* YouTube / Facebook links */}
                          {(event.youtube_url || event.facebook_url) && (
                            <div className="flex items-center gap-3 mt-1.5">
                              {event.youtube_url && (
                                <a href={event.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition">
                                  <Youtube className="h-3 w-3" /> YouTube
                                </a>
                              )}
                              {event.facebook_url && (
                                <a href={event.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition">
                                  <Facebook className="h-3 w-3" /> Facebook
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openComments(event.id)} title="Commentaires" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          {isFullAdmin && (
                          <button onClick={() => toggleFeatured(event)} title="Mis en avant" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition">
                            <Star className={`h-4 w-4 ${event.is_featured ? 'fill-evangile-500 text-evangile-500' : ''}`} />
                          </button>
                          )}
                          {isFullAdmin && (
                          <button onClick={() => toggleLive(event)} title="En direct" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition">
                            {event.is_live ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          )}
                          {isFullAdmin && (
                          <button onClick={() => openEdit(event)} title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          )}
                          {isFullAdmin && (
                          <button onClick={() => handleDelete(event.id)} title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          )}
                        </div>
                      </div>

                      {event.is_featured && !event.is_live && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-evangile-500 text-evangile-500" />
                          <span className="text-[10px] text-evangile-500 font-medium">Mis en avant</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments section */}
                {showComments && (
                  <div className="border-t border-line p-4 bg-white/[0.01] space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="h-4 w-4 text-evangile-500" />
                      <span className="text-sm font-medium text-cream">Commentaires ({eventComments.length})</span>
                    </div>

                    {loadingComments ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
                    ) : eventComments.length === 0 ? (
                      <p className="text-xs text-muted text-center py-2">Aucun commentaire.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {eventComments.map(c => (
                          <div key={c.id} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-evangile-600/20 text-evangile-500 text-[10px] font-bold">
                              {c.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-cream">{c.author_name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted/60">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                                  {isFullAdmin && <button onClick={() => deleteComment(c.id)} className="text-muted hover:text-red-400 transition"><X className="h-3 w-3" /></button>}
                                </div>
                              </div>
                              <p className="text-xs text-cream/70 mt-0.5">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment */}
                    {isFullAdmin && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Ajouter un commentaire..."
                        className="input-surface flex-1 px-4 py-2 text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      />
                      <button onClick={handleAddComment} className="btn-gold px-3 py-2 text-sm">Envoyer</button>
                    </div>
                    )}
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