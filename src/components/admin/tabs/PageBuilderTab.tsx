import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye, EyeOff, GripVertical, ChevronRight, Trash2, Plus,
  Save, Download, Loader2, Copy, ArrowLeft,
} from '../../../lib/icons';
import type { LucideIcon } from '../../../lib/icons';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  Calendar, Radio, Heart, Users, Mail, BookOpen,
  MessageSquare, Building2, GraduationCap, MonitorPlay,
  Sparkles, FileText, Image, Quote, Star, Clock,
  LayoutGrid, MapPin, HelpCircle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface TemplateSection {
  id: string;
  type: string;
  label: string;
  props: Record<string, unknown>;
}

interface PageTemplate {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sections: TemplateSection[];
}

type ViewMode = 'gallery' | 'editor';

/* ═══════════════════════════════════════════════════════════════════
   Section Types
   ═══════════════════════════════════════════════════════════════════ */

const SECTION_TYPES: { type: string; label: string; icon: LucideIcon; description: string }[] = [
  { type: 'hero', label: 'En-tête', icon: Sparkles, description: 'Bannière principale avec titre et appel à action' },
  { type: 'text', label: 'Texte', icon: FileText, description: 'Bloc de texte riche ou paragraphe' },
  { type: 'verses', label: 'Versets', icon: BookOpen, description: 'Affichage de versets bibliques' },
  { type: 'cards', label: 'Cartes', icon: LayoutGrid, description: 'Grille de cartes avec icônes' },
  { type: 'gallery', label: 'Galerie', icon: Image, description: 'Galerie de photos ou images' },
  { type: 'quote', label: 'Citation', icon: Quote, description: 'Citation mise en avant' },
  { type: 'team', label: 'Équipe', icon: Users, description: 'Grille de membres de l\'équipe' },
  { type: 'testimonials', label: 'Témoignages', icon: MessageSquare, description: 'Carrousel de témoignages' },
  { type: 'stats', label: 'Statistiques', icon: Star, description: 'Compteurs et chiffres clés' },
  { type: 'timeline', label: 'Chronologie', icon: Clock, description: 'Timeline d\'événements' },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, description: 'Questions fréquentes accordéon' },
  { type: 'cta', label: 'Appel à action', icon: Heart, description: 'Section de conversion' },
  { type: 'contact', label: 'Contact', icon: Mail, description: 'Formulaire et informations de contact' },
];

const SECTION_TYPE_MAP = Object.fromEntries(SECTION_TYPES.map((s) => [s.type, s]));

const ICON_MAP: Record<string, LucideIcon> = {
  Calendar, Radio, Heart, Users, Mail, BookOpen,
  MessageSquare, Building2, GraduationCap, MonitorPlay,
  Sparkles, FileText, Image, Quote, Star, Clock,
  LayoutGrid, MapPin, HelpCircle,
};

/* ═══════════════════════════════════════════════════════════════════
   Templates
   ═══════════════════════════════════════════════════════════════════ */

