import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ChevronDown,
  Save,
  Users,
  Clock,
  FileText,
  Loader2,
  Info,
  AlertCircle,
  Compass,
  Music,
  Flame,
  HandHeart,
  GraduationCap,
  Headphones,
  CalendarClock,
  Shield,
  BookOpen,
  UserPlus,
  Phone,
  MapPin,
  CheckCircle,
  Eye,
} from '../../lib/icons';
import type { LucideIcon } from '../../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   Types & constants
   ═══════════════════════════════════════════════════════════════════ */

interface DepartmentSectionProps {
  departmentId: string;
  departmentName: string;
  accentColor?: string;
}

type SubAccordion = 'overview' | 'members' | 'activity' | 'notes' | 'visitors';

interface VisitorRow {
  id: string;
  visitor_name: string;
  visitor_phone: string | null;
  visitor_gender: string | null;
  visitor_quartier: string | null;
  how_known: string | null;
  invited_by: string | null;
  follow_up_type: string | null;
  cult_day: string | null;
  cult_date: string;
  status: string;
  created_at: string;
  follow_up_notes: string | null;
}

interface DepartmentConfig {
  icon: LucideIcon;
  description: string;
  defaultActivities: string[];
  mission: string;
  requirements: string[];
}

interface DepartmentRecord {
  id: string;
  name: string;
  description?: string;
  meeting_schedule?: string;
  mission?: string;
  activities?: string[];
  requirements?: string[];
}

interface DeptMember {
  id: string;
  user_id: string;
  department_id: string;
  role_in_dept?: string;
  joined_at?: string;
  is_active?: boolean;
  full_name?: string;
  avatar_url?: string | null;
}

/* ── Department configuration map ────────────────────────────── */
const DEPARTMENT_CONFIGS: { keyword: string; config: DepartmentConfig }[] = [
  {
    keyword: 'évangélisation',
    config: {
      icon: Compass,
      description: 'Porter la Bonne Nouvelle de Jésus-Christ aux perdus, organiser des sorties d\'évangélisation et assurer le suivi des nouveaux convertis.',
      defaultActivities: ['Sorties d\'évangélisation', 'Distribution de Bibles et tracts', 'Visites de quartier', 'Suivi des convertis', 'Campagnes d\'évangélisation'],
      mission: 'Aller vers ceux qui ne connaissent pas encore le Seigneur et leur annoncer l\'Évangile avec amour et conviction.',
      requirements: ['Passion pour les âmes', 'Connaissance basique de la Bible', 'Disponibilité pour les sorties'],
    },
  },
  {
    keyword: 'louange',
    config: {
      icon: Music,
      description: 'Élever le nom de Jésus par la musique et les chants, préparer les répétitions et accompagner les cultes avec ferveur.',
      defaultActivities: ['Répétitions de chants', 'Accompagnement des cultes', 'Composition de louanges', 'Enregistrements musicaux', 'Animations spéciales'],
      mission: 'Créer une atmosphère de louange et d\'adoration qui prépare les cœurs à recevoir la Parole de Dieu.',
      requirements: ['Sens musical', 'Engagement aux répétitions', 'Cœur d\'adorateur'],
    },
  },
  {
    keyword: 'intercession',
    config: {
      icon: Flame,
      description: 'Porter l\'église et les nations dans la prière fervente, organiser des veillées de prière et des chaînes de jeûne.',
      defaultActivities: ['Veillées de prière', 'Chaînes de jeûne et prière', 'Prière pour les malades', 'Intercession pour la nation', 'Réunions de prière matinale'],
      mission: 'Être le pilier spirituel de l\'église en soutenant tous les ministères par une prière incessante et fervente.',
      requirements: ['Vie de prière personnelle', 'Ferveur spirituelle', 'Disponibilité pour les veillées'],
    },
  },
  {
    keyword: 'diaconie',
    config: {
      icon: HandHeart,
      description: 'Apporter une aide pratique aux membres dans le besoin, visiter les malades, et promouvoir l\'entraide et la solidarité.',
      defaultActivities: ['Visites aux malades et hospitalisés', 'Aide aux membres dans le besoin', 'Entraide communautaire', 'Actions sociales', 'Accompagnement des familles'],
      mission: 'Incarné l\'amour du Christ par des actes concrets de service et de compassion envers les membres et la communauté.',
      requirements: ['Cœur de serviteur', 'Disponibilité pour les visites', 'Sens de la confidentialité'],
    },
  },
  {
    keyword: 'école',
    config: {
      icon: GraduationCap,
      description: 'Enseigner la Parole de Dieu de manière adaptée aux enfants et aux nouveaux convertis, les former dans la foi.',
      defaultActivities: ['Cours bibliques du dimanche', 'Matériel pédagogique', 'Formation des nouveaux convertis', 'Activités pour enfants', 'Études bibliques thématiques'],
      mission: 'Enraciner les enfants et les nouveaux croyants dans la Parole de Dieu pour une fondation spirituelle solide.',
      requirements: ['Connaissance de la Bible', 'Patience et pédagogie', 'Amour pour les enfants et les débutants'],
    },
  },
  {
    keyword: 'multimédia',
    config: {
      icon: Headphones,
      description: 'Gérer les réseaux sociaux, le son, les projections et tous les outils de communication visuelle et auditive de l\'église.',
      defaultActivities: ['Gestion des réseaux sociaux', 'Mixage sonore pendant les cultes', 'Projections visuelles', 'Photographie et vidéo', 'Communication interne'],
      mission: 'Amplifier le message de l\'Évangile en utilisant les outils technologiques et de communication modernes.',
      requirements: ['Compétences techniques en son/vidéo', 'Créativité', 'Fiabilité et ponctualité'],
    },
  },
];

