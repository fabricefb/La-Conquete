/* ═══════════════════════════════════════════════════════════════════
   Types globaux — Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */

export type ToastType = 'success' | 'error' | 'info';

// ─── Navigation ──────────────────────────────────────────────────
export type Page = 'home' | 'about' | 'activities' | 'events' | 'media' | 'contact' | 'admin' | 'crm' | 'dashboard' | 'emissions' | 'predications' | 'departments' | 'reports' | 'communication' | 'pastoral';
export type Theme = 'dark' | 'light';

// ─── Auth & Profile ──────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  gender: string | null;
  birth_date: string | null;
  onboarding_completed: boolean;
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

// ─── Notifications ──────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: 'prayer_prayed' | 'service_assigned' | 'service_accepted' | 'service_declined' | 'role_approved' | 'role_rejected' | 'new_post' | 'new_comment' | 'daily_thought' | 'general' | 'visitor_assigned' | 'onboarding_reminder';
  title: string;
  body: string | null;
  link: string | null;
  ref_table: string | null;
  ref_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─── Toast ───────────────────────────────────────────────

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
  | 'assignments'
  | 'ministries'
  | 'media'
  | 'testimonials'
  | 'messages'
  | 'pastors'
  | 'inventory'
  | 'alerts'
  | 'pipeline'
  | 'theme';

// ─── ERP Role System ──────────────────────────────────────────────
export type UserRole = 'visitor' | 'member' | 'servant' | 'chief' | 'pastor' | 'super_admin';

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  accent_color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  department_id: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMember {
  id: string;
  user_id: string;
  department_id: string;
  position_id: string | null;
  joined_at: string;
  is_active: boolean;
}

export interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: UserRole;
  department_id: string | null;
  position_id: string | null;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string;
  created_at: string;
}

export interface PrayerRequest {
  id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  is_anonymous: boolean;
  is_confidential: boolean;
  status: 'received' | 'praying' | 'answered';
  prayed_by: string | null;
  prayed_at: string | null;
  created_at: string;
}

