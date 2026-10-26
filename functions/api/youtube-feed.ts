import { fetchYoutubeFeed, type YoutubeFeedVideo } from '../../shared/youtube-feed';

interface FeedPayload {
  videos: YoutubeFeedVideo[];
  syncedAt: string;
  source: 'youtube-live' | 'youtube-cache';
}

let lastGood: FeedPayload | null = null;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export async function onRequestGet(context: any) {
  const cache = (globalThis as any).caches?.default as Cache | undefined;
  const cacheKey = new Request('https://la-conquete.internal/api/youtube-feed');

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let payload: FeedPayload;
  try {
    const videos = await fetchYoutubeFeed();
    payload = { videos, syncedAt: new Date().toISOString(), source: 'youtube-live' };
    lastGood = payload;
  } catch (error) {
    if (!lastGood) {
      return json(
        {
          error: error instanceof Error ? error.message : 'Flux YouTube indisponible.',
          videos: [],
        },
        502,
      );
    }
    payload = { ...lastGood, source: 'youtube-cache' };
  }

  const response = json(payload, 200, {
    'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
  });

  if (cache && payload.source === 'youtube-live') {
    context.waitUntil?.(cache.put(cacheKey, response.clone()));
  }

  return response;
}
