import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Save, ChevronDown, ChevronRight, Loader2, ImageIcon, Cloud } from 'lucide-react';
import ImageUpload from '../ImageUpload';

// ─── Types ──────────────────────────────────────────────────────────

type SettingType = 'text' | 'url' | 'json' | 'boolean' | 'number' | 'image';

interface SiteSetting {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  type: SettingType;
  category: string;
  sort_order: number;
  updated_at: string;
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  images: { label: 'Images & Médias', icon: '🖼️' },
  general: { label: 'Général', icon: '⚙️' },
  contact: { label: 'Contact', icon: '📍' },
  social: { label: 'Réseaux sociaux', icon: '🔗' },
  seo: { label: 'SEO', icon: '🔍' },
};

const CATEGORY_ORDER = ['images', 'general', 'contact', 'social', 'seo'];

/** Image-related setting keys that should use the ImageUpload component */
const IMAGE_SETTINGS = new Set([
  'mega_menu_image_about',
  'mega_menu_image_vie_eglise',
  'mega_menu_image_media',
  'site_logo_url',
  'logo_footer_url',
]);

/** Mapping of image setting key → folder for upload */
const IMAGE_FOLDER_MAP: Record<string, string> = {
  mega_menu_image_about: 'mega-menu',
  mega_menu_image_vie_eglise: 'mega-menu',
  mega_menu_image_media: 'mega-menu',
  site_logo_url: 'logo',
  logo_footer_url: 'logo',
};

/** Mapping of image setting key → user-friendly label override */
const IMAGE_LABELS: Record<string, string> = {
  mega_menu_image_about: 'Image Méga Menu — À Propos',
  mega_menu_image_vie_eglise: 'Image Méga Menu — Vie de l\'Église',
  mega_menu_image_media: 'Image Méga Menu — Média',
  site_logo_url: 'Logo du site (header)',
  logo_footer_url: 'Logo du pied de page',
};

// ─── Component ──────────────────────────────────────────────────────

