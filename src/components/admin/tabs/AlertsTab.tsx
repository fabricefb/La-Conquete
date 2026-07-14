import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { PastoralAlert, VisitRequest, UserProfile } from '../../../types';
import { AlertTriangle, CheckCircle, Clock, XCircle, UserCheck, Loader2, Shield, Home } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALERT_TYPE_LABELS: Record<PastoralAlert['type'], string> = {
  ame_en_danger_72h: 'Âme en danger (72h)',
  cas_lourd: 'Cas lourd',
  retard_integration: 'Retard intégration',
  autre: 'Autre',
};

const ALERT_TYPE_COLORS: Record<PastoralAlert['type'], string> = {
  ame_en_danger_72h: 'bg-red-500/20 text-red-400',
  cas_lourd: 'bg-orange-500/20 text-orange-400',
  retard_integration: 'bg-yellow-500/20 text-yellow-400',
  autre: 'bg-white/10 text-muted',
};

const SEVERITY_LABELS: Record<PastoralAlert['severity'], string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

const SEVERITY_COLORS: Record<PastoralAlert['severity'], string> = {
  haute: 'bg-red-500/20 text-red-400',
  moyenne: 'bg-yellow-500/20 text-yellow-400',
  basse: 'bg-green-500/20 text-green-400',
};

const ALERT_STATUS_LABELS: Record<PastoralAlert['status'], string> = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  resolue: 'Résolue',
};

const ALERT_STATUS_COLORS: Record<PastoralAlert['status'], string> = {
  ouverte: 'bg-red-500/20 text-red-400',
  en_cours: 'bg-yellow-500/20 text-yellow-400',
  resolue: 'bg-green-500/20 text-green-400',
};

const VISIT_TYPE_LABELS: Record<VisitRequest['visit_type'], string> = {
  pastorale: 'Pastorale',
  evangelisation: 'Évangélisation',
  malade: 'Malade',
  encouragement: 'Encouragement',
  suivi: 'Suivi',
};

const URGENCY_LABELS: Record<VisitRequest['urgency'], string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
};

const URGENCY_COLORS: Record<VisitRequest['urgency'], string> = {
  basse: 'bg-green-500/20 text-green-400',
  normale: 'bg-white/10 text-muted',
  haute: 'bg-yellow-500/20 text-yellow-400',
  urgente: 'bg-red-500/20 text-red-400',
};

const VISIT_STATUS_LABELS: Record<VisitRequest['status'], string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  planifiee: 'Planifiée',
  effectuee: 'Effectuée',
  refusee: 'Refusée',
  reprogrammee: 'Reprogrammée',
};

