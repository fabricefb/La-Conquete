import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Shield, Ban, ShieldCheck, Search, Loader2, Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Building2, Clock, UserPlus, Mail, Phone, Calendar, Activity, AlertCircle, RefreshCw, Eye, X, XCircle, CheckCircle, Crown, UserCog, Heart, MapPin } from 'lucide-react';
import { ROLE_LABELS, PASTOR_CATEGORY_LABELS, ROLE_LEVELS } from '../../../types';

/* ── Pending requests counter for member detail ────────────── */
function UserPendingCounts({ userId }: { userId: string }) {
  const [counts, setCounts] = useState({ prayers: 0, visits: 0, deptReqs: 0, contactMsgs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [prayers, visits, deptReqs, contactMsgs] = await Promise.all([
          supabase.from('prayer_requests').select('id', { count: 'exact', head: true })
            .eq('user_id', userId).neq('status', 'answered'),
          supabase.from('visit_requests').select('id', { count: 'exact', head: true })
            .eq('user_id', userId).eq('status', 'en_attente'),
          supabase.from('department_requests').select('id', { count: 'exact', head: true })
            .eq('user_id', userId).eq('status', 'en_attente'),
          supabase.from('contact_messages').select('id', { count: 'exact', head: true })
            .eq('phone', '').limit(0), // fallback — we count by phone later
        ]);
        if (!cancelled) {
          setCounts({
            prayers: prayers.count ?? 0,
            visits: visits.count ?? 0,
            deptReqs: deptReqs.count ?? 0,
            contactMsgs: 0,
          });
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const total = counts.prayers + counts.visits + counts.deptReqs;

  if (loading) return <div className="animate-pulse h-6 rounded bg-white/3 mt-2" />;
  if (total === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {counts.prayers > 0 && (
        <div className="rounded-lg bg-rose-500/10 p-2.5 text-center">
          <Heart className="h-3.5 w-3.5 text-rose-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-rose-300">{counts.prayers}</p>
          <p className="text-[9px] text-rose-300/70">Prière{counts.prayers > 1 ? 's' : ''}</p>
        </div>
      )}
      {counts.visits > 0 && (
        <div className="rounded-lg bg-amber-500/10 p-2.5 text-center">
          <MapPin className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-amber-300">{counts.visits}</p>
          <p className="text-[9px] text-amber-300/70">Visite{counts.visits > 1 ? 's' : ''}</p>
        </div>
      )}
      {counts.deptReqs > 0 && (
        <div className="rounded-lg bg-blue-500/10 p-2.5 text-center">
          <UserPlus className="h-3.5 w-3.5 text-blue-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-blue-300">{counts.deptReqs}</p>
          <p className="text-[9px] text-blue-300/70">Département</p>
        </div>
      )}
    </div>
  );
}

interface UserProfileExt {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  role_level: number;
  pastor_category: string | null;
  is_principal_pastor: boolean;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  last_seen_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

interface UserDetail {
  departments: { department_id: string; department_name: string; role_in_dept: string; position_name?: string; joined_at: string }[];
  recentActivity: { id: string; type: string; title: string; created_at: string; is_read: boolean }[];
  roleRequests: { id: string; requested_role: string; status: string; created_at: string; reason?: string }[];
  deptRequests: { id: string; department_name: string; status: string; created_at: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  true: 'bg-red-500/20 text-red-400',
  false: 'bg-green-500/20 text-green-400',
};

function RoleRequestSection() {
  const { addToast } = useToast();
  const { profile: adminProfile, isFullAdmin } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from('role_requests')
      .select('id, user_id, requested_role, reason, status, created_at, user_profiles!inner(full_name, email, role_level)')
      .eq('status', 'en_attente')
      .order('created_at', { ascending: true });
    setRequests((data || []) as any[]);
    setLoading(false);
  }

  async function handleAction(id: string, approve: boolean) {
    setProcessing(id);
    try {
      const { error } = await supabase.from('role_requests').update({
        status: approve ? 'approuve' : 'refuse',
        reviewed_by: adminProfile?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      if (approve) {
        const { data: req } = await supabase.from('role_requests').select('user_id, requested_role').eq('id', id).single();
        if (req) {
          const roleMap: Record<string, number> = { ancien: 4, diacre: 4, collaborateur: 4, assistant_pastor: 4, pastor_assoc: 4 };
          const catMap: Record<string, string> = { ancien: 'ancien', diacre: 'diacre', collaborateur: 'collaborateur', assistant_pastor: 'assistant_pastor', pastor_assoc: 'assistant_pastor' };
          const newLevel = roleMap[req.requested_role] || 3;
          await supabase.from('user_profiles').update({
            role_level: newLevel,
            pastor_category: catMap[req.requested_role] || null,
          }).eq('id', req.user_id);

          await supabase.from('notifications').insert({
            user_id: req.user_id,
            type: 'role_approved',
            title: 'Rôle pastoral approuvé',
            body: `Votre demande de rôle "${req.requested_role}" a été approuvée.`,
            link: '#dashboard',
          });
        }
        addToast('Demande approuvée et rôle assigné.', 'success');
      } else {
        const { data: req } = await supabase.from('role_requests').select('user_id, requested_role').eq('id', id).single();
        if (req) {
          await supabase.from('notifications').insert({
            user_id: req.user_id,
            type: 'role_rejected',
            title: 'Demande de rôle refusée',
            body: `Votre demande de rôle "${req.requested_role}" n'a pas pu être acceptée.`,
            link: '#dashboard',
          });
        }
        addToast('Demande refusée.', 'info');
      }

      loadRequests();
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  }

  if (loading) return <div className="animate-pulse h-20 bg-white/5 rounded-xl mb-6" />;
  if (requests.length === 0) return null;

  const roleLabels: Record<string, string> = { ancien: 'Ancien', diacre: 'Diacre', collaborateur: 'Collaborateur', assistant_pastor: 'Assistant pasteur', pastor_assoc: 'Pasteur associé' };

  return (
    <div className="glass rounded-xl p-5 mb-6 border-amber-500/20">
      <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Demandes de rôle pastoral ({requests.length})
      </h3>
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-white/3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cream">{req.user_profiles?.full_name || 'Inconnu'}</p>
              <p className="text-xs text-muted">{req.user_profiles?.email} · {roleLabels[req.requested_role] || req.requested_role}</p>
              {req.reason && <p className="text-xs text-muted/70 mt-1 line-clamp-2">{req.reason}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isFullAdmin && (
                <>
                  <button onClick={() => handleAction(req.id, true)} disabled={processing === req.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50">
                    {processing === req.id ? '...' : 'Approuver'}
                  </button>
                  <button onClick={() => handleAction(req.id, false)} disabled={processing === req.id} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50">
                    Refuser
                  </button>
                </>
              )}
              {!isFullAdmin && (
                <span className="text-[10px] text-muted italic">Lecture seule</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersTab() {
  const { addToast } = useToast();
  const { profile: adminProfile, isFullAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfileExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [blockModal, setBlockModal] = useState<{ userId: string; userName: string; isBlocked: boolean } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleModal, setRoleModal] = useState<{ userId: string; userName: string; currentLevel: number; currentCategory: string | null; isAdmin: boolean; isPrincipal: boolean } | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail>({ departments: [], recentActivity: [], roleRequests: [], deptRequests: [] });
  const [detailLoading, setDetailLoading] = useState(false);
  const [deptReqProcessing, setDeptReqProcessing] = useState<string | null>(null);

  // ── Approuver/Refuser une demande de département depuis le panneau détail ──
  const handleDeptRequestAction = async (reqId: string, deptName: string, approve: boolean) => {
    if (!selectedUserId) return;
    setDeptReqProcessing(reqId);
    try {
      const { error } = await supabase.from('department_requests').update({
        status: approve ? 'accepte' : 'refuse',
        responded_by: adminProfile?.id,
        responded_at: new Date().toISOString(),
      }).eq('id', reqId);
      if (error) throw error;

      if (approve) {
        // Récupérer le department_id AVANT l'update (qui change le statut)
        const { data: reqData } = await supabase.from('department_requests').select('department_id').eq('id', reqId).single();
        const deptId = reqData?.department_id;
        if (deptId) {
          await supabase.from('department_members').upsert({
            user_id: selectedUserId,
            department_id: deptId,
            role_in_dept: 'member',
            is_active: true,
          }, { onConflict: 'user_id,department_id' });
        }

        await supabase.from('notifications').insert({
          user_id: selectedUserId,
          type: 'dept_approved',
          title: 'Demande de département acceptée',
          body: `Votre demande pour rejoindre "${deptName}" a été acceptée. Bienvenue !`,
          link: '#dashboard',
        });
        addToast(`Membre ajouté au département "${deptName}".`, 'success');
      } else {
        await supabase.from('notifications').insert({
          user_id: selectedUserId,
          type: 'dept_rejected',
          title: 'Demande de département refusée',
          body: `Votre demande pour rejoindre "${deptName}" n'a pas été acceptée.`,
          link: '#dashboard',
        });
        addToast('Demande refusée.', 'info');
      }

      // Rafraîchir le panneau détail
      fetchUserDetail(selectedUserId);
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    } finally {
      setDeptReqProcessing(null);
    }
  };

  const fetchUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    setSelectedUserId(userId);
    try {
      const [deptRes, actRes, roleReqRes, deptReqRes] = await Promise.all([
        supabase
          .from('department_members')
          .select('department_id, role_in_dept, position_id, joined_at, departments(name), positions(name)')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('notifications')
          .select('id, type, title, created_at, is_read')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('role_requests')
          .select('id, requested_role, status, created_at, reason')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('department_requests')
          .select('id, status, created_at, departments(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const depts = (deptRes.data || []).map((d: any) => ({
        department_id: d.department_id,
        department_name: d.departments?.name || 'Inconnu',
        role_in_dept: d.role_in_dept,
        position_name: d.positions?.name || null,
        joined_at: d.joined_at,
      }));

      const activity = (actRes.data || []).map((a: any) => ({
        id: a.id,
        type: a.type || 'info',
        title: a.title,
        created_at: a.created_at,
        is_read: a.is_read,
      }));

      const roleReqs = (roleReqRes.data || []).map((r: any) => ({
        id: r.id,
        requested_role: r.requested_role,
        status: r.status,
        created_at: r.created_at,
        reason: r.reason,
      }));

      const deptReqs = (deptReqRes.data || []).map((r: any) => ({
        id: r.id,
        department_name: r.departments?.name || 'Inconnu',
        status: r.status,
        created_at: r.created_at,
      }));

      setUserDetail({ departments: depts, recentActivity: activity, roleRequests: roleReqs, deptRequests: deptReqs });
    } catch {
      // Silent fail — detail panel just stays empty
    }
    setDetailLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        addToast('Erreur lors du chargement des utilisateurs', 'error');
        return;
      }

      // Try to detect "online" users by checking recent last_seen_at (within 5 min)
      const now = new Date();
      const enriched = (data as any[]).map(u => ({
        ...u,
        is_online: u.last_seen_at && (now.getTime() - new Date(u.last_seen_at).getTime()) < 5 * 60 * 1000,
      }));

      setUsers(enriched);
    } catch {
      addToast('Erreur de connexion', 'error');
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Filter
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' ||
      (filterRole === 'admin' && u.is_admin) ||
      (filterRole === 'blocked' && u.is_blocked) ||
      (filterRole === 'online' && (u as any).is_online);
    return matchSearch && matchRole;
  });

  const toggleBlock = async () => {
    if (!blockModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_blocked: !blockModal.isBlocked,
          blocked_at: !blockModal.isBlocked ? new Date().toISOString() : null,
          blocked_reason: !blockModal.isBlocked ? blockReason || 'Blocage administratif' : null,
        })
        .eq('id', blockModal.userId);

      if (error) throw error;
      addToast(
        blockModal.isBlocked ? `${blockModal.userName} débloqué` : `${blockModal.userName} bloqué`,
        'success'
      );
      setBlockModal(null);
      setBlockReason('');
      fetchUsers();
    } catch {
      addToast('Erreur lors du changement de statut', 'error');
    }
    setSaving(false);
  };

  const assignRole = async (roleLevel: number, pastorCat: string | null, makeAdmin: boolean, makePrincipal: boolean) => {
    if (!roleModal) return;
    setRoleSaving(true);
    try {
      const updates: any = { role_level: roleLevel, pastor_category: pastorCat };
      if (makeAdmin) {
        updates.is_admin = true;
        updates.is_principal_pastor = makePrincipal;
      } else if (roleLevel >= ROLE_LEVELS.PASTOR_PRINCIPAL) {
        updates.is_admin = true;
        updates.is_principal_pastor = makePrincipal;
      } else {
        updates.is_admin = false;
        updates.is_principal_pastor = false;
      }

      const { error } = await supabase.from('user_profiles').update(updates).eq('id', roleModal.userId);
      if (error) throw error;

      const roleNames: Record<string, string> = {
        '0': 'Visiteur', '1': 'Membre', '3': 'Chef de département',
        '4_ancien': 'Ancien', '4_diacre': 'Diacre', '4_collaborateur': 'Collaborateur',
        '5': 'Pasteur associé', '5_principal': 'Pasteur principal', '6': 'Admin',
      };
      const key = pastorCat ? `4_${pastorCat}` : makePrincipal && roleLevel >= 5 ? '5_principal' : String(roleLevel);
      addToast(`${roleModal.userName} → ${roleNames[key] || 'Rôle mis à jour'}`, 'success');

      // Notifier l'utilisateur
      await supabase.from('notifications').insert({
        user_id: roleModal.userId,
        type: 'role_changed',
        title: 'Votre rôle a été mis à jour',
        body: `Vous êtes maintenant ${roleNames[key] || 'un membre avec un nouveau rôle'}.`,
        link: '#dashboard',
      });

      setRoleModal(null);
      fetchUsers();
      if (selectedUserId === roleModal.userId) fetchUserDetail(selectedUserId);
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    }
    setRoleSaving(false);
  };

  const getRoleBadge = (u: UserProfileExt) => {
    if (u.is_blocked) return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">Bloqué</span>;
    if (u.is_admin) return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">Admin</span>;
    if (u.is_principal_pastor) return <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-300">Pasteur Principal</span>;
    if (u.pastor_category) return <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">{PASTOR_CATEGORY_LABELS[u.pastor_category as keyof typeof PASTOR_CATEGORY_LABELS] || u.pastor_category}</span>;
    return <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-300">{ROLE_LABELS[u.role_level] || 'Membre'}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Pending Role Requests */}
      <RoleRequestSection />

      <div>
        <h2 className="font-serif text-2xl font-semibold text-cream">Utilisateurs</h2>
        <p className="text-sm text-muted mt-1">
          {users.filter((u: any) => u.is_online).length} en ligne &middot; {users.length} total
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="input-surface w-full pl-9 pr-4 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'online', label: 'En ligne' },
            { value: 'admin', label: 'Admins' },
            { value: 'blocked', label: 'Bloqués' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterRole(f.value)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                filterRole === f.value
                  ? 'bg-gold-400/20 text-gold-400'
                  : 'bg-white/5 text-muted hover:text-cream'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted/30 mb-4" />
          <p className="text-muted">Aucun utilisateur trouvé.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} onClick={() => selectedUserId === u.id ? setSelectedUserId(null) : fetchUserDetail(u.id)} className={`glass rounded-xl p-4 flex items-center gap-4 transition cursor-pointer ${u.is_blocked ? 'opacity-60' : ''} ${selectedUserId === u.id ? 'ring-1 ring-gold-400/30' : ''}`}>
              {/* Online indicator + avatar */}
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/20 text-gold-400 font-serif text-sm font-bold">
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </div>
                {(u as any).is_online && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-bg" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-cream truncate">
                    {u.full_name || 'Sans nom'}
                  </span>
                  {getRoleBadge(u)}
                </div>
                <p className="text-xs text-muted truncate">{u.email}</p>
                {u.phone && <p className="text-xs text-muted/60">{u.phone}</p>}
              </div>

              {/* Meta */}
              <div className="hidden md:flex items-center gap-4 text-xs text-muted shrink-0">
                <span>{new Date(u.created_at).toLocaleDateString('fr-FR')}</span>
                {u.last_seen_at && (
                  <span className="text-gold-400/70" title="Dernière connexion">
                    Dernière: {new Date(u.last_seen_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                {u.is_blocked && u.blocked_reason && (
                  <span className="text-red-400 truncate max-w-[150px]" title={u.blocked_reason}>
                    {u.blocked_reason}
                  </span>
                )}
              </div>

              {/* Eye/Chevron detail button */}
              <button
                onClick={(e) => { e.stopPropagation(); selectedUserId === u.id ? setSelectedUserId(null) : fetchUserDetail(u.id); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-gold-400 hover:border-gold-400/30 transition shrink-0"
                title="Voir les détails"
              >
                {selectedUserId === u.id ? <ChevronDown className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>

              {/* Role assignment button — Admin complet uniquement */}
              {isFullAdmin && u.id !== adminProfile?.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setRoleModal({ userId: u.id, userName: u.full_name || u.email, currentLevel: u.role_level, currentCategory: u.pastor_category, isAdmin: u.is_admin, isPrincipal: u.is_principal_pastor }); }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition shrink-0"
                  title="Assigner un rôle"
                >
                  <Crown className="h-4 w-4" />
                </button>
              )}

              {/* Block/Unblock button — Admin complet uniquement */}
              {isFullAdmin && u.id !== adminProfile?.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setBlockModal({ userId: u.id, userName: u.full_name || u.email, isBlocked: u.is_blocked }); }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition shrink-0 ${
                    u.is_blocked
                      ? 'border-green-500/40 text-green-400 hover:bg-green-500/10'
                      : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                  }`}
                  title={u.is_blocked ? 'Débloquer' : 'Bloquer'}
                >
                  {u.is_blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User Detail Panel */}
      {selectedUserId && (
        <div className="glass rounded-2xl p-6 space-y-6 border border-gold-400/10 animate-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream flex items-center gap-2">
              <Activity className="h-5 w-5 text-gold-400" />
              Détails du membre
            </h3>
            <button onClick={() => setSelectedUserId(null)} className="text-muted hover:text-cream transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          {detailLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white/3" />)}
            </div>
          ) : (
            <>
              {/* Status Summary */}
              {(() => {
                const u = users.find(u => u.id === selectedUserId);
                if (!u) return null;
                return (
                  <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-white/3 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Statut</p>
                      <p className={`text-sm font-semibold ${u.is_blocked ? 'text-red-400' : 'text-emerald-400'}`}>
                        {u.is_blocked ? 'Bloqué' : 'Actif'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/3 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Onboarding</p>
                      <p className={`text-sm font-semibold ${u.onboarding_completed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {u.onboarding_completed ? 'Complété' : 'En cours'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/3 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Départements</p>
                      <p className="text-sm font-semibold text-cream">{userDetail.departments.length}</p>
                    </div>
                    <div className="rounded-xl bg-white/3 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Inscrit le</p>
                      <p className="text-xs font-medium text-cream">{new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  {/* Pending requests summary */}
                  <UserPendingCounts userId={selectedUserId} />
                  </>
                );
              })()}

              {/* Department Memberships */}
              <div>
                <h4 className="text-sm font-semibold text-cream mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gold-400" />
                  Départements ({userDetail.departments.length})
                </h4>
                {userDetail.departments.length === 0 ? (
                  <p className="text-xs text-muted">Aucun département assigné.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userDetail.departments.map((d, i) => (
                      <div key={i} className="rounded-lg bg-white/3 p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gold-400/20 flex items-center justify-center text-gold-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-cream truncate">{d.department_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted">
                            <span className={`rounded-full px-1.5 py-0.5 ${
                              d.role_in_dept === 'leader' ? 'bg-purple-500/20 text-purple-300' :
                              d.role_in_dept === 'member' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {d.role_in_dept === 'leader' ? 'Leader' : d.role_in_dept === 'member' ? 'Membre' : 'En attente'}
                            </span>
                            {d.position_name && <span>· {d.position_name}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted/60 shrink-0">
                          {new Date(d.joined_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Role Requests History */}
              {userDetail.roleRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-cream mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-400" />
                    Demandes de rôle pastoral ({userDetail.roleRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {userDetail.roleRequests.map(r => (
                      <div key={r.id} className="rounded-lg bg-white/3 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-cream">{r.requested_role}</p>
                          <p className="text-[10px] text-muted">
                            {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.status === 'approuve' ? 'bg-emerald-500/20 text-emerald-400' :
                          r.status === 'refuse' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {r.status === 'approuve' ? 'Approuvé' : r.status === 'refuse' ? 'Refusé' : 'En attente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Department Requests — avec boutons Accepter/Refuser */}
              {userDetail.deptRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-cream mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-400" />
                    Demandes de département ({userDetail.deptRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {userDetail.deptRequests.map(r => (
                      <div key={r.id} className={`rounded-lg bg-white/3 p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${r.status === 'en_attente' ? 'border border-amber-500/20' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-cream">{r.department_name}</p>
                          <p className="text-[10px] text-muted">
                            {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.status === 'en_attente' ? (
                            <>
                              <button
                                onClick={() => handleDeptRequestAction(r.id, r.department_name, false)}
                                disabled={deptReqProcessing === r.id}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                              >
                                {deptReqProcessing === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Refuser
                              </button>
                              <button
                                onClick={() => handleDeptRequestAction(r.id, r.department_name, true)}
                                disabled={deptReqProcessing === r.id}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                              >
                                {deptReqProcessing === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Accepter
                              </button>
                            </>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              r.status === 'accepte' ? 'bg-emerald-500/20 text-emerald-400' :
                              r.status === 'refuse' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {r.status === 'accepte' ? 'Accepté' : r.status === 'refuse' ? 'Refusé' : r.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity / Notifications */}
              <div>
                <h4 className="text-sm font-semibold text-cream mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Activité récente ({userDetail.recentActivity.length})
                </h4>
                {userDetail.recentActivity.length === 0 ? (
                  <p className="text-xs text-muted">Aucune activité récente.</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {userDetail.recentActivity.map(a => (
                      <div key={a.id} className="rounded-lg bg-white/3 px-3 py-2 flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${a.is_read ? 'bg-muted/30' : 'bg-gold-400'}`} />
                        <p className="text-xs text-cream/80 flex-1 truncate">{a.title}</p>
                        <span className="text-[10px] text-muted shrink-0">
                          {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Role Assignment Modal */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRoleModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-line max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                <Crown className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-cream">Assigner un rôle</h3>
                <p className="text-sm text-muted">{roleModal.userName}</p>
              </div>
            </div>

            <p className="text-xs text-muted">Rôle actuel : <span className="text-cream font-medium">{ROLE_LABELS[roleModal.currentLevel] || 'Membre'}{roleModal.currentCategory ? ` · ${PASTOR_CATEGORY_LABELS[roleModal.currentCategory as keyof typeof PASTOR_CATEGORY_LABELS] || roleModal.currentCategory}` : ''}</span></p>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cream/70 uppercase tracking-wider mb-2">Rôles disponibles</p>

              {/* Membre */}
              <button onClick={() => assignRole(1, null, false, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-blue-500/40 hover:bg-blue-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center"><Users className="h-4 w-4 text-blue-300" /></div>
                <div><p className="text-sm font-medium text-cream">Membre</p><p className="text-[10px] text-muted">Accès de base au dashboard</p></div>
              </button>

              {/* Chef de département */}
              <button onClick={() => assignRole(3, null, false, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-purple-500/40 hover:bg-purple-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center"><UserCog className="h-4 w-4 text-purple-300" /></div>
                <div><p className="text-sm font-medium text-cream">Chef de département</p><p className="text-[10px] text-muted">Gère un département et ses membres</p></div>
              </button>

              {/* Ancien */}
              <button onClick={() => assignRole(4, 'ancien', false, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-amber-500/40 hover:bg-amber-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Shield className="h-4 w-4 text-amber-300" /></div>
                <div><p className="text-sm font-medium text-cream">Ancien</p><p className="text-[10px] text-muted">Conseiller spirituel, accès pastoral</p></div>
              </button>

              {/* Diacre */}
              <button onClick={() => assignRole(4, 'diacre', false, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-amber-500/40 hover:bg-amber-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Shield className="h-4 w-4 text-amber-300" /></div>
                <div><p className="text-sm font-medium text-cream">Diacre</p><p className="text-[10px] text-muted">Service d'assistance et diaconie</p></div>
              </button>

              {/* Collaborateur */}
              <button onClick={() => assignRole(4, 'collaborateur', false, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-amber-500/40 hover:bg-amber-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Shield className="h-4 w-4 text-amber-300" /></div>
                <div><p className="text-sm font-medium text-cream">Collaborateur</p><p className="text-[10px] text-muted">Collabore avec la direction pastorale</p></div>
              </button>

              {/* Pasteur associé */}
              <button onClick={() => assignRole(4, 'assistant_pastor', false, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-yellow-500/40 hover:bg-yellow-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center"><Crown className="h-4 w-4 text-yellow-300" /></div>
                <div><p className="text-sm font-medium text-cream">Pasteur associé</p><p className="text-[10px] text-muted">Direction spirituelle complète + fonctions pastorales</p></div>
              </button>

              {/* Pasteur principal */}
              <button onClick={() => assignRole(5, null, true, true)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-line hover:border-yellow-500/40 hover:bg-yellow-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center"><Crown className="h-4 w-4 text-yellow-200" /></div>
                <div><p className="text-sm font-medium text-cream">Pasteur principal</p><p className="text-[10px] text-muted">Voir les statistiques et rapports. Pas les ajouts, suppressions ni assignations de rôles</p></div>
              </button>

              {/* Admin */}
              <button onClick={() => assignRole(6, null, true, false)} disabled={roleSaving}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 transition flex items-center gap-3 disabled:opacity-50">
                <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-red-300" /></div>
                <div><p className="text-sm font-medium text-cream">Admin</p><p className="text-[10px] text-muted">Accès total : design, ajouts, suppressions, assignations de tous les rôles</p></div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setRoleModal(null)} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBlockModal(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-line">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${blockModal.isBlocked ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {blockModal.isBlocked ? <ShieldCheck className="h-5 w-5 text-green-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-cream">
                  {blockModal.isBlocked ? 'Débloquer' : 'Bloquer'} l'utilisateur
                </h3>
                <p className="text-sm text-muted">{blockModal.userName}</p>
              </div>
            </div>

            {!blockModal.isBlocked && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Raison du blocage</label>
                <textarea
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  rows={3}
                  placeholder="Expliquez pourquoi cet utilisateur est bloqué..."
                  className="input-surface w-full px-4 py-2.5 text-sm resize-none"
                />
              </div>
            )}

            {blockModal.isBlocked && (
              <p className="text-sm text-cream/70">
                Cet utilisateur pourra à nouveau se connecter et utiliser toutes les fonctionnalités.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setBlockModal(null)} className="btn-ghost px-4 py-2 text-sm">
                Annuler
              </button>
              <button
                onClick={toggleBlock}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-50 ${
                  blockModal.isBlocked
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {blockModal.isBlocked ? 'Débloquer' : 'Confirmer le blocage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}