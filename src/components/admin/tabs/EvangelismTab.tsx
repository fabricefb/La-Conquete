import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { openWhatsApp } from '../../../lib/whatsapp';
import type {
  EvangelismOuting, EvangelismContact, EvangelismFollowup,
  EvangelismObjective, EvangelismOutingStatus, EvangelismDecision,
  EvangelismContactStatus, EvangelismFollowupType, EvangelismFollowupResult,
  EvangelismStats,
} from '../../../types';
import {
  EVANGELISM_OBJECTIVE_LABELS, EVANGELISM_OUTING_STATUS_LABELS,
  EVANGELISM_OUTING_STATUS_COLORS, EVANGELISM_DECISION_LABELS,
  EVANGELISM_CONTACT_STATUS_LABELS, EVANGELISM_CONTACT_STATUS_COLORS,
  EVANGELISM_FOLLOWUP_TYPE_LABELS, EVANGELISM_FOLLOWUP_RESULT_LABELS,
} from '../../../types';
import {
  MapPin, Users, Phone, Plus, Trash2, Save, X, Loader2,
  ChevronDown, ChevronUp, Check, Search, Filter,
  MessageCircle, Calendar, Clock, UserPlus, Activity,
  Heart, BookOpen, Eye, AlertTriangle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUB_TABS = [
  { key: 'sorties', label: 'Sorties', Icon: MapPin },
  { key: 'contacts', label: 'Contacts', Icon: Users },
  { key: 'suivi', label: 'Suivi', Icon: Phone },
] as const;
type SubTab = typeof SUB_TABS[number]['key'];

const FOLLOWUP_RESULT_COLORS: Record<EvangelismFollowupResult, string> = {
  positif: 'bg-green-500/15 text-green-300 border-green-500/20',
  neutre: 'bg-gray-500/15 text-gray-300 border-gray-500/20',
  negatif: 'bg-red-500/15 text-red-300 border-red-500/20',
  a_reporter: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  en_attente: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
};

const OBJECTIVES: EvangelismObjective[] = [
  'porte_a_porte', 'marche', 'campagne', 'rue',
  'hopital', 'prison', 'ecole', 'stade', 'autre',
];

const DECISIONS: EvangelismDecision[] = [
  'interesse', 'en_savoir_plus', 'accepte_christ',
  'veut_venir_eglise', 'deja_croyant', 'pas_interesse', 'a_suivre',
];

const CONTACT_STATUSES: EvangelismContactStatus[] = [
  'a_contacter', 'contacte', 'en_suivi', 'integre_eglise', 'perdu_de_vue',
];

const FOLLOWUP_TYPES: EvangelismFollowupType[] = [
  'appel', 'visite', 'message', 'invitation_culte',
  'etude_biblique', 'prière', 'autre',
];

const FOLLOWUP_RESULTS: EvangelismFollowupResult[] = [
  'positif', 'neutre', 'negatif', 'a_reporter', 'en_attente',
];

const INPUT_CLASS =
  'w-full rounded-lg px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-cream placeholder:text-muted/50 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20';
const SELECT_CLASS =
  'w-full rounded-lg px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-cream focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20';
const BADGE_BASE = 'rounded-lg px-2.5 py-1 text-xs border';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvangelismTab() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const { isFullAdmin } = useAdminAccess();

  // ── Sub-tab navigation ────────────────────────────────────────────
  const [subTab, setSubTab] = useState<SubTab>('sorties');
  const [moduleError, setModuleError] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Sorties state ────────────────────────────────────────────────
  const [outings, setOutings] = useState<EvangelismOuting[]>([]);
  const [outingFormOpen, setOutingFormOpen] = useState(false);
  const [outingSaving, setOutingSaving] = useState(false);
  const [outingForm, setOutingForm] = useState({
    title: '',
    description: '',
    outing_date: todayISO(),
    start_time: '09:00',
    end_time: '12:00',
    location: '',
    location_quartier: '',
    objective: 'porte_a_porte' as EvangelismObjective,
  });
  const [expandedOuting, setExpandedOuting] = useState<string | null>(null);
  const [outingContacts, setOutingContacts] = useState<Record<string, EvangelismContact[]>>({});

  // ── Contacts state ───────────────────────────────────────────────
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    quartier: '',
    decision: 'a_suivre' as EvangelismDecision,
    needs: '',
    prayer_request: '',
    notes: '',
    outing_id: '' as string,
  });
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [contactFollowups, setContactFollowups] = useState<Record<string, EvangelismFollowup[]>>({});
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilterDecision, setContactFilterDecision] = useState<EvangelismDecision | ''>('');
  const [contactFilterStatus, setContactFilterStatus] = useState<EvangelismContactStatus | ''>('');
  const [contactFilterQuartier, setContactFilterQuartier] = useState('');
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [statusUpdateValue, setStatusUpdateValue] = useState<EvangelismContactStatus>('contacte');
  const [assignInput, setAssignInput] = useState<Record<string, string>>({});

  // ── Suivi state ──────────────────────────────────────────────────
  const [followups, setFollowups] = useState<EvangelismFollowup[]>([]);
  const [followupFormOpen, setFollowupFormOpen] = useState(false);
  const [followupSaving, setFollowupSaving] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    contact_id: '',
    followup_type: 'appel' as EvangelismFollowupType,
    scheduled_date: todayISO(),
    notes: '',
  });
  const [followupFilterType, setFollowupFilterType] = useState<EvangelismFollowupType | ''>('');
  const [followupFilterResult, setFollowupFilterResult] = useState<EvangelismFollowupResult | ''>('');
  const [followupFilterDateStart, setFollowupFilterDateStart] = useState('');
  const [followupFilterDateEnd, setFollowupFilterDateEnd] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeResult, setCompleteResult] = useState<EvangelismFollowupResult>('positif');

  // ── Stats ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<EvangelismStats>({
    total_outings: 0, total_contacts: 0, decisions: 0,
    integrated: 0, came_to_culte: 0, followups_done: 0,
    active_followups: 0, baptized: 0,
  });

  // ── Unique quartiers ─────────────────────────────────────────────
  const quartiers = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => { if (c.quartier) set.add(c.quartier!); });
    return Array.from(set).sort();
  }, [contacts]);

  // ═══════════════════════════════════════════════════════════════════
  // Data fetching
  // ═══════════════════════════════════════════════════════════════════

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setModuleError(false);
    try {
      const [outingsRes, contactsRes, followupsRes] = await Promise.all([
        supabase.from('evangelism_outings').select('*').order('outing_date', { ascending: false }),
        supabase.from('evangelism_contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('evangelism_followups').select('*').order('scheduled_date', { ascending: false }),
      ]);

      if (outingsRes.error) throw outingsRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (followupsRes.error) throw followupsRes.error;

      const o = (outingsRes.data as EvangelismOuting[]) ?? [];
      const c = (contactsRes.data as EvangelismContact[]) ?? [];
      const f = (followupsRes.data as EvangelismFollowup[]) ?? [];

      setOutings(o);
      setContacts(c);
      setFollowups(f);

      // Compute stats
      const { start } = getMonthRange();
      const monthContacts = c.filter((ct) => ct.created_at >= start);
      setStats({
        total_outings: o.length,
        total_contacts: monthContacts.length,
        decisions: c.filter((ct) => ct.decision === 'accepte_christ').length,
        integrated: c.filter((ct) => ct.status === 'integre_eglise').length,
        came_to_culte: c.filter((ct) => ct.came_to_culte === true).length,
        followups_done: f.filter((fw) => fw.completed_at !== null).length,
        active_followups: f.filter((fw) => fw.completed_at === null).length,
        baptized: c.filter((ct) => ct.baptized === true).length,
      });
    } catch (err: any) {
      console.error('Evangelism module error:', err);
      setModuleError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch contacts for an outing ──────────────────────────────────
  const fetchOutingContacts = useCallback(async (outingId: string) => {
    const { data, error } = await supabase
      .from('evangelism_contacts')
      .select('*')
      .eq('outing_id', outingId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setOutingContacts((prev) => ({ ...prev, [outingId]: data as EvangelismContact[] }));
    }
  }, []);

  // ── Fetch followups for a contact ─────────────────────────────────
  const fetchContactFollowups = useCallback(async (contactId: string) => {
    const { data, error } = await supabase
      .from('evangelism_followups')
      .select('*')
      .eq('contact_id', contactId)
      .order('scheduled_date', { ascending: false });
    if (!error && data) {
      setContactFollowups((prev) => ({ ...prev, [contactId]: data as EvangelismFollowup[] }));
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // Sorties CRUD
  // ═══════════════════════════════════════════════════════════════════

  const handleCreateOuting = async () => {
    if (!outingForm.title.trim() || !outingForm.location.trim() || !outingForm.outing_date) {
      addToast('Veuillez remplir le titre, la date et le lieu', 'error');
      return;
    }
    setOutingSaving(true);
    try {
      const { error } = await supabase.from('evangelism_outings').insert({
        title: outingForm.title.trim(),
        description: outingForm.description.trim() || null,
        outing_date: outingForm.outing_date,
        start_time: outingForm.start_time || null,
        end_time: outingForm.end_time || null,
        location: outingForm.location.trim(),
        location_quartier: outingForm.location_quartier.trim() || null,
        objective: outingForm.objective,
        status: 'planifiee' as EvangelismOutingStatus,
        responsible_id: user?.id ?? null,
        responsible_name: user?.user_metadata?.full_name || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      addToast('Sortie créée avec succès', 'success');
      setOutingFormOpen(false);
      setOutingForm({
        title: '', description: '', outing_date: todayISO(),
        start_time: '09:00', end_time: '12:00',
        location: '', location_quartier: '', objective: 'porte_a_porte',
      });
      fetchAll();
    } catch {
      addToast("Erreur lors de la création de la sortie", 'error');
    }
    setOutingSaving(false);
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('evangelism_outings')
        .update({ status: 'terminee' })
        .eq('id', id);
      if (error) throw error;
      addToast('Sortie marquée comme terminée', 'success');
      fetchAll();
    } catch {
      addToast("Erreur lors de la mise à jour", 'error');
    }
  };

  const handleDeleteOuting = async (id: string) => {
    if (!window.confirm('Supprimer cette sortie et toutes les données associées ?')) return;
    try {
      // Delete contacts linked to this outing
      const { data: linkedContacts } = await supabase
        .from('evangelism_contacts')
        .select('id')
        .eq('outing_id', id);
      if (linkedContacts && linkedContacts.length > 0) {
        const cIds = linkedContacts.map((c: any) => c.id);
        await supabase.from('evangelism_followups').delete().in('contact_id', cIds);
        await supabase.from('evangelism_contacts').delete().in('id', cIds);
      }
      const { error } = await supabase.from('evangelism_outings').delete().eq('id', id);
      if (error) throw error;
      addToast('Sortie supprimée', 'success');
      setExpandedOuting(null);
      fetchAll();
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  const toggleOutingExpand = (id: string) => {
    if (expandedOuting === id) {
      setExpandedOuting(null);
      return;
    }
    setExpandedOuting(id);
    fetchOutingContacts(id);
  };

  // ═══════════════════════════════════════════════════════════════════
  // Contacts CRUD
  // ═══════════════════════════════════════════════════════════════════

  const handleCreateContact = async () => {
    if (!contactForm.full_name.trim()) {
      addToast('Le nom est obligatoire', 'error');
      return;
    }
    setContactSaving(true);
    try {
      const { error } = await supabase.from('evangelism_contacts').insert({
        full_name: contactForm.full_name.trim(),
        phone: contactForm.phone.trim() || null,
        whatsapp: contactForm.whatsapp.trim() || null,
        address: contactForm.address.trim() || null,
        quartier: contactForm.quartier.trim() || null,
        decision: contactForm.decision,
        needs: contactForm.needs.trim() || null,
        prayer_request: contactForm.prayer_request.trim() || null,
        notes: contactForm.notes.trim() || null,
        status: 'a_contacter' as EvangelismContactStatus,
        outing_id: contactForm.outing_id || null,
        first_contact_at: new Date().toISOString(),
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      addToast('Contact ajouté avec succès', 'success');
      setContactFormOpen(false);
      setContactForm({
        full_name: '', phone: '', whatsapp: '', address: '', quartier: '',
        decision: 'a_suivre', needs: '', prayer_request: '', notes: '', outing_id: '',
      });
      fetchAll();
    } catch {
      addToast("Erreur lors de l'ajout du contact", 'error');
    }
    setContactSaving(false);
  };

  const handleUpdateContactStatus = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('evangelism_contacts')
        .update({ status: statusUpdateValue })
        .eq('id', contactId);
      if (error) throw error;
      addToast('Statut du contact mis à jour', 'success');
      setStatusUpdateId(null);
      fetchAll();
    } catch {
      addToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleAssignContact = async (contactId: string) => {
    const name = assignInput[contactId]?.trim();
    if (!name) return;
    try {
      const { error } = await supabase
        .from('evangelism_contacts')
        .update({ assigned_to_name: name })
        .eq('id', contactId);
      if (error) throw error;
      addToast(`Contact assigné à ${name}`, 'success');
      setAssignInput((prev) => ({ ...prev, [contactId]: '' }));
      fetchAll();
    } catch {
      addToast("Erreur lors de l'assignation", 'error');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Supprimer ce contact et ses suivis ?')) return;
    try {
      await supabase.from('evangelism_followups').delete().eq('contact_id', id);
      const { error } = await supabase.from('evangelism_contacts').delete().eq('id', id);
      if (error) throw error;
      addToast('Contact supprimé', 'success');
      setExpandedContact(null);
      fetchAll();
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  const toggleContactExpand = (id: string) => {
    if (expandedContact === id) {
      setExpandedContact(null);
      return;
    }
    setExpandedContact(id);
    fetchContactFollowups(id);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (contactSearch) {
        const q = contactSearch.toLowerCase();
        const matchName = c.full_name.toLowerCase().includes(q);
        const matchPhone = (c.phone || '').includes(q);
        if (!matchName && !matchPhone) return false;
      }
      if (contactFilterDecision && c.decision !== contactFilterDecision) return false;
      if (contactFilterStatus && c.status !== contactFilterStatus) return false;
      if (contactFilterQuartier && c.quartier !== contactFilterQuartier) return false;
      return true;
    });
  }, [contacts, contactSearch, contactFilterDecision, contactFilterStatus, contactFilterQuartier]);

  // ═══════════════════════════════════════════════════════════════════
  // Suivi CRUD
  // ═══════════════════════════════════════════════════════════════════

  const handleCreateFollowup = async () => {
    if (!followupForm.contact_id.trim() || !followupForm.scheduled_date) {
      addToast('Veuillez sélectionner un contact et une date', 'error');
      return;
    }
    setFollowupSaving(true);
    try {
      const { error } = await supabase.from('evangelism_followups').insert({
        contact_id: followupForm.contact_id,
        followup_type: followupForm.followup_type,
        scheduled_date: followupForm.scheduled_date,
        notes: followupForm.notes.trim() || null,
        result: 'en_attente' as EvangelismFollowupResult,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      addToast('Suivi créé avec succès', 'success');
      setFollowupFormOpen(false);
      setFollowupForm({
        contact_id: '', followup_type: 'appel', scheduled_date: todayISO(), notes: '',
      });
      fetchAll();
    } catch {
      addToast("Erreur lors de la création du suivi", 'error');
    }
    setFollowupSaving(false);
  };

  const handleCompleteFollowup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('evangelism_followups')
        .update({
          completed_at: new Date().toISOString(),
          result: completeResult,
        })
        .eq('id', id);
      if (error) throw error;
      addToast('Suivi marqué comme complété', 'success');
      setCompletingId(null);
      fetchAll();
    } catch {
      addToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDeleteFollowup = async (id: string) => {
    if (!window.confirm('Supprimer ce suivi ?')) return;
    try {
      const { error } = await supabase.from('evangelism_followups').delete().eq('id', id);
      if (error) throw error;
      addToast('Suivi supprimé', 'success');
      fetchAll();
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  // Followups grouped by contact
  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      if (followupFilterType && f.followup_type !== followupFilterType) return false;
      if (followupFilterResult && f.result !== followupFilterResult) return false;
      if (followupFilterDateStart && f.scheduled_date < followupFilterDateStart) return false;
      if (followupFilterDateEnd && f.scheduled_date > followupFilterDateEnd) return false;
      return true;
    });
  }, [followups, followupFilterType, followupFilterResult, followupFilterDateStart, followupFilterDateEnd]);

  const followupsGrouped = useMemo(() => {
    const map = new Map<string, { contact: EvangelismContact; followups: EvangelismFollowup[] }>();
    filteredFollowups.forEach((f) => {
      const contact = contacts.find((c) => c.id === f.contact_id);
      if (!contact) return;
      if (!map.has(f.contact_id)) {
        map.set(f.contact_id, { contact, followups: [] });
      }
      map.get(f.contact_id)!.followups.push(f);
    });
    return Array.from(map.values());
  }, [filteredFollowups, contacts]);

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (moduleError) {
    return (
      <div className="glass-card rounded-xl p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-cream">Module en cours de configuration</h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          Les tables d&apos;évangélisation ne sont pas encore créées dans la base de données.
          Veuillez exécuter la migration SQL pour activer ce module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Évangélisation</h2>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total sorties', value: stats.total_outings, icon: MapPin, color: 'text-accent-400' },
          { label: 'Contacts ce mois', value: stats.total_contacts, icon: Users, color: 'text-blue-400' },
          { label: 'Décisions pour Christ', value: stats.decisions, icon: Heart, color: 'text-pink-400' },
          { label: 'Intégrés', value: stats.integrated, icon: Check, color: 'text-green-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-cream">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sub-tab navigation ────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        {SUB_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              subTab === key
                ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
                : 'text-muted hover:text-cream hover:bg-white/5'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SUB-TAB: SORTIES
          ═══════════════════════════════════════════════════════════════ */}
      {subTab === 'sorties' && (
        <div className="space-y-4">
          {/* Create button */}
          <div className="flex justify-end">
            <button
              onClick={() => setOutingFormOpen(!outingFormOpen)}
              className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {outingFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {outingFormOpen ? 'Annuler' : 'Nouvelle sortie'}
            </button>
          </div>

          {/* Create form */}
          {outingFormOpen && (
            <div className="glass-card rounded-xl p-5 space-y-4 border border-accent-500/20">
              <h3 className="font-serif text-lg font-semibold text-cream">Nouvelle sortie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Titre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={outingForm.title}
                    onChange={(e) => setOutingForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Porte-à-porte quartiers Nord"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Objectif</label>
                  <select
                    value={outingForm.objective}
                    onChange={(e) => setOutingForm((p) => ({ ...p, objective: e.target.value as EvangelismObjective }))}
                    className={SELECT_CLASS}
                  >
                    {OBJECTIVES.map((obj) => (
                      <option key={obj} value={obj}>{EVANGELISM_OBJECTIVE_LABELS[obj]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={outingForm.outing_date}
                    onChange={(e) => setOutingForm((p) => ({ ...p, outing_date: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Lieu <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={outingForm.location}
                    onChange={(e) => setOutingForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Adresse ou zone"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Quartier</label>
                  <input
                    type="text"
                    value={outingForm.location_quartier}
                    onChange={(e) => setOutingForm((p) => ({ ...p, location_quartier: e.target.value }))}
                    placeholder="Nom du quartier"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Début</label>
                    <input
                      type="time"
                      value={outingForm.start_time}
                      onChange={(e) => setOutingForm((p) => ({ ...p, start_time: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Fin</label>
                    <input
                      type="time"
                      value={outingForm.end_time}
                      onChange={(e) => setOutingForm((p) => ({ ...p, end_time: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
                  <textarea
                    rows={3}
                    value={outingForm.description}
                    onChange={(e) => setOutingForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Détails de la sortie..."
                    className={INPUT_CLASS + ' resize-none'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setOutingFormOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-cream border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" /> Annuler
                </button>
                <button
                  onClick={handleCreateOuting}
                  disabled={outingSaving}
                  className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {outingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Créer la sortie
                </button>
              </div>
            </div>
          )}

          {/* Outings list */}
          {outings.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <MapPin className="h-10 w-10 mx-auto text-muted/40 mb-3" />
              <p className="text-sm text-muted">Aucune sortie d&apos;évangélisation enregistrée.</p>
              <p className="text-xs text-muted/60 mt-1">Cliquez sur &quot;Nouvelle sortie&quot; pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {outings.map((outing) => {
                const isExpanded = expandedOuting === outing.id;
                const oContacts = outingContacts[outing.id] ?? [];
                const contactCount = contacts.filter((c) => c.outing_id === outing.id).length;
                return (
                  <div key={outing.id} className="glass-card rounded-xl overflow-hidden">
                    {/* Card header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif text-base font-semibold text-cream truncate">{outing.title}</h4>
                            <span className={`${BADGE_BASE} ${EVANGELISM_OUTING_STATUS_COLORS[outing.status]}`}>
                              {EVANGELISM_OUTING_STATUS_LABELS[outing.status]}
                            </span>
                            <span className="bg-accent-500/15 text-accent-300 border border-accent-500/20 rounded-lg px-2.5 py-1 text-xs">
                              {EVANGELISM_OBJECTIVE_LABELS[outing.objective]}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(outing.outing_date)}</span>
                            {outing.start_time && (
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(outing.start_time)}{outing.end_time ? ` – ${formatTime(outing.end_time)}` : ''}</span>
                            )}
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {outing.location}{outing.location_quartier ? `, ${outing.location_quartier}` : ''}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted/70">
                            {outing.responsible_name && (
                              <span>Responsable : {outing.responsible_name}</span>
                            )}
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {contactCount} contact{contactCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {outing.status !== 'terminee' && outing.status !== 'annulee' && (
                            <button
                              onClick={() => handleMarkComplete(outing.id)}
                              title="Marquer comme terminée"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-green-400 hover:bg-green-500/15 hover:border-green-500/20 transition-colors"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {isFullAdmin && (
                            <button
                              onClick={() => handleDeleteOuting(outing.id)}
                              title="Supprimer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-red-400 hover:bg-red-500/15 hover:border-red-500/20 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleOutingExpand(outing.id)}
                            title="Voir les contacts"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted hover:text-cream hover:bg-white/5 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: contacts from this outing */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 bg-white/[0.01] space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-accent-400" />
                          <span className="text-sm font-medium text-cream">Contacts récoltés ({contactCount})</span>
                        </div>
                        {contactCount === 0 ? (
                          <p className="text-xs text-muted text-center py-3">Aucun contact enregistré pour cette sortie.</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {(oContacts.length > 0 ? oContacts : contacts.filter((c) => c.outing_id === outing.id)).map((c) => (
                              <div key={c.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                                <div className="min-w-0">
                                  <span className="text-sm text-cream font-medium">{c.full_name}</span>
                                  {c.phone && <span className="text-xs text-muted ml-2">{c.phone}</span>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`${BADGE_BASE} ${EVANGELISM_CONTACT_STATUS_COLORS[c.status]}`}>
                                    {EVANGELISM_CONTACT_STATUS_LABELS[c.status]}
                                  </span>
                                  <span className="bg-pink-500/15 text-pink-300 border border-pink-500/20 rounded-lg px-2.5 py-1 text-xs">
                                    {EVANGELISM_DECISION_LABELS[c.decision]}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-TAB: CONTACTS
          ═══════════════════════════════════════════════════════════════ */}
      {subTab === 'contacts' && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setContactFormOpen(!contactFormOpen)}
              className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {contactFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {contactFormOpen ? 'Annuler' : 'Nouveau contact'}
            </button>
          </div>

          {/* Create form */}
          {contactFormOpen && (
            <div className="glass-card rounded-xl p-5 space-y-4 border border-accent-500/20">
              <h3 className="font-serif text-lg font-semibold text-cream">Nouveau contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Nom complet <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactForm.full_name}
                    onChange={(e) => setContactForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Prénom et nom"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Téléphone</label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+243 ..."
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">WhatsApp</label>
                  <input
                    type="tel"
                    value={contactForm.whatsapp}
                    onChange={(e) => setContactForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+243 ..."
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Quartier</label>
                  <input
                    type="text"
                    value={contactForm.quartier}
                    onChange={(e) => setContactForm((p) => ({ ...p, quartier: e.target.value }))}
                    placeholder="Quartier"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Décision</label>
                  <select
                    value={contactForm.decision}
                    onChange={(e) => setContactForm((p) => ({ ...p, decision: e.target.value as EvangelismDecision }))}
                    className={SELECT_CLASS}
                  >
                    {DECISIONS.map((d) => (
                      <option key={d} value={d}>{EVANGELISM_DECISION_LABELS[d]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Sortie liée</label>
                  <select
                    value={contactForm.outing_id}
                    onChange={(e) => setContactForm((p) => ({ ...p, outing_id: e.target.value }))}
                    className={SELECT_CLASS}
                  >
                    <option value="">— Aucune —</option>
                    {outings.map((o) => (
                      <option key={o.id} value={o.id}>{o.title} ({formatDate(o.outing_date)})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Adresse</label>
                  <input
                    type="text"
                    value={contactForm.address}
                    onChange={(e) => setContactForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Adresse complète"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Besoins</label>
                  <textarea
                    rows={2}
                    value={contactForm.needs}
                    onChange={(e) => setContactForm((p) => ({ ...p, needs: e.target.value }))}
                    placeholder="Besoins identifiés..."
                    className={INPUT_CLASS + ' resize-none'}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Demande de prière</label>
                  <textarea
                    rows={2}
                    value={contactForm.prayer_request}
                    onChange={(e) => setContactForm((p) => ({ ...p, prayer_request: e.target.value }))}
                    placeholder="Demande de prière..."
                    className={INPUT_CLASS + ' resize-none'}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Notes</label>
                  <textarea
                    rows={2}
                    value={contactForm.notes}
                    onChange={(e) => setContactForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Notes additionnelles..."
                    className={INPUT_CLASS + ' resize-none'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setContactFormOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-cream border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" /> Annuler
                </button>
                <button
                  onClick={handleCreateContact}
                  disabled={contactSaving}
                  className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {contactSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Ajouter le contact
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="glass-card rounded-xl p-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/50" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Rechercher par nom ou téléphone..."
                className={INPUT_CLASS + ' pl-9'}
              />
            </div>
            <select
              value={contactFilterDecision}
              onChange={(e) => setContactFilterDecision(e.target.value as EvangelismDecision | '')}
              className={SELECT_CLASS + ' w-auto min-w-[150px]'}
            >
              <option value="">Toutes décisions</option>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>{EVANGELISM_DECISION_LABELS[d]}</option>
              ))}
            </select>
            <select
              value={contactFilterStatus}
              onChange={(e) => setContactFilterStatus(e.target.value as EvangelismContactStatus | '')}
              className={SELECT_CLASS + ' w-auto min-w-[150px]'}
            >
              <option value="">Tous statuts</option>
              {CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>{EVANGELISM_CONTACT_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {quartiers.length > 0 && (
              <select
                value={contactFilterQuartier}
                onChange={(e) => setContactFilterQuartier(e.target.value)}
                className={SELECT_CLASS + ' w-auto min-w-[140px]'}
              >
                <option value="">Tous quartiers</option>
                {quartiers.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            )}
          </div>

          {/* Contact list */}
          {filteredContacts.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted/40 mb-3" />
              <p className="text-sm text-muted">Aucun contact trouvé.</p>
              <p className="text-xs text-muted/60 mt-1">
                {contacts.length === 0
                  ? 'Ajoutez votre premier contact d\'évangélisation.'
                  : 'Essayez de modifier vos filtres de recherche.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const isExpanded = expandedContact === contact.id;
                const cFollowups = contactFollowups[contact.id] ?? [];
                const isShowingStatusUpdate = statusUpdateId === contact.id;
                return (
                  <div key={contact.id} className="glass-card rounded-xl overflow-hidden">
                    {/* Row */}
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleContactExpand(contact.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-cream">{contact.full_name}</span>
                            <span className="bg-pink-500/15 text-pink-300 border border-pink-500/20 rounded-lg px-2 py-0.5 text-xs">
                              {EVANGELISM_DECISION_LABELS[contact.decision]}
                            </span>
                            <span className={`${BADGE_BASE} ${EVANGELISM_CONTACT_STATUS_COLORS[contact.status]}`}>
                              {EVANGELISM_CONTACT_STATUS_LABELS[contact.status]}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted flex-wrap">
                            {contact.phone && <span>{contact.phone}</span>}
                            {contact.quartier && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {contact.quartier}</span>}
                            {contact.assigned_to_name && <span className="flex items-center gap-0.5"><UserPlus className="h-3 w-3" /> {contact.assigned_to_name}</span>}
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(contact.phone || contact.whatsapp) && (
                            <button
                              onClick={() => openWhatsApp(contact.whatsapp || contact.phone, `Bonjour ${contact.full_name}, c'est l'équipe d'évangélisation.`)}
                              title="Envoyer un message WhatsApp"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-green-400 hover:bg-green-500/15 hover:border-green-500/20 transition-colors"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                          {isFullAdmin && (
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              title="Supprimer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-red-400 hover:bg-red-500/15 hover:border-red-500/20 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleContactExpand(contact.id)}
                            title="Détails"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted hover:text-cream hover:bg-white/5 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 bg-white/[0.01] space-y-4">
                        {/* Details grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {contact.phone && (
                            <div>
                              <span className="text-xs text-muted">Téléphone : </span>
                              <span className="text-cream">{contact.phone}</span>
                            </div>
                          )}
                          {contact.whatsapp && (
                            <div>
                              <span className="text-xs text-muted">WhatsApp : </span>
                              <span className="text-cream">{contact.whatsapp}</span>
                            </div>
                          )}
                          {contact.address && (
                            <div>
                              <span className="text-xs text-muted">Adresse : </span>
                              <span className="text-cream">{contact.address}</span>
                            </div>
                          )}
                          {contact.needs && (
                            <div>
                              <span className="text-xs text-muted">Besoins : </span>
                              <span className="text-cream">{contact.needs}</span>
                            </div>
                          )}
                          {contact.prayer_request && (
                            <div className="md:col-span-2">
                              <span className="text-xs text-muted">Demande de prière : </span>
                              <span className="text-cream italic">&ldquo;{contact.prayer_request}&rdquo;</span>
                            </div>
                          )}
                          {contact.notes && (
                            <div className="md:col-span-2">
                              <span className="text-xs text-muted">Notes : </span>
                              <span className="text-cream">{contact.notes}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-muted">Premier contact : </span>
                            <span className="text-cream">{formatDateTime(contact.first_contact_at)}</span>
                          </div>
                          {contact.came_to_culte && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 text-green-400" />
                              <span className="text-sm text-green-300">A participé au culte</span>
                            </div>
                          )}
                          {contact.baptized && (
                            <div className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-sm text-blue-300">Baptisé{contact.baptism_date ? ` (${formatDate(contact.baptism_date)})` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Status update */}
                        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                          <span className="text-xs text-muted shrink-0">Changer le statut :</span>
                          {isShowingStatusUpdate ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={statusUpdateValue}
                                onChange={(e) => setStatusUpdateValue(e.target.value as EvangelismContactStatus)}
                                className={SELECT_CLASS + ' w-auto'}
                              >
                                {CONTACT_STATUSES.map((s) => (
                                  <option key={s} value={s}>{EVANGELISM_CONTACT_STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleUpdateContactStatus(contact.id)}
                                className="bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              >
                                Appliquer
                              </button>
                              <button
                                onClick={() => setStatusUpdateId(null)}
                                className="text-xs text-muted hover:text-cream transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setStatusUpdateId(contact.id);
                                setStatusUpdateValue(contact.status);
                              }}
                              className="bg-white/5 hover:bg-white/10 text-cream border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Mettre à jour
                            </button>
                          )}
                        </div>

                        {/* Assign to */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted shrink-0">Assigner à :</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={assignInput[contact.id] || ''}
                              onChange={(e) => setAssignInput((prev) => ({ ...prev, [contact.id]: e.target.value }))}
                              placeholder="Nom du responsable"
                              className={INPUT_CLASS + ' max-w-[200px]'}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAssignContact(contact.id);
                              }}
                            />
                            <button
                              onClick={() => handleAssignContact(contact.id)}
                              className="bg-white/5 hover:bg-white/10 text-cream border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Assigner
                            </button>
                          </div>
                        </div>

                        {/* Followups timeline */}
                        <div className="pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-accent-400" />
                            <span className="text-sm font-medium text-cream">
                              Historique des suivis ({cFollowups.length > 0 ? cFollowups.length : followups.filter((f) => f.contact_id === contact.id).length})
                            </span>
                          </div>
                          {(cFollowups.length > 0 ? cFollowups : followups.filter((f) => f.contact_id === contact.id)).length === 0 ? (
                            <p className="text-xs text-muted text-center py-3">Aucun suivi enregistré pour ce contact.</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {(cFollowups.length > 0 ? cFollowups : followups.filter((f) => f.contact_id === contact.id)).map((fw) => (
                                <div key={fw.id} className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
                                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-accent-400">
                                    <Phone className="h-3 w-3" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-medium text-cream">
                                        {EVANGELISM_FOLLOWUP_TYPE_LABELS[fw.followup_type]}
                                      </span>
                                      <span className={`${BADGE_BASE} ${FOLLOWUP_RESULT_COLORS[fw.result]}`}>
                                        {EVANGELISM_FOLLOWUP_RESULT_LABELS[fw.result]}
                                      </span>
                                      <span className="text-[10px] text-muted">
                                        {formatDate(fw.scheduled_date)}
                                      </span>
                                    </div>
                                    {fw.notes && (
                                      <p className="text-xs text-cream/70 mt-0.5">{fw.notes}</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted/50 shrink-0">
                                    {fw.completed_at ? '✓ Complété' : '⏳ En attente'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-TAB: SUIVI
          ═══════════════════════════════════════════════════════════════ */}
      {subTab === 'suivi' && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setFollowupFormOpen(!followupFormOpen)}
              className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {followupFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {followupFormOpen ? 'Annuler' : 'Nouveau suivi'}
            </button>
          </div>

          {/* Create form */}
          {followupFormOpen && (
            <div className="glass-card rounded-xl p-5 space-y-4 border border-accent-500/20">
              <h3 className="font-serif text-lg font-semibold text-cream">Nouveau suivi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Contact <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={followupForm.contact_id}
                    onChange={(e) => setFollowupForm((p) => ({ ...p, contact_id: e.target.value }))}
                    className={SELECT_CLASS}
                  >
                    <option value="">— Sélectionner un contact —</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` (${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Type de suivi</label>
                  <select
                    value={followupForm.followup_type}
                    onChange={(e) => setFollowupForm((p) => ({ ...p, followup_type: e.target.value as EvangelismFollowupType }))}
                    className={SELECT_CLASS}
                  >
                    {FOLLOWUP_TYPES.map((t) => (
                      <option key={t} value={t}>{EVANGELISM_FOLLOWUP_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Date prévue <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={followupForm.scheduled_date}
                    onChange={(e) => setFollowupForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Notes</label>
                  <textarea
                    rows={3}
                    value={followupForm.notes}
                    onChange={(e) => setFollowupForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Détails du suivi..."
                    className={INPUT_CLASS + ' resize-none'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setFollowupFormOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-cream border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" /> Annuler
                </button>
                <button
                  onClick={handleCreateFollowup}
                  disabled={followupSaving}
                  className="bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {followupSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Planifier le suivi
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="glass-card rounded-xl p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Filter className="h-4 w-4" /> Filtrer :
            </div>
            <select
              value={followupFilterType}
              onChange={(e) => setFollowupFilterType(e.target.value as EvangelismFollowupType | '')}
              className={SELECT_CLASS + ' w-auto min-w-[160px]'}
            >
              <option value="">Tous types</option>
              {FOLLOWUP_TYPES.map((t) => (
                <option key={t} value={t}>{EVANGELISM_FOLLOWUP_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={followupFilterResult}
              onChange={(e) => setFollowupFilterResult(e.target.value as EvangelismFollowupResult | '')}
              className={SELECT_CLASS + ' w-auto min-w-[140px]'}
            >
              <option value="">Tous résultats</option>
              {FOLLOWUP_RESULTS.map((r) => (
                <option key={r} value={r}>{EVANGELISM_FOLLOWUP_RESULT_LABELS[r]}</option>
              ))}
            </select>
            <input
              type="date"
              value={followupFilterDateStart}
              onChange={(e) => setFollowupFilterDateStart(e.target.value)}
              placeholder="Du"
              className={INPUT_CLASS + ' w-auto'}
              title="Date début"
            />
            <input
              type="date"
              value={followupFilterDateEnd}
              onChange={(e) => setFollowupFilterDateEnd(e.target.value)}
              placeholder="Au"
              className={INPUT_CLASS + ' w-auto'}
              title="Date fin"
            />
            {(followupFilterType || followupFilterResult || followupFilterDateStart || followupFilterDateEnd) && (
              <button
                onClick={() => {
                  setFollowupFilterType('');
                  setFollowupFilterResult('');
                  setFollowupFilterDateStart('');
                  setFollowupFilterDateEnd('');
                }}
                className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Followups grouped by contact */}
          {followupsGrouped.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Phone className="h-10 w-10 mx-auto text-muted/40 mb-3" />
              <p className="text-sm text-muted">Aucun suivi trouvé.</p>
              <p className="text-xs text-muted/60 mt-1">
                {followups.length === 0
                  ? 'Planifiez votre premier suivi pour un contact.'
                  : 'Modifiez vos filtres pour voir plus de résultats.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {followupsGrouped.map(({ contact, followups: cFollowups }) => (
                <div key={contact.id} className="glass-card rounded-xl p-4 space-y-3">
                  {/* Contact header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-accent-400 text-sm font-bold">
                      {contact.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-cream">{contact.full_name}</span>
                        <span className={`${BADGE_BASE} ${EVANGELISM_CONTACT_STATUS_COLORS[contact.status]}`}>
                          {EVANGELISM_CONTACT_STATUS_LABELS[contact.status]}
                        </span>
                      </div>
                      {contact.phone && <span className="text-xs text-muted">{contact.phone}</span>}
                    </div>
                    {(contact.phone || contact.whatsapp) && (
                      <button
                        onClick={() => openWhatsApp(contact.whatsapp || contact.phone, `Bonjour ${contact.full_name}, comment allez-vous ?`)}
                        title="WhatsApp"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-green-400 hover:bg-green-500/15 hover:border-green-500/20 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Followup items */}
                  <div className="space-y-2 pl-4 border-l-2 border-white/5 ml-4">
                    {cFollowups.map((fw) => (
                      <div key={fw.id} className="relative flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2.5 group">
                        <div className="absolute -left-[1.35rem] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-white/20" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-cream">
                              {EVANGELISM_FOLLOWUP_TYPE_LABELS[fw.followup_type]}
                            </span>
                            <span className={`${BADGE_BASE} ${FOLLOWUP_RESULT_COLORS[fw.result]}`}>
                              {EVANGELISM_FOLLOWUP_RESULT_LABELS[fw.result]}
                            </span>
                            <span className="text-[10px] text-muted">
                              {formatDate(fw.scheduled_date)}
                            </span>
                            {fw.completed_at && (
                              <span className="text-[10px] text-green-400/70">✓ Complété</span>
                            )}
                          </div>
                          {fw.notes && (
                            <p className="text-xs text-cream/70 mt-1">{fw.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!fw.completed_at && (
                            <>
                              {completingId === fw.id ? (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={completeResult}
                                    onChange={(e) => setCompleteResult(e.target.value as EvangelismFollowupResult)}
                                    className={SELECT_CLASS + ' w-auto text-xs py-1 px-2'}
                                  >
                                    {FOLLOWUP_RESULTS.map((r) => (
                                      <option key={r} value={r}>{EVANGELISM_FOLLOWUP_RESULT_LABELS[r]}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleCompleteFollowup(fw.id)}
                                    className="bg-green-500/20 text-green-300 border border-green-500/20 px-2 py-1 rounded text-xs hover:bg-green-500/30 transition-colors"
                                  >
                                    OK
                                  </button>
                                  <button
                                    onClick={() => setCompletingId(null)}
                                    className="text-xs text-muted hover:text-cream transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setCompletingId(fw.id);
                                    setCompleteResult(fw.result);
                                  }}
                                  title="Marquer comme complété"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-green-400 hover:bg-green-500/15 hover:border-green-500/20 transition-colors"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                          {isFullAdmin && (
                            <button
                              onClick={() => handleDeleteFollowup(fw.id)}
                              title="Supprimer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-red-400 hover:bg-red-500/15 hover:border-red-500/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}