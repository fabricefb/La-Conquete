import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ChevronDown,
  Plus,
  Save,
  UserCheck,
  CalendarClock,
  AlertCircle,
  Info,
  Loader2,
} from '../../lib/icons';
import type {
  CultReport,
  ProtocolTeam,
  ProtocolDressCode,
  NewVisitor,
  CultDay,
  ProtocolSchedule,
} from '../../types';
import { CULT_DAY_LABELS, CULT_DAY_COLORS } from '../../types';

/* ═══════════════════════════════════════════════════════════════════
   Types & constants
   ═══════════════════════════════════════════════════════════════════ */

interface ProtocolSectionProps {
  accentColor?: string;
}

type SubAccordion = 'report' | 'dresscode' | 'visitors' | 'schedule';

const HOW_KNOWN_LABELS: Record<string, string> = {
  membre_invitation: 'Invitation d\'un membre',
  reseaux_sociaux: 'Réseaux sociaux',
  passant: 'Passant',
  media: 'Média / Publicité',
  autre: 'Autre',
};

const FOLLOW_UP_LABELS: Record<string, string> = {
  visite: 'Visite à domicile',
  appel: 'Appel téléphonique',
  information: 'Envoyer des informations',
  aucun: 'Aucun suivi',
};

const STATUS_COLORS: Record<string, string> = {
  soumis: 'bg-amber-500/20 text-amber-300',
  valide: 'bg-emerald-500/20 text-emerald-300',
  rejete: 'bg-red-500/20 text-red-300',
  brouillon: 'bg-gray-500/20 text-gray-300',
  nouveau: 'bg-blue-500/20 text-blue-300',
  contacte: 'bg-purple-500/20 text-purple-300',
  suivi_en_cours: 'bg-amber-500/20 text-amber-300',
  integre: 'bg-emerald-500/20 text-emerald-300',
  perdu: 'bg-red-500/20 text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  soumis: 'Soumis',
  valide: 'Validé',
  rejete: 'Rejeté',
  brouillon: 'Brouillon',
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  suivi_en_cours: 'Suivi en cours',
  integre: 'Intégré',
  perdu: 'Perdu',
};

const ALL_CULT_DAYS: CultDay[] = ['mercredi', 'vendredi', 'samedi', 'dimanche', 'autre'];

const FALLBACK_DRESS_CODES: ProtocolDressCode[] = [
  {
    id: 'fallback-wed', cult_day: 'mercredi', icon_hint: '👔',
    description: 'Tenue de ville décontractée mais correcte. Badge obligatoire.',
    required_items: ['Badge', 'Chemise / Blouse', 'Pantalon / Jupe correcte'],
    formality_level: 'correct', updated_at: '',
  },
  {
    id: 'fallback-fri', cult_day: 'vendredi', icon_hint: '👔',
    description: 'Tenue de ville décontractée mais correcte. Badge obligatoire.',
    required_items: ['Badge', 'Chemise / Blouse', 'Pantalon / Jupe correcte'],
    formality_level: 'correct', updated_at: '',
  },
  {
    id: 'fallback-sat', cult_day: 'samedi', icon_hint: '👕',
    description: 'Tenue libre et confortable.',
    required_items: ['Badge'],
    formality_level: 'decontracte', updated_at: '',
  },
  {
    id: 'fallback-sun', cult_day: 'dimanche', icon_hint: '🎩',
    description: 'Uniforme officiel et formel. Badge bien visible.',
    required_items: ['Uniforme complet', 'Badge bien visible', 'Chaussures appropriées'],
    formality_level: 'formel', updated_at: '',
  },
];

