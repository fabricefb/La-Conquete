import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  Calendar, Plus, Send, Eye, Trash2, ChevronUp, ChevronDown,
  Copy, MessageSquare, CheckCircle, Clock, AlertCircle,
  Loader2, X, RefreshCw, Church, Mic, User, Info,
  AlertTriangle, Timer, Play, FileText,
} from '../../../lib/icons';
import type {
  WorshipService, WorshipServiceType, WorshipServiceStatus,
  WorshipOratorForm, WorshipOratorPoint, WorshipOrderItem,
  WorshipOrderItemType, WorshipFormLink,
} from '../../../types';
import { openWhatsApp } from '../../../lib/whatsapp';

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: 'cultes', label: 'Cultes', Icon: Church },
  { key: 'formulaires', label: 'Formulaires', Icon: Mic },
  { key: 'ordre', label: 'Ordre du culte', Icon: User },
] as const;
type SubTab = typeof SUB_TABS[number]['key'];

/* ═══════════════════════════════════════════════════════════════════
   Constants — Types de cultes avec groupes, heures par défaut
   ═══════════════════════════════════════════════════════════════════ */

interface CulteTypeConfig {
  label: string;
  description: string;
  group: 'hebdomadaire' | 'special';
  dayOfWeek: number;        // 0=Dim, 1=Lun ... 6=Sam
  defaultTime: string;
  endTime: string;
  color: string;            // tailwind text color
}

const WORSHIP_TYPE_CONFIGS: Record<WorshipServiceType, CulteTypeConfig> = {
  enseignement_priere: {
    label: "Culte d'enseignement et prière",
    description: 'Mercredi — Enseignement biblique et prière (16h30–18h00)',
    group: 'hebdomadaire', dayOfWeek: 3, defaultTime: '16:30', endTime: '18:00',
    color: 'text-blue-300',
  },
  jeune_priere: {
    label: 'Culte de jeûne et prière',
    description: 'Vendredi — Jeûne et prière communautaire (16h00–18h30)',
    group: 'hebdomadaire', dayOfWeek: 5, defaultTime: '16:00', endTime: '18:30',
    color: 'text-purple-300',
  },
  jeune_gen_espoir: {
    label: 'Culte de jeûne (Génération Espoir)',
    description: 'Samedi — Jeûne des jeunes Génération Espoir (15h00–17h00)',
    group: 'hebdomadaire', dayOfWeek: 6, defaultTime: '15:00', endTime: '17:00',
    color: 'text-emerald-300',
  },
  adoration_louange: {
    label: "Culte d'adoration et louange",
    description: 'Dimanche — Culte principal d’adoration et louange (08h00–10h45)',
    group: 'hebdomadaire', dayOfWeek: 0, defaultTime: '08:00', endTime: '10:45',
    color: 'text-amber-300',
  },
  seminaire: {
    label: 'Séminaire', description: 'Séminaire d’enseignement',
    group: 'special', dayOfWeek: -1, defaultTime: '09:00', endTime: '12:00',
    color: 'text-cyan-300',
  },
  veillee: {
    label: 'Veillée', description: 'Veillée de prière ou louange',
    group: 'special', dayOfWeek: -1, defaultTime: '21:00', endTime: '23:00',
    color: 'text-indigo-300',
  },
  culte_special: {
    label: 'Culte spécial', description: 'Culte thématique ou occasionnel',
    group: 'special', dayOfWeek: -1, defaultTime: '09:00', endTime: '12:00',
    color: 'text-rose-300',
  },
  conference: {
    label: 'Conférence', description: 'Conférence ou convention',
    group: 'special', dayOfWeek: -1, defaultTime: '09:00', endTime: '17:00',
    color: 'text-orange-300',
  },
  exposition: {
    label: 'Exposition', description: 'Exposition biblique',
    group: 'special', dayOfWeek: -1, defaultTime: '10:00', endTime: '12:00',
    color: 'text-teal-300',
  },
  retraite: {
    label: 'Retraite', description: 'Retraite spirituelle',
    group: 'special', dayOfWeek: -1, defaultTime: '09:00', endTime: '17:00',
    color: 'text-violet-300',
  },
  autre: {
    label: 'Autre', description: 'Autre type de culte',
    group: 'special', dayOfWeek: -1, defaultTime: '09:00', endTime: '11:00',
    color: 'text-gray-300',
  },
};

const SERVICE_TYPE_LABELS: Record<WorshipServiceType, string> = Object.fromEntries(
  Object.entries(WORSHIP_TYPE_CONFIGS).map(([k, v]) => [k, v.label])
) as Record<WorshipServiceType, string>;

// Grouped for the select dropdown
const CULTE_TYPE_GROUPS = [
  {
    label: 'Cultes hebdomadaires',
    types: Object.entries(WORSHIP_TYPE_CONFIGS)
      .filter(([, v]) => v.group === 'hebdomadaire')
      .map(([k, v]) => ({ value: k as WorshipServiceType, ...v })),
  },
  {
    label: 'Événements spéciaux',
    types: Object.entries(WORSHIP_TYPE_CONFIGS)
      .filter(([, v]) => v.group === 'special')
      .map(([k, v]) => ({ value: k as WorshipServiceType, ...v })),
  },
];

const STATUS_CONFIG: Record<WorshipServiceStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-500/20 text-gray-300' },
  planned: { label: 'Planifié', color: 'bg-blue-500/20 text-blue-300' },
  orator_submitted: { label: 'Orateur OK', color: 'bg-amber-500/20 text-amber-300' },
  president_submitted: { label: 'Président OK', color: 'bg-purple-500/20 text-purple-300' },
  completed: { label: 'Complet', color: 'bg-green-500/20 text-green-300' },
  cancelled: { label: 'Annulé', color: 'bg-red-500/20 text-red-300' },
};