export function SettingsTab() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['images', ...CATEGORY_ORDER.slice(1)]));

  // ── Fetch ──

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('sort_order');

      if (error) {
        addToast('Erreur lors du chargement des paramètres', 'error');
        return;
      }

      const rows: SiteSetting[] = data ?? [];
      setSettings(rows);

      const orig: Record<string, string> = {};
      const form: Record<string, string> = {};
      for (const s of rows) {
        orig[s.key] = s.value;
        form[s.key] = s.value;
      }
      setOriginalValues(orig);
      setFormValues(form);
      setLoading(false);
    };

    void fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Change handler ──

  const handleChange = useCallback((key: string, raw: string) => {
    setFormValues((prev) => ({ ...prev, [key]: raw }));
  }, []);

  const handleCheckboxToggle = useCallback((key: string, checked: boolean) => {
    setFormValues((prev) => ({ ...prev, [key]: checked ? 'true' : 'false' }));
  }, []);

  // ── Image change handler (from ImageUpload component) ──
  const handleImageChange = useCallback((key: string, url: string) => {
    setFormValues((prev) => ({ ...prev, [key]: url }));
  }, []);

  // ── Modified keys ──

  const modifiedKeys = new Set<string>(
    Object.keys(formValues).filter((k) => formValues[k] !== originalValues[k]),
  );

  // ── Grouped settings ──

  const grouped = new Map<string, SiteSetting[]>();
  for (const setting of settings) {
    const cat = setting.category ?? 'general';
    const list = grouped.get(cat) ?? [];
    list.push(setting);
    grouped.set(cat, list);
  }

  // ── Upsert helper: ensure image settings exist in DB ──
  const ensureImageSettings = useCallback(async () => {
    const imageSettingsDefs = [
      { key: 'mega_menu_image_about', label: 'Image Méga Menu — À Propos', category: 'images', type: 'url' as const, sort_order: 100, description: 'Image du panneau droit dans le méga menu À Propos' },
      { key: 'mega_menu_image_vie_eglise', label: 'Image Méga Menu — Vie de l\'Église', category: 'images', type: 'url' as const, sort_order: 101, description: 'Image du panneau droit dans le méga menu Vie de l\'Église' },
      { key: 'mega_menu_image_media', label: 'Image Méga Menu — Média', category: 'images', type: 'url' as const, sort_order: 102, description: 'Image du panneau droit dans le méga menu Média' },
      { key: 'site_logo_url', label: 'Logo du site (header)', category: 'images', type: 'url' as const, sort_order: 120, description: 'Logo affiché dans l\'en-tête du site' },
      { key: 'logo_footer_url', label: 'Logo du pied de page', category: 'images', type: 'url' as const, sort_order: 121, description: 'Logo affiché dans le pied de page' },
    ];

    const existingKeys = new Set(settings.map(s => s.key));
    const toInsert = imageSettingsDefs.filter(d => !existingKeys.has(d.key));

    if (toInsert.length === 0) return;

    const { error } = await supabase
      .from('site_settings')
      .upsert(toInsert.map(d => ({
        key: d.key,
        value: '',
        label: d.label,
        description: d.description || 'URL de l\'image (R2, ou toute URL publique)',
        type: d.type,
        category: d.category,
        sort_order: d.sort_order,
      })), { onConflict: 'key' });

    if (error) {
      console.warn('[SettingsTab] Erreur upsert image settings:', error.message);
      return;
    }

    // Re-fetch to include new settings
    const { data } = await supabase.from('site_settings').select('*').order('sort_order');
    if (data) {
      setSettings(data);
      const orig: Record<string, string> = {};
      const form: Record<string, string> = {};
      for (const s of data) {
        orig[s.key] = s.value;
        form[s.key] = s.value;
      }
      setOriginalValues(orig);
      setFormValues(form);
    }
  }, [settings]);

  // Run once after load
  useEffect(() => {
    if (!loading) {
      ensureImageSettings();
    }
  }, [loading, ensureImageSettings]);

  // ── Save ──

  const handleSave = useCallback(async () => {
    if (modifiedKeys.size === 0) return;

    setSaving(true);
    const now = new Date().toISOString();
    const keys = Array.from(modifiedKeys);

    const results = await Promise.allSettled(
      keys.map((key) =>
        supabase
          .from('site_settings')
          .update({ value: formValues[key], updated_at: now })
          .eq('key', key),
      ),
    );

    const failed = results
      .map((r, i) => (r.status === 'rejected' ? keys[i] : null))
      .filter((k): k is string => k !== null);

    if (failed.length === 0) {
      addToast('Paramètres sauvegardés avec succès', 'success');
      setOriginalValues({ ...formValues });
    } else {
      addToast(`${failed.length} paramètre(s) n'ont pas pu être sauvegardés`, 'error');
    }

    setSaving(false);
  }, [modifiedKeys, formValues, addToast]);

  // ── Toggle category ──

  const toggleCategory = useCallback((cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // ── Skeleton ──

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 animate-pulse">
            <div className="h-7 w-48 rounded-lg bg-white/5" />
            <div className="ml-4 space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-10 rounded-lg bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Render input ──

  const renderInput = (setting: SiteSetting) => {
    const val = formValues[setting.key] ?? '';
    const isImage = IMAGE_SETTINGS.has(setting.key);

    // Image settings get the full ImageUpload component
    if (isImage) {
      return (
        <ImageUpload
          value={val}
          onChange={(url) => handleImageChange(setting.key, url)}
          label={IMAGE_LABELS[setting.key] || setting.label}
          folder={IMAGE_FOLDER_MAP[setting.key] || 'images'}

        />
      );
    }

    switch (setting.type) {
      case 'text':
      case 'url':
        return (
          <input
            type={setting.type}
            value={val}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={setting.label}
          />
        );

      case 'json':
        return (
          <textarea
            value={val}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            rows={4}
            className="input-surface w-full px-4 py-2.5 text-sm font-mono"
            placeholder={setting.label}
          />
        );

      case 'boolean': {
        const checked = val === 'true';
        return (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => handleCheckboxToggle(setting.key, e.target.checked)}
              className="h-4 w-4 rounded border-line accent-evangile-600"
            />
            <span className="text-sm text-cream">
              {checked ? 'Activé' : 'Désactivé'}
            </span>
          </label>
        );
      }

      case 'number':
        return (
          <input
            type="number"
            value={val}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={setting.label}
          />
        );

      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={setting.label}
          />
        );
    }
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">
            Paramètres du site
          </h2>
          <p className="mt-1 text-xs text-muted">
            Gérez les paramètres globaux, images (R2/URL), et configuration du site
          </p>
        </div>
        <span className="rounded-full bg-evangile-600/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-evangile-500">
          {modifiedKeys.size} modifié{modifiedKeys.size !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── R2 Info Banner ── */}
      <div className="flex items-start gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
        <Cloud size={20} className="text-orange-400 shrink-0 mt-0.5" />
        <div className="text-sm text-cream/80 leading-relaxed">
          <p className="font-medium text-orange-300 mb-1">Stockage d'images — Cloudflare R2</p>
          <p>
            Pour utiliser vos propres images, uploadez-les dans votre bucket R2 sur le
            <strong> Dashboard Cloudflare → R2</strong>, puis copiez le lien public et collez-le
            dans les champs ci-dessous. Vous pouvez aussi utiliser toute URL d'image publique
            ou uploader directement via Supabase Storage.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-1">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const items = grouped.get(cat) ?? [];
          const meta = CATEGORY_META[cat] ?? { label: cat, icon: '📁' };
          const isOpen = openCategories.has(cat);
          const isImagesCategory = cat === 'images';

          return (
            <div key={cat} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center gap-3 py-3.5 text-left transition hover:opacity-80"
              >
                <span className="text-lg">{meta.icon}</span>
                <span className="font-serif text-lg font-semibold text-cream flex-1">
                  {meta.label}
                </span>
                <span className="text-xs text-muted mr-1">
                  {items.length} paramètre{items.length !== 1 ? 's' : ''}
                </span>
                {isOpen ? (
                  <ChevronDown size={16} className="text-muted" />
                ) : (
                  <ChevronRight size={16} className="text-muted" />
                )}
              </button>

              {isOpen && (
                <div className={`pb-5 space-y-5 ${isImagesCategory ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : ''}`}>
                  {items.map((setting) => (
                    <div key={setting.key} className={isImagesCategory ? '' : ''}>
                      {setting.description && (
                        <p className="mb-1.5 text-xs text-muted/60">
                          {setting.description}
                        </p>
                      )}
                      {renderInput(setting)}
                      {modifiedKeys.has(setting.key) && (
                        <span className="mt-1 inline-block text-[10px] text-evangile-500">
                          modifié
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Categories not in the predefined list */}
        {Array.from(grouped.keys())
          .filter((cat) => !CATEGORY_ORDER.includes(cat))
          .map((cat) => {
            const items = grouped.get(cat) ?? [];
            const isOpen = openCategories.has(cat);

            return (
              <div key={cat} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center gap-3 py-3.5 text-left transition hover:opacity-80"
                >
                  <span className="text-lg">📁</span>
                  <span className="font-serif text-lg font-semibold text-cream flex-1">
                    {cat}
                  </span>
                  {isOpen ? (
                    <ChevronDown size={16} className="text-muted" />
                  ) : (
                    <ChevronRight size={16} className="text-muted" />
                  )}
                </button>

                {isOpen && (
                  <div className="pb-5 space-y-5">
                    {items.map((setting) => (
                      <div key={setting.key}>
                        <label className="mb-1.5 block text-xs font-medium text-muted">
                          {setting.label}
                        </label>
                        {renderInput(setting)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || modifiedKeys.size === 0}
          className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Tout sauvegarder
        </button>
      </div>
    </div>
  );
}