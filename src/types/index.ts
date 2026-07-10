/* ═══════════════════════════════════════════════════════════════════
   Types globaux — Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */

// ─── Navigation ──────────────────────────────────────────────────
export type Page = 'home' | 'about' | 'activities' | 'events' | 'media' | 'contact' | 'admin';
export type Theme = 'dark' | 'light';

// ─── Auth & Profile ──────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Site Settings ───────────────────────────────────────────────
export interface SiteSetting {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'url' | 'json' | 'boolean' | 'number';
  category: 'general' | 'contact' | 'social' | 'seo';
  label: string;
  description: string | null;
  sort_order: number;
  updated_at: string;
}

// ─── Page Contents ───────────────────────────────────────────────
export interface PageContent {
  id: string;
  page: Page | 'home' | 'about' | 'activities' | 'events' | 'media' | 'contact';
  section_key: string;
  field_key: string;
  value: string;
  type: 'text' | 'html' | 'image_url' | 'url';
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Locations ───────────────────────────────────────────────────
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  service_times: string | null;
  pastor_name: string | null;
  is_main: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Events ──────────────────────────────────────────────────────
export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  category: 'Cultes' | 'Missions' | 'Jeunesse' | 'Communion';
  image_url: string;
  event_date: string;
  location: string;
  is_live: boolean;
  is_featured: boolean;
  created_at: string;
}

// ─── Ministries ──────────────────────────────────────────────────
export type AccentColor = 'gold' | 'ember';

export interface Ministry {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  schedule: string;
  image_url: string | null;
  accent_color: AccentColor;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Media ───────────────────────────────────────────────────────
export type MediaType = 'image' | 'video' | 'audio';
export type MediaCategory = 'sermon' | 'event' | 'worship' | 'community' | 'general';

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  file_url: string;
  thumbnail_url: string | null;
  file_type: MediaType;
  category: MediaCategory;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Testimonials ────────────────────────────────────────────────
export interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  content: string;
  photo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Contact Messages ────────────────────────────────────────────
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Theme Settings ──────────────────────────────────────────────
export type ButtonStyle = 'pill' | 'rounded' | 'sharp' | 'outline' | 'gradient';
export type CardStyle = 'glass' | 'flat' | 'bordered' | 'shadowed' | 'glass-bordered';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';

export interface ThemeSettings {
  id: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  button_style: ButtonStyle;
  card_style: CardStyle;
  border_radius: BorderRadius;
  title_font: string;
  body_font: string;
  updated_at: string;
}

// ─── Toast ───────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ─── Admin Tabs ──────────────────────────────────────────────────
export type AdminTab =
  | 'dashboard'
  | 'settings'
  | 'contents'
  | 'locations'
  | 'events'
  | 'ministries'
  | 'media'
  | 'messages'
  | 'testimonials'
  | 'theme';