const ORDER_ITEM_TYPES: { value: WorshipOrderItemType; label: string }[] = [
  { value: 'louange', label: 'Louange' },
  { value: 'adoration', label: 'Adoration' },
  { value: 'offrande', label: 'Offrande' },
  { value: 'communique', label: 'Communiqué' },
  { value: 'predication', label: 'Prédication' },
  { value: 'temoignage', label: 'Témoignages' },
  { value: 'sainte_cene', label: 'Sainte Cène' },
  { value: 'priere_nouveaux', label: 'Prière nouveaux' },
  { value: 'accueil_invites', label: 'Accueil invités' },
  { value: 'intervention_speciale', label: 'Intervention spéciale' },
  { value: 'priere_finale', label: 'Prière finale' },
  { value: 'autre', label: 'Autre' },
];

const BIBLE_BOOKS = [
  'Genèse','Exode','Lévitique','Nombres','Deutéronome',
  'Josué','Juges','Ruth','1 Samuel','2 Samuel','1 Rois','2 Rois',
  '1 Chroniques','2 Chroniques','Esdras','Néhémie','Esther','Job',
  'Psaumes','Proverbes','Ecclésiaste','Cantique des Cantiques',
  'Ésaïe','Jérémie','Lamentations','Ézéchiel','Daniel',
  'Osée','Joël','Amos','Abdias','Jonas','Michée','Nahum',
  'Habakuk','Sophonie','Aggée','Zacharie','Malachie',
  'Matthieu','Marc','Luc','Jean','Actes','Romains','1 Corinthiens',
  '2 Corinthiens','Galates','Éphésiens','Philippiens','Colossiens',
  '1 Thessaloniciens','2 Thessaloniciens','1 Timothée','2 Timothée',
  'Tite','Philémon','Hébreux','Jacques','1 Pierre','2 Pierre',
  '1 Jean','2 Jean','3 Jean','Jude','Apocalypse',
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function isTableNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('42P01');
}

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t: string): string {
  // PostgreSQL TIME returns "08:00:00" — strip seconds
  return t ? t.substring(0, 5) : '';
}

/* ── 12h Deadline helpers ── */
function getDeadlineInfo(deadlineStr: string): { label: string; cls: string; isExpired: boolean; hoursLeft: number } {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const hoursLeft = diffMs / (1000 * 60 * 60);
  const isExpired = diffMs <= 0;
  if (isExpired) {
    return { label: 'Expiré', cls: 'bg-red-500/20 text-red-400', isExpired: true, hoursLeft: 0 };
  }
  if (hoursLeft < 3) {
    return { label: `Urgent : ${Math.ceil(hoursLeft)}h restantes`, cls: 'bg-red-500/20 text-red-300', isExpired: false, hoursLeft };
  }
  if (hoursLeft < 6) {
    return { label: `${Math.ceil(hoursLeft)}h restantes`, cls: 'bg-amber-500/20 text-amber-300', isExpired: false, hoursLeft };
  }
  return { label: `${Math.ceil(hoursLeft)}h restantes`, cls: 'bg-emerald-500/20 text-emerald-300', isExpired: false, hoursLeft };
}

/* ── Compute form_deadline_at client-side (mirrors DB GENERATED column) ──
 * date + heure - 12h (+ retard si culte en retard)
 * Use this when the DB column does not yet exist. */
function computeFormDeadline(svc: { date: string; time: string | null; is_delayed: boolean; delayed_minutes: number }): string {
  const [y, m, d] = svc.date.split('-').map(Number);
  const tParts = (svc.time || '09:00').split(':').map(Number);
  const deadline = new Date(y, m - 1, d, tParts[0], tParts[1], 0, 0);
  deadline.setHours(deadline.getHours() - 12);
  if (svc.is_delayed && svc.delayed_minutes > 0) {
    deadline.setMinutes(deadline.getMinutes() + svc.delayed_minutes);
  }
  return deadline.toISOString();
}

/** Enrich a single WorshipService with form_deadline_at if missing (DB column not created yet) */
function enrichWithDeadline<T extends { form_deadline_at?: string; date: string; time: string | null; is_delayed: boolean; delayed_minutes: number }>(svc: T): T & { form_deadline_at: string } {
  if (!svc.form_deadline_at) {
    return { ...svc, form_deadline_at: computeFormDeadline(svc) };
  }
  return svc as T & { form_deadline_at: string };
}

