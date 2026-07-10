import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Check, Mail, Eye } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';

interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  photo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM: Omit<Testimonial, 'id' | 'created_at' | 'updated_at'> = {
  author_name: '',
  author_title: '',
  content: '',
  photo_url: '',
  sort_order: 0,
  is_active: true,
};

function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-6 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-surface-2" />
              <div className="h-3 w-1/5 rounded bg-surface-2" />
              <div className="mt-3 h-3 w-full rounded bg-surface-2" />
              <div className="h-3 w-4/5 rounded bg-surface-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial,
  onEdit,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
}: {
  testimonial: Testimonial;
  onEdit: (t: Testimonial) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
}) {
  const isConfirming = deleteConfirm === testimonial.id;

  return (
    <div className={`glass rounded-2xl p-6 transition ${!testimonial.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {testimonial.photo_url ? (
            <img
              src={testimonial.photo_url}
              alt={testimonial.author_name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-400/20 text-gold-400 font-serif text-lg font-semibold">
              {testimonial.author_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-cream">{testimonial.author_name}</h3>
              {testimonial.author_title && (
                <p className="text-xs text-muted">{testimonial.author_title}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => onEdit(testimonial)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                aria-label="Modifier"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              {isConfirming ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onDelete(testimonial.id)}
                    className="flex h-9 items-center gap-1 rounded-xl bg-red-500/20 px-2.5 text-xs font-medium text-red-400 hover:bg-red-500/30 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Oui
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn-ghost h-9 px-2.5 text-xs"
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(testimonial.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-500/40 hover:text-red-400 transition"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quote */}
          <div className="mt-3 relative pl-4 border-l-2 border-gold-400/30">
            <p className="text-sm leading-relaxed text-cream/80 line-clamp-3">{testimonial.content}</p>
          </div>

          {!testimonial.is_active && (
            <span className="mt-3 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Inactif
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsTab() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Testimonial, 'id' | 'created_at' | 'updated_at'>>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order');

    if (error) {
      addToast('Erreur lors du chargement des témoignages', 'error');
    } else {
      setItems(data as Testimonial[]);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.author_name.trim() || !form.content.trim()) {
      addToast('Le nom et le contenu sont requis', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      author_name: form.author_name.trim(),
      author_title: form.author_title.trim() || null,
      content: form.content.trim(),
      photo_url: form.photo_url?.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase
        .from('testimonials')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        addToast('Erreur lors de la mise à jour', 'error');
      } else {
        addToast('Témoignage mis à jour avec succès', 'success');
      }
    } else {
      const { error } = await supabase
        .from('testimonials')
        .insert(payload);

      if (error) {
        addToast('Erreur lors de la création', 'error');
      } else {
        addToast('Témoignage ajouté avec succès', 'success');
      }
    }

    setSaving(false);
    setIsFormOpen(false);
    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) {
      addToast('Erreur lors de la suppression', 'error');
    } else {
      addToast('Témoignage supprimé', 'success');
      setDeleteConfirm(null);
      fetchItems();
    }
  };

  const updateForm = <K extends keyof Omit<Testimonial, 'id' | 'created_at' | 'updated_at'>>(
    key: K,
    value: Omit<Testimonial, 'id' | 'created_at' | 'updated_at'>[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            {editingId ? 'Modifier le témoignage' : 'Ajouter un témoignage'}
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
          {/* Author name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Nom de l'auteur *</label>
            <input
              type="text"
              className="input-surface w-full px-4 py-2.5 text-sm"
              value={form.author_name}
              onChange={e => updateForm('author_name', e.target.value)}
              placeholder="Nom complet"
            />
          </div>

          {/* Author title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Titre / Rôle</label>
            <input
              type="text"
              className="input-surface w-full px-4 py-2.5 text-sm"
              value={form.author_title}
              onChange={e => updateForm('author_title', e.target.value)}
              placeholder="Ex: Membre de la paroisse"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Témoignage *</label>
            <textarea
              className="input-surface w-full px-4 py-2.5 text-sm resize-none"
              rows={5}
              value={form.content}
              onChange={e => updateForm('content', e.target.value)}
              placeholder="Le témoignage..."
            />
          </div>

          {/* Photo URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">URL de la photo</label>
            <input
              type="text"
              className="input-surface w-full px-4 py-2.5 text-sm"
              value={form.photo_url}
              onChange={e => updateForm('photo_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Ou uploader une photo</label>
            <ImageUpload
              value={form.photo_url}
              onChange={(url: string) => setForm(f => ({ ...f, photo_url: url }))}
            />
          </div>

          {/* Sort order & Active */}
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
                <span className="text-sm text-cream">Témoignage actif</span>
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
        <h2 className="font-serif text-2xl font-semibold text-cream">Témoignages</h2>
        <button onClick={handleCreate} className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
          <Plus className="h-4 w-4" /> Ajouter un témoignage
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted">Aucun témoignage pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <TestimonialCard
              key={item.id}
              testimonial={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}