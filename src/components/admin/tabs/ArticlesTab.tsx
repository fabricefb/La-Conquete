import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import type { SiteArticle } from '../../../types';
import { Plus, Trash2, Save, X, Edit3, Loader2, Eye, EyeOff, Star } from 'lucide-react';
import ImageUpload from '../ImageUpload';

const CATEGORIES: SiteArticle['category'][] = ['Enseignement', 'Événement', 'Annonce', 'Vision'];

interface ArticleForm {
  title: string;
  slug: string;
  category: SiteArticle['category'];
  published_at: string;
  excerpt: string;
  image_url: string;
  body: string;
  quote_text: string;
  quote_reference: string;
  source_url: string;
  is_featured: boolean;
  is_published: boolean;
}

const EMPTY_FORM: ArticleForm = {
  title: '',
  slug: '',
  category: 'Annonce',
  published_at: new Date().toISOString().slice(0, 10),
  excerpt: '',
  image_url: '',
  body: '',
  quote_text: '',
  quote_reference: '',
  source_url: '',
  is_featured: false,
  is_published: true,
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatDate(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ArticlesTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [items, setItems] = useState<SiteArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      addToast('Erreur lors du chargement des articles', 'error');
    } else {
      setItems((data as SiteArticle[]) ?? []);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: SiteArticle) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      category: item.category,
      published_at: item.published_at.slice(0, 10),
      excerpt: item.excerpt,
      image_url: item.image_url ?? '',
      body: (item.body ?? []).join('\n\n'),
      quote_text: item.quote_text ?? '',
      quote_reference: item.quote_reference ?? '',
      source_url: item.source_url ?? '',
      is_featured: item.is_featured,
      is_published: item.is_published,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const setField = <K extends keyof ArticleForm>(field: K, value: ArticleForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const slug = slugify(form.slug.trim() || title);
    const excerpt = form.excerpt.trim();
    const paragraphs = form.body
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (!title || !slug || !excerpt || paragraphs.length === 0) {
      addToast('Titre, résumé et corps de l’article sont obligatoires.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      title,
      slug,
      category: form.category,
      published_at: form.published_at
        ? new Date(`${form.published_at}T09:00:00`).toISOString()
        : new Date().toISOString(),
      excerpt,
      image_url: form.image_url.trim() || null,
      body: paragraphs,
      quote_text: form.quote_text.trim() || null,
      quote_reference: form.quote_reference.trim() || null,
      source_url: form.source_url.trim() || null,
      is_featured: form.is_featured,
      is_published: form.is_published,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('articles').update(payload).eq('id', editingId);
        if (error) throw error;
        addToast('Article mis à jour', 'success');
      } else {
        const { error } = await supabase.from('articles').insert(payload);
        if (error) throw error;
        addToast('Article créé', 'success');
      }
      closeForm();
      fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      addToast('Erreur lors de la sauvegarde : ' + message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: SiteArticle) => {
    if (!window.confirm(`Supprimer « ${item.title} » ?`)) return;
    const { error } = await supabase.from('articles').delete().eq('id', item.id);
    if (error) {
      addToast('Erreur : ' + error.message, 'error');
      return;
    }
    addToast('Article supprimé', 'success');
    fetchItems();
  };

  const togglePublished = async (item: SiteArticle) => {
    const { error } = await supabase
      .from('articles')
      .update({ is_published: !item.is_published })
      .eq('id', item.id);
    if (error) {
      addToast('Erreur : ' + error.message, 'error');
      return;
    }
    addToast(item.is_published ? 'Article masqué' : 'Article publié', 'success');
    fetchItems();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">Articles & actualités ({items.length})</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Les articles publiés alimentent la page Blog et la section Actualités de l’accueil. Sans article publié, le site garde les articles rédigés dans le dépôt.
          </p>
        </div>
        {isFullAdmin && <button onClick={openCreate} className="btn-gold text-sm"><Plus className="h-4 w-4" /> Nouvel article</button>}
      </div>

      {formOpen && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-cream">
              {editingId ? 'Modifier l’article' : 'Nouvel article'}
            </h3>
            <button onClick={closeForm} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:text-cream" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title,
                    slug: editingId ? prev.slug : slugify(title),
                  }));
                }}
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Identifiant (slug) *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Rubrique *</label>
              <select
                value={form.category}
                onChange={(e) => setField('category', e.target.value as SiteArticle['category'])}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Date de publication</label>
              <input
                type="date"
                value={form.published_at}
                onChange={(e) => setField('published_at', e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Lien source (Facebook, YouTube…)</label>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => setField('source_url', e.target.value)}
                placeholder="https://"
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setField('image_url', url)}
                label="Photo de l’article"
                folder="articles"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Résumé *</label>
              <textarea
                rows={3}
                value={form.excerpt}
                onChange={(e) => setField('excerpt', e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Corps de l’article * <span className="font-normal text-muted/70">(un paragraphe par bloc, séparés par une ligne vide)</span>
              </label>
              <textarea
                rows={10}
                value={form.body}
                onChange={(e) => setField('body', e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm leading-6"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Citation (optionnel)</label>
              <textarea
                rows={3}
                value={form.quote_text}
                onChange={(e) => setField('quote_text', e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Référence de la citation</label>
              <input
                type="text"
                value={form.quote_reference}
                onChange={(e) => setField('quote_reference', e.target.value)}
                placeholder="Matthieu 28:19"
                className="input-surface w-full px-4 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setField('is_published', e.target.checked)}
                  className="h-4 w-4 rounded accent-evangile-600"
                />
                Publié
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setField('is_featured', e.target.checked)}
                  className="h-4 w-4 rounded accent-evangile-600"
                />
                À la une
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2 sm:col-span-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-gold"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={closeForm} className="btn-ghost">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line p-10 text-center text-muted">
          <p>Aucun article enregistré. Le site affiche pour l’instant les articles rédigés dans le dépôt.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="glass flex items-start justify-between gap-4 rounded-2xl p-4">
              <div className="flex min-w-0 items-start gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-16 w-24 shrink-0 rounded-xl border border-line object-cover" />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-line bg-white/5 text-muted">
                    <Star className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-cream">{item.title}</p>
                    {item.is_featured && (
                      <span className="rounded-full bg-accent-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-400">À la une</span>
                    )}
                    {!item.is_published && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">Masqué</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                    {item.category} — {formatDate(item.published_at)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{item.excerpt}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isFullAdmin && (
                  <button
                    onClick={() => togglePublished(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-accent-400/40 hover:text-accent-400"
                    aria-label={item.is_published ? 'Masquer l’article' : 'Publier l’article'}
                  >
                    {item.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
                {isFullAdmin && (
                  <button
                    onClick={() => openEdit(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-accent-400/40 hover:text-accent-400"
                    aria-label="Modifier l’article"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
                {isFullAdmin && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-ember-500/40 hover:text-ember-400"
                    aria-label="Supprimer l’article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
