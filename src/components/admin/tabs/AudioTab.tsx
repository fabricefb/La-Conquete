import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  Loader2,
  Upload,
  Music,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Check,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────
const R2_BASE = 'https://pub-344d6377f96445089f6ad71c3ab2fc80.r2.dev';

type AudioCategory = 'predication' | 'louange' | 'enseignement' | 'temoignage' | 'autre';

const CATEGORY_OPTIONS: { value: AudioCategory; label: string }[] = [
  { value: 'predication', label: 'Prédication' },
  { value: 'louange', label: 'Louange' },
  { value: 'enseignement', label: 'Enseignement' },
  { value: 'temoignage', label: 'Témoignage' },
  { value: 'autre', label: 'Autre' },
];

const CATEGORY_STYLES: Record<AudioCategory, string> = {
  predication: 'bg-accent-400/20 text-accent-300',
  louange: 'bg-amber-600/20 text-amber-400',
  enseignement: 'bg-blue-600/20 text-blue-400',
  temoignage: 'bg-emerald-600/20 text-emerald-400',
  autre: 'bg-white/10 text-white/50',
};

const ACCEPTED_AUDIO = '.mp3,.wav,.ogg,.m4a';

// ─── Types ──────────────────────────────────────────────────────────
interface AudioTrack {
  id: string;
  title: string;
  speaker: string | null;
  description: string | null;
  audio_url: string;
  cover_url: string | null;
  category: AudioCategory;
  duration_sec: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TrackForm {
  title: string;
  speaker: string;
  category: AudioCategory;
  audioUrl: string;
}

interface InlineEdit {
  title: string;
  speaker: string;
  category: AudioCategory;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function detectDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('error', onErr);
      URL.revokeObjectURL(url);
    };
    const onMeta = () => {
      const dur = Math.round(audio.duration);
      cleanup();
      resolve(isFinite(dur) && dur > 0 ? dur : 0);
    };
    const onErr = () => {
      cleanup();
      resolve(0);
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('error', onErr);
    audio.src = url;
  });
}

const EMPTY_FORM: TrackForm = {
  title: '',
  speaker: '',
  category: 'predication',
  audioUrl: '',
};

const EMPTY_INLINE_EDIT: InlineEdit = {
  title: '',
  speaker: '',
  category: 'predication',
};

