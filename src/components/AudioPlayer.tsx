'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp, X, Headphones } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/* ═══════════════════════════════════════════════════════════════════
   Types & Demo Data
   ═══════════════════════════════════════════════════════════════════ */
interface Track {
  id: string;
  title: string;
  speaker: string;
  audioUrl: string;
  duration?: number;
}

const DEMO_TRACKS: Track[] = [
  { id: '1', title: 'La Foi qui Vainc le Monde', speaker: 'Pasteur Kazadi', audioUrl: '', duration: 2400 },
  { id: '2', title: 'Marcher par l\'Esprit', speaker: 'Pasteur Theresse', audioUrl: '', duration: 1800 },
  { id: '3', title: 'La Puissance de la Prière', speaker: 'Pasteur Maurisse', audioUrl: '', duration: 3200 },
  { id: '4', title: 'Les Promesses de Dieu', speaker: 'Ancien Esaïe', audioUrl: '', duration: 2100 },
];

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
  const progressRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const [playlist, setPlaylist] = useState<Track[]>(DEMO_TRACKS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);

  const track = playlist[currentIndex];

  // ─── Fetch recent sermons from Supabase ───────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const fetchTracks = async () => {
      try {
        const { data } = await supabase
          .from('contents')
          .select('id, title, speaker_name, audio_url')
          .eq('content_type', 'sermon')
          .order('created_at', { ascending: false })
          .limit(10);
        if (data && data.length > 0) {
          const mapped: Track[] = (data as any[]).map((d: any) => ({
            id: d.id,
            title: d.title || 'Prédication',
            speaker: d.speaker_name || 'Conférencier',
            audioUrl: d.audio_url || '',
          }));
          setPlaylist(mapped);
        }
      } catch {
        /* keep demo tracks */
      }
    };
    fetchTracks();
  }, []);

  // ─── Audio event handlers ────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    nextTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, playlist.length]);

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

  // ─── Controls ────────────────────────────────────────────────
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().catch(() => {}); setIsPlaying(true); }
  };

  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const nextTrack = () => {
    const next = (currentIndex + 1) % playlist.length;
    setCurrentIndex(next);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(track?.duration || 0);
    setTimeout(() => {
      if (audioRef.current && playlist[next]?.audioUrl) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 100);
  };

  const prevTrack = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prev);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const closePlayer = () => {
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    setVisible(false);
  };

  if (!visible) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} src={track?.audioUrl} preload="metadata" />

      {/* ─── Collapsed state ─────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          expanded ? 'h-24' : 'h-14'
        }`}
        style={{ background: 'rgb(var(--bg-elevated-rgb) / 0.85)', backdropFilter: 'blur(24px) saturate(200%)', borderTop: '1px solid rgb(var(--glass-border-rgb) / var(--glass-border-a))' }}
      >
        <div className="mx-auto flex h-full max-w-8xl items-center px-4 gap-3">
          {/* Album art placeholder */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-evangile-600/20 text-evangile-600">
            <Headphones className="h-4 w-4" />
          </div>

          {/* Track info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cream">{track?.title || 'Aucune piste'}</p>
            {!expanded && (
              <p className="truncate text-xs text-muted">{track?.speaker || ''}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={prevTrack} className="rounded-full p-1.5 text-cream/70 transition hover:text-cream hover:bg-white/5">
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!track?.audioUrl}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-evangile-600 text-white transition hover:bg-evangile-700 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>

            <button onClick={nextTrack} className="rounded-full p-1.5 text-cream/70 transition hover:text-cream hover:bg-white/5">
              <SkipForward className="h-4 w-4" />
            </button>

            {expanded && (
              <button onClick={toggleMute} className="ml-2 rounded-full p-1.5 text-cream/70 transition hover:text-cream hover:bg-white/5">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}

            <button onClick={() => setExpanded(!expanded)} className="ml-1 rounded-full p-1.5 text-cream/70 transition hover:text-cream hover:bg-white/5">
              <ChevronUp className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            <button onClick={closePlayer} className="rounded-full p-1.5 text-cream/70 transition hover:text-cream hover:bg-white/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Expanded controls row ──────────────────────────── */}
        {expanded && (
          <div className="absolute top-14 left-0 right-0 flex items-center gap-3 px-4 pb-2">
            {/* Progress bar */}
            <span className="text-[11px] text-muted tabular-nums w-9 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={seekTo}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-evangile-600"
              style={{
                background: `linear-gradient(to right, #E3221F ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
              }}
            />
            <span className="text-[11px] text-muted tabular-nums w-9 shrink-0">
              {formatTime(duration)}
            </span>

            {/* Volume slider */}
            <div className="ml-4 flex items-center gap-2 w-28">
              <Volume2 className="h-3.5 w-3.5 text-cream/50 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={changeVolume}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cream/80"
                style={{
                  background: `linear-gradient(to right, rgb(var(--text-rgb)) ${muted ? 0 : volume * 100}%, rgba(255,255,255,0.1) ${muted ? 0 : volume * 100}%)`,
                }}
              />
            </div>

            {/* Speaker name in expanded */}
            <span className="text-xs text-muted hidden md:block ml-2">
              {track?.speaker}
            </span>
          </div>
        )}
      </div>

      {/* Bottom spacer to prevent content overlap */}
      <div className={`h-14 transition-all duration-300 ${expanded ? 'h-24' : ''}`} />
    </>
  );
}