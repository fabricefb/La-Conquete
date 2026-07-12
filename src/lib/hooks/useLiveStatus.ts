import { useEffect, useState } from 'react';

interface LiveStatus {
  youtube: boolean;
  facebook: boolean;
  loading: boolean;
}

/**
 * Detects whether the church is currently live on YouTube and/or Facebook.
 *
 * YouTube: Uses the YouTube Data API v3 — searches for live broadcasts
 *          on the configured channel. Requires VITE_YOUTUBE_API_KEY and
 *          VITE_YOUTUBE_CHANNEL_ID in .env.local.
 *
 * Facebook: Uses the Graph API with a page access token.
 *           Requires VITE_FACEBOOK_PAGE_ID and VITE_FACEBOOK_PAGE_TOKEN.
 */
export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>({ youtube: false, facebook: false, loading: true });

  useEffect(() => {
    const ytKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    const ytChannel = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;

    if (!ytKey || !ytChannel) {
      setStatus({ youtube: false, facebook: false, loading: false });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function checkYouTube() {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${ytChannel}&type=video&eventType=live&maxResults=1&key=${ytKey}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!cancelled) {
          const isLive = data?.items?.length > 0;
          setStatus(prev => ({ ...prev, youtube: isLive, loading: false }));
        }
      } catch {
        if (!cancelled) setStatus(prev => ({ ...prev, youtube: false, loading: false }));
      }
    }

    async function checkFacebook() {
      const fbPageId = import.meta.env.VITE_FACEBOOK_PAGE_ID;
      const fbToken = import.meta.env.VITE_FACEBOOK_PAGE_TOKEN;

      if (!fbPageId || !fbToken) {
        if (!cancelled) setStatus(prev => ({ ...prev, facebook: false }));
        return;
      }

      try {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${fbPageId}/live_videos?fields=status,is_live_broadcast&access_token=${fbToken}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!cancelled) {
          const hasLive = data?.data?.some(
            (v: { status?: string; is_live_broadcast?: boolean }) =>
              v.status === 'LIVE' || v.is_live_broadcast === true
          ) ?? false;
          setStatus(prev => ({ ...prev, facebook: hasLive }));
        }
      } catch {
        if (!cancelled) setStatus(prev => ({ ...prev, facebook: false }));
      }
    }

    checkYouTube();
    checkFacebook();

    // Refresh every 2 minutes
    const interval = setInterval(() => {
      checkYouTube();
      checkFacebook();
    }, 120_000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return status;
}