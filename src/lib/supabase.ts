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
} from '../types';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

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
};

// ─── Generic fetcher ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTable<T>(
  table: string,
  query?: (q: any) => any,
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let builder: any = supabase.from(table).select('*');
  if (query) {
    builder = query(builder);
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