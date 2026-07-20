import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Star, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Emission {
  id: string;
  title: string;
  description: string;
  platform: string;
  schedule: string;
  thumbnail_url: string;
  video_url: string;
  host: string;
  is_live: boolean;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type EmissionFormData = Omit<Emission, 'id' | 'created_at' | 'updated_at' | 'sort_order'>;

const EMPTY_FORM: EmissionFormData = {
  title: '',
  description: '',
  platform: 'youtube',
  schedule: '',
  thumbnail_url: '',
  video_url: '',
  host: '',
  is_live: false,
  is_featured: false,
  is_active: true,
};

const PLATFORMS = ['youtube', 'facebook', 'other'] as const;

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  other: 'Autre',
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500/20 text-red-400',
  facebook: 'bg-blue-500/20 text-blue-400',
  other: 'bg-white/10 text-muted',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export function EmissionsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [items, setItems] = useState<Emission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EmissionFormData>(EMPTY_FORM);

  // ---- fetch items --------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emissions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      addToast('Erreur lors du chargement des émissions', 'error');
    } else {
      setItems((data as Emission[]) ?? []);
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

  const openEdit = (item: Emission) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      platform: item.platform,
      schedule: item.schedule,
      thumbnail_url: item.thumbnail_url,
      video_url: item.video_url,
      host: item.host,
      is_live: item.is_live,
      is_featured: item.is_featured,
      is_active: item.is_active,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleField = (field: keyof EmissionFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- save ----------------------------------------------------------------

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      addToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      platform: form.platform,
      schedule: form.schedule.trim() || null,
      thumbnail_url: form.thumbnail_url?.trim() || null,
      video_url: form.video_url?.trim() || null,
      host: form.host.trim() || null,
      is_live: form.is_live,
      is_featured: form.is_featured,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('emissions').update(payload).eq('id', editingId);
        if (error) throw error;
        addToast('Émission mise à jour', 'success');
      } else {
        const { error } = await supabase.from('emissions').insert({ ...payload, sort_order: items.length });
        if (error) throw error;
        addToast('Émission créée', 'success');
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
    if (!window.confirm('Supprimer cette émission ?')) return;
    const { error } = await supabase.from('emissions').delete().eq('id', id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast('Émission supprimée', 'success');
    fetchItems();
  };

  // ---- toggles -------------------------------------------------------------

  const toggleActive = async (item: Emission) => {
    const { error } = await supabase.from('emissions').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast(item.is_active ? 'Émission désactivée' : 'Émission activée', 'success');
    fetchItems();
  };

  const toggleFeatured = async (item: Emission) => {
    const { error } = await supabase.from('emissions').update({ is_featured: !item.is_featured }).eq('id', item.id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast(item.is_featured ? 'Retiré des mis en avant' : 'Ajouté aux mis en avant', 'success');
    fetchItems();
  };

  const toggleLive = async (item: Emission) => {
    const { error } = await supabase.from('emissions').update({ is_live: !item.is_live }).eq('id', item.id);
    if (error) { addToast('Erreur: ' + error.message, 'error'); return; }
    addToast(item.is_live ? 'En direct désactivé' : 'En direct activé', 'success');
    fetchItems();
  };

  // ---- sort ----------------------------------------------------------------

  const moveSort = async (item: Emission, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === item.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const newOrder = [...items];
    const temp = newOrder[idx].sort_order;
    newOrder[idx] = { ...newOrder[idx], sort_order: newOrder[swapIdx].sort_order };
    newOrder[swapIdx] = { ...newOrder[swapIdx], sort_order: temp };

    await supabase.from('emissions').update({ sort_order: newOrder[idx].sort_order }).eq('id', newOrder[idx].id);
    await supabase.from('emissions').update({ sort_order: newOrder[swapIdx].sort_order }).eq('id', newOrder[swapIdx].id);
    fetchItems();
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Émissions</h2>
        {isFullAdmin && (
        <button onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Ajouter une émission
        </button>
        )}
      </div>

      {/* Form panel */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-5 border border-accent-400/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? "Modifier l'émission" : 'Nouvelle émission'}
            </h3>
            <button onClick={closeForm} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Titre <span className="text-red-400">*</span></label>
              <input type="text" value={form.title} onChange={(e) => handleField('title', e.target.value)} placeholder="Titre de l'émission" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Plateforme</label>
              <select value={form.platform} onChange={(e) => handleField('platform', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm">
                {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Animateur / Hôte</label>
              <input type="text" value={form.host} onChange={(e) => handleField('host', e.target.value)} placeholder="Nom de l'animateur" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Programme / Horaire</label>
              <input type="text" value={form.schedule} onChange={(e) => handleField('schedule', e.target.value)} placeholder="Ex: Dimanche 10h, Mercredi 19h…" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">URL miniature</label>
              <input type="text" value={form.thumbnail_url} onChange={(e) => handleField('thumbnail_url', e.target.value)} placeholder="https://…" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">URL vidéo</label>
              <input type="text" value={form.video_url} onChange={(e) => handleField('video_url', e.target.value)} placeholder="https://…" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Description <span className="text-red-400">*</span></label>
              <textarea rows={4} value={form.description} onChange={(e) => handleField('description', e.target.value)} placeholder="Décrivez l'émission..." className="input-surface w-full px-4 py-2.5 text-sm resize-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => handleField('is_featured', e.target.checked)} className="h-4 w-4 rounded border-line accent-evangile-600" />
              <span className="text-sm text-cream/80 flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-accent-400" /> Mis en avant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_live} onChange={(e) => handleField('is_live', e.target.checked)} className="h-4 w-4 rounded border-line accent-red-500" />
              <span className="text-sm text-cream/80 flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
                En direct
              </span>
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
        <div className="glass rounded-2xl p-12 text-center"><p className="text-muted text-sm">Aucune émission pour le moment.</p></div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="glass rounded-2xl overflow-hidden group">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-base font-semibold text-cream truncate">{item.title}</h4>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${PLATFORM_COLORS[item.platform] || 'bg-white/10 text-muted'}`}>
                        {PLATFORM_LABELS[item.platform] || item.platform}
                      </span>
                      {item.is_featured && (
                        <span className="flex items-center gap-1 rounded-full bg-accent-400/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-400">
                          <Star className="h-3 w-3" /> Mis en avant
                        </span>
                      )}
                      {item.is_live && (
                        <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-400">
                          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" /></span>
                          Live
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-muted'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                      {item.host && <span>Par {item.host}</span>}
                      {item.schedule && <span>&middot; {item.schedule}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isFullAdmin && idx > 0 && (
                    <button onClick={() => moveSort(item, 'up')} title="Monter" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    )}
                    {isFullAdmin && idx < items.length - 1 && (
                    <button onClick={() => moveSort(item, 'down')} title="Descendre" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    )}
                    {isFullAdmin && (
                    <button onClick={() => toggleFeatured(item)} title="Mis en avant" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-accent-400/40 hover:text-accent-400 transition">
                      <Star className={`h-4 w-4 ${item.is_featured ? 'fill-evangile-500 text-accent-400' : ''}`} />
                    </button>
                    )}
                    {isFullAdmin && (
                    <button onClick={() => toggleLive(item)} title="En direct" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition">
                      {item.is_live ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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