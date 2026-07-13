import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { Converti, ConvertiPipelineStage, CelluleMaison, ZoneEvangelisation, PastoralAlert, UserProfile } from '../../../types';
import { Loader2, ChevronUp, ChevronDown, AlertTriangle, Plus, Save, X, Users, MapPin, Check, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES: { key: ConvertiPipelineStage; label: string; color: string }[] = [
  { key: 'nouveau', label: 'Nouveau', color: 'bg-blue-500' },
  { key: 'premier_contact', label: 'Premier contact', color: 'bg-cyan-500' },
  { key: 'visite_domicile', label: 'Visite à domicile', color: 'bg-purple-500' },
  { key: 'cellule', label: 'En cellule', color: 'bg-pink-500' },
  { key: 'cours_bapteme', label: 'Cours baptême', color: 'bg-orange-500' },
  { key: 'membre_actif', label: 'Membre actif', color: 'bg-green-500' },
];

const STAGE_LABELS: Record<ConvertiPipelineStage, string> = {
  nouveau: 'Nouveau',
  premier_contact: 'Premier contact',
  visite_domicile: 'Visite à domicile',
  cellule: 'En cellule',
  cours_bapteme: 'Cours baptême',
  membre_actif: 'Membre actif',
};

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;

type SortField = 'name' | 'stage' | 'date' | 'evangelist';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CellulesSection({ profiles }: { profiles: UserProfile[] }) {
  const { addToast } = useToast();
  const [cellules, setCellules] = useState<CelluleMaison[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', leader_id: '', zone: '', quartier: '',
    address: '', meeting_day: 'mercredi' as CelluleMaison['meeting_day'], meeting_time: '18:00',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setCellules(await db.getCellules()); } catch { addToast('Erreur chargement cellules', 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.leader_id) { addToast('Nom et leader obligatoires', 'error'); return; }
    const leaderName = profiles.find((p) => p.id === form.leader_id)?.full_name || '';
    try {
      await db.upsertCellule({ ...form, leader_name: leaderName, is_active: true });
      addToast('Cellule enregistrée', 'success');
      setFormOpen(false);
      setForm({ name: '', description: '', leader_id: '', zone: '', quartier: '', address: '', meeting_day: 'mercredi', meeting_time: '18:00' });
      fetch();
    } catch { addToast('Erreur', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-cream flex items-center gap-2">
          <Users className="h-5 w-5 text-gold-400" /> Cellules de maison
        </h3>
        <button onClick={() => setFormOpen((o) => !o)} className="btn-gold flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Nouvelle cellule
        </button>
      </div>

      {formOpen && (
        <div className="glass rounded-xl p-4 space-y-3 border border-gold-400/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Nom <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Leader <span className="text-red-400">*</span></label>
              <select value={form.leader_id} onChange={(e) => setForm((p) => ({ ...p, leader_id: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm">
                <option value="">— Sélectionner —</option>
                {profiles.map((p) => (<option key={p.id} value={p.id}>{p.full_name || p.email}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Jour</label>
              <select value={form.meeting_day} onChange={(e) => setForm((p) => ({ ...p, meeting_day: e.target.value as CelluleMaison['meeting_day'] }))} className="input-surface w-full px-4 py-2.5 text-sm">
                {DAYS.map((d) => (<option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Heure</label>
              <input type="time" value={form.meeting_time} onChange={(e) => setForm((p) => ({ ...p, meeting_time: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Quartier</label>
              <input value={form.quartier} onChange={(e) => setForm((p) => ({ ...p, quartier: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Adresse</label>
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormOpen(false)} className="btn-ghost text-sm">Annuler</button>
            <button onClick={handleSave} className="btn-gold text-sm flex items-center gap-2"><Save className="h-4 w-4" /> Créer</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-xl p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gold-400" /></div>
      ) : cellules.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">Aucune cellule.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cellules.map((c) => (
            <div key={c.id} className="glass rounded-xl p-4">
              <h4 className="font-serif text-sm font-semibold text-cream">{c.name}</h4>
              {c.leader_name && <p className="text-xs text-muted mt-0.5">Leader : {c.leader_name}</p>}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                {c.meeting_day && <span>{c.meeting_day.charAt(0).toUpperCase() + c.meeting_day.slice(1)}</span>}
                {c.meeting_time && <span>à {c.meeting_time}</span>}
                {c.quartier && <span>📍 {c.quartier}</span>}
              </div>
              <p className="text-[10px] text-muted mt-1">{c.member_count} membre(s)</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ZonesSection({ profiles }: { profiles: UserProfile[] }) {
  const { addToast } = useToast();
  const [zones, setZones] = useState<ZoneEvangelisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', coordinator_id: '', potential_score: 5 });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setZones(await db.getZonesEvangelisation()); } catch { addToast('Erreur chargement zones', 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Nom obligatoire', 'error'); return; }
    const coordName = profiles.find((p) => p.id === form.coordinator_id)?.full_name || '';
    try {
      await supabase.from('zones_evangelisation').insert({
        name: form.name,
        description: form.description || null,
        coordinator_id: form.coordinator_id || null,
        coordinator_name: coordName || null,
        potential_score: form.potential_score,
        converti_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      addToast('Zone créée', 'success');
      setFormOpen(false);
      setForm({ name: '', description: '', coordinator_id: '', potential_score: 5 });
      fetch();
    } catch { addToast('Erreur', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-cream flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gold-400" /> Zones d'évangélisation
        </h3>
        <button onClick={() => setFormOpen((o) => !o)} className="btn-gold flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Nouvelle zone
        </button>
      </div>

      {formOpen && (
        <div className="glass rounded-xl p-4 space-y-3 border border-gold-400/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Nom <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Coordinateur</label>
              <select value={form.coordinator_id} onChange={(e) => setForm((p) => ({ ...p, coordinator_id: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm">
                <option value="">— Aucun —</option>
                {profiles.map((p) => (<option key={p.id} value={p.id}>{p.full_name || p.email}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Potentiel (1-10)</label>
              <input type="number" min={1} max={10} value={form.potential_score} onChange={(e) => setForm((p) => ({ ...p, potential_score: parseInt(e.target.value) || 5 }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormOpen(false)} className="btn-ghost text-sm">Annuler</button>
            <button onClick={handleSave} className="btn-gold text-sm flex items-center gap-2"><Save className="h-4 w-4" /> Créer</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-xl p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gold-400" /></div>
      ) : zones.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">Aucune zone.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {zones.map((z) => (
            <div key={z.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-serif text-sm font-semibold text-cream">{z.name}</h4>
                  {z.coordinator_name && <p className="text-xs text-muted mt-0.5">Coord. : {z.coordinator_name}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`h-2 w-2 rounded-full ${i < z.potential_score ? 'bg-gold-400' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                <span>{z.converti_count} converti(s)</span>
                {z.last_visited && <span>Dernière visite : {new Date(z.last_visited).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Import supabase for zones insert
import { supabase } from '../../../lib/supabase';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PipelineTab() {
  const { addToast } = useToast();
  const { profile } = useAuth();

  const [convertis, setConvertis] = useState<Converti[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [tableMissing, setTableMissing] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'advance' | 'assign_evangelist' | ''>('');

  // Sub-sections
  const [activeSection, setActiveSection] = useState<'pipeline' | 'cellules' | 'zones'>('pipeline');

  // 72h alerts
  const [alerts72h, setAlerts72h] = useState<PastoralAlert[]>([]);

  // ---- fetch ---------------------------------------------------------------

  const fetchConvertis = useCallback(async () => {
    setLoading(true);
    try {
      const [data, profs, alerts] = await Promise.all([
        db.getConvertis(),
        db.getProfiles(),
        db.getPastoralAlerts(undefined, 'ame_en_danger_72h'),
      ]);
      setConvertis(data);
      setProfiles(profs);
      setAlerts72h(alerts);
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setConvertis([]);
        setProfiles([]);
        setAlerts72h([]);
        setTableMissing(true);
      } else {
        addToast('Erreur lors du chargement', 'error');
      }
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchConvertis(); }, [fetchConvertis]);

  // ---- pipeline stats ------------------------------------------------------

  const stageCounts = useMemo(() => {
    const counts: Record<ConvertiPipelineStage, number> = {
      nouveau: 0, premier_contact: 0, visite_domicile: 0,
      cellule: 0, cours_bapteme: 0, membre_actif: 0,
    };
    for (const c of convertis) {
      counts[c.pipeline_stage]++;
    }
    return counts;
  }, [convertis]);

  const total = convertis.length;

  // ---- 72h alert converts --------------------------------------------------

  const convertis72h = useMemo(() => {
    const now = Date.now();
    const h72 = 72 * 3600 * 1000;
    return convertis.filter((c) => {
      if (c.pipeline_stage !== 'nouveau') return false;
      if (c.first_contact_date) return false;
      const age = now - new Date(c.created_at).getTime();
      return age > h72;
    });
  }, [convertis]);

  // ---- sort ---------------------------------------------------------------

  const sortedConvertis = useMemo(() => {
    const arr = [...convertis];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
          break;
        case 'stage':
          cmp = STAGES.findIndex((s) => s.key === a.pipeline_stage) - STAGES.findIndex((s) => s.key === b.pipeline_stage);
          break;
        case 'date':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'evangelist':
          cmp = (a.evangelist_name || '').localeCompare(b.evangelist_name || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [convertis, sortField, sortDir]);

  // ---- sort toggle ---------------------------------------------------------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-muted/30" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-gold-400" /> : <ChevronDown className="h-3 w-3 text-gold-400" />;
  };

  // ---- selection -----------------------------------------------------------

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sortedConvertis.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedConvertis.map((c) => c.id)));
    }
  };

  // ---- bulk actions --------------------------------------------------------

  const handleBulkAction = async () => {
    if (selected.size === 0) { addToast('Aucun converti sélectionné', 'error'); return; }

    if (bulkAction === 'advance') {
      for (const id of selected) {
        const c = convertis.find((x) => x.id === id);
        if (!c) continue;
        const idx = STAGES.findIndex((s) => s.key === c.pipeline_stage);
        if (idx < STAGES.length - 1) {
          const nextStage = STAGES[idx + 1].key;
          try {
            await db.advanceConvertiStage(id, nextStage, 'Avancement bulk par admin', profile?.id || '');
          } catch { /* continue */ }
        }
      }
      addToast(`${selected.size} converti(s) avancé(s)`, 'success');
    }

    if (bulkAction === 'assign_evangelist') {
      addToast('Utilisez l\'action sur un converti individuel pour assigner un évangéliste', 'info');
    }

    setSelected(new Set());
    setBulkAction('');
    fetchConvertis();
  };

  // ---- single advance ------------------------------------------------------

  const handleAdvance = async (c: Converti) => {
    const idx = STAGES.findIndex((s) => s.key === c.pipeline_stage);
    if (idx >= STAGES.length - 1) {
      addToast('Déjà au stade final', 'info');
      return;
    }
    const nextStage = STAGES[idx + 1].key;
    try {
      await db.advanceConvertiStage(c.id, nextStage, '', profile?.id || '');
      addToast(`${c.first_name} avancé au stade "${STAGE_LABELS[nextStage]}"`, 'success');
      fetchConvertis();
    } catch {
      addToast('Erreur lors de l\'avancement', 'error');
    }
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="font-serif text-2xl font-semibold text-cream">
        Pipeline Âmes
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

      {/* Section toggle */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        <button onClick={() => setActiveSection('pipeline')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeSection === 'pipeline' ? 'bg-gold-400/20 text-gold-400' : 'text-muted hover:text-cream'}`}>
          Pipeline
        </button>
        <button onClick={() => setActiveSection('cellules')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeSection === 'cellules' ? 'bg-gold-400/20 text-gold-400' : 'text-muted hover:text-cream'}`}>
          <Users className="h-4 w-4" /> Cellules
        </button>
        <button onClick={() => setActiveSection('zones')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeSection === 'zones' ? 'bg-gold-400/20 text-gold-400' : 'text-muted hover:text-cream'}`}>
          <MapPin className="h-4 w-4" /> Zones
        </button>
      </div>

      {/* ─── PIPELINE SECTION ─── */}
      {activeSection === 'pipeline' && (
        <div className="space-y-6">
          {/* Pipeline overview bar */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-muted uppercase tracking-widest">Vue d'ensemble ({total} convertis)</h3>
            {/* Progress bar */}
            <div className="flex h-8 rounded-lg overflow-hidden bg-white/5">
              {STAGES.map((s) => {
                const pct = total > 0 ? (stageCounts[s.key] / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={s.key}
                    className={`${s.color} flex items-center justify-center text-[9px] font-bold text-white transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${s.label}: ${stageCounts[s.key]}`}
                  >
                    {pct > 8 && stageCounts[s.key]}
                  </div>
                );
              })}
            </div>
            {/* Stage legend */}
            <div className="flex flex-wrap gap-3">
              {STAGES.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded ${s.color}`} />
                  <span className="text-[10px] text-muted">{s.label} ({stageCounts[s.key]})</span>
                </div>
              ))}
            </div>
          </div>

          {/* 72h alerts */}
          {convertis72h.length > 0 && (
            <div className="glass rounded-2xl p-4 border border-red-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="font-serif text-base font-semibold text-red-400">
                  Alertes 72h — {convertis72h.length} converti(s) non contacté(s)
                </h3>
              </div>
              <div className="space-y-2">
                {convertis72h.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-cream">{c.first_name} {c.last_name}</p>
                      <p className="text-[10px] text-muted">Créé il y a {Math.floor((Date.now() - new Date(c.created_at).getTime()) / 3600000)}h · {c.phone || 'Pas de tél.'}</p>
                    </div>
                    <span className="text-[10px] text-red-400 font-medium">Non contacté</span>
                  </div>
                ))}
                {convertis72h.length > 5 && (
                  <p className="text-[10px] text-muted text-center">+{convertis72h.length - 5} autres...</p>
                )}
              </div>
            </div>
          )}

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="glass rounded-xl p-3 flex items-center gap-3 border border-gold-400/20">
              <span className="text-sm text-gold-400 font-medium">{selected.size} sélectionné(s)</span>
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)} className="input-surface px-3 py-1.5 text-xs">
                <option value="">— Action —</option>
                <option value="advance">Avancer au stade suivant</option>
              </select>
              <button onClick={handleBulkAction} disabled={!bulkAction} className="btn-gold text-xs disabled:opacity-40 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Appliquer
              </button>
              <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs flex items-center gap-1">
                <X className="h-3.5 w-3.5" /> Annuler
              </button>
            </div>
          )}

          {/* Converti list */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gold-400" /></div>
          ) : sortedConvertis.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center"><p className="text-muted text-sm">Aucun converti dans le pipeline.</p></div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden md:grid md:grid-cols-7 gap-2 px-4 text-[10px] font-medium text-muted uppercase tracking-widest">
                <span className="w-6" />
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-cream transition text-left">Nom <SortIcon field="name" /></button>
                <button onClick={() => toggleSort('stage')} className="flex items-center gap-1 hover:text-cream transition text-left">Stade <SortIcon field="stage" /></button>
                <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-cream transition text-left">Date <SortIcon field="date" /></button>
                <button onClick={() => toggleSort('evangelist')} className="flex items-center gap-1 hover:text-cream transition text-left">Évangéliste <SortIcon field="evangelist" /></button>
                <span>Contact</span>
                <span className="text-right">Actions</span>
              </div>

              {sortedConvertis.map((c) => {
                const stageIdx = STAGES.findIndex((s) => s.key === c.pipeline_stage);
                const isLast = stageIdx >= STAGES.length - 1;
                return (
                  <div key={c.id} className="glass rounded-xl px-4 py-3 group">
                    <div className="md:grid md:grid-cols-7 md:gap-2 md:items-center flex flex-col gap-2">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="h-4 w-4 rounded border-line accent-gold-400"
                      />

                      {/* Name */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cream truncate">{c.first_name} {c.last_name}</p>
                        {c.quartier && <p className="text-[10px] text-muted">{c.quartier}</p>}
                      </div>

                      {/* Stage */}
                      <span className={`inline-flex self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-white/10 text-cream`}>
                        {STAGE_LABELS[c.pipeline_stage]}
                      </span>

                      {/* Date */}
                      <span className="text-xs text-muted">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                      </span>

                      {/* Evangelist */}
                      <span className="text-xs text-muted truncate">
                        {c.evangelist_name || '—'}
                      </span>

                      {/* Contact */}
                      <div className="text-xs text-muted">
                        {c.phone && <span>{c.phone}</span>}
                        {c.phone && c.email && <span className="mx-1">·</span>}
                        {c.email && <span className="truncate">{c.email}</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isLast && (
                          <button
                            onClick={() => handleAdvance(c)}
                            className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] text-muted hover:text-gold-400 hover:border-gold-400/40 transition"
                            title={`Avancer vers "${STAGE_LABELS[STAGES[stageIdx + 1].key]}"`}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {STAGE_LABELS[STAGES[stageIdx + 1].key]}
                          </button>
                        )}
                        {isLast && (
                          <span className="text-[10px] text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Membre
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Select all */}
              <button
                onClick={toggleSelectAll}
                className="text-xs text-muted hover:text-cream transition flex items-center gap-1.5"
              >
                <input
                  type="checkbox"
                  checked={selected.size === sortedConvertis.length && sortedConvertis.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-line accent-gold-400"
                />
                Tout sélectionner
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── CELLULES SECTION ─── */}
      {activeSection === 'cellules' && <CellulesSection profiles={profiles} />}

      {/* ─── ZONES SECTION ─── */}
      {activeSection === 'zones' && <ZonesSection profiles={profiles} />}
    </div>
  );
}