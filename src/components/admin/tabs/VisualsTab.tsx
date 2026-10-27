import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink, Image as ImageIcon, Loader2, RefreshCw, RotateCcw,
  Save, Search, Tv, UploadCloud,
} from 'lucide-react';
import { supabase, db } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import type { AdminTab } from '../../../types';
import ImageUpload from '../ImageUpload';
import { PAGES, SEEDS } from './ContentsTab';
import { loadYoutubeFeed, type LiveFeedState } from '../../../lib/liveTeachings';
import { PAGE_HERO_IMAGES } from '../../../lib/heroImages';

interface PageContentRow {
  id: string;
  page: string;
  section_key: string;
  field_key: string;
  label: string;
  value: string;
  type: string;
  sort_order: number;
}

interface SettingRow {
  key: string;
  value: string;
}

interface ImageSlot {
  key: string;
  kind: 'content' | 'setting';
  page: string;
  pageLabel: string;
  section: string;
  sectionLabel: string;
  field: string;
  label: string;
  defaultUrl: string;
  folder: string;
}

const SETTING_SLOTS: Array<{ key: string; label: string; defaultUrl: string; folder: string }> = [
  { key: 'site_logo_url', label: 'Logo du site — thème sombre', defaultUrl: '/logo-conquete.png', folder: 'logo' },
  { key: 'site_logo_url_light', label: 'Logo du site — thème clair', defaultUrl: '/logo-couleur.png', folder: 'logo' },
  { key: 'mega_menu_image_about', label: 'Méga menu — À Propos', defaultUrl: '/church-photo-2.webp', folder: 'mega-menu' },
  { key: 'mega_menu_image_vie_eglise', label: "Méga menu — Vie de l'Église", defaultUrl: '/church-photo-3.webp', folder: 'mega-menu' },
  { key: 'mega_menu_image_media', label: 'Méga menu — Média', defaultUrl: '/predication-1.webp', folder: 'mega-menu' },
];

const SETTINGS_PAGE = '__settings__';

function sectionLabelFor(pageKey: string, sectionKey: string): string {
  const page = PAGES.find((item) => item.key === pageKey);
  return page?.sections.find((item) => item.key === sectionKey)?.label ?? sectionKey;
}

function buildSeedSlots(): ImageSlot[] {
  return PAGES.flatMap((page) => {
    const sections = SEEDS[page.key] ?? {};
    return Object.entries(sections).flatMap(([sectionKey, fields]) =>
      fields
        .filter((field) => field.type === 'image_url')
        .map((field) => ({
          key: `content:${page.key}:${sectionKey}:${field.field_key}`,
          kind: 'content' as const,
          page: page.key,
          pageLabel: page.label,
          section: sectionKey,
          sectionLabel: sectionLabelFor(page.key, sectionKey),
          field: field.field_key,
          label: field.label,
          defaultUrl:
            field.value ||
            (sectionKey === 'hero' && field.field_key === 'bg_image' ? PAGE_HERO_IMAGES[page.key] ?? '' : ''),
          folder: page.key,
        })),
    );
  });
}

const SETTING_SLOT_DEFS: ImageSlot[] = SETTING_SLOTS.map((setting) => ({
  key: `setting:${setting.key}`,
  kind: 'setting',
  page: SETTINGS_PAGE,
  pageLabel: 'Réglages du site',
  section: 'site',
  sectionLabel: 'Marque & navigation',
  field: setting.key,
  label: setting.label,
  defaultUrl: setting.defaultUrl,
  folder: setting.folder,
}));

const SEED_SLOTS = buildSeedSlots();

function formatDate(value: string | null): string {
  if (!value) return 'Jamais';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Jamais';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function videoDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface VisualsTabProps {
  onTabChange?: (tab: AdminTab) => void;
}

