import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { openWhatsApp } from '../../lib/whatsapp';
import {
  MapPin, Users, Heart, Phone, CheckCircle, Loader2, Info,
  Calendar, TrendingUp, UserPlus, ChevronRight, MessageCircle,
  Clock, Eye, BookOpen, AlertTriangle, Zap, UserCheck,
} from '../../lib/icons';
import { formatDate } from '../../lib/date';
import {
  EVANGELISM_OUTING_STATUS_LABELS, EVANGELISM_OUTING_STATUS_COLORS,
  EVANGELISM_DECISION_LABELS, EVANGELISM_CONTACT_STATUS_LABELS,
  EVANGELISM_CONTACT_STATUS_COLORS, EVANGELISM_PIPELINE_STAGES,
  EVANGELISM_PIPELINE_STAGE_LABELS, EVANGELISM_RDV_STATUS_LABELS,
  EVANGELISM_SOURCE_LABELS, EVANGELISM_STATS,
} from '../../types';
import type {
  EvangelismOuting, EvangelismContact, EvangelismPipelineStage,
  EvangelismStats, EvangelismRdvStatus,
} from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isTableNotFoundError(err: any): boolean {
  return err?.message?.includes('does not exist') || err?.code === '42P01';
}

function isPastor(roleLevel?: number): boolean {
  return (roleLevel ?? 0) >= 4;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status, labels, colors }: { status: string; labels: Record<string, string>; colors: Record<string, string> }) {
  const label = labels[status] || status;
  const cls = colors[status] || 'bg-gray-500/15 text-gray-300 border-gray-500/20';
  return <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

/** Pipeline horizontal bar showing stage counts */
function PipelineBar({ contacts, accentColor }: { contacts: EvangelismContact[]; accentColor?: string }) {
  const stageKeys = EVANGELISM_PIPELINE_STAGES.filter(s => s.key !== 'perdu_de_vue');
  const counts = stageKeys.map(s => ({
    ...s,
    count: contacts.filter(c => (c.pipeline_stage || 'nouveau_contact') === s.key).length,
  }));
  const total = counts.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className={`h-4 w-4 ${accentColor ?? 'text-amber-400'}`} />
        <span className="text-sm font-medium text-cream/80">Pipeline des Âmes</span>
        <span className="text-[10px] text-muted">({contacts.length} contacts)</span>
      </div>
      {/* Funnel bar */}
      <div className="flex rounded-lg overflow-hidden h-3">
        {counts.map(s => (
          <div
            key={s.key}
            className={`${s.bg} transition-all duration-500 hover:opacity-90`}
            style={{ width: `${(s.count / total) * 100}%`, minWidth: s.count > 0 ? '4px' : '0' }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      {/* Stage labels */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {stageKeys.map(s => {
          const count = counts.find(c => c.key === s.key)?.count ?? 0;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${s.bg}`} />
              <span className={`text-[10px] ${s.color}`}>{s.label}</span>
              <span className="text-[10px] text-muted font-semibold">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Single contact row with WhatsApp button */
function ContactRow({ contact, onWhatsApp, onPipelineAdvance, showPipeline }: {
  contact: EvangelismContact;
  onWhatsApp: (c: EvangelismContact) => void;
  onPipelineAdvance: (c: EvangelismContact) => void;
  showPipeline: boolean;
}) {
  const phone = contact.whatsapp || contact.phone;
  const stageLabel = EVANGELISM_PIPELINE_STAGE_LABELS[contact.pipeline_stage || 'nouveau_contact'] || 'Nouveau';
  const stageCfg = EVANGELISM_PIPELINE_STAGES.find(s => s.key === (contact.pipeline_stage || 'nouveau_contact'));

  return (
    <div className="glass-card rounded-xl p-3 flex items-center justify-between gap-2 hover:bg-white/[0.04] transition-colors group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-cream truncate">{contact.full_name}</p>
          {contact.is_new_visitor && (
            <span className="shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
              Nouveau venu
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {phone && <span className="text-[11px] text-muted">{phone}</span>}
          {contact.quartier && <span className="text-[10px] text-muted/60">· {contact.quartier}</span>}
          {contact.rdv_date && (
            <span className="flex items-center gap-0.5 text-[10px] text-purple-300">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(contact.rdv_date)} {contact.rdv_time || ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {showPipeline && stageCfg && (
          <span className={`rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-medium ${stageCfg.color}`}>
            {stageLabel}
          </span>
        )}
        <StatusBadge status={contact.decision} labels={EVANGELISM_DECISION_LABELS} colors={EVANGELISM_CONTACT_STATUS_COLORS} />
        {phone && (
          <button
            onClick={() => onWhatsApp(contact)}
            className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
            title="Contacter via WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onPipelineAdvance(contact)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors opacity-0 group-hover:opacity-100"
          title="Avancer dans le pipeline"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Rendez-vous upcoming panel */
function RdvPanel({ contacts, onWhatsApp }: { contacts: EvangelismContact[]; onWhatsApp: (c: EvangelismContact) => void }) {
  const upcoming = contacts
    .filter(c => c.rdv_date && c.rdv_status === 'planifie' && c.rdv_date >= todayISO())
    .sort((a, b) => a.rdv_date!.localeCompare(b.rdv_date!))
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-purple-400/70" />
        <span className="text-sm font-medium text-cream/80">Rendez-vous à venir</span>
        <span className="text-[10px] text-muted">({upcoming.length})</span>
      </div>
      {upcoming.map(contact => {
        const phone = contact.whatsapp || contact.phone;
        return (
          <div key={contact.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cream truncate">{contact.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-purple-300 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(contact.rdv_date!)} {contact.rdv_time || ''}
                </span>
                {contact.rdv_type && (
                  <span className="text-[10px] text-muted">{EVANGELISM_RDV_STATUS_LABELS['planifie']}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {phone && (
                <button
                  onClick={() => onWhatsApp(contact)}
                  className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
                  title="Rappeler via WhatsApp"
                >
                  <Phone className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="rounded-md bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-[9px] text-purple-300">
                RDV
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** New visitors panel — contacts from cultes */
function NewVisitorsPanel({ contacts, onWhatsApp }: { contacts: EvangelismContact[]; onWhatsApp: (c: EvangelismContact) => void }) {
  const visitors = contacts.filter(c => c.is_new_visitor).slice(0, 4);
  if (visitors.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-emerald-400/70" />
        <span className="text-sm font-medium text-cream/80">Nouveaux venus reçus</span>
        <span className="text-[10px] text-muted">({visitors.length})</span>
      </div>
      {visitors.map(c => {
        const phone = c.whatsapp || c.phone;
        return (
          <div key={c.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-cream truncate">{c.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {c.source && <span className="text-[10px] text-muted">{EVANGELISM_SOURCE_LABELS[c.source as keyof typeof EVANGELISM_SOURCE_LABELS] || c.source}</span>}
                {c.quartier && <span className="text-[10px] text-muted/60">· {c.quartier}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={c.status} labels={EVANGELISM_CONTACT_STATUS_LABELS} colors={EVANGELISM_CONTACT_STATUS_COLORS} />
              {phone && (
                <button
                  onClick={() => onWhatsApp(c)}
                  className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors"
                  title="Accueillir via WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Pastor statistics panel */
function PastorStatsPanel({ stats, contacts }: { stats: EvangelismStats; contacts: EvangelismContact[] }) {
  const pipelineCounts = EVANGELISM_PIPELINE_STAGES.map(s => ({
    ...s,
    count: contacts.filter(c => (c.pipeline_stage || 'nouveau_contact') === s.key).length,
  }));

  // Conversion rate
  const total = stats.total_contacts || 1;
  const convRate = Math.round(((stats.integrated + stats.baptized) / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-amber-400/70" />
        <span className="text-sm font-medium text-cream/80">Rapport & Statistiques</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Taux de rétention', value: `${convRate}%`, icon: TrendingUp, color: 'text-amber-400' },
          { label: 'RDV en attente', value: stats.rdv_pending, icon: Calendar, color: 'text-purple-400' },
          { label: 'En affermissement', value: stats.in_discipleship, icon: BookOpen, color: 'text-orange-400' },
          { label: 'Nouveaux venus', value: stats.new_visitors, icon: UserPlus, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <s.icon className={`h-4 w-4 ${s.color} shrink-0`} />
            <div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini pipeline breakdown */}
      <div className="glass-card rounded-lg p-3 space-y-1.5">
        <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Pipeline détaillé</span>
        {pipelineCounts.filter(s => s.count > 0).map(s => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${s.bg}`} />
              <span className="text-xs text-cream/80">{s.label}</span>
            </div>
            <span className={`text-xs font-bold ${s.color}`}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function EvangelismDashboardSection({ accentColor }: { accentColor?: string }) {
  const { addToast } = useToast();
  const { profile } = useAuth();

  const [outings, setOutings] = useState<EvangelismOuting[]>([]);
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [stats, setStats] = useState<EvangelismStats>({
    total_outings: 0, total_contacts: 0, decisions: 0, integrated: 0,
    came_to_culte: 0, followups_done: 0, active_followups: 0, baptized: 0,
    new_visitors: 0, rdv_pending: 0, in_discipleship: 0, rdv_completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'contacts' | 'rdv' | 'stats'>('pipeline');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [outingsRes, contactsRes, statsRes] = await Promise.allSettled([
        supabase.from('evangelism_outings').select('*').order('outing_date', { ascending: false }).limit(20),
        supabase.from('evangelism_contacts').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('v_evangelism_stats').select('*').single(),
      ]);

      if (outingsRes.status === 'rejected' && isTableNotFoundError(outingsRes.reason)) {
        setTableMissing(true);
        setLoading(false);
        return;
      }

      const oData = outingsRes.status === 'fulfilled' ? (outingsRes.value.data as EvangelismOuting[] || []) : [];
      const cData = contactsRes.status === 'fulfilled' ? (contactsRes.value.data as EvangelismContact[] || []) : [];

      setOutings(oData);
      setContacts(cData);

      // Stats from view or computed
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        const s = statsRes.value.data as any;
        setStats({
          total_outings: s.total_outings ?? oData.length,
          total_contacts: s.total_contacts ?? cData.length,
          decisions: s.decisions ?? 0,
          integrated: s.integrated ?? 0,
          came_to_culte: s.came_to_culte ?? 0,
          followups_done: s.followups_done ?? 0,
          active_followups: s.active_followups ?? 0,
          baptized: s.baptized ?? 0,
          new_visitors: s.new_visitors ?? cData.filter(c => c.is_new_visitor).length,
          rdv_pending: s.rdv_pending ?? cData.filter(c => c.rdv_status === 'planifie').length,
          in_discipleship: s.in_discipleship ?? cData.filter(c => c.pipeline_stage === 'affermi').length,
          rdv_completed: s.rdv_completed ?? cData.filter(c => c.rdv_status === 'realise').length,
        });
      } else {
        const now = new Date();
        setStats({
          total_outings: oData.length,
          total_contacts: cData.length,
          decisions: cData.filter(c => c.decision === 'accepte_christ' || c.decision === 'veut_venir_eglise').length,
          integrated: cData.filter(c => c.status === 'integre_eglise').length,
          came_to_culte: cData.filter(c => c.came_to_culte).length,
          followups_done: 0,
          active_followups: cData.filter(c => c.status === 'a_contacter' || c.status === 'en_suivi').length,
          baptized: cData.filter(c => c.baptized).length,
          new_visitors: cData.filter(c => c.is_new_visitor).length,
          rdv_pending: cData.filter(c => c.rdv_status === 'planifie').length,
          in_discipleship: cData.filter(c => c.pipeline_stage === 'affermi').length,
          rdv_completed: cData.filter(c => c.rdv_status === 'realise').length,
        });
      }
    } catch {
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── WhatsApp handler ─────────────────────────────────────────
  const handleWhatsApp = useCallback((contact: EvangelismContact) => {
    const phone = contact.whatsapp || contact.phone;
    const greeting = contact.is_new_visitor
      ? `Bonjour ${contact.full_name}, merci d'avoir visité La Conquête. Nous sommes heureux de vous accueillir et voulons prendre de vos nouvelles.`
      : `Bonjour ${contact.full_name}, c'est l'équipe d'évangélisation de La Conquête. Nous voulons prendre de vos nouvelles.`;
    openWhatsApp(phone, greeting);
  }, []);

  // ── Pipeline advance ─────────────────────────────────────────
  const handlePipelineAdvance = useCallback(async (contact: EvangelismContact) => {
    const stages = EVANGELISM_PIPELINE_STAGES.map(s => s.key);
    const currentIdx = stages.indexOf(contact.pipeline_stage || 'nouveau_contact');
    if (currentIdx >= stages.length - 2) return; // Don't auto-advance past integre or to perdu_de_vue
    const nextStage = stages[currentIdx + 1];

    const updatePayload: any = { pipeline_stage: nextStage };

    // Auto-set relevant timestamps
    if (nextStage === 'premier_contact' && !contact.first_call_at) {
      updatePayload.first_call_at = new Date().toISOString();
    }
    if (nextStage === 'en_suivi' && !contact.first_contact_at) {
      updatePayload.first_contact_at = new Date().toISOString();
    }
    if (nextStage === 'integre_eglise') {
      updatePayload.status = 'integre_eglise';
    }

    try {
      const { error } = await supabase
        .from('evangelism_contacts')
        .update(updatePayload)
        .eq('id', contact.id);
      if (error) throw error;
      const label = EVANGELISM_PIPELINE_STAGE_LABELS[nextStage as EvangelismPipelineStage] || nextStage;
      addToast(`${contact.full_name} → ${label}`, 'success');
      fetchAll();
    } catch {
      addToast('Erreur lors de la mise à jour du pipeline', 'error');
    }
  }, [addToast, fetchAll]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Chargement du module évangélisation…</span>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Info className="h-6 w-6" />
        <span className="text-sm">Module évangélisation en cours de configuration</span>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const upcomingOutings = outings.filter(o => o.outing_date >= today && o.status !== 'annulee').slice(0, 3);
  const pendingContacts = contacts.filter(c => c.status === 'a_contacter' || c.status === 'en_suivi').slice(0, 6);
  const showPastorStats = isPastor(profile?.role_level);
  const TABS = [
    { key: 'pipeline' as const, label: 'Pipeline', Icon: Zap },
    { key: 'contacts' as const, label: 'Suivi', Icon: Phone },
    { key: 'rdv' as const, label: 'RDV', Icon: Calendar },
    ...(showPastorStats ? [{ key: 'stats' as const, label: 'Rapport', Icon: Eye }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Heart className={`h-5 w-5 ${accentColor ?? 'text-cream'}`} />
        <h3 className="text-base font-semibold text-cream">Évangélisation & Pipeline des Âmes</h3>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Sorties', value: stats.total_outings, icon: MapPin, color: 'text-blue-400' },
          { label: 'Contacts', value: stats.total_contacts, icon: UserPlus, color: 'text-green-400' },
          { label: 'Décisions', value: stats.decisions, icon: TrendingUp, color: 'text-amber-400' },
          { label: 'RDV en attente', value: stats.rdv_pending, icon: Calendar, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <s.icon className={`h-4 w-4 ${s.color} shrink-0`} />
            <div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline bar (always visible) */}
      <PipelineBar contacts={contacts} accentColor={accentColor} />

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-accent-400 text-accent-400'
                : 'border-transparent text-muted hover:text-cream/70'
            }`}
          >
            <tab.Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pipeline' && (
        <div className="space-y-3">
          {/* Upcoming outings */}
          {upcomingOutings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cream/60" />
                <span className="text-sm font-medium text-cream/80">Prochaines sorties</span>
              </div>
              {upcomingOutings.map(outing => (
                <div key={outing.id} className="glass-card rounded-xl p-3.5 space-y-2 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-cream truncate">{outing.title}</h4>
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />{outing.location}{outing.location_quartier ? ` — ${outing.location_quartier}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={outing.status} labels={EVANGELISM_OUTING_STATUS_LABELS} colors={EVANGELISM_OUTING_STATUS_COLORS} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(outing.outing_date)}</span>
                    <span>{outing.start_time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New visitors from cultes */}
          <NewVisitorsPanel contacts={contacts} onWhatsApp={handleWhatsApp} />

          {/* Pipeline contacts - all in stage order */}
          {pendingContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cream/60" />
                <span className="text-sm font-medium text-cream/80">Contacts à suivre ({pendingContacts.length})</span>
              </div>
              {pendingContacts.map(contact => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onWhatsApp={handleWhatsApp}
                  onPipelineAdvance={handlePipelineAdvance}
                  showPipeline
                />
              ))}
            </div>
          )}

          {outings.length === 0 && contacts.length === 0 && (
            <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
              <Heart className="h-8 w-8 opacity-40" />
              <span className="text-sm">Aucune activité d'évangélisation</span>
              <span className="text-xs text-muted/60">Les prochaines sorties apparaîtront ici.</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-orange-400/70" />
            <span className="text-sm font-medium text-cream/80">Tous les contacts à suivre</span>
          </div>
          {contacts.filter(c => c.status !== 'integre_eglise' && c.pipeline_stage !== 'baptise').slice(0, 10).map(contact => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onWhatsApp={handleWhatsApp}
              onPipelineAdvance={handlePipelineAdvance}
              showPipeline
            />
          ))}
          {contacts.length === 0 && (
            <div className="glass-card rounded-xl p-6 text-center text-muted text-sm">
              Aucun contact pour le moment
            </div>
          )}
        </div>
      )}

      {activeTab === 'rdv' && (
        <RdvPanel contacts={contacts} onWhatsApp={handleWhatsApp} />
      )}

      {activeTab === 'stats' && (
        <PastorStatsPanel stats={stats} contacts={contacts} />
      )}
    </div>
  );
}