import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Shield, Ban, ShieldCheck, Search, Loader2, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ROLE_LABELS, PASTOR_CATEGORY_LABELS } from '../../../types';

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

const STATUS_COLORS: Record<string, string> = {
  true: 'bg-red-500/20 text-red-400',
  false: 'bg-green-500/20 text-green-400',
};

function RoleRequestSection() {
  const { addToast } = useToast();
  const { profile: adminProfile } = useAuth();
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
              <button onClick={() => handleAction(req.id, true)} disabled={processing === req.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50">
                {processing === req.id ? '...' : 'Approuver'}
              </button>
              <button onClick={() => handleAction(req.id, false)} disabled={processing === req.id} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-50">
                Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersTab() {
  const { addToast } = useToast();
  const { profile: adminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfileExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [blockModal, setBlockModal] = useState<{ userId: string; userName: string; isBlocked: boolean } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [saving, setSaving] = useState(false);

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
            <div key={u.id} className={`glass rounded-xl p-4 flex items-center gap-4 transition ${u.is_blocked ? 'opacity-60' : ''}`}>
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

              {/* Block/Unblock button */}
              {u.id !== adminProfile?.id && (
                <button
                  onClick={() => setBlockModal({ userId: u.id, userName: u.full_name || u.email, isBlocked: u.is_blocked })}
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