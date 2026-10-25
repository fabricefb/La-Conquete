import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  Save, Loader2, Radio, Tv, ExternalLink,
  Clock, Tag, Globe, Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   LiveStreamTab — Admin panel to program the next live stream
   - next_live_datetime: ISO datetime for the countdown
   - live_end_datetime: ISO datetime when the live window closes (optional)
   - next_live_label: e.g. "Culte du dimanche"
   - live_platform: 'facebook' | 'youtube'
   - live_channel_url: the full URL to the Facebook page or YouTube channel
   - live_embed_url: the embed URL (auto-generated or manual)
   ═══════════════════════════════════════════════════════════════════ */

interface LiveConfig {
  next_live_datetime: string;
  live_end_datetime: string;
  next_live_label: string;
  live_platform: 'facebook' | 'youtube';
  live_channel_url: string;
  live_embed_url: string;
}

const DEFAULT_CONFIG: LiveConfig = {
  next_live_datetime: '',
  live_end_datetime: '',
  next_live_label: 'Culte du dimanche',
  live_platform: 'facebook',
  live_channel_url: '',
  live_embed_url: '',
};

function datetimeToInputValue(iso: string): string {
  if (!iso) return '';
  // Convert ISO to datetime-local format: YYYY-MM-DDTHH:MM
  try {
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  } catch {
    return '';
  }
}

function inputValueToDatetime(val: string): string {
  if (!val) return '';
  // datetime-local → ISO
  return new Date(val).toISOString();
}

function resolveLiveEnd(startIso: string, endIso: string): Date | null {
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(start)) return null;
  const configuredEnd = endIso ? new Date(endIso).getTime() : NaN;
  return new Date(Number.isFinite(configuredEnd) && configuredEnd > start ? configuredEnd : start + 4 * 3600000);
}

