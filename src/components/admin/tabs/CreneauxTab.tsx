import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Plus, Trash2, Save, X, Loader2, Clock, MapPin, Users, CheckCircle2,
  XCircle, ChevronDown, ChevronRight, Calendar, Filter, Eye
} from 'lucide-react';
import type { Creneau, CreneauResponse, CreneauType, CreneauStatus, CreneauResponseStatus } from '../../../types';

const CRENEAU_TYPES: { value: CreneauType; label: string }[] = [
  { value: 'visite', label: 'Visite' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'culte', label: 'Culte' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'formation', label: 'Formation' },
  { value: 'evangelisation', label: 'Évangélisation' },
  { value: 'priere', label: 'Prière' },
  { value: 'suivi', label: 'Suivi' },
  { value: 'autre', label: 'Autre' },
];

const STATUS_LABELS: Record<CreneauStatus, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};

const STATUS_COLORS: Record<CreneauStatus, string> = {
  ouvert: 'bg-blue-500/20 text-blue-400',
  en_cours: 'bg-yellow-500/20 text-yellow-400',
  termine: 'bg-green-500/20 text-green-400',
  annule: 'bg-red-500/20 text-red-400',
};

const RESPONSE_STATUS: Record<CreneauResponseStatus, string> = {
  accepte: 'Accepté',
  refuse: 'Refusé',
  termine: 'Exécuté',
  annule: 'Annulé',
};

const RESPONSE_COLORS: Record<CreneauResponseStatus, string> = {
  accepte: 'bg-blue-500/20 text-blue-400',
  refuse: 'bg-red-500/20 text-red-400',
  termine: 'bg-green-500/20 text-green-400',
  annule: 'bg-gray-500/20 text-gray-400',
};

const EMPTY_FORM = {
  title: '', description: '', date: '', start_time: '', end_time: '',
  location: '', type: 'visite' as CreneauType,
};

