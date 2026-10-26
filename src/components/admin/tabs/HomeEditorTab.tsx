import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Flame,
  Heart,
  Home,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Newspaper,
  Palette,
  Quote,
  RotateCcw,
  Save,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CHURCH } from '../../../lib/church';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  loadSectionColors,
  saveSectionColors,
  type SectionColorMap,
} from '../../../lib/hooks/useSectionColors';
import type { AdminTab, PageContent } from '../../../types';
import ImageUpload from '../ImageUpload';

/* ═══════════════════════════════════════════════════════════════════
   ÉDITEUR DE LA PAGE D'ACCUEIL
   L'ordre des blocs suit exactement celui de la page publique.
   - Chaque bloc affiche ses textes, ses boutons et ses photos.
   - L'œil affiche ou masque le bloc sur le site (builder_config_home).
   - Les compteurs, vidéos et formulaires restent automatiques.
   ═══════════════════════════════════════════════════════════════════ */

type FieldType = 'text' | 'textarea' | 'image' | 'image_list' | 'select' | 'range' | 'placement';

interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  section?: string;
  default?: string;
  help?: string;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
  wide?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: '×' | '%' | 'px';
  placeDefaults?: { x: number; y: number; scale: number };
}

/* Un champ « placement » stocke trois clés : {key}_x, {key}_y, {key}_scale. */
const placementKeys = (field: FieldSpec): Array<'_x' | '_y' | '_scale'> =>
  field.type === 'placement' ? ['_x', '_y', '_scale'] : [];

const PLACEMENT_AXES: Array<{
  suffix: '_x' | '_y' | '_scale';
  label: string;
  min: number;
  max: number;
  step: number;
  unit: 'px' | '×';
}> = [
  { suffix: '_x', label: 'Horizontal', min: -260, max: 260, step: 2, unit: 'px' },
  { suffix: '_y', label: 'Vertical', min: -200, max: 200, step: 2, unit: 'px' },
  { suffix: '_scale', label: 'Échelle', min: 0.5, max: 2, step: 0.05, unit: '×' },
];

const placementDefault = (field: FieldSpec, suffix: '_x' | '_y' | '_scale') => {
  const place = field.placeDefaults ?? { x: 0, y: 0, scale: 1 };
  if (suffix === '_x') return String(place.x);
  if (suffix === '_y') return String(place.y);
  return String(place.scale);
};

interface Shortcut {
  label: string;
  tab: AdminTab;
}

interface HomeSectionSpec {
  id: string;
  contentSection?: string;
  title: string;
  summary: string;
  icon: typeof Home;
  fields?: FieldSpec[];
  autoNote?: string;
  shortcuts?: Shortcut[];
  colors?: boolean;
}

const PAGE_LINKS = [
  { value: 'activities', label: 'Activités' },
  { value: 'culte', label: 'Culte & rassemblements' },
  { value: 'events', label: 'Événements' },
  { value: 'predications', label: 'Prédications' },
  { value: 'media', label: 'Médias' },
  { value: 'missions', label: 'Missions & extensions' },
  { value: 'ministeres', label: 'Ministères' },
  { value: 'about', label: 'À propos' },
  { value: 'pasteurs', label: 'Équipe pastorale' },
  { value: 'jeunesse', label: 'Jeunesse' },
  { value: 'evangelisation', label: 'Évangélisation' },
  { value: 'blog', label: 'Actualités' },
  { value: 'dons', label: 'Faire un don' },
  { value: 'contact', label: 'Contact' },
];

