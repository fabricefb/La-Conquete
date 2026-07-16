import { useState, useEffect, useCallback } from 'react';
import {
  EyeOff, GripVertical, ToggleLeft, ToggleRight,
  ChevronDown, ChevronRight, Save, Loader2,
} from '../../../lib/icons';
import type { LucideIcon } from '../../../lib/icons';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  Eye, Palette, LayoutDashboard, Clock, Sparkles, Radio, BookOpen,
  Star, Compass, Quote, Users, MessageSquare, Newspaper,
  Heart, Mail, Flame, FileText, Image, Video, Calendar, MapPin, ChevronLeft,
  Plus, Trash2, ImageIcon, Monitor,
} from 'lucide-react';
import { saveSectionColors, loadSectionColors } from '../../../lib/hooks/useSectionColors';
import ImageUpload from '../ImageUpload';
import type { SectionColorMap } from '../../../lib/hooks/useSectionColors';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface SectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  config: Record<string, unknown>;
  text_color?: string;
  bg_color?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   Page definitions — each page has its own sections & colors
   ═══════════════════════════════════════════════════════════════════ */

interface PageDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: SectionConfig[];
}

const HOMEPAGE_SECTIONS: SectionConfig[] = [
  { id: 'topbar', label: 'Barre supérieure', visible: true, order: 0, config: { show_clock: true, show_marquee: true, show_live: true } },
  { id: 'hero', label: 'Héro plein écran', visible: true, order: 1, config: { overlay_opacity: 75, animation_speed: 70, show_scroll_indicator: true, show_stats: true } },
  { id: 'verses', label: 'Versets bibliques', visible: true, order: 2, config: { auto_play: true, interval: 6, columns: 4 } },
  { id: 'pillars', label: 'Trois Piliers', visible: true, order: 3, config: { columns: 3, hover_scale: 102 } },
  { id: 'unique', label: 'Nous sommes uniques', visible: true, order: 4, config: { show_signature: true, image_offset: 40 } },
  { id: 'explore', label: 'Explorer', visible: true, order: 5, config: { columns: 4, hover_zoom: 110 } },
  { id: 'quote', label: 'Citation biblique', visible: true, order: 6, config: { show: true } },
  { id: 'pastors', label: 'Équipe pastorale', visible: true, order: 7, config: { columns: 4, show_bio: true, max_display: 8 } },
  { id: 'testimonials', label: 'Témoignages', visible: true, order: 8, config: { auto_play: true, interval: 5 } },
  { id: 'blog', label: 'Blog / Actualités', visible: true, order: 9, config: { columns: 3, max_posts: 3 } },
  { id: 'cta', label: 'Appel à action', visible: true, order: 10, config: { overlay_opacity: 85, show_heart: true } },
  { id: 'map', label: 'Carte de localisation', visible: true, order: 11, config: { embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15881.0!2d29.2223!3d-11.6602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1c6c1e4e5e5e5e5%3A0x5e5e5e5e5e5e5e5!2sLubumbashi!5e0!3m2!1sfr!2scd!4v1700000000000', height: 400 } },
];

function makePageSections(pageId: string): SectionConfig[] {
  switch (pageId) {
    case 'home':
      return HOMEPAGE_SECTIONS.map(s => ({ ...s }));
    case 'culte':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'horaires', label: 'Horaires de culte', visible: true, order: 1, config: { columns: 4 } },
        { id: 'live', label: 'Diffusion en direct', visible: true, order: 2, config: {} },
        { id: 'map', label: 'Carte & Localisation', visible: true, order: 3, config: {} },
        { id: 'pratiques', label: 'Infos pratiques', visible: true, order: 4, config: { columns: 4 } },
        { id: 'cta', label: 'Appel à action', visible: true, order: 5, config: {} },
      ];
    case 'vision':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'vision_text', label: 'Notre Vision', visible: true, order: 1, config: {} },
        { id: 'mission', label: 'Notre Mission', visible: true, order: 2, config: { columns: 3 } },
        { id: 'valeurs', label: 'Nos Valeurs', visible: true, order: 3, config: {} },
        { id: 'psaume', label: 'Psaume 2:8', visible: true, order: 4, config: {} },
        { id: 'histoire', label: 'Notre Histoire', visible: true, order: 5, config: {} },
        { id: 'cta', label: 'Appel à action', visible: true, order: 6, config: {} },
      ];
    case 'pasteurs':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'principal', label: 'Pasteur Principal', visible: true, order: 1, config: {} },
        { id: 'anciens', label: 'Anciens', visible: true, order: 2, config: {} },
        { id: 'diacres', label: 'Diacres', visible: true, order: 3, config: {} },
        { id: 'equipe', label: 'Équipe élargie', visible: true, order: 4, config: {} },
        { id: 'cta', label: 'Appel à action', visible: true, order: 5, config: {} },
      ];
    case 'ministeres':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'grid', label: 'Grille des ministères', visible: true, order: 1, config: { columns: 3 } },
        { id: 'cta', label: 'Appel à action', visible: true, order: 2, config: {} },
      ];
    case 'jeunesse':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'about', label: 'Qui sommes-nous', visible: true, order: 1, config: {} },
        { id: 'activites', label: 'Activités', visible: true, order: 2, config: { columns: 3 } },
        { id: 'programme', label: 'Programme', visible: true, order: 3, config: {} },
        { id: 'galerie', label: 'Galerie Photos', visible: true, order: 4, config: {} },
        { id: 'temoignages', label: 'Témoignages', visible: true, order: 5, config: {} },
        { id: 'cta', label: 'Appel à action', visible: true, order: 6, config: {} },
      ];
    case 'enseignements':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'recherche', label: 'Recherche & Filtres', visible: true, order: 1, config: {} },
        { id: 'predications', label: 'Dernières Prédications', visible: true, order: 2, config: { columns: 3 } },
        { id: 'series', label: "Séries d'Enseignement", visible: true, order: 3, config: {} },
        { id: 'etudes', label: 'Études Bibliques', visible: true, order: 4, config: {} },
        { id: 'telechargements', label: 'Téléchargements', visible: true, order: 5, config: {} },
      ];
    case 'blog':
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'filtres', label: 'Filtres & Recherche', visible: true, order: 1, config: {} },
        { id: 'featured', label: 'Article vedette', visible: true, order: 2, config: {} },
        { id: 'grid', label: 'Grille d\'articles', visible: true, order: 3, config: { columns: 3 } },
        { id: 'pagination', label: 'Pagination', visible: true, order: 4, config: {} },
      ];
    default:
      return [
        { id: 'hero', label: 'Héro', visible: true, order: 0, config: {} },
        { id: 'content', label: 'Contenu principal', visible: true, order: 1, config: {} },
        { id: 'cta', label: 'Appel à action', visible: true, order: 2, config: {} },
      ];
  }
}

