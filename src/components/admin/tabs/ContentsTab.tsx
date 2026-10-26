import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import ImageUpload from '../ImageUpload';
import {
  Save, Plus, Trash2, X, ChevronRight,
  Loader2, Home, Info, Flame, Compass, Quote, Users,
  MessageSquare, Calendar, Radio, Video, Building2,
  Megaphone, Heart, MapPin, BookOpen, Eye, Newspaper, Mic,
} from 'lucide-react';
import { CHURCH } from '../../../lib/church';
type IconComponent = React.ComponentType<any>;

// ─── Types ──────────────────────────────────────────────────────────

type ContentType = 'text' | 'html' | 'image_url' | 'url';

interface PageContent {
  id: string;
  page: string;
  section_key: string;
  field_key: string;
  label: string;
  value: string;
  type: ContentType;
  sort_order: number;
  updated_at: string;
}

// ─── Page definitions with icons & section labels ──────────────────

interface SectionDef {
  key: string;
  label: string;
  icon: IconComponent;
  description: string;
}

interface PageDef {
  key: string;
  label: string;
  icon: IconComponent;
  description: string;
  sections: SectionDef[];
}

export const PAGES: PageDef[] = [
  /* ══════════ ACCUEIL ══════════ */
  {
    key: 'home', label: 'Page d\'accueil', icon: Home,
    description: 'Hero, Orateurs, Piliers, À propos, Citation, CTA',
    sections: [
      { key: 'topbar', label: 'Bande passante', icon: Megaphone, description: 'Téléphone, email, texte défilant' },
      { key: 'hero', label: 'Héro plein écran', icon: Home, description: 'Image de fond (photo modifiable), diaporama, titre, verset biblique' },
      { key: 'agenda', label: 'Événements — À ne pas manquer', icon: Calendar, description: 'Affiche du marathon (photo/PDF converti en image), dates, textes et en-tête du carrousel' },
      { key: 'services', label: 'Photos des cultes hebdomadaires', icon: Calendar, description: 'Photo de fond de chaque culte dans le carrousel (dimanche, mercredi, vendredi, samedi)' },
      { key: 'pillars', label: 'Trois Piliers', icon: Flame, description: 'Foi, Communauté, Mission' },
      { key: 'pastor_word', label: 'Mot du pasteur', icon: Users, description: 'Portrait (photo modifiable), signature (image modifiable), textes et citation' },
      { key: 'firstvisit', label: 'Premier dimanche', icon: Calendar, description: 'Photo (modifiable), horaires réels et coordonnées' },
      { key: 'news', label: 'Dernières nouvelles', icon: Newspaper, description: 'Titre et sous-titre de la section actualités' },
      { key: 'cta_map', label: 'CTA & Carte', icon: MapPin, description: 'Texte du CTA en superposition sur la carte' },
      { key: 'explore', label: 'Explorer — Découvrez nos activités', icon: Eye, description: 'Titre, sous-titre et description de la section Explorer. Pour modifier les cartes (miniatures, liens), utilisez l\'onglet « Cartes Explorer »' },
      { key: 'about', label: 'Qui sommes-nous (ancien)', icon: Info, description: 'Textes, photo (miniature modifiable) et citation' },
      { key: 'quote', label: 'Citation biblique', icon: Quote, description: 'Texte et référence' },
      { key: 'testimonials', label: 'Témoignages', icon: MessageSquare, description: 'En-tête de la section témoignages' },
    ],
  },
  /* ══════════ À PROPOS ══════════ */
  {
    key: 'about', label: 'À propos', icon: Info,
    description: 'Notre identité, Vision, Mission, Valeurs',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'about', label: 'Qui sommes-nous', icon: Info, description: 'Texte principal de présentation' },
      { key: 'vision', label: 'Vision', icon: Eye, description: 'Texte de la vision' },
      { key: 'mission', label: 'Mission', icon: Flame, description: 'Texte de la mission' },
      { key: 'values', label: 'Nos Valeurs', icon: Heart, description: 'Titre et sous-titre' },
      { key: 'giving', label: 'Dons & Soutien', icon: Heart, description: 'Section dons sur la page À propos' },
      { key: 'cta', label: 'CTA — Nous rejoindre', icon: MapPin, description: 'Photo de fond (modifiable), titre et texte' },
      { key: 'vision_heading', label: 'En-tête Vision', icon: Eye, description: 'Label et titre de la section Vision' },
      { key: 'mission_heading', label: 'En-tête Mission', icon: Flame, description: 'Label et titre de la section Mission' },
      { key: 'team', label: 'Équipe Pastorale', icon: Users, description: 'Label, titre et description' },
    ],
  },
  /* ══════════ VIE DE L'ÉGLISE ══════════ */
  {
    key: 'culte', label: 'Culte & Rassemblements', icon: Calendar,
    description: 'Horaires, Infos pratiques',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'schedule', label: 'Horaires de culte', icon: Calendar, description: 'Titre et description' },
      { key: 'practicals', label: 'Infos pratiques', icon: Info, description: 'Parking, transport, enfants' },
    ],
  },
  {
    key: 'events', label: 'Événements', icon: Calendar,
    description: 'Événements à venir et passés',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'marathon', label: 'Marathon de prière — Affiche', icon: Calendar, description: 'Affiche officielle (photo modifiable), thème, horaires, référence, intitulés et boutons' },
      { key: 'speakers', label: 'Orateurs du Marathon', icon: Mic, description: 'Jusqu\'à 4 orateurs + 1 hôte : photo, nom, rôle et énoncé. Remplissez puis activez chaque personne à afficher.' },
      { key: 'calendar', label: 'Calendrier — Prochains rendez-vous', icon: Calendar, description: 'Titres, champ de recherche, catégories de filtre, messages d\'indisponibilité et badge « en direct »' },
      { key: 'weekly', label: 'Cultes hebdomadaires', icon: Calendar, description: 'Label, titre, description et bouton de la section des cultes de la semaine (horaires gérés ailleurs)' },
      { key: 'stay_connected', label: 'Rester en lien', icon: MessageSquare, description: 'Textes des blocs Facebook/WhatsApp et contact du bureau pastoral' },
    ],
  },
  {
    key: 'jeunesse', label: 'Jeunesse', icon: Users,
    description: 'Activités, Programme, Témoignages',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'activities', label: 'Activités', icon: Users, description: 'Titre et description' },
      { key: 'program', label: 'Programme', icon: Calendar, description: 'Titre et description' },
      { key: 'gallery', label: 'Galerie photos', icon: Eye, description: 'Les six photos de la galerie (modifiables)' },
    ],
  },
  {
    key: 'ministeres', label: 'Ministères', icon: Building2,
    description: 'Louange, Évangélisation, Diaconie, Groupes',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'louange', label: 'Louange & Adoration', icon: Radio, description: 'Titre et description' },
      { key: 'evangelisation', label: 'Évangélisation', icon: Compass, description: 'Titre et description' },
      { key: 'diaconie', label: 'Diaconie & Aide sociale', icon: Heart, description: 'Titre et description' },
      { key: 'groupes', label: 'Groupes (Hommes, Femmes, Enfants, Couples)', icon: Users, description: 'Titre et description' },
    ],
  },
  {
    key: 'evangelisation', label: 'Évangélisation', icon: Compass,
    description: 'Héro, mission et participation',
    sections: [
      { key: 'evangelisation', label: 'Héro & mission', icon: Heart, description: 'Photo de fond (modifiable), titres et textes' },
    ],
  },
  {
    key: 'departments', label: 'Tous les départements', icon: Building2,
    description: 'Liste des départements',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'list', label: 'Liste des départements', icon: Building2, description: 'Titre et description' },
    ],
  },
  {
    key: 'pasteurs', label: 'Équipe pastorale', icon: Users,
    description: 'Pasteurs principaux et équipe',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'principaux', label: 'Pasteurs principaux', icon: Users, description: 'Titre et description' },
      { key: 'equipe', label: 'Reste de l\'équipe', icon: Users, description: 'Titre et description' },
    ],
  },
  {
    key: 'missions', label: 'Missions & extensions', icon: Compass,
    description: 'Vision missionnaire, implantations et appel au soutien. Les fiches, photos et pasteurs des extensions se gèrent dans l\'onglet « Lieux & extensions »',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'vision', label: 'Vision missionnaire', icon: Compass, description: 'Label, titre et texte d\'introduction' },
      { key: 'pillars', label: 'Trois piliers missionnaires', icon: Flame, description: 'Titres et textes des piliers (âmes, pasteurs, terres)' },
      { key: 'implantations', label: 'Implantation à la une', icon: MapPin, description: 'En-tête de la section mise en avant' },
      { key: 'network', label: 'Autres implantations', icon: MapPin, description: 'En-tête du réseau d\'extensions' },
      { key: 'pastors', label: 'Pasteurs d\'extension', icon: Users, description: 'En-tête de la section des responsables' },
      { key: 'cta', label: 'Appel au soutien', icon: Heart, description: 'Label, titre et texte du CTA' },
    ],
  },
  /* ══════════ VIE SPIRITUELLE ══════════ */
  {
    key: 'enseignements', label: 'Enseignements', icon: BookOpen,
    description: 'Enseignements, Séries, Études bibliques',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'list', label: 'Liste des enseignements', icon: BookOpen, description: 'Titre et description' },
      { key: 'series', label: 'Séries', icon: BookOpen, description: 'Titre et description' },
      { key: 'studies', label: 'Études bibliques', icon: BookOpen, description: 'Titre et description' },
    ],
  },
  {
    key: 'predications', label: 'Prédications', icon: BookOpen,
    description: 'Prédications et séries — Pour les miniatures et contenu, utilisez l\'onglet « Prédications » (#predications)',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'list', label: 'Liste des prédications', icon: BookOpen, description: 'Titre et description' },
      { key: 'series', label: 'Séries de prédications', icon: BookOpen, description: 'Titre et description' },
    ],
  },
  {
    key: 'blog', label: 'Blog', icon: MessageSquare,
    description: 'Articles et actualités',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'featured', label: 'Article à la une', icon: MessageSquare, description: 'Titre et description' },
      { key: 'list', label: 'Liste des articles', icon: MessageSquare, description: 'Titre et description' },
    ],
  },
  /* ══════════ MÉDIAS ══════════ */
  {
    key: 'media', label: 'Médias — Contenus', icon: Video,
    description: 'Vidéos, Émissions, En direct, Photos',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'videos', label: 'Toutes les vidéos', icon: Video, description: 'Titre et description' },
      { key: 'emissions', label: 'Émissions', icon: Radio, description: 'Titre et description' },
      { key: 'live', label: 'En direct', icon: Video, description: 'Photo de fond (modifiable), titre et description' },
      { key: 'photos', label: 'Photos', icon: Eye, description: 'Titre et description' },
    ],
  },
  {
    key: 'emissions', label: 'Médias — Émissions', icon: Radio,
    description: 'Émissions programmées',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'list', label: 'Liste des émissions', icon: Radio, description: 'Titre et description' },
      { key: 'featured', label: 'Émission à la une', icon: Radio, description: 'Titre et description' },
    ],
  },
  /* ══════════ COMMUNICATION ══════════ */
  {
    key: 'communiques', label: 'Communiqués', icon: Megaphone,
    description: 'Communiqués officiels',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'list', label: 'Liste des communiqués', icon: Megaphone, description: 'Titre et description' },
    ],
  },
  {
    key: 'annonces', label: 'Annonces', icon: Megaphone,
    description: 'Annonces importantes',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'list', label: 'Liste des annonces', icon: Megaphone, description: 'Titre et description' },
    ],
  },
  /* ══════════ CONTACT & DONS ══════════ */
  {
    key: 'contact', label: 'Contact', icon: MapPin,
    description: 'Coordonnées, Formulaire, Carte',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'services', label: 'Horaires de culte', icon: Calendar, description: 'Titre et description' },
      { key: 'form', label: 'Formulaire de contact', icon: MessageSquare, description: 'Titre et description' },
      { key: 'social', label: 'Réseaux sociaux', icon: Radio, description: 'Titre et description' },
    ],
  },
  {
    key: 'dons', label: 'Dons', icon: Heart,
    description: 'Méthodes de don',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'methods', label: 'Méthodes de don', icon: Heart, description: 'Titre et description' },
    ],
  },
  /* ══════════ VISION ══════════ */
  {
    key: 'vision', label: 'Vision & Mission', icon: Eye,
    description: 'Mission, Valeurs, Chronologie',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'mission', label: 'Mission', icon: Flame, description: 'Titre et description' },
      { key: 'values', label: 'Valeurs', icon: Heart, description: 'Titre et description' },
      { key: 'timeline', label: 'Chronologie', icon: Calendar, description: 'Titre et description' },
    ],
  },
  /* ══════════ ACTIVITÉS (legacy) ══════════ */
  {
    key: 'activities', label: 'Activités / Culte', icon: Calendar,
    description: 'Héro, Ministères, CTA',
    sections: [
      { key: 'hero', label: 'Héro', icon: Home, description: 'Photo de fond (modifiable), badge, titre, sous-titre' },
      { key: 'ministries', label: 'Ministères', icon: Users, description: 'Titre et sous-titre' },
      { key: 'cta', label: 'Appel à action', icon: Compass, description: 'Titre et description' },
    ],
  },
];

