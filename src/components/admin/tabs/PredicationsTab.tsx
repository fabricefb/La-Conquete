import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { ImageUpload } from '../ImageUpload';
import {
  Plus, Trash2, Edit3, X, Save, Loader2, Star, GripVertical,
  ChevronUp, ChevronDown, Play, Radio, Mic, Calendar,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────
interface Sermon {
  id: string;
  title: string;
  preacher: string;
  description: string;
  series: string;
  duration: string;
  thumbnail_url: string;
  video_url: string;
  audio_url: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  preached_on: string | null;
  created_at: string;
  updated_at: string;
}

interface SermonForm {
  title: string;
  preacher: string;
  description: string;
  series: string;
  duration: string;
  thumbnail_url: string;
  video_url: string;
  audio_url: string;
  is_featured: boolean;
  is_active: boolean;
  preached_on: string;
}

const EMPTY_FORM: SermonForm = {
  title: '',
  preacher: '',
  description: '',
  series: '',
  duration: '',
  thumbnail_url: '',
  video_url: '',
  audio_url: '',
  is_featured: false,
  is_active: true,
  preached_on: new Date().toISOString().split('T')[0],
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function PredicationsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<SermonForm>(EMPTY_FORM);
  const [filterSeries, setFilterSeries] = useState('Toutes');

  // ── Fetch ───────────────────────────────────────────────────────
  const fetchSermons = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('preached_on', { ascending: false });
      if (error) throw error;
      setSermons((data ?? []) as Sermon[]);
    } catch (err: any) {
      console.error('[PredicationsTab] fetch error:', err);
      addToast('Erreur lors du chargement des prédications', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchSermons(); }, [fetchSermons]);

  // ── Series list for filter ──────────────────────────────────────
  const allSeries = Array.from(new Set(sermons.map(s => s.series).filter(Boolean)));
  const filteredSermons = filterSeries === 'Toutes'
    ? sermons
    : sermons.filter(s => s.series === filterSeries);

  // ── Helpers ─────────────────────────────────────────────────────
  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEdit(s: Sermon) {
    setForm({
      title: s.title,
      preacher: s.preacher,
      description: s.description,
      series: s.series,
      duration: s.duration,
      thumbnail_url: s.thumbnail_url,
      video_url: s.video_url,
      audio_url: s.audio_url,
      is_featured: s.is_featured,
      is_active: s.is_active,
      preached_on: s.preached_on ?? '',
    });
    setEditingId(s.id);
    setIsFormOpen(true);
  }

  // ── Save (insert or update) ─────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim()) {
      addToast('Le titre est obligatoire', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        preacher: form.preacher.trim(),
        description: form.description.trim(),
        series: form.series.trim(),
        duration: form.duration.trim(),
        thumbnail_url: form.thumbnail_url.trim(),
        video_url: form.video_url.trim(),
        audio_url: form.audio_url.trim(),
        is_featured: form.is_featured,
        is_active: form.is_active,
        preached_on: form.preached_on || null,
        sort_order: editingId
          ? sermons.find(s => s.id === editingId)?.sort_order ?? 0
          : sermons.length,
      };

      if (editingId) {
        const { error } = await supabase
          .from('sermons')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        addToast('Prédication mise à jour', 'success');
      } else {
        const { error } = await supabase
          .from('sermons')
          .insert(payload);
        if (error) throw error;
        addToast('Prédication ajoutée', 'success');
      }
      setIsFormOpen(false);
      await fetchSermons();
    } catch (err: any) {
      console.error('[PredicationsTab] save error:', err);
      addToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette prédication ?')) return;
    try {
      const { error } = await supabase.from('sermons').delete().eq('id', id);
      if (error) throw error;
      addToast('Prédication supprimée', 'success');
      await fetchSermons();
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }

  // ── Toggle featured ────────────────────────────────────────────
  async function toggleFeatured(s: Sermon) {
    try {
      const { error } = await supabase
        .from('sermons')
        .update({ is_featured: !s.is_featured })
        .eq('id', s.id);
      if (error) throw error;
      await fetchSermons();
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────
  async function moveOrder(s: Sermon, direction: 'up' | 'down') {
    const idx = filteredSermons.findIndex(x => x.id === s.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filteredSermons.length) return;
    const other = filteredSermons[swapIdx];
    try {
      await supabase.from('sermons').update({ sort_order: other.sort_order }).eq('id', s.id);
      await supabase.from('sermons').update({ sort_order: s.sort_order }).eq('id', other.id);
      await fetchSermons();
    } catch (err: any) {
      addToast('Erreur de réordonnancement', 'error');
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-300">Supabase n'est pas configuré.</p>
        <p className="mt-1 text-xs text-muted">Exécutez la migration <code className="text-red-400">20260720000000_sermons_activity_cards.sql</code></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">Prédications</h2>
          <p className="mt-1 text-sm text-muted">Gérez les prédications affichées sur la page <code className="text-accent-400">#predications</code></p>
        </div>
        {isFullAdmin && (
          <button onClick={openNew} className="btn-accent inline-flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Ajouter une prédication
          </button>
        )}
      </div>

      {/* ── Migration hint ── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-muted">
        <strong className="text-cream/80">Table :</strong> <code>sermons</code> &nbsp;|&nbsp;
        <strong className="text-cream/80">Migration :</strong> <code>20260720000000_sermons_activity_cards.sql</code> &nbsp;|&nbsp;
        <strong className="text-cream/80">Enregistrements :</strong> {sermons.length}
      </div>

      {/* ── Filter by series ── */}
      {allSeries.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterSeries('Toutes')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterSeries === 'Toutes' ? 'bg-accent-400/20 text-accent-400 border border-accent-400/30' : 'bg-white/5 text-muted hover:text-cream'}`}
          >Toutes ({sermons.length})</button>
          {allSeries.map(s => (
            <button
              key={s}
              onClick={() => setFilterSeries(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterSeries === s ? 'bg-accent-400/20 text-accent-400 border border-accent-400/30' : 'bg-white/5 text-muted hover:text-cream'}`}
            >{s} ({sermons.filter(x => x.series === s).length})</button>
          ))}
        </div>
      )}

      {/* ── Form panel ── */}
      {isFormOpen && (
        <div className="glass rounded-2xl p-6 space-y-5 border border-accent-400/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? 'Modifier la prédication' : 'Nouvelle prédication'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-muted hover:text-cream transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: La foi qui déplace les montagnes"
                className="input-surface w-full"
              />
            </div>

            {/* Preacher */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Prédicateur</label>
              <input
                type="text"
                value={form.preacher}
                onChange={e => setForm(f => ({ ...f, preacher: e.target.value }))}
                placeholder="Ex: Pasteur Emmanuel Kayumba"
                className="input-surface w-full"
              />
            </div>

            {/* Date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Date de prédication</label>
              <input
                type="date"
                value={form.preached_on}
                onChange={e => setForm(f => ({ ...f, preached_on: e.target.value }))}
                className="input-surface w-full"
              />
            </div>

            {/* Series */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Série</label>
              <input
                type="text"
                value={form.series}
                onChange={e => setForm(f => ({ ...f, series: e.target.value }))}
                placeholder="Ex: Marcher par la foi"
                className="input-surface w-full"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Durée</label>
              <input
                type="text"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="Ex: 1h 15min"
                className="input-surface w-full"
              />
            </div>

            {/* Video URL */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Lien vidéo (YouTube, etc.)</label>
              <input
                type="url"
                value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                className="input-surface w-full"
              />
            </div>

            {/* Audio URL */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Lien audio (MP3, etc.)</label>
              <input
                type="url"
                value={form.audio_url}
                onChange={e => setForm(f => ({ ...f, audio_url: e.target.value }))}
                placeholder="https://...mp3"
                className="input-surface w-full"
              />
            </div>

            {/* Thumbnail */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Image miniature</label>
              <ImageUpload
                value={form.thumbnail_url}
                onChange={url => setForm(f => ({ ...f, thumbnail_url: url }))}
                folder="sermons"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Résumé de la prédication..."
                rows={3}
                className="input-surface w-full resize-none"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3 sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                  className="h-4 w-4 rounded border-line bg-white/5 accent-accent-400"
                />
                <span className="text-sm text-cream">Prédication à la une</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-line bg-white/5 accent-accent-400"
                />
                <span className="text-sm text-cream">Active (visible sur le site)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setIsFormOpen(false)} className="btn-ghost text-sm">Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-accent inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass animate-pulse rounded-xl p-4 h-20" />
          ))}
        </div>
      )}

      {/* ── Sermons list ── */}
      {!loading && filteredSermons.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Radio className="h-10 w-10 text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-muted">
            {filterSeries === 'Toutes' ? 'Aucune prédication. Cliquez sur « Ajouter » pour commencer.' : `Aucune prédication dans la série « ${filterSeries } ».`}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filteredSermons.map((s) => (
          <div
            key={s.id}
            className={`glass rounded-xl p-4 transition-all ${!s.is_active ? 'opacity-50' : ''} ${s.is_featured ? 'border border-accent-400/30' : 'border border-transparent'}`}
          >
            <div className="flex items-start gap-3">
              {/* Reorder grip */}
              {isFullAdmin && (
                <div className="flex flex-col gap-0.5 pt-1">
                  <button onClick={() => moveOrder(s, 'up')} className="p-0.5 text-muted/40 hover:text-cream transition" title="Monter">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-3.5 w-3.5 text-muted/20" />
                  <button onClick={() => moveOrder(s, 'down')} className="p-0.5 text-muted/40 hover:text-cream transition" title="Descendre">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Thumbnail */}
              <div className="h-16 w-24 shrink-0 rounded-lg overflow-hidden bg-navy-800">
                {s.thumbnail_url ? (
                  <img src={s.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Play className="h-5 w-5 text-muted/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {s.is_featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-400">
                      <Star className="h-2.5 w-2.5" /> À la une
                    </span>
                  )}
                  {!s.is_active && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                      Inactive
                    </span>
                  )}
                  {s.series && (
                    <span className="rounded-full border border-accent-400/20 bg-accent-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-400">
                      {s.series}
                    </span>
                  )}
                </div>
                <h4 className="mt-1 font-serif text-base font-semibold text-cream truncate">{s.title}</h4>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                  {s.preacher && (
                    <span className="flex items-center gap-1">
                      <Mic className="h-3 w-3" /> {s.preacher}
                    </span>
                  )}
                  {s.preached_on && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(s.preached_on).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {s.duration && <span>{s.duration}</span>}
                  {s.video_url && (
                    <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-400 hover:text-red-300">
                      <Play className="h-3 w-3" /> Vidéo
                    </a>
                  )}
                  {s.audio_url && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Radio className="h-3 w-3" /> Audio
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="mt-1.5 text-xs text-muted line-clamp-2">{s.description}</p>
                )}
              </div>

              {/* Actions */}
              {isFullAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFeatured(s)}
                    className={`p-2 rounded-lg transition ${s.is_featured ? 'text-accent-400 hover:text-accent-300' : 'text-muted/40 hover:text-accent-400'}`}
                    title={s.is_featured ? 'Retirer de la une' : 'Mettre à la une'}
                  >
                    <Star className={`h-4 w-4 ${s.is_featured ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => openEdit(s)} className="p-2 rounded-lg text-muted hover:text-cream transition" title="Modifier">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg text-muted hover:text-red-400 transition" title="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}