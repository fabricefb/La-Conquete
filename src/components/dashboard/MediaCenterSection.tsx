import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Calendar, Users, Mic, MonitorPlay, Volume2, UserPlus, FileText, Clock, AlertTriangle, Loader2, Info, Timer, ChevronDown, BookOpen, Eye, Send, Copy,
} from '../../lib/icons';
import {
  WORSHIP_TYPE_CONFIGS, SERVICE_TYPE_LABELS, STATUS_CONFIG,
  isTableNotFoundError, formatDate, formatTime, getDeadlineInfo, ORDER_ITEM_TYPES,
} from '../admin/tabs/PlanificationTab';
import type { WorshipService, WorshipOratorForm, WorshipOratorPoint, WorshipOrderItem, WorshipFormLink } from '../../types';

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
const MEDIA_ROLES = [
  { key: 'louange', label: 'Louange', icon: 'Mic' },
  { key: 'media', label: 'Média', icon: 'MonitorPlay' },
  { key: 'son', label: 'Son', icon: 'Volume2' },
  { key: 'accueil', label: 'Accueil', icon: 'UserPlus' },
  { key: 'diapo', label: 'Diapo', icon: 'FileText' },
] as const;

/** Roles shown for Wednesday / Friday / Saturday services */
const STANDARD_ROLES = MEDIA_ROLES.filter((r) =>
  ['louange', 'media', 'son'].includes(r.key),
);

/** All five roles for Sunday service */
const FULL_ROLES = [...MEDIA_ROLES];

/** Map of icon name → component for the small role chips */
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Mic,
  MonitorPlay,
  Volume2,
  UserPlus,
  FileText,
};

// ---------------------------------------------------------------------------
// Helper: which roles to show for a given service type
// ---------------------------------------------------------------------------
function rolesForType(type: string) {
  if (type === 'adoration_louange') return FULL_ROLES;
  return STANDARD_ROLES;
}

// ---------------------------------------------------------------------------
// Constants – the four standard worship types shown in "Programme hebdomadaire"
// ---------------------------------------------------------------------------
const WEEKLY_TYPES = [
  'enseignement_priere',
  'jeune_priere',
  'jeune_gen_espoir',
  'adoration_louange',
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Small pill / badge for an unassigned role */
function RoleChip({ label, icon }: { label: string; icon: string }) {
  const IconComponent = ICON_MAP[icon];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-muted">
      {IconComponent && <IconComponent className="h-3 w-3" />}
      <span>{label}</span>
      <span className="ml-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
        Non assigné
      </span>
    </span>
  );
}

/** Colored status badge */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/** Delay badge */
function DelayBadge({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      <AlertTriangle className="h-3 w-3" />
      Retardé {minutes} min
    </span>
  );
}

/** Deadline info line */
function DeadlineLine({ deadlineAt }: { deadlineAt: string | null }) {
  if (!deadlineAt) return null;
  const info = getDeadlineInfo(deadlineAt);
  if (!info) return null;

  return (
    <div className={`flex items-center gap-1.5 text-[11px] ${info.isExpired ? 'text-red-400' : 'text-muted'}`}>
      <Timer className="h-3 w-3" />
      <span>
        {info.isExpired
          ? `Délai dépassé`
          : `Délai : ${info.label}`}
      </span>
    </div>
  );
}