// ─── Default seeds: auto-create page_contents rows when page is empty ─

interface SeedField {
  field_key: string;
  label: string;
  type: ContentType;
  value: string;
}

export const SEEDS: Record<string, Record<string, SeedField[]>> = {
  home: {
    topbar: [
      { field_key: 'phone', label: 'Téléphone', type: 'text', value: CHURCH.phone.display },
      { field_key: 'email', label: 'Email', type: 'text', value: CHURCH.email },
      { field_key: 'marquee_text', label: 'Texte défilant personnalisé (vide = communiqués auto)', type: 'text', value: '' },
    ],
    hero: [
      { field_key: 'bg_image', label: 'Image de fond', type: 'image_url', value: '' },
      { field_key: 'bg_images', label: 'Images diaporama (séparées par ,)', type: 'text', value: '' },
      { field_key: 'title_line1', label: 'Titre ligne 1', type: 'text', value: 'La Conquête' },
      { field_key: 'title_line2', label: 'Titre ligne 2', type: 'text', value: 'des Âmes' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: `Église Évangélique La Conquête — ${CHURCH.address.city}, ${CHURCH.address.country}` },
      { field_key: 'bible_verse', label: 'Verset biblique (typing)', type: 'text', value: 'Psaumes 2:8 — "Demande-moi, et je te donnerai les nations pour héritage"' },
      { field_key: 'cta_primary', label: 'Bouton CTA principal', type: 'text', value: 'Rejoindre le culte' },
      { field_key: 'cta_primary_link', label: 'Destination du CTA principal', type: 'text', value: 'activities' },
      { field_key: 'cta_secondary', label: 'Bouton CTA secondaire', type: 'text', value: 'Notre vision' },
      { field_key: 'cta_secondary_link', label: 'Destination du CTA secondaire', type: 'text', value: 'about' },
    ],
    agenda: [
      { field_key: 'eyebrow', label: 'En-tête section (label)', type: 'text', value: 'Événements' },
      { field_key: 'title', label: 'En-tête section (titre)', type: 'text', value: 'À ne pas manquer' },
      { field_key: 'subtitle', label: 'En-tête section (sous-titre)', type: 'text', value: "Le marathon de prière et les rendez-vous qui rythment la vie de l'église." },
      { field_key: 'featured_kicker', label: 'Affiche — Sur-titre', type: 'text', value: 'À la une' },
      { field_key: 'featured_badge', label: 'Affiche — Date', type: 'text', value: '1er – 30 novembre 2026' },
      { field_key: 'featured_title', label: 'Affiche — Titre', type: 'text', value: 'Marathon de prière' },
      { field_key: 'featured_time', label: 'Affiche — Horaires / lieu', type: 'text', value: 'Lundi – vendredi, 16h00 – 18h45 · Dimanche, 08h00 – 10h30' },
      { field_key: 'featured_description', label: 'Affiche — Description', type: 'text', value: "« La mission de l'Église locale face au monde moderne » — Matthieu 28:19-20." },
      { field_key: 'featured_image', label: 'Affiche — Image du slide (paysage)', type: 'image_url', value: '/marathon-priere-2026-slide.webp' },
      { field_key: 'featured_cta', label: 'Affiche — Texte du bouton', type: 'text', value: "Voir l'événement" },
    ],
    services: [
      { field_key: 'service_0_image', label: 'Dimanche — Culte principal', type: 'image_url', value: '/church-photo-3.webp' },
      { field_key: 'service_3_image', label: 'Mercredi — Enseignement et prière', type: 'image_url', value: '/bible.webp' },
      { field_key: 'service_5_image', label: 'Vendredi — Jeûne et prière', type: 'image_url', value: '/church-photo-1.webp' },
      { field_key: 'service_6_image', label: 'Samedi — Génération Espoir', type: 'image_url', value: '/church-photo-2.webp' },
    ],
    pillars: [
      { field_key: 'heading_label', label: 'En-tête section (label)', type: 'text', value: 'Nos Fondements' },
      { field_key: 'heading_title', label: 'En-tête section (titre)', type: 'text', value: 'Trois piliers qui nous guident' },
      { field_key: 'pillar_1_title', label: 'Pilier 1 — Titre', type: 'text', value: 'Foi' },
      { field_key: 'pillar_1_desc', label: 'Pilier 1 — Description', type: 'text', value: 'Une foi ancrée dans la Parole de Dieu qui nous donne la force de tenir ferme dans les épreuves et de marcher avec confiance vers notre destinée.' },
      { field_key: 'pillar_2_title', label: 'Pilier 2 — Titre', type: 'text', value: 'Communauté' },
      { field_key: 'pillar_2_desc', label: 'Pilier 2 — Description', type: 'text', value: "Une famille soudée par l'amour du Christ, où chacun trouve sa place, son soutien et sa mission au service du corps." },
      { field_key: 'pillar_3_title', label: 'Pilier 3 — Titre', type: 'text', value: 'Mission' },
      { field_key: 'pillar_3_desc', label: 'Pilier 3 — Description', type: 'text', value: "Un appel à aller au-delà des murs, à porter l'Évangile aux nations et à faire des disciples pour la gloire de Dieu." },
    ],
    about: [
      { field_key: 'heading_label', label: 'En-tête section (label)', type: 'text', value: 'Qui sommes-nous' },
      { field_key: 'heading_title', label: 'En-tête section (titre)', type: 'text', value: 'Une église qui fait la différence' },
      { field_key: 'text_1', label: 'Texte principal', type: 'text', value: '' },
      { field_key: 'text_2', label: 'Texte secondaire', type: 'text', value: '' },
      { field_key: 'bible_text', label: 'Citation biblique', type: 'text', value: '' },
      { field_key: 'image', label: 'Photo', type: 'image_url', value: '' },
      { field_key: 'cta_text', label: 'Texte du bouton', type: 'text', value: 'En savoir plus' },
    ],
    pastor_word: [
      { field_key: 'label', label: 'Label de section', type: 'text', value: 'Mot du pasteur' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Conseils pastoraux' },
      { field_key: 'text_1', label: 'Texte principal', type: 'text', value: 'Cher membre de la famille La Conquête, Dieu a un plan extraordinaire pour votre vie. Ne laissez pas les circonstances définir votre destinée, mais laissez la Parole de Dieu établir vos pas.' },
      { field_key: 'text_2', label: 'Texte secondaire', type: 'text', value: "Nous sommes dans une saison où Dieu appelle son Église à se lever, à prendre position et à manifester sa gloire dans chaque domaine de la société." },
      { field_key: 'bible_text', label: 'Citation biblique', type: 'text', value: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance." },
      { field_key: 'bible_ref', label: 'Référence biblique', type: 'text', value: 'Jérémie 29:11' },
      { field_key: 'portrait_image', label: 'Photo portrait', type: 'image_url', value: '/pasteur-romain-kazadi.webp' },
      { field_key: 'portrait_scale', label: 'Échelle du portrait (ex: 1, 1.2, 0.8)', type: 'text', value: '1.25' },
      { field_key: 'portrait_pos_x', label: 'Position horizontale (left / center / right)', type: 'text', value: 'center' },
      { field_key: 'portrait_pos_y', label: 'Position verticale (top / center / bottom)', type: 'text', value: 'top' },
      { field_key: 'signature_image', label: 'Image signature (PNG)', type: 'image_url', value: '' },
      { field_key: 'signature_scale', label: 'Échelle de la signature (ex: 1, 1.5, 0.7)', type: 'text', value: '1' },
      { field_key: 'signature_pos_x', label: 'Position signature (left / center / right)', type: 'text', value: 'center' },
    ],
    firstvisit: [
      { field_key: 'image', label: 'Photo — Premier dimanche', type: 'image_url', value: '/church-photo-2.webp' },
    ],
    news: [
      { field_key: 'eyebrow', label: 'En-tête (label)', type: 'text', value: 'Actualités' },
      { field_key: 'title', label: 'Titre de la section', type: 'text', value: "La vie de l'église" },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: 'Enseignements, annonces et nouvelles de nos extensions — ce qui fait vivre la communauté.' },
    ],
    cta_map: [
      { field_key: 'title', label: 'Titre du CTA', type: 'text', value: 'Rejoignez notre famille' },
      { field_key: 'text', label: 'Texte du CTA', type: 'text', value: "Vous êtes appelé à faire partie de cette aventure extraordinaire. Venez rencontrer une communauté qui prie, qui aime et qui sert ensemble." },
    ],
    explore: [
      { field_key: 'heading_label', label: 'Label de section', type: 'text', value: 'Explorer' },
      { field_key: 'heading_title', label: 'Titre de la section', type: 'text', value: 'Découvrez nos activités' },
      { field_key: 'subtitle', label: 'Sous-titre / Description', type: 'text', value: "Cinq portes d'entrée dans la vie de l'église : prédications, rendez-vous, ministères, médias et actualités." },
    ],
    pastors: [
      { field_key: 'label', label: 'Label de section', type: 'text', value: 'Bureau pastoral' },
      { field_key: 'title', label: 'Titre', type: 'text', value: "Une équipe au service de l'Église" },
    ],
    quote: [
      { field_key: 'heading_label', label: 'En-tête (label)', type: 'text', value: 'Verset' },
      { field_key: 'text', label: 'Texte de la citation', type: 'text', value: "Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes œuvres, que Dieu a préparées d'avance, afin que nous les pratiquions." },
      { field_key: 'reference', label: 'Référence', type: 'text', value: 'Éphésiens 2:10' },
    ],
    testimonials: [
      { field_key: 'heading_label', label: 'En-tête (label)', type: 'text', value: 'Témoignages' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: 'Ce que Dieu fait parmi nous' },
      { field_key: 'description', label: 'Description', type: 'text', value: "Des membres de la communauté racontent ce que Dieu a accompli dans leur vie, pour la gloire de son nom." },
    ],
  },

  about: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Notre Identité' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Qui sommes-nous' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    about: [
      { field_key: 'heading_label', label: 'En-tête (label)', type: 'text', value: 'Qui sommes-nous' },
      { field_key: 'heading_title', label: 'En-tête (titre)', type: 'text', value: '' },
      { field_key: 'text', label: 'Texte principal', type: 'text', value: '' },
    ],
    vision: [{ field_key: 'text', label: 'Texte de la vision', type: 'text', value: '' }],
    mission: [{ field_key: 'text', label: 'Texte de la mission', type: 'text', value: '' }],
    values: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Nos Valeurs' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'heading_subtitle', label: 'Sous-titre', type: 'text', value: '' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Valeurs' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    giving: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Soutenir l\'œuvre' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'cta_text', label: 'Texte du bouton', type: 'text', value: 'Faire un don' },
    ],
    cta: [
      { field_key: 'image', label: 'Photo de fond', type: 'image_url', value: '/church-photo-1.webp' },
    ],
    vision_heading: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Notre Vision' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
    ],
    mission_heading: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Notre Mission' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
    ],
    team: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Équipe Pastorale' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
    ],
  },

  culte: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Rassemblés pour Lui' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Cultes' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    schedule: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Horaires de culte' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    practicals: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Infos pratiques' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  events: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Calendrier' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Événements' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
      { field_key: 'cta_text', label: 'Texte du bouton CTA', type: 'text', value: '' },
      { field_key: 'cta_url', label: 'Lien du bouton CTA', type: 'text', value: '' },
    ],
    marathon: [
      { field_key: 'label', label: 'Sur-titre', type: 'text', value: 'À la une' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Marathon de prière' },
      { field_key: 'period', label: 'Période', type: 'text', value: '1er – 30 novembre 2026' },
      { field_key: 'theme', label: 'Thème', type: 'text', value: "La mission de l'Église locale face au monde moderne" },
      { field_key: 'reference', label: 'Référence biblique', type: 'text', value: 'Matthieu 28:19-20' },
      { field_key: 'hours', label: 'Horaires', type: 'text', value: 'Lundi – vendredi, 16h00 – 18h45 · Dimanche, 08h00 – 10h30' },
      { field_key: 'image', label: 'Affiche officielle (upload)', type: 'image_url', value: '/marathon-priere-2026.webp' },
      { field_key: 'theme_label', label: 'Intitulé « Thème »', type: 'text', value: 'Thème' },
      { field_key: 'hours_label', label: 'Intitulé « Horaires »', type: 'text', value: 'Horaires' },
      { field_key: 'location_label', label: 'Intitulé « Lieu »', type: 'text', value: 'Lieu' },
      { field_key: 'cta_primary', label: 'Bouton principal', type: 'text', value: "Lire l'annonce" },
      { field_key: 'cta_secondary', label: 'Bouton secondaire', type: 'text', value: 'Poser une question' },
    ],
    speakers: [
      { field_key: 'label', label: 'Label de section', type: 'text', value: 'Marathon de prière' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Orateurs' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
      { field_key: 'speaker_1_active', label: 'Orateur 1 — Afficher sur le site', type: 'text', value: 'true' },
      { field_key: 'speaker_1_image', label: 'Orateur 1 — Photo', type: 'image_url', value: '/pasteur-romain-kazadi.webp' },
      { field_key: 'speaker_1_name', label: 'Orateur 1 — Nom', type: 'text', value: 'Josué Romain Kazadi' },
      { field_key: 'speaker_1_role', label: 'Orateur 1 — Rôle', type: 'text', value: 'Pasteur Principal' },
      { field_key: 'speaker_1_text', label: 'Orateur 1 — Texte sur la photo', type: 'text', value: '' },
      { field_key: 'speaker_2_active', label: 'Orateur 2 — Afficher sur le site', type: 'text', value: 'true' },
      { field_key: 'speaker_2_image', label: 'Orateur 2 — Photo', type: 'image_url', value: '/pasteur-david-kateba.webp' },
      { field_key: 'speaker_2_name', label: 'Orateur 2 — Nom', type: 'text', value: 'David Kateba' },
      { field_key: 'speaker_2_role', label: 'Orateur 2 — Rôle', type: 'text', value: 'Docteur' },
      { field_key: 'speaker_2_text', label: 'Orateur 2 — Texte sur la photo', type: 'text', value: '' },
      { field_key: 'speaker_3_active', label: 'Orateur 3 — Afficher sur le site', type: 'text', value: 'true' },
      { field_key: 'speaker_3_image', label: 'Orateur 3 — Photo', type: 'image_url', value: '/pasteur-richard-mukendi.webp' },
      { field_key: 'speaker_3_name', label: 'Orateur 3 — Nom', type: 'text', value: 'Richard Mukendi' },
      { field_key: 'speaker_3_role', label: 'Orateur 3 — Rôle', type: 'text', value: 'Pasteur' },
      { field_key: 'speaker_3_text', label: 'Orateur 3 — Texte sur la photo', type: 'text', value: '' },
      { field_key: 'speaker_4_active', label: 'Orateur 4 — Afficher sur le site', type: 'text', value: 'false' },
      { field_key: 'speaker_4_image', label: 'Orateur 4 — Photo', type: 'image_url', value: '' },
      { field_key: 'speaker_4_name', label: 'Orateur 4 — Nom', type: 'text', value: '' },
      { field_key: 'speaker_4_role', label: 'Orateur 4 — Rôle', type: 'text', value: '' },
      { field_key: 'speaker_4_text', label: 'Orateur 4 — Texte sur la photo', type: 'text', value: '' },
      { field_key: 'speaker_5_active', label: 'Hôte — Afficher sur le site', type: 'text', value: 'false' },
      { field_key: 'speaker_5_image', label: 'Hôte — Photo', type: 'image_url', value: '' },
      { field_key: 'speaker_5_name', label: 'Hôte — Nom', type: 'text', value: '' },
      { field_key: 'speaker_5_role', label: 'Hôte — Rôle', type: 'text', value: '' },
      { field_key: 'speaker_5_text', label: 'Hôte — Texte sur la photo', type: 'text', value: '' },
    ],
    calendar: [
      { field_key: 'label', label: 'Label de section', type: 'text', value: 'Calendrier' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Prochains rendez-vous' },
      { field_key: 'search_placeholder', label: 'Texte du champ de recherche', type: 'text', value: 'Rechercher un événement…' },
      { field_key: 'categories', label: 'Catégories de filtre (séparées par des virgules)', type: 'text', value: 'Tous, Cultes, Missions, Jeunesse, Communion, Formation, Évangélisation, Spécial, Autre' },
      { field_key: 'error_text', label: 'Message si l\'agenda est indisponible', type: 'text', value: 'Agenda momentanément indisponible. Les rendez-vous hebdomadaires restent affichés ci-dessous.' },
      { field_key: 'empty_title', label: 'Message vide — ligne 1', type: 'text', value: 'Aucun événement supplémentaire n\'est annoncé pour le moment.' },
      { field_key: 'empty_text', label: 'Message vide — ligne 2', type: 'text', value: 'Les rendez-vous hebdomadaires ont lieu chaque semaine, sans inscription.' },
      { field_key: 'live_badge', label: 'Badge « en direct »', type: 'text', value: 'En direct' },
    ],
    weekly: [
      { field_key: 'label', label: 'Label de section', type: 'text', value: 'Chaque semaine' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Cultes hebdomadaires' },
      { field_key: 'description', label: 'Description', type: 'text', value: 'Des rendez-vous réguliers pour grandir dans la foi et la communion fraternelle. Entrée libre.' },
      { field_key: 'cta_text', label: 'Texte du bouton', type: 'text', value: 'Tout savoir sur les cultes' },
    ],
    stay_connected: [
      { field_key: 'news_label', label: 'Bloc annonces — Label', type: 'text', value: 'Rester informé' },
      { field_key: 'news_title', label: 'Bloc annonces — Titre', type: 'text', value: 'Suivez la vie de l\'église' },
      { field_key: 'news_text', label: 'Bloc annonces — Texte', type: 'text', value: 'Les annonces, communiqués et changements de programme sont publiés en premier sur nos canaux officiels. Aucune inscription n\'est nécessaire.' },
      { field_key: 'join_label', label: 'Bloc contact — Label', type: 'text', value: 'Nous rejoindre' },
      { field_key: 'join_title', label: 'Bloc contact — Titre', type: 'text', value: 'Une question sur un événement ?' },
      { field_key: 'join_text', label: 'Bloc contact — Texte (le numéro s\'affiche à la fin)', type: 'text', value: 'Le bureau pastoral répond du lundi au vendredi, de 10h à 18h00, au' },
      { field_key: 'join_cta', label: 'Bloc contact — Bouton', type: 'text', value: 'Nous écrire' },
    ],
  },

  jeunesse: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Génération Conquête' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Ministère de la Jeunesse' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    activities: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Nos Activités' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    program: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Programme' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    gallery: [
      { field_key: 'image_1', label: 'Photo 1', type: 'image_url', value: '/church-photo-1.webp' },
      { field_key: 'image_2', label: 'Photo 2', type: 'image_url', value: '/church-photo-2.webp' },
      { field_key: 'image_3', label: 'Photo 3', type: 'image_url', value: '/church-photo-3.webp' },
      { field_key: 'image_4', label: 'Photo 4', type: 'image_url', value: '/predication-1.webp' },
      { field_key: 'image_5', label: 'Photo 5', type: 'image_url', value: '/priere.webp' },
      { field_key: 'image_6', label: 'Photo 6', type: 'image_url', value: '/bible.webp' },
    ],
  },

  ministeres: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Servir ensemble' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Ministères' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    louange: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Louange & Adoration' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
    ],
    evangelisation: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Évangélisation' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
    ],
    diaconie: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Diaconie & Aide sociale' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
    ],
    groupes: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Groupes' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
    ],
  },

  departments: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Départements' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Départements' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Tous les départements' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  pasteurs: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Serviteurs de Dieu' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Notre Équipe Pastorale' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    principaux: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Pasteurs principaux' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    equipe: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'L\'équipe' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  missions: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Église missionnaire' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Missions & extensions' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: "La conquête des âmes et des terres se vit aussi hors des murs du temple, dans les villages et les quartiers où l'église s'implante." },
    ],
    vision: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Pourquoi des extensions' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Une église qui envoie' },
      { field_key: 'text', label: 'Texte', type: 'text', value: "La Conquête n'est pas seulement une communauté rassemblée à Lubumbashi. Elle est une église missionnaire : elle forme, envoie et accompagne des équipes pour que l'Évangile soit annoncé là où les gens vivent." },
    ],
    pillars: [
      { field_key: 'pillar_1_title', label: 'Pilier 1 — Titre', type: 'text', value: 'Des âmes' },
      { field_key: 'pillar_1_text', label: 'Pilier 1 — Texte', type: 'text', value: "Chaque extension naît d'un quartier ou d'un village où des familles vivent, travaillent et doivent entendre l'Évangile dans leur propre quotidien." },
      { field_key: 'pillar_2_title', label: 'Pilier 2 — Titre', type: 'text', value: 'Des pasteurs' },
      { field_key: 'pillar_2_text', label: 'Pilier 2 — Texte', type: 'text', value: 'Chaque implantation est portée par un pasteur et une équipe locale, en lien avec le bureau pastoral de Lubumbashi.' },
      { field_key: 'pillar_3_title', label: 'Pilier 3 — Titre', type: 'text', value: 'Des terres' },
      { field_key: 'pillar_3_text', label: 'Pilier 3 — Texte', type: 'text', value: 'La conquête des terres habitables et cultivables se traduit par des lieux de culte, des formations et un accompagnement durable des communautés.' },
    ],
    implantations: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Nos implantations' },
      { field_key: 'title', label: 'Titre', type: 'text', value: "Une présence qui s'étend" },
    ],
    network: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Le réseau' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Les autres implantations' },
    ],
    pastors: [
      { field_key: 'label', label: 'Label', type: 'text', value: 'Responsables' },
      { field_key: 'title', label: 'Titre', type: 'text', value: "Les pasteurs d'extension" },
    ],
    cta: [
      { field_key: 'eyebrow', label: 'Sur-titre', type: 'text', value: 'Faire grandir le réseau' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Soutenir une implantation' },
      { field_key: 'text', label: 'Texte', type: 'text', value: 'Vos dons et votre prière accompagnent les pasteurs, les équipes et les chantiers des extensions.' },
    ],
  },

  enseignements: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Croître dans la foi' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Enseignements & Études Bibliques' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Enseignements' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    series: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Séries' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    studies: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Études bibliques' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  predications: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'La Parole de Dieu' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Prédications' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Prédications' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    series: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Séries' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  blog: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Restez informé' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Actualités & Enseignements' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    featured: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'À la une' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Articles' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  media: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Médias' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Médias' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    videos: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Toutes les vidéos' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    emissions: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Émissions' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    live: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'En direct' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'image', label: 'Photo de fond', type: 'image_url', value: '/church-photo-1.webp' },
    ],
    photos: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Photos' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  emissions: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Émissions' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Émissions' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Programme' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    featured: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'À la une' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  communiques: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Communiqués' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Communiqués' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Derniers communiqués' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  annonces: {
    hero: [
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Annonces' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Annonces' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    list: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Annonces récentes' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  contact: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Contactez-nous' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Contact' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    services: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Horaires de culte' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    form: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Nous écrire' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    social: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Réseaux sociaux' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  dons: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: "Soutenir l'œuvre" },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Faire un don' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    methods: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Méthodes de don' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  vision: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Pourquoi nous existons' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Vision & Mission' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    mission: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Notre Mission' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    values: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Nos Valeurs' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
    timeline: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Notre Histoire' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
    ],
  },

  activities: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Communauté' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Activités' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    ministries: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: 'Ministères' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Nos Ministères' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],
    cta: [
      { field_key: 'heading_label', label: 'Label', type: 'text', value: '' },
      { field_key: 'heading_title', label: 'Titre', type: 'text', value: '' },
      { field_key: 'title', label: 'Titre', type: 'text', value: 'Impliquez-vous' },
      { field_key: 'description', label: 'Description', type: 'text', value: '' },
      { field_key: 'image', label: 'Photo de fond', type: 'image_url', value: '/church-photo-3.webp' },
    ],
  },

  evangelisation: {
    evangelisation: [
      { field_key: 'hero_image', label: 'Photo de fond', type: 'image_url', value: '/church-photo-1.webp' },
      { field_key: 'hero_title', label: 'Titre du héro', type: 'text', value: 'Allez dans le monde entier et prêchez la Bonne Nouvelle' },
      { field_key: 'hero_subtitle', label: 'Sous-titre du héro', type: 'text', value: "L'évangélisation est au cœur de notre mission. Chaque âme compte, chaque vie a une destinée en Dieu." },
      { field_key: 'mission_title', label: 'Titre — Notre Mission', type: 'text', value: 'Notre Mission' },
      { field_key: 'mission_text', label: 'Texte — Notre Mission', type: 'text', value: "Nous sommes appelés à être des ambassadeurs du Christ, porteurs d'une message d'espérance et de transformation. Notre département d'évangélisation organise des sorties régulières dans les quartiers, les marchés et les espaces publics pour partager l'amour de Dieu avec ceux qui ne le connaissent pas encore." },
      { field_key: 'participate_title', label: 'Titre — Comment participer', type: 'text', value: 'Comment participer' },
      { field_key: 'participate_text', label: 'Texte — Comment participer', type: 'text', value: "Chaque membre de l'église est un évangéliste en puissance. Rejoignez notre équipe d'évangélisation et participez activement à la conquête des âmes pour le Royaume de Dieu." },
    ],
  },
};