function generateEmbedUrl(platform: 'facebook' | 'youtube', channelUrl: string): string {
  if (!channelUrl) return '';

  if (platform === 'youtube') {
    // Extract channel ID or handle from various YouTube URL formats
    // YouTube Live embed: https://www.youtube.com/embed/live_stream?channel=CHANNEL_ID
    const channelMatch = channelUrl.match(/(?:channel\/|@)([^/?]+)/);
    if (channelMatch) {
      return `https://www.youtube.com/embed/live_stream?channel=${channelMatch[1]}&autoplay=1`;
    }
    // If it's already an embed URL, return as-is
    if (channelUrl.includes('/embed/')) return channelUrl;
    // Fallback: return the URL for manual entry
    return '';
  }

  if (platform === 'facebook') {
    // Facebook Video embed: https://www.facebook.com/plugins/video.php?href=ENCODED_URL&show_text=false
    if (channelUrl.includes('/plugins/video')) return channelUrl;
    // If it looks like a page URL, we'll embed it
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(channelUrl)}&show_text=false&width=560&height=315`;
  }

  return '';
}

export function LiveStreamTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();
  const [config, setConfig] = useState<LiveConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load config from Supabase ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const keys = [
          'next_live_datetime',
          'live_end_datetime',
          'next_live_label',
          'live_platform',
          'live_channel_url',
          'live_embed_url',
        ];

        const { data } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', keys);

        if (!cancelled && data) {
          const map: Record<string, string> = {};
          for (const row of data) {
            map[row.key] = row.value;
          }
          setConfig({
            next_live_datetime: map['next_live_datetime'] || '',
            live_end_datetime: map['live_end_datetime'] || '',
            next_live_label: map['next_live_label'] || 'Culte du dimanche',
            live_platform: (map['live_platform'] as 'facebook' | 'youtube') || 'facebook',
            live_channel_url: map['live_channel_url'] || '',
            live_embed_url: map['live_embed_url'] || '',
          });
        }
      } catch {
        // Keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Update helpers ──
  const update = useCallback(<K extends keyof LiveConfig>(key: K, value: LiveConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate embed URL when platform or channel URL changes
      if (key === 'live_platform' || key === 'live_channel_url') {
        next.live_embed_url = generateEmbedUrl(
          key === 'live_platform' ? (value as 'youtube' | 'facebook') : next.live_platform,
          key === 'live_channel_url' ? value : next.live_channel_url,
        );
      }
      return next;
    });
  }, []);

  // ── Save ──
  const persistConfig = useCallback(async (cfg: LiveConfig, successMessage = 'Configuration du live enregistrée avec succès') => {
    setSaving(true);
    try {
      const rows = [
        { key: 'next_live_datetime', value: cfg.next_live_datetime, type: 'text', category: 'general', label: 'Prochain live — Date', sort_order: 800 },
        { key: 'live_end_datetime', value: cfg.live_end_datetime, type: 'text', category: 'general', label: 'Prochain live — Fin', sort_order: 805 },
        { key: 'next_live_label', value: cfg.next_live_label, type: 'text', category: 'general', label: 'Prochain live — Titre', sort_order: 801 },
        { key: 'live_platform', value: cfg.live_platform, type: 'text', category: 'general', label: 'Plateforme live', sort_order: 802 },
        { key: 'live_channel_url', value: cfg.live_channel_url, type: 'url', category: 'general', label: 'URL du canal live', sort_order: 803 },
        { key: 'live_embed_url', value: cfg.live_embed_url, type: 'url', category: 'general', label: 'URL d\'embed live', sort_order: 804 },
      ];

      await Promise.all(
        rows.map((r) =>
          supabase
            .from('site_settings')
            .upsert(
              { ...r, updated_at: new Date().toISOString() },
              { onConflict: 'key' },
            ),
        ),
      );

      addToast(successMessage, 'success');
    } catch {
      addToast("Erreur lors de l'enregistrement de la configuration", 'error');
    } finally {
      setSaving(false);
    }
  }, [addToast]);

  const handleSave = useCallback(() => persistConfig(config), [config, persistConfig]);

  const handleStartNow = useCallback(() => {
    const now = new Date();
    const next: LiveConfig = {
      ...config,
      next_live_datetime: now.toISOString(),
      live_end_datetime: new Date(now.getTime() + 4 * 3600000).toISOString(),
    };
    setConfig(next);
    void persistConfig(next, 'Direct démarré — le bouton EN DIRECT est actif sur le site');
  }, [config, persistConfig]);

  const handleStopNow = useCallback(() => {
    const now = new Date();
    const next: LiveConfig = {
      ...config,
      next_live_datetime: new Date(now.getTime() - 60000).toISOString(),
      live_end_datetime: now.toISOString(),
    };
    setConfig(next);
    void persistConfig(next, 'Direct terminé — le bouton EN DIRECT a été retiré du site');
  }, [config, persistConfig]);

  // ── Live window preview ──
  const [preview, setPreview] = useState({
    phase: 'none' as 'none' | 'upcoming' | 'live' | 'ended',
    days: 0, hours: 0, mins: 0, secs: 0,
  });

  useEffect(() => {
    if (!config.next_live_datetime) {
      setPreview({ phase: 'none', days: 0, hours: 0, mins: 0, secs: 0 });
      return;
    }

    const start = new Date(config.next_live_datetime).getTime();
    const configuredEnd = config.live_end_datetime ? new Date(config.live_end_datetime).getTime() : NaN;
    const end = Number.isFinite(configuredEnd) && configuredEnd > start
      ? configuredEnd
      : start + 4 * 3600000;

    function tick() {
      const now = Date.now();
      if (!Number.isFinite(start)) {
        setPreview({ phase: 'none', days: 0, hours: 0, mins: 0, secs: 0 });
      } else if (now >= end) {
        setPreview({ phase: 'ended', days: 0, hours: 0, mins: 0, secs: 0 });
      } else if (now >= start) {
        setPreview({ phase: 'live', days: 0, hours: 0, mins: 0, secs: 0 });
      } else {
        const diff = start - now;
        setPreview({
          phase: 'upcoming',
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          mins: Math.floor((diff % 3600000) / 60000),
          secs: Math.floor((diff % 60000) / 1000),
        });
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config.next_live_datetime, config.live_end_datetime]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
          <Radio className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Diffusion en direct</h2>
          <p className="text-sm text-white/50">Programmez le prochain live et configurez la plateforme</p>
        </div>
      </div>

      {/* ── Countdown Preview ── */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white/70">Aperçu du compte à rebours</span>
        </div>

        {config.next_live_datetime ? (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              <span className="text-amber-400 font-semibold">{config.next_live_label}</span>
              {' — '}
              {new Date(config.next_live_datetime).toLocaleString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            {preview.phase === 'upcoming' && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Dans
                </span>
                <div className="flex items-center gap-1 font-mono text-sm font-bold text-white">
                  {preview.days > 0 && (
                    <span className="bg-white/10 rounded px-2 py-1">{preview.days}j</span>
                  )}
                  <span className="bg-white/10 rounded px-2 py-1">
                    {String(preview.hours).padStart(2, '0')}h
                  </span>
                  <span className="bg-white/10 rounded px-2 py-1">
                    {String(preview.mins).padStart(2, '0')}m
                  </span>
                  <span className="bg-white/10 rounded px-2 py-1">
                    {String(preview.secs).padStart(2, '0')}s
                  </span>
                </div>
              </div>
            )}

            {preview.phase === 'live' && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                  EN DIRECT MAINTENANT
                </span>
              </div>
            )}

            {preview.phase === 'ended' && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                  Direct terminé — le bouton EN DIRECT est masqué sur le site
                </span>
              </div>
            )}

            <p className="text-xs text-white/40">
              Fenêtre de diffusion jusqu&apos;au{' '}
              {resolveLiveEnd(config.next_live_datetime, config.live_end_datetime)?.toLocaleString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/30 italic">Aucun direct programmé. Configurez la date ci-dessous.</p>
        )}

        {isFullAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleStartNow}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              <Radio className="h-3.5 w-3.5" />
              Démarrer maintenant
            </button>
            {config.next_live_datetime && (
              <button
                type="button"
                onClick={handleStopNow}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Arrêter le direct
              </button>
            )}
            <span className="text-[11px] text-white/40">
              Enregistré immédiatement — visible sur le site sous 1 minute.
            </span>
          </div>
        )}
      </div>

      {/* ── Form ── */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-5 space-y-5">
        {/* Label */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-medium text-white/80">
            <Tag className="h-4 w-4 text-amber-400" />
            Intitulé du direct
          </label>
          <input
            type="text"
            value={config.next_live_label}
            onChange={(e) => update('next_live_label', e.target.value)}
            placeholder="Ex: Culte du dimanche, Soirée de prière..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50"
          />
        </div>

        {/* Date & Time */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-medium text-white/80">
            <Clock className="h-4 w-4 text-amber-400" />
            Date et heure du prochain direct
          </label>
          <input
            type="datetime-local"
            value={datetimeToInputValue(config.next_live_datetime)}
            onChange={(e) => update('next_live_datetime', inputValueToDatetime(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-500/50 [color-scheme:dark]"
          />
          <p className="mt-1.5 text-xs text-white/40">
            Fuseau horaire du navigateur — à cette heure, le bouton EN DIRECT apparaît automatiquement
          </p>
        </div>

        {/* End of live */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-medium text-white/80">
            <Clock className="h-4 w-4 text-amber-400" />
            Fin de diffusion (optionnel)
          </label>
          <input
            type="datetime-local"
            value={datetimeToInputValue(config.live_end_datetime)}
            onChange={(e) => update('live_end_datetime', inputValueToDatetime(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-amber-500/50 [color-scheme:dark]"
          />
          <p className="mt-1.5 text-xs text-white/40">
            Passé cette heure, le bouton EN DIRECT disparaît du site. Laisser vide = 4 h après le début.
          </p>
        </div>

        {/* Platform */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-medium text-white/80">
            <Tv className="h-4 w-4 text-amber-400" />
            Plateforme de diffusion
          </label>
          <div className="flex gap-3">
            {(['facebook', 'youtube'] as const).map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => update('live_platform', platform)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  config.live_platform === platform
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                {platform === 'facebook' ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                )}
                {platform === 'facebook' ? 'Facebook' : 'YouTube'}
              </button>
            ))}
          </div>
        </div>

        {/* Channel URL */}
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-medium text-white/80">
            <Globe className="h-4 w-4 text-amber-400" />
            {config.live_platform === 'youtube'
              ? 'URL de la chaîne YouTube'
              : "URL de la page Facebook ou vidéo live"}
          </label>
          <input
            type="url"
            value={config.live_channel_url}
            onChange={(e) => update('live_channel_url', e.target.value)}
            placeholder={
              config.live_platform === 'youtube'
                ? 'https://www.youtube.com/@LaConquete'
                : 'https://www.facebook.com/LaConquete/live'
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50"
          />
          <p className="mt-1.5 text-xs text-white/40">
            {config.live_platform === 'youtube'
              ? "Collez l'URL complète de votre chaîne YouTube (ex: youtube.com/@VotreChaine). L'URL d'intégration sera générée automatiquement."
              : "Collez l'URL de la vidéo en direct Facebook (elle change à chaque diffusion). L'URL d'intégration est générée automatiquement ; le bouton « Ouvrir sur Facebook » reste disponible en secours."}
          </p>
        </div>

        {/* Embed URL (auto-generated, but editable) */}
        {config.live_embed_url && (
          <div>
            <label className="flex items-center gap-2 mb-2 text-sm font-medium text-white/80">
              <ExternalLink className="h-4 w-4 text-green-400" />
              URL d&apos;intégration (auto-générée)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={config.live_embed_url}
                onChange={(e) => update('live_embed_url', e.target.value)}
                className="flex-1 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2.5 text-sm text-green-300 placeholder-white/30 outline-none transition-colors focus:border-green-500/50 font-mono text-xs"
              />
              <a
                href={config.live_embed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                title="Tester le lien"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300/80 leading-relaxed">
            <p className="font-semibold text-blue-300 mb-1">Comment ça marche</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>L&apos;admin définit la date/heure du prochain live</li>
              <li>Un <strong>compte à rebours</strong> s&apos;affiche automatiquement sur le site</li>
              <li>À l&apos;heure programmée, le bouton <strong>EN DIRECT</strong> apparaît</li>
              <li>Les visiteurs cliquent et regardent le live <strong>directement sur le site</strong> via le lecteur intégré</li>
              <li>Le bouton disparaît à l&apos;heure de fin (ou 4 h après le début si aucune fin n&apos;est fixée)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Save button ── */}
      {isFullAdmin && (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-gold flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>
      )}
    </div>
  );
}