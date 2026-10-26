import { useCallback, useEffect, useMemo, useState } from 'react';
import { TEACHINGS_ARCHIVE, type Teaching } from './teachings';

export interface LiveVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  videoUrl: string;
}

export interface LiveFeedState {
  videos: LiveVideo[];
  syncedAt: string | null;
  source: string | null;
}

const FEED_CACHE_KEY = 'lc-youtube-feed-v1';
const MEMORY_TTL = 5 * 60 * 1000;

let memory: { state: LiveFeedState; at: number } | null = null;
let inflight: Promise<LiveFeedState> | null = null;

function readStoredFeed(): LiveFeedState | null {
  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveFeedState;
    if (!Array.isArray(parsed.videos)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredFeed(state: LiveFeedState): void {
  try {
    window.localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(state));
  } catch {
    /* quota / navigation privée : le cache mémoire suffit */
  }
}

export async function loadYoutubeFeed(force = false): Promise<LiveFeedState> {
  if (!force && memory && Date.now() - memory.at < MEMORY_TTL) return memory.state;
  if (inflight) return inflight;

  inflight = fetch('/api/youtube-feed', { headers: { accept: 'application/json' } })
    .then(async (response) => {
      const data = (await response.json().catch(() => ({}))) as Partial<LiveFeedState> & { error?: string };
      if (!response.ok || !Array.isArray(data.videos)) {
        throw new Error(data.error || 'Flux YouTube indisponible.');
      }
      const state: LiveFeedState = {
        videos: data.videos,
        syncedAt: data.syncedAt ?? new Date().toISOString(),
        source: data.source ?? 'youtube-live',
      };
      memory = { state, at: Date.now() };
      writeStoredFeed(state);
      return state;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function mergeTeachings(live: LiveVideo[]): Teaching[] {
  const seen = new Set(live.map((video) => video.id));
  return [
    ...live.map((video) => ({
      id: video.id,
      title: video.title,
      publishedAt: video.publishedAt,
      duration: '',
      thumbnail: video.thumbnail,
      videoUrl: video.videoUrl,
    })),
    ...TEACHINGS_ARCHIVE.filter((video) => !seen.has(video.id)),
  ];
}

export function useLiveTeachings() {
  const [state, setState] = useState<LiveFeedState>(
    () => memory?.state ?? readStoredFeed() ?? { videos: [], syncedAt: null, source: null },
  );
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (force = true) => {
    setRefreshing(true);
    try {
      const next = await loadYoutubeFeed(force);
      setState(next);
      return next;
    } catch {
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadYoutubeFeed()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const videos = useMemo(() => mergeTeachings(state.videos), [state.videos]);

  return {
    videos,
    liveVideos: state.videos,
    syncedAt: state.syncedAt,
    source: state.source,
    refreshing,
    refresh,
  };
}