async function seedPageIfEmpty(pageKey: string) {
  const pageSeeds = SEEDS[pageKey];
  if (!pageSeeds) return;

  // Check what sections already exist
  const { data: existing } = await supabase
    .from('page_contents')
    .select('section_key, field_key')
    .eq('page', pageKey);

  if (!existing || existing.length === 0) {
    // Page completely empty — seed everything
    const rows: any[] = [];
    let order = 0;
    for (const [sectionKey, fields] of Object.entries(pageSeeds)) {
      for (const f of fields) {
        rows.push({
          page: pageKey,
          section_key: sectionKey,
          field_key: f.field_key,
          label: f.label,
          value: f.value,
          type: f.type,
          sort_order: order++,
        });
      }
    }
    const { error: seedErr } = await supabase.from('page_contents').insert(rows);
    if (seedErr) { console.error('Seed error:', seedErr.message); return; }
    return;
  }

  // Page has some fields — seed only missing ones
  const existingKeys = new Set(existing.map((r: any) => `${r.section_key}.${r.field_key}`));
  const missing: any[] = [];
  let order = existing.length;
  for (const [sectionKey, fields] of Object.entries(pageSeeds)) {
    for (const f of fields) {
      if (!existingKeys.has(`${sectionKey}.${f.field_key}`)) {
        missing.push({
          page: pageKey,
          section_key: sectionKey,
          field_key: f.field_key,
          label: f.label,
          value: f.value,
          type: f.type,
          sort_order: order++,
        });
      }
    }
  }
  if (missing.length > 0) {
    const { error: missingErr } = await supabase.from('page_contents').insert(missing);
    if (missingErr) console.error('Seed missing error:', missingErr.message);
  }
}

