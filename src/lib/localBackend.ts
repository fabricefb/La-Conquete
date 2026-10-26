import { ARTICLES } from './articles';
import { DEFAULT_GALLERY } from './gallery';
import { KAKANA } from './extensions';

const PREFIX = '/__local-admin';
const SESSION_KEY = 'lc-local-admin';
const PREFIX_URL = (path: string) => `${PREFIX}${path}`;

export const LOCAL_ADMIN_ID = 'local-admin';

export type LocalRow = Record<string, unknown>;
export type LocalResult<T = unknown> = {
  data: T | T[] | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
  status: number;
  statusText: string;
};

export interface LocalState {
  version: number;
  updated_at: string;
  meta: { seeded?: boolean; seeded_at?: string; [key: string]: unknown };
  tables: Record<string, LocalRow[]>;
}

// ─── Session locale ──────────────────────────────────────────────

export function isLocalBackendAvailable(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
}

export function isLocalAdminSession(): boolean {
  if (!isLocalBackendAvailable()) return false;
  try {
    return window.localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

type LocalAuthEvent = 'SIGNED_IN' | 'SIGNED_OUT';
type LocalAuthUser = ReturnType<typeof localAdminUser>;
type LocalAuthHandler = (event: LocalAuthEvent, user: LocalAuthUser | null) => void;

const authHandlers = new Set<LocalAuthHandler>();

export function onLocalAuthChange(handler: LocalAuthHandler): () => void {
  authHandlers.add(handler);
  return () => { authHandlers.delete(handler); };
}

function emitLocalAuth(event: LocalAuthEvent): void {
  const user = isLocalAdminSession() ? localAdminUser() : null;
  for (const handler of authHandlers) handler(event, user);
}

export function enableLocalAdminSession(): void {
  window.localStorage.setItem(SESSION_KEY, '1');
  emitLocalAuth('SIGNED_IN');
}

export function disableLocalAdminSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
  emitLocalAuth('SIGNED_OUT');
}

function hasCloudConfig(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/* Le stockage local sert dès qu'il n'y a pas de cloud configuré, ou
   quand l'administrateur a explicitement ouvert le mode local. */
export function shouldUseLocalBackend(): boolean {
  if (!isLocalBackendAvailable()) return false;
  return isLocalAdminSession() || !hasCloudConfig();
}

export function localAdminUser() {
  const now = new Date().toISOString();
  return {
    id: LOCAL_ADMIN_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@local',
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'local', providers: ['local'] },
    user_metadata: { full_name: 'Administrateur local' },
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
  };
}

export function localAdminProfile() {
  const now = new Date().toISOString();
  return {
    id: LOCAL_ADMIN_ID,
    email: 'admin@local',
    full_name: 'Administrateur local',
    avatar_url: null,
    phone: null,
    address: null,
    gender: null,
    birth_date: null,
    bio: 'Compte de développement local. Aucune donnée ne part sur Internet.',
    is_admin: true,
    is_blocked: false,
    blocked_at: null,
    blocked_reason: null,
    last_seen_at: now,
    onboarding_completed: true,
    role_level: 5,
    pastor_category: null,
    extension_id: null,
    is_principal_pastor: false,
    created_at: now,
    updated_at: now,
  };
}

// ─── État local persisté sur disque ─────────────────────────────

let stateCache: LocalState | null = null;
let stateLoading: Promise<LocalState> | null = null;
let mutationChain: Promise<unknown> = Promise.resolve();

function emptyState(): LocalState {
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    meta: {},
    tables: {},
  };
}

function normalizeState(raw: unknown): LocalState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyState();
  const candidate = raw as Record<string, unknown>;
  const tables = candidate.tables && typeof candidate.tables === 'object' && !Array.isArray(candidate.tables)
    ? candidate.tables as Record<string, LocalRow[]>
    : {};
  return {
    version: typeof candidate.version === 'number' ? candidate.version : 1,
    updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : new Date().toISOString(),
    meta: candidate.meta && typeof candidate.meta === 'object' && !Array.isArray(candidate.meta)
      ? candidate.meta as LocalState['meta']
      : {},
    tables,
  };
}