const ALL_PAGES: PageDefinition[] = [
  { id: 'home', label: 'Page d\'accueil', icon: LayoutDashboard, sections: makePageSections('home') },
  { id: 'culte', label: 'Culte', icon: Calendar, sections: makePageSections('culte') },
  { id: 'vision', label: 'Vision & Mission', icon: Eye, sections: makePageSections('vision') },
  { id: 'pasteurs', label: 'Pasteurs', icon: Users, sections: makePageSections('pasteurs') },
  { id: 'ministeres', label: 'Ministères', icon: Heart, sections: makePageSections('ministeres') },
  { id: 'jeunesse', label: 'Jeunesse', icon: Sparkles, sections: makePageSections('jeunesse') },
  { id: 'enseignements', label: 'Enseignements', icon: BookOpen, sections: makePageSections('enseignements') },
  { id: 'blog', label: 'Blog', icon: Newspaper, sections: makePageSections('blog') },
];

const SECTION_ICONS: Record<string, LucideIcon> = {
  topbar: Clock, hero: Sparkles, verses: BookOpen, pillars: Flame,
  unique: Star, explore: Compass, quote: Quote, pastors: Users,
  testimonials: MessageSquare, blog: Newspaper, cta: Heart, map: MapPin,
  horaires: Calendar, live: Radio, pratiques: Star,
  vision_text: Eye, mission: Compass, valeurs: Heart, psaume: BookOpen,
  histoire: Clock, principal: Users, anciens: Users, diacres: Users,
  equipe: Users, grid: LayoutDashboard, about: FileText, activites: Sparkles,
  programme: Calendar, galerie: Image, temoignages: MessageSquare,
  recherche: Compass, predications: Video, series: BookOpen,
  etudes: BookOpen, telechargements: FileText, filtres: Compass,
  featured: Star, pagination: ChevronLeft, content: FileText,
};