export function CreneauxTab() {
  const { addToast } = useToast();
  const { profile, user } = useAuth();
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [responses, setResponses] = useState<CreneauResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'creneaux' | 'responses'>('creneaux');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        supabase.from('creneaux').select('*').order('date', { ascending: false }).order('start_time'),
        supabase.from('creneau_responses').select('*').order('responded_at', { ascending: false }),
      ]);
      if (cRes.error && cRes.error.message.includes('does not exist')) {
        addToast('La table creneaux n\'existe pas encore. Exécutez la migration SQL.', 'info');
      } else {
        setCreneaux((cRes.data as Creneau[]) ?? []);
      }
      if (rRes.data) setResponses((rRes.data as CreneauResponse[]) ?? []);
    } catch {
      addToast('Erreur de chargement', 'error');
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.date || !form.start_time) {
      addToast('Titre, date et heure sont obligatoires', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        creator_id: user?.id,
        creator_name: profile?.full_name || profile?.email || null,
        status: 'ouvert' as CreneauStatus,
        target_roles: ['collaborateur', 'diacre', 'ancien', 'assistant_pastor', 'pasteur_assoc'],
      };
      const { error } = await supabase.from('creneaux').insert(payload);
      if (error) throw error;
      addToast('Créneau créé avec succès', 'success');
      setForm(EMPTY_FORM);
      setFormOpen(false);
      fetchData();
    } catch {
      addToast('Erreur lors de la création', 'error');
    }
    setSaving(false);
  };

  const deleteCreneau = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    try {
      await supabase.from('creneaux').delete().eq('id', id);
      addToast('Créneau supprimé', 'success');
      if (expandedId === id) setExpandedId(null);
      fetchData();
    } catch {
      addToast('Erreur de suppression', 'error');
    }
  };

  const updateCreneauStatus = async (id: string, status: CreneauStatus) => {
    try {
      await supabase.from('creneaux').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      addToast('Statut mis à jour', 'success');
      fetchData();
    } catch {
      addToast('Erreur de mise à jour', 'error');
    }
  };

  const getResponsesForCreneau = (creneauId: string) =>
    responses.filter(r => r.creneau_id === creneauId);

  // Filter
  const filtered = creneaux.filter(c => {
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchType = filterType === 'all' || c.type === filterType;
    return matchStatus && matchType;
  });

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-evangile-500" />
        <p className="text-muted text-sm mt-3">Chargement des créneaux...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">Créneaux</h2>
          <p className="text-sm text-muted mt-1">{creneaux.length} créneau(x) &middot; {responses.length} réponse(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('creneaux')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${viewMode === 'creneaux' ? 'bg-evangile-600/20 text-evangile-500' : 'bg-white/5 text-muted hover:text-cream'}`}
          >
            Créneaux
          </button>
          <button
            onClick={() => setViewMode('responses')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${viewMode === 'responses' ? 'bg-evangile-600/20 text-evangile-500' : 'bg-white/5 text-muted hover:text-cream'}`}
          >
            Réponses
          </button>
          <button onClick={() => setFormOpen(true)} className="btn-gold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nouveau créneau
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-surface px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="input-surface px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          {CRENEAU_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-4 border border-evangile-600/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">Nouveau créneau</h3>
            <button onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); }} className="text-muted hover:text-cream transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Titre *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Visite à la famille Mukendi" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CreneauType }))} className="input-surface w-full px-4 py-2.5 text-sm">
                {CRENEAU_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Début *</label>
                <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Fin</label>
                <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Lieu</label>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Adresse ou description du lieu" className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Détails du créneau..." className="input-surface w-full px-4 py-2.5 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); }} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Créer le créneau
            </button>
          </div>
        </div>
      )}

      {/* Creneaux List */}
      {viewMode === 'creneaux' ? (
        filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted/30 mb-4" />
            <p className="text-muted">Aucun créneau trouvé.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const cResponses = getResponsesForCreneau(c.id);
              const isExpanded = expandedId === c.id;
              const accepted = cResponses.filter(r => r.status === 'accepte').length;
              const completed = cResponses.filter(r => r.status === 'termine').length;

              return (
                <div key={c.id} className="glass rounded-2xl overflow-hidden transition-all duration-200">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-serif text-base font-semibold text-cream truncate">{c.title}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${STATUS_COLORS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-muted">
                          {CRENEAU_TYPES.find(t => t.value === c.type)?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.start_time}{c.end_time ? ` - ${c.end_time}` : ''}</span>
                        {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted">{cResponses.length} réponse(s)</p>
                        <p className="text-[10px] text-muted/60">{accepted} accepté · {completed} exécuté</p>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />}
                    </div>
                  </button>

                  {/* Expanded: responses */}
                  {isExpanded && (
                    <div className="border-t border-line p-4 space-y-4 bg-white/[0.01]">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-cream">Créé par {c.creator_name || 'Inconnu'}</p>
                        <div className="flex items-center gap-2">
                          {c.status === 'ouvert' && (
                            <button onClick={() => updateCreneauStatus(c.id, 'en_cours')} className="flex items-center gap-1 rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10 transition">
                              <Clock className="h-3 w-3" /> En cours
                            </button>
                          )}
                          {(c.status === 'ouvert' || c.status === 'en_cours') && (
                            <button onClick={() => updateCreneauStatus(c.id, 'termine')} className="flex items-center gap-1 rounded-lg border border-green-500/40 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 transition">
                              <CheckCircle2 className="h-3 w-3" /> Terminer
                            </button>
                          )}
                          <button onClick={() => deleteCreneau(c.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-red-400 transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {c.description && (
                        <p className="text-sm text-cream/70 bg-white/5 rounded-xl p-3">{c.description}</p>
                      )}

                      {cResponses.length === 0 ? (
                        <p className="text-xs text-muted text-center py-4">Aucune réponse pour ce créneau.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted uppercase tracking-widest">Réponses des serviteurs</p>
                          {cResponses.map(r => (
                            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-evangile-600/20 text-evangile-500 text-xs font-bold">
                                {(r.responder_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-cream truncate">{r.responder_name || 'Inconnu'}</span>
                                  {r.responder_role && (
                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-muted">{r.responder_role}</span>
                                  )}
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RESPONSE_COLORS[r.status]}`}>
                                    {RESPONSE_STATUS[r.status]}
                                  </span>
                                </div>
                                {r.notes && <p className="text-xs text-muted mt-0.5 truncate">{r.notes}</p>}
                                <p className="text-[10px] text-muted/60 mt-0.5">
                                  {new Date(r.responded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
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
        )
      ) : (
        /* Responses View - all responses grouped */
        responses.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted/30 mb-4" />
            <p className="text-muted">Aucune réponse pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">Toutes les réponses des serviteurs</p>
            {responses.map(r => {
              const creneau = creneaux.find(c => c.id === r.creneau_id);
              return (
                <div key={r.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-evangile-600/20 text-evangile-500 text-xs font-bold">
                    {(r.responder_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cream">{r.responder_name || 'Inconnu'}</p>
                    <p className="text-xs text-muted truncate">
                      {r.status === 'termine' ? 'A exécuté' : r.status === 'accepte' ? 'A accepté' : r.status === 'refuse' ? 'A refusé' : 'A annulé'}: {creneau?.title || 'Créneau supprimé'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${RESPONSE_COLORS[r.status]}`}>
                    {RESPONSE_STATUS[r.status]}
                  </span>
                  <span className="text-xs text-muted hidden sm:inline">
                    {new Date(r.responded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}