function seedRows(): Record<string, LocalRow[]> {
  const now = new Date().toISOString();
  const articles: LocalRow[] = ARTICLES.map((article) => ({
    id: `seed-article-${article.slug}`,
    slug: article.slug,
    title: article.title,
    category: article.category,
    published_at: article.date,
    excerpt: article.excerpt,
    image_url: article.image,
    body: article.body,
    quote_text: article.quote?.text ?? null,
    quote_reference: article.quote?.reference ?? null,
    source_url: article.source ?? null,
    is_featured: Boolean(article.featured),
    is_published: true,
    created_at: now,
    updated_at: now,
  }));
  const media: LocalRow[] = DEFAULT_GALLERY.map((photo, index) => ({
    id: `seed-media-${index + 1}`,
    title: photo.caption,
    description: photo.alt,
    file_url: photo.src,
    thumbnail_url: photo.src,
    file_type: 'image',
    category: 'general',
    sort_order: index,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));
  const locations: LocalRow[] = [{
    ...KAKANA,
    email: null,
    image_url: KAKANA.image_url ?? null,
    description: KAKANA.description ?? null,
    created_at: now,
    updated_at: now,
  }];
  return { articles, media_items: media, locations };
}

function seedState(state: LocalState): boolean {
  if (state.meta.seeded) return false;
  for (const [table, rows] of Object.entries(seedRows())) {
    if (!Array.isArray(state.tables[table]) || state.tables[table].length === 0) {
      state.tables[table] = rows;
    }
  }
  state.meta.seeded = true;
  state.meta.seeded_at = new Date().toISOString();
  return true;
}

/* Le compte local doit toujours rester administrateur, même si l'état a été
   modifié à la main : c'est la seule porte d'entrée du back-office local. */
function ensureLocalAdminProfile(state: LocalState): boolean {
  const rows = Array.isArray(state.tables.user_profiles) ? state.tables.user_profiles : [];
  const existing = rows.find((row) => row.id === LOCAL_ADMIN_ID);
  if (!existing) {
    rows.push(localAdminProfile());
    state.tables.user_profiles = rows;
    return true;
  }
  if (existing.is_admin !== true || existing.is_blocked === true || Number(existing.role_level ?? 0) < 5) {
    Object.assign(existing, { is_admin: true, is_blocked: false, role_level: 5, is_principal_pastor: false });
    return true;
  }
  return false;
}

async function readStateFromServer(): Promise<LocalState> {
  const response = await fetch(PREFIX_URL('/state'), { cache: 'no-store' });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'Back-office local indisponible. Relancez « npm run dev ».');
  }
  const raw = await response.json();
  const state = normalizeState(raw);
  const seeded = seedState(state);
  const profilePatched = ensureLocalAdminProfile(state);
  if (seeded || profilePatched) {
    await writeStateToServer(state);
  }
  return state;
}

async function writeStateToServer(state: LocalState): Promise<void> {
  state.updated_at = new Date().toISOString();
  const response = await fetch(PREFIX_URL('/state'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || 'Impossible d’enregistrer les données locales.');
  }
}

export async function loadLocalState(): Promise<LocalState> {
  if (stateCache) return stateCache;
  if (!stateLoading) {
    stateLoading = readStateFromServer()
      .then((state) => {
        stateCache = state;
        return state;
      })
      .finally(() => { stateLoading = null; });
  }
  return stateLoading;
}

export function mutateLocalState<T>(mutation: (state: LocalState) => T | Promise<T>): Promise<T> {
  const run = mutationChain.then(async () => {
    const state = await loadLocalState();
    try {
      const result = await mutation(state);
      await writeStateToServer(state);
      return result;
    } catch (error) {
      stateCache = null;
      throw error;
    }
  });
  mutationChain = run.then(() => undefined, () => undefined);
  return run;
}

