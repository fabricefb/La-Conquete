import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import type { Department, Position, DepartmentMember, DeptMemberRole } from '../../../types';
import {
  Plus,
  Trash2,
  Save,
  X,
  Edit3,
  Loader2,
  Star,
  Users,
  CheckCircle,
  ChevronUp,
  UserMinus,
  UserCheck,
  Shield,
  UserPlus,
  Clock,
  XCircle,
  MessageSquare,
  Inbox,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  'Users',
  'Heart',
  'Star',
  'Compass',
  'BookOpen',
  'Mic',
  'Music',
  'Shield',
  'GraduationCap',
  'HandHeart',
  'MapPin',
  'Flame',
  'Globe',
  'Crown',
  'Cross',
] as const;

type SubTab = 'departments' | 'positions-members' | 'requests';

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

interface DepartmentFormData {
  name: string;
  slug: string;
  description: string;
  icon_name: string;
  accent_color: string;
  meeting_schedule: string;
  mission: string;
  activities: string;
  requirements: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

interface PositionFormData {
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY_DEPT_FORM: DepartmentFormData = {
  name: '',
  slug: '',
  description: '',
  icon_name: 'Users',
  accent_color: 'gold',
  meeting_schedule: '',
  mission: '',
  activities: '',
  requirements: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
};

const EMPTY_POS_FORM: PositionFormData = {
  name: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function accentLabel(color: string): string {
  return color === 'gold' ? 'Or' : 'Rouge';
}

function accentClasses(color: string): string {
  if (color === 'gold') {
    return 'bg-gold-400/20 text-gold-400 border-gold-400/30';
  }
  return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
}

function accentDotClasses(color: string): string {
  return color === 'gold' ? 'bg-gold-400' : 'bg-orange-400';
}

function roleBadgeClasses(role: DeptMemberRole): string {
  switch (role) {
    case 'leader':
      return 'bg-purple-500/20 text-purple-300';
    case 'member':
      return 'bg-blue-500/20 text-blue-300';
    case 'pending':
      return 'bg-amber-500/20 text-amber-300';
  }
}

function roleLabel(role: DeptMemberRole): string {
  switch (role) {
    case 'leader':
      return 'Leader';
    case 'member':
      return 'Membre';
    case 'pending':
      return 'En attente';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5" />
          <div className="h-4 w-1/3 rounded bg-white/5" />
        </div>
        <div className="h-3 w-2/3 rounded bg-white/5" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DepartmentsTab() {
  const { addToast } = useToast();

  // ---- Sub-tab state -------------------------------------------------------
  const [subTab, setSubTab] = useState<SubTab>('departments');

  // ---- Departments state ----------------------------------------------------
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptSaving, setDeptSaving] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [deptForm, setDeptForm] = useState<DepartmentFormData>(EMPTY_DEPT_FORM);

  // ---- Positions & Members state --------------------------------------------
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [members, setMembers] = useState<
    (DepartmentMember & { full_name?: string | null; position_name?: string | null })[]
  >([]);
  const [pmLoading, setPmLoading] = useState(false);

  // Position inline editing
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [posForm, setPosForm] = useState<PositionFormData>(EMPTY_POS_FORM);
  const [posSaving, setPosSaving] = useState(false);
  const [addingPos, setAddingPos] = useState(false);

  // ---- Department Requests state -------------------------------------------
  const [deptRequests, setDeptRequests] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqProcessing, setReqProcessing] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  // =========================================================================
  // FETCH
  // =========================================================================

  const fetchDepartments = useCallback(async () => {
    setDeptLoading(true);
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('sort_order');

    if (error) {
      addToast('Erreur lors du chargement des départements', 'error');
    } else {
      setDepartments((data as Department[]) ?? []);
    }
    setDeptLoading(false);
  }, [addToast]);

  const fetchPositionsAndMembers = useCallback(
    async (deptId: string) => {
      if (!deptId) {
        setPositions([]);
        setMembers([]);
        return;
      }
      setPmLoading(true);

      const [posRes, memRes] = await Promise.all([
        supabase
          .from('positions')
          .select('*')
          .eq('department_id', deptId)
          .order('sort_order'),
        supabase
          .from('department_members')
          .select('*, profiles(full_name)')
          .eq('department_id', deptId)
          .eq('is_active', true)
          .order('role_in_dept'),
      ]);

      if (posRes.error) {
        addToast('Erreur lors du chargement des postes', 'error');
      } else {
        setPositions((posRes.data as Position[]) ?? []);
      }

      if (memRes.error) {
        addToast('Erreur lors du chargement des membres', 'error');
      } else {
        const memData = ((memRes.data as unknown[]) ?? []).map((m: Record<string, unknown>) => ({
          ...(m as DepartmentMember),
          full_name: (m.profiles as Record<string, unknown> | null)?.full_name as string | null ?? null,
        }));
        setMembers(memData);
      }

      setPmLoading(false);
    },
    [addToast],
  );

  const fetchDeptRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const { data: reqs, error } = await supabase
        .from('department_requests')
        .select('id, user_id, department_id, message, status, created_at, responded_at')
        .eq('status', 'en_attente')
        .order('created_at', { ascending: true });

      if (error || !reqs || reqs.length === 0) {
        setDeptRequests([]);
        setReqLoading(false);
        return;
      }

      // Récupérer les profils utilisateurs et noms de départements séparément
      const userIds = [...new Set(reqs.map(r => r.user_id))];
      const deptIds = [...new Set(reqs.map(r => r.department_id))];

      const [profilesRes, deptsRes] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, email').in('id', userIds),
        supabase.from('departments').select('id, name').in('id', deptIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const deptMap = new Map((deptsRes.data || []).map((d: any) => [d.id, d]));

      const enriched = reqs.map(r => ({
        ...r,
        user_profiles: profileMap.get(r.user_id) || null,
        departments: deptMap.get(r.department_id) || null,
      }));

      setDeptRequests(enriched);
    } catch {
      setDeptRequests([]);
    }
    setReqLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchDeptRequests();
  }, [fetchDepartments, fetchDeptRequests]);