export interface DailyThought {
  id: string;
  author_id: string;
  verse_reference: string;
  verse_text: string;
  reflection: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  pastoral_whatsapp: boolean;
  pastoral_sms: boolean;
  pastoral_call: boolean;
  dept_notifications: boolean;
  prayer_updates: boolean;
  service_reminders: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Pastors ────────────────────────────────────────────────
export interface Pastor {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  thought: string;
  sort_order: number;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═════════════════════════════════════════════════════
// MODULE 1 — Programs & Events (Operations)
// ═════════════════════════════════════════════════════

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: 'culte' | 'mission' | 'jeunesse' | 'communion' | 'emission' | 'predication' | 'reunion' | 'formation';
  event_date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  location_id?: string;
  location_name?: string;
  department_id?: string;
  image_url?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventAssignment {
  id: string;
  event_id: string;
  user_id: string;
  user_name?: string;
  role: 'preacher' | 'intercessor' | 'logistician' | 'worship_leader' | 'singer' | 'usher' | 'sound_tech' | 'camera' | 'other';
  status: 'pending' | 'confirmed' | 'declined';
  notified: boolean;
  created_at: string;
}

export interface EventMinute {
  id: string;
  event_id: string;
  time_slot: string;
  title: string;
  description?: string;
  responsible_id?: string;
  responsible_name?: string;
  sort_order: number;
  is_completed: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'sound' | 'seating' | 'lighting' | 'literature' | 'generators' | 'tents' | 'vehicles' | 'other';
  description?: string;
  quantity_total: number;
  quantity_available: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair' | 'retired';
  location_stored?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryReservation {
  id: string;
  item_id: string;
  item_name?: string;
  event_id: string;
  event_title?: string;
  quantity_reserved: number;
  reserved_by: string;
  reserved_by_name?: string;
  status: 'pending' | 'approved' | 'active' | 'returned' | 'overdue';
  reserved_date: string;
  return_date?: string;
  notes?: string;
  created_at: string;
}

// ═════════════════════════════════════════════════════
// MODULE 2 — Suivi Convertis (CRM Spirituel)
// ═════════════════════════════════════════════════════

export type ConvertiPipelineStage = 
  | 'nouveau'           // Nouveau converti enregistré (Terrain)
  | 'premier_contact'   // Premier contact/appel effectué (sous 48h)
  | 'visite_domicile'   // Visite à domicile validée
  | 'cellule'           // Intégré à une cellule de maison
  | 'cours_bapteme'     // Inscrit aux cours de baptême d'eau
  | 'membre_actif';     // Membre actif de l'église

export interface Converti {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  quartier?: string;
  zone?: string;
  address?: string;
  gender?: 'homme' | 'femme';
  age_range?: 'moins_18' | '18_25' | '26_35' | '36_50' | 'plus_50';
  request_type?: 'priere' | 'conseil' | 'visite' | 'information' | 'relation_aide';
  needs_pastoral_care: boolean;
  evangelist_id?: string;
  evangelist_name?: string;
  mentor_id?: string;
  mentor_name?: string;
  pipeline_stage: ConvertiPipelineStage;
  pipeline_updated_at: string;
  first_contact_date?: string;
  first_contact_by?: string;
  visit_date?: string;
  visit_done: boolean;
  cellule_id?: string;
  cellule_name?: string;
  bapteme_water_date?: string;
  bapteme_saint_esprit: boolean;
  became_member_date?: string;
  notes?: string;
  source: 'evangelisation' | 'croisade' | 'visite' | 'internet' | 'ami' | 'media' | 'autre';
  event_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConvertiTimeline {
  id: string;
  converti_id: string;
  stage_from?: ConvertiPipelineStage;
  stage_to: ConvertiPipelineStage;
  action: string;
  notes?: string;
  done_by: string;
  done_by_name?: string;
  created_at: string;
}

export interface CelluleMaison {
  id: string;
  name: string;
  description?: string;
  leader_id: string;
  leader_name?: string;
  zone?: string;
  quartier?: string;
  address?: string;
  meeting_day: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  meeting_time: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ZoneEvangelisation {
  id: string;
  name: string;
  description?: string;
  coordinator_id?: string;
  coordinator_name?: string;
  converti_count: number;
  potential_score: number; // 1-10
  last_visited?: string;
  is_active: boolean;
  created_at: string;
}

// ═════════════════════════════════════════════════════
// MODULE 3 — Communication & Mobilisation
// ═════════════════════════════════════════════════════

export type PrayerRequestStatus = 'nouveau' | 'en_priere' | 'repondu' | 'suivi_pastoral';
export type PrayerRequestVisibility = 'public' | 'intercesseurs' | 'pastoral' | 'confidentiel';

// PrayerRequest already defined above — skipping duplicate

export interface CommunicationMessage {
  id: string;
  title: string;
  content: string;
  channel: 'sms' | 'whatsapp' | 'email' | 'push' | 'in_app';
  target_type: 'all' | 'equipe' | 'department' | 'cellule' | 'role' | 'custom';
  target_ids: string[];
  target_label: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sent_by: string;
  sent_by_name?: string;
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  delivery_count: number;
  failure_count: number;
  created_at: string;
}

export interface MediaLibraryItem {
  id: string;
  title: string;
  description?: string;
  category: 'tract' | 'guide' | 'affiche' | 'photo' | 'video' | 'document' | 'autre';
  file_url: string;
  thumbnail_url?: string;
  file_type: string;
  file_size?: number;
  access_role: 'admin' | 'pasteur' | 'membre' | 'public';
  department_id?: string;
  tags?: string[];
  download_count: number;
  created_by: string;
  created_at: string;
}

// ═════════════════════════════════════════════════════
// MODULE 4 — Rapports & Statistiques
// ═════════════════════════════════════════════════════

export interface MissionReport {
  id: string;
  event_id?: string;
  event_title?: string;
  zone_id?: string;
  zone_name?: string;
  report_date: string;
  persons_contacted: number;
  decisions_count: number;
  bibles_distributed: number;
  tracts_distributed: number;
  new_contacts_count: number;
  highlights: string;
  challenges: string;
  testimonies?: string;
  photos?: string[];
  reported_by: string;
  reported_by_name?: string;
  status: 'draft' | 'submitted' | 'reviewed';
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MissionFinance {
  id: string;
  mission_report_id?: string;
  event_id?: string;
  event_title?: string;
  budget_allocated: number;
  transport_costs: number;
  material_costs: number;
  special_offering: number;
  total_expenses: number;
  balance: number;
  currency: 'USD' | 'CDF' | 'EUR';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ImpactCounter {
  id: string;
  period: 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee';
  period_value: string; // e.g., '2025-01' for monthly
  persons_contacted: number;
  decisions: number;
  bibles_distributed: number;
  baptisms_water: number;
  baptisms_holy_spirit: number;
  new_active_members: number;
  prayer_requests_answered: number;
  zone_id?: string;
  zone_name?: string;
  department_id?: string;
  created_at: string;
}

// ═════════════════════════════════════════════════════
// MODULE 5 — Espace Pastoral (Supervision)
// ═════════════════════════════════════════════════════

export interface PastoralAlert {
  id: string;
  type: 'ame_en_danger_72h' | 'cas_lourd' | 'retard_integration' | 'autre';
  converti_id: string;
  converti_name?: string;
  description: string;
  severity: 'haute' | 'moyenne' | 'basse';
  status: 'ouverte' | 'en_cours' | 'resolue';
  assigned_to?: string;
  assigned_to_name?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PastorSchedule {
  id: string;
  pastor_id: string;
  pastor_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  type: 'visite' | 'entretien' | 'culte' | 'reunion' | 'formation' | 'personnel' | 'autre';
  title: string;
  description?: string;
  location?: string;
  is_available: boolean; // false = busy, true = available slot
  status: 'planifie' | 'confirme' | 'termine' | 'annule';
  created_at: string;
}

export interface VisitRequest {
  id: string;
  requester_id?: string;
  requester_name?: string;
  requester_phone?: string;
  requester_email?: string;
  beneficiary_name: string;
  beneficiary_phone?: string;
  beneficiary_address: string;
  visit_type: 'pastorale' | 'evangelisation' | 'malade' | 'encouragement' | 'suivi';
  reason?: string;
  urgency: 'basse' | 'normale' | 'haute' | 'urgente';
  preferred_date?: string;
  preferred_time?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  status: 'en_attente' | 'acceptee' | 'planifiee' | 'effectuee' | 'refusee' | 'reprogrammee';
  pastor_notes?: string;
  visited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SpiritualAssessment {
  id: string;
  user_id: string;
  user_name?: string;
  period: string;
  prayer_life: number; // 1-10
  bible_study: number;
  fellowship: number;
  evangelism: number;
  giving: number;
  service: number;
  overall_score: number;
  strengths?: string;
  areas_to_grow?: string;
  notes?: string;
  created_at: string;
}

// ═════════════════════════════════════════════════════
// Dashboard Types
// ═════════════════════════════════════════════════════

export interface DashboardStats {
  total_members: number;
  active_members_month: number;
  new_converts_month: number;
  upcoming_events: number;
  pending_visit_requests: number;
  open_prayer_requests: number;
  convertis_in_pipeline: number;
  unresolved_alerts: number;
  monthly_attendance_avg: number;
  baptisms_this_month: number;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'assignment' | 'reminder' | 'alert' | 'info' | 'visit' | 'prayer';
  is_read: boolean;
  link?: string;
  created_at: string;
}