export async function downloadLocalBackup(): Promise<void> {
  const state = await loadLocalState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `la-conquete-local-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ─── Recherche locale (petit sous-ensemble compatible Supabase) ──

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
interface Filter { column: string; operator: FilterOperator; value: unknown }
interface OrFilter { groups: Array<{ column: string; operator: FilterOperator; value: unknown }> }
interface OrderRule { column: string; ascending: boolean }

function valueMatches(actual: unknown, operator: FilterOperator, expected: unknown): boolean {
  if (operator === 'is') {
    return expected === null ? actual == null : actual === expected;
  }
  if (operator === 'in') {
    return Array.isArray(expected) && expected.some((entry) => entry === actual);
  }
  if (operator === 'like' || operator === 'ilike') {
    const pattern = String(expected ?? '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.');
    const flags = operator === 'ilike' ? 'i' : '';
    return new RegExp(`^${pattern}$`, flags).test(String(actual ?? ''));
  }
  if (operator === 'eq') return actual === expected;
  if (operator === 'neq') return actual !== expected;
  if (actual == null) return false;
  if (operator === 'gt') return String(actual) > String(expected ?? '');
  if (operator === 'gte') return String(actual) >= String(expected ?? '');
  if (operator === 'lt') return String(actual) < String(expected ?? '');
  if (operator === 'lte') return String(actual) <= String(expected ?? '');
  return false;
}

function parseOrExpression(expression: string): OrFilter {
  const groups: OrFilter['groups'] = [];
  for (const part of expression.split(',')) {
    const match = part.trim().match(/^([^.]+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\.(.*)$/);
    if (!match) continue;
    let value: unknown = match[3];
    if (match[2] === 'is' && value === 'null') value = null;
    if (match[2] === 'in') {
      value = String(value).replace(/^\(|\)$/g, '').split(',').map((entry) => entry.replace(/^"|"$/g, ''));
    }
    groups.push({ column: match[1], operator: match[2] as FilterOperator, value });
  }
  return { groups };
}

function compareRows(a: LocalRow, b: LocalRow, orders: OrderRule[]): number {
  for (const order of orders) {
    const left = a[order.column];
    const right = b[order.column];
    if (left == null && right == null) continue;
    if (left == null) return order.ascending ? 1 : -1;
    if (right == null) return order.ascending ? -1 : 1;
    if (left === right) continue;
    const result = String(left) < String(right) ? -1 : 1;
    return order.ascending ? result : -result;
  }
  return 0;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type Action = 'select' | 'insert' | 'upsert' | 'update' | 'delete';

export class LocalQuery<T = unknown> implements PromiseLike<LocalResult<T>> {
  private table: string;
  private action: Action = 'select';
  private payload: LocalRow | LocalRow[] | null = null;
  private options: { onConflict?: string } | undefined;
  private filters: Filter[] = [];
  private orFilters: OrFilter[] = [];
  private orders: OrderRule[] = [];
  private maxRows: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';
  private returnRows = false;
  private countMode: 'exact' | 'planned' | 'estimated' | null = null;
  private headOnly = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    if (this.action !== 'select') this.returnRows = true;
    this.countMode = options?.count ?? null;
    this.headOnly = Boolean(options?.head);
    return this;
  }

  insert(values: LocalRow | LocalRow[]): this {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  upsert(values: LocalRow | LocalRow[], options?: { onConflict?: string }): this {
    this.action = 'upsert';
    this.payload = values;
    this.options = options;
    return this;
  }

  update(values: LocalRow): this {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  like(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'like', value });
    return this;
  }

  ilike(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'ilike', value });
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  match(values: Record<string, unknown>): this {
    for (const [column, value] of Object.entries(values)) this.eq(column, value);
    return this;
  }

  or(expression: string): this {
    this.orFilters.push(parseOrExpression(expression));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number): this {
    this.maxRows = count;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  single(): this {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle(): this {
    this.singleMode = 'maybe';
    return this;
  }

  then<TResult1 = LocalResult<T>, TResult2 = never>(
    onfulfilled?: ((value: LocalResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private matches(row: LocalRow): boolean {
    for (const filter of this.filters) {
      if (!valueMatches(row[filter.column], filter.operator, filter.value)) return false;
    }
    for (const group of this.orFilters) {
      if (!group.groups.some((entry) => valueMatches(row[entry.column], entry.operator, entry.value))) return false;
    }
    return true;
  }

  private finish(rows: LocalRow[], count: number | null, singleAllowed = true): LocalResult<T> {
    if (this.headOnly) {
      return { data: null, error: null, count: this.countMode ? count : null, status: 200, statusText: 'OK' };
    }
    if (this.singleMode !== 'none' && singleAllowed) {
      if (rows.length === 0) {
        if (this.singleMode === 'maybe') return { data: null, error: null, status: 200, statusText: 'OK' };
        return {
          data: null,
          error: { message: 'La requête n’a renvoyé aucune ligne.', code: 'PGRST116' },
          status: 406,
          statusText: 'Not Acceptable',
        };
      }
      if (rows.length > 1) {
        return {
          data: null,
          error: { message: 'La requête a renvoyé plusieurs lignes.', code: 'PGRST116' },
          status: 406,
          statusText: 'Not Acceptable',
        };
      }
      return { data: structuredClone(rows[0]) as T, error: null, status: 200, statusText: 'OK' };
    }
    return {
      data: structuredClone(rows) as T[],
      error: null,
      count: this.countMode ? count : null,
      status: 200,
      statusText: 'OK',
    };
  }

  private fail(error: unknown): LocalResult<T> {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Erreur locale inconnue.' },
      count: null,
      status: 400,
      statusText: 'Bad Request',
    };
  }

  private async execute(): Promise<LocalResult<T>> {
    try {
      if (this.action === 'select') {
        await mutationChain.catch(() => undefined);
        const state = await loadLocalState();
        const existing = state.tables[this.table] ?? [];
        const rows = existing.filter((row) => this.matches(row)).sort((a, b) => compareRows(a, b, this.orders));
        let sliced = rows;
        if (this.rangeStart != null) sliced = sliced.slice(this.rangeStart, (this.rangeEnd ?? sliced.length) + 1);
        if (this.maxRows != null) sliced = sliced.slice(0, this.maxRows);
        return this.finish(sliced, rows.length);
      }

      return await mutateLocalState((state) => {
        const existing = state.tables[this.table] ?? [];

        if (this.action === 'insert' || this.action === 'upsert') {
          const incoming = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
          const created: LocalRow[] = [];
          const now = new Date().toISOString();
          for (const source of incoming) {
            const row: LocalRow = { ...source };
            if (!row.id) row.id = makeId();
            if (!row.created_at) row.created_at = now;
            if (!row.updated_at) row.updated_at = now;
            if (this.action === 'upsert') {
              const conflictColumns = (this.options?.onConflict ?? 'id').split(',').map((c) => c.trim()).filter(Boolean);
              const target = existing.find((candidate) => conflictColumns.every((column) => row[column] != null && candidate[column] === row[column]));
              if (target) {
                Object.assign(target, row, { id: target.id, created_at: target.created_at ?? row.created_at, updated_at: now });
                created.push(target);
                continue;
              }
            }
            existing.push(row);
            created.push(row);
          }
          state.tables[this.table] = existing;
          return this.returnRows || this.singleMode !== 'none'
            ? this.finish(created, created.length, true)
            : { data: null, error: null, count: null, status: 201, statusText: 'Created' } as LocalResult<T>;
        }

        if (this.action === 'update') {
          const changes = this.payload ?? {};
          const updated: LocalRow[] = [];
          for (const row of existing) {
            if (!this.matches(row)) continue;
            Object.assign(row, changes, { updated_at: changes.updated_at ?? new Date().toISOString() });
            updated.push(row);
          }
          return this.returnRows || this.singleMode !== 'none'
            ? this.finish(updated, updated.length, true)
            : { data: null, error: null, count: null, status: 204, statusText: 'No Content' } as LocalResult<T>;
        }

        const removed = existing.filter((row) => this.matches(row));
        state.tables[this.table] = existing.filter((row) => !this.matches(row));
        return this.returnRows
          ? this.finish(removed, removed.length, false)
          : { data: null, error: null, count: null, status: 204, statusText: 'No Content' } as LocalResult<T>;
      });
    } catch (error) {
      return this.fail(error);
    }
  }
}

// ─── Stockage local ─────────────────────────────────────────────

const uploadedUrls = new Map<string, string>();

export async function uploadLocalFile(file: File, folder = 'images'): Promise<string> {
  const response = await fetch(
    PREFIX_URL(`/upload?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(file.name)}`),
    {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file,
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || 'Envoi local impossible.');
  }
  const data = await response.json() as { url: string; path: string };
  uploadedUrls.set(data.path, data.url);
  return data.url;
}

/* Le code Supabase appelle `upload()` puis `getPublicUrl(chemin)` : on garde
   donc l'association entre le chemin demandé et l'URL réelle du fichier. */
export function rememberLocalPublicPath(requestedPath: string, url: string): void {
  uploadedUrls.set(requestedPath, url);
}

export function localPublicUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('/') || path.startsWith('http://') || path.startsWith('https://')) return path;
  return uploadedUrls.get(path) ?? PREFIX_URL(`/uploads/${path}`);
}

// ─── Stubs realtime ─────────────────────────────────────────────

export function localChannel() {
  const channel = {
    __local: true as const,
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => Promise.resolve('ok'),
  };
  return channel;
}

export async function localSignOut(): Promise<{ error: null }> {
  disableLocalAdminSession();
  return { error: null };
}