// ─── Category Badge ─────────────────────────────────────────────────
function CategoryBadge({ category }: { category: AudioCategory }) {
  const label = CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_STYLES[category] ?? CATEGORY_STYLES.autre}`}
    >
      {label}
    </span>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl bg-white/[0.02] border border-white/5 p-4 animate-pulse"
        >
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded bg-white/5" />
            <div className="h-3 w-1/4 rounded bg-white/5" />
          </div>
          <div className="h-6 w-20 rounded-full bg-white/5" />
          <div className="h-4 w-12 rounded bg-white/5" />
          <div className="h-8 w-8 rounded-lg bg-white/5" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function AudioTab() {
  const { addToast } = useToast();
  const { isAdmin } = useAdminAccess();

  // Data
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<TrackForm>(EMPTY_FORM);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<InlineEdit>(EMPTY_INLINE_EDIT);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Audio preview
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Fetch tracks ───────────────────────────────────────────────
  const fetchTracks = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      addToast('Erreur lors du chargement des pistes audio', 'error');
    } else {
      setTracks((data as AudioTrack[]) ?? []);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ─── Audio preview ─────────────────────────────────────────────
  const togglePreview = (track: AudioTrack) => {
    if (playingId === track.id) {
      // Pause
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    // Stop any previous playback
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (!track.audio_url) return;

    const audio = new Audio(track.audio_url);
    audio.addEventListener('ended', () => setPlayingId(null));
    audio.addEventListener('error', () => {
      setPlayingId(null);
      addToast('Erreur de lecture audio', 'error');
    });
    audio.play().catch(() => {
      addToast('Impossible de lire cette piste', 'error');
    });
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  // ─── Update form field ─────────────────────────────────────────
  const updateForm = <K extends keyof TrackForm>(key: K, value: TrackForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Handle file selection ─────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setAudioFile(file);
      // Clear any manual URL
      updateForm('audioUrl', '');
    }
  };

  // ─── Submit: add new track ─────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      addToast('Le titre est requis', 'error');
      return;
    }

    if (!audioFile && !form.audioUrl.trim()) {
      addToast("Veuillez fournir un fichier audio ou une URL", 'error');
      return;
    }

    setSubmitting(true);
    setUploadProgress(audioFile ? 'Upload en cours...' : null);

    try {
      let finalUrl = form.audioUrl.trim();
      let durationSec: number | null = null;

      // Upload file if provided
      if (audioFile) {
        const timestamp = Date.now();
        const safeName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `audio/${timestamp}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, audioFile, { cacheControl: '31536000' });

        if (uploadError) {
          addToast("Erreur lors de l'upload du fichier audio", 'error');
          setSubmitting(false);
          setUploadProgress(null);
          return;
        }

        finalUrl = `${R2_BASE}/${filePath}`;
        setUploadProgress('Détection de la durée...');

        // Detect duration
        durationSec = await detectDuration(audioFile);
      }

      // Determine sort_order (max + 1)
      const maxSort = tracks.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0);

      const { error } = await supabase.from('audio_tracks').insert({
        title: form.title.trim(),
        speaker: form.speaker.trim() || null,
        description: null,
        audio_url: finalUrl,
        cover_url: null,
        category: form.category,
        duration_sec: durationSec,
        sort_order: maxSort + 1,
        is_active: true,
      });

      if (error) {
        addToast('Erreur lors de la création de la piste', 'error');
      } else {
        addToast('Piste audio ajoutée avec succès', 'success');
        setForm(EMPTY_FORM);
        setAudioFile(null);
        setIsFormOpen(false);
        fetchTracks();
      }
    } catch {
      addToast('Erreur inattendue lors de la soumission', 'error');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // ─── Inline edit ───────────────────────────────────────────────
  const startEdit = (track: AudioTrack) => {
    setEditingId(track.id);
    setEditState({
      title: track.title,
      speaker: track.speaker ?? '',
      category: track.category,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(EMPTY_INLINE_EDIT);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editState.title.trim()) {
      addToast('Le titre ne peut pas être vide', 'error');
      return;
    }

    setEditSaving(true);
    const { error } = await supabase
      .from('audio_tracks')
      .update({
        title: editState.title.trim(),
        speaker: editState.speaker.trim() || null,
        category: editState.category,
      })
      .eq('id', editingId);

    if (error) {
      addToast('Erreur lors de la mise à jour', 'error');
    } else {
      addToast('Piste mise à jour', 'success');
      setTracks((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                title: editState.title.trim(),
                speaker: editState.speaker.trim() || null,
                category: editState.category,
              }
            : t,
        ),
      );
      setEditingId(null);
    }
    setEditSaving(false);
  };

  // ─── Toggle is_active ──────────────────────────────────────────
  const handleToggleActive = async (track: AudioTrack) => {
    const { error } = await supabase
      .from('audio_tracks')
      .update({ is_active: !track.is_active })
      .eq('id', track.id);

    if (error) {
      addToast('Erreur lors du changement de statut', 'error');
    } else {
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, is_active: !t.is_active } : t)),
      );
    }
  };

  // ─── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from('audio_tracks').delete().eq('id', id);

    if (error) {
      addToast('Erreur lors de la suppression', 'error');
    } else {
      addToast('Piste supprimée', 'success');
      setDeleteConfirmId(null);
      fetchTracks();
    }
    setDeleting(false);
  };

  // ─── Reorder (up/down) ─────────────────────────────────────────
  const handleMove = async (track: AudioTrack, direction: 'up' | 'down') => {
    const idx = tracks.findIndex((t) => t.id === track.id);
    if (idx < 0) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tracks.length) return;

    const swapTrack = tracks[swapIdx];
    const newOrder = track.sort_order;
    const swapOrder = swapTrack.sort_order;

    const results = await Promise.allSettled([
      supabase.from('audio_tracks').update({ sort_order: swapOrder }).eq('id', track.id),
      supabase.from('audio_tracks').update({ sort_order: newOrder }).eq('id', swapTrack.id),
    ]);

    const hasError = results.some(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.error),
    );

    if (hasError) {
      addToast('Erreur lors du réordonnancement', 'error');
      return;
    }

    setTracks((prev) => {
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // ─── Render ────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <Music className="mb-4 h-12 w-12" />
        <p>Accès réservé aux administrateurs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-white/90">
            Pistes audio
          </h2>
          <p className="mt-1 text-sm text-white/40">
            {tracks.length} piste{tracks.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => {
            if (isFormOpen) {
              setForm(EMPTY_FORM);
              setAudioFile(null);
            }
            setIsFormOpen((prev) => !prev);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            isFormOpen
              ? 'bg-white/5 text-white/60 hover:text-white/80 border border-white/10'
              : 'bg-evangile-600 text-white hover:bg-evangile-700 shadow-lg shadow-accent-500/20'
          }`}
        >
          {isFormOpen ? (
            <>
              <X className="h-4 w-4" /> Annuler
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Ajouter une piste
            </>
          )}
        </button>
      </div>

      {/* ── Add Form (collapsible) ────────────────────────────────── */}
      {isFormOpen && (
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Nouvelle piste audio
          </h3>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">
              Titre <span className="text-accent-300">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/20 outline-none transition focus:border-evangile-600"
              placeholder="Titre de la piste"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Speaker + Category row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/40">
                Orateur / Intervenant
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/20 outline-none transition focus:border-evangile-600"
                placeholder="Nom du speaker"
                value={form.speaker}
                onChange={(e) => updateForm('speaker', e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/40">
                Catégorie
              </label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 outline-none transition focus:border-evangile-600"
                value={form.category}
                onChange={(e) => updateForm('category', e.target.value as AudioCategory)}
                disabled={submitting}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio file upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">
              Fichier audio
            </label>
            <div className="flex items-center gap-3">
              <label
                className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm transition hover:border-accent-400/40 hover:bg-white/[0.04] ${
                  audioFile ? 'border-accent-400/40' : ''
                }`}
              >
                <Upload className="h-5 w-5 flex-shrink-0 text-white/30" />
                <span className="text-white/50 truncate">
                  {audioFile ? audioFile.name : 'Choisir un fichier (.mp3, .wav, .ogg, .m4a)'}
                </span>
                {audioFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAudioFile(null);
                    }}
                    className="ml-auto flex-shrink-0 text-white/30 hover:text-white/60 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <input
                  type="file"
                  accept={ACCEPTED_AUDIO}
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={submitting}
                />
              </label>
            </div>
            <p className="mt-1.5 text-[11px] text-white/25">
              Formats acceptés : MP3, WAV, OGG, M4A — la durée sera détectée automatiquement
            </p>
          </div>

          {/* Divider: OR paste URL */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-xs text-white/25 uppercase tracking-widest">ou</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Audio URL */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">
              URL audio externe
            </label>
            <input
              type="url"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90 placeholder-white/20 outline-none transition focus:border-evangile-600"
              placeholder="https://example.com/audio.mp3"
              value={form.audioUrl}
              onChange={(e) => {
                updateForm('audioUrl', e.target.value);
                if (e.target.value.trim()) setAudioFile(null);
              }}
              disabled={submitting || !!audioFile}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {uploadProgress && (
              <span className="flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {uploadProgress}
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-evangile-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-evangile-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Enregistrer la piste
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Track List ────────────────────────────────────────────── */}
      {loading ? (
        <SkeletonRows />
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 py-16">
          <Music className="mb-3 h-12 w-12 text-white/10" />
          <p className="text-sm text-white/30">Aucune piste audio pour le moment</p>
          <p className="mt-1 text-xs text-white/15">
            Cliquez sur « Ajouter une piste » pour commencer
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, idx) => {
            const isEditing = editingId === track.id;
            const isDeletePending = deleteConfirmId === track.id;
            const isPlaying = playingId === track.id;
            const isFirst = idx === 0;
            const isLast = idx === tracks.length - 1;

            return (
              <div
                key={track.id}
                className={`group rounded-xl bg-white/[0.02] border transition-colors ${
                  isEditing
                    ? 'border-accent-400/30 bg-evangile-600/[0.03]'
                    : isDeletePending
                      ? 'border-red-500/30 bg-red-500/[0.03]'
                      : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* ── Delete confirmation bar ─────────────────────── */}
                {isDeletePending && (
                  <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/10">
                    <span className="text-sm text-red-400">
                      Confirmer la suppression ?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(track.id)}
                        disabled={deleting}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-600/30 disabled:opacity-50"
                      >
                        {deleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Oui, supprimer
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={deleting}
                        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition hover:text-white/70"
                      >
                        <X className="h-3.5 w-3.5" />
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Main row ────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                  {/* Reorder grip + arrows */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleMove(track, 'up')}
                      disabled={isFirst || isEditing || isDeletePending}
                      className="rounded p-0.5 text-white/20 transition hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed"
                      aria-label="Monter"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <GripVertical className="h-4 w-4 text-white/10" />
                    <button
                      onClick={() => handleMove(track, 'down')}
                      disabled={isLast || isEditing || isDeletePending}
                      className="rounded p-0.5 text-white/20 transition hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed"
                      aria-label="Descendre"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Play / Pause button */}
                  <button
                    onClick={() => togglePreview(track)}
                    disabled={!track.audio_url}
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition ${
                      isPlaying
                        ? 'bg-evangile-600 text-white shadow-lg shadow-accent-500/30'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>

                  {/* Content area */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      /* ── Inline edit fields ──────────────────── */
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          className="w-full rounded-lg border border-accent-400/40 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-evangile-600"
                          value={editState.title}
                          onChange={(e) =>
                            setEditState((prev) => ({ ...prev, title: e.target.value }))
                          }
                          placeholder="Titre"
                          autoFocus
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/90 outline-none transition focus:border-evangile-600"
                            value={editState.speaker}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                speaker: e.target.value,
                              }))
                            }
                            placeholder="Orateur"
                          />
                          <select
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/90 outline-none transition focus:border-evangile-600"
                            value={editState.category}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                category: e.target.value as AudioCategory,
                              }))
                            }
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* ── Display mode ────────────────────────── */
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <h4 className="truncate text-sm font-medium text-white/90">
                            {track.title}
                          </h4>
                          <CategoryBadge category={track.category} />
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/35">
                          {track.speaker && <span>{track.speaker}</span>}
                          {track.speaker && <span className="text-white/15">·</span>}
                          <span>{formatDuration(track.duration_sec)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(track)}
                    disabled={isEditing || isDeletePending}
                    className="flex-shrink-0"
                    aria-label={track.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <div
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        track.is_active ? 'bg-evangile-600' : 'bg-white/10'
                      } disabled:opacity-50`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          track.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={editSaving}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-accent-400/20 hover:text-accent-300 disabled:opacity-50"
                          aria-label="Enregistrer"
                        >
                          {editSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={editSaving}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white/60 disabled:opacity-50"
                          aria-label="Annuler"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(track)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/5 hover:text-white/60"
                          aria-label="Modifier"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(track.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-red-600/10 hover:text-red-400"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}