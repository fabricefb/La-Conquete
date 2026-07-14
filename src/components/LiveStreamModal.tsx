import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from '../lib/icons';
import { Maximize2 } from 'lucide-react';

function RadioIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  );
}

function ExternalLinkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LiveStreamModal — Full-screen modal that embeds Facebook or YouTube
   live stream. Opens when the countdown reaches 0 and user clicks
   "EN DIRECT" in the TopBar.
   ═══════════════════════════════════════════════════════════════════ */

interface LiveStreamModalProps {
  open: boolean;
  onClose: () => void;
}

export function LiveStreamModal({ open, onClose }: LiveStreamModalProps) {
  const [embedUrl, setEmbedUrl] = useState('');
  const [platform, setPlatform] = useState<'facebook' | 'youtube'>('facebook');
  const [channelUrl, setChannelUrl] = useState('');
  const [label, setLabel] = useState('En direct');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useState<HTMLDivElement | null>(null)[0];

  useEffect(() => {
    if (!open) return;

    async function loadLiveConfig() {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['live_embed_url', 'live_platform', 'live_channel_url', 'next_live_label']);

      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) map[row.key] = row.value;
        setEmbedUrl(map['live_embed_url'] || '');
        setPlatform((map['live_platform'] as 'facebook' | 'youtube') || 'facebook');
        setChannelUrl(map['live_channel_url'] || '');
        setLabel(map['next_live_label'] || 'En direct');
      }
    }

    loadLiveConfig();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!modalRef) return;
    if (!document.fullscreenElement) {
      modalRef.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!open) return null;

  // If no embed URL, provide a fallback external link
  const hasEmbed = !!embedUrl;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full h-full flex flex-col bg-[#0a0a0a]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <h2 className="text-sm md:text-base font-bold text-white">
              {label}
            </h2>
            {platform && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                {platform === 'youtube' ? 'YouTube' : 'Facebook'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {channelUrl && (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                title={`Ouvrir sur ${platform === 'youtube' ? 'YouTube' : 'Facebook'}`}
              >
                <ExternalLinkIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ouvrir sur {platform === 'youtube' ? 'YouTube' : 'Facebook'}</span>
              </a>
            )}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Plein écran"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Video area ── */}
        <div className="flex-1 flex items-center justify-center p-2 md:p-4">
          {hasEmbed ? (
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              title={`Live — ${label}`}
              style={{ border: 0 }}
            />
          ) : (
            /* Fallback: no embed URL configured */
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <RadioIcon className="h-10 w-10 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {label}
              </h3>
              <p className="text-sm text-white/50 mb-6">
                Le direct est en cours mais le lecteur intégré n&apos;est pas encore configuré.
              </p>
              {channelUrl ? (
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 transition-colors"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  Regarder sur {platform === 'youtube' ? 'YouTube' : 'Facebook'}
                </a>
              ) : (
                <p className="text-xs text-white/30">
                  L&apos;administrateur n&apos;a pas encore configuré l&apos;URL de diffusion.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}