const SUB_SECTIONS_BASE: { key: SubAccordion; icon: LucideIcon; label: string }[] = [
  { key: 'overview', icon: Info, label: 'Aperçu' },
  { key: 'members', icon: Users, label: 'Membres du département' },
  { key: 'activity', icon: Clock, label: 'Activité récente' },
  { key: 'notes', icon: FileText, label: 'Mes notes' },
];

const VISITORS_SECTION: { key: SubAccordion; icon: LucideIcon; label: string } = {
  key: 'visitors', icon: UserPlus, label: 'Nouveaux Venus à suivre',
};

const HOW_KNOWN_MAP: Record<string, string> = {
  membre_invitation: 'Invitation membre',
  reseaux_sociaux: 'Réseaux sociaux',
  passant: 'Passant',
  media: 'Média',
  autre: 'Autre',
};

const VISITOR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: 'bg-blue-500/20 text-blue-300' },
  contacte: { label: 'Contacté', color: 'bg-purple-500/20 text-purple-300' },
  suivi_en_cours: { label: 'Suivi en cours', color: 'bg-amber-500/20 text-amber-300' },
  integre: { label: 'Intégré', color: 'bg-emerald-500/20 text-emerald-300' },
  perdu: { label: 'Perdu', color: 'bg-red-500/20 text-red-300' },
};

