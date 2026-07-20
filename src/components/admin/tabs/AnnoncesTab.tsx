import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_urgent: boolean;
  is_active: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

type AnnouncementFormData = Omit<Announcement, 'id' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: AnnouncementFormData = {
  title: '',
  content: '',
  is_urgent: false,
  is_active: true,
  published_at: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function toDateInput(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-1/3 rounded bg-white/5" />
        <div className="h-3 w-1/4 rounded bg-white/5" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnoncesTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementFormData>(EMPTY_FORM);

  // ---- fetch items --------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      addToast('Erreur lors du chargement des annonces', 'error');
    } else {
      setItems((data as Announcement[]) ?? []);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ---- form helpers --------------------------------------------------------

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      is_urgent: item.is_urgent,
      is_active: item.is_active,
      published_at: toDateInput(item.published_at),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleField = (field: keyof AnnouncementFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- save ----------------------------------------------------------------

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      addToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      is_urgent: form.is_urgent,
      is_active: form.is_active,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
        if (error) throw error;
        addToast('Annonce mise à jour', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
        addToast('Annonce créée', 'success');
      }
      closeForm();
      fetchItems();
    } catch (err: any) {
      addToast('Erreur lors de la sauvegarde: ' + (err?.message || 'Erreur inconnue'), 'error');
    }
    setSaving(false);
  };

  // ---- delete --------------------------------------------------------------

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast('Annonce supprimée', 'success');
    fetchItems();
  };

  // ---- toggles -------------------------------------------------------------

  const toggleActive = async (item: Announcement) => {
    const { error } = await supabase.from('announcements').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast(item.is_active ? 'Annonce désactivée' : 'Annonce activée', 'success');
    fetchItems();
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Annonces</h2>
        {isFullAdmin && (
        <button onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Ajouter une annonce
        </button>
        )}
      </div>

      {/* Form panel */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-5 border border-accent-400/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? "Modifier l'annonce" : 'Nouvelle annonce'}
            </h3>
            <button onClick={closeForm} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Titre <span className="text-red-400">*</span></label>
              <input type="text" value={form.title} onChange={(e) => handleField('title', e.target.value)} placeholder="Titre de l'annonce" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Date de publication</label>
              <input type="date" value={form.published_at} onChange={(e) => handleField('published_at', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Contenu <span className="text-red-400">*</span></label>
              <textarea rows={5} value={form.content} onChange={(e) => handleField('content', e.target.value)} placeholder="Contenu de l'annonce..." className="input-surface w-full px-4 py-2.5 text-sm resize-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_urgent} onChange={(e) => handleField('is_urgent', e.target.checked)} className="h-4 w-4 rounded border-line accent-red-500" />
              <span className="text-sm text-cream/80 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Urgente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => handleField('is_active', e.target.checked)} className="h-4 w-4 rounded border-line accent-evangile-600" />
              <span className="text-sm text-cream/80 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-accent-400" /> Active</span>
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

      {/* Items list */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center"><p className="text-muted text-sm">Aucune annonce pour le moment.</p></div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-2xl overflow-hidden group">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-base font-semibold text-cream truncate">{item.title}</h4>
                      {item.is_urgent && (
                        <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-400">
                          <AlertTriangle className="h-3 w-3" /> Urgente
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-muted'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted line-clamp-1">{formatDate(item.published_at)}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFullAdmin && (
                    <button onClick={() => toggleActive(item)} title={item.is_active ? 'Désactiver' : 'Activer'} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
                      {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    )}
                    {isFullAdmin && (
                    <button onClick={() => openEdit(item)} title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    )}
                    {isFullAdmin && (
                    <button onClick={() => handleDelete(item.id)} title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}