const VISIT_STATUS_COLORS: Record<VisitRequest['status'], string> = {
  en_attente: 'bg-yellow-500/20 text-yellow-400',
  acceptee: 'bg-blue-500/20 text-blue-400',
  planifiee: 'bg-purple-500/20 text-purple-400',
  effectuee: 'bg-green-500/20 text-green-400',
  refusee: 'bg-red-500/20 text-red-400',
  reprogrammee: 'bg-orange-500/20 text-orange-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'À l\'instant';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return `${Math.floor(days / 7)} sem.`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertsTab() {
  const { addToast } = useToast();
  const { profile } = useAuth();

  const [activeSection, setActiveSection] = useState<'alerts' | 'visits'>('alerts');

  // Alerts state
  const [alerts, setAlerts] = useState<PastoralAlert[]>([]);
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertStatusFilter, setAlertStatusFilter] = useState('');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('');

  // Visits state
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [visitLoading, setVisitLoading] = useState(true);
  const [visitStatusFilter, setVisitStatusFilter] = useState('');
  const [visitUrgencyFilter, setVisitUrgencyFilter] = useState('');

  // Table missing state
  const [tableMissing, setTableMissing] = useState(false);

  // Assign modal
  const [assignModal, setAssignModal] = useState<{ type: 'alert' | 'visit'; id: string } | null>(null);
  const [assignTarget, setAssignTarget] = useState('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  // ---- fetch ---------------------------------------------------------------

  const fetchAlerts = useCallback(async () => {
    setAlertLoading(true);
    try {
      const data = await db.getPastoralAlerts(alertStatusFilter || undefined);
      setAlerts(data);
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setAlerts([]);
        setTableMissing(true);
      } else {
        addToast('Erreur lors du chargement des alertes', 'error');
      }
    }
    setAlertLoading(false);
  }, [addToast, alertStatusFilter]);

  const fetchVisits = useCallback(async () => {
    setVisitLoading(true);
    try {
      const data = await db.getVisitRequests(visitStatusFilter || undefined);
      setVisits(data);
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setVisits([]);
        setTableMissing(true);
      } else {
        addToast('Erreur lors du chargement des demandes', 'error');
      }
    }
    setVisitLoading(false);
  }, [addToast, visitStatusFilter]);

  const fetchProfiles = useCallback(async () => {
    try {
      const data = await db.getProfiles();
      setProfiles(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  useEffect(() => { fetchVisits(); }, [fetchVisits]);
  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // ---- stats ---------------------------------------------------------------

  const openAlerts = alerts.filter((a) => a.status !== 'resolue').length;
  const overdueVisits = visits.filter((v) => {
    if (v.status === 'effectuee' || v.status === 'refusee') return false;
    if (v.preferred_date && new Date(v.preferred_date) < new Date()) return true;
    return false;
  }).length;

  // ---- filtered ------------------------------------------------------------

  const filteredAlerts = alerts.filter((a) => {
    if (alertSeverityFilter && a.severity !== alertSeverityFilter) return false;
    return true;
  });

  const filteredVisits = visits.filter((v) => {
    if (visitUrgencyFilter && v.urgency !== visitUrgencyFilter) return false;
    return true;
  });

  // ---- alert actions -------------------------------------------------------

  const handleAssign = async () => {
    if (!assignModal || !assignTarget) {
      addToast('Veuillez sélectionner un responsable', 'error');
      return;
    }
    const targetName = profiles.find((p) => p.id === assignTarget)?.full_name || '';
    try {
      if (assignModal.type === 'alert') {
        await db.upsertPastoralAlert({ id: assignModal.id, assigned_to: assignTarget, assigned_to_name: targetName, status: 'en_cours' });
      } else {
        await db.upsertVisitRequest({ id: assignModal.id, assigned_to: assignTarget, assigned_to_name: targetName, status: 'acceptee' });
      }
      addToast('Assigné avec succès', 'success');
      setAssignModal(null);
      setAssignTarget('');
      fetchAlerts();
      fetchVisits();
    } catch {
      addToast('Erreur lors de l\'assignation', 'error');
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await db.updatePastoralAlertStatus(resolveModal, 'resolue', profile?.id, resolveNotes);
      addToast('Alerte résolue', 'success');
      setResolveModal(null);
      setResolveNotes('');
      fetchAlerts();
    } catch {
      addToast('Erreur lors de la résolution', 'error');
    }
  };

  const handleVisitAction = async (id: string, status: VisitRequest['status']) => {
    try {
      await db.upsertVisitRequest({ id, status });
      addToast(`Demande ${VISIT_STATUS_LABELS[status].toLowerCase()}`, 'success');
      fetchVisits();
    } catch {
      addToast('Erreur lors de la mise à jour', 'error');
    }
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="font-serif text-2xl font-semibold text-cream">
        Alertes & Visites
      </h2>

      {tableMissing && (
        <div className="glass rounded-xl p-5 border border-amber-500/20 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-cream">Tables de données non configurées</p>
              <p className="text-xs text-muted mt-1">
                Certaines tables nécessaires ne sont pas encore créées dans Supabase.
                Veuillez exécuter le fichier <code className="text-amber-400">14_missing_tables_consolidated.sql</code> dans l'éditeur SQL de Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-cream">{openAlerts}</p>
            <p className="text-xs text-muted">Alertes ouvertes</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
            <Clock className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-cream">{overdueVisits}</p>
            <p className="text-xs text-muted">Visites en retard</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
            <Shield className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-cream">{openAlerts + visits.filter((v) => v.status === 'en_attente').length}</p>
            <p className="text-xs text-muted">Cas non résolus</p>
          </div>
        </div>
      </div>

      {/* Section toggle */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        <button
          onClick={() => setActiveSection('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeSection === 'alerts' ? 'bg-evangile-600/20 text-evangile-500' : 'text-muted hover:text-cream'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Alertes Pastorales
        </button>
        <button
          onClick={() => setActiveSection('visits')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeSection === 'visits' ? 'bg-evangile-600/20 text-evangile-500' : 'text-muted hover:text-cream'
          }`}
        >
          <Home className="h-4 w-4" />
          Demandes de Visite
        </button>
      </div>

      {/* ─── ALERTS SECTION ─── */}
      {activeSection === 'alerts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={alertStatusFilter} onChange={(e) => setAlertStatusFilter(e.target.value)} className="input-surface px-3 py-2 text-xs">
              <option value="">Tous statuts</option>
              <option value="ouverte">Ouverte</option>
              <option value="en_cours">En cours</option>
              <option value="resolue">Résolue</option>
            </select>
            <select value={alertSeverityFilter} onChange={(e) => setAlertSeverityFilter(e.target.value)} className="input-surface px-3 py-2 text-xs">
              <option value="">Toutes sévérités</option>
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
          </div>

          {alertLoading ? (
            <div className="glass rounded-2xl p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-evangile-500" /></div>
          ) : filteredAlerts.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center"><p className="text-muted text-sm">Aucune alerte.</p></div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="glass rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${ALERT_TYPE_COLORS[alert.type]}`}>
                          {ALERT_TYPE_LABELS[alert.type]}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${SEVERITY_COLORS[alert.severity]}`}>
                          {SEVERITY_LABELS[alert.severity]}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${ALERT_STATUS_COLORS[alert.status]}`}>
                          {ALERT_STATUS_LABELS[alert.status]}
                        </span>
                        <span className="text-[10px] text-muted">{timeAgo(alert.created_at)}</span>
                      </div>
                      {alert.converti_name && (
                        <p className="text-sm font-medium text-cream">{alert.converti_name}</p>
                      )}
                      <p className="text-xs text-muted line-clamp-2">{alert.description}</p>
                      {alert.assigned_to_name && (
                        <p className="text-[10px] text-muted">Assigné à : {alert.assigned_to_name}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {alert.status !== 'en_cours' && alert.status !== 'resolue' && (
                        <button
                          onClick={() => { setAssignModal({ type: 'alert', id: alert.id }); }}
                          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-evangile-500 hover:border-evangile-600/40 transition"
                          title="Assigner"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Assigner
                        </button>
                      )}
                      {alert.status !== 'resolue' && (
                        <button
                          onClick={() => { setResolveModal(alert.id); setResolveNotes(''); }}
                          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-green-400 hover:border-green-400/40 transition"
                          title="Résoudre"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Résoudre
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── VISITS SECTION ─── */}
      {activeSection === 'visits' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={visitStatusFilter} onChange={(e) => setVisitStatusFilter(e.target.value)} className="input-surface px-3 py-2 text-xs">
              <option value="">Tous statuts</option>
              {Object.entries(VISIT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={visitUrgencyFilter} onChange={(e) => setVisitUrgencyFilter(e.target.value)} className="input-surface px-3 py-2 text-xs">
              <option value="">Toutes urgences</option>
              {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {visitLoading ? (
            <div className="glass rounded-2xl p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-evangile-500" /></div>
          ) : filteredVisits.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center"><p className="text-muted text-sm">Aucune demande de visite.</p></div>
          ) : (
            <div className="space-y-2">
              {filteredVisits.map((v) => (
                <div key={v.id} className="glass rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${URGENCY_COLORS[v.urgency]}`}>
                          {URGENCY_LABELS[v.urgency]}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${VISIT_STATUS_COLORS[v.status]}`}>
                          {VISIT_STATUS_LABELS[v.status]}
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                          {VISIT_TYPE_LABELS[v.visit_type]}
                        </span>
                        <span className="text-[10px] text-muted">{timeAgo(v.created_at)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cream">{v.beneficiary_name}</p>
                        {v.requester_name && v.requester_name !== v.beneficiary_name && (
                          <p className="text-xs text-muted">Demandeur : {v.requester_name}</p>
                        )}
                        <p className="text-xs text-muted">📍 {v.beneficiary_address}</p>
                      </div>
                      {v.assigned_to_name && (
                        <p className="text-[10px] text-muted">Assigné à : {v.assigned_to_name}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                      {v.status === 'en_attente' && (
                        <>
                          <button onClick={() => handleVisitAction(v.id, 'acceptee')} className="flex items-center gap-1 rounded-lg border border-green-400/40 px-2.5 py-1.5 text-[10px] text-green-400 hover:bg-green-500/10 transition">Accepter</button>
                          <button onClick={() => handleVisitAction(v.id, 'refusee')} className="flex items-center gap-1 rounded-lg border border-red-400/40 px-2.5 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10 transition">Refuser</button>
                        </>
                      )}
                      {v.status === 'acceptee' && (
                        <button onClick={() => handleVisitAction(v.id, 'planifiee')} className="flex items-center gap-1 rounded-lg border border-purple-400/40 px-2.5 py-1.5 text-[10px] text-purple-400 hover:bg-purple-500/10 transition">Planifier</button>
                      )}
                      {(v.status === 'planifiee' || v.status === 'reprogrammee') && (
                        <button onClick={() => handleVisitAction(v.id, 'effectuee')} className="flex items-center gap-1 rounded-lg border border-green-400/40 px-2.5 py-1.5 text-[10px] text-green-400 hover:bg-green-500/10 transition">Terminer</button>
                      )}
                      {v.status === 'en_attente' && (
                        <button
                          onClick={() => { setAssignModal({ type: 'visit', id: v.id }); }}
                          className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] text-muted hover:text-evangile-500 hover:border-evangile-600/40 transition"
                        >
                          <UserCheck className="h-3 w-3" /> Assigner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ASSIGN MODAL ─── */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssignModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-sm space-y-4 border border-evangile-600/20">
            <h3 className="font-serif text-lg font-semibold text-cream">Assigner</h3>
            <select
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value)}
              className="input-surface w-full px-4 py-2.5 text-sm"
            >
              <option value="">— Sélectionner un membre —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignModal(null)} className="btn-ghost text-sm">Annuler</button>
              <button onClick={handleAssign} className="btn-gold text-sm">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESOLVE MODAL ─── */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResolveModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-sm space-y-4 border border-green-400/20">
            <h3 className="font-serif text-lg font-semibold text-cream">Résoudre l'alerte</h3>
            <textarea
              rows={3}
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Notes de résolution..."
              className="input-surface w-full px-4 py-2.5 text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setResolveModal(null)} className="btn-ghost text-sm">Annuler</button>
              <button onClick={handleResolve} className="btn-gold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Résoudre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}