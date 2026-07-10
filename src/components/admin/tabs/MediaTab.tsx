import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Check, Eye } from 'lucide-react';
import ImageUpload from '../ImageUpload';

interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  file_type: 'image' | 'video' | 'audio';
  category: 'sermon' | 'event' | 'worship' | 'community' | 'general';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'sermon', label: 'Sermons' },
  { value: 'event', label: 'Événements' },
  { value: 'worship', label: 'Louange' },
  { value: 'community', label: 'Communauté' },
  { value: 'general', label: 'Général' },
] as const;

const FILE_TYPE_OPTIONS: { value: MediaItem['file_type']; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Vidéo' },
  { value: 'audio', label: 'Audio' },
];

const CATEGORY_OPTIONS: { value: MediaItem['category']; label: string }[] = [
  { value: 'sermon', label: 'Sermon' },
  { value: 'event', label: 'Événement' },
  { value: 'worship', label: 'Louange' },
  { value: 'community', label: 'Communauté' },
  { value: 'general', label: 'Général' },
];

const EMPTY_FORM: Omit<MediaItem, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  description: '',
  file_url: '',
  thumbnail_url: '',
  file_type: 'image',
  category: 'general',
  sort_order: 0,
  is_active: true,
};

function FileIcon({ type }: { type: MediaItem['file_type'] }) {
  if (type === 'video') {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-xl bg-surface-2">
        <Eye className="h-10 w-10 text-muted" />
      </div>
    );
  }
  if (type === 'audio') {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-xl bg-surface-2">
        <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
      </div>
    );
  }
  return null;
}

function CategoryBadge({ category }: { category: MediaItem['category'] }) {
  const label = CATEGORIES.find(c => c.value === category)?.label ?? category;
  return <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold-400">{label}</span>;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-4 animate-pulse">
          <div className="mb-3 h-40 w-full rounded-xl bg-surface-2" />
          <div className="mb-2 h-4 w-3/4 rounded bg-surface-2" />
          <div className="h-3 w-1/2 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export function MediaTab() {
  const { addToast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('sort_order');

    if (error) {
      addToast('Erreur lors du chargement des médias', 'error');
    } else {
      setItems(data as MediaItem[]);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter(item => item.category === activeFilter);

  const handleCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? '',
      file_url: item.file_url,
      thumbnail_url: item.thumbnail_url ?? '',
      file_type: item.file_type,
      category: item.category,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.file_url.trim()) {
      addToast('Le titre et l\'URL du fichier sont requis', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      file_url: form.file_url.trim(),
      thumbnail_url: form.thumbnail_url?.trim() || null,
      file_type: form.file_type,
      category: form.category,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase
        .from('media_items')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        addToast('Erreur lors de la mise à jour', 'error');
      } else {
        addToast('Média mis à jour avec succès', 'success');
      }
    } else {
      const { error } = await supabase
        .from('media_items')
        .insert(payload);

      if (error) {
        addToast('Erreur lors de la création', 'error');
      } else {
        addToast('Média ajouté avec succès', 'success');
      }
    }

    setSaving(false);
    setIsFormOpen(false);
    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    if (error) {
      addToast('Erreur lors de la suppression', 'error');
    } else {
      addToast('Média supprimé', 'success');
      setDeleteConfirm(null);
      fetchItems();
    }
  };

  const handleToggleActive = async (item: MediaItem) => {
    const { error } = await supabase
      .from('media_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (!error) {
      setItems(prev => prev.map(m => m.id === item.id ? { ...m, is_active: !m.is_active } : m));
    }
  };

  const updateForm = <K extends keyof Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>>(
    key: K,
    value: Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            {editingId ? 'Modifier le média' : 'Ajouter un média'}
          </h2>
          <button
            onClick={() => { setIsFormOpen(false); setEditingId(null); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Titre *</label>
            <input
              type="text"
              className="input-surface w-full px-4 py-2.5 text-sm"
              value={form.title}
              onChange={e => updateForm('title', e.target.value)}
              placeholder="Titre du média"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
            <textarea
              className="input-surface w-full px-4 py-2.5 text-sm resize-none"
              rows={3}
              value={form.description ?? ''}
              onChange={e => updateForm('description', e.target.value)}
              placeholder="Description optionnelle"
            />
          </div>

          {/* File type & Category row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Type de fichier</label>
              <select
                className="input-surface w-full px-4 py-2.5 text-sm"
                value={form.file_type}
                onChange={e => updateForm('file_type', e.target.value as MediaItem['file_type'])}
              >
                {FILE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Catégorie</label>
              <select
                className="input-surface w-full px-4 py-2.5 text-sm"
                value={form.category}
                onChange={e => updateForm('category', e.target.value as MediaItem['category'])}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">URL du fichier *</label>
            <input
              type="text"
              className="input-surface w-full px-4 py-2.5 text-sm"
              value={form.file_url}
              onChange={e => updateForm('file_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Image upload */}
          {form.file_type === 'image' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Ou uploader une image</label>
              <ImageUpload
                value={form.file_url}
                onChange={(url: string) => setForm(f => ({ ...f, file_url: url }))}
              />
            </div>
          )}

          {/* Thumbnail URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">URL de la miniature</label>
            <input
              type="text"
              className="input-surface w-full px-4 py-2.5 text-sm"
              value={form.thumbnail_url ?? ''}
              onChange={e => updateForm('thumbnail_url', e.target.value)}
              placeholder="https://... (optionnel)"
            />
          </div>

          {/* Sort order & Active row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Ordre d'affichage</label>
              <input
                type="number"
                className="input-surface w-full px-4 py-2.5 text-sm"
                value={form.sort_order}
                onChange={e => updateForm('sort_order', parseInt(e.target.value, 10) || 0)}
                min={0}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => updateForm('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-line text-gold-400 focus:ring-gold-400/30"
                />
                <span className="text-sm text-cream">Média actif</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button
              onClick={() => { setIsFormOpen(false); setEditingId(null); }}
              className="btn-ghost px-5 py-2.5 text-sm font-medium"
            >
              Annuler
            </button>
            {editingId && (
              <div className="ml-auto">
                {deleteConfirm === editingId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Confirmer ?</span>
                    <button
                      onClick={() => handleDelete(editingId)}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500/20 px-3 text-xs font-medium text-red-400 hover:bg-red-500/30 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Oui
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="btn-ghost px-3 py-2 text-xs"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(editingId)}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 px-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Médias</h2>
        <button onClick={handleCreate} className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> Ajouter un média
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              activeFilter === cat.value
                ? 'bg-gold-400/20 text-gold-400'
                : 'text-muted hover:text-cream'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <SkeletonGrid />
      ) : filteredItems.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted">Aucun média trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <div key={item.id} className={`glass rounded-2xl p-4 transition ${!item.is_active ? 'opacity-50' : ''}`}>
              {/* Thumbnail */}
              <div className="mb-3 overflow-hidden rounded-xl">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="h-40 w-full object-cover"
                  />
                ) : item.file_type === 'image' && item.file_url ? (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <FileIcon type={item.file_type} />
                )}
              </div>

              {/* Info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-cream line-clamp-1">{item.title}</h3>
                <button
                  onClick={() => handleToggleActive(item)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                    item.is_active
                      ? 'border-gold-400/40 text-gold-400'
                      : 'border-line text-muted'
                  } hover:border-gold-400/60"
                  aria-label={item.is_active ? 'Désactiver' : 'Activer'}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
              <CategoryBadge category={item.category} />

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                  aria-label="Modifier"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}