const SUB_SECTIONS: { key: SubAccordion; icon: string; label: string }[] = [
  { key: 'report', icon: '📋', label: 'Rapport de Culte' },
  { key: 'dresscode', icon: '👔', label: 'Code Vestimentaire' },
  { key: 'visitors', icon: '👥', label: 'Nouveaux Venus' },
  { key: 'schedule', icon: '📅', label: 'Planning de Rotation' },
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function isTableNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '42P01'
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function ProtocolSection({ accentColor }: ProtocolSectionProps) {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const accent = accentColor || '#c8a84e';

  /* ── Accordion state ───────────────────────────────────────────── */
  const [openSections, setOpenSections] = useState<Set<SubAccordion>>(new Set<SubAccordion>(['report']));

  const toggleSection = (key: SubAccordion) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ── Data state ────────────────────────────────────────────────── */
  const [teams, setTeams] = useState<ProtocolTeam[]>([]);
  const [dressCodes, setDressCodes] = useState<ProtocolDressCode[]>(FALLBACK_DRESS_CODES);
  const [recentReports, setRecentReports] = useState<CultReport[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<NewVisitor[]>([]);
  const [schedules, setSchedules] = useState<ProtocolSchedule[]>([]);
  const [extensions, setExtensions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);

  /* ── Report form ───────────────────────────────────────────────── */
  const [reportForm, setReportForm] = useState({
    cult_day: 'dimanche' as CultDay,
    reporter_name: profile?.full_name || '',
    team_group: '',
    extension_id: profile?.extension_id || '',
    men_count: 0,
    women_count: 0,
    children_count: 0,
    new_comers_count: 0,
    empty_seats: 0,
    incidents: '',
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  /* ── Visitor form ──────────────────────────────────────────────── */
  const [visitorForm, setVisitorForm] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_gender: '' as '' | 'homme' | 'femme',
    visitor_quartier: '',
    how_known: '' as string,
    invited_by: '',
    follow_up_type: '' as string,
    cult_day: 'dimanche' as CultDay,
  });
  const [submittingVisitor, setSubmittingVisitor] = useState(false);

  /* ── Sync profile name + extension ────────────────────────────── */
  useEffect(() => {
    if (profile?.full_name) {
      setReportForm(f => ({ ...f, reporter_name: profile.full_name! }));
    }
    if (profile?.extension_id) {
      setReportForm(f => ({ ...f, extension_id: profile.extension_id! }));
    }
  }, [profile?.full_name, profile?.extension_id]);

  /* ── Data fetching ─────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setModuleError(false);

    try {
      const [teamsRes, dressRes, reportsRes, visitorsRes, schedulesRes, extRes] = await Promise.all([
        supabase.from('protocol_teams').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('protocol_dress_code').select('*'),
        supabase.from('cult_reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('new_visitors').select('*').eq('recorded_by', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('protocol_schedules')
          .select('*, protocol_teams(name, color)')
          .eq('is_active', true)
          .order('cult_day'),
        supabase.from('extensions').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (teamsRes.error && !isTableNotFoundError(teamsRes.error)) throw teamsRes.error;
      if (teamsRes.data) setTeams(teamsRes.data as ProtocolTeam[]);

      if (dressRes.error && !isTableNotFoundError(dressRes.error)) throw dressRes.error;
      if (dressRes.data && dressRes.data.length > 0) setDressCodes(dressRes.data as ProtocolDressCode[]);

      if (reportsRes.error && !isTableNotFoundError(reportsRes.error)) throw reportsRes.error;
      if (reportsRes.data) setRecentReports(reportsRes.data as CultReport[]);

      if (visitorsRes.error && !isTableNotFoundError(visitorsRes.error)) throw visitorsRes.error;
      if (visitorsRes.data) setRecentVisitors(visitorsRes.data as NewVisitor[]);

      if (schedulesRes.error && !isTableNotFoundError(schedulesRes.error)) throw schedulesRes.error;
      if (schedulesRes.data) {
        const enriched = (schedulesRes.data as unknown as ProtocolSchedule[]).map(s => {
          const raw = s as unknown as Record<string, unknown>;
          const team = raw.protocol_teams as Record<string, string> | null;
          return {
            ...s,
            team_name: team?.name ?? null,
            team_color: team?.color ?? null,
          } as ProtocolSchedule;
        });
        setSchedules(enriched);
      }
      if (extRes.error && !isTableNotFoundError(extRes.error)) throw extRes.error;
      if (extRes.data) setExtensions(extRes.data as { id: string; name: string }[]);
    } catch (err) {
      if (isTableNotFoundError(err)) {
        setModuleError(true);
      } else {
        console.error('ProtocolSection fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Report submit ─────────────────────────────────────────────── */
  const handleSubmitReport = async () => {
    if (!user) return;
    setSubmittingReport(true);
    const total = reportForm.men_count + reportForm.women_count + reportForm.children_count;
    try {
      const { error } = await supabase.from('cult_reports').insert({
        user_id: user.id,
        reporter_name: reportForm.reporter_name,
        cult_day: reportForm.cult_day,
        cult_date: new Date().toISOString().split('T')[0],
        men_count: reportForm.men_count,
        women_count: reportForm.women_count,
        children_count: reportForm.children_count,
        new_comers_count: reportForm.new_comers_count,
        empty_seats: reportForm.empty_seats,
        // total_attendance est GENERATED ALWAYS — ne pas insérer
        incidents: reportForm.incidents || null,
        team_group: reportForm.team_group || null,
        extension_id: reportForm.extension_id || null,
        status: 'soumis',
      });
      if (error) throw error;
      addToast('Rapport soumis avec succès !', 'success');
      setReportForm(f => ({
        ...f,
        men_count: 0, women_count: 0, children_count: 0,
        new_comers_count: 0, empty_seats: 0, incidents: '',
      }));
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de la soumission du rapport.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  /* ── Visitor submit ────────────────────────────────────────────── */
  const handleSubmitVisitor = async () => {
    if (!user || !visitorForm.visitor_name.trim()) return;
    setSubmittingVisitor(true);
    try {
      const { error } = await supabase.from('new_visitors').insert({
        recorded_by: user.id,
        visitor_name: visitorForm.visitor_name.trim(),
        visitor_phone: visitorForm.visitor_phone || null,
        visitor_gender: visitorForm.visitor_gender || null,
        visitor_quartier: visitorForm.visitor_quartier || null,
        how_known: visitorForm.how_known || null,
        invited_by: visitorForm.invited_by || null,
        follow_up_type: visitorForm.follow_up_type || null,
        cult_day: visitorForm.cult_day,
        cult_date: new Date().toISOString().split('T')[0],
        status: 'nouveau',
      });
      if (error) throw error;
      addToast('Nouveau visiteur enregistré !', 'success');
      setVisitorForm({
        visitor_name: '', visitor_phone: '', visitor_gender: '',
        visitor_quartier: '', how_known: '', invited_by: '',
        follow_up_type: '', cult_day: 'dimanche',
      });
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('Erreur lors de l\'enregistrement.', 'error');
    } finally {
      setSubmittingVisitor(false);
    }
  };

  /* ── Number input helper ───────────────────────────────────────── */
  const NumberInput = ({
    label, value, onChange, min = 0, max = 9999,
  }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-full glass flex items-center justify-center text-cream hover:bg-white/10 transition-colors text-sm"
        >
          −
        </button>
        <input
          type="number"
          min={min} max={max}
          value={value}
          onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || 0)))}
          className="w-16 text-center bg-white/5 border border-line rounded-lg px-1 py-1.5 text-cream text-sm focus:outline-none focus:border-evangile-600/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-full glass flex items-center justify-center text-cream hover:bg-white/10 transition-colors text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  /* ── Select field helper ───────────────────────────────────────── */
  const SelectField = ({
    label, value, onChange, options, required = false,
  }: {
    label: string; value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    required?: boolean;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted">{label}</label>
      <select
        value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-line rounded-xl px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-evangile-600/50 transition-colors appearance-none"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-bg text-cream">{o.label}</option>
        ))}
      </select>
    </div>
  );

  const inputClass = "bg-white/5 border border-line rounded-xl px-3 py-2.5 text-cream text-sm focus:outline-none focus:border-evangile-600/50 transition-colors w-full placeholder:text-muted/60";

  /* ── Section renderers ──────────────────────────────────────────── */

  const renderReportSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField
          label="Jour de culte" value={reportForm.cult_day}
          onChange={v => setReportForm(f => ({ ...f, cult_day: v as CultDay }))}
          options={ALL_CULT_DAYS.map(d => ({ value: d, label: CULT_DAY_LABELS[d] }))}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Votre nom</label>
          <input
            type="text" value={reportForm.reporter_name}
            onChange={e => setReportForm(f => ({ ...f, reporter_name: e.target.value }))}
            className={inputClass}
          />
        </div>
        {teams.length > 0 && (
          <SelectField
            label="Équipe" value={reportForm.team_group}
            onChange={v => setReportForm(f => ({ ...f, team_group: v }))}
            options={[
              { value: '', label: '— Aucune —' },
              ...teams.map(t => ({ value: t.id, label: t.name })),
            ]}
          />
        )}
        {extensions.length > 1 && (
          <SelectField
            label="Extension / Église" value={reportForm.extension_id}
            onChange={v => setReportForm(f => ({ ...f, extension_id: v }))}
            options={[
              { value: '', label: '— Siège principal —' },
              ...extensions.map(e => ({ value: e.id, label: e.name })),
            ]}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <NumberInput label="Hommes" value={reportForm.men_count} onChange={v => setReportForm(f => ({ ...f, men_count: v }))} />
        <NumberInput label="Femmes" value={reportForm.women_count} onChange={v => setReportForm(f => ({ ...f, women_count: v }))} />
        <NumberInput label="Enfants" value={reportForm.children_count} onChange={v => setReportForm(f => ({ ...f, children_count: v }))} />
        <NumberInput label="Nouveaux" value={reportForm.new_comers_count} onChange={v => setReportForm(f => ({ ...f, new_comers_count: v }))} />
        <NumberInput label="Places vides" value={reportForm.empty_seats} onChange={v => setReportForm(f => ({ ...f, empty_seats: v }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">Incidents / Remarques (optionnel)</label>
        <textarea
          rows={2} value={reportForm.incidents}
          onChange={e => setReportForm(f => ({ ...f, incidents: e.target.value }))}
          placeholder="Décrivez tout incident ou remarque particulière..."
          className={`${inputClass} resize-none`}
        />
      </div>
      <button
        type="button" onClick={handleSubmitReport} disabled={submittingReport}
        className="btn-gold flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Soumettre le rapport
      </button>
      {recentReports.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Derniers rapports</p>
          {recentReports.map(r => (
            <div key={r.id} className="glass rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${CULT_DAY_COLORS[r.cult_day]}`}>
                  {CULT_DAY_LABELS[r.cult_day]}
                </span>
                <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                <span className="text-xs text-cream">
                  Total : <span className="gold-text font-semibold">{r.total_attendance}</span>
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || STATUS_COLORS.soumis}`}>
                {STATUS_LABELS[r.status] || r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDressCodeSection = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {dressCodes.map(dc => (
        <div key={dc.id} className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{dc.icon_hint || '👔'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${CULT_DAY_COLORS[dc.cult_day]}`}>
              {CULT_DAY_LABELS[dc.cult_day]}
            </span>
          </div>
          <p className="text-sm text-cream">{dc.description}</p>
          {dc.required_items && dc.required_items.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {dc.required_items.map((item, i) => (
                <li key={i} className="text-xs text-muted flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-evangile-600/60 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );

  const renderVisitorsSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Nom du visiteur *</label>
          <input
            type="text" required value={visitorForm.visitor_name}
            onChange={e => setVisitorForm(f => ({ ...f, visitor_name: e.target.value }))}
            placeholder="Nom complet" className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Téléphone</label>
          <input
            type="tel" value={visitorForm.visitor_phone}
            onChange={e => setVisitorForm(f => ({ ...f, visitor_phone: e.target.value }))}
            placeholder="+243 ..." className={inputClass}
          />
        </div>
        <SelectField
          label="Genre" value={visitorForm.visitor_gender}
          onChange={v => setVisitorForm(f => ({ ...f, visitor_gender: v as '' | 'homme' | 'femme' }))}
          options={[
            { value: '', label: '— Non précisé —' },
            { value: 'homme', label: 'Homme' },
            { value: 'femme', label: 'Femme' },
          ]}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Quartier</label>
          <input
            type="text" value={visitorForm.visitor_quartier}
            onChange={e => setVisitorForm(f => ({ ...f, visitor_quartier: e.target.value }))}
            placeholder="Ex: Matonge, Limete..." className={inputClass}
          />
        </div>
        <SelectField
          label="Comment nous a-t-il connu ?" value={visitorForm.how_known}
          onChange={v => setVisitorForm(f => ({ ...f, how_known: v }))}
          options={[
            { value: '', label: '— Non précisé —' },
            ...Object.entries(HOW_KNOWN_LABELS).map(([k, l]) => ({ value: k, label: l })),
          ]}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Invité par</label>
          <input
            type="text" value={visitorForm.invited_by}
            onChange={e => setVisitorForm(f => ({ ...f, invited_by: e.target.value }))}
            placeholder="Nom du membre (si applicable)" className={inputClass}
          />
        </div>
        <SelectField
          label="Type de suivi" value={visitorForm.follow_up_type}
          onChange={v => setVisitorForm(f => ({ ...f, follow_up_type: v }))}
          options={[
            { value: '', label: '— Non défini —' },
            ...Object.entries(FOLLOW_UP_LABELS).map(([k, l]) => ({ value: k, label: l })),
          ]}
        />
        <SelectField
          label="Jour de culte" value={visitorForm.cult_day}
          onChange={v => setVisitorForm(f => ({ ...f, cult_day: v as CultDay }))}
          options={ALL_CULT_DAYS.map(d => ({ value: d, label: CULT_DAY_LABELS[d] }))}
        />
      </div>
      <button
        type="button" onClick={handleSubmitVisitor}
        disabled={submittingVisitor || !visitorForm.visitor_name.trim()}
        className="btn-gold flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {submittingVisitor ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
        Enregistrer le visiteur
      </button>
      {recentVisitors.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Derniers visiteurs enregistrés</p>
          {recentVisitors.map(v => (
            <div key={v.id} className="glass rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-sm text-cream font-medium truncate">{v.visitor_name}</span>
                {v.cult_day && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${CULT_DAY_COLORS[v.cult_day]}`}>
                    {CULT_DAY_LABELS[v.cult_day]}
                  </span>
                )}
                <span className="text-xs text-muted shrink-0">{formatDate(v.created_at)}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[v.status] || STATUS_COLORS.nouveau}`}>
                {STATUS_LABELS[v.status] || v.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderScheduleSection = () =>
    schedules.length > 0 ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {ALL_CULT_DAYS.map(day => {
          const daySchedule = schedules.find(s => s.cult_day === day);
          const teamColor = daySchedule?.team_color || '#6b7280';
          return (
            <div key={day} className="glass rounded-xl p-3 text-center space-y-2">
              <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full border ${CULT_DAY_COLORS[day]}`}>
                {CULT_DAY_LABELS[day]}
              </span>
              {daySchedule?.team_name ? (
                <div className="space-y-1">
                  <div className="w-3 h-3 rounded-full mx-auto" style={{ backgroundColor: teamColor }} />
                  <p className="text-sm text-cream font-medium">{daySchedule.team_name}</p>
                  {daySchedule.notes && <p className="text-[10px] text-muted">{daySchedule.notes}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-center py-2">
                  <AlertCircle className="w-4 h-4 text-muted/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-6">
        <CalendarClock className="w-8 h-8 mx-auto mb-2 text-muted/50" />
        <p className="text-muted text-sm">Le planning n'est pas encore configuré.</p>
        <p className="text-muted/60 text-xs mt-1">Contactez le responsable.</p>
      </div>
    );

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */

  if (moduleError) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <Info className="w-8 h-8 mx-auto mb-3 text-muted" />
        <p className="text-muted text-sm">Module en cours de configuration</p>
        <p className="text-muted/60 text-xs mt-1">Les tables de données ne sont pas encore disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {SUB_SECTIONS.map(section => {
        const isOpen = openSections.has(section.key);
        return (
          <div key={section.key} className="glass-card rounded-xl overflow-hidden">
            {/* ── Sub-accordion header ── */}
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{section.icon}</span>
                <span className="text-cream font-display text-headline-md">{section.label}</span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* ── Sub-accordion content ── */}
            {isOpen && (
              <div className="px-4 pb-5 pt-1 border-t border-line/30">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  </div>
                ) : section.key === 'report' ? renderReportSection() :
                   section.key === 'dresscode' ? renderDressCodeSection() :
                   section.key === 'visitors' ? renderVisitorsSection() :
                   section.key === 'schedule' ? renderScheduleSection() :
                   null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}