const FOLLOW_UP_OPTIONS = [
  { value: 'visite', label: 'Visite à domicile' },
  { value: 'appel', label: 'Appel téléphonique' },
  { value: 'information', label: 'Envoyer informations' },
  { value: 'aucun', label: 'Aucun suivi' },
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getConfigForDepartment(departmentName: string): DepartmentConfig {
  const lower = departmentName.toLowerCase();
  const match = DEPARTMENT_CONFIGS.find(c => lower.includes(c.keyword));
  if (match) return match.config;
  return {
    icon: Shield,
    description: `Département ${departmentName} — informations à venir.`,
    defaultActivities: [],
    mission: 'À définir par le responsable du département.',
    requirements: [],
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function DepartmentSection({ departmentId, departmentName, accentColor }: DepartmentSectionProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const accent = accentColor || '#d4a843';
  const deptConfig = getConfigForDepartment(departmentName);
  const DeptIcon = deptConfig.icon;

  /* ── Accordion state ───────────────────────────────────────────── */
  const [openSections, setOpenSections] = useState<Set<SubAccordion>>(new Set<SubAccordion>(['overview']));

  const toggleSection = (key: SubAccordion) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ── Evangelisation detection ─────────────────────────────────── */
  const isEvangelisation = departmentName.toLowerCase().includes('évangélisation');
  const subSections = isEvangelisation
    ? [SUB_SECTIONS_BASE[0], VISITORS_SECTION, ...SUB_SECTIONS_BASE.slice(1)]
    : SUB_SECTIONS_BASE;

  /* ── Data state ────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);
  const [deptRecord, setDeptRecord] = useState<DepartmentRecord | null>(null);
  const [members, setMembers] = useState<DeptMember[]>([]);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesFallback, setNotesFallback] = useState(false);

  /* ── Visitors state (évangélisation only) ─────────────────────── */
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [updatingVisitorId, setUpdatingVisitorId] = useState<string | null>(null);

  /* ── Fetch all data ────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch department record
      const deptRes = await supabase
        .from('departments')
        .select('id, name, description, meeting_schedule, mission, activities, requirements')
        .eq('id', departmentId)
        .single();

      if (deptRes.error && !isTableNotFoundError(deptRes.error)) throw deptRes.error;
      if (deptRes.data) setDeptRecord(deptRes.data as unknown as DepartmentRecord);

      // Fetch department members (separate query, NOT a PostgREST join)
      const membersRes = await supabase
        .from('department_members')
        .select('id, user_id, department_id, role_in_dept, joined_at, is_active')
        .eq('department_id', departmentId)
        .eq('is_active', true);

      let tableError = false;
      if (membersRes.error && !isTableNotFoundError(membersRes.error)) throw membersRes.error;

      if (isTableNotFoundError(membersRes.error) || !membersRes.data || membersRes.data.length === 0) {
        // Table may not exist or no members — show empty state
        setMembers([]);
      } else {
        // Fetch user profiles separately
        const userIds = membersRes.data.map((m: { user_id: string }) => m.user_id);
        const profilesRes = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesRes.error && !isTableNotFoundError(profilesRes.error)) throw profilesRes.error;

        const profileMap = new Map<string, { full_name?: string; avatar_url?: string | null }>();
        if (profilesRes.data) {
          for (const p of profilesRes.data) {
            profileMap.set(p.id, { full_name: (p as any).full_name, avatar_url: (p as any).avatar_url });
          }
        }

        // Merge members with profiles in JS
        const enriched = (membersRes.data as unknown as DeptMember[]).map(m => {
          const prof = profileMap.get(m.user_id);
          return { ...m, full_name: prof?.full_name, avatar_url: prof?.avatar_url };
        });
        setMembers(enriched);
      }

      // Fetch notes
      const notesRes = await supabase
        .from('department_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('department_id', departmentId)
        .single();

      if (notesRes.error) {
        if (isTableNotFoundError(notesRes.error)) {
          // Table doesn't exist, use localStorage
          const localNotes = localStorage.getItem(`dept_notes_${departmentId}_${user.id}`);
          setNotes(localNotes || '');
          setNotesFallback(true);
        } else if ((notesRes.error as any).code === 'PGRST116') {
          // No row found — empty notes
          const localNotes = localStorage.getItem(`dept_notes_${departmentId}_${user.id}`);
          setNotes(localNotes || '');
        }
      } else {
        setNotes((notesRes.data as any).content || '');
      }

      if (isTableNotFoundError(deptRes.error) || isTableNotFoundError(membersRes.error)) {
        tableError = true;
      }
      if (tableError && !deptRes.data && members.length === 0) {
        setModuleError(true);
      }

      // Fetch new visitors for évangélisation department
      if (isEvangelisation) {
        setVisitorsLoading(true);
        try {
          const { data: visitorsData, error: vErr } = await supabase
            .from('new_visitors')
            .select('id, visitor_name, visitor_phone, visitor_gender, visitor_quartier, how_known, invited_by, follow_up_type, cult_day, cult_date, status, created_at, follow_up_notes')
            .in('status', ['nouveau', 'contacte', 'suivi_en_cours'])
            .order('created_at', { ascending: false })
            .limit(50);
          if (!vErr && visitorsData) {
            setVisitors(visitorsData as unknown as VisitorRow[]);
          }
        } catch (e) {
          console.error('Visitors fetch error:', e);
        } finally {
          setVisitorsLoading(false);
        }
      }
    } catch (err) {
      if (isTableNotFoundError(err)) {
        setModuleError(true);
      } else {
        console.error('DepartmentSection fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, departmentId, isEvangelisation]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Save notes ────────────────────────────────────────────────── */
  const handleSaveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    try {
      if (notesFallback) {
        // Use localStorage
        localStorage.setItem(`dept_notes_${departmentId}_${user.id}`, notes);
        addToast('Notes sauvegardées localement.', 'success');
      } else {
        // Try Supabase upsert
        const { error } = await supabase
          .from('department_notes')
          .upsert(
            {
              user_id: user.id,
              department_id: departmentId,
              content: notes,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,department_id' }
          );

        if (isTableNotFoundError(error)) {
          // Fallback to localStorage
          localStorage.setItem(`dept_notes_${departmentId}_${user.id}`, notes);
          setNotesFallback(true);
          addToast('Notes sauvegardées localement.', 'success');
        } else if (error) {
          throw error;
        } else {
          addToast('Notes sauvegardées avec succès !', 'success');
        }
      }
    } catch (err) {
      console.error('Save notes error:', err);
      addToast('Erreur lors de la sauvegarde des notes.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  /* ── Derived display values ────────────────────────────────────── */
  const displayDescription = deptRecord?.description || deptConfig.description;
  const displayMission = deptRecord?.mission || deptConfig.mission;
  const displayActivities = (deptRecord?.activities?.length ? deptRecord.activities : deptConfig.defaultActivities) as string[];
  const displayRequirements = (deptRecord?.requirements?.length ? deptRecord.requirements : deptConfig.requirements) as string[];
  const displaySchedule = deptRecord?.meeting_schedule || null;

  /* ═══════════════════════════════════════════════════════════════════
     Section renderers
     ═══════════════════════════════════════════════════════════════════ */

  const renderOverview = () => (
    <div className="space-y-5">
      {/* Department icon & name */}
      <div className="flex items-center gap-3 mb-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}20` }}
        >
          <DeptIcon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <div>
          <h3 className="text-cream font-display text-headline-md">{departmentName}</h3>
          {displaySchedule && (
            <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <CalendarClock className="w-3 h-3" />
              {displaySchedule}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted leading-relaxed">{displayDescription}</p>

      {/* Mission */}
      <div className="glass rounded-xl p-4 space-y-2">
        <p className="text-xs text-muted font-medium uppercase tracking-wider">Mission</p>
        <p className="text-sm text-cream leading-relaxed">{displayMission}</p>
      </div>

      {/* Activities */}
      {displayActivities.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Activités</p>
          <ul className="space-y-1.5">
            {displayActivities.map((activity, i) => (
              <li key={i} className="text-sm text-cream flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                {activity}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements */}
      {displayRequirements.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Pré-requis</p>
          <ul className="space-y-1.5">
            {displayRequirements.map((req, i) => (
              <li key={i} className="text-sm text-cream/80 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-muted shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderMembers = () => (
    <div className="space-y-3">
      {members.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted/50" />
          <p className="text-muted text-sm">Aucun membre actif dans ce département.</p>
          <p className="text-muted/60 text-xs mt-1">Contactez le responsable pour rejoindre.</p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {members.map(member => {
            const initials = member.full_name ? getInitials(member.full_name) : '??';
            const avatarBg = member.avatar_url ? undefined : `${accent}30`;
            return (
              <div
                key={member.id}
                className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
              >
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name || 'Membre'}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-cream"
                    style={{ backgroundColor: avatarBg }}
                  >
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cream font-medium truncate">
                    {member.full_name || 'Membre'}
                  </p>
                  {member.role_in_dept && (
                    <p className="text-xs text-muted truncate">{member.role_in_dept}</p>
                  )}
                </div>
                {member.joined_at && (
                  <span className="text-[11px] text-muted/70 shrink-0 hidden sm:block">
                    {formatDate(member.joined_at)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="text-center py-8">
      <Clock className="w-8 h-8 mx-auto mb-2 text-muted/50" />
      <p className="text-muted text-sm">Aucune activité récente</p>
      <p className="text-muted/60 text-xs mt-1">Les activités de ce département apparaîtront ici.</p>
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted">Écrivez vos notes personnelles concernant ce département. Elles sont privées et ne sont visibles que par vous.</p>
      <textarea
        rows={6}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Vos notes ici…"
        className="w-full bg-white/5 border border-line rounded-xl px-4 py-3 text-cream text-sm leading-relaxed resize-none placeholder:text-muted/60 focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
        style={{ '--gold': accent } as React.CSSProperties}
      />
      <div className="flex items-center justify-between">
        {notesFallback && (
          <span className="text-[10px] text-muted/50 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Stockage local
          </span>
        )}
        <button
          type="button"
          onClick={handleSaveNotes}
          disabled={savingNotes}
          className="btn-gold flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 ml-auto"
        >
          {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>
    </div>
  );

  /* ── Update visitor follow-up status ─────────────────────────── */
  const handleUpdateVisitorStatus = async (visitorId: string, newStatus: string) => {
    if (!user) return;
    setUpdatingVisitorId(visitorId);
    try {
      const { error } = await supabase
        .from('new_visitors')
        .update({
          status: newStatus,
          follow_up_by: user.id,
          follow_up_at: new Date().toISOString(),
        })
        .eq('id', visitorId);
      if (error) throw error;
      // Update local state
      setVisitors(prev => prev.map(v =>
        v.id === visitorId ? { ...v, status: newStatus } : v
      ));
      addToast('Statut du visiteur mis à jour.', 'success');
    } catch (err) {
      console.error('Update visitor status error:', err);
      addToast('Erreur lors de la mise à jour.', 'error');
    } finally {
      setUpdatingVisitorId(null);
    }
  };

  /* ── Render visitors section ───────────────────────────────────── */
  const renderVisitors = () => (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Ces visiteurs ont été enregistrés lors des cultes par l'équipe Protocole. Prenez-les en suivi pour l'évangélisation.
      </p>

      {visitorsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : visitors.length === 0 ? (
        <div className="text-center py-8">
          <UserPlus className="w-8 h-8 mx-auto mb-2 text-muted/50" />
          <p className="text-muted text-sm">Aucun nouveau visiteur à suivre</p>
          <p className="text-muted/60 text-xs mt-1">
            Les visiteurs enregistrés par le Protocole apparaîtront ici.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-cream">{visitors.length} visiteur{visitors.length > 1 ? 's' : ''} en attente de suivi</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {visitors.map(v => {
              const statusCfg = VISITOR_STATUS_CONFIG[v.status] || VISITOR_STATUS_CONFIG.nouveau;
              return (
                <div key={v.id} className="glass rounded-xl p-4 space-y-3">
                  {/* Header: name + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cream truncate">{v.visitor_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {v.visitor_phone && (
                          <span className="text-[11px] text-muted flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {v.visitor_phone}
                          </span>
                        )}
                        {v.visitor_quartier && (
                          <span className="text-[11px] text-muted flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {v.visitor_quartier}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted/80">
                    {v.cult_day && (
                      <span>Culte: <span className="text-cream/70 capitalize">{v.cult_day}</span></span>
                    )}
                    {v.how_known && (
                      <span>Source: <span className="text-cream/70">{HOW_KNOWN_MAP[v.how_known] || v.how_known}</span></span>
                    )}
                    {v.invited_by && (
                      <span>Invité par: <span className="text-cream/70">{v.invited_by}</span></span>
                    )}
                    <span>Enregistré: <span className="text-cream/70">{formatDate(v.created_at)}</span></span>
                  </div>

                  {/* Follow-up actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-line/20">
                    <Eye className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="text-[11px] text-muted shrink-0">Suivi :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {v.status !== 'contacte' && (
                        <button
                          onClick={() => handleUpdateVisitorStatus(v.id, 'contacte')}
                          disabled={updatingVisitorId === v.id}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-colors disabled:opacity-50"
                        >
                          Marquer contacté
                        </button>
                      )}
                      {v.status !== 'suivi_en_cours' && (
                        <button
                          onClick={() => handleUpdateVisitorStatus(v.id, 'suivi_en_cours')}
                          disabled={updatingVisitorId === v.id}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                        >
                          Suivi en cours
                        </button>
                      )}
                      {v.status !== 'integre' && (
                        <button
                          onClick={() => handleUpdateVisitorStatus(v.id, 'integre')}
                          disabled={updatingVisitorId === v.id}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-0.5" />
                          Intégré
                        </button>
                      )}
                      {v.status !== 'perdu' && (
                        <button
                          onClick={() => handleUpdateVisitorStatus(v.id, 'perdu')}
                          disabled={updatingVisitorId === v.id}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                        >
                          Perdu de vue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
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
        <p className="text-muted/60 text-xs mt-1">Les données de ce département ne sont pas encore disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {subSections.map(section => {
        const isOpen = openSections.has(section.key);
        const SectionIcon = section.icon;
        return (
          <div key={section.key} className="glass-card rounded-xl overflow-hidden">
            {/* ── Sub-accordion header ── */}
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <SectionIcon className="w-5 h-5" style={{ color: accent }} />
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
                ) : section.key === 'overview' ? renderOverview() :
                   section.key === 'members' ? renderMembers() :
                   section.key === 'activity' ? renderActivity() :
                   section.key === 'notes' ? renderNotes() :
                   section.key === 'visitors' ? renderVisitors() :
                   null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}