  useEffect(() => {
    if (subTab === 'positions-members' && selectedDeptId) {
      fetchPositionsAndMembers(selectedDeptId);
    }
  }, [subTab, selectedDeptId, fetchPositionsAndMembers]);

  // =========================================================================
  // DEPARTMENTS CRUD
  // =========================================================================

  const openDeptCreate = () => {
    setEditingDeptId(null);
    setDeptForm(EMPTY_DEPT_FORM);
    setDeptFormOpen(true);
  };

  const openDeptEdit = (dept: Department) => {
    setEditingDeptId(dept.id);
    setDeptForm({
      name: dept.name,
      slug: dept.slug,
      description: dept.description,
      icon_name: dept.icon_name,
      accent_color: dept.accent_color,
      meeting_schedule: dept.meeting_schedule ?? '',
      mission: dept.mission ?? '',
      activities: dept.activities ?? '',
      requirements: dept.requirements ?? '',
      image_url: dept.image_url ?? '',
      sort_order: dept.sort_order,
      is_active: dept.is_active,
    });
    setDeptFormOpen(true);
  };

  const closeDeptForm = () => {
    setDeptFormOpen(false);
    setEditingDeptId(null);
    setDeptForm(EMPTY_DEPT_FORM);
  };

  const handleDeptField = <K extends keyof DepartmentFormData>(
    field: K,
    value: DepartmentFormData[K],
  ) => {
    setDeptForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from name if slug field hasn't been manually edited
      if (field === 'name') {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleDeptSave = async () => {
    if (!deptForm.name.trim()) {
      addToast('Le nom du département est obligatoire', 'error');
      return;
    }

    setDeptSaving(true);

    const payload = {
      name: deptForm.name.trim(),
      slug: deptForm.slug.trim() || slugify(deptForm.name.trim()),
      description: deptForm.description.trim(),
      icon_name: deptForm.icon_name,
      accent_color: deptForm.accent_color,
      meeting_schedule: deptForm.meeting_schedule.trim() || null,
      mission: deptForm.mission.trim() || null,
      activities: deptForm.activities.trim() || null,
      requirements: deptForm.requirements.trim() || null,
      image_url: deptForm.image_url.trim() || null,
      sort_order: deptForm.sort_order,
      is_active: deptForm.is_active,
    };

    if (editingDeptId) {
      const { error } = await supabase
        .from('departments')
        .update(payload)
        .eq('id', editingDeptId);

      if (error) {
        addToast('Erreur lors de la mise à jour du département', 'error');
      } else {
        addToast('Département mis à jour avec succès', 'success');
        closeDeptForm();
        fetchDepartments();
      }
    } else {
      const { error } = await supabase.from('departments').insert(payload);

      if (error) {
        addToast('Erreur lors de la création du département', 'error');
      } else {
        addToast('Département créé avec succès', 'success');
        closeDeptForm();
        fetchDepartments();
      }
    }

    setDeptSaving(false);
  };

  const handleDeptDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce département ? Cette action est irréversible.')) {
      return;
    }

    const { error } = await supabase.from('departments').delete().eq('id', id);

    if (error) {
      addToast('Erreur lors de la suppression', 'error');
    } else {
      addToast('Département supprimé', 'success');
      fetchDepartments();
      if (selectedDeptId === id) {
        setSelectedDeptId('');
        setPositions([]);
        setMembers([]);
      }
    }
  };