const HOME_SECTIONS: HomeSectionSpec[] = [
  {
    id: 'hero',
    contentSection: 'hero',
    title: 'Héro plein écran',
    summary: 'Accroche, verset, boutons et photos de fond',
    icon: Home,
    fields: [
      { key: 'title_line1', label: 'Titre — 1re ligne', type: 'text', default: 'La Conquête' },
      { key: 'title_line2', label: 'Titre — 2e ligne', type: 'text', default: 'des Âmes' },
      {
        key: 'subtitle',
        label: 'Ligne de présentation',
        type: 'text',
        default: 'Église Évangélique La Conquête — Lubumbashi, RDC',
        wide: true,
      },
      {
        key: 'bible_verse',
        label: 'Verset biblique',
        type: 'textarea',
        rows: 2,
        default: 'Psaumes 2:8 — "Demande-moi, et je te donnerai les nations pour héritage"',
        wide: true,
      },
      { key: 'cta_primary', label: 'Bouton principal — texte', type: 'text', default: 'Rejoindre le culte' },
      {
        key: 'cta_primary_link',
        label: 'Bouton principal — destination',
        type: 'select',
        options: PAGE_LINKS,
        default: 'activities',
      },
      { key: 'cta_secondary', label: 'Bouton secondaire — texte', type: 'text', default: 'Notre vision' },
      {
        key: 'cta_secondary_link',
        label: 'Bouton secondaire — destination',
        type: 'select',
        options: PAGE_LINKS,
        default: 'about',
      },
      {
        key: 'bg_image',
        label: 'Photo de fond (si le diaporama est vide)',
        type: 'image',
        default: '/church-photo-3.webp',
        wide: true,
      },
      {
        key: 'bg_images',
        label: 'Photos du diaporama',
        type: 'image_list',
        help: 'Les photos défilent toutes les 10 secondes. Laissez vide pour garder la photo de fond seule.',
        wide: true,
      },
    ],
    autoNote:
      'Le compte à rebours vers le prochain culte est automatique : il s’appuie sur les horaires officiels des services.',
  },
  {
    id: 'topbar',
    contentSection: 'topbar',
    title: 'Bande passante',
    summary: 'Texte défilant, téléphone et email',
    icon: Megaphone,
    shortcuts: [
      { label: 'Communiqués', tab: 'communiques' },
      { label: 'Direct & programmation', tab: 'live_stream' },
    ],
    fields: [
      {
        key: 'marquee_text',
        label: 'Messages de la bande défilante',
        type: 'textarea',
        rows: 3,
        help: 'Séparez plusieurs messages par « | ». Laissez vide pour afficher automatiquement les communiqués publiés et les horaires des cultes.',
        wide: true,
      },
      { key: 'phone', label: 'Téléphone affiché', type: 'text', default: CHURCH.phone.display },
      { key: 'email', label: 'Email affiché', type: 'text', default: CHURCH.email },
    ],
    autoNote:
      'Le compte à rebours et le bouton « EN DIRECT » se programment dans l’onglet Direct & programmation. Le bouton « Don » est toujours présent.',
    colors: true,
  },
  {
    id: 'agenda',
    contentSection: 'agenda',
    title: 'Événements — À ne pas manquer',
    summary: 'En-tête, affiche du marathon et photos des rendez-vous',
    icon: Calendar,
    shortcuts: [{ label: 'Événements', tab: 'events' }],
    fields: [
      { key: 'eyebrow', label: 'Label de section', type: 'text', default: 'Événements' },
      { key: 'title', label: 'Titre de section', type: 'text', default: 'À ne pas manquer' },
      {
        key: 'subtitle',
        label: 'Sous-titre de section',
        type: 'textarea',
        rows: 2,
        wide: true,
        default: "Le marathon de prière et les rendez-vous qui rythment la vie de l'église.",
      },
      { key: 'featured_kicker', label: 'Affiche — sur-titre', type: 'text', default: 'À la une' },
      { key: 'featured_badge', label: 'Affiche — date', type: 'text', default: '1er – 30 novembre 2026' },
      { key: 'featured_title', label: 'Affiche — titre', type: 'text', default: 'Marathon de prière' },
      { key: 'featured_cta', label: 'Affiche — texte du bouton', type: 'text', default: "Voir l'événement" },
      {
        key: 'featured_time',
        label: 'Affiche — horaires / lieu',
        type: 'text',
        wide: true,
        default: 'Lundi – vendredi, 16h00 – 18h45 · Dimanche, 08h00 – 10h30',
      },
      {
        key: 'featured_description',
        label: 'Affiche — description',
        type: 'textarea',
        rows: 2,
        wide: true,
        default: "« La mission de l'Église locale face au monde moderne » — Matthieu 28:19-20.",
      },
      {
        key: 'featured_image',
        label: 'Affiche — image du slide',
        type: 'image',
        default: '/marathon-priere-2026-slide.webp',
        wide: true,
      },
      {
        key: 'service_0_image',
        label: 'Dimanche — culte principal',
        type: 'image',
        section: 'services',
        default: '/church-photo-3.webp',
      },
      {
        key: 'service_3_image',
        label: 'Mercredi — enseignement et prière',
        type: 'image',
        section: 'services',
        default: '/bible.webp',
      },
      {
        key: 'service_5_image',
        label: 'Vendredi — jeûne et prière',
        type: 'image',
        section: 'services',
        default: '/church-photo-1.webp',
      },
      {
        key: 'service_6_image',
        label: 'Samedi — Génération Espoir',
        type: 'image',
        section: 'services',
        default: '/church-photo-2.webp',
      },
    ],
    autoNote:
      'Les événements datés et les cultes hebdomadaires sont ajoutés dans Événements ; les prochains passages apparaissent automatiquement dans le carrousel.',
  },
  {
    id: 'pillars',
    contentSection: 'pillars',
    title: 'Nos fondements — trois piliers',
    summary: 'Foi, Communauté, Mission',
    icon: Flame,
    fields: [
      { key: 'heading_label', label: 'Label de section', type: 'text', default: 'Nos Fondements' },
      { key: 'heading_title', label: 'Titre de section', type: 'text', default: 'Trois piliers qui nous guident' },
      { key: 'pillar_1_title', label: 'Pilier 1 — titre', type: 'text', default: 'Foi' },
      {
        key: 'pillar_1_desc',
        label: 'Pilier 1 — texte',
        type: 'textarea',
        rows: 3,
        wide: true,
        default:
          'Une foi ancrée dans la Parole de Dieu qui nous donne la force de tenir ferme dans les épreuves et de marcher avec confiance vers notre destinée.',
      },
      { key: 'pillar_2_title', label: 'Pilier 2 — titre', type: 'text', default: 'Communauté' },
      {
        key: 'pillar_2_desc',
        label: 'Pilier 2 — texte',
        type: 'textarea',
        rows: 3,
        wide: true,
        default:
          "Une famille soudée par l'amour du Christ, où chacun trouve sa place, son soutien et sa mission au service du corps.",
      },
      { key: 'pillar_3_title', label: 'Pilier 3 — titre', type: 'text', default: 'Mission' },
      {
        key: 'pillar_3_desc',
        label: 'Pilier 3 — texte',
        type: 'textarea',
        rows: 3,
        wide: true,
        default:
          "Un appel à aller au-delà des murs, à porter l'Évangile aux nations et à faire des disciples pour la gloire de Dieu.",
      },
    ],
    colors: true,
  },
  {
    id: 'unique',
    contentSection: 'pastor_word',
    title: 'Mot du pasteur',
    summary: 'Portrait, lettre pastorale et signature',
    icon: Users,
    fields: [
      { key: 'label', label: 'Label de section', type: 'text', default: 'Mot du pasteur' },
      { key: 'title', label: 'Titre', type: 'text', default: 'Conseils pastoraux' },
      {
        key: 'text_1',
        label: 'Texte principal',
        type: 'textarea',
        rows: 5,
        wide: true,
        default:
          'Cher membre de la famille La Conquête, Dieu a un plan extraordinaire pour votre vie. Ne laissez pas les circonstances définir votre destinée, mais laissez la Parole de Dieu établir vos pas.',
      },
      {
        key: 'text_2',
        label: 'Texte secondaire',
        type: 'textarea',
        rows: 3,
        wide: true,
        default:
          "Nous sommes dans une saison où Dieu appelle son Église à se lever, à prendre position et à manifester sa gloire dans chaque domaine de la société.",
      },
      {
        key: 'bible_text',
        label: 'Citation biblique',
        type: 'textarea',
        rows: 3,
        wide: true,
        default:
          "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.",
      },
      { key: 'bible_ref', label: 'Référence biblique', type: 'text', default: 'Jérémie 29:11' },
      {
        key: 'name',
        label: 'Nom du pasteur',
        type: 'text',
        default: 'Josué Romain Kazadi',
        help: 'Apparaît sous la citation, posé sur la photo.',
      },
      {
        key: 'role',
        label: 'Fonction / sous-titre du pasteur',
        type: 'text',
        default: 'Pasteur principal',
      },
      {
        key: 'text_align',
        label: 'Alignement des textes',
        type: 'select',
        default: 'center',
        options: [
          { value: 'left', label: 'Gauche' },
          { value: 'center', label: 'Centré' },
          { value: 'right', label: 'Droite' },
        ],
      },
      {
        key: 'text_raise',
        label: 'Remontée du bloc de texte',
        type: 'range',
        default: '0',
        min: 0,
        max: 180,
        step: 4,
        unit: 'px',
        help: '0 px = posé en bas · 180 px = remonté sur le portrait.',
      },
      {
        key: 'portrait_image',
        label: 'Portrait du pasteur (PNG détouré conseillé)',
        type: 'image',
        default: '/pasteur-romain-kazadi.webp',
        help: 'PNG à fond transparent : le pasteur se détache librement, sans cadre. JPG/WebP : la photo est fondue vers le bas.',
        wide: true,
      },
      {
        key: 'portrait_scale',
        label: 'Zoom / recadrage',
        type: 'range',
        default: '1.25',
        min: 1,
        max: 2,
        step: 0.05,
        unit: '×',
        help: '1,25 = portrait entier. Au-delà, l’image est agrandie et recadrée dans le bloc.',
      },
      {
        key: 'portrait_pos_x',
        label: 'Décalage horizontal',
        type: 'range',
        default: '50',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        help: '0 % = à gauche · 100 % = à droite. Ajuste le recadrage des photos non détourées.',
      },
      {
        key: 'portrait_pos_y',
        label: 'Décalage vertical',
        type: 'range',
        default: '0',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        help: '0 % = en haut · 100 % = en bas. Ajuste le recadrage des photos non détourées.',
      },
      {
        key: 'signature_image',
        label: 'Signature (image PNG)',
        type: 'image',
        default: '',
        help: 'Facultatif : sans signature, le titre du pasteur s’affiche.',
        wide: true,
      },
      { key: 'signature_scale', label: 'Zoom de la signature', type: 'text', default: '1' },
      {
        key: 'signature_pos_x',
        label: 'Position de la signature',
        type: 'select',
        default: 'center',
        options: [
          { value: 'left', label: 'Gauche' },
          { value: 'center', label: 'Centre' },
          { value: 'right', label: 'Droite' },
        ],
      },
      {
        key: 'church_line',
        label: 'Ligne de signature (sans image)',
        type: 'text',
        default: 'Église Évangélique La Conquête',
        help: 'Affichée à la place de la signature quand aucune image n’est choisie.',
      },
      { key: 'vision_label', label: 'Libellé du lien', type: 'text', default: 'Notre vision' },
      {
        key: 'pos_label',
        label: 'Position — Label « Mot du pasteur »',
        type: 'placement',
        placeDefaults: { x: 0, y: 0, scale: 1 },
        wide: true,
        help: 'Chaque bloc se déplace (horizontal, vertical) et se redimensionne indépendamment.',
      },
      { key: 'pos_title', label: 'Position — Titre', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_text1', label: 'Position — Texte principal', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_text2', label: 'Position — Texte secondaire', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_quote', label: 'Position — Verset', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_ref', label: 'Position — Référence biblique', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_name', label: 'Position — Nom du pasteur', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_role', label: 'Position — Fonction du pasteur', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
      { key: 'pos_footer', label: 'Position — Signature & lien', type: 'placement', placeDefaults: { x: 0, y: 0, scale: 1 }, wide: true },
    ],
  },
  {
    id: 'pastors',
    contentSection: 'pastors',
    title: 'Bureau pastoral',
    summary: 'En-tête de la galerie des pasteurs',
    icon: Users,
    shortcuts: [{ label: 'Équipe pastorale', tab: 'pastors' }],
    fields: [
      { key: 'label', label: 'Label de section', type: 'text', default: 'Bureau pastoral' },
      {
        key: 'title',
        label: 'Titre de section',
        type: 'text',
        default: "Une équipe au service de l'Église",
        wide: true,
      },
    ],
    autoNote: 'La liste, les rôles et les photos des pasteurs se gèrent dans Équipe pastorale.',
  },
  {
    id: 'teachings',
    title: 'Messages récents',
    summary: 'Dernières prédications YouTube',
    icon: Film,
    shortcuts: [{ label: 'Prédications', tab: 'predications' }],
    autoNote:
      'La section est automatique : les dernières vidéos de la chaîne apparaissent ici, la plus récente en premier, sans redéploiement.',
  },
  {
    id: 'nextsteps',
    title: 'Prochain pas',
    summary: 'Invitations à venir, se connecter, prier',
    icon: Compass,
    autoNote: 'Les parcours et leurs liens sont gérés par l’application ; aucun texte à saisir ici.',
  },
  {
    id: 'firstvisit',
    contentSection: 'firstvisit',
    title: 'Premier dimanche',
    summary: 'Photo et informations de visite',
    icon: Calendar,
    fields: [
      {
        key: 'image',
        label: 'Photo de la section',
        type: 'image',
        default: '/church-photo-2.webp',
        wide: true,
      },
    ],
    autoNote:
      'Les horaires, l’adresse et l’itinéraire proviennent des informations officielles de l’église.',
  },
  {
    id: 'explore',
    contentSection: 'explore',
    title: 'Explorer — nos activités',
    summary: 'En-tête et cartes vers les pages du site',
    icon: Compass,
    shortcuts: [{ label: 'Cartes Explorer', tab: 'activity_cards' }],
    fields: [
      { key: 'heading_label', label: 'Label de section', type: 'text', default: 'Explorer' },
      {
        key: 'heading_title',
        label: 'Titre de section',
        type: 'text',
        default: 'Découvrez nos activités',
      },
      {
        key: 'subtitle',
        label: 'Sous-titre',
        type: 'textarea',
        rows: 2,
        wide: true,
        default:
          "Cinq portes d'entrée dans la vie de l'église : prédications, rendez-vous, ministères, médias et actualités.",
      },
    ],
    autoNote: 'Les cinq cartes (photo, titre, destination) se gèrent dans Cartes Explorer.',
    colors: true,
  },
  {
    id: 'news',
    contentSection: 'news',
    title: 'Actualités',
    summary: 'En-tête de la vie de l’église',
    icon: Newspaper,
    shortcuts: [{ label: 'Articles', tab: 'articles' }],
    fields: [
      { key: 'eyebrow', label: 'Label de section', type: 'text', default: 'Actualités' },
      { key: 'title', label: 'Titre de section', type: 'text', default: "La vie de l'église" },
      {
        key: 'subtitle',
        label: 'Sous-titre',
        type: 'textarea',
        rows: 2,
        wide: true,
        default:
          'Enseignements, annonces et nouvelles de nos extensions — ce qui fait vivre la communauté.',
      },
    ],
    autoNote: 'Les articles affichés viennent de l’onglet Articles ; les trois plus récents sont mis en avant.',
    colors: true,
  },
  {
    id: 'quote',
    contentSection: 'quote',
    title: 'Verset',
    summary: 'Citation biblique mise en avant',
    icon: Quote,
    fields: [
      { key: 'heading_label', label: 'Label de section', type: 'text', default: 'Verset' },
      { key: 'reference', label: 'Référence', type: 'text', default: 'Éphésiens 2:10' },
      {
        key: 'text',
        label: 'Texte du verset',
        type: 'textarea',
        rows: 4,
        wide: true,
        default:
          "Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes œuvres, que Dieu a préparées d'avance, afin que nous les pratiquions.",
      },
    ],
    colors: true,
  },
  {
    id: 'testimonials',
    contentSection: 'testimonials',
    title: 'Témoignages',
    summary: 'En-tête du carrousel de témoignages',
    icon: MessageSquare,
    shortcuts: [{ label: 'Témoignages', tab: 'testimonials' }],
    fields: [
      { key: 'heading_label', label: 'Label de section', type: 'text', default: 'Témoignages' },
      {
        key: 'heading_title',
        label: 'Titre de section',
        type: 'text',
        default: 'Ce que Dieu fait parmi nous',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 2,
        wide: true,
        default:
          "Des membres de la communauté racontent ce que Dieu a accompli dans leur vie, pour la gloire de son nom.",
      },
    ],
    autoNote: 'Les témoignages publiés et actifs apparaissent automatiquement dans le carrousel.',
    colors: true,
  },
  {
    id: 'prayer',
    title: 'Prière & témoignage',
    summary: 'Formulaire envoyé au secrétariat',
    icon: Heart,
    shortcuts: [{ label: 'Messages reçus', tab: 'messages' }],
    autoNote:
      'Le formulaire est automatique. Les demandes de prière et les témoignages reçus arrivent dans Messages reçus.',
  },
  {
    id: 'cta',
    contentSection: 'cta_map',
    title: 'Rejoindre la famille & carte',
    summary: 'Dernier appel et accès au lieu de culte',
    icon: MapPin,
    fields: [
      { key: 'title', label: 'Titre de section', type: 'text', default: 'Rejoignez notre famille' },
      {
        key: 'text',
        label: 'Texte de section',
        type: 'textarea',
        rows: 3,
        wide: true,
        default:
          'Vous êtes appelé à faire partie de cette aventure extraordinaire. Venez rencontrer une communauté qui prie, qui aime et qui sert ensemble.',
      },
    ],
    autoNote: 'L’adresse, le plan et l’itinéraire utilisent les coordonnées officielles de l’église.',
  },
];

interface BuilderEntry {
  id: string;
  visible?: boolean;
  config?: Record<string, unknown>;
  order?: number;
}

const fieldKey = (spec: HomeSectionSpec, field: FieldSpec) =>
  `${field.section ?? spec.contentSection}.${field.key}`;

const RANGE_KEYWORDS: Record<string, number> = { left: 0, center: 50, right: 100, top: 0, bottom: 100 };

const rangeNumber = (field: FieldSpec, value: string) => {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const fallback = Number.parseFloat(field.default ?? '0');
  const numeric = Number.parseFloat(value);
  const base = Number.isFinite(numeric) ? numeric : RANGE_KEYWORDS[value.trim().toLowerCase()] ?? fallback;
  return Math.min(max, Math.max(min, Number.isFinite(base) ? base : min));
};

function colorEntry(map: SectionColorMap, id: string) {
  return map[id] ?? { text: '', bg: '' };
}

/* ─── Liste de photos (diaporama) ─────────────────────────────── */

function ImageListField({
  value,
  onChange,
  folder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  folder: string;
  disabled?: boolean;
}) {
  const urls = value.split(',').map((url) => url.trim()).filter(Boolean);
  const [adding, setAdding] = useState(false);

  const replace = (index: number, url: string) => {
    const next = [...urls];
    if (!url) next.splice(index, 1);
    else next[index] = url;
    onChange(next.join(','));
  };

  const remove = (index: number) => {
    const next = [...urls];
    next.splice(index, 1);
    onChange(next.join(','));
  };

  return (
    <div className="space-y-3">
      {urls.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-4 text-xs text-muted/70">
          Aucune photo de diaporama. La photo de fond seule sera affichée.
        </p>
      )}

      {urls.map((url, index) => (
        <div key={`${url}-${index}`} className="rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex items-start gap-3">
            <img
              src={url}
              alt={`Photo ${index + 1}`}
              className="h-20 w-32 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Photo {index + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="flex items-center gap-1 text-[10px] text-muted transition-colors hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                    Retirer
                  </button>
                )}
              </div>
              <ImageUpload
                value={url}
                onChange={(next) => replace(index, next)}
                label=""
                folder={folder}
                compact
                allowReplace
                hideDropzone
              />
            </div>
          </div>
        </div>
      ))}

      {!disabled &&
        (adding ? (
          <div className="rounded-xl border border-line bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Nouvelle photo
              </span>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[10px] text-muted hover:text-cream"
              >
                Fermer
              </button>
            </div>
            <ImageUpload
              value=""
              onChange={(url) => {
                if (!url) return;
                onChange([...urls, url].join(','));
                setAdding(false);
              }}
              label=""
              folder={folder}
              compact
              allowReplace
              hideDropzone
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-xs text-muted transition-colors hover:border-amber-500/40 hover:text-amber-400"
          >
            <ImagePlus className="h-4 w-4" />
            Ajouter une photo au diaporama
          </button>
        ))}
    </div>
  );
}

