import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  MapPin, Users, Heart, Phone, CheckCircle, Loader2, Info,
  Calendar, TrendingUp, UserPlus,
} from '../../lib/icons';
import { openWhatsApp } from '../../lib/whatsapp';
import { formatDate } from '../../lib/date';
import {
  EVANGELISM_OUTING_STATUS_LABELS, EVANGELISM_OUTING_STATUS_COLORS,
  EVANGELISM_DECISION_LABELS, EVANGELISM_CONTACT_STATUS_LABELS,
  EVANGELISM_CONTACT_STATUS_COLORS,
} from '../../types';
import type { EvangelismOuting, EvangelismContact } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isTableNotFoundError(err: any): boolean {
  return err?.message?.includes('does not exist') || err?.code === '42P01';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status, labels, colors }: { status: string; labels: Record<string, string>; colors: Record<string, string> }) {
  const label = labels[status] || status;
  const cls = colors[status] || 'bg-gray-500/15 text-gray-300 border-gray-500/20';
  return <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function EvangelismDashboardSection({ accentColor }: { accentColor?: string }) {
  const { addToast } = useToast();

  const [outings, setOutings] = useState<EvangelismOuting[]>([]);
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, decisions: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [outingsRes, contactsRes] = await Promise.allSettled([
        supabase.from('evangelism_outings').select('*').order('outing_date', { ascending: false }).limit(20),
        supabase.from('evangelism_contacts').select('*').order('created_at', { ascending: false }).limit(50),
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

      // Stats
      const now = new Date();
      const thisMonth = cData.filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      const decisions = cData.filter(c => c.decision === 'accepte_christ' || c.decision === 'veut_venir_eglise').length;
      const active = cData.filter(c => c.status === 'a_contacter' || c.status === 'en_suivi').length;

      setStats({ total: oData.length, thisMonth, decisions, active });
    } catch {
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  // Upcoming outings (future or recent)
  const today = new Date().toISOString().split('T')[0];
  const upcomingOutings = outings.filter(o => o.outing_date >= today && o.status !== 'annulee').slice(0, 3);
  const recentContacts = contacts.slice(0, 5);
  const pendingContacts = contacts.filter(c => c.status === 'a_contacter').slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Heart className={`h-5 w-5 ${accentColor ?? 'text-cream'}`} />
        <h3 className="text-base font-semibold text-cream">Évangélisation</h3>
        <span className="text-[10px] text-muted ml-1">Sorties, contacts & suivi</span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Sorties', value: stats.total, icon: MapPin, color: 'text-blue-400' },
          { label: 'Contacts (mois)', value: stats.thisMonth, icon: UserPlus, color: 'text-green-400' },
          { label: 'Décisions', value: stats.decisions, icon: TrendingUp, color: 'text-amber-400' },
          { label: 'Suivi actif', value: stats.active, icon: Phone, color: 'text-purple-400' },
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

      {/* Upcoming outings */}
      {upcomingOutings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cream/60" />
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
                {outing.team_member_names && outing.team_member_names.length > 0 && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{outing.team_member_names.length} pers.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending contacts to follow up */}
      {pendingContacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-orange-400/70" />
            <span className="text-sm font-medium text-cream/80">À contacter ({pendingContacts.length})</span>
          </div>
          {pendingContacts.map(contact => (
            <div key={contact.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-cream truncate">{contact.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {contact.phone && <span className="text-[11px] text-muted">{contact.phone}</span>}
                  {contact.quartier && <span className="text-[10px] text-muted/60">· {contact.quartier}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge status={contact.decision} labels={EVANGELISM_DECISION_LABELS} colors={EVANGELISM_CONTACT_STATUS_COLORS} />
                {contact.phone && (
                  <button
                    onClick={() => openWhatsApp(contact.phone, `Bonjour ${contact.full_name}, c'est l'équipe d'évangélisation de La Conquête. Nous voulons prendre de vos nouvelles.`)}
                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400/70 hover:text-green-400 transition-colors"
                    title="Contacter via WhatsApp"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent contacts */}
      {recentContacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cream/60" />
            <span className="text-sm font-medium text-cream/80">Derniers contacts</span>
          </div>
          {recentContacts.map(c => (
            <div key={c.id} className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-cream/80 truncate flex-1">{c.full_name}</span>
              <StatusBadge status={c.status} labels={EVANGELISM_CONTACT_STATUS_LABELS} colors={EVANGELISM_CONTACT_STATUS_COLORS} />
            </div>
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
  );
}