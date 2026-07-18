import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Calendar, Users, Mic, MonitorPlay, Volume2, UserPlus, FileText, Clock, AlertTriangle, Loader2, Info, Timer, ChevronDown,
} from '../../lib/icons';
import { WORSHIP_TYPE_CONFIGS, SERVICE_TYPE_LABELS, STATUS_CONFIG, isTableNotFoundError, formatDate, formatTime, getDeadlineInfo } from '../admin/tabs/PlanificationTab';
import type { WorshipService } from '../../types';

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
  if (type === 'dimanche') return FULL_ROLES;
  return STANDARD_ROLES;
}

// ---------------------------------------------------------------------------
// Constants – the four standard worship types shown in "Programme hebdomadaire"
// ---------------------------------------------------------------------------
const WEEKLY_TYPES = [
  'mercredi',
  'vendredi',
  'samedi',
  'dimanche',
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
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.className}`}
    >
      {cfg.dot && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
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
    <div
      className={`flex items-center gap-1.5 text-[11px] ${
        info.isOverdue ? 'text-red-400' : 'text-muted'
      }`}
    >
      <Timer className="h-3 w-3" />
      <span>
        {info.isOverdue
          ? `Délai dépassé depuis ${info.text}`
          : `Délai : ${info.text}`}
      </span>
    </div>
  );
}

/** A single service card */
function ServiceCard({ service }: { service: WorshipService }) {
  const typeCfg = WORSHIP_TYPE_CONFIGS[service.type];
  const accentColor = typeCfg?.color ?? 'text-cream';
  const typeLabel = SERVICE_TYPE_LABELS[service.type] ?? service.type;
  const roles = rolesForType(service.type);

  return (
    <div className="glass-card rounded-xl p-4 space-y-3 transition-colors hover:bg-white/[0.04]">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${typeCfg?.dot ?? 'bg-cream'}`}
          />
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
          {formatTime(service.time)}
        </span>
      </div>

      {/* Deadline */}
      <DeadlineLine deadlineAt={service.form_deadline_at} />

      {/* Known roles – Orateur & Président */}
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
        <div className="flex items-center gap-2 rounded-lg bg-accent-400/5 border border-accent-400/10 px-3 py-2">
          <Users className={`h-4 w-4 ${accentColor}`} />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">Président</p>
            <p className={`text-sm font-medium truncate ${accentColor}`}>
              {service.president_name ?? 'En attente'}
            </p>
          </div>
        </div>
      </div>

      {/* Other media roles – placeholder chips */}
      {roles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {roles.map((role) => (
            <RoleChip key={role.key} label={role.label} icon={role.icon} />
          ))}
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
          className={`h-4 w-4 text-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
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
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch upcoming services
  // -----------------------------------------------------------------------
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

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
          addToast?.({
            type: 'error',
            message: 'Impossible de charger le programme.',
          });
        }
        setServices([]);
        return;
      }

      setServices((data ?? []) as WorshipService[]);
    } catch (err) {
      console.error('[MediaCenter] unexpected error:', err);
      addToast?.({
        type: 'error',
        message: 'Erreur lors du chargement du programme.',
      });
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

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Loading state
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Chargement du programme…</span>
      </div>
    );
  }

  // Table not found
  if (tableMissing) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Info className="h-6 w-6" />
        <span className="text-sm">Module en cours de configuration</span>
      </div>
    );
  }

  // Empty state
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
            {/* Type sub-heading */}
            <div className="flex items-center gap-2 pt-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  WORSHIP_TYPE_CONFIGS[group.type]?.dot ?? 'bg-cream'
                }`}
              />
              <span
                className={`text-xs font-medium uppercase tracking-wider ${
                  WORSHIP_TYPE_CONFIGS[group.type]?.color ?? 'text-cream'
                }`}
              >
                {group.label}
              </span>
              <span className="text-[10px] text-muted">
                {group.items.length} culte{group.items.length > 1 ? 's' : ''}
              </span>
            </div>

            {group.items.map((svc) => (
              <ServiceCard key={svc.id} service={svc} />
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
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    WORSHIP_TYPE_CONFIGS[group.type]?.dot ?? 'bg-cream'
                  }`}
                />
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${
                    WORSHIP_TYPE_CONFIGS[group.type]?.color ?? 'text-cream'
                  }`}
                >
                  {group.label}
                </span>
              </div>

              {group.items.map((svc) => (
                <ServiceCard key={svc.id} service={svc} />
              ))}
            </div>
          ))}
        </AccordionSection>
      )}
    </div>
  );
}