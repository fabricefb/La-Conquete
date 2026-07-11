import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Star, StarOff, Image } from 'lucide-react';
import ImageUpload from '../ImageUpload';

interface Pastor {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  thought: string;
  sort_order: number;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY: Omit<Pastor, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  role: '',
  bio: '',
  photo_url: '',
  thought: '',
  sort_order: 0,
  is_main: false,
  is_active: true,
};

export function PastorsTab() {
  const { addToast } = useToast();
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pastors').select('*').order('sort_order');
      if (error) throw error;
      setPastors((data ?? []) as Pastor[]);
    } catch {
      addToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(p: Pastor) {
    setForm({
      name: p.name,
      role: p.role,
      bio: p.bio,
      photo_url: p.photo_url,
      thought: p.thought,
      sort_order: p.sort_order,
      is_main: p.is_main,
      is_active: p.is_active,
    });
    setEditing(p.id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.role.trim()) {
      addToast('Nom et rôle sont obligatoires', 'error');
      return;
    }
    setSaving(true);
    try {
      const row = { ...form, updated_at: new Date().toISOString() };
      if (editing) {
        const { error } = await supabase.from('pastors').update(row).eq('id', editing);
        if (error) throw error;
        addToast('Pasteur mis à jour', 'success');
      } else {
        const { error } = await supabase.from('pastors').insert(row);
        if (error) throw error;
        addToast('Pasteur ajouté', 'success');
      }
      cancelForm();
      await load();
    } catch {
      addToast('Erreur de sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce pasteur ?')) return;
    try {
      const { error } = await supabase.from('pastors').delete().eq('id', id);
      if (error) throw error;
      addToast('Pasteur supprimé', 'success');
      await load();
    } catch {
      addToast('Erreur de suppression', 'error');
    }
  }

  async function toggleMain(id: string, isMain: boolean) {
    try {
      // Unset all is_main first
      if (isMain) {
        await supabase.from('pastors').update({ is_main: false });
      }
      const { error } = await supabase
        .from('pastors')
        .update({ is_main: !isMain, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await load();
    } catch {
      addToast('Erreur', 'error');
    }
  }

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-24 w-24 rounded-2xl bg-white/5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-white/5" />
              <div className="h-3 w-32 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">Équipe Pastorale</h2>
          <p className="text-sm text-muted mt-1">{pastors.length} pasteur(s) enregistré(s)</p>
        </div>
        {!showForm && (
          <button onClick={startNew} className="btn-gold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editing ? 'Modifier le pasteur' : 'Nouveau pasteur'}
            </h3>
            <button onClick={cancelForm} className="text-muted hover:text-cream transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
                Nom complet *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Pst Josué Romain KAZADI"
                className="input-surface w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
                Rôle / Titre *
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
                placeholder="Pasteur Principal — Fondateur"
                className="input-surface w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              Biographie
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              rows={3}
              placeholder="Homme de Dieu visionnaire et passionné..."
              className="input-surface w-full resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              Citation / Pensée
            </label>
            <textarea
              value={form.thought}
              onChange={(e) => setField('thought', e.target.value)}
              rows={2}
              placeholder="La Parole de Dieu est notre boussole..."
              className="input-surface w-full resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
              Photo
            </label>
            <ImageUpload
              value={form.photo_url}
              onChange={(url) => setField('photo_url', url)}
              folder="pastors"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">
                Ordre d'affichage
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setField('sort_order', Number(e.target.value))}
                className="input-surface w-full"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  checked={form.is_main}
                  onChange={(e) => setField('is_main', e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-gold-400"
                />
                <span className="text-sm text-cream">Pasteur principal</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-gold-400"
                />
                <span className="text-sm text-cream">Actif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={cancelForm} className="px-4 py-2 rounded-lg border border-line text-sm text-muted hover:text-cream transition">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {pastors.length === 0 && !showForm ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Image className="mx-auto mb-4 h-10 w-10 text-muted/40" />
          <p className="text-muted">Aucun pasteur enregistré.</p>
          <p className="text-sm text-muted/60 mt-1">Cliquez sur "Ajouter" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastors.map((p) => (
            <div
              key={p.id}
              className="glass rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.03]"
            >
              {/* Photo */}
              <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-muted/30">
                    ✝
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base font-semibold text-cream truncate">{p.name}</h3>
                  {p.is_main && (
                    <span className="shrink-0 rounded-full bg-gold-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold-400">
                      Principal
                    </span>
                  )}
                  {!p.is_active && (
                    <span className="shrink-0 rounded-full bg-ember-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ember-400">
                      Inactif
                    </span>
                  )}
                </div>
                <p className="text-sm text-gold-400 truncate">{p.role}</p>
                {p.bio && (
                  <p className="text-xs text-muted mt-1 line-clamp-1">{p.bio}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleMain(p.id, p.is_main)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    p.is_main ? 'text-gold-400' : 'text-muted hover:text-cream'
                  }`}
                  title={p.is_main ? 'Retirer comme principal' : 'Définir comme principal'}
                >
                  {p.is_main ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-cream transition"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-ember-400 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}