import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Star } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Ministry {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  schedule: string;
  image_url: string | null;
  accent_color: 'gold' | 'ember';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type MinistryFormData = Omit<Ministry, 'id' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: MinistryFormData = {
  title: '',
  description: '',
  icon_name: 'Users',
  schedule: '',
  image_url: null,
  accent_color: 'gold',
  sort_order: 0,
  is_active: true,
};

const ICON_OPTIONS = [
  'Users',
  'Heart',
  'Crown',
  'BookOpen',
  'Moon',
  'Flame',
  'HandHeart',
  'Sparkles',
  'Music',
  'GraduationCap',
  'Globe',
  'Mic',
] as const;

type IconName = (typeof ICON_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function accentLabel(color: 'gold' | 'ember'): string {
  return color === 'gold' ? 'Or' : 'Rouge';
}

function accentClasses(color: 'gold' | 'ember'): string {
  if (color === 'gold') {
    return 'bg-gold-400/20 text-gold-400 border-gold-400/30';
  }
  return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
}

function accentDotClasses(color: 'gold' | 'ember'): string {
  return color === 'gold' ? 'bg-gold-400' : 'bg-orange-400';
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5" />
          <div className="h-4 w-1/3 rounded bg-white/5" />
        </div>
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MinistriesTab() {
  const { showToast } = useToast();

  // ---- state ---------------------------------------------------------------
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MinistryFormData>(EMPTY_FORM);

  // ---- fetch ---------------------------------------------------------------
  const fetchMinistries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ministries')
      .select('*')
      .order('sort_order');

    if (error) {
      showToast('Erreur lors du chargement des ministères', 'error');
    } else {
      setMinistries((data as Ministry[]) ?? []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchMinistries();
  }, [fetchMinistries]);

  // ---- form helpers --------------------------------------------------------
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (ministry: Ministry) => {
    setEditingId(ministry.id);
    setForm({
      title: ministry.title,
      description: ministry.description,
      icon_name: ministry.icon_name,
      schedule: ministry.schedule,
      image_url: ministry.image_url,
      accent_color: ministry.accent_color,
      sort_order: ministry.sort_order,
      is_active: ministry.is_active,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleField = <K extends keyof MinistryFormData>(
    field: K,
    value: MinistryFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- save ----------------------------------------------------------------
  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Le titre est obligatoire', 'error');
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      icon_name: form.icon_name,
      schedule: form.schedule.trim(),
      image_url: form.image_url?.trim() || null,
      accent_color: form.accent_color,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase
        .from('ministries')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        showToast('Erreur lors de la mise à jour', 'error');
      } else {
        showToast('Ministère mis à jour avec succès', 'success');
        closeForm();
        fetchMinistries();
      }
    } else {
      const { error } = await supabase.from('ministries').insert(payload);

      if (error) {
        showToast('Erreur lors de la création', 'error');
      } else {
        showToast('Ministère créé avec succès', 'success');
        closeForm();
        fetchMinistries();
      }
    }

    setSaving(false);
  };

  // ---- delete --------------------------------------------------------------
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce ministère ? Cette action est irréversible.')) {
      return;
    }

    const { error } = await supabase.from('ministries').delete().eq('id', id);

    if (error) {
      showToast('Erreur lors de la suppression', 'error');
    } else {
      showToast('Ministère supprimé', 'success');
      fetchMinistries();
    }
  };

  // ---- toggle active -------------------------------------------------------
  const toggleActive = async (ministry: Ministry) => {
    const { error } = await supabase
      .from('ministries')
      .update({ is_active: !ministry.is_active })
      .eq('id', ministry.id);

    if (!error) {
      showToast(
        ministry.is_active ? 'Ministère désactivé' : 'Ministère activé',
        'success',
      );
      fetchMinistries();
    }
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">
          Ministères
        </h2>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un ministère
        </button>
      </div>

      {/* Form panel */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-5 border border-gold-400/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? 'Modifier le ministère' : 'Nouveau ministère'}
            </h3>
            <button onClick={closeForm} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Titre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleField('title', e.target.value)}
                placeholder="Nom du ministère"
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Icône
              </label>
              <select
                value={form.icon_name}
                onChange={(e) => handleField('icon_name', e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Horaire
              </label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => handleField('schedule', e.target.value)}
                placeholder="ex: Tous les dimanches à 10h"
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            {/* Sort order */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Ordre d'affichage
              </label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => handleField('sort_order', parseInt(e.target.value, 10) || 0)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                URL de l'image
              </label>
              <input
                type="text"
                value={form.image_url ?? ''}
                onChange={(e) => handleField('image_url', e.target.value || null)}
                placeholder="https://... (optionnel)"
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => handleField('description', e.target.value)}
                placeholder="Décrivez ce ministère..."
                className="input-surface w-full px-4 py-2.5 text-sm resize-none"
              />
            </div>
          </div>

          {/* Accent color toggle */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Couleur d'accent
            </label>
            <div className="flex gap-2">
              {(['gold', 'ember'] as const).map((color) => {
                const isActive = form.accent_color === color;
                const baseClasses =
                  'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition';

                if (isActive) {
                  return (
                    <button
                      key={color}
                      onClick={() => handleField('accent_color', color)}
                      className={`${baseClasses} ${accentClasses(color)}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${accentDotClasses(color)}`} />
                      {accentLabel(color)}
                    </button>
                  );
                }

                return (
                  <button
                    key={color}
                    onClick={() => handleField('accent_color', color)}
                    className={`${baseClasses} border-line text-muted hover:border-gold-400/40 hover:text-cream`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${accentDotClasses(color)} opacity-40`} />
                    {accentLabel(color)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleField('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-line accent-gold-400"
            />
            <span className="text-sm text-cream/80">Ministère actif</span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={closeForm} className="btn-ghost flex items-center gap-2">
              <X className="h-4 w-4" />
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Ministry list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : ministries.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted text-sm">Aucun ministère pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ministries.map((ministry) => (
            <div
              key={ministry.id}
              className="glass rounded-2xl p-5 group relative"
            >
              {/* Top row: icon + title + actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon placeholder */}
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${accentClasses(ministry.accent_color)}`}>
                    <Star className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-base font-semibold text-cream truncate">
                        {ministry.title}
                      </h4>
                      {ministry.is_active ? (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                          Actif
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                          Inactif
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-[11px] text-muted">
                      Icône: <span className="text-cream/60">{ministry.icon_name}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleActive(ministry)}
                    title={ministry.is_active ? 'Désactiver' : 'Activer'}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                  >
                    <Star className={`h-4 w-4 ${ministry.is_active ? 'fill-gold-400 text-gold-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => openEdit(ministry)}
                    title="Modifier"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ministry.id)}
                    title="Supprimer"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Schedule */}
              {ministry.schedule && (
                <p className="mt-2 text-xs text-cream/50 pl-[52px]">
                  {ministry.schedule}
                </p>
              )}

              {/* Description */}
              {ministry.description && (
                <p className="mt-1 text-xs text-muted line-clamp-2 pl-[52px]">
                  {ministry.description}
                </p>
              )}

              {/* Footer: sort order + accent color */}
              <div className="mt-3 flex items-center gap-3 pl-[52px]">
                <span className="text-[10px] text-muted">
                  Ordre: <span className="text-cream/60">{ministry.sort_order}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${accentClasses(ministry.accent_color)}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${accentDotClasses(ministry.accent_color)}`} />
                  {accentLabel(ministry.accent_color)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}