// ─── Section label resolver ─────────────────────────────────────────

function getSectionLabel(pageKey: string, sectionKey: string): { label: string; icon: IconComponent; description: string } {
  const page = PAGES.find((p) => p.key === pageKey);
  if (!page) return { label: sectionKey, icon: FileText, description: '' };
  const sec = page.sections.find((s) => s.key === sectionKey);
  if (sec) return { label: sec.label, icon: sec.icon, description: sec.description };

  // Dynamic sections (e.g., value_1, value_2 on about page)
  if (sectionKey.startsWith('value_')) {
    const num = sectionKey.replace('value_', '');
    return {
      label: `Valeur ${num}`,
      icon: Heart,
      description: 'Icône, titre et description',
    };
  }
  return { label: sectionKey, icon: FileText, description: '' };
}

function FileText_({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </svg>
  );
}
const FileText = FileText_;

// ─── Component ──────────────────────────────────────────────────────

export function ContentsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  /* L'accueil possède son propre éditeur par sections : on l'écarte de la
     liste « Autres pages » pour éviter deux endroits qui modifient la même chose. */
  const otherPages = PAGES.filter((page) => page.key !== 'home');
  const [activePage, setActivePage] = useState(otherPages[0]?.key ?? PAGES[0].key);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [contents, setContents] = useState<PageContent[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  // is_active removed — column does not exist in DB
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Add-field modal state ──
  const [addModal, setAddModal] = useState<{ sectionKey: string } | null>(null);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<ContentType>('text');

  // ── Delete confirm state ──
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Fetch contents ──

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setActiveSection(null);

      // Auto-seed missing fields for pages that have seed definitions
      await seedPageIfEmpty(activePage);

      const { data, error } = await supabase
        .from('page_contents')
        .select('*')
        .eq('page', activePage)
        .order('section_key')
        .order('sort_order');

      if (cancelled) return;

      if (error) {
        // Error silently — don't call addToast inside useEffect to avoid dependency loops
        console.error('ContentsTab load error:', error.message);
      } else {
        const rows: PageContent[] = (data ?? []) as PageContent[];
        setContents(rows);
        const vals: Record<string, string> = {};
        for (const r of rows) {
          vals[r.id] = r.value;
        }
        setDraftValues(vals);

        // Auto-open first section
        if (rows.length > 0) {
          setActiveSection(rows[0].section_key);
        }
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  // ── Grouped by section ──

  const sectionMap = new Map<string, PageContent[]>();
  for (const c of contents) {
    const list = sectionMap.get(c.section_key) ?? [];
    list.push(c);
    sectionMap.set(c.section_key, list);
  }
  const sectionKeys = Array.from(sectionMap.keys());

  // ── Handlers ──

  const handleValueChange = useCallback((id: string, val: string) => {
    setDraftValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  // handleActiveToggle removed — is_active column does not exist in DB

  // ── Save all changes for the active page ──

  const handleSave = useCallback(async () => {
    setSaving(true);
    const now = new Date().toISOString();

    const results = await Promise.allSettled(
      contents.map((item) => {
        const newVal = draftValues[item.id] ?? item.value;
        if (newVal === item.value) return Promise.resolve(null);
        return supabase
          .from('page_contents')
          .update({ value: newVal, updated_at: now })
          .eq('id', item.id);
      }),
    );

    // Supabase never rejects — errors come as { data, error } in fulfilled
    const errors: string[] = [];
    for (const r of results) {
      if (r.status === 'rejected') {
        errors.push(r.reason?.message || 'Erreur inconnue');
      } else if (r.value?.error) {
        errors.push(r.value.error.message || JSON.stringify(r.value.error));
      }
    }

    if (errors.length === 0) {
      addToast('Tous les contenus sauvegardés', 'success');
      // Refresh
      const { data } = await supabase
        .from('page_contents')
        .select('*')
        .eq('page', activePage)
        .order('section_key')
        .order('sort_order');
      if (data) {
        setContents(data as PageContent[]);
        const vals: Record<string, string> = {};
        for (const r of data) {
          vals[r.id] = r.value;
        }
        setDraftValues(vals);
      }
    } else {
      addToast(`Erreur : ${errors[0]}`, 'error');
      console.error('ContentsTab save errors:', errors);
    }

    setSaving(false);
  }, [contents, draftValues, activePage, addToast]);

  // ── Add field ──

  const handleAddField = useCallback(async () => {
    if (!addModal) return;
    const { sectionKey } = addModal;
    const key = newFieldKey.trim();
    const label = newFieldLabel.trim();

    if (!key || !label) {
      addToast('Remplissez la clé et le libellé', 'error');
      return;
    }

    const existing = sectionMap.get(sectionKey) ?? [];
    const maxSort = existing.reduce((max, c) => Math.max(max, c.sort_order), 0);

    const { error } = await supabase.from('page_contents').insert({
      page: activePage,
      section_key: sectionKey,
      field_key: key,
      label,
      value: '',
      type: newFieldType,
      sort_order: maxSort + 1,
    });

    if (error) {
      addToast("Erreur lors de l'ajout", 'error');
      return;
    }

    addToast('Champ ajouté', 'success');
    setAddModal(null);
    setNewFieldKey('');
    setNewFieldLabel('');
    setNewFieldType('text');

    // Refresh
    const { data } = await supabase
      .from('page_contents')
      .select('*')
      .eq('page', activePage)
      .order('section_key')
      .order('sort_order');
    if (data) {
      const rows = data as PageContent[];
      setContents(rows);
      const vals: Record<string, string> = {};
      for (const r of rows) {
        vals[r.id] = r.value;
      }
      setDraftValues(vals);
    }
  }, [addModal, newFieldKey, newFieldLabel, newFieldType, activePage, sectionMap, addToast]);

  // ── Delete field ──

  const handleDeleteField = useCallback(async (id: string) => {
    const { error } = await supabase.from('page_contents').delete().eq('id', id);
    if (error) {
      addToast('Erreur lors de la suppression', 'error');
      return;
    }
    addToast('Champ supprimé', 'success');
    setDeleteConfirmId(null);
    setContents((prev) => prev.filter((c) => c.id !== id));
    setDraftValues((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, [addToast]);

  // ── Dirty check ──

  const hasChanges = contents.some((item) => {
    return (draftValues[item.id] ?? '') !== item.value;
  });

  // ── Current page def ──

  const currentPage = PAGES.find((p) => p.key === activePage);
  const activeSectionItems = activeSection ? (sectionMap.get(activeSection) ?? []) : [];
  const activeSectionInfo = activeSection ? getSectionLabel(activePage, activeSection) : null;

  // ── Render input by type ──

  const renderInput = (item: PageContent) => {
    const val = draftValues[item.id] ?? '';

    // Champs d'activation (ex. speaker_1_active) : interrupteur au lieu d'un texte brut.
    if (item.type === 'text' && item.field_key.endsWith('_active')) {
      const enabled = ['true', '1', 'oui', 'yes', 'on'].includes(val.trim().toLowerCase());
      return (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => handleValueChange(item.id, enabled ? 'false' : 'true')}
          className="flex items-center gap-3 py-1 text-sm"
        >
          <span
            className={`relative h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-amber-500' : 'bg-cream/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className={enabled ? 'text-amber-400' : 'text-muted/80'}>
            {enabled ? 'Affiché sur le site' : 'Masqué'}
          </span>
        </button>
      );
    }

    switch (item.type) {
      case 'text':
        return (
          <textarea
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            rows={3}
            className="input-surface w-full px-4 py-2.5 text-sm resize-y"
            placeholder={item.label}
          />
        );
      case 'html':
        return (
          <textarea
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            rows={6}
            className="input-surface w-full px-4 py-2.5 text-sm font-mono resize-y"
            placeholder="HTML autorisé"
          />
        );
      case 'image_url':
        return (
          <ImageUpload
            value={val}
            onChange={(v) => handleValueChange(item.id, v)}
            folder={`${activePage}/${item.section_key}`}
          />
        );
      case 'url':
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder="https://..."
          />
        );
      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={item.label}
          />
        );
    }
  };

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="flex h-full">
      {/* ─── Left Panel: Pages ─── */}
      <aside className="flex w-72 flex-shrink-0 flex-col border-r border-line bg-bg-elevated/60">
        <div className="border-b border-line p-3">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted/80">Pages</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {otherPages.map((pg) => {
            const PgIcon = pg.icon;
            const isActive = activePage === pg.key;
            const fieldCount = contents.filter((c) => c.page === pg.key).length;

            return (
              <button
                key={pg.key}
                type="button"
                onClick={() => setActivePage(pg.key)}
                className={`flex w-full items-center gap-2.5 border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-cream/5 ${
                  isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                }`}
              >
                <PgIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-muted/80'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-amber-400' : 'text-cream/80'}`}>
                    {pg.label}
                  </p>
                  <p className="text-[10px] text-muted/60 truncate">{pg.description}</p>
                </div>
                {isActive && fieldCount > 0 && (
                  <span className="text-[10px] text-muted/60">{fieldCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isFullAdmin || !hasChanges}
            className="btn-gold w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
            {hasChanges && <span className="rounded-full bg-bg-elevated/60 px-2 py-0.5 text-[10px]">modifié</span>}
          </button>
        </div>
      </aside>

      {/* ─── Right Panel: Sections & Fields ─── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 border-b border-line px-6 py-3">
          <span className="text-sm text-muted/80">{currentPage?.label ?? activePage}</span>
          {activeSectionInfo && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted/40" />
              <span className="text-sm text-cream">{activeSectionInfo.label}</span>
            </>
          )}
        </div>

        {contents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted/20" />
              <p className="text-sm text-muted/80">Aucun contenu pour cette page.</p>
              <p className="mt-1 text-xs text-muted/40">Ajoutez des sections et champs ci-dessous.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1">
            {/* Sections list */}
            <div className="w-56 flex-shrink-0 border-r border-line/60 py-2">
              {sectionKeys.map((sk) => {
                const info = getSectionLabel(activePage, sk);
                const SecIcon = info.icon;
                const isActive = activeSection === sk;
                const count = (sectionMap.get(sk) ?? []).length;

                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setActiveSection(sk)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-cream/5 ${
                      isActive ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''
                    }`}
                  >
                    <SecIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-muted/60'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-amber-400' : 'text-cream/70'}`}>
                        {info.label}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted/40">{count}</span>
                  </button>
                );
              })}

              {/* Add section button */}
              {isFullAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    // Create a new section by adding a field to a new section
                    const newKey = `section_${Date.now()}`;
                    setAddModal({ sectionKey: newKey });
                    setNewFieldKey('');
                    setNewFieldLabel('');
                    setNewFieldType('text');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-muted/60 hover:text-cream/60 hover:bg-cream/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs">Nouvelle section</span>
                </button>
              )}
            </div>

            {/* Fields editor */}
            <div className="flex-1 p-6">
              {activeSection && activeSectionInfo ? (
                <div className="space-y-5">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-cream">{activeSectionInfo.label}</h3>
                      {activeSectionInfo.description && (
                        <p className="mt-0.5 text-xs text-muted/80">{activeSectionInfo.description}</p>
                      )}
                    </div>
                    {isFullAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddModal({ sectionKey: activeSection });
                          setNewFieldKey('');
                          setNewFieldLabel('');
                          setNewFieldType('text');
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs text-muted hover:border-amber-500/30 hover:text-amber-400 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Champ
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  {activeSectionItems.map((item) => {
                    const isModified = (draftValues[item.id] ?? item.value) !== item.value;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 transition ${
                          isModified
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-line/60 bg-cream/[0.03]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <label className="text-sm font-medium text-cream">{item.label}</label>
                            <div className="mt-0.5 flex items-center gap-2">
                              <code className="text-[10px] text-muted/60 font-mono">{item.field_key}</code>
                              <span className="rounded-full bg-cream/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted/60">
                                {item.type}
                              </span>
                              {isModified && (
                                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">modifié</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isFullAdmin && (
                              deleteConfirmId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteField(item.id)}
                                    className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded"
                                  >
                                    Oui, supprimer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-[10px] text-muted/80 hover:text-cream/60 px-1.5 py-0.5 rounded"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted/40 hover:text-red-400 hover:bg-red-400/10 transition"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {renderInput(item)}
                      </div>
                    );
                  })}

                  {activeSectionItems.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line p-8 text-center">
                      <p className="text-xs text-muted/60">Aucun champ dans cette section.</p>
                      {isFullAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddModal({ sectionKey: activeSection });
                            setNewFieldKey('');
                            setNewFieldLabel('');
                            setNewFieldType('text');
                          }}
                          className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition"
                        >
                          + Ajouter un champ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted/60">Sélectionnez une section</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Add Field Modal ─── */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-cream">
                Ajouter un champ
              </h3>
              <button
                type="button"
                onClick={() => setAddModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:text-cream transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Clé du champ <span className="text-muted/60">(identifiant unique, sans espaces)</span>
              </label>
              <input
                type="text"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
                placeholder="ex: hero_subtitle"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Libellé <span className="text-muted/60">(nom affiché dans le formulaire)</span>
              </label>
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
                placeholder="ex: Sous-titre du héro"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Type de contenu</label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as ContentType)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                <option value="text">Texte</option>
                <option value="html">HTML</option>
                <option value="image_url">Image (upload + URL R2)</option>
                <option value="url">URL / Lien</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddModal(null)}
                className="px-4 py-2 text-sm text-muted hover:text-cream rounded-xl border border-line transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleAddField()}
                className="btn-gold px-5 py-2 text-sm font-medium rounded-xl transition"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}