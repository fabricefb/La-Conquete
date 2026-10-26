export interface YoutubeFeedVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  videoUrl: string;
}

export const YOUTUBE_CHANNEL_ID = 'UCQ8GN7XKZpqSiyiXumbxXrQ';
export const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function readTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(match[1]) : '';
}

export function parseYoutubeFeed(xml: string): YoutubeFeedVideo[] {
  const videos: YoutubeFeedVideo[] = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  for (const entry of entries) {
    const id = readTag(entry, 'yt:videoId') || readTag(entry, 'id').replace(/^yt:video:/, '');
    if (!id) continue;
    const title = readTag(entry, 'title');
    const published = readTag(entry, 'published');
    const mediaThumb = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1];

    videos.push({
      id,
      title,
      publishedAt: published.slice(0, 10),
      thumbnail: mediaThumb ? decodeEntities(mediaThumb) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      videoUrl: `https://www.youtube.com/watch?v=${id}`,
    });
  }

  return videos;
}

export async function fetchYoutubeFeed(): Promise<YoutubeFeedVideo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(YOUTUBE_FEED_URL, {
      headers: {
        accept: 'application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
        'user-agent': 'LaConqueteSite/1.0 (+https://laconquete.cd)',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`YouTube RSS indisponible (${response.status})`);
    }
    const videos = parseYoutubeFeed(await response.text());
    if (videos.length === 0) throw new Error('Flux YouTube vide');
    return videos;
  } finally {
    clearTimeout(timeout);
  }
}
