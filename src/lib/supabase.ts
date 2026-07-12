import { createClient } from '@supabase/supabase-js';
import type {
  Location,
  ChurchEvent,
  SiteSetting,
  PageContent,
  Ministry,
  MediaItem,
  Testimonial,
  ContactMessage,
  ThemeSettings,
  UserProfile,
  Department,
  Position,
  Pastor,
  Converti,
  ConvertiPipelineStage,
  ConvertiTimeline,
  EventAssignment,
  EventMinute,
  InventoryItem,
  InventoryReservation,
  CelluleMaison,
  ZoneEvangelisation,
  PrayerRequest,
  PrayerRequestStatus,
  PrayerRequestVisibility,
  CommunicationMessage,
  MediaLibraryItem,
  MissionReport,
  MissionFinance,
  ImpactCounter,
  PastoralAlert,
  PastorSchedule,
  VisitRequest,
  SpiritualAssessment,
  NotificationItem,
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If env vars are missing, create a dummy client that won't crash
// but all queries will gracefully return empty results.
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDYzNjEwMTMsImV4cCI6MTk2MTkzNzAxM30.placeholder', {
      auth: { persistSession: false, autoRefreshToken: false },
    });

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// ─── Re-export all types from a single import point ──────────────
export type {
  Location,
  ChurchEvent,
  SiteSetting,
  PageContent,
  Ministry,
  MediaItem,
  Testimonial,
  ContactMessage,
  ThemeSettings,
  UserProfile,
  Department,
  Position,
  Pastor,
};

