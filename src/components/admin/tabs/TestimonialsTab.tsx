import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, CheckCircle2, XCircle, Clock, Eye, EyeOff, Filter, MessageSquare, Star } from 'lucide-react';
import ImageUpload from '../ImageUpload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  photo_url: string | null;
  sort_order: number;
  is_active: boolean;
  author_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  category: string;
  is_anonymous: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'published';

const CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'guerison', label: 'Guérison' },
  { value: 'finance', label: 'Finance' },
  { value: 'maternite', label: 'Maternité' },
  { value: 'delivrance', label: 'Délivrance' },
  { value: 'miracle', label: 'Miracle' },
  { value: 'salut', label: 'Salut' },
  { value: 'famille', label: 'Famille' },
  { value: 'autre', label: 'Autre' },
];

const STATUS_CONFIG: Record<TestimonialStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle2 },
  rejected: { label: 'Rejeté', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  published: { label: 'Publié', color: 'bg-green-500/20 text-green-400', icon: Star },
};

const EMPTY_FORM: Omit<Testimonial, 'id' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at' | 'reviewer_notes'> = {
  author_name: '',
  author_title: '',
  content: '',
  photo_url: '',
  sort_order: 0,
  is_active: true,
  author_id: null,
  status: 'published',
  category: 'general',
  is_anonymous: false,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TestimonialsTab() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const { isFullAdmin } = useAdminAccess();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [reviewModal, setReviewModal] = useState<{ item: Testimonial; action: 'approve' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [adminComment, setAdminComment] = useState('');

  // ---- Fetch --------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const [{ data: adminData, error }, { data: memberData }] = await Promise.all([
      supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
      supabase.from('member_testimonies').select('*').order('created_at', { ascending: false }),
    ]);

    if (error) {
      addToast('Erreur lors du chargement des témoignages', 'error');
    } else {
      // Map admin testimonials
      const adminItems = (adminData as any[])?.map(t => ({
        ...t,
        status: t.status || 'published',
        category: t.category || 'general',
        is_anonymous: t.is_anonymous || false,
        author_id: t.author_id || null,
        reviewed_by: t.reviewed_by || null,
        reviewed_at: t.reviewed_at || null,
        reviewer_notes: t.reviewer_notes || null,
        _source: 'admin' as const,
      })) ?? [];

      // Map member-submitted testimonials
      const memberItems = (memberData as any[])?.map(t => ({
        ...t,
        author_name: t.is_anonymous ? 'Anonyme' : '', // will be filled by join if possible
        author_title: null,
        photo_url: null,
        sort_order: 0,
        is_active: true,
        status: t.status || 'pending',
        category: t.category || 'general',
        is_anonymous: t.is_anonymous || false,
        author_id: t.user_id || null,
        reviewed_by: t.reviewed_by || null,
        reviewed_at: t.reviewed_at || null,
        reviewer_notes: t.reviewer_notes || null,
        _source: 'member' as const,
      })) ?? [];

      // Fetch user names for member testimonies that aren't anonymous
      const nonAnonIds = [...new Set(memberItems.filter(t => !t.is_anonymous && t.author_id).map(t => t.author_id!))];
      let nameMap: Record<string, string> = {};
      if (nonAnonIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', nonAnonIds);
        if (profiles) {
          nameMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.full_name || 'Membre']));
        }
      }

      // Fill in author names
      memberItems.forEach(t => {
        if (!t.is_anonymous && t.author_id && nameMap[t.author_id]) {
          t.author_name = nameMap[t.author_id];
        } else if (t.is_anonymous) {
          t.author_name = 'Anonyme';
        }
      });

      // Merge and sort by date
      const all = [...adminItems, ...memberItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setItems(all);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ---- Filtered list -------------------------------------------------------

  const filtered = filterStatus === 'all' ? items : items.filter(t => t.status === filterStatus);
  const pendingCount = items.filter(t => t.status === 'pending').length;

  // ---- CRUD ---------------------------------------------------------------

  const handleCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Testimonial) => {
    setEditingId(item.id);
    setForm({
      author_name: item.author_name,
      author_title: item.author_title ?? '',
      content: item.content,
      photo_url: item.photo_url ?? '',
      sort_order: item.sort_order,
      is_active: item.is_active,
      author_id: item.author_id,
      status: item.status,
      category: item.category,
      is_anonymous: item.is_anonymous,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.author_name.trim() || !form.content.trim()) {
      addToast('Le nom et le contenu sont requis', 'error');
      return;
    }

    setSaving(true);
    const payload: Record<string, any> = {
      author_name: form.author_name.trim(),
      author_title: form.author_title?.trim() || null,
      content: form.content.trim(),
      photo_url: form.photo_url?.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      category: form.category,
      is_anonymous: form.is_anonymous,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('testimonials').update(payload).eq('id', editingId);
        if (error) throw error;
        addToast('Témoignage mis à jour', 'success');
      } else {
        const { error } = await supabase.from('testimonials').insert(payload);
        if (error) throw error;
        addToast('Témoignage ajouté', 'success');
      }
    } catch {
      addToast('Erreur de sauvegarde', 'error');
    }

    setSaving(false);
    setIsFormOpen(false);
    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (id: string, source?: string) => {
    if (!confirm('Supprimer ce témoignage ?')) return;
    try {
      const table = source === 'member' ? 'member_testimonies' : 'testimonials';
      await supabase.from(table).delete().eq('id', id);
      addToast('Témoignage supprimé', 'success');
      fetchItems();
    } catch {
      addToast('Erreur de suppression', 'error');
    }
  };

  // ---- Review workflow (approve/reject) ------------------------------------

  const handleReview = async () => {
    if (!reviewModal) return;
    setSaving(true);
    const newStatus = reviewModal.action === 'approve' ? 'published' : 'rejected';
    try {
      const table = (reviewModal.item as any)._source === 'member' ? 'member_testimonies' : 'testimonials';
      const updateData: any = {
        status: newStatus,
        reviewed_by: profile?.id || null,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewNotes.trim() || null,
        ...(table === 'testimonials' ? { is_active: newStatus === 'published' } : { published_at: newStatus === 'published' ? new Date().toISOString() : null }),
      };
      // Add admin_comment for member testimonies
      if (table === 'member_testimonies' && adminComment.trim() && newStatus === 'published') {
        updateData.admin_comment = adminComment.trim();
      }
      const { error } = await supabase.from(table).update(updateData).eq('id', reviewModal.item.id);
      if (error) throw error;
      addToast(newStatus === 'published' ? 'Témoignage publié' : 'Témoignage rejeté', 'success');
      setReviewModal(null);
      setReviewNotes('');
      setAdminComment('');
      fetchItems();
    } catch {
      addToast('Erreur lors de la validation', 'error');
    }
    setSaving(false);
  };

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ---- Render: Form -------------------------------------------------------

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            {editingId ? 'Modifier le témoignage' : 'Ajouter un témoignage'}
          </h2>
          <button onClick={() => { setIsFormOpen(false); setEditingId(null); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Nom de l'auteur *</label>
              <input type="text" className="input-surface w-full px-4 py-2.5 text-sm" value={form.author_name} onChange={e => updateForm('author_name', e.target.value)} placeholder="Nom complet" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Titre / Rôle</label>
              <input type="text" className="input-surface w-full px-4 py-2.5 text-sm" value={form.author_title ?? ''} onChange={e => updateForm('author_title', e.target.value)} placeholder="Ex: Membre de la paroisse" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => updateForm('category', c.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${form.category === c.value ? 'bg-evangile-600/20 text-evangile-500 border border-evangile-600/40' : 'bg-white/5 text-muted hover:text-cream'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Témoignage *</label>
            <textarea className="input-surface w-full px-4 py-2.5 text-sm resize-none" rows={5} value={form.content} onChange={e => updateForm('content', e.target.value)} placeholder="Le témoignage..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">URL de la photo</label>
              <input type="text" className="input-surface w-full px-4 py-2.5 text-sm" value={form.photo_url ?? ''} onChange={e => updateForm('photo_url', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Ou uploader une photo</label>
              <ImageUpload value={form.photo_url ?? ''} onChange={(url: string) => setForm(f => ({ ...f, photo_url: url }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Ordre d'affichage</label>
              <input type="number" className="input-surface w-full px-4 py-2.5 text-sm" value={form.sort_order} onChange={e => updateForm('sort_order', parseInt(e.target.value, 10) || 0)} min={0} />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_anonymous} onChange={e => updateForm('is_anonymous', e.target.checked)} className="h-4 w-4 rounded border-line text-evangile-500 focus:ring-evangile-600/30" />
                <span className="text-sm text-cream">Anonyme</span>
              </label>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => updateForm('is_active', e.target.checked)} className="h-4 w-4 rounded border-line text-evangile-500 focus:ring-evangile-600/30" />
                <span className="text-sm text-cream">Actif</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button onClick={() => { setIsFormOpen(false); setEditingId(null); }} className="btn-ghost px-5 py-2.5 text-sm font-medium">Annuler</button>
            {editingId && (
              <button onClick={() => handleDelete(editingId)} className="ml-auto flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 px-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Render: List -------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-2xl font-semibold text-cream">Témoignages</h2>
          {pendingCount > 0 && (
            <button
              onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
              className="flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/30 transition animate-pulse"
            >
              <Clock className="h-3 w-3" /> {pendingCount} en attente
            </button>
          )}
        </div>
        {isFullAdmin && (
        <button onClick={handleCreate} className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> Ajouter un témoignage
        </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${filterStatus === 'all' ? 'bg-evangile-600/20 text-evangile-500' : 'bg-white/5 text-muted hover:text-cream'}`}>Tous ({items.length})</button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = items.filter(t => t.status === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setFilterStatus(key)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${filterStatus === key ? `${cfg.color}` : 'bg-white/5 text-muted hover:text-cream'}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-evangile-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted/30 mb-4" />
          <p className="text-muted">Aucun témoignage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const cfg = STATUS_CONFIG[item.status as TestimonialStatus] || STATUS_CONFIG.published;
            const StatusIcon = cfg.icon;
            return (
              <div key={item.id} className={`glass rounded-2xl p-6 transition ${!item.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {item.photo_url && !item.is_anonymous ? (
                      <img src={item.photo_url} alt={item.author_name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-evangile-600/20 text-evangile-500 font-serif text-lg font-semibold">
                        {item.is_anonymous ? '?' : item.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-cream">{item.is_anonymous ? 'Anonyme' : item.author_name}</h3>
                          {item.author_title && <p className="text-xs text-muted">{item.author_title}</p>}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" /> {cfg.label}
                          </span>
                          {item.category !== 'general' && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">
                              {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted/60 mt-0.5">{new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {item.status === 'pending' && isFullAdmin && (
                          <>
                            <button onClick={() => { setReviewModal({ item, action: 'approve' }); setReviewNotes(''); }} title="Approuver et publier" className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/40 text-green-400 hover:bg-green-500/10 transition">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setReviewModal({ item, action: 'reject' }); setReviewNotes(''); }} title="Rejeter" className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {isFullAdmin && (
                          <>
                            <button onClick={() => handleEdit(item)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition" aria-label="Modifier"><Edit3 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(item.id, (item as any)._source)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-500/40 hover:text-red-400 transition" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 relative pl-4 border-l-2 border-evangile-600/30">
                      <p className="text-sm leading-relaxed text-cream/80 line-clamp-3">{item.content}</p>
                    </div>

                    {/* Review notes if reviewed */}
                    {item.reviewer_notes && (
                      <p className="mt-2 text-xs text-muted/60 italic">Note du réviseur : {item.reviewer_notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReviewModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-line">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${reviewModal.action === 'approve' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {reviewModal.action === 'approve' ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-cream">
                  {reviewModal.action === 'approve' ? 'Approuver' : 'Rejeter'} le témoignage
                </h3>
                <p className="text-sm text-muted">de {reviewModal.item.is_anonymous ? 'Anonyme' : reviewModal.item.author_name}</p>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-3 border-l-2 border-evangile-600/30">
              <p className="text-sm text-cream/70 line-clamp-4">{reviewModal.item.content}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                {reviewModal.action === 'approve' ? 'Note (optionnel)' : 'Raison du rejet'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                rows={3}
                placeholder={reviewModal.action === 'approve' ? 'Commentaire optionnel...' : 'Expliquez pourquoi ce témoignage est rejeté...'}
                className="input-surface w-full px-4 py-2.5 text-sm resize-none"
              />
              {(reviewModal.item as any)._source === 'member' && reviewModal.action === 'approve' && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium text-evangile-500">Note pastorale (visible sur le site)</label>
                  <textarea
                    value={adminComment}
                    onChange={e => setAdminComment(e.target.value)}
                    rows={2}
                    placeholder="Un mot d'encouragement ou de contexte..."
                    className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setReviewModal(null)} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
              <button
                onClick={handleReview}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-50 ${
                  reviewModal.action === 'approve'
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {reviewModal.action === 'approve' ? 'Approuver et publier' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}