/* ═══════════════════════════════════════════════════════════════════
   Shared UI Primitives
   ═══════════════════════════════════════════════════════════════════ */

function SectionCard({
  title,
  icon: Icon,
  visible,
  onToggleVisible,
  expanded,
  onToggleExpanded,
  children,
}: {
  title: string;
  icon: LucideIcon;
  visible: boolean;
  onToggleVisible: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
            className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            title={visible ? 'Masquer la section' : 'Afficher la section'}
          >
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-red-400" />}
          </button>
          {expanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
        </div>
      </button>
      {expanded && <div className="border-t border-white/5 px-4 py-3">{children}</div>}
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="min-w-0 flex-shrink-0 text-sm text-white/70">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-2" title={label}>
      {value ? <ToggleRight className="h-6 w-6 text-amber-400" /> : <ToggleLeft className="h-6 w-6 text-white/30" />}
    </button>
  );
}

function Slider({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-white/70">{label}</span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono text-amber-400">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-500" />
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <ControlRow label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-white/20 bg-transparent" />
        <span className="text-xs font-mono text-white/50">{value || 'Défaut'}</span>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-[10px] text-white/30 hover:text-white/60 transition-colors" title="Réinitialiser">
            ✕
          </button>
        )}
      </div>
    </ControlRow>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="py-2">
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="py-2">
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 resize-none" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Universal Section Color Controls
   ═══════════════════════════════════════════════════════════════════ */

function SectionColorControls({
  section,
  onColorChange,
}: {
  section: SectionConfig;
  onColorChange: (type: 'text' | 'bg', value: string) => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center gap-1.5 mb-2">
        <Palette className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Couleurs de la section</span>
      </div>
      <ColorPicker label="Couleur du texte" value={section.text_color || ''} onChange={(v) => onColorChange('text', v)} />
      <ColorPicker label="Couleur de fond" value={section.bg_color || ''} onChange={(v) => onColorChange('bg', v)} />
      {section.text_color && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-6 rounded px-2 text-xs font-medium" style={{ backgroundColor: section.bg_color || '#1a1a2e', color: section.text_color }}>
            Aperçu
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Hero Image Manager — upload/manage hero slideshow images
   Stores images in page_contents table (hero/bg_image, hero/bg_images)
   ═══════════════════════════════════════════════════════════════════ */

function HeroImageManager() {
  const { addToast } = useToast();
  const [mainImage, setMainImage] = useState('');
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load hero images from page_contents
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('page_contents')
        .select('section_key, field_key, value')
        .eq('page', 'home')
        .in('section_key', ['hero']);

      if (cancelled || !data) { setLoading(false); return; }

      let main = '';
      const slides: string[] = [];

      for (const row of data) {
        if (row.field_key === 'bg_image' && row.value) main = row.value;
        if (row.field_key === 'bg_images' && row.value) {
          slides.push(...row.value.split(',').map((u: string) => u.trim()).filter(Boolean));
        }
      }

      setMainImage(main);
      setSlideshowImages(slides);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Save a single content row
  const saveContent = async (sectionKey: string, fieldKey: string, value: string) => {
    const { data: existing } = await supabase
      .from('page_contents')
      .select('id')
      .eq('page', 'home')
      .eq('section_key', sectionKey)
      .eq('field_key', fieldKey)
      .single();

    if (existing) {
      await supabase.from('page_contents').update({ value, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('page_contents').insert({
        page: 'home', section_key: sectionKey, field_key: fieldKey, value,
      });
    }
  };

  const handleMainChange = async (url: string) => {
    setMainImage(url);
    setSaving(true);
    try {
      await saveContent('hero', 'bg_image', url);
      addToast('Image principale du hero mise à jour', 'success');
    } catch {
      addToast("Erreur lors de la sauvegarde de l'image", 'error');
    }
    setSaving(false);
  };

  const handleAddSlide = async (url: string) => {
    if (!url) return;
    const updated = [...slideshowImages, url];
    setSlideshowImages(updated);
    setSaving(true);
    try {
      await saveContent('hero', 'bg_images', updated.join(', '));
      addToast('Diapositive ajoutée', 'success');
    } catch {
      addToast("Erreur lors de l'ajout", 'error');
    }
    setSaving(false);
  };

  const handleRemoveSlide = async (index: number) => {
    const updated = slideshowImages.filter((_, i) => i !== index);
    setSlideshowImages(updated);
    setSaving(true);
    try {
      await saveContent('hero', 'bg_images', updated.join(', '));
      addToast('Diapositive supprimée', 'success');
    } catch {
      addToast("Erreur lors de la suppression", 'error');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-white/40 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des images...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-white">Image principale du héros</span>
        </div>
        <ImageUpload
          value={mainImage}
          onChange={handleMainChange}
          folder="hero"
          accept={['image/jpeg', 'image/png', 'image/webp']}
          maxSizeMB={10}
        />
      </div>

      {/* Slideshow images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Image size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-white">Diapositives du carrousel</span>
          </div>
          <span className="text-xs text-white/40">{slideshowImages.length} image{slideshowImages.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Existing slides */}
        {slideshowImages.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {slideshowImages.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
                <img src={url} alt={`Diapositive ${i + 1}`} className="w-full h-24 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-0.5">
                  <span className="text-[10px] text-white/70">#{i + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSlide(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new slide */}
        <ImageUpload
          value=""
          onChange={handleAddSlide}
          label="Ajouter une diapositive"
          folder="hero"
          accept={['image/jpeg', 'image/png', 'image/webp']}
          maxSizeMB={10}
        />
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde en cours...
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Header Images Manager — logo + mega menu images
   Stored in site_settings (category: 'images')
   ═══════════════════════════════════════════════════════════════════ */

const HEADER_IMAGE_SETTINGS = [
  { key: 'site_logo_url', label: 'Logo du site (en-tête)', folder: 'logo' },
  { key: 'logo_footer_url', label: 'Logo du pied de page', folder: 'logo' },
  { key: 'mega_menu_image_about', label: 'Méga menu — À Propos', folder: 'mega-menu' },
  { key: 'mega_menu_image_vie_eglise', label: 'Méga menu — Vie de l\'Église', folder: 'mega-menu' },
  { key: 'mega_menu_image_media', label: 'Méga menu — Média', folder: 'mega-menu' },
] as const;

function HeaderImagesManager() {
  const { addToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', HEADER_IMAGE_SETTINGS.map(s => s.key));

      if (cancelled || !data) { setLoading(false); return; }

      const map: Record<string, string> = {};
      for (const row of data) map[row.key] = row.value;
      setValues(map);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (key: string, url: string) => {
    setValues(prev => ({ ...prev, [key]: url }));
    const settingDef = HEADER_IMAGE_SETTINGS.find(s => s.key === key);

    // Try update first
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: url, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) { addToast("Erreur lors de la sauvegarde", 'error'); return; }
    } else {
      const { error } = await supabase
        .from('site_settings')
        .insert({
          key,
          value: url,
          type: 'url',
          category: 'images',
          label: settingDef?.label ?? key,
          description: 'URL de l\'image (R2 ou toute URL publique)',
          sort_order: 100 + HEADER_IMAGE_SETTINGS.findIndex(s => s.key === key),
        });
      if (error) { addToast("Erreur lors de la sauvegarde", 'error'); return; }
    }

    addToast(`${settingDef?.label ?? key} mis à jour`, 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-white/40 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {HEADER_IMAGE_SETTINGS.map((setting) => (
        <div key={setting.key}>
          <ImageUpload
            value={values[setting.key] ?? ''}
            onChange={(url) => handleSave(setting.key, url)}
            label={setting.label}
            folder={setting.folder}
            accept={['image/jpeg', 'image/png', 'image/webp']}
            maxSizeMB={10}
          />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section Config Renderer (homepage-specific configs)
   ═══════════════════════════════════════════════════════════════════ */

function SectionConfigEditor({
  section,
  update,
  onColorChange,
}: {
  section: SectionConfig;
  update: (key: string, value: unknown) => void;
  onColorChange: (type: 'text' | 'bg', value: string) => void;
}) {
  const c = section.config;

  // Only homepage sections have detailed config editors
  if (section.id === 'topbar') {
    return (
      <>
        <ControlRow label="Afficher l'horloge">
          <Toggle value={!!c.show_clock} onChange={(v) => update('show_clock', v)} />
        </ControlRow>
        <ControlRow label="Bandeau défilant">
          <Toggle value={!!c.show_marquee} onChange={(v) => update('show_marquee', v)} />
        </ControlRow>
        <ControlRow label="Indicateur en direct">
          <Toggle value={!!c.show_live} onChange={(v) => update('show_live', v)} />
        </ControlRow>
        <TextInput label="Texte défilant" value={(c.marquee_text as string) || ''} onChange={(v) => update('marquee_text', v)} placeholder="Texte du bandeau défilant..." />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'hero') {
    return (
      <>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={14} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Images du héros</span>
          </div>
          <HeroImageManager />
        </div>
        <Slider label="Opacité de l'overlay" value={Number(c.overlay_opacity ?? 75)} onChange={(v) => update('overlay_opacity', v)} min={0} max={100} />
        <Slider label="Vitesse d'animation" value={Number(c.animation_speed ?? 70)} onChange={(v) => update('animation_speed', v)} min={10} max={100} />
        <ControlRow label="Indicateur de défilement">
          <Toggle value={!!c.show_scroll_indicator} onChange={(v) => update('show_scroll_indicator', v)} />
        </ControlRow>
        <ControlRow label="Statistiques">
          <Toggle value={!!c.show_stats} onChange={(v) => update('show_stats', v)} />
        </ControlRow>
        <TextInput label="Badge" value={(c.badge as string) || ''} onChange={(v) => update('badge', v)} placeholder="Ex: Bienvenue" />
        <TextInput label="Sous-titre" value={(c.subtitle as string) || ''} onChange={(v) => update('subtitle', v)} placeholder="Sous-titre du héros" />
        <TextInput label="Bouton CTA 1" value={(c.cta1 as string) || ''} onChange={(v) => update('cta1', v)} placeholder="Premier appel à action" />
        <TextInput label="Bouton CTA 2" value={(c.cta2 as string) || ''} onChange={(v) => update('cta2', v)} placeholder="Deuxième appel à action" />
        <ColorPicker label="Couleur de l'overlay" value={(c.overlay_color as string) || '#000000'} onChange={(v) => update('overlay_color', v)} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'verses') {
    return (
      <>
        <ControlRow label="Lecture automatique">
          <Toggle value={!!c.auto_play} onChange={(v) => update('auto_play', v)} />
        </ControlRow>
        <Slider label="Intervalle (secondes)" value={Number(c.interval ?? 6)} onChange={(v) => update('interval', v)} min={3} max={15} />
        <Slider label="Colonnes" value={Number(c.columns ?? 4)} onChange={(v) => update('columns', v)} min={2} max={4} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'pillars') {
    return (
      <>
        <Slider label="Colonnes" value={Number(c.columns ?? 3)} onChange={(v) => update('columns', v)} min={1} max={3} />
        <Slider label="Échelle au survol (%)" value={Number(c.hover_scale ?? 102)} onChange={(v) => update('hover_scale', v)} min={100} max={110} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'unique') {
    return (
      <>
        <ControlRow label="Afficher la signature">
          <Toggle value={!!c.show_signature} onChange={(v) => update('show_signature', v)} />
        </ControlRow>
        <Slider label="Décalage de l'image (%)" value={Number(c.image_offset ?? 40)} onChange={(v) => update('image_offset', v)} min={0} max={100} />
        <TextInput label="Titre" value={(c.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre de la section" />
        <TextInput label="Texte 1" value={(c.text1 as string) || ''} onChange={(v) => update('text1', v)} placeholder="Premier texte" />
        <TextInput label="Texte 2" value={(c.text2 as string) || ''} onChange={(v) => update('text2', v)} placeholder="Deuxième texte" />
        <TextArea label="Citation" value={(c.quote as string) || ''} onChange={(v) => update('quote', v)} placeholder="Citation inspirante..." />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'explore') {
    return (
      <>
        <Slider label="Colonnes" value={Number(c.columns ?? 4)} onChange={(v) => update('columns', v)} min={2} max={4} />
        <Slider label="Zoom au survol (%)" value={Number(c.hover_zoom ?? 110)} onChange={(v) => update('hover_zoom', v)} min={100} max={120} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'pastors') {
    return (
      <>
        <Slider label="Colonnes" value={Number(c.columns ?? 4)} onChange={(v) => update('columns', v)} min={2} max={4} />
        <ControlRow label="Afficher la biographie">
          <Toggle value={!!c.show_bio} onChange={(v) => update('show_bio', v)} />
        </ControlRow>
        <Slider label="Affichage maximum" value={Number(c.max_display ?? 8)} onChange={(v) => update('max_display', v)} min={4} max={12} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'testimonials') {
    return (
      <>
        <ControlRow label="Lecture automatique">
          <Toggle value={!!c.auto_play} onChange={(v) => update('auto_play', v)} />
        </ControlRow>
        <Slider label="Intervalle (secondes)" value={Number(c.interval ?? 5)} onChange={(v) => update('interval', v)} min={3} max={15} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'blog') {
    return (
      <>
        <Slider label="Colonnes" value={Number(c.columns ?? 3)} onChange={(v) => update('columns', v)} min={1} max={3} />
        <Slider label="Nombre d'articles" value={Number(c.max_posts ?? 3)} onChange={(v) => update('max_posts', v)} min={1} max={6} />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'cta') {
    return (
      <>
        <Slider label="Opacité de l'overlay" value={Number(c.overlay_opacity ?? 85)} onChange={(v) => update('overlay_opacity', v)} min={0} max={100} />
        <ControlRow label="Afficher le cœur">
          <Toggle value={!!c.show_heart} onChange={(v) => update('show_heart', v)} />
        </ControlRow>
        <TextInput label="Titre" value={(c.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre de l'appel à action" />
        <TextInput label="Texte" value={(c.text as string) || ''} onChange={(v) => update('text', v)} placeholder="Description de l'appel à action" />
        <TextInput label="Bouton CTA" value={(c.cta as string) || ''} onChange={(v) => update('cta', v)} placeholder="Texte du bouton" />
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  if (section.id === 'map') {
    return (
      <>
        <TextArea
          label="URL d'intégration Google Maps"
          value={(c.embed_url as string) || ''}
          onChange={(v) => update('embed_url', v)}
          placeholder="Collez ici l'URL d'intégration Google Maps..."
        />
        <Slider
          label="Hauteur (px)"
          value={Number(c.height ?? 400)}
          onChange={(v) => update('height', v)}
          min={200}
          max={800}
        />
        <p className="text-xs text-white/40 mt-1">
          Pour obtenir l'URL : allez sur Google Maps, recherchez votre lieu, cliquez sur &quot;Partager&quot; → &quot;Intégrer une carte&quot;, et copiez le lien src de l'iframe.
        </p>
        <SectionColorControls section={section} onColorChange={onColorChange} />
      </>
    );
  }

  // Generic: only color controls
  return <SectionColorControls section={section} onColorChange={onColorChange} />;
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function HomepageBuilderTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();
  const [activePageId, setActivePageId] = useState('home');
  const [sections, setSections] = useState<SectionConfig[]>(makePageSections('home'));
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // ── Load config + colors for the active page ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const defaults = makePageSections(activePageId);

      // Load section order/visibility config
      const { data: configData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `builder_config_${activePageId}`)
        .single();

      let loaded = defaults;
      if (!cancelled && configData?.value) {
        try {
          const parsed = JSON.parse(configData.value) as SectionConfig[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            loaded = parsed;
          }
        } catch { /* keep defaults */ }
      }

      // Load section colors
      if (!cancelled) {
        const colors = await loadSectionColors(activePageId);
        loaded = loaded.map(s => ({
          ...s,
          text_color: colors[s.id]?.text || s.text_color,
          bg_color: colors[s.id]?.bg || s.bg_color,
        }));
        setSections(loaded);
      }

      if (!cancelled) setLoading(false);
    }

    load();
  }, [activePageId]);

  // ── Toggle section visibility ──
  const toggleVisibility = useCallback((id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateSectionConfig = useCallback((sectionId: string, key: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, config: { ...s.config, [key]: value } } : s)),
    );
  }, []);

  const handleColorChange = useCallback((sectionId: string, type: 'text' | 'bg', value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, [type === 'text' ? 'text_color' : 'bg_color']: value } : s)),
    );
  }, []);

  // ── Save (config + colors separately) ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Save section config (without color fields)
      const configToSave = sections.map(({ text_color: _tc, bg_color: _bc, ...rest }) => rest);

      await supabase
        .from('site_settings')
        .upsert(
          {
            key: `builder_config_${activePageId}`,
            value: JSON.stringify(configToSave),
            type: 'json',
            category: 'general',
            label: `Configuration constructeur — ${ALL_PAGES.find(p => p.id === activePageId)?.label ?? activePageId}`,
            sort_order: 500,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' },
        );

      // Save section colors
      const colorMap: SectionColorMap = {};
      for (const s of sections) {
        if (s.text_color || s.bg_color) {
          colorMap[s.id] = {
            text: s.text_color || '',
            bg: s.bg_color || '',
          };
        }
      }
      await saveSectionColors(activePageId, colorMap);

      addToast(`Configuration de "${ALL_PAGES.find(p => p.id === activePageId)?.label}" enregistrée`, 'success');
    } catch {
      addToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSaving(false);
    }
  }, [sections, activePageId, addToast]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setSections(makePageSections(activePageId));
    setActiveSection(null);
    setExpandedSections(new Set());
    addToast('Configuration réinitialisée', 'info');
  }, [activePageId, addToast]);

  // ── Drag-and-drop ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => { setDragIdx(idx); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDropIdx(idx); }, []);
  const handleDrop = useCallback((dropIndex: number) => {
    if (dragIdx === null || dragIdx === dropIndex) return;
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dropIndex, 0, moved);
      return next.map((s, i) => ({ ...s, order: i }));
    });
    setDragIdx(null);
    setDropIdx(null);
  }, [dragIdx]);
  const handleDragEnd = useCallback(() => { setDragIdx(null); setDropIdx(null); }, []);

  const activeSectionsCount = sections.filter((s) => s.visible).length;
  const activeSectionData = sections.find((s) => s.id === activeSection);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Page selector + Section List ── */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-white/10 bg-black/20">
        {/* Page tabs */}
        <div className="border-b border-white/10 p-2">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">Pages</p>
          <div className="grid grid-cols-2 gap-1">
            {ALL_PAGES.map((pg) => {
              const PgIcon = pg.icon;
              const isActive = activePageId === pg.id;
              return (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => { setActivePageId(pg.id); setActiveSection(null); }}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition-all ${
                    isActive ? 'bg-amber-500/15 text-amber-400' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <PgIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{pg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <LayoutDashboard className="h-5 w-5 text-amber-400" />
          <h2 className="text-sm font-semibold text-white truncate">
            {ALL_PAGES.find(p => p.id === activePageId)?.label || 'Sections'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Header images shortcut (home page only) ── */}
          {activePageId === 'home' && (
            <button
              type="button"
              onClick={() => setActiveSection('__header__')}
              className={`flex w-full items-center gap-2 border-b border-white/10 px-3 py-3 text-left transition-colors hover:bg-white/5 ${
                activeSection === '__header__' ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
              }`}
            >
              <Monitor className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <span className={`flex-1 truncate text-sm font-medium ${activeSection === '__header__' ? 'text-amber-400' : 'text-white'}`}>
                En-tête & Navigation
              </span>
              <span className="text-[10px] text-white/30">Logo + Méga menu</span>
            </button>
          )}

          {sections.map((section, i) => {
            const Icon = SECTION_ICONS[section.id] ?? Sparkles;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                onClick={() => setActiveSection(isActive ? null : section.id)}
                className={`flex w-full items-center gap-2 border-b border-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
                  isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                } ${dragIdx === i ? 'opacity-30' : ''} ${dropIdx === i ? 'border-t-2 border-t-evangile-500' : ''}`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 text-white/40 cursor-grab active:cursor-grabbing" />
                <Icon className="h-4 w-4 flex-shrink-0 text-white/50" />
                <span className={`flex-1 truncate text-sm ${section.visible ? 'text-white' : 'text-white/40 line-through'}`}>
                  {section.label}
                </span>
                {(section.text_color || section.bg_color) && (
                  <div className="flex gap-0.5">
                    {section.text_color && <div className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: section.text_color }} />}
                    {section.bg_color && <div className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: section.bg_color }} />}
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id); }}
                  className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-white/10"
                >
                  {section.visible
                    ? <Eye className="h-3.5 w-3.5 text-white/50" />
                    : <EyeOff className="h-3.5 w-3.5 text-red-400/70" />}
                </button>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-xs text-white/50">
            {activeSectionsCount} section{activeSectionsCount !== 1 ? 's' : ''} active{activeSectionsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </aside>

      {/* ── Right Panel: Section Config ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
          <button
            type="button"
            onClick={() => { setActivePageId('home'); setActiveSection(null); }}
            className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Page d&apos;accueil</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset} disabled={!isFullAdmin} className="rounded-md px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              Réinitialiser
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !isFullAdmin} className="btn-gold flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          {activeSection === '__header__' ? (
            <div className="mx-auto max-w-xl space-y-3">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Images de l'en-tête et navigation
              </h3>
              <p className="text-xs text-white/50 mb-4">
                Gérez le logo du site, le logo du pied de page, et les images du méga menu.
                Collez vos liens R2 (ex: https://pub-344d6377f96445089f6ad71c3ab2fc80.r2.dev/logo/logo.png)
                ou uploadez directement.
              </p>
              <HeaderImagesManager />
            </div>
          ) : !activeSection || !activeSectionData ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <LayoutDashboard className="mx-auto mb-3 h-10 w-10 text-white/10" />
                <p className="text-sm text-white/40">Sélectionnez une section pour la configurer</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl space-y-3">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Configuration — {activeSectionData.label}
              </h3>

              <SectionCard
                title={activeSectionData.label}
                icon={SECTION_ICONS[activeSectionData.id] ?? Sparkles}
                visible={activeSectionData.visible}
                onToggleVisible={() => toggleVisibility(activeSectionData.id)}
                expanded={expandedSections.has(activeSectionData.id) || true}
                onToggleExpanded={() => toggleExpanded(activeSectionData.id)}
              >
                <SectionConfigEditor
                  section={activeSectionData}
                  update={(key, value) => updateSectionConfig(activeSectionData.id, key, value)}
                  onColorChange={(type, value) => handleColorChange(activeSectionData.id, type, value)}
                />
              </SectionCard>

              <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs text-white/30">
                  Section : <span className="font-mono text-white/50">{activeSectionData.id}</span>
                  {' · '}Ordre : <span className="font-mono text-white/50">{activeSectionData.order}</span>
                  {' · '}Visible : <span className="font-mono text-white/50">{activeSectionData.visible ? 'Oui' : 'Non'}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}