// ─── Generic fetcher ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTable<T>(
  table: string,
  query?: (q: any) => any,
): Promise<T[]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTable<T>(
  query: any,
): Promise<T[]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTable<T>(
  tableOrQuery: string | any,
  query?: (q: any) => any,
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let builder: any;
  if (typeof tableOrQuery === 'string') {
    builder = supabase.from(tableOrQuery).select('*');
    if (query) {
      builder = query(builder);
    }
  } else {
    builder = tableOrQuery;
  }
  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

// ─── Fetch helpers typed per table ───────────────────────────────
export const db = {
  // Settings
  async getSettings(): Promise<SiteSetting[]> {
    return fetchTable<SiteSetting>('site_settings', (q) => q.order('sort_order'));
  },
  async getSetting(key: string): Promise<string> {
    const { data } = await supabase.from('site_settings').select('value').eq('key', key).single();
    return data?.value ?? '';
  },
  async upsertSetting(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
  },

  // Page contents
  async getPageContents(page: string): Promise<PageContent[]> {
    const { data, error } = await supabase
      .from('page_contents')
      .select('*')
      .eq('page', page)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as PageContent[];
  },
  async getAllPageContents(): Promise<PageContent[]> {
    return fetchTable<PageContent>('page_contents', (q) => q.order('page, sort_order'));
  },

  // Locations
  async getActiveLocations(): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Location[];
  },
  async getAllLocations(): Promise<Location[]> {
    return fetchTable<Location>('locations', (q) => q.order('sort_order'));
  },

  // Events
  async getEvents(): Promise<ChurchEvent[]> {
    return fetchTable<ChurchEvent>('events', (q) => q.order('event_date'));
  },

  // Ministries
  async getActiveMinistries(): Promise<Ministry[]> {
    const { data, error } = await supabase
      .from('ministries')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Ministry[];
  },
  async getAllMinistries(): Promise<Ministry[]> {
    return fetchTable<Ministry>('ministries', (q) => q.order('sort_order'));
  },

  // Media
  async getActiveMedia(category?: string): Promise<MediaItem[]> {
    let query = supabase
      .from('media_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (category && category !== 'Tous') {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as MediaItem[];
  },
  async getAllMedia(): Promise<MediaItem[]> {
    return fetchTable<MediaItem>('media_items', (q) => q.order('sort_order'));
  },

  // Testimonials
  async getActiveTestimonials(): Promise<Testimonial[]> {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Testimonial[];
  },
  async getAllTestimonials(): Promise<Testimonial[]> {
    return fetchTable<Testimonial>('testimonials', (q) => q.order('sort_order'));
  },

  // Contact messages
  async getMessages(): Promise<ContactMessage[]> {
    return fetchTable<ContactMessage>('contact_messages', (q) => q.order('created_at', { ascending: false }));
  },

  // Theme
  async getThemeSettings(): Promise<ThemeSettings | null> {
    const { data, error } = await supabase.from('theme_settings').select('*').eq('id', 1).single();
    if (error) return null;
    return data as ThemeSettings;
  },
  async updateThemeSettings(settings: Partial<ThemeSettings>): Promise<void> {
    const { error } = await supabase
      .from('theme_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) throw new Error(error.message);
  },

  // Profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data as UserProfile;
  },
  async isAdmin(userId: string): Promise<boolean> {
    const profile = await db.getProfile(userId);
    return profile?.is_admin ?? false;
  },

  // Contact form submission
  async submitContactMessage(name: string, email: string, subject: string, message: string): Promise<void> {
    const { error } = await supabase.from('contact_messages').insert({ name, email, subject, message });
    if (error) throw new Error(error.message);
  },

  // ── ERP: Departments ──────────────────────────────────────────
  async getActiveDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments').select('*').eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Department[];
  },
  async getDepartmentPositions(departmentId: string): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions').select('*').eq('department_id', departmentId).eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Position[];
  },

  // ── ERP: Onboarding ───────────────────────────────────────────
  async completeOnboarding(): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    // Stratégie 1 : tentative normale avec onboarding_completed
    const { error: err1 } = await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (!err1) {
      // Succès → also set localStorage as safety net
      localStorage.setItem('lc_onboarding_done', userId);
      return;
    }

    // Stratégie 2 : colonne manquante → essayer juste updated_at
    if (err1.message.includes('does not exist') || err1.code === '42703') {
      console.warn('Colonne onboarding_completed absente, fallback…');
      const { error: err2 } = await supabase
        .from('user_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId);

      // Même si err2 échoue, on débloque l'utilisateur via localStorage
      localStorage.setItem('lc_onboarding_done', userId);
      if (err2) console.warn('Fallback onboarding aussi échoué, débloqué via localStorage');
      return;
    }

    // Autre erreur → quand même débloquer via localStorage
    localStorage.setItem('lc_onboarding_done', userId);
    console.warn('completeOnboarding erreur, débloqué via localStorage:', err1.message);
  },
  async updateProfile(updates: Partial<{ full_name: string; phone: string; address: string; gender: string; birth_date: string }>): Promise<void> {
    const { error } = await supabase
      .from('user_profiles').update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', (await supabase.auth.getUser()).data.user.id);
    if (error) throw new Error(error.message);
  },
  async requestRoleUpgrade(requestedRole: string, departmentId?: string, positionId?: string, motivation?: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('role_requests').insert({
        user_id: user.id,
        requested_role: requestedRole,
        department_id: departmentId || null,
        position_id: positionId || null,
        motivation: motivation || '',
      });
    if (error) throw new Error(error.message);
  },
  async joinDepartment(departmentId: string, positionId?: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('department_members').upsert({
        user_id: user.id,
        department_id: departmentId,
        position_id: positionId || null,
      }, { onConflict: 'user_id,department_id' });
    if (error) throw new Error(error.message);
  },

  // ── ERP: Prayer Requests ──────────────────────────────────────
  async submitPrayerRequest(content: string, isAnonymous: boolean, isConfidential: boolean): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('prayer_requests').insert({
        user_id: isAnonymous ? null : user.id,
        author_name: user.user_metadata?.full_name || user.email || 'Anonyme',
        content,
        is_anonymous: isAnonymous,
        is_confidential: isConfidential,
      });
    if (error) throw new Error(error.message);
  },

  // ── Pastors ──────────────────────────────────────────────────
  async getActivePastors(): Promise<Pastor[]> {
    const { data, error } = await supabase
      .from('pastors').select('*').eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return (data ?? []) as Pastor[];
  },
  async getAllPastors(): Promise<Pastor[]> {
    return fetchTable<Pastor>('pastors', (q) => q.order('sort_order'));
  },

  // ── CRM: Convertis Pipeline ────────────────────────────────────
  async getConvertis(stage?: ConvertiPipelineStage, evangelistId?: string): Promise<Converti[]> {
    let query = supabase.from('convertis').select('*').order('pipeline_updated_at', { ascending: false });
    if (stage) query = query.eq('pipeline_stage', stage);
    if (evangelistId) query = query.eq('evangelist_id', evangelistId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Converti[];
  },
  async upsertConverti(data: Partial<Converti> & { first_name: string; last_name: string }): Promise<Converti> {
    const { data: result, error } = await supabase
      .from('convertis')
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as Converti;
  },
  async advanceConvertiStage(id: string, stage: ConvertiPipelineStage, notes: string, doneBy: string): Promise<void> {
    const { error } = await supabase
      .from('convertis')
      .update({ pipeline_stage: stage, pipeline_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    // Insert timeline entry
    await supabase.from('converti_timeline').insert({
      converti_id: id,
      stage_to: stage,
      action: `Avancé à: ${stage}`,
      notes,
      done_by: doneBy,
    });
  },
  async getConvertiTimeline(convertiId: string): Promise<ConvertiTimeline[]> {
    const { data, error } = await supabase
      .from('converti_timeline')
      .select('*')
      .eq('converti_id', convertiId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ConvertiTimeline[];
  },

  // ═══════════════════════════════════════════════
  // MODULE 1 — Programs & Events Operations
  // ═══════════════════════════════════════════════

  getEventAssignments(eventId?: string) {
    let q = supabase.from('event_assignments').select('*').order('created_at', { ascending: false });
    if (eventId) q = q.eq('event_id', eventId);
    return fetchTable<EventAssignment>(q);
  },

  upsertEventAssignment(data: Partial<EventAssignment> & { event_id: string; user_id: string }) {
    return supabase.from('event_assignments').upsert(data, { onConflict: 'event_id,user_id' }).select().single();
  },

  deleteEventAssignment(id: string) {
    return supabase.from('event_assignments').delete().eq('id', id);
  },

  getEventMinutes(eventId: string) {
    return fetchTable<EventMinute>(supabase.from('event_minutes').select('*').eq('event_id', eventId).order('sort_order', { ascending: true }));
  },

  upsertEventMinute(data: Partial<EventMinute>) {
    if (data.id) return supabase.from('event_minutes').update(data).eq('id', data.id).select().single();
    return supabase.from('event_minutes').insert(data).select().single();
  },

  deleteEventMinute(id: string) {
    return supabase.from('event_minutes').delete().eq('id', id);
  },

  getInventoryItems(category?: string) {
    let q = supabase.from('inventory_items').select('*').order('name');
    if (category) q = q.eq('category', category);
    return fetchTable<InventoryItem>(q);
  },

  upsertInventoryItem(data: Partial<InventoryItem>) {
    if (data.id) return supabase.from('inventory_items').update(data).eq('id', data.id).select().single();
    return supabase.from('inventory_items').insert(data).select().single();
  },

  deleteInventoryItem(id: string) {
    return supabase.from('inventory_items').delete().eq('id', id);
  },

  getInventoryReservations(itemId?: string) {
    let q = supabase.from('inventory_reservations').select('*').order('created_at', { ascending: false });
    if (itemId) q = q.eq('item_id', itemId);
    return fetchTable<InventoryReservation>(q);
  },

  upsertInventoryReservation(data: Partial<InventoryReservation>) {
    if (data.id) return supabase.from('inventory_reservations').update(data).eq('id', data.id).select().single();
    return supabase.from('inventory_reservations').insert(data).select().single();
  },

  // ═══════════════════════════════════════════════
  // MODULE 2 — CRM Convertis (additional)
  // ═══════════════════════════════════════════════

  getConvertiById(id: string) {
    return supabase.from('convertis').select('*').eq('id', id).single();
  },

  deleteConverti(id: string) {
    return supabase.from('convertis').delete().eq('id', id);
  },

  getCellules() {
    return fetchTable<CelluleMaison>(supabase.from('cellules_maison').select('*').order('name'));
  },

  upsertCellule(data: Partial<CelluleMaison>) {
    if (data.id) return supabase.from('cellules_maison').update(data).eq('id', data.id).select().single();
    return supabase.from('cellules_maison').insert({ ...data, member_count: 0, created_at: new Date().toISOString() }).select().single();
  },

  getZonesEvangelisation() {
    return fetchTable<ZoneEvangelisation>(supabase.from('zones_evangelisation').select('*').order('name'));
  },

  // ═══════════════════════════════════════════════
  // MODULE 3 — Communication
  // ═══════════════════════════════════════════════

  getPrayerRequests(status?: PrayerRequestStatus, visibility?: PrayerRequestVisibility) {
    let q = supabase.from('prayer_requests').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (visibility) q = q.eq('visibility', visibility);
    return fetchTable<PrayerRequest>(q);
  },

  upsertPrayerRequest(data: Partial<PrayerRequest>) {
    if (data.id) return supabase.from('prayer_requests').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id).select().single();
    return supabase.from('prayer_requests').insert({ ...data, status: 'nouveau', prayer_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
  },

  updatePrayerRequestStatus(id: string, status: PrayerRequestStatus, response?: string, respondedBy?: string) {
    const update: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (response) { update.response = response; update.responded_by = respondedBy; update.responded_at = new Date().toISOString(); }
    if (status === 'en_priere') {
      return supabase.from('prayer_requests').select('prayer_count').eq('id', id).single().then(({ data }) =>
        supabase.from('prayer_requests').update({ ...update, prayer_count: (data?.prayer_count || 0) + 1 }).eq('id', id).select().single()
      );
    }
    return supabase.from('prayer_requests').update(update).eq('id', id).select().single();
  },

  getCommunicationMessages(status?: string) {
    let q = supabase.from('communication_messages').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    return fetchTable<CommunicationMessage>(q);
  },

  upsertCommunicationMessage(data: Partial<CommunicationMessage>) {
    if (data.id) return supabase.from('communication_messages').update(data).eq('id', data.id).select().single();
    return supabase.from('communication_messages').insert({ ...data, status: 'draft', created_at: new Date().toISOString() }).select().single();
  },

  getMediaLibrary(category?: string, accessRole?: string) {
    let q = supabase.from('media_library').select('*').order('created_at', { ascending: false });
    if (category) q = q.eq('category', category);
    return fetchTable<MediaLibraryItem>(q);
  },

  upsertMediaLibraryItem(data: Partial<MediaLibraryItem>) {
    if (data.id) return supabase.from('media_library').update(data).eq('id', data.id).select().single();
    return supabase.from('media_library').insert({ ...data, download_count: 0, created_at: new Date().toISOString() }).select().single();
  },

  deleteMediaLibraryItem(id: string) {
    return supabase.from('media_library').delete().eq('id', id);
  },

  incrementMediaDownload(id: string) {
    return supabase.from('media_library').select('download_count').eq('id', id).single().then(({ data }) =>
      supabase.from('media_library').update({ download_count: (data?.download_count || 0) + 1 }).eq('id', id)
    );
  },

  createPrayerRequest(data: Partial<PrayerRequest>) {
    return this.upsertPrayerRequest(data);
  },

  createCommunicationMessage(data: Partial<CommunicationMessage>) {
    return this.upsertCommunicationMessage(data);
  },

  createMediaLibraryItem(data: Partial<MediaLibraryItem>) {
    return this.upsertMediaLibraryItem(data);
  },

  getNewsletters() {
    return fetchTable<any>(supabase.from('newsletters').select('*').order('created_at', { ascending: false }).limit(50));
  },

  createNewsletter(data: Record<string, any>) {
    return supabase.from('newsletters').insert({ ...data, status: 'draft', created_at: new Date().toISOString() }).select().single();
  },

  // ═══════════════════════════════════════════════
  // MODULE 4 — Rapports & Statistiques
  // ═══════════════════════════════════════════════

  getMissionReports(status?: string) {
    let q = supabase.from('mission_reports').select('*').order('report_date', { ascending: false });
    if (status) q = q.eq('status', status);
    return fetchTable<MissionReport>(q);
  },

  upsertMissionReport(data: Partial<MissionReport>) {
    if (data.id) return supabase.from('mission_reports').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id).select().single();
    return supabase.from('mission_reports').insert({ ...data, status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
  },

  getMissionFinances(reportId?: string) {
    let q = supabase.from('mission_finances').select('*').order('created_at', { ascending: false });
    if (reportId) q = q.eq('mission_report_id', reportId);
    return fetchTable<MissionFinance>(q);
  },

  upsertMissionFinance(data: Partial<MissionFinance>) {
    if (data.id) return supabase.from('mission_finances').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id).select().single();
    return supabase.from('mission_finances').insert({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
  },

  getImpactCounters(period?: string) {
    let q = supabase.from('impact_counters').select('*').order('period_value', { ascending: false }).limit(50);
    if (period) q = q.eq('period', period);
    return fetchTable<ImpactCounter>(q);
  },

  upsertImpactCounter(data: Partial<ImpactCounter>) {
    if (data.id) return supabase.from('impact_counters').update(data).eq('id', data.id).select().single();
    return supabase.from('impact_counters').insert({ ...data, created_at: new Date().toISOString() }).select().single();
  },

  getDashboardStats() {
    return supabase.rpc('get_dashboard_stats');
  },

  // ═══════════════════════════════════════════════
  // MODULE 5 — Espace Pastoral
  // ═══════════════════════════════════════════════

  getPastoralAlerts(status?: string, type?: string) {
    let q = supabase.from('pastoral_alerts').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (type) q = q.eq('type', type);
    return fetchTable<PastoralAlert>(q);
  },

  upsertPastoralAlert(data: Partial<PastoralAlert>) {
    if (data.id) return supabase.from('pastoral_alerts').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id).select().single();
    return supabase.from('pastoral_alerts').insert({ ...data, status: 'ouverte', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
  },

  updatePastoralAlertStatus(id: string, status: string, resolvedBy?: string, resolutionNotes?: string) {
    const update: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (resolvedBy) { update.resolved_by = resolvedBy; update.resolved_at = new Date().toISOString(); }
    if (resolutionNotes) update.resolution_notes = resolutionNotes;
    return supabase.from('pastoral_alerts').update(update).eq('id', id).select().single();
  },

  getPastorSchedule(pastorId?: string, startDate?: string, endDate?: string) {
    let q = supabase.from('pastor_schedule').select('*').order('date', { ascending: true });
    if (pastorId) q = q.eq('pastor_id', pastorId);
    if (startDate) q = q.gte('date', startDate);
    if (endDate) q = q.lte('date', endDate);
    return fetchTable<PastorSchedule>(q);
  },

  upsertPastorSchedule(data: Partial<PastorSchedule>) {
    if (data.id) return supabase.from('pastor_schedule').update(data).eq('id', data.id).select().single();
    return supabase.from('pastor_schedule').insert({ ...data, created_at: new Date().toISOString() }).select().single();
  },

  deletePastorSchedule(id: string) {
    return supabase.from('pastor_schedule').delete().eq('id', id);
  },

  getVisitRequests(status?: string, assignedTo?: string) {
    let q = supabase.from('visit_requests').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (assignedTo) q = q.eq('assigned_to', assignedTo);
    return fetchTable<VisitRequest>(q);
  },

  upsertVisitRequest(data: Partial<VisitRequest>) {
    if (data.id) return supabase.from('visit_requests').update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id).select().single();
    return supabase.from('visit_requests').insert({ ...data, status: 'en_attente', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
  },

  getSpiritualAssessments(userId?: string) {
    let q = supabase.from('spiritual_assessments').select('*').order('created_at', { ascending: false });
    if (userId) q = q.eq('user_id', userId);
    return fetchTable<SpiritualAssessment>(q);
  },

  upsertSpiritualAssessment(data: Partial<SpiritualAssessment>) {
    if (data.id) return supabase.from('spiritual_assessments').update(data).eq('id', data.id).select().single();
    const { overall_score } = data;
    if (overall_score === undefined) {
      const scores = [data.prayer_life, data.bible_study, data.fellowship, data.evangelism, data.giving, data.service].filter((s): s is number => s !== undefined);
      data.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    return supabase.from('spiritual_assessments').insert({ ...data, created_at: new Date().toISOString() }).select().single();
  },

  // ═══════════════════════════════════════════════
  // Notifications
  // ═══════════════════════════════════════════════

  getNotifications(userId: string) {
    return fetchTable<NotificationItem>(supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50));
  },

  markNotificationRead(id: string) {
    return supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  markAllNotificationsRead(userId: string) {
    return supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  },

  createNotification(userId: string, title: string, body: string, type: string, link?: string, refTable?: string, refId?: string) {
    return supabase.from('notifications').insert({ user_id: userId, title, body, type, is_read: false, link, ref_table: refTable, ref_id: refId, created_at: new Date().toISOString() });
  },

  // ═══════════════════════════════════════════════
  // Profiles & Members
  // ═══════════════════════════════════════════════

  getProfiles(roleLevel?: number, departmentId?: string) {
    let q = supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (roleLevel !== undefined) q = q.eq('role_level', roleLevel);
    if (departmentId) q = q.eq('extension_id', departmentId);
    return fetchTable<UserProfile>(q);
  },

  updateUserRole(userId: string, roleLevel: number, reason?: string) {
    return supabase.from('user_profiles').update({ role_level: roleLevel, updated_at: new Date().toISOString() }).eq('id', userId).select().single();
  },

  // ═══════════════════════════════════════════════
  // Creneaux (Serviteurs Schedule System)
  // ═══════════════════════════════════════════════

  getCreneaux(status?: string) {
    let q = supabase.from('creneaux').select('*').order('date', { ascending: false }).order('start_time');
    if (status) q = q.eq('status', status);
    return fetchTable<any>(q);
  },

  getCreneauResponses(creneauId?: string) {
    let q = supabase.from('creneau_responses').select('*').order('responded_at', { ascending: false });
    if (creneauId) q = q.eq('creneau_id', creneauId);
    return fetchTable<any>(q);
  },

  respondToCreneau(creneauId: string, responderId: string, responderName: string | null, status: string, notes?: string) {
    return supabase.from('creneau_responses').upsert({
      creneau_id: creneauId,
      responder_id: responderId,
      responder_name: responderName,
      status,
      notes: notes || '',
      responded_at: new Date().toISOString(),
      completed_at: status === 'termine' ? new Date().toISOString() : null,
    }, { onConflict: 'creneau_id,responder_id' }).select().single();
  },

  // ═══════════════════════════════════════════════
  // Event Comments
  // ═══════════════════════════════════════════════

  getEventComments(eventId: string) {
    return fetchTable<any>(supabase.from('event_comments').select('*').eq('event_id', eventId).order('created_at', { ascending: true }));
  },

  addEventComment(eventId: string, authorName: string, content: string, userId?: string) {
    return supabase.from('event_comments').insert({
      event_id: eventId,
      user_id: userId || null,
      author_name: authorName,
      content,
    }).select().single();
  },

  deleteEventComment(id: string) {
    return supabase.from('event_comments').delete().eq('id', id);
  },
};

// ─── Content helper: build a map from page_contents rows ─────────
export function buildContentMap(contents: PageContent[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of contents) {
    map[`${c.section_key}.${c.field_key}`] = c.value;
  }
  return map;
}

// ─── Content helper: get a value with fallback ───────────────────
export function getContent(map: Record<string, string>, section: string, field: string, fallback: string): string {
  return map[`${section}.${field}`] || fallback;
}

// ─── Settings helper: build a map from settings rows ─────────────
export function buildSettingsMap(settings: SiteSetting[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map;
}