const TEMPLATES: PageTemplate[] = [
  {
    id: 'evenement', name: 'Événement', slug: 'evenement', icon: 'Calendar',
    description: 'Page événement avec compte à rebours',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Dimanche 15 Juillet', cta_text: "S'inscrire", cta_link: '/contact' } },
      { id: 's2', type: 'text', label: 'Description', props: { body: 'Découvrez notre prochain événement et rejoignez-nous pour une soirée de louange et de prière.' } },
      { id: 's3', type: 'gallery', label: 'Galerie photos', props: {} },
      { id: 's4', type: 'cta', label: 'Inscription', props: { title: 'Réservez votre place', body: 'Les places sont limitées.', cta_text: "S'inscrire maintenant" } },
      { id: 's5', type: 'contact', label: 'Contact', props: { show_map: true } },
    ],
  },
  {
    id: 'predication', name: 'Prédication', slug: 'predication', icon: 'Radio',
    description: 'Page prédication avec vidéo intégrée',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Dernières prédications', cta_text: 'Écouter', cta_link: '/media' } },
      { id: 's2', type: 'text', label: 'Présentation', props: { body: 'Retrouvez les enseignements bibliques de nos pasteurs chaque semaine.' } },
      { id: 's3', type: 'gallery', label: 'Séries', props: {} },
      { id: 's4', type: 'verses', label: 'Verset du jour', props: {} },
      { id: 's5', type: 'contact', label: 'Demande de prière', props: { show_map: false } },
    ],
  },
  {
    id: 'don', name: 'Faire un don', slug: 'don', icon: 'Heart',
    description: 'Page de collecte de dons',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Soutenez notre mission', cta_text: 'Donner maintenant', cta_link: '/dons' } },
      { id: 's2', type: 'text', label: 'Notre vision', props: { body: 'Chaque don contribue à l\'avancée de l\'Évangile et au soutien de nos communautés.' } },
      { id: 's3', type: 'stats', label: 'Impact', props: {} },
      { id: 's4', type: 'cta', label: 'Appel à donner', props: { title: 'Votre générosité compte', body: 'Faites un don en toute sécurité.', cta_text: 'Faire un don' } },
      { id: 's5', type: 'faq', label: 'Questions fréquentes', props: {} },
    ],
  },
  {
    id: 'equipe', name: 'Notre Équipe', slug: 'equipe', icon: 'Users',
    description: 'Présentation de l\'équipe pastorale',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Servir avec amour', cta_text: 'Nous contacter', cta_link: '/contact' } },
      { id: 's2', type: 'team', label: 'Pasteurs', props: {} },
      { id: 's3', type: 'text', label: 'Notre mission', props: { body: 'Notre équipe est dédiée à servir Dieu et la communauté avec passion et humilité.' } },
      { id: 's4', type: 'testimonials', label: 'Témoignages', props: {} },
      { id: 's5', type: 'contact', label: 'Rejoindre', props: { show_map: false } },
    ],
  },
  {
    id: 'contact', name: 'Contact', slug: 'contact-av', icon: 'Mail',
    description: 'Page de contact avancée',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Nous sommes là pour vous', cta_text: 'Nous écrire', cta_link: '#form' } },
      { id: 's2', type: 'text', label: 'Informations', props: { body: 'N\'hésitez pas à nous contacter pour toute question ou demande de prière.' } },
      { id: 's3', type: 'faq', label: 'FAQ', props: {} },
      { id: 's4', type: 'contact', label: 'Formulaire', props: { show_map: true } },
    ],
  },
  {
    id: 'histoire', name: 'Notre Histoire', slug: 'histoire', icon: 'BookOpen',
    description: 'Histoire et fondation de l\'église',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Depuis 1998', cta_text: 'En savoir plus', cta_link: '/about' } },
      { id: 's2', type: 'text', label: 'Introduction', props: { body: 'L\'histoire de notre église est celle d\'une communauté unie par la foi et l\'amour de Dieu.' } },
      { id: 's3', type: 'timeline', label: 'Chronologie', props: {} },
      { id: 's4', type: 'stats', label: 'Chiffres clés', props: {} },
      { id: 's5', type: 'quote', label: 'Citation fondatrice', props: {} },
      { id: 's6', type: 'cta', label: 'Rejoignez-nous', props: { title: 'Faites partie de l\'histoire', cta_text: 'Nous rejoindre' } },
    ],
  },
  {
    id: 'temoignages', name: 'Témoignages', slug: 'temoignages', icon: 'MessageSquare',
    description: 'Page de témoignages de foi',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Ce que Dieu a fait', cta_text: 'Partager votre témoignage', cta_link: '/contact' } },
      { id: 's2', type: 'testimonials', label: 'Témoignages', props: {} },
      { id: 's3', type: 'quote', label: 'Parole de vie', props: {} },
      { id: 's4', type: 'cta', label: 'Partager', props: { title: 'Votre histoire compte', cta_text: 'Témoigner' } },
    ],
  },
  {
    id: 'ministere', name: 'Ministères', slug: 'ministere', icon: 'Building2',
    description: 'Présentation des ministères de l\'église',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Servir ensemble', cta_text: 'Découvrir', cta_link: '/departments' } },
      { id: 's2', type: 'cards', label: 'Nos ministères', props: {} },
      { id: 's3', type: 'team', label: 'Responsables', props: {} },
      { id: 's4', type: 'text', label: 'Rejoindre un ministère', props: { body: 'Chaque membre a un rôle à jouer dans le corps du Christ.' } },
      { id: 's5', type: 'contact', label: 'Inscription', props: { show_map: false } },
    ],
  },
  {
    id: 'ecole', name: 'École Biblique', slug: 'ecole', icon: 'GraduationCap',
    description: 'Formation et enseignement biblique',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Croître dans la Parole', cta_text: 'S\'inscrire', cta_link: '/contact' } },
      { id: 's2', type: 'text', label: 'Présentation', props: { body: 'Notre école biblique offre des cours pour approfondir votre connaissance de Dieu.' } },
      { id: 's3', type: 'cards', label: 'Programmes', props: {} },
      { id: 's4', type: 'timeline', label: 'Calendrier des cours', props: {} },
      { id: 's5', type: 'faq', label: 'Questions', props: {} },
      { id: 's6', type: 'cta', label: 'Inscription', props: { title: 'Inscrivez-vous dès maintenant', cta_text: 'S\'inscrire au prochain cours' } },
    ],
  },
  {
    id: 'media', name: 'Médias', slug: 'media', icon: 'MonitorPlay',
    description: 'Hub multimédia (vidéos, audios, photos)',
    sections: [
      { id: 's1', type: 'hero', label: 'En-tête', props: { subtitle: 'Contenu inspirant', cta_text: 'Voir tout', cta_link: '/media' } },
      { id: 's2', type: 'gallery', label: 'Dernières vidéos', props: {} },
      { id: 's3', type: 'cards', label: 'Catégories', props: {} },
      { id: 's4', type: 'text', label: 'À propos', props: { body: 'Retrouvez tous nos contenus multimédias pour nourrir votre vie spirituelle.' } },
      { id: 's5', type: 'contact', label: 'Partager un contenu', props: { show_map: false } },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

let sectionCounter = 100;
function generateSectionId(): string {
  sectionCounter += 1;
  return `ns_${Date.now()}_${sectionCounter}`;
}

function cloneSections(sections: TemplateSection[]): TemplateSection[] {
  return sections.map((s) => ({ ...s, id: generateSectionId(), props: { ...s.props } }));
}

/* ═══════════════════════════════════════════════════════════════════
   Section Props Editor
   ═══════════════════════════════════════════════════════════════════ */

function SectionPropsEditor({
  section,
  onUpdate,
}: {
  section: TemplateSection;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const updateProp = (key: string, value: unknown) => {
    onUpdate({ ...section.props, [key]: value });
  };

  const FieldInput = ({ label, propKey, placeholder }: { label: string; propKey: string; placeholder?: string }) => (
    <div className="py-2">
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        type="text"
        value={(section.props[propKey] as string) || ''}
        onChange={(e) => updateProp(propKey, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50"
      />
    </div>
  );

  const FieldTextarea = ({ label, propKey, placeholder }: { label: string; propKey: string; placeholder?: string }) => (
    <div className="py-2">
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <textarea
        value={(section.props[propKey] as string) || ''}
        onChange={(e) => updateProp(propKey, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 resize-none"
      />
    </div>
  );

  const FieldToggle = ({ label, propKey }: { label: string; propKey: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white/70">{label}</span>
      <button
        type="button"
        onClick={() => updateProp(propKey, !section.props[propKey])}
        className="text-amber-400"
      >
        {section.props[propKey] ? '✓ Activé' : '✗ Désactivé'}
      </button>
    </div>
  );

  const FieldSlider = ({ label, propKey, min, max, def }: { label: string; propKey: string; min: number; max: number; def: number }) => {
    const val = Number(section.props[propKey] ?? def);
    return (
      <div className="py-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm text-white/70">{label}</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono text-amber-400">{val}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onChange={(e) => updateProp(propKey, Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-500"
        />
      </div>
    );
  };

  switch (section.type) {
    case 'hero':
      return (
        <>
          <FieldInput label="Sous-titre" propKey="subtitle" placeholder="Sous-titre de la bannière" />
          <FieldInput label="Texte du bouton CTA" propKey="cta_text" placeholder="Ex: En savoir plus" />
          <FieldInput label="Lien du bouton" propKey="cta_link" placeholder="/page" />
        </>
      );
    case 'text':
      return (
        <FieldTextarea label="Contenu" propKey="body" placeholder="Rédigez votre contenu ici..." />
      );
    case 'cards':
      return (
        <FieldSlider label="Colonnes" propKey="columns" min={1} max={4} def={3} />
      );
    case 'gallery':
      return (
        <FieldSlider label="Colonnes" propKey="columns" min={2} max={4} def={3} />
      );
    case 'quote':
      return (
        <>
          <FieldTextarea label="Citation" propKey="quote_text" placeholder="Entrez la citation..." />
          <FieldInput label="Auteur" propKey="author" placeholder="Nom de l'auteur" />
        </>
      );
    case 'team':
      return (
        <FieldSlider label="Colonnes" propKey="columns" min={2} max={4} def={3} />
      );
    case 'testimonials':
      return (
        <FieldSlider label="Intervalle (secondes)" propKey="interval" min={3} max={15} def={5} />
      );
    case 'stats':
      return (
        <FieldSlider label="Colonnes" propKey="columns" min={2} max={4} def={4} />
      );
    case 'timeline':
      return (
        <FieldToggle label="Afficher les dates" propKey="show_dates" />
      );
    case 'faq':
      return (
        <FieldToggle label="Premier élément ouvert" propKey="first_open" />
      );
    case 'cta':
      return (
        <>
          <FieldInput label="Titre" propKey="title" placeholder="Titre de l'appel à action" />
          <FieldTextarea label="Description" propKey="body" placeholder="Décrivez l'action souhaitée..." />
          <FieldInput label="Texte du bouton" propKey="cta_text" placeholder="Bouton CTA" />
        </>
      );
    case 'contact':
      return (
        <FieldToggle label="Afficher la carte" propKey="show_map" />
      );
    case 'verses':
      return (
        <FieldSlider label="Intervalle (secondes)" propKey="interval" min={3} max={15} def={6} />
      );
    default:
      return (
        <p className="py-2 text-sm text-white/40">Aucune propriété disponible pour ce type de section.</p>
      );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Gallery View
   ═══════════════════════════════════════════════════════════════════ */

function GalleryView({ onSelect, isFullAdmin }: { onSelect: (template: PageTemplate) => void; isFullAdmin: boolean }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Modèles de page</h2>
        <p className="mt-1 text-sm text-white/50">Choisissez un modèle pour commencer, ou créez une page vierge.</p>
      </div>

      {/* Blank page option */}
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: `blank_${Date.now()}`,
            name: 'Page vierge',
            slug: `page-vierge-${Date.now()}`,
            icon: 'FileText',
            description: 'Commencer avec une page vide',
            sections: [],
          })
        }
        className="mb-6 flex w-full items-center gap-4 rounded-lg border border-dashed border-white/20 p-4 text-left transition-colors hover:border-amber-500/50 hover:bg-white/5"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
          <Plus className="h-6 w-6 text-white/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Page vierge</p>
          <p className="text-xs text-white/50">Commencer avec une page vide</p>
        </div>
      </button>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon] ?? FileText;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect({ ...template, sections: cloneSections(template.sections) })}
              className="group rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-white/[0.07]"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 transition-colors group-hover:bg-amber-500/20">
                <Icon className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{template.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{template.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">
                  {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Utiliser →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Editor View
   ═══════════════════════════════════════════════════════════════════ */

function EditorView({
  page,
  onBack,
  isFullAdmin,
}: {
  page: PageTemplate;
  onBack: () => void;
  isFullAdmin: boolean;
}) {
  const { addToast } = useToast();
  const [currentPage, setCurrentPage] = useState<PageTemplate>(page);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeSection = currentPage.sections.find((s) => s.id === activeSectionId) ?? null;

  // ── Drag handlers ──
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex.current === null || dragIndex === dragOverIndex.current) {
      setDragIndex(null);
      dragOverIndex.current = null;
      return;
    }
    const sections = [...currentPage.sections];
    const [moved] = sections.splice(dragIndex, 1);
    sections.splice(dragOverIndex.current, 0, moved);
    setCurrentPage((p) => ({ ...p, sections }));
    setDragIndex(null);
    dragOverIndex.current = null;
  };

  // ── Section actions ──
  const addSection = (type: string) => {
    const typeMeta = SECTION_TYPE_MAP[type];
    if (!typeMeta) return;
    const newSection: TemplateSection = {
      id: generateSectionId(),
      type,
      label: typeMeta.label,
      props: {},
    };
    setCurrentPage((p) => ({ ...p, sections: [...p.sections, newSection] }));
    setActiveSectionId(newSection.id);
    setShowAddMenu(false);
  };

  const removeSection = (id: string) => {
    setCurrentPage((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const duplicateSection = (section: TemplateSection) => {
    const clone: TemplateSection = { ...section, id: generateSectionId(), props: { ...section.props } };
    const idx = currentPage.sections.findIndex((s) => s.id === section.id);
    const sections = [...currentPage.sections];
    sections.splice(idx + 1, 0, clone);
    setCurrentPage((p) => ({ ...p, sections }));
    setActiveSectionId(clone.id);
  };

  const updateSectionProps = (sectionId: string, props: Record<string, unknown>) => {
    setCurrentPage((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === sectionId ? { ...s, props } : s)),
    }));
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: `page_builder_${currentPage.slug}`, value: JSON.stringify(currentPage), updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      addToast("Erreur lors de l'enregistrement de la page", 'error');
    } else {
      addToast('Page enregistrée avec succès', 'success');
    }
  };

  // ── Export JSON ──
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(currentPage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPage.slug || 'page'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Fichier JSON exporté', 'success');
  };

  return (
    <div className="flex h-full">
      {/* ── Left Panel ── */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-white/10 bg-black/20">
        <div className="border-b border-white/10 p-3">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux modèles
          </button>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs text-white/50">Nom de la page</label>
              <input
                type="text"
                value={currentPage.name}
                onChange={(e) => setCurrentPage((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition-colors focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Slug</label>
              <input
                type="text"
                value={currentPage.slug}
                onChange={(e) => setCurrentPage((p) => ({ ...p, slug: e.target.value }))}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-white outline-none transition-colors focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto">
          {currentPage.sections.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-white/30">Aucune section. Cliquez ci-dessous pour en ajouter.</p>
            </div>
          )}
          {currentPage.sections.map((section, idx) => {
            const typeMeta = SECTION_TYPE_MAP[section.type];
            const Icon = typeMeta?.icon ?? FileText;
            const isActive = activeSectionId === section.id;
            const isDragging = dragIndex === idx;

            return (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDrop={handleDrop}
                className={`flex items-center gap-2 border-b border-white/5 px-3 py-2 transition-colors hover:bg-white/5 ${
                  isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                } ${isDragging ? 'opacity-50' : ''}`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-white/20" />
                <Icon className="h-4 w-4 flex-shrink-0 text-white/50" />
                <button
                  type="button"
                  onClick={() => setActiveSectionId(isActive ? null : section.id)}
                  className="flex-1 truncate text-left text-sm text-white"
                >
                  {section.label}
                </button>
                <button
                  type="button"
                  onClick={() => duplicateSection(section)}
                  className="flex-shrink-0 rounded p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white"
                  title="Dupliquer"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  className="flex-shrink-0 rounded p-1 text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add section button */}
        <div className="relative border-t border-white/10 p-3" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/20 px-3 py-2 text-sm text-white/60 transition-colors hover:border-amber-500/50 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Ajouter une section
          </button>

          {showAddMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 p-1 shadow-xl">
              {SECTION_TYPES.map((st) => {
                const SIcon = st.icon;
                return (
                  <button
                    key={st.type}
                    type="button"
                    onClick={() => addSection(st.type)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <SIcon className="h-4 w-4 flex-shrink-0 text-white/50" />
                    <div>
                      <p className="text-sm text-white">{st.label}</p>
                      <p className="text-xs text-white/40">{st.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Right Panel ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-end border-b border-white/10 px-6 py-3">
          <button
            type="button"
            onClick={handleExport}
            className="mr-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Exporter JSON
          </button>
          <button
            type="button"
            disabled
            className="mr-2 rounded-md px-3 py-2 text-sm text-white/30 cursor-not-allowed"
            title="Bientôt disponible"
          >
            Prévisualiser
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-gold flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>

        <div className="flex-1 p-6">
          {!activeSection ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-white/10" />
                <p className="text-sm text-white/40">Sélectionnez une section pour la configurer</p>
                <p className="mt-1 text-xs text-white/25">{currentPage.sections.length} section{currentPage.sections.length !== 1 ? 's' : ''} dans cette page</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-xl space-y-6">
              {/* Section preview card */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                  {(() => {
                    const typeMeta = SECTION_TYPE_MAP[activeSection.type];
                    const SIcon = typeMeta?.icon ?? FileText;
                    return (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <SIcon className="h-5 w-5 text-amber-400" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-sm font-semibold text-white">{activeSection.label}</h3>
                    <p className="text-xs text-white/50">
                      {SECTION_TYPE_MAP[activeSection.type]?.description ?? activeSection.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Props editor */}
              <div className="rounded-lg border border-white/10 bg-white/5">
                <div className="border-b border-white/5 px-4 py-3">
                  <h4 className="text-sm font-medium text-white">Propriétés</h4>
                </div>
                <div className="px-4 py-2">
                  <SectionPropsEditor
                    section={activeSection}
                    onUpdate={(props) => updateSectionProps(activeSection.id, props)}
                  />
                </div>
              </div>

              {/* Section meta */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs text-white/30">
                  Type : <span className="font-mono text-white/50">{activeSection.type}</span>
                  {' · '}ID : <span className="font-mono text-white/50">{activeSection.id}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function PageBuilderTab() {
  const { isFullAdmin } = useAdminAccess();
  const [view, setView] = useState<ViewMode>('gallery');
  const [currentPage, setCurrentPage] = useState<PageTemplate | null>(null);

  const handleSelectTemplate = useCallback((template: PageTemplate) => {
    setCurrentPage(template);
    setView('editor');
  }, []);

  const handleBackToGallery = useCallback(() => {
    setView('gallery');
    setCurrentPage(null);
  }, []);

  if (view === 'gallery' || !currentPage) {
    return <GalleryView onSelect={handleSelectTemplate} isFullAdmin={isFullAdmin} />;
  }

  return <EditorView page={currentPage} onBack={handleBackToGallery} isFullAdmin={isFullAdmin} />;
}