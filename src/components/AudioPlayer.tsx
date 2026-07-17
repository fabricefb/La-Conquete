import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Headphones,
  ListMusic,
  ChevronUp,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */
interface Track {
  id: string;
  title: string;
  speaker: string;
  description: string;
  audioUrl: string;
  coverUrl: string;
  category: string;
  durationSec: number;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  predication: 'Prédication',
  louange: 'Louange',
  enseignement: 'Enseignement',
  temoignage: 'Témoignage',
  autre: 'Autre',
};

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════════════════
   AudioPlayer Component
   ═══════════════════════════════════════════════════════════════════ */
export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const currentTrack = tracks[currentIndex];

  /* ─── Fetch tracks from audio_tracks table ──────────────────── */
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }

    const fetchTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('audio_tracks')
          .select(
            'id, title, speaker, description, audio_url, cover_url, category, duration_sec, sort_order, is_active'
          )
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          // Table doesn't exist or other DB error — show nothing
          console.warn('[AudioPlayer] Supabase error:', error.message);
          setLoaded(true);
          return;
        }

        if (!data || data.length === 0) {
          setLoaded(true);
          return;
        }

        const mapped: Track[] = (data as any[]).map((d) => ({
          id: d.id,
          title: d.title || 'Sans titre',
          speaker: d.speaker || '',
          description: d.description || '',
          audioUrl: d.audio_url || '',
          coverUrl: d.cover_url || '',
          category: d.category || 'autre',
          durationSec: d.duration_sec || 0,
          sortOrder: d.sort_order ?? 0,
        }));

        setTracks(mapped);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    };

    fetchTracks();
  }, []);

  /* ─── Auto-play when track index changes ───────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;

    audio.src = currentTrack.audioUrl;
    audio.load();

    // Only auto-play if already playing (e.g. skip / next track)
    const tryPlay = () => {
      audio.play().catch(() => {});
      setIsPlaying(true);
    };

    audio.addEventListener('canplay', tryPlay, { once: true });
    return () => audio.removeEventListener('canplay', tryPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  /* ─── Audio event handlers ──────────────────────────────────── */
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(isFinite(d) ? d : 0);
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (currentIndex < tracks.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsPlaying(false);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded]);

  /* ─── Controls ──────────────────────────────────────────────── */
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
      if (v === 0) {
        audioRef.current.muted = true;
        setMuted(true);
      } else if (muted) {
        audioRef.current.muted = false;
        setMuted(false);
      }
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    if (currentIndex < tracks.length - 1) {
      setCurrentIndex((i) => i + 1);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  };

  const playTrack = (index: number) => {
    if (index === currentIndex && isPlaying) {
      // Clicking the current playing track pauses it
      togglePlay();
      setShowPlaylist(false);
      return;
    }
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setShowPlaylist(false);
  };

  const closePlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setIsPlaying(false);
    // Remove from DOM by hiding — we simply keep tracks empty
    setTracks([]);
  };

  /* ─── Loading / Empty states ────────────────────────────────── */
  if (!loaded) return null;
  if (tracks.length === 0) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <audio ref={audioRef} src={currentTrack?.audioUrl} preload="metadata" />

      {/* ─── Playlist Panel (slides up above the bar) ─────────── */}
      {showPlaylist && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
          style={{
            background: 'rgba(15, 33, 71, 0.96)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            maxHeight: '60vh',
          }}
        >
          {/* Playlist header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-6">
            <div className="flex items-center gap-2">
              <ListMusic className="h-4 w-4" style={{ color: '#E3221F' }} />
              <h3 className="text-sm font-semibold text-white">
                Playlist ({tracks.length} pistes)
              </h3>
            </div>
            <button
              onClick={() => setShowPlaylist(false)}
              className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Track list */}
          <div className="overflow-y-auto px-2 pb-4 sm:px-4" style={{ maxHeight: 'calc(60vh - 52px)' }}>
            {tracks.map((track, idx) => {
              const isActive = idx === currentIndex;
              const isCurrentlyPlaying = isActive && isPlaying;
              return (
                <button
                  key={track.id}
                  onClick={() => playTrack(idx)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    isActive
                      ? 'bg-[#E3221F]/15'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Play indicator / number */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                      isActive
                        ? 'bg-[#E3221F] text-white'
                        : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/70'
                    }`}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : isActive ? (
                      <Play className="h-3.5 w-3.5 ml-0.5" />
                    ) : (
                      <span className="text-xs font-medium">{idx + 1}</span>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        isActive ? 'text-white' : 'text-white/80'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="truncate text-xs text-white/40">
                      {track.speaker}
                    </p>
                  </div>

                  {/* Category badge */}
                  {track.category && (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        isActive
                          ? 'bg-[#E3221F]/30 text-[#E3221F]'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      {CATEGORY_LABELS[track.category] || track.category}
                    </span>
                  )}

                  {/* Duration */}
                  {track.durationSec > 0 && (
                    <span className="shrink-0 text-[11px] tabular-nums text-white/25">
                      {formatTime(track.durationSec)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Player Bar ────────────────────────────────────────── */}
      <div
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
          showPlaylist ? 'bottom-0 hidden' : 'bottom-0'
        }`}
        style={{
          background: 'rgba(15, 33, 71, 0.90)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          height: expanded ? 'auto' : '56px',
        }}
      >
        {/* ─── Collapsed row ──────────────────────────────────── */}
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-3 gap-2 sm:px-5 sm:gap-3">
          {/* Cover / icon */}
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(227, 34, 31, 0.15)' }}
            >
              <Headphones className="h-4 w-4" style={{ color: '#E3221F' }} />
            </div>
          )}

          {/* Track info — clickable to open playlist */}
          <button
            onClick={() => setShowPlaylist(true)}
            className="min-w-0 flex-1 text-left"
            title="Ouvrir la playlist"
          >
            <p className="truncate text-sm font-medium" style={{ color: '#FFF8E7' }}>
              {currentTrack?.title || 'Aucune piste'}
            </p>
            {!expanded && (
              <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {currentTrack?.speaker || ''}
              </p>
            )}
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={prevTrack}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentTrack?.audioUrl}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-30"
              style={{ background: '#E3221F' }}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            {/* Playlist toggle */}
            <button
              onClick={() => setShowPlaylist(true)}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
              title="Playlist"
            >
              <ListMusic className="h-4 w-4" />
            </button>

            {/* Expand / collapse */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <ChevronUp
                className="h-4 w-4 transition-transform duration-300"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Close */}
            <button
              onClick={closePlayer}
              className="rounded-xl p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
              title="Fermer le lecteur"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Expanded: progress + volume + speaker ──────────── */}
        {expanded && (
          <div className="flex flex-col gap-2 px-3 pb-3 sm:px-5">
            {/* Progress bar row */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="w-9 shrink-0 text-right text-[11px] tabular-nums"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 h-1.5 rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  if (audioRef.current && duration > 0) {
                    audioRef.current.currentTime = ratio * duration;
                    setCurrentTime(ratio * duration);
                  }
                }}
              >
                {/* Background track */}
                <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                {/* Filled progress */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
                  style={{ width: `${progress}%`, background: '#E3221F' }}
                />
                {/* Thumb (visible on hover) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  style={{
                    left: `${progress}%`,
                    marginLeft: '-6px',
                    background: '#E3221F',
                  }}
                />
              </div>
              <span
                className="w-9 shrink-0 text-[11px] tabular-nums"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume + speaker row */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Volume slider — hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 w-28">
                <div className="relative flex-1 h-1 rounded-full overflow-hidden cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setVolume(ratio);
                    if (audioRef.current) {
                      audioRef.current.volume = ratio;
                      if (ratio > 0 && muted) {
                        audioRef.current.muted = false;
                        setMuted(false);
                      }
                    }
                  }}
                >
                  <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${muted ? 0 : volume * 100}%`,
                      background: 'rgba(255,255,255,0.6)',
                    }}
                  />
                </div>
              </div>

              {/* Speaker name — hidden on small screens */}
              <span
                className="hidden md:block text-xs ml-auto"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {currentTrack?.speaker}
              </span>

              {/* Category in expanded */}
              {currentTrack?.category && (
                <span
                  className="hidden lg:inline-block rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{ background: 'rgba(227,34,31,0.15)', color: '#E3221F' }}
                >
                  {CATEGORY_LABELS[currentTrack.category] || currentTrack.category}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom spacer to prevent content overlap ──────────── */}
      {!showPlaylist && (
        <div
          className="transition-all duration-300"
          style={{ height: expanded ? '120px' : '56px' }}
        />
      )}
      {showPlaylist && <div style={{ height: '60vh' }} />}
    </>
  );
}