/** Enrich an array of WorshipService objects */
function enrichServicesWithDeadlines<T extends { form_deadline_at?: string; date: string; time: string | null; is_delayed: boolean; delayed_minutes: number }>(services: T[]): (T & { form_deadline_at: string })[] {
  return services.map(enrichWithDeadline);
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function PlanificationTab() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();
  const [activeTab, setActiveTab] = useState<SubTab>('cultes');
  const [loading, setLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);

  /* ── Permissions : admin + chef de dept peuvent planifier, membres voient en lecture seule ── */
  const [isDeptLeader, setIsDeptLeader] = useState(false);
  const canPlan = isFullAdmin || isDeptLeader;

  /* ── State: Cultes ── */
  const [services, setServices] = useState<WorshipService[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  /* ── State: Formulaires ── */
  const [oratorForm, setOratorForm] = useState<WorshipOratorForm | null>(null);
  const [oratorPoints, setOratorPoints] = useState<WorshipOratorPoint[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  /* ── State: Ordre du culte ── */
  const [orderItems, setOrderItems] = useState<WorshipOrderItem[]>([]);
  const [selectedServiceForOrder, setSelectedServiceForOrder] = useState<string | null>(null);

  /* ── State: Submission status per service ── */
  const [submittedForms, setSubmittedForms] = useState<Record<string, string>>({});
  const [submittedOrders, setSubmittedOrders] = useState<Set<string>>(new Set());

  /* ── State: Form links ── */
  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);

  /* ── State: Preview modal ── */
  const [previewService, setPreviewService] = useState<WorshipService | null>(null);
  const [previewForm, setPreviewForm] = useState<WorshipOratorForm | null>(null);
  const [previewPoints, setPreviewPoints] = useState<WorshipOratorPoint[]>([]);
  const [previewOrder, setPreviewOrder] = useState<WorshipOrderItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setModuleError(false);
    try {
      const [svcRes, linksRes] = await Promise.allSettled([
        supabase.from('worship_services').select('id,date,time,type,orator_name,president_name,status,notes,created_by,is_delayed,delayed_at,delayed_minutes,created_at,updated_at').order('date', { ascending: false }).limit(50),
        supabase.from('worship_form_links').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      const rawSvcs = (svcRes.status === 'fulfilled' && svcRes.value.data)
        ? (svcRes.value.data as WorshipService[]) : [];

      if (svcRes.status === 'rejected' && isTableNotFoundError(svcRes.reason)) {
        setModuleError(true);
      }
      const svcs = enrichServicesWithDeadlines(rawSvcs);

      // Check if user is a department leader (chef de département)
      if (user && !isFullAdmin) {
        const { data: leaderCheck } = await supabase
          .from('department_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('role_in_dept', 'leader')
          .eq('is_active', true)
          .limit(1);
        setIsDeptLeader((leaderCheck?.length ?? 0) > 0);
      }
      setServices(svcs);

      if (linksRes.status === 'fulfilled' && linksRes.value.data) {
        setFormLinks(linksRes.value.data as WorshipFormLink[]);
      }

      // Charger le statut de soumission pour chaque service (orator + order)
      if (svcs.length > 0) {
        const svcIds = svcs.map(s => s.id);
        const [formsRes, ordersRes] = await Promise.allSettled([
          supabase.from('worship_orator_forms').select('id,service_id,status').in('service_id', svcIds),
          supabase.from('worship_order_items').select('service_id').in('service_id', svcIds),
        ]);
        const forms = (formsRes.status === 'fulfilled' && formsRes.value.data)
          ? (formsRes.value.data as { id: string; service_id: string; status: string }[]) : [];
        const orders = (ordersRes.status === 'fulfilled' && ordersRes.value.data)
          ? (ordersRes.value.data as { service_id: string }[]) : [];
        setSubmittedForms(Object.fromEntries(forms.map(f => [f.service_id, f.status])));
        setSubmittedOrders(new Set(orders.map(o => o.service_id)));
      } else {
        setSubmittedForms({});
        setSubmittedOrders(new Set());
      }
    } catch (err) {
      if (isTableNotFoundError(err)) { setModuleError(true); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Fetch orator form + points for a service ── */
  const fetchOratorForm = useCallback(async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    try {
      const { data: formData, error: formErr } = await supabase
        .from('worship_orator_forms').select('*').eq('service_id', serviceId).single();

      if (formErr || !formData) {
        setOratorForm(null);
        setOratorPoints([]);
        return;
      }

      const form = formData as WorshipOratorForm;
      setOratorForm(form);

      // Fetch points AFTER we have the form ID
      const { data: ptsData } = await supabase
        .from('worship_orator_points').select('*').eq('form_id', form.id).order('position');
      setOratorPoints((ptsData as WorshipOratorPoint[]) || []);
    } catch { /* empty */ }
  }, []);

  /* ── Fetch order items for a service ── */
  const fetchOrderItems = useCallback(async (serviceId: string) => {
    setSelectedServiceForOrder(serviceId);
    try {
      const { data } = await supabase.from('worship_order_items')
        .select('*').eq('service_id', serviceId).order('position');
      setOrderItems((data as WorshipOrderItem[]) || []);
    } catch { setOrderItems([]); }
  }, []);

  /* ── Create service ── */
  const handleCreateService = async (svc: {
    date: string; time: string; type: WorshipServiceType;
    orator_name: string; president_name: string; notes: string;
  }) => {
    try {
      const { data, error } = await supabase.from('worship_services').insert({
        ...svc, status: 'planned', created_by: user?.id,
      }).select('id,date,time,type,orator_name,president_name,status,notes,created_by,is_delayed,delayed_at,delayed_minutes,created_at,updated_at').single();

      if (error) throw error;
      addToast({ type: 'success', message: 'Culte créé avec succès' });

      // Auto-generate form links — compute expires_at client-side (DB trigger references missing column)
      if (data) {
        const enriched = enrichWithDeadline(data as any);
        const expiresAt = enriched.form_deadline_at;
        const oratorToken = generateToken();
        const presidentToken = generateToken();
        await Promise.allSettled([
          supabase.from('worship_form_links').insert({
            service_id: data.id, link_type: 'orator', token: oratorToken,
            recipient_name: svc.orator_name || null,
            expires_at: expiresAt,
          }),
          supabase.from('worship_form_links').insert({
            service_id: data.id, link_type: 'president', token: presidentToken,
            recipient_name: svc.president_name || null,
            expires_at: expiresAt,
          }),
        ]);
      }

      setShowCreateModal(false);
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur lors de la création' });
    }
  };

  /* ── Generate/regenerate WhatsApp link ── */
  const handleGenerateLink = async (serviceId: string, linkType: 'orator' | 'president', recipientName?: string, recipientPhone?: string) => {
    try {
      const token = generateToken();
      // Compute expires_at client-side (DB trigger broken — references missing form_deadline_at column)
      const svc = services.find(s => s.id === serviceId);
      const expiresAt = svc?.form_deadline_at || null;
      // Supprimer d'abord tout lien existant pour ce service/type, puis inserer
      await supabase.from('worship_form_links').delete().eq('service_id', serviceId).eq('link_type', linkType);
      const { error } = await supabase.from('worship_form_links').insert({
        service_id: serviceId, link_type: linkType, token,
        recipient_name: recipientName || null,
        recipient_phone: recipientPhone || null,
        is_used: false, sent_at: null,
        expires_at: expiresAt,
      });

      if (error) throw error;
      addToast({ type: 'success', message: 'Lien généré' });
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* ── Send WhatsApp ── */
  const handleSendWhatsApp = (link: WorshipFormLink) => {
    const formType = link.link_type === 'orator' ? 'orateur' : 'president';
    const url = `${BASE_URL}/#/form-culte/${link.token}`;
    const svc = services.find(s => s.id === link.service_id);
    const dateStr = svc ? formatDate(svc.date) : '';

    const message = `Bonjour ${link.recipient_name || ''},\n\nVoici le lien pour remplir le formulaire ${formType} du culte du ${dateStr} :\n\n${url}\n\nCe lien expire dans 7 jours.`;

    // Mark as sent
    supabase.from('worship_form_links').update({ sent_at: new Date().toISOString() }).eq('id', link.id).then(() => {}).catch(() => {});
    openWhatsApp(link.recipient_phone, message);
    addToast({ type: 'success', message: 'WhatsApp ouvert' });
  };

  /* ── Preview form content (modal) ── */
  const handlePreview = async (svc: WorshipService) => {
    setPreviewService(svc);
    setPreviewLoading(true);
    setPreviewForm(null);
    setPreviewPoints([]);
    setPreviewOrder([]);
    try {
      const [formRes, orderRes] = await Promise.allSettled([
        supabase.from('worship_orator_forms').select('*').eq('service_id', svc.id).maybeSingle(),
        supabase.from('worship_order_items').select('*').eq('service_id', svc.id).order('position'),
      ]);
      if (formRes.status === 'fulfilled' && formRes.value.data) {
        const form = formRes.value.data as WorshipOratorForm;
        setPreviewForm(form);
        const { data: ptsData } = await supabase.from('worship_orator_points').select('*').eq('form_id', form.id).order('position');
        setPreviewPoints((ptsData as WorshipOratorPoint[]) || []);
      }
      if (orderRes.status === 'fulfilled' && orderRes.value.data) {
        setPreviewOrder(orderRes.value.data as WorshipOrderItem[]);
      }
    } catch { /* empty */ }
    setPreviewLoading(false);
  };

  /* ── Send form content via WhatsApp ── */
  const handleSendContentWhatsApp = async (svc: WorshipService) => {
    let message = '';
    const typeLabel = SERVICE_TYPE_LABELS[svc.type] ?? svc.type;

    // Fetch form and order if not already loaded
    let form: WorshipOratorForm | null = previewForm;
    let pts: WorshipOratorPoint[] = previewPoints;
    let order: WorshipOrderItem[] = previewOrder;

    if (!form || (previewService?.id !== svc.id)) {
      const [formRes, orderRes] = await Promise.allSettled([
        supabase.from('worship_orator_forms').select('*').eq('service_id', svc.id).maybeSingle(),
        supabase.from('worship_order_items').select('*').eq('service_id', svc.id).order('position'),
      ]);
      if (formRes.status === 'fulfilled' && formRes.value.data) {
        form = formRes.value.data as WorshipOratorForm;
        const { data: ptsData } = await supabase.from('worship_orator_points').select('*').eq('form_id', form.id).order('position');
        pts = (ptsData as WorshipOratorPoint[]) || [];
      }
      if (orderRes.status === 'fulfilled' && orderRes.value.data) {
        order = orderRes.value.data as WorshipOrderItem[];
      }
    }

    if (form) {
      message += `*FORMULAIRE ORATEUR*\n`;
      message += `Culte: ${formatDate(svc.date)} ${formatTime(svc.time)}\n`;
      message += `Type: ${typeLabel}\n\n`;
      message += `*Orateur:* ${form.orator_name || svc.orator_name || '-'}\n`;
      message += `*Thème:* ${form.theme || '-'}\n`;
      if (form.sub_theme) message += `*Sous-thème:* ${form.sub_theme}\n`;
      if (form.bible_book) message += `*Verset:* ${form.bible_book} ${form.bible_chapter || ''}:${form.bible_verses || ''}\n`;
      if (pts.length > 0) {
        message += `\n*Points du message:*\n`;
        pts.forEach((p, i) => {
          message += `${i + 1}. ${p.title}`;
          if (p.description) message += ` — ${p.description}`;
          message += '\n';
        });
      }
      if (form.summary) message += `\n*Résumé:*\n${form.summary}\n`;
    }
    if (order.length > 0) {
      if (message) message += '\n';
      message += `*ORDRE DU CULTE*\n`;
      message += `Président: ${svc.president_name || '-'}\n\n`;
      order.forEach((item, i) => {
        const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
        message += `${i + 1}. ${item.custom_label || label} (${item.duration_minutes} min)\n`;
        if (item.notes) message += `   Notes: ${item.notes}\n`;
      });
      const total = order.reduce((s, i) => s + (i.duration_minutes || 0), 0);
      message += `\n*Durée totale:* ${total} min`;
    }

    if (!message) {
      addToast({ type: 'info', message: 'En attente : l\'orateur ou le président n\'a pas encore soumis son formulaire. Envoyez d\'abord le lien via WhatsApp.' });
      return;
    }

    openWhatsApp(null, message);
    addToast({ type: 'success', message: 'Contenu envoyé par WhatsApp' });
  };

  /* ── Send branded orator form link via WhatsApp ── */
  const handleSendBrandedForm = (svc: WorshipService, linkType: 'orator' | 'president') => {
    const link = formLinks.find(l => l.service_id === svc.id && l.link_type === linkType);

    if (!link) {
      // Auto-generate link first
      handleGenerateLink(svc.id, linkType, linkType === 'orator' ? svc.orator_name : svc.president_name || undefined);
      addToast({ type: 'info', message: 'Lien généré. Cliquez à nouveau sur l\'icône 📄 pour envoyer.' });
      return;
    }

    const dateStr = formatDate(svc.date);
    const typeLabel = SERVICE_TYPE_LABELS[svc.type] ?? svc.type;
    const formType = linkType === 'orator' ? 'orateur' : 'président';
    const brandedUrl = `${BASE_URL}/#/form-orateur/${link.token}`;

    const message = `Bonjour ${link.recipient_name || ''},\n\nVoici le formulaire ${formType} du culte du ${dateStr} (${typeLabel}) :\n\n${brandedUrl}\n\n📄 Ouvrez ce lien dans votre navigateur, remplissez le formulaire en ligne et cliquez sur "Confirmer et envoyer". Les données seront transmises automatiquement au département média.\n\nCe lien expire dans 7 jours.`;

    // Mark as sent
    supabase.from('worship_form_links').update({ sent_at: new Date().toISOString() }).eq('id', link.id).then(() => {}).catch(() => {});
    openWhatsApp(link.recipient_phone, message);
    addToast({ type: 'success', message: `Lien du formulaire ${formType} envoyé par WhatsApp` });
  };

  /* ── Preview branded form in new tab ── */
  const handlePreviewHTMLForm = (svc: WorshipService) => {
    const link = formLinks.find(l => l.service_id === svc.id && l.link_type === 'orator');
    if (!link) {
      addToast({ type: 'info', message: 'Générez d\'abord le lien pour l\'orateur.' });
      return;
    }
    window.open(`/#/form-orateur/${link.token}`, '_blank');
  };

  /* ── Toggle delay on a service ── */
  const [delayModal, setDelayModal] = useState<{ serviceId: string; currentMinutes: number } | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(30);

  const handleToggleDelay = async (serviceId: string, enable: boolean, minutes?: number) => {
    try {
      if (enable) {
        await supabase.from('worship_services').update({
          is_delayed: true,
          delayed_at: new Date().toISOString(),
          delayed_minutes: minutes || 30,
        }).eq('id', serviceId);
        // Update link expires_at client-side (DB trigger broken — references missing form_deadline_at column)
        const svc = services.find(s => s.id === serviceId);
        if (svc) {
          const newDeadline = computeFormDeadline({ ...svc, is_delayed: true, delayed_minutes: minutes || 30 });
          await supabase.from('worship_form_links')
            .update({ expires_at: newDeadline })
            .eq('service_id', serviceId).eq('is_used', false);
        }
        addToast({ type: 'success', message: `Culte signalé en retard de ${minutes || 30} min — les liens sont repoussés` });
      } else {
        await supabase.from('worship_services').update({
          is_delayed: false,
          delayed_at: null,
          delayed_minutes: 0,
        }).eq('id', serviceId);
        // Reset link expires_at client-side
        const svc = services.find(s => s.id === serviceId);
        if (svc) {
          const newDeadline = computeFormDeadline({ ...svc, is_delayed: false, delayed_minutes: 0 });
          await supabase.from('worship_form_links')
            .update({ expires_at: newDeadline })
            .eq('service_id', serviceId).eq('is_used', false);
        }
        addToast({ type: 'success', message: 'Retard annulé — les liens sont remis à la deadline initiale' });
      }
      setDelayModal(null);
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* ── Delete service ── */
  const handleDeleteService = async (id: string) => {
    if (!confirm('Supprimer ce culte et tous ses formulaires ?')) return;
    try {
      await supabase.from('worship_services').delete().eq('id', id);
      addToast({ type: 'success', message: 'Culte supprimé' });
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* ── Copy link ── */
  const copyLink = (token: string) => {
    const url = `${BASE_URL}/#/form-culte/${token}`;
    navigator.clipboard.writeText(url);
    addToast({ type: 'success', message: 'Lien copié' });
  };

  /* ═══════════════════════════════════════════════════════════════
     Module Error
     ═══════════════════════════════════════════════════════════════ */
  if (moduleError) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Info className="h-12 w-12 text-muted mx-auto mb-4" />
        <p className="font-serif text-xl font-semibold text-cream mb-2">Module en cours de configuration</p>
        <p className="text-sm text-muted mb-4">Les tables de planification de culte n'ont pas encore été créées dans la base de données.</p>
        <p className="text-xs text-muted">Exécutez la migration SQL <code className="bg-white/5 px-2 py-0.5 rounded">worship_planning_migration.sql</code> dans Supabase.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Render: Cultes Tab
     ═══════════════════════════════════════════════════════════════ */
  const renderCultes = () => {
    const linksForService = (svcId: string, type: 'orator' | 'president') =>
      formLinks.filter(l => l.service_id === svcId && l.link_type === type);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cream">Planification des cultes</h3>
          {canPlan && (
            <button onClick={() => setShowCreateModal(true)} className="btn-gold text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nouveau culte
            </button>
          )}
        </div>
        {!canPlan && (
          <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl px-4 py-3 flex items-center gap-3">
            <Eye className="h-5 w-5 text-blue-400 shrink-0" />
            <p className="text-sm text-blue-200">Mode consultation — Vous pouvez voir la planification et les formulaires remplis. Seuls l'admin et les chefs de département peuvent planifier des cultes.</p>
          </div>
        )}

        {services.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Calendar className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-muted">Aucun culte planifié</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(svc => {
              const oratorLinks = linksForService(svc.id, 'orator');
              const presidentLinks = linksForService(svc.id, 'president');
              const st = STATUS_CONFIG[svc.status as keyof typeof STATUS_CONFIG];
              const deadlineInfo = svc.form_deadline_at ? getDeadlineInfo(svc.form_deadline_at) : null;

              return (
                <div key={svc.id} className={`glass-card rounded-xl p-4 space-y-3 ${svc.is_delayed ? 'ring-1 ring-red-500/30' : ''}`}>
                  {/* Header row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${svc.is_delayed ? 'bg-red-500/15' : 'bg-accent-400/10'}`}>
                        {svc.is_delayed
                          ? <AlertTriangle className="h-5 w-5 text-red-400" />
                          : <Church className="h-5 w-5 text-accent-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-cream">{formatDate(svc.date)} &mdash; {formatTime(svc.time)}{WORSHIP_TYPE_CONFIGS[svc.type]?.endTime ? `–${WORSHIP_TYPE_CONFIGS[svc.type].endTime}` : ''}</p>
                          {svc.is_delayed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              EN RETARD (+{svc.delayed_minutes || 0} min)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">{SERVICE_TYPE_LABELS[svc.type] ?? svc.type} {svc.orator_name ? `· Orateur: ${svc.orator_name}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 12h deadline badge */}
                      {deadlineInfo && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${deadlineInfo.cls}`}>
                          <Timer className="h-3 w-3" />
                          {deadlineInfo.label}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st?.color || 'bg-gray-500/20 text-gray-300'}`}>{st?.label || svc.status}</span>
                      <div className="flex items-center gap-0.5">
                        {canPlan && (
                          <button
                            onClick={() => setDelayModal({ serviceId: svc.id, currentMinutes: svc.delayed_minutes || 0 })}
                            className={`p-1.5 rounded-lg transition-colors ${svc.is_delayed ? 'hover:bg-red-500/10 text-red-400/70 hover:text-red-400' : 'hover:bg-amber-500/10 text-amber-400/70 hover:text-amber-400'}`}
                            title={svc.is_delayed ? 'Gérer le retard' : 'Signaler un retard'}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                        {canPlan && (
                          <button onClick={() => handleDeleteService(svc.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {svc.president_name && (
                    <p className="text-sm text-cream/70">Président: {svc.president_name}</p>
                  )}

                  {/* Delay info bar */}
                  {svc.is_delayed && (
                    <div className="bg-red-500/8 rounded-lg px-3 py-2 border border-red-500/15 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-red-300 font-medium">Culte programmé en retard de {svc.delayed_minutes || 0} minutes</p>
                        <p className="text-[10px] text-red-400/70">La deadline des formulaires a été repoussée automatiquement de {svc.delayed_minutes || 0} min. Les liens WhatsApp non utilisés sont mis à jour.</p>
                      </div>
                      {canPlan && (
                        <button onClick={() => handleToggleDelay(svc.id, false)} className="text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors shrink-0">
                          Annuler le retard
                        </button>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-line/30">
                    {/* Orator link */}
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-muted flex-1">Formulaire orateur</span>
                      {submittedForms[svc.id] && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/20 text-green-400">Soumis</span>
                      )}
                      {oratorLinks.length > 0 && oratorLinks[0] && (
                        <>
                          <button onClick={() => copyLink(oratorLinks[0].token)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Copier le lien">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {canPlan && (
                            <button onClick={() => handleSendWhatsApp(oratorLinks[0])} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400/70 hover:text-green-400 transition-colors" title="Envoyer le lien par WhatsApp">
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handlePreviewHTMLForm(svc)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400/70 hover:text-amber-400 transition-colors" title="Aperçu du formulaire HTML">
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          {canPlan && (
                            <button onClick={() => handleSendBrandedForm(svc, 'orator')} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400/70 hover:text-blue-400 transition-colors" title="Envoyer le formulaire brandingé par WhatsApp">
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      {canPlan && (
                        <button onClick={() => handleGenerateLink(svc.id, 'orator', svc.orator_name || undefined)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Régénérer le lien">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* President link */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="text-xs text-muted flex-1">Formulaire président</span>
                      {submittedOrders.has(svc.id) && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-500/20 text-green-400">Soumis</span>
                      )}
                      {presidentLinks.length > 0 && presidentLinks[0] && (
                        <>
                          <button onClick={() => copyLink(presidentLinks[0].token)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Copier le lien">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {canPlan && (
                            <button onClick={() => handleSendWhatsApp(presidentLinks[0])} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400/70 hover:text-green-400 transition-colors" title="Envoyer par WhatsApp">
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => window.open(`/#/form-culte/${presidentLinks[0].token}`, '_blank')} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Ouvrir">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {canPlan && (
                        <button onClick={() => handleGenerateLink(svc.id, 'president', svc.president_name || undefined)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Régénérer le lien">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => { fetchOratorForm(svc.id); setActiveTab('formulaires'); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                    >
                      <Eye className="h-3 w-3 inline mr-1" /> Voir formulaire orateur
                    </button>
                    <button
                      onClick={() => { fetchOrderItems(svc.id); setActiveTab('ordre'); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                    >
                      <Eye className="h-3 w-3 inline mr-1" /> Voir ordre du culte
                    </button>
                    <button
                      onClick={() => handlePreview(svc)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Prévisualiser
                    </button>
                    {canPlan && (
                      <button
                        onClick={() => handleSendBrandedForm(svc, 'orator')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
                        title="Envoie le formulaire brandingé à l'orateur via WhatsApp (lien en ligne)"
                      >
                        <Send className="h-3 w-3" /> Formulaire brandingé
                      </button>
                    )}
                    {canPlan && (
                      <button
                        onClick={() => handleSendContentWhatsApp(svc)}
                        disabled={!submittedForms[svc.id] && !submittedOrders.has(svc.id)}
                        title={!submittedForms[svc.id] && !submittedOrders.has(svc.id) ? 'En attente de soumission du formulaire' : 'Envoyer le programme par WhatsApp'}
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                          !submittedForms[svc.id] && !submittedOrders.has(svc.id)
                            ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-green-500/10 text-green-300 hover:bg-green-500/20'
                        }`}
                      >
                        <MessageSquare className="h-3 w-3" /> Programme WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Render: Formulaires Tab (Read-only view of orator form)
     ═══════════════════════════════════════════════════════════════ */
  const renderFormulaires = () => {
    if (!selectedServiceId) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="text-muted">Sélectionnez un culte dans l'onglet "Cultes" pour voir le formulaire orateur</p>
        </div>
      );
    }

    if (!oratorForm) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-muted">Aucun formulaire orateur soumis pour ce culte</p>
          <p className="text-xs text-muted mt-1">Le lien n'a pas encore été rempli par l'orateur.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cream">Formulaire Orateur</h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oratorForm.status === 'submitted' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
            {oratorForm.status === 'submitted' ? 'Soumis' : 'Brouillon'}
          </span>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Orateur</label>
              <p className="text-sm font-medium text-cream">{oratorForm.orator_name}</p>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Thème principal</label>
              <p className="text-sm font-medium text-cream">{oratorForm.theme}</p>
            </div>
            {oratorForm.sub_theme && (
              <div>
                <label className="text-xs text-muted block mb-1">Sous-thème</label>
                <p className="text-sm text-cream/80">{oratorForm.sub_theme}</p>
              </div>
            )}
            {oratorForm.bible_book && (
              <div>
                <label className="text-xs text-muted block mb-1">Verset biblique</label>
                <p className="text-sm text-cream/80">{oratorForm.bible_book} {oratorForm.bible_chapter || ''}:{oratorForm.bible_verses || ''}</p>
              </div>
            )}
          </div>

            {oratorPoints.length > 0 && (
              <div>
                <label className="text-xs text-muted block mb-2">Grands points du message</label>
                <div className="space-y-2">
                  {oratorPoints.sort((a, b) => a.position - b.position).map((pt, i) => (
                    <div key={pt.id} className="bg-white/3 rounded-lg p-3 border border-line/20">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-cream">{pt.title}</p>
                          {pt.description && <p className="text-xs text-muted mt-1">{pt.description}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {oratorForm.summary && (
              <div>
                <label className="text-xs text-muted block mb-1">Résumé du message</label>
                <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.summary}</p>
              </div>
            )}

            {oratorForm.remarks && (
              <div>
                <label className="text-xs text-muted block mb-1">Remarques</label>
                <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.remarks}</p>
              </div>
            )}

            {oratorForm.submitted_at && (
              <p className="text-xs text-muted text-right">Soumis le {new Date(oratorForm.submitted_at).toLocaleString('fr-FR')}</p>
            )}
          </div>
        </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Render: Ordre du Culte Tab
     ═══════════════════════════════════════════════════════════════ */
  const renderOrdre = () => {
    if (!selectedServiceForOrder) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <Clock className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="text-muted">Sélectionnez un culte dans l'onglet "Cultes" pour voir l'ordre du culte</p>
        </div>
      );
    }

    if (orderItems.length === 0) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-muted">Aucun ordre du culte défini pour ce culte</p>
          <p className="text-xs text-muted mt-1">Le président n'a pas encore rempli le formulaire.</p>
        </div>
      );
    }

    const totalMinutes = orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cream">Ordre du culte</h3>
          <span className="text-xs text-muted">Durée totale estimée: {totalMinutes} min</span>
        </div>

        <div className="glass-card rounded-xl divide-y divide-line/20 overflow-hidden">
          {orderItems.sort((a, b) => a.position - b.position).map((item, idx) => {
            const typeLabel = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
            const isFirst = idx === 0;
            const isLast = idx === orderItems.length - 1;

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cream">{item.custom_label || typeLabel}</p>
                  {item.notes && <p className="text-xs text-muted mt-0.5 truncate">{item.notes}</p>}
                </div>
                <span className="text-xs text-muted shrink-0">{item.duration_minutes} min</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Create Service Modal
     ═══════════════════════════════════════════════════════════════ */
  const renderCreateModal = () => {
    if (!showCreateModal) return null;
    return <CreateServiceModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateService} />;
  };

  /* ═══════════════════════════════════════════════════════════════
     Main Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/3 rounded-xl p-1 overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.Icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active ? 'bg-accent-400/15 text-accent-400' : 'text-muted hover:text-cream hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'cultes' && renderCultes()}
      {activeTab === 'formulaires' && renderFormulaires()}
      {activeTab === 'ordre' && renderOrdre()}

      {/* Create Modal */}
      {renderCreateModal()}

      {/* Delay Modal */}
      {delayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDelayModal(null)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-cream flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                {delayModal.currentMinutes > 0 ? 'Modifier le retard' : 'Signaler un retard'}
              </h3>
              <button onClick={() => setDelayModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted mb-4">
              Indiquez de combien de minutes le culte est en retard. La deadline des formulaires (12h avant le culte) sera repoussée automatiquement. Les liens WhatsApp non utilisés seront mis à jour.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Durée du retard (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  value={delayMinutes}
                  onChange={e => setDelayMinutes(parseInt(e.target.value) || 30)}
                  className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleDelay(delayModal.serviceId, true, delayMinutes)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Confirmer le retard
                </button>
                {delayModal.currentMinutes > 0 && (
                  <button
                    onClick={() => handleToggleDelay(delayModal.serviceId, false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-muted hover:text-cream hover:bg-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setPreviewService(null)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" /> Prévisualisation — {formatDate(previewService.date)} {formatTime(previewService.time)}
              </h3>
              <button onClick={() => setPreviewService(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted mb-4">{SERVICE_TYPE_LABELS[previewService.type] ?? previewService.type} {previewService.orator_name ? `· Orateur: ${previewService.orator_name}` : ''} {previewService.president_name ? `· Président: ${previewService.president_name}` : ''}</p>

            {previewLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent-400" /></div>
            ) : (
              <div className="space-y-4">
                {!previewForm && previewOrder.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="h-10 w-10 text-muted/40 mx-auto mb-3" />
                    <p className="text-muted text-sm">En attente de soumission</p>
                    <p className="text-xs text-muted/60 mt-1">L'orateur ou le président n'a pas encore rempli son formulaire. Envoyez d'abord le lien via WhatsApp.</p>
                  </div>
                )}

                {/* Orator form */}
                {previewForm && (
                  <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10 space-y-3">
                    <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">Formulaire Orateur</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted block mb-1">Orateur</label>
                        <p className="text-sm font-medium text-cream">{previewForm.orator_name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted block mb-1">Thème principal</label>
                        <p className="text-sm font-medium text-cream">{previewForm.theme}</p>
                      </div>
                      {previewForm.sub_theme && (
                        <div>
                          <label className="text-xs text-muted block mb-1">Sous-thème</label>
                          <p className="text-sm text-cream/80">{previewForm.sub_theme}</p>
                        </div>
                      )}
                      {previewForm.bible_book && (
                        <div>
                          <label className="text-xs text-muted block mb-1">Verset biblique</label>
                          <p className="text-sm text-cream/80">{previewForm.bible_book}{previewForm.bible_chapter && previewForm.bible_verses ? ` ${previewForm.bible_chapter}:${previewForm.bible_verses}` : ''}</p>
                        </div>
                      )}
                    </div>
                    {previewPoints.length > 0 && (
                      <div>
                        <label className="text-xs text-muted block mb-2">Points du message</label>
                        <div className="space-y-1.5">
                          {previewPoints.map((pt, i) => (
                            <div key={pt.id || i} className="flex items-start gap-2 bg-white/3 rounded-lg p-2.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/15 text-amber-400 text-[10px] font-bold shrink-0">{i + 1}</span>
                              <div>
                                <p className="text-sm font-medium text-cream">{pt.title}</p>
                                {pt.description && <p className="text-xs text-muted mt-0.5">{pt.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {previewForm.summary && (
                      <div>
                        <label className="text-xs text-muted block mb-1">Résumé</label>
                        <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3">{previewForm.summary}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Order items */}
                {previewOrder.length > 0 && (
                  <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/10 space-y-2">
                    <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Ordre du Culte</p>
                    {previewOrder.map((item, i) => {
                      const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
                      return (
                        <div key={item.id || i} className="flex items-center gap-3 py-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-400/15 text-purple-400 text-[10px] font-bold shrink-0">{i + 1}</span>
                          <span className="text-sm text-cream flex-1">{item.custom_label || label}</span>
                          <span className="text-xs text-muted">{item.duration_minutes} min</span>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted pt-2 border-t border-purple-500/10">
                      Durée totale : {previewOrder.reduce((s, i) => s + (i.duration_minutes || 0), 0)} min
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Create Service Modal
   ═════════════════════════════════════════════════════════════════ */

function CreateServiceModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (svc: {
    date: string; time: string; type: WorshipServiceType;
    orator_name: string; president_name: string; notes: string;
  }) => void;
}) {
  const [type, setType] = useState<WorshipServiceType>('adoration_louange');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [oratorName, setOratorName] = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-fill date & time when type changes for weekly cultes
  const handleTypeChange = (newType: WorshipServiceType) => {
    setType(newType);
    const config = WORSHIP_TYPE_CONFIGS[newType];
    if (config.dayOfWeek >= 0) {
      // Find next occurrence of this day
      const today = new Date();
      const target = new Date(today);
      const currentDay = today.getDay();
      let daysAhead = config.dayOfWeek - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      target.setDate(today.getDate() + daysAhead);
      setDate(target.toISOString().split('T')[0]);
    } else if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
    setTime(config.defaultTime);
  };

  const handleSubmit = async () => {
    if (!date) return;
    setSaving(true);
    await onSubmit({ date, time, type, orator_name: oratorName, president_name: presidentName, notes });
    setSaving(false);
  };

  // Initialize default date/time on mount
  useEffect(() => {
    handleTypeChange('adoration_louange');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentConfig = WORSHIP_TYPE_CONFIGS[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent-400" /> Nouveau culte
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type select — grouped */}
          <div>
            <label className="text-xs text-muted block mb-1.5">Type de culte *</label>
            <select value={type} onChange={e => handleTypeChange(e.target.value as WorshipServiceType)}
              className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream">
              {CULTE_TYPE_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.types.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {currentConfig && (
              <p className="text-[11px] text-muted mt-1">{currentConfig.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Heure</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Nom de l'orateur</label>
              <input type="text" value={oratorName} onChange={e => setOratorName(e.target.value)}
                placeholder="Ex: Pasteur Jean"
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted/50" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Nom du président</label>
              <input type="text" value={presidentName} onChange={e => setPresidentName(e.target.value)}
                placeholder="Ex: Frère Pierre"
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted/50" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Culte spécial, thème de mois, etc."
              className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted/50 resize-none" />
          </div>

          <button onClick={handleSubmit} disabled={!date || saving}
            className="btn-gold w-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Créer le culte
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export for public form page & dashboard section
export { BIBLE_BOOKS, ORDER_ITEM_TYPES, SERVICE_TYPE_LABELS, STATUS_CONFIG, WORSHIP_TYPE_CONFIGS, CULTE_TYPE_GROUPS, generateToken, isTableNotFoundError, formatDate, formatTime, getDeadlineInfo, computeFormDeadline, enrichWithDeadline, enrichServicesWithDeadlines };