/** A single service card */
function ServiceCard({
  service,
  oratorForm,
  oratorPoints,
  orderItems,
  formLinks,
}: {
  service: WorshipService;
  oratorForm: WorshipOratorForm | null;
  oratorPoints: WorshipOratorPoint[];
  orderItems: WorshipOrderItem[];
  formLinks: WorshipFormLink[];
}) {
  const typeCfg = WORSHIP_TYPE_CONFIGS[service.type];
  const accentColor = typeCfg?.color ?? 'text-cream';
  const typeLabel = SERVICE_TYPE_LABELS[service.type] ?? service.type;
  const roles = rolesForType(service.type);
  const [expanded, setExpanded] = useState(false);

  const oratorLinks = formLinks.filter(l => l.link_type === 'orator');
  const presidentLinks = formLinks.filter(l => l.link_type === 'president');
  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${BASE_URL}/#/form-culte/${token}`);
    } catch { /* clipboard unavailable */ }
  };

  const openWhatsApp = (link: WorshipFormLink) => {
    const formType = link.link_type === 'orator' ? 'orateur' : 'président';
    const dateStr = formatDate(service.date);
    let message = `Bonjour ${link.recipient_name || ''},\n\nVoici le lien pour remplir le formulaire ${formType} du culte du ${dateStr} :\n\n${BASE_URL}/#/form-culte/${link.token}\n\nCe lien expire dans 7 jours.`;
    const phone = (link.recipient_phone || '').replace(/[^0-9]/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    supabase.from('worship_form_links').update({ sent_at: new Date().toISOString() }).eq('id', link.id).then(() => {}).catch(() => {});
  };

  const sendFormContentWhatsApp = () => {
    let message = '';
    if (oratorForm) {
      message = `*FORMULAIRE ORATEUR*\n`;
      message += `Culte: ${formatDate(service.date)} ${formatTime(service.time)}\n`;
      message += `Type: ${typeLabel}\n\n`;
      message += `*Orateur:* ${oratorForm.orator_name || service.orator_name || '-'}\n`;
      message += `*Thème:* ${oratorForm.theme || '-'}\n`;
      if (oratorForm.sub_theme) message += `*Sous-thème:* ${oratorForm.sub_theme}\n`;
      if (oratorForm.bible_book) message += `*Verset:* ${oratorForm.bible_book} ${oratorForm.bible_chapter || ''}:${oratorForm.bible_verses || ''}\n`;
      if (oratorPoints.length > 0) {
        message += `\n*Points du message:*\n`;
        oratorPoints.forEach((p, i) => {
          message += `${i + 1}. ${p.title}`;
          if (p.description) message += ` — ${p.description}`;
          message += '\n';
        });
      }
    }
    if (orderItems.length > 0) {
      if (message) message += '\n';
      message += `*ORDRE DU CULTE*\n`;
      message += `Président: ${service.president_name || '-'}\n\n`;
      orderItems.forEach((item, i) => {
        const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
        message += `${i + 1}. ${item.custom_label || label} (${item.duration_minutes} min)\n`;
        if (item.notes) message += `   Notes: ${item.notes}\n`;
      });
      const total = orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);
      message += `\n*Durée totale:* ${total} min`;
    }
    if (!message) return;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-colors hover:bg-white/[0.04]">
      {/* Header row */}
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${accentColor.replace('text-', 'bg-').replace('300', '400')}`} />
            <h4 className={`text-sm font-semibold ${accentColor}`}>{typeLabel}</h4>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={service.status} />
            {service.is_delayed && service.delayed_minutes > 0 && (
              <DelayBadge minutes={service.delayed_minutes} />
            )}
          </div>
        </div>

        {/* Date / time */}
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(service.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(service.time)}{typeCfg?.endTime ? `\u2013${typeCfg.endTime}` : ''}
          </span>
        </div>

        {/* Deadline */}
        <DeadlineLine deadlineAt={service.form_deadline_at} />

        {/* Known roles — Orateur & Président */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Orateur */}
          <div className="flex items-center gap-2 rounded-lg bg-accent-400/5 border border-accent-400/10 px-3 py-2">
            <Mic className={`h-4 w-4 ${accentColor}`} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted">Orateur</p>
              <p className={`text-sm font-medium truncate ${accentColor}`}>
                {service.orator_name ?? 'En attente'}
              </p>
            </div>
          </div>

          {/* Président */}
          <div className="flex items-center gap-2 rounded-lg bg-purple-500/5 border border-purple-500/10 px-3 py-2">
            <Users className="h-4 w-4 text-purple-400" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted">Président</p>
              <p className="text-sm font-medium truncate text-purple-300">
                {service.president_name ?? 'En attente'}
              </p>
            </div>
          </div>
        </div>

        {/* Form submission status indicators */}
        <div className="flex gap-3 pt-0.5">
          <span className={`text-[10px] flex items-center gap-1 ${oratorForm ? 'text-green-400' : 'text-muted'}`}>
            {oratorForm
              ? <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              : <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />}
            Formulaire orateur
          </span>
          <span className={`text-[10px] flex items-center gap-1 ${orderItems.length > 0 ? 'text-green-400' : 'text-muted'}`}>
            {orderItems.length > 0
              ? <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              : <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />}
            Ordre du culte
          </span>
        </div>

        {/* Other media roles — placeholder chips */}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {roles.map((role) => (
              <RoleChip key={role.key} label={role.label} icon={role.icon} />
            ))}
          </div>
        )}

        {/* Expand / collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-accent-400 hover:text-accent-300 transition-colors w-full justify-center pt-1"
        >
          <Eye className="h-3.5 w-3.5" />
          {expanded ? 'Masquer les détails' : 'Voir les détails du formulaire'}
        </button>
      </div>

      {/* Expanded section: form details + actions */}
      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3 bg-white/[0.02]">
          {/* Orator form content */}
          {oratorForm && (
            <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10 space-y-1.5">
              <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Formulaire Orateur</p>
              <p className="text-sm font-medium text-cream">{oratorForm.theme}</p>
              {oratorForm.sub_theme && <p className="text-xs text-cream/70">Sous-thème : {oratorForm.sub_theme}</p>}
              {oratorForm.bible_book && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {oratorForm.bible_book} {oratorForm.bible_chapter && oratorForm.bible_verses ? `${oratorForm.bible_chapter}:${oratorForm.bible_verses}` : ''}
                </p>
              )}
              {oratorPoints.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {oratorPoints.map(p => (
                    <li key={p.id} className="text-[11px] text-muted">
                      <span className="text-cream/80 font-medium">{p.title}</span>
                      {p.description && <span className="ml-1">— {p.description}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Order items */}
          {orderItems.length > 0 && (
            <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/10 space-y-1.5">
              <p className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">Ordre du Culte</p>
              {orderItems.map((item, i) => {
                const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
                return (
                  <div key={item.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-cream/80">
                      <span className="text-muted mr-1">{i + 1}.</span>
                      {item.custom_label || label}
                    </span>
                    <span className="text-muted">{item.duration_minutes} min</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted pt-1 border-t border-purple-500/10">
                Durée totale : {orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0)} min
              </p>
            </div>
          )}

          {/* Quick actions */}
          <div className="space-y-2 pt-1">
            {/* WhatsApp send form content */}
            {(oratorForm || orderItems.length > 0) && (
              <button
                onClick={sendFormContentWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium transition-colors border border-green-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                Envoyer le programme par WhatsApp
              </button>
            )}

            {/* Link actions */}
            <div className="grid grid-cols-2 gap-2">
              {oratorLinks.length > 0 && oratorLinks.map(link => (
                <div key={link.id} className="flex gap-1">
                  <button onClick={() => copyLink(link.token)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-cream text-[11px] transition-colors border border-white/10">
                    <Copy className="h-3 w-3" /> Copier orateur
                  </button>
                  <button onClick={() => openWhatsApp(link)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 text-[11px] transition-colors border border-green-500/15">
                    <Send className="h-3 w-3" /> WA orateur
                  </button>
                </div>
              ))}
              {presidentLinks.length > 0 && presidentLinks.map(link => (
                <div key={link.id} className="flex gap-1">
                  <button onClick={() => copyLink(link.token)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-cream text-[11px] transition-colors border border-white/10">
                    <Copy className="h-3 w-3" /> Copier président
                  </button>
                  <button onClick={() => openWhatsApp(link)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 text-[11px] transition-colors border border-green-500/15">
                    <Send className="h-3 w-3" /> WA président
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Collapsible accordion section */
function AccordionSection({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = true,
  accentColor,
}: {
  title: string;
  icon: React.FC<{ className?: string }>;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4.5 w-4.5 ${accentColor ?? 'text-cream'}`} />
          <span className="text-sm font-semibold text-cream">{title}</span>
          {count > 0 && (
            <span className="rounded-full bg-accent-400/10 px-2 py-0.5 text-[11px] font-medium text-muted">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MediaCenterSection({ accentColor }: { accentColor?: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [services, setServices] = useState<WorshipService[]>([]);
  const [oratorForms, setOratorForms] = useState<Record<string, { form: WorshipOratorForm; points: WorshipOratorPoint[] }>>({});
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, WorshipOrderItem[]>>({});
  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch upcoming services + form data
  // -----------------------------------------------------------------------
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('worship_services')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        if (isTableNotFoundError(error)) {
          setTableMissing(true);
        } else {
          console.error('[MediaCenter] fetch error:', error);
          addToast?.({ type: 'error', message: 'Impossible de charger le programme.' });
        }
        setServices([]);
        return;
      }

      const svcs = (data ?? []) as WorshipService[];
      setServices(svcs);

      // Fetch orator forms, points, order items, and form links for all services
      const [linksRes] = await Promise.allSettled([
        supabase.from('worship_form_links').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (linksRes.status === 'fulfilled' && linksRes.value.data) {
        setFormLinks(linksRes.value.data as WorshipFormLink[]);
      }

      // Load form data for each service
      for (const svc of svcs) {
        const [formRes, orderRes] = await Promise.allSettled([
          supabase.from('worship_orator_forms').select('*').eq('service_id', svc.id).single(),
          supabase.from('worship_order_items').select('*').eq('service_id', svc.id).order('position'),
        ]);

        if (formRes.status === 'fulfilled' && formRes.value.data) {
          const form = formRes.value.data as WorshipOratorForm;
          const { data: ptsData } = await supabase.from('worship_orator_points').select('*').eq('form_id', form.id).order('position');
          setOratorForms(prev => ({
            ...prev,
            [svc.id]: { form, points: (ptsData as WorshipOratorPoint[]) || [] },
          }));
        }

        if (orderRes.status === 'fulfilled' && orderRes.value.data) {
          setOrderItemsMap(prev => ({
            ...prev,
            [svc.id]: orderRes.value.data as WorshipOrderItem[],
          }));
        }
      }
    } catch (err) {
      console.error('[MediaCenter] unexpected error:', err);
      addToast?.({ type: 'error', message: 'Erreur lors du chargement du programme.' });
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // -----------------------------------------------------------------------
  // Group services by type
  // -----------------------------------------------------------------------
  const weeklyServices = services.filter((s) =>
    (WEEKLY_TYPES as readonly string[]).includes(s.type),
  );
  const specialServices = services.filter(
    (s) => !(WEEKLY_TYPES as readonly string[]).includes(s.type),
  );

  // Group weekly services in the canonical order
  const groupedWeekly = WEEKLY_TYPES.map((type) => ({
    type,
    label: SERVICE_TYPE_LABELS[type] ?? type,
    items: weeklyServices.filter((s) => s.type === type),
  })).filter((g) => g.items.length > 0);

  // Group special services by type
  const specialTypes = Array.from(new Set(specialServices.map((s) => s.type)));
  const groupedSpecial = specialTypes.map((type) => ({
    type,
    label: SERVICE_TYPE_LABELS[type] ?? type,
    items: specialServices.filter((s) => s.type === type),
  }));

  // Helper: get links for a service
  const linksForService = (svcId: string) => formLinks.filter(l => l.service_id === svcId);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Chargement du programme…</span>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Info className="h-6 w-6" />
        <span className="text-sm">Module en cours de configuration</span>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Calendar className="h-8 w-8 opacity-40" />
        <span className="text-sm">Aucun culte à venir</span>
        <span className="text-xs text-muted/60">
          Les prochaines planifications apparaîtront ici.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MonitorPlay className={`h-5 w-5 ${accentColor ?? 'text-cream'}`} />
        <h3 className="text-base font-semibold text-cream">Centre Multimédia</h3>
        <span className="text-[10px] text-muted ml-1">Programme des personnes de service</span>
      </div>

      {/* Weekly programme */}
      <AccordionSection
        title="Programme hebdomadaire"
        icon={Calendar}
        count={weeklyServices.length}
        accentColor={accentColor}
        defaultOpen
      >
        {groupedWeekly.length === 0 && (
          <p className="text-xs text-muted py-2">Aucun culte prévu cette semaine.</p>
        )}

        {groupedWeekly.map((group) => (
          <div key={group.type} className="space-y-2">
            <div className="flex items-center gap-2 pt-1">
              <span className={`inline-block h-2 w-2 rounded-full ${WORSHIP_TYPE_CONFIGS[group.type]?.color.replace('text-', 'bg-').replace('300', '400') ?? 'bg-cream'}`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${WORSHIP_TYPE_CONFIGS[group.type]?.color ?? 'text-cream'}`}>
                {group.label}
              </span>
              <span className="text-[10px] text-muted">
                {group.items.length} culte{group.items.length > 1 ? 's' : ''}
              </span>
            </div>

            {group.items.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                oratorForm={oratorForms[svc.id]?.form ?? null}
                oratorPoints={oratorForms[svc.id]?.points ?? []}
                orderItems={orderItemsMap[svc.id] ?? []}
                formLinks={linksForService(svc.id)}
              />
            ))}
          </div>
        ))}
      </AccordionSection>

      {/* Special events (only if any) */}
      {specialServices.length > 0 && (
        <AccordionSection
          title="Événements spéciaux"
          icon={Info}
          count={specialServices.length}
          accentColor={accentColor}
          defaultOpen={false}
        >
          {groupedSpecial.map((group) => (
            <div key={group.type} className="space-y-2">
              <div className="flex items-center gap-2 pt-1">
                <span className={`inline-block h-2 w-2 rounded-full ${WORSHIP_TYPE_CONFIGS[group.type]?.color.replace('text-', 'bg-').replace('300', '400') ?? 'bg-cream'}`} />
                <span className={`text-xs font-medium uppercase tracking-wider ${WORSHIP_TYPE_CONFIGS[group.type]?.color ?? 'text-cream'}`}>
                  {group.label}
                </span>
              </div>

              {group.items.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  oratorForm={oratorForms[svc.id]?.form ?? null}
                  oratorPoints={oratorForms[svc.id]?.points ?? []}
                  orderItems={orderItemsMap[svc.id] ?? []}
                  formLinks={linksForService(svc.id)}
                />
              ))}
            </div>
          ))}
        </AccordionSection>
      )}
    </div>
  );
}