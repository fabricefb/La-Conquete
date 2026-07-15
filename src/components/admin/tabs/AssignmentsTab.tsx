import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import type { ChurchEvent, EventAssignment, UserProfile } from '../../../types';
import { Plus, Trash2, Save, X, Loader2, Bell, Check, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES: EventAssignment['role'][] = [
  'preacher', 'intercessor', 'logistician', 'worship_leader',
  'singer', 'usher', 'sound_tech', 'camera', 'other',
];

const ROLE_LABELS: Record<EventAssignment['role'], string> = {
  preacher: 'Prédicateur',
  intercessor: 'Intercesseur',
  logistician: 'Logisticien',
  worship_leader: 'Responsable louange',
  singer: 'Chanteur',
  usher: 'Huissier',
  sound_tech: 'Technicien son',
  camera: 'Caméraman',
  other: 'Autre',
};

const STATUS_LABELS: Record<EventAssignment['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Décliné',
};

const STATUS_COLORS: Record<EventAssignment['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-green-500/20 text-green-400',
  declined: 'bg-red-500/20 text-red-400',
};

const ROLE_COLORS: Record<EventAssignment['role'], string> = {
  preacher: 'bg-evangile-600/20 text-evangile-500',
  intercessor: 'bg-purple-500/20 text-purple-400',
  logistician: 'bg-blue-500/20 text-blue-400',
  worship_leader: 'bg-pink-500/20 text-pink-400',
  singer: 'bg-cyan-500/20 text-cyan-400',
  usher: 'bg-orange-500/20 text-orange-400',
  sound_tech: 'bg-emerald-500/20 text-emerald-400',
  camera: 'bg-indigo-500/20 text-indigo-400',
  other: 'bg-white/10 text-muted',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssignmentsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formRole, setFormRole] = useState<EventAssignment['role']>('other');
  const [formStatus, setFormStatus] = useState<EventAssignment['status']>('pending');

  // ---- fetch ---------------------------------------------------------------

  const fetchEvents = useCallback(async () => {
    try {
      const data = await db.getEvents();
      setEvents(data);
    } catch (err) {
      addToast('Erreur de chargement des événements. Vérifiez la connexion.', 'error');
      console.error('fetchEvents error:', err);
    }
  }, [addToast]);

  const fetchProfiles = useCallback(async () => {
    try {
      const data = await db.getProfiles();
      setProfiles(data);
    } catch (err) {
      addToast('Erreur de chargement des profils. Vérifiez la connexion.', 'error');
      console.error('fetchProfiles error:', err);
    }
  }, [addToast]);

  const fetchAssignments = useCallback(async (eventId: string) => {
    if (!eventId) { setAssignments([]); return; }
    setLoading(true);
    try {
      const data = await db.getEventAssignments(eventId);
      setAssignments(data);
    } catch (err: any) {
      if (err?.code === '42P01' || err?.message?.includes('does not exist') || err?.message?.includes('relation')) {
        setAssignments([]);
        setTableMissing(true);
      } else {
        addToast('Erreur lors du chargement des affectations', 'error');
      }
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    fetchEvents();
    fetchProfiles();
  }, [fetchEvents, fetchProfiles]);

  useEffect(() => {
    if (selectedEventId) {
      fetchAssignments(selectedEventId);
    } else {
      setAssignments([]);
    }
  }, [selectedEventId, fetchAssignments]);

  // ---- helpers -------------------------------------------------------------

  const getUserName = (userId: string) => {
    const p = profiles.find((u) => u.id === userId);
    return p?.full_name || userId.slice(0, 8);
  };

  const resetForm = () => {
    setFormUserId('');
    setFormRole('other');
    setFormStatus('pending');
    setFormOpen(false);
  };

  // ---- save ----------------------------------------------------------------

  const handleSave = async () => {
    if (!selectedEventId || !formUserId) {
      addToast('Veuillez sélectionner un événement et un utilisateur', 'error');
      return;
    }

    setSaving(true);
    try {
      await db.upsertEventAssignment({
        event_id: selectedEventId,
        user_id: formUserId,
        role: formRole,
        status: formStatus,
        notified: false,
        created_at: new Date().toISOString(),
      });
      addToast('Affectation ajoutée avec succès', 'success');
      resetForm();
      fetchAssignments(selectedEventId);
    } catch {
      addToast("Erreur lors de l'ajout de l'affectation", 'error');
    }
    setSaving(false);
  };

  // ---- delete --------------------------------------------------------------

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette affectation ?")) return;
    try {
      await db.deleteEventAssignment(id);
      addToast('Affectation supprimée', 'success');
      fetchAssignments(selectedEventId);
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  // ---- toggle notified -----------------------------------------------------

  const toggleNotified = async (assignment: EventAssignment) => {
    try {
      await db.upsertEventAssignment({
        ...assignment,
        notified: !assignment.notified,
      } as EventAssignment & { event_id: string; user_id: string });
      fetchAssignments(selectedEventId);
    } catch {
      addToast('Erreur lors de la mise à jour', 'error');
    }
  };

  // ---- notify all ----------------------------------------------------------

  const handleNotifyAll = async () => {
    const pendingAssignments = assignments.filter((a) => a.status === 'pending' && !a.notified);
    if (pendingAssignments.length === 0) {
      addToast('Aucune affectation en attente à notifier', 'info');
      return;
    }

    setSaving(true);
    try {
      for (const a of pendingAssignments) {
        await db.upsertEventAssignment({
          ...a,
          notified: true,
        } as EventAssignment & { event_id: string; user_id: string });
      }
      addToast(`${pendingAssignments.length} affectation(s) notifiée(s)`, 'success');
      fetchAssignments(selectedEventId);
    } catch {
      addToast('Erreur lors de la notification', 'error');
    }
    setSaving(false);
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-semibold text-cream">
          Affectations
        </h2>
        {isFullAdmin && (
        <button
          onClick={() => setFormOpen((o) => !o)}
          disabled={!selectedEventId}
          className="btn-gold flex items-center gap-2 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
        )}
      </div>

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

      {/* Event selector */}
      <div className="glass rounded-2xl p-4">
        <label className="mb-1.5 block text-xs font-medium text-muted">
          Sélectionner un événement
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="input-surface w-full max-w-md px-4 py-2.5 text-sm"
        >
          <option value="">— Choisir un événement —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} — {new Date(ev.event_date).toLocaleDateString('fr-FR')}
            </option>
          ))}
        </select>
      </div>

      {/* Add form */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-4 border border-evangile-600/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              Nouvelle affectation
            </h3>
            <button onClick={resetForm} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-cream transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Membre</label>
              <select
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                <option value="">— Sélectionner —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Rôle</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as EventAssignment['role'])}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Statut</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as EventAssignment['status'])}
                className="input-surface w-full px-4 py-2.5 text-sm"
              >
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmé</option>
                <option value="declined">Décliné</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button onClick={resetForm} className="btn-ghost flex items-center gap-2">
              <X className="h-4 w-4" /> Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Assignments list */}
      {!selectedEventId ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted text-sm">Sélectionnez un événement pour voir ses affectations.</p>
        </div>
      ) : loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-evangile-500" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted text-sm">Aucune affectation pour cet événement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Notify all button */}
          {assignments.some((a) => a.status === 'pending' && !a.notified) && isFullAdmin && (
            <div className="flex justify-end">
              <button
                onClick={handleNotifyAll}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-evangile-600/40 px-4 py-2 text-sm font-medium text-evangile-500 hover:bg-evangile-600/10 transition disabled:opacity-50"
              >
                <Bell className="h-4 w-4" />
                Notifier tous les en attente
              </button>
            </div>
          )}

          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-5 gap-3 px-4 text-xs font-medium text-muted uppercase tracking-widest">
            <span>Membre</span>
            <span>Rôle</span>
            <span>Statut</span>
            <span>Notifié</span>
            <span className="text-right">Actions</span>
          </div>

          {assignments.map((a) => (
            <div key={a.id} className="glass rounded-xl p-4 group">
              <div className="md:grid md:grid-cols-5 md:gap-3 md:items-center flex flex-col gap-3">
                {/* User name */}
                <span className="text-sm font-medium text-cream truncate">
                  {a.user_name || getUserName(a.user_id)}
                </span>

                {/* Role badge */}
                <span className={`inline-flex self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${ROLE_COLORS[a.role]}`}>
                  {ROLE_LABELS[a.role]}
                </span>

                {/* Status badge */}
                <span className={`inline-flex self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_COLORS[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>

                {/* Notified toggle */}
                <button
                  onClick={() => toggleNotified(a)}
                  className={`flex items-center gap-1.5 text-xs transition ${a.notified ? 'text-green-400' : 'text-muted hover:text-cream'}`}
                  title={a.notified ? 'Décocher la notification' : 'Marquer comme notifié'}
                >
                  <Check className={`h-4 w-4 ${a.notified ? 'fill-green-400' : ''}`} />
                  {a.notified ? 'Oui' : 'Non'}
                </button>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isFullAdmin && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}