/* ─── Composant principal ─────────────────────────────────────── */

export function HomeEditorTab({ onOpenTab }: { onOpenTab?: (tab: AdminTab) => void }) {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [rows, setRows] = useState<PageContent[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [builderEntries, setBuilderEntries] = useState<BuilderEntry[]>([]);
  const [colors, setColors] = useState<SectionColorMap>({});
  const [initialColors, setInitialColors] = useState<SectionColorMap>({});
  const [activeId, setActiveId] = useState<string | null>(HOME_SECTIONS[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savingVisibility, setSavingVisibility] = useState<string | null>(null);

  const rowMap = useMemo(() => {
    const map = new Map<string, PageContent>();
    for (const row of rows) map.set(`${row.section_key}.${row.field_key}`, row);
    return map;
  }, [rows]);

  const activeSpec = HOME_SECTIONS.find((spec) => spec.id === activeId) ?? null;

  /* ── Chargement ── */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [contentsRes, builderRes, colorMap] = await Promise.all([
          supabase.from('page_contents').select('*').eq('page', 'home').order('section_key').order('sort_order'),
          supabase.from('site_settings').select('value').eq('key', 'builder_config_home').maybeSingle(),
          loadSectionColors('home'),
        ]);
        if (cancelled) return;

        if (contentsRes.error) {
          addToast(`Contenus indisponibles : ${contentsRes.error.message}`, 'error');
        }

        const loadedRows = (contentsRes.data ?? []) as PageContent[];
        const rowByKey = new Map<string, PageContent>();
        const nextValues: Record<string, string> = {};

        for (const spec of HOME_SECTIONS) {
          for (const field of spec.fields ?? []) {
            if (field.type === 'placement') {
              for (const axis of placementKeys(field)) {
                nextValues[`${fieldKey(spec, field)}${axis}`] = placementDefault(field, axis);
              }
            } else {
              nextValues[fieldKey(spec, field)] = field.default ?? '';
            }
          }
        }
        for (const row of loadedRows) {
          rowByKey.set(`${row.section_key}.${row.field_key}`, row);
        }
        for (const [key, row] of rowByKey) {
          if (typeof nextValues[key] === 'string' && row.value && row.value.trim()) {
            nextValues[key] = row.value;
          }
        }

        let entries: BuilderEntry[] = [];
        const rawConfig = builderRes?.data?.value;
        if (rawConfig) {
          try {
            const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
            if (Array.isArray(parsed)) {
              entries = parsed.filter(
                (entry): entry is BuilderEntry =>
                  Boolean(entry) && typeof entry === 'object' && typeof (entry as BuilderEntry).id === 'string',
              );
            }
          } catch {
            /* configuration illisible : tous les blocs restent visibles */
          }
        }

        const entryById = new Map(entries.map((entry) => [entry.id, entry]));
        const nextVisibility: Record<string, boolean> = {};
        for (const spec of HOME_SECTIONS) {
          nextVisibility[spec.id] = entryById.get(spec.id)?.visible !== false;
        }

        setRows(loadedRows);
        setValues(nextValues);
        setInitial(nextValues);
        setBuilderEntries(entries);
        setVisibility(nextVisibility);
        setColors(colorMap);
        setInitialColors(colorMap);
      } catch (err) {
        if (!cancelled) {
          addToast(err instanceof Error ? err.message : 'Chargement impossible.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Détection des modifications ── */
  const isDirty = useCallback(
    (spec: HomeSectionSpec) => {
      for (const field of spec.fields ?? []) {
        for (const axis of placementKeys(field)) {
          const key = `${fieldKey(spec, field)}${axis}`;
          if ((values[key] ?? '') !== (initial[key] ?? '')) return true;
        }
        if (field.type !== 'placement') {
          const key = fieldKey(spec, field);
          if ((values[key] ?? '') !== (initial[key] ?? '')) return true;
        }
      }
      if (spec.colors) {
        const now = colorEntry(colors, spec.id);
        const was = colorEntry(initialColors, spec.id);
        if ((now.text ?? '') !== (was.text ?? '') || (now.bg ?? '') !== (was.bg ?? '')) return true;
      }
      return false;
    },
    [values, initial, colors, initialColors],
  );

  const dirty = activeSpec ? isDirty(activeSpec) : false;

  const updateValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateColor = useCallback((sectionId: string, kind: 'text' | 'bg', value: string) => {
    setColors((prev) => ({
      ...prev,
      [sectionId]: { ...colorEntry(prev, sectionId), [kind]: value },
    }));
  }, []);

  /* ── Afficher / masquer un bloc ── */
  const toggleVisibility = useCallback(
    async (spec: HomeSectionSpec) => {
      if (!isFullAdmin) return;
      const next = { ...visibility, [spec.id]: !visibility[spec.id] };
      const previous = visibility;
      setVisibility(next);
      setSavingVisibility(spec.id);

      const known = new Set(HOME_SECTIONS.map((section) => section.id));
      const merged: BuilderEntry[] = [
        ...HOME_SECTIONS.map((section, index) => {
          const entry = builderEntries.find((candidate) => candidate.id === section.id);
          return {
            ...(entry ?? {}),
            id: section.id,
            visible: next[section.id],
            config: entry?.config ?? {},
            order: index,
          };
        }),
        ...builderEntries.filter((entry) => !known.has(entry.id)),
      ];

      const { error } = await supabase.from('site_settings').upsert(
        {
          key: 'builder_config_home',
          value: JSON.stringify(merged),
          type: 'json',
          category: 'general',
          label: "Constructeur — page d'accueil",
          sort_order: 500,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );

      if (error) {
        setVisibility(previous);
        addToast(`Affichage non modifié : ${error.message}`, 'error');
      } else {
        setBuilderEntries(merged);
        addToast(
          next[spec.id] ? `« ${spec.title} » est affichée sur le site` : `« ${spec.title} » est masquée du site`,
          'success',
        );
      }
      setSavingVisibility(null);
    },
    [visibility, builderEntries, isFullAdmin, addToast],
  );

  /* ── Enregistrer le bloc ── */
  const saveSection = useCallback(
    async (spec: HomeSectionSpec) => {
      if (!isFullAdmin || savingSection) return;
      setSavingSection(spec.id);
      const errors: string[] = [];
      const savedKeys = new Set<string>();
      const map = new Map(rowMap);
      const now = new Date().toISOString();

      const maxSort = new Map<string, number>();
      for (const row of map.values()) {
        const current = maxSort.get(row.section_key) ?? 0;
        maxSort.set(row.section_key, Math.max(current, row.sort_order ?? 0));
      }

      for (const field of spec.fields ?? []) {
        const sectionKey = field.section ?? spec.contentSection;
        if (!sectionKey) continue;
        const entries = placementKeys(field).length
          ? placementKeys(field).map((axis) => ({
              key: `${sectionKey}.${field.key}${axis}`,
              label: `${field.label} · ${
                axis === '_x' ? 'horizontal' : axis === '_y' ? 'vertical' : 'échelle'
              }`,
            }))
          : [{ key: `${sectionKey}.${field.key}`, label: field.label }];

        for (const entry of entries) {
          const key = entry.key;
          const draft = values[key] ?? '';
          if (draft === (initial[key] ?? '')) continue;

          const row = map.get(key);
          if (row) {
            const { error } = await supabase
              .from('page_contents')
              .update({ value: draft, updated_at: now })
              .eq('id', row.id);
            if (error) {
              errors.push(`${entry.label} : ${error.message}`);
            } else {
              map.set(key, { ...row, value: draft, updated_at: now });
              savedKeys.add(key);
            }
          } else if (draft.trim()) {
            const sortOrder = (maxSort.get(sectionKey) ?? 0) + 1;
            maxSort.set(sectionKey, sortOrder);
            const payload = {
              page: 'home',
              section_key: sectionKey,
              field_key: key.slice(sectionKey.length + 1),
              label: entry.label,
              value: draft,
              type: field.type === 'image' || field.type === 'image_list' ? 'image_url' : 'text',
              sort_order: sortOrder,
            };
            const { data, error } = await supabase
              .from('page_contents')
              .insert(payload)
              .select()
              .single();
            if (error) {
              errors.push(`${entry.label} : ${error.message}`);
            } else {
              if (data) map.set(key, data as PageContent);
              savedKeys.add(key);
            }
          }
        }
      }

      if (savedKeys.size > 0) {
        setRows(Array.from(map.values()));
        setInitial((prev) => {
          const next = { ...prev };
          for (const key of savedKeys) next[key] = values[key] ?? '';
          return next;
        });
      }

      if (spec.colors) {
        const nowColor = colorEntry(colors, spec.id);
        const wasColor = colorEntry(initialColors, spec.id);
        if ((nowColor.text ?? '') !== (wasColor.text ?? '') || (nowColor.bg ?? '') !== (wasColor.bg ?? '')) {
          const nextMap: SectionColorMap = { ...colors };
          if (!nowColor.text && !nowColor.bg) delete nextMap[spec.id];
          try {
            await saveSectionColors('home', nextMap);
            setColors(nextMap);
            setInitialColors((prev) => {
              const next = { ...prev };
              if (nextMap[spec.id]) next[spec.id] = nextMap[spec.id];
              else delete next[spec.id];
              return next;
            });
          } catch (err) {
            errors.push(err instanceof Error ? err.message : 'Couleurs non enregistrées.');
          }
        }
      }

      if (errors.length === 0) {
        addToast(`« ${spec.title} » enregistrée`, 'success');
      } else {
        addToast(errors[0], 'error');
        console.error('HomeEditorTab save errors:', errors);
      }
      setSavingSection(null);
    },
    [isFullAdmin, savingSection, rowMap, values, initial, colors, initialColors, addToast],
  );

  const cancelChanges = useCallback(
    (spec: HomeSectionSpec) => {
      setValues((prev) => {
        const next = { ...prev };
        for (const field of spec.fields ?? []) {
          for (const axis of placementKeys(field)) {
            const key = `${fieldKey(spec, field)}${axis}`;
            next[key] = initial[key] ?? '';
          }
          if (field.type !== 'placement') {
            const key = fieldKey(spec, field);
            next[key] = initial[key] ?? '';
          }
        }
        return next;
      });
      if (spec.colors) {
        setColors((prev) => {
          const next = { ...prev };
          const was = initialColors[spec.id];
          if (was) next[spec.id] = was;
          else delete next[spec.id];
          return next;
        });
      }
    },
    [initial, initialColors],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  const renderField = (field: FieldSpec) => {
    if (!activeSpec) return null;
    const key = fieldKey(activeSpec, field);
    const value = values[key] ?? '';
    const changed = field.type === 'placement'
      ? placementKeys(field).some(
          (axis) => (values[`${key}${axis}`] ?? '') !== (initial[`${key}${axis}`] ?? ''),
        )
      : value !== (initial[key] ?? '');
    const folder = `home/${field.section ?? activeSpec.contentSection ?? 'section'}`;

    return (
      <div key={key} className={field.wide ? 'md:col-span-2' : ''}>
        <div className="mb-1.5 flex items-center gap-2">
          <label className="text-xs font-medium text-cream/80">{field.label}</label>
          {changed && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="Modifié" />}
        </div>

        {field.type === 'textarea' && (
          <textarea
            value={value}
            onChange={(event) => updateValue(key, event.target.value)}
            rows={field.rows ?? 3}
            disabled={!isFullAdmin}
            className="input-surface w-full resize-y px-3 py-2.5 text-sm disabled:opacity-60"
            placeholder={field.default}
          />
        )}

        {field.type === 'text' && (
          <input
            type="text"
            value={value}
            onChange={(event) => updateValue(key, event.target.value)}
            disabled={!isFullAdmin}
            className="input-surface w-full px-3 py-2.5 text-sm disabled:opacity-60"
            placeholder={field.default}
          />
        )}

        {field.type === 'select' && (
          <select
            value={value}
            onChange={(event) => updateValue(key, event.target.value)}
            disabled={!isFullAdmin}
            className="input-surface w-full px-3 py-2.5 text-sm disabled:opacity-60"
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {field.type === 'range' && (() => {
          const numeric = rangeNumber(field, value);
          const shown = field.unit === '%' || field.unit === 'px' ? String(Math.round(numeric)) : numeric.toFixed(2);
          return (
            <div className="flex items-center gap-3 py-1">
              <input
                type="range"
                min={field.min ?? 0}
                max={field.max ?? 100}
                step={field.step ?? 1}
                value={numeric}
                onChange={(event) => updateValue(key, event.target.value)}
                disabled={!isFullAdmin}
                className="h-1.5 flex-1 cursor-pointer accent-evangile-600 disabled:opacity-60"
              />
              <span className="w-14 text-right text-xs font-semibold tabular-nums text-cream/80">
                {shown}
                <span className="ml-0.5 text-muted/70">{field.unit}</span>
              </span>
            </div>
          );
        })()}

        {field.type === 'placement' && (
          <div className="rounded-lg border border-line/70 bg-bg/40 px-3 py-1.5">
            {placementKeys(field).map((axis) => {
              const axisSpec = PLACEMENT_AXES.find((item) => item.suffix === axis) ?? PLACEMENT_AXES[0];
              const subKey = `${key}${axis}`;
              const raw = Number.parseFloat(values[subKey] ?? '');
              const fallback = Number.parseFloat(placementDefault(field, axis));
              const numeric = Math.min(
                axisSpec.max,
                Math.max(axisSpec.min, Number.isFinite(raw) ? raw : fallback),
              );
              return (
                <div key={subKey} className="flex items-center gap-2 py-1">
                  <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted/70">
                    {axisSpec.label}
                  </span>
                  <input
                    type="range"
                    min={axisSpec.min}
                    max={axisSpec.max}
                    step={axisSpec.step}
                    value={numeric}
                    onChange={(event) => updateValue(subKey, event.target.value)}
                    disabled={!isFullAdmin}
                    className="h-1.5 flex-1 cursor-pointer accent-evangile-600 disabled:opacity-60"
                  />
                  <span className="w-14 text-right text-xs font-semibold tabular-nums text-cream/80">
                    {axis === '_scale' ? numeric.toFixed(2) : String(Math.round(numeric))}
                    <span className="ml-0.5 text-muted/70">{axisSpec.unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {field.type === 'image' && (
          <ImageUpload
            value={value}
            onChange={(url) => updateValue(key, url)}
            label=""
            folder={folder}
            allowReplace
            previewClassName="h-52"
          />
        )}

        {field.type === 'image_list' && (
          <ImageListField
            value={value}
            onChange={(next) => updateValue(key, next)}
            folder={folder}
            disabled={!isFullAdmin}
          />
        )}

        {field.help && <p className="mt-1.5 text-[11px] leading-relaxed text-muted/60">{field.help}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col overflow-hidden border border-line bg-bg-card md:h-[calc(100vh-13rem)] md:min-h-[640px] md:flex-row">
      {/* ─── Sommaire — ordre de la page publique ─── */}
      <aside
        className={`w-full shrink-0 flex-col border-b border-line bg-bg/40 md:flex md:w-80 md:border-b-0 md:border-r ${
          mobileOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="border-b border-line px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/70">Page d’accueil</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted/60">
            Les blocs sont classés dans l’ordre où ils apparaissent sur le site.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {HOME_SECTIONS.map((spec, index) => {
            const Icon = spec.icon;
            const isActive = spec.id === activeId;
            const visible = visibility[spec.id] !== false;
            const modified = isDirty(spec);

            return (
              <div
                key={spec.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveId(spec.id);
                  setMobileOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveId(spec.id);
                    setMobileOpen(true);
                  }
                }}
                className={`group flex w-full cursor-pointer items-start gap-3 border-b border-line/50 px-4 py-3 text-left transition-colors hover:bg-cream/5 ${
                  isActive ? 'border-l-2 border-l-amber-500 bg-amber-500/10' : 'border-l-2 border-l-transparent'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? 'bg-amber-500/15 text-amber-400' : 'bg-cream/5 text-muted/70'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted/40">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p
                      className={`truncate text-[13px] font-medium ${
                        isActive ? 'text-amber-400' : visible ? 'text-cream/85' : 'text-muted/50'
                      }`}
                    >
                      {spec.title}
                    </p>
                    {modified && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                  </div>
                  <p className="truncate text-[10px] text-muted/50">{spec.summary}</p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleVisibility(spec);
                  }}
                  disabled={!isFullAdmin || savingVisibility === spec.id}
                  title={visible ? 'Masquer ce bloc sur le site' : 'Afficher ce bloc sur le site'}
                  aria-label={visible ? 'Masquer ce bloc' : 'Afficher ce bloc'}
                  aria-pressed={visible}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                    visible
                      ? 'border-line text-muted/70 hover:border-amber-500/40 hover:text-amber-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  {savingVisibility === spec.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line px-4 py-3">
          <p className="text-[10px] leading-relaxed text-muted/50">
            L’œil ouvre ou ferme le bloc. Les modifications de textes se valident avec
            « Enregistrer le bloc ».
          </p>
        </div>
      </aside>

      {/* ─── Éditeur du bloc ─── */}
      {activeSpec ? (
        <main className={`min-w-0 flex-1 flex-col ${mobileOpen ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mb-2 flex items-center gap-1 text-[11px] text-muted hover:text-cream md:hidden"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Tous les blocs
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted/40">
                  {String(HOME_SECTIONS.findIndex((spec) => spec.id === activeSpec.id) + 1).padStart(2, '0')}
                </span>
                <h2 className="font-hero text-xl uppercase leading-none tracking-[0.04em] text-cream">
                  {activeSpec.title}
                </h2>
              </div>
              <p className="mt-1.5 text-xs text-muted/60">{activeSpec.summary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleVisibility(activeSpec)}
                disabled={!isFullAdmin || savingVisibility === activeSpec.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                  visibility[activeSpec.id] !== false
                    ? 'border-line text-cream/80 hover:border-amber-500/40 hover:text-amber-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {savingVisibility === activeSpec.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : visibility[activeSpec.id] !== false ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {visibility[activeSpec.id] !== false ? 'Affiché' : 'Masqué'}
              </button>

              <a
                href="#home"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted transition-colors hover:border-amber-500/40 hover:text-amber-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir sur le site
              </a>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {activeSpec.autoNote && (
              <div className="mb-5 flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <p className="text-xs leading-relaxed text-sky-200/80">{activeSpec.autoNote}</p>
              </div>
            )}

            {activeSpec.shortcuts && activeSpec.shortcuts.length > 0 && onOpenTab && (
              <div className="mb-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/60">
                  Gérer le contenu lié
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeSpec.shortcuts.map((shortcut) => (
                    <button
                      key={shortcut.tab}
                      type="button"
                      onClick={() => onOpenTab(shortcut.tab)}
                      className="flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-xs text-cream/75 transition-colors hover:border-amber-500/40 hover:text-amber-400"
                    >
                      {shortcut.label}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSpec.fields && activeSpec.fields.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">{activeSpec.fields.map(renderField)}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
                <p className="text-sm text-muted/70">Ce bloc n’a pas de texte à saisir.</p>
                <p className="mt-1 text-xs text-muted/40">Il se nourrit automatiquement des contenus du site.</p>
              </div>
            )}

            {activeSpec.colors && (
              <div className="mt-8 border-t border-line pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted/60" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70">
                    Couleurs du bloc
                  </p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {(['text', 'bg'] as const).map((kind) => {
                    const entry = colorEntry(colors, activeSpec.id);
                    const value = entry[kind] ?? '';
                    return (
                      <div key={kind}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <label className="text-xs font-medium text-cream/80">
                            {kind === 'text' ? 'Couleur du texte' : 'Couleur de fond'}
                          </label>
                          {value !== (colorEntry(initialColors, activeSpec.id)[kind] ?? '') && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={value || (kind === 'text' ? '#f5f1e8' : '#0b1a33')}
                            onChange={(event) => updateColor(activeSpec.id, kind, event.target.value)}
                            disabled={!isFullAdmin}
                            className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent p-1 disabled:opacity-40"
                            aria-label={kind === 'text' ? 'Couleur du texte' : 'Couleur de fond'}
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(event) => updateColor(activeSpec.id, kind, event.target.value)}
                            disabled={!isFullAdmin}
                            placeholder="Automatique"
                            className="input-surface w-full px-3 py-2.5 text-sm disabled:opacity-60"
                          />
                          {value && isFullAdmin && (
                            <button
                              type="button"
                              onClick={() => updateColor(activeSpec.id, kind, '')}
                              className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-[10px] text-muted hover:text-cream"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted/50">
                  « Automatique » conserve les couleurs du thème (mode clair et sombre).
                </p>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg-elevated/95 px-4 py-3 backdrop-blur sm:px-6">
            <p className="text-[11px] text-muted/60">
              {dirty ? 'Modifications non enregistrées.' : 'Tout est enregistré.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cancelChanges(activeSpec)}
                disabled={!dirty || !isFullAdmin}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted transition-colors hover:text-cream disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveSection(activeSpec)}
                disabled={!dirty || !isFullAdmin || savingSection === activeSpec.id}
                className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingSection === activeSpec.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer le bloc
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="hidden flex-1 items-center justify-center md:flex">
          <p className="text-sm text-muted/50">Choisissez un bloc à gauche.</p>
        </main>
      )}
    </div>
  );
}