  const toggleDeptActive = async (dept: Department) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !dept.is_active })
      .eq('id', dept.id);

    if (error) {
      addToast('Erreur lors du changement de statut', 'error');
    } else {
      addToast(
        dept.is_active ? 'Département désactivé' : 'Département activé',
        'success',
      );
      fetchDepartments();
    }
  };

  // =========================================================================
  // POSITIONS CRUD (inline)
  // =========================================================================

  const startAddPosition = () => {
    setEditingPosId(null);
    setPosForm(EMPTY_POS_FORM);
    setAddingPos(true);
  };

  const startEditPosition = (pos: Position) => {
    setEditingPosId(pos.id);
    setPosForm({
      name: pos.name,
      description: pos.description,
      is_active: pos.is_active,
      sort_order: pos.sort_order,
    });
    setAddingPos(false);
  };

  const cancelPosEdit = () => {
    setEditingPosId(null);
    setPosForm(EMPTY_POS_FORM);
    setAddingPos(false);
  };

  const handlePosField = <K extends keyof PositionFormData>(
    field: K,
    value: PositionFormData[K],
  ) => {
    setPosForm((prev) => ({ ...prev, [field]: value }));
  };

  const savePosition = async () => {
    if (!posForm.name.trim()) {
      addToast('Le nom du poste est obligatoire', 'error');
      return;
    }

    setPosSaving(true);

    if (editingPosId) {
      const { error } = await supabase
        .from('positions')
        .update({
          name: posForm.name.trim(),
          description: posForm.description.trim(),
          is_active: posForm.is_active,
          sort_order: posForm.sort_order,
        })
        .eq('id', editingPosId);

      if (error) {
        addToast('Erreur lors de la mise à jour du poste', 'error');
      } else {
        addToast('Poste mis à jour', 'success');
        cancelPosEdit();
        fetchPositionsAndMembers(selectedDeptId);
      }
    } else {
      const { error } = await supabase.from('positions').insert({
        department_id: selectedDeptId,
        name: posForm.name.trim(),
        description: posForm.description.trim(),
        is_active: posForm.is_active,
        sort_order: posForm.sort_order,
      });

      if (error) {
        addToast('Erreur lors de la création du poste', 'error');
      } else {
        addToast('Poste créé', 'success');
        cancelPosEdit();
        fetchPositionsAndMembers(selectedDeptId);
      }
    }

    setPosSaving(false);
  };

  const deletePosition = async (id: string) => {
    if (!window.confirm('Supprimer ce poste ?')) return;

    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) {
      addToast('Erreur lors de la suppression du poste', 'error');
    } else {
      addToast('Poste supprimé', 'success');
      fetchPositionsAndMembers(selectedDeptId);
    }
  };

  // =========================================================================
  // MEMBERS ACTIONS
  // =========================================================================

  const approveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('department_members')
      .update({ role_in_dept: 'member' })
      .eq('id', memberId);

    if (error) {
      addToast('Erreur lors de l\'approbation', 'error');
    } else {
      addToast('Membre approuvé', 'success');
      fetchPositionsAndMembers(selectedDeptId);
    }
  };

  const promoteToLeader = async (memberId: string) => {
    if (!window.confirm('Promouvoir ce membre au rang de leader ?')) return;

    const { error } = await supabase
      .from('department_members')
      .update({ role_in_dept: 'leader' })
      .eq('id', memberId);

    if (error) {
      addToast('Erreur lors de la promotion', 'error');
    } else {
      addToast('Membre promu en leader', 'success');
      fetchPositionsAndMembers(selectedDeptId);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm('Retirer ce membre du département ?')) return;

    const { error } = await supabase
      .from('department_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) {
      addToast('Erreur lors du retrait', 'error');
    } else {
      addToast('Membre retiré', 'success');
      fetchPositionsAndMembers(selectedDeptId);
    }
  };

  // =========================================================================
  // REQUESTS ACTIONS
  // =========================================================================

  const handleRequestAction = async (reqId: string, approve: boolean) => {
    setReqProcessing(reqId);
    try {
      const { data: req } = await supabase
        .from('department_requests')
        .select('user_id, department_id')
        .eq('id', reqId)
        .single();

      if (!req) throw new Error('Demande introuvable');

      // Récupérer nom du département et profil séparément
      const [deptRes, profileRes] = await Promise.all([
        supabase.from('departments').select('name').eq('id', req.department_id).single(),
        supabase.from('user_profiles').select('full_name').eq('id', req.user_id).single(),
      ]);
      const deptName = (deptRes.data as any)?.name || 'le département';
      const userName = (profileRes.data as any)?.full_name || 'Un membre';

      const { error } = await supabase.from('department_requests').update({
        status: approve ? 'accepte' : 'refuse',
        responded_by: (await supabase.auth.getUser()).data.user?.id,
        responded_at: new Date().toISOString(),
        response: responseText[reqId] || null,
      }).eq('id', reqId);

      if (error) throw error;

      if (approve) {
        // Add to department_members — triple stratégie pour garantir l'insertion
        const upsertRes = await supabase.from('department_members').upsert({
          user_id: req.user_id,
          department_id: req.department_id,
          role_in_dept: 'member',
          is_active: true,
        }, { onConflict: 'user_id,department_id' });

        if (upsertRes.error) {
          // Fallback: insert simple
          const insertRes = await supabase.from('department_members').insert({
            user_id: req.user_id,
            department_id: req.department_id,
            role_in_dept: 'member',
            is_active: true,
          });
          if (insertRes.error) {
            // Dernier recours: forcer is_active = true si la ligne existe déjà
            await supabase.from('department_members')
              .update({ is_active: true })
              .eq('user_id', req.user_id)
              .eq('department_id', req.department_id);
          }
        }

        // Notify user
        await supabase.from('notifications').insert({
          user_id: req.user_id,
          type: 'dept_approved',
          title: 'Demande de département acceptée',
          body: `Votre demande pour rejoindre "${deptName}" a été acceptée. Bienvenue !`,
          link: '#dashboard',
        });

        addToast(`${userName} ajouté au département.`, 'success');
      } else {
        await supabase.from('notifications').insert({
          user_id: req.user_id,
          type: 'dept_rejected',
          title: 'Demande de département refusée',
          body: `Votre demande pour rejoindre "${deptName}" n'a pas été acceptée.`,
          link: '#dashboard',
        });

        addToast('Demande refusée.', 'info');
      }

      // Also notify department leaders
      const { data: leaders } = await supabase
        .from('department_members')
        .select('user_id')
        .eq('department_id', req.department_id)
        .eq('role_in_dept', 'leader')
        .eq('is_active', true);

      if (leaders && leaders.length > 0) {
        const leaderNotifs = leaders
          .filter(l => l.user_id !== req.user_id)
          .map(l => ({
            user_id: l.user_id,
            type: 'dept_request_resolved',
            title: approve ? 'Nouveau membre accepté' : 'Demande refusée',
            body: approve
              ? `${userName} a été accepté dans votre département.`
              : `La demande de ${userName} a été refusée.`,
            link: '#admin/departments',
          }));
        if (leaderNotifs.length > 0) {
          await supabase.from('notifications').insert(leaderNotifs);
        }
      }

      setResponseText(prev => { const n = { ...prev }; delete n[reqId]; return n; });
      fetchDeptRequests();
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    } finally {
      setReqProcessing(null);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 w-fit">
        {([
          { key: 'departments' as SubTab, label: 'Départements' },
          { key: 'positions-members' as SubTab, label: 'Postes & Membres' },
          { key: 'requests' as SubTab, label: 'Demandes' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              subTab === tab.key
                ? 'bg-gold-400/20 text-gold-400'
                : 'text-muted hover:text-cream'
            }`}
          >
            {tab.label}
            {tab.key === 'requests' && deptRequests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5">
                {deptRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: Départements                                          */}
      {/* ================================================================= */}
      {subTab === 'departments' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              Départements
            </h2>
            <button onClick={openDeptCreate} className="btn-gold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un département
            </button>
          </div>

          {/* Form panel */}
          {deptFormOpen && (
            <div className="glass rounded-2xl p-6 space-y-5 border border-gold-400/20">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold text-cream">
                  {editingDeptId ? 'Modifier le département' : 'Nouveau département'}
                </h3>
                <button onClick={closeDeptForm} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Nom <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => handleDeptField('name', e.target.value)}
                    placeholder="Nom du département"
                    className="input-surface w-full px-4 py-2.5 text-sm"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={deptForm.slug}
                    onChange={(e) => handleDeptField('slug', e.target.value)}
                    placeholder="url-du-departement"
                    className="input-surface w-full px-4 py-2.5 text-sm"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Icône
                  </label>
                  <select
                    value={deptForm.icon_name}
                    onChange={(e) => handleDeptField('icon_name', e.target.value)}
                    className="input-surface w-full px-4 py-2.5 text-sm"
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort order */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={deptForm.sort_order}
                    onChange={(e) => handleDeptField('sort_order', parseInt(e.target.value, 10) || 0)}
                    className="input-surface w-full px-4 py-2.5 text-sm"
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    URL de l'image
                  </label>
                  <input
                    type="text"
                    value={deptForm.image_url}
                    onChange={(e) => handleDeptField('image_url', e.target.value)}
                    placeholder="https://... (optionnel)"
                    className="input-surface w-full px-4 py-2.5 text-sm"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={deptForm.description}
                    onChange={(e) => handleDeptField('description', e.target.value)}
                    placeholder="Décrivez ce département..."
                    className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                  />
                </div>

                {/* Meeting schedule */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Horaire des réunions
                  </label>
                  <textarea
                    rows={2}
                    value={deptForm.meeting_schedule}
                    onChange={(e) => handleDeptField('meeting_schedule', e.target.value)}
                    placeholder="ex: Tous les samedis à 15h"
                    className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                  />
                </div>

                {/* Mission */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Mission
                  </label>
                  <textarea
                    rows={2}
                    value={deptForm.mission}
                    onChange={(e) => handleDeptField('mission', e.target.value)}
                    placeholder="Mission du département..."
                    className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                  />
                </div>

                {/* Activities */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Activités
                  </label>
                  <textarea
                    rows={2}
                    value={deptForm.activities}
                    onChange={(e) => handleDeptField('activities', e.target.value)}
                    placeholder="Principales activités..."
                    className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                  />
                </div>

                {/* Requirements */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Conditions d'adhésion
                  </label>
                  <textarea
                    rows={2}
                    value={deptForm.requirements}
                    onChange={(e) => handleDeptField('requirements', e.target.value)}
                    placeholder="Conditions pour rejoindre..."
                    className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                  />
                </div>
              </div>

              {/* Accent color toggle */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Couleur d'accent
                </label>
                <div className="flex gap-2">
                  {(['gold', 'ember'] as const).map((color) => {
                    const isActive = deptForm.accent_color === color;
                    const baseClasses =
                      'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition';

                    if (isActive) {
                      return (
                        <button
                          key={color}
                          onClick={() => handleDeptField('accent_color', color)}
                          className={`${baseClasses} ${accentClasses(color)}`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${accentDotClasses(color)}`} />
                          {accentLabel(color)}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={color}
                        onClick={() => handleDeptField('accent_color', color)}
                        className={`${baseClasses} border-line text-muted hover:border-gold-400/40 hover:text-cream`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${accentDotClasses(color)} opacity-40`} />
                        {accentLabel(color)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deptForm.is_active}
                  onChange={(e) => handleDeptField('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-gold-400"
                />
                <span className="text-sm text-cream/80">Département actif</span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={closeDeptForm} className="btn-ghost flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Annuler
                </button>
                <button
                  onClick={handleDeptSave}
                  disabled={deptSaving}
                  className="btn-gold flex items-center gap-2 disabled:opacity-50"
                >
                  {deptSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingDeptId ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          )}

          {/* Department list */}
          {deptLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-muted text-sm">Aucun département pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="glass rounded-2xl p-5 group relative"
                >
                  {/* Top row: icon + name + actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${accentClasses(dept.accent_color)}`}>
                        <Users className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-serif text-base font-semibold text-cream truncate">
                            {dept.name}
                          </h4>
                          {dept.is_active ? (
                            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                              Actif
                            </span>
                          ) : (
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                              Inactif
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-muted">
                            <span className="text-cream/60">{dept.member_count}</span> membre{dept.member_count !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[11px] text-cream/30">·</span>
                          <span className="text-[11px] text-muted">Icône: <span className="text-cream/60">{dept.icon_name}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleDeptActive(dept)}
                        title={dept.is_active ? 'Désactiver' : 'Activer'}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                      >
                        <Star className={`h-4 w-4 ${dept.is_active ? 'fill-gold-400 text-gold-400' : ''}`} />
                      </button>
                      <button
                        onClick={() => openDeptEdit(dept)}
                        title="Modifier"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeptDelete(dept.id)}
                        title="Supprimer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Meeting schedule */}
                  {dept.meeting_schedule && (
                    <p className="mt-2 text-xs text-cream/50 pl-[52px]">
                      {dept.meeting_schedule}
                    </p>
                  )}

                  {/* Description */}
                  {dept.description && (
                    <p className="mt-1 text-xs text-muted line-clamp-2 pl-[52px]">
                      {dept.description}
                    </p>
                  )}

                  {/* Footer: sort order + accent color */}
                  <div className="mt-3 flex items-center gap-3 pl-[52px]">
                    <span className="text-[10px] text-muted">
                      Ordre: <span className="text-cream/60">{dept.sort_order}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${accentClasses(dept.accent_color)}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${accentDotClasses(dept.accent_color)}`} />
                      {accentLabel(dept.accent_color)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: Postes & Membres                                      */}
      {/* ================================================================= */}
      {subTab === 'positions-members' && (
        <>
          {/* Header + department selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              Postes & Membres
            </h2>
            <div className="w-full sm:w-auto">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Sélectionner un département
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  cancelPosEdit();
                }}
                className="input-surface w-full sm:w-64 px-4 py-2.5 text-sm"
              >
                <option value="">— Choisir —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedDeptId ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted/40 mb-3" />
              <p className="text-muted text-sm">Sélectionnez un département pour gérer ses postes et membres.</p>
            </div>
          ) : pmLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              {/* Department info banner */}
              {selectedDept && (
                <div className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${accentClasses(selectedDept.accent_color)}`}>
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg font-semibold text-cream">
                      {selectedDept.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                      <span>
                        <span className="text-cream/60">{members.length}</span> membre{members.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-cream/30">·</span>
                      <span>
                        <span className="text-cream/60">{positions.length}</span> poste{positions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ─── LEFT PANEL: Positions ─── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-semibold text-cream">
                      Postes
                    </h3>
                    {!addingPos && !editingPosId && (
                      <button
                        onClick={startAddPosition}
                        className="btn-gold flex items-center gap-2 text-sm py-2 px-3"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter
                      </button>
                    )}
                  </div>

                  {/* Add / Edit position form (inline) */}
                  {(addingPos || editingPosId) && (
                    <div className="glass rounded-2xl p-5 space-y-4 border border-gold-400/20">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-cream">
                          {editingPosId ? 'Modifier le poste' : 'Nouveau poste'}
                        </h4>
                        <button
                          onClick={cancelPosEdit}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:text-cream transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">
                          Nom <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={posForm.name}
                          onChange={(e) => handlePosField('name', e.target.value)}
                          placeholder="Nom du poste"
                          className="input-surface w-full px-4 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={posForm.description}
                          onChange={(e) => handlePosField('description', e.target.value)}
                          placeholder="Description du poste..."
                          className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted">
                            Ordre
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={posForm.sort_order}
                            onChange={(e) => handlePosField('sort_order', parseInt(e.target.value, 10) || 0)}
                            className="input-surface w-24 px-4 py-2.5 text-sm"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-5">
                          <input
                            type="checkbox"
                            checked={posForm.is_active}
                            onChange={(e) => handlePosField('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-line accent-gold-400"
                          />
                          <span className="text-sm text-cream/80">Actif</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-1">
                        <button onClick={cancelPosEdit} className="btn-ghost text-sm py-2 px-3">
                          Annuler
                        </button>
                        <button
                          onClick={savePosition}
                          disabled={posSaving}
                          className="btn-gold flex items-center gap-2 text-sm py-2 px-3 disabled:opacity-50"
                        >
                          {posSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          {editingPosId ? 'Mettre à jour' : 'Créer'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Positions list */}
                  {positions.length === 0 && !addingPos ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <p className="text-muted text-sm">Aucun poste défini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {positions.map((pos) => (
                        <div
                          key={pos.id}
                          className="glass rounded-xl p-4 group relative flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-cream">
                                {pos.name}
                              </h4>
                              {pos.is_active ? (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                                  Actif
                                </span>
                              ) : (
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                                  Inactif
                                </span>
                              )}
                            </div>
                            {pos.description && (
                              <p className="mt-1 text-xs text-muted line-clamp-2">
                                {pos.description}
                              </p>
                            )}
                            <span className="mt-1 block text-[10px] text-muted">
                              Ordre: <span className="text-cream/60">{pos.sort_order}</span>
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditPosition(pos)}
                              title="Modifier"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-gold-400/40 hover:text-gold-400 transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deletePosition(pos.id)}
                              title="Supprimer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── RIGHT PANEL: Members ─── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-semibold text-cream">
                      Membres
                    </h3>
                    <span className="text-sm text-muted">
                      {members.length} membre{members.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {members.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                      <p className="text-muted text-sm">Aucun membre dans ce département.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((mem) => (
                        <div
                          key={mem.id}
                          className="glass rounded-xl p-4 group relative"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-cream">
                                  {mem.full_name || 'Utilisateur inconnu'}
                                </h4>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${roleBadgeClasses(mem.role_in_dept)}`}
                                >
                                  {roleLabel(mem.role_in_dept)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                                {mem.position_id && (
                                  <span>
                                    Poste: <span className="text-cream/60">{positions.find((p) => p.id === mem.position_id)?.name ?? '—'}</span>
                                  </span>
                                )}
                                <span>
                                  Rejoint: <span className="text-cream/60">{formatDate(mem.joined_at)}</span>
                                </span>
                              </div>
                            </div>

                            {/* Member actions */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {mem.role_in_dept === 'pending' && (
                                <button
                                  onClick={() => approveMember(mem.id)}
                                  title="Approuver"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-emerald-400/40 hover:text-emerald-400 transition"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {mem.role_in_dept !== 'leader' && (
                                <button
                                  onClick={() => promoteToLeader(mem.id)}
                                  title="Promouvoir en leader"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-purple-400/40 hover:text-purple-400 transition"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {mem.role_in_dept === 'member' && (
                                <button
                                  onClick={() => approveMember(mem.id)}
                                  title="Confirmer"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-blue-400/40 hover:text-blue-400 transition"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {mem.role_in_dept === 'leader' && (
                                <button
                                  onClick={() => approveMember(mem.id)}
                                  title="Rétrograder en membre"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-blue-400/40 hover:text-blue-400 transition"
                                >
                                  <Shield className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => removeMember(mem.id)}
                                title="Retirer"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: Demandes d'assignation                                */}
      {/* ================================================================= */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">Demandes d'assignation</h3>
            <button onClick={fetchDeptRequests} className="text-xs text-muted hover:text-gold-400 transition flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Actualiser
            </button>
          </div>

          {reqLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="glass rounded-xl p-4 h-24 bg-white/3" />)}
            </div>
          ) : deptRequests.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center">
              <Inbox className="mx-auto h-10 w-10 text-muted/30 mb-3" />
              <p className="text-muted text-sm">Aucune demande en attente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deptRequests.map(req => (
                <div key={req.id} className="glass rounded-xl p-4 border border-amber-500/10 hover:border-amber-500/20 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* User info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-serif text-sm font-bold shrink-0">
                        {(req.user_profiles?.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cream">{req.user_profiles?.full_name || 'Inconnu'}</p>
                        <p className="text-xs text-muted">{req.user_profiles?.email}</p>
                        <p className="text-xs text-gold-400/80 mt-0.5">
                          Département : <span className="font-medium">{req.departments?.name || '—'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Date + message */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" /> {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {req.message && (
                        <p className="text-xs text-muted/70 mt-1 italic">"{req.message}"</p>
                      )}
                    </div>
                  </div>

                  {/* Response textarea + actions */}
                  <div className="mt-3 pt-3 border-t border-line/50">
                    <textarea
                      value={responseText[req.id] || ''}
                      onChange={e => setResponseText(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Réponse optionnelle au demandeur..."
                      rows={2}
                      className="input-surface w-full px-3 py-2 text-xs resize-none mb-3"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRequestAction(req.id, false)}
                        disabled={reqProcessing === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {reqProcessing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Refuser
                      </button>
                      <button
                        onClick={() => handleRequestAction(req.id, true)}
                        disabled={reqProcessing === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        {reqProcessing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                        Accepter
                      </button>
                    </div>
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