export function VisualsTab({ onTabChange }: VisualsTabProps) {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [rows, setRows] = useState<PageContentRow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pageFilter, setPageFilter] = useState('all');

  const [feed, setFeed] = useState<LiveFeedState | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    const [contentsResult, settingsResult] = await Promise.all([
      supabase.from('page_contents').select('*').order('page').order('sort_order'),
      supabase.from('site_settings').select('key, value'),
    ]);

    if (contentsResult.error) throw new Error(contentsResult.error.message);
    if (settingsResult.error) throw new Error(settingsResult.error.message);

    setRows((contentsResult.data ?? []) as PageContentRow[]);
    const nextSettings: Record<string, string> = {};
    for (const setting of (settingsResult.data ?? []) as SettingRow[]) {
      nextSettings[setting.key] = setting.value;
    }
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadContent()
      .catch((error: unknown) => {
        if (!cancelled) addToast(error instanceof Error ? error.message : 'Chargement impossible.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadContent, addToast]);

  useEffect(() => {
    let cancelled = false;
    loadYoutubeFeed()
      .then((next) => {
        if (!cancelled) setFeed(next);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rowMap = useMemo(() => {
    const map = new Map<string, PageContentRow>();
    for (const row of rows) {
      map.set(`content:${row.page}:${row.section_key}:${row.field_key}`, row);
    }
    return map;
  }, [rows]);

  const slots = useMemo(() => {
    const all = [...SEED_SLOTS, ...SETTING_SLOT_DEFS];

    for (const row of rows) {
      if (row.type !== 'image_url') continue;
      const key = `content:${row.page}:${row.section_key}:${row.field_key}`;
      if (all.some((slot) => slot.key === key)) continue;
      all.push({
        key,
        kind: 'content',
        page: row.page,
        pageLabel: PAGES.find((page) => page.key === row.page)?.label ?? row.page,
        section: row.section_key,
        sectionLabel: sectionLabelFor(row.page, row.section_key),
        field: row.field_key,
        label: row.label || row.field_key,
        defaultUrl: '',
        folder: row.page,
      });
    }

    return all;
  }, [rows]);

  const valueFor = useCallback(
    (slot: ImageSlot): string => {
      if (drafts[slot.key] !== undefined) return drafts[slot.key];
      if (slot.kind === 'setting') return settings[slot.field] || slot.defaultUrl;
      return rowMap.get(slot.key)?.value || slot.defaultUrl;
    },
    [drafts, settings, rowMap],
  );

  const savedValueFor = useCallback(
    (slot: ImageSlot): string => {
      if (slot.kind === 'setting') return settings[slot.field] || slot.defaultUrl;
      return rowMap.get(slot.key)?.value || slot.defaultUrl;
    },
    [settings, rowMap],
  );

  const pages = useMemo(() => {
    const seen = new Map<string, string>();
    for (const slot of slots) {
      if (!seen.has(slot.page)) seen.set(slot.page, slot.pageLabel);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [slots]);

  const filteredSlots = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return slots.filter((slot) => {
      if (pageFilter !== 'all' && slot.page !== pageFilter) return false;
      if (!normalized) return true;
      return `${slot.label} ${slot.pageLabel} ${slot.sectionLabel}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [slots, query, pageFilter]);

  const groupedSlots = useMemo(() => {
    const map = new Map<string, ImageSlot[]>();
    for (const slot of filteredSlots) {
      const list = map.get(slot.pageLabel) ?? [];
      list.push(slot);
      map.set(slot.pageLabel, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [filteredSlots]);

  async function handleSave(slot: ImageSlot) {
    const value = valueFor(slot).trim();
    setSavingKey(slot.key);
    try {
      if (slot.kind === 'setting') {
        await db.upsertSetting(slot.field, value);
      } else {
        const existing = rowMap.get(slot.key);
        if (existing) {
          const { error } = await supabase
            .from('page_contents')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from('page_contents').insert({
            page: slot.page,
            section_key: slot.section,
            field_key: slot.field,
            label: slot.label,
            value,
            type: 'image_url',
            sort_order: 999,
          });
          if (error) throw new Error(error.message);
        }
      }
      await loadContent();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[slot.key];
        return next;
      });
      addToast('Photo enregistrée — elle est visible sur le site.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Enregistrement impossible.', 'error');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRefreshFeed() {
    setFeedLoading(true);
    try {
      const next = await loadYoutubeFeed(true);
      setFeed(next);
      addToast('Flux YouTube actualisé.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Actualisation impossible.', 'error');
    } finally {
      setFeedLoading(false);
    }
  }

  async function handleRedeploy() {
    setDeploying(true);
    setDeployMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch('/api/redeploy', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Redéploiement impossible.');
      setDeployMessage(payload.message ?? 'Redéploiement lancé.');
      addToast('Redéploiement lancé.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redéploiement impossible.';
      setDeployMessage(message);
      addToast(message, 'error');
    } finally {
      setDeploying(false);
    }
  }

  const latestVideos = feed?.videos.slice(0, 6) ?? [];

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-4">
          <span className="h-1.5 w-1.5 bg-evangile-600" />
          <p className="section-eyebrow">Médias du site</p>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-hero text-4xl uppercase leading-none text-cream sm:text-5xl">
              Photos & vidéos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Toutes les photos de section, les portraits et les visuels de navigation se modifient ici.
              Les vidéos YouTube se mettent à jour automatiquement : la plus récente passe en première ligne.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRefreshFeed()}
              disabled={feedLoading}
              className="btn-ghost px-3 py-2 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
            >
              {feedLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Actualiser le flux
            </button>
            <button
              type="button"
              onClick={() => void handleRedeploy()}
              disabled={deploying}
              className="btn-primary px-3 py-2 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50"
            >
              {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Redéployer
            </button>
          </div>
        </div>
      </header>

      {/* ─── VIDÉOS ─── */}
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-[rgb(var(--accent-red-rgb))]" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                Flux YouTube — @LaconqueteEEC
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              Dernière synchronisation : {feedLoading && !feed ? 'chargement…' : formatDate(feed?.syncedAt ?? null)}
              {feed?.source === 'youtube-cache' ? ' · cache' : ''}
            </p>
          </div>
          <a
            href="https://www.youtube.com/@LaconqueteEEC/videos"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-link text-[10px] uppercase tracking-[0.14em]"
          >
            Ouvrir la chaîne <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {latestVideos.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted">
            {feedLoading
              ? 'Lecture du flux YouTube…'
              : "Le flux n'est pas joignable pour le moment. Les vidéos de l'archive restent affichées sur le site."}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {latestVideos.map((video, index) => (
              <a
                key={video.id}
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <span className="hidden w-10 shrink-0 font-hero text-2xl leading-none text-white/20 sm:block">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <img
                  src={video.thumbnail}
                  alt=""
                  loading="lazy"
                  className="h-12 w-20 shrink-0 border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream group-hover:text-evangile-400">
                    {video.title}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                    {videoDate(video.publishedAt)}
                    {index === 0 && <span className="ml-2 text-[rgb(var(--accent-red-rgb))]">· En tête du site</span>}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-cream">Aucun redéploiement nécessaire pour les vidéos.</span>{' '}
            Le site lit le flux officiel de la chaîne à chaque visite. Le bouton « Redéployer » sert à republier
            les fichiers du site (photos, pages) sur Cloudflare Pages ; il nécessite une variable serveur{' '}
            <code className="bg-white/10 px-1 text-cream">DEPLOY_HOOK_URL</code>.
          </p>
          {deployMessage && (
            <p className="mt-3 border-l-2 border-l-evangile-600 bg-white/[0.03] px-3 py-2 text-xs text-muted">
              {deployMessage}
            </p>
          )}
        </div>
      </section>

      {/* ─── PHOTOS ─── */}
      <section>
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[rgb(var(--accent-red-rgb))]" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                Bibliothèque des sections
              </p>
            </div>
            <p className="mt-1 text-sm text-muted">
              {filteredSlots.length} photo{filteredSlots.length > 1 ? 's' : ''} modifiable
              {filteredSlots.length > 1 ? 's' : ''} — cliquez sur une carte pour remplacer l'image.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une photo…"
                className="input-surface w-full py-2 pl-9 pr-3 text-xs sm:w-56"
              />
            </label>
            <select
              value={pageFilter}
              onChange={(event) => setPageFilter(event.target.value)}
              className="input-surface py-2 text-xs"
            >
              <option value="all">Toutes les pages</option>
              {pages.map(([pageKey, label]) => (
                <option key={pageKey} value={pageKey}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="panel h-64 animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : groupedSlots.length === 0 ? (
          <p className="mt-8 text-sm text-muted">Aucune photo ne correspond à cette recherche.</p>
        ) : (
          <div className="mt-8 space-y-10">
            {groupedSlots.map(([pageLabel, pageSlots]) => (
              <div key={pageLabel}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-hero text-xl uppercase leading-none text-cream">{pageLabel}</span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
                    {pageSlots.length} photo{pageSlots.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pageSlots.map((slot) => {
                    const current = valueFor(slot);
                    const saved = savedValueFor(slot);
                    const dirty = current !== saved;
                    const expanded = expandedKey === slot.key;

                    return (
                      <article key={slot.key} className="panel flex flex-col overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedKey(expanded ? null : slot.key)}
                          className="relative block aspect-[16/10] w-full overflow-hidden bg-white/[0.03] text-left"
                          aria-label={`Modifier ${slot.label}`}
                        >
                          {current ? (
                            <img src={current} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted">
                              <ImageIcon className="h-7 w-7" aria-hidden="true" />
                            </span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-[10px] uppercase tracking-[0.14em] text-white">
                            <span>{expanded ? 'Fermer' : 'Remplacer la photo'}</span>
                            {dirty && <span className="text-[rgb(var(--accent-red-rgb))]">Non enregistré</span>}
                          </span>
                        </button>

                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                            {slot.pageLabel} · {slot.sectionLabel}
                          </p>
                          <p className="text-sm font-semibold leading-snug text-cream">{slot.label}</p>
                          <p className="truncate text-[11px] text-muted">{current || 'Aucune image'}</p>
                        </div>

                        {expanded && (
                          <div className="border-t border-line p-4">
                            <ImageUpload
                              value={current}
                              label=""
                              folder={slot.folder}
                              allowReplace
                              compact
                              onChange={(url) => setDrafts((prev) => ({ ...prev, [slot.key]: url }))}
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSave(slot)}
                                disabled={!dirty || savingKey === slot.key}
                                className="btn-primary px-3 py-2 text-[10px] uppercase tracking-[0.14em] disabled:opacity-40"
                              >
                                {savingKey === slot.key ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                onClick={() => setDrafts((prev) => ({ ...prev, [slot.key]: slot.defaultUrl }))}
                                className="btn-ghost px-3 py-2 text-[10px] uppercase tracking-[0.14em]"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Photo par défaut
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── COLLECTIONS ─── */}
      {onTabChange && (
        <section className="panel p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            Autres photos gérées par collection
          </p>
          <div className="mt-4 grid gap-px bg-line sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onTabChange('homepage_builder')}
              className="bg-bg-card px-4 py-4 text-left transition-colors hover:bg-bg-card-hover"
            >
              <span className="block text-sm font-semibold text-cream">Diaporama du héro</span>
              <span className="mt-1 block text-xs text-muted">Slides de la page d'accueil</span>
            </button>
            {isFullAdmin && (
              <button
                type="button"
                onClick={() => onTabChange('pastors')}
                className="bg-bg-card px-4 py-4 text-left transition-colors hover:bg-bg-card-hover"
              >
                <span className="block text-sm font-semibold text-cream">Équipe pastorale</span>
                <span className="mt-1 block text-xs text-muted">Portraits et fiches des pasteurs</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onTabChange('activity_cards')}
              className="bg-bg-card px-4 py-4 text-left transition-colors hover:bg-bg-card-hover"
            >
              <span className="block text-sm font-semibold text-cream">Cartes Explorer</span>
              <span className="mt-1 block text-xs text-muted">Miniatures des activités</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('predications')}
              className="bg-bg-card px-4 py-4 text-left transition-colors hover:bg-bg-card-hover"
            >
              <span className="block text-sm font-semibold text-cream">Prédications</span>
              <span className="mt-1 block text-xs text-muted">Miniatures des messages de l'église</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('locations')}
              className="bg-bg-card px-4 py-4 text-left transition-colors hover:bg-bg-card-hover"
            >
              <span className="block text-sm font-semibold text-cream">Lieux & extensions</span>
              <span className="mt-1 block text-xs text-muted">Photos des implantations</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('media_communication')}
              className="bg-bg-card px-4 py-4 text-left transition-colors hover:bg-bg-card-hover"
            >
              <span className="block text-sm font-semibold text-cream">Galerie médias</span>
              <span className="mt-1 block text-xs text-muted">Photos ajoutées au site</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
