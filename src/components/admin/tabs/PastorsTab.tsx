import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import { Plus, Trash2, Save, X, Edit3, Loader2, Star, StarOff, Image, ChevronDown, ChevronRight, Video, ExternalLink, Globe, Phone, Mail, Music } from 'lucide-react';
import ImageUpload from '../ImageUpload';
import type { PastorSocialLinks } from '../../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  video_url: string;
  social_links: PastorSocialLinks;
  extended_bio: string;
  media_urls: string[];
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

const EMPTY: Omit<Pastor, 'id' | 'created_at' | 'updated_at'> = {
  name: '', role: '', bio: '', photo_url: '', thought: '',
  sort_order: 0, is_main: false, is_active: true,
  video_url: '', social_links: {}, extended_bio: '', media_urls: [],
  email: '', phone: '',
};

const SOCIAL_FIELDS: { key: keyof PastorSocialLinks; label: string; icon: typeof Globe }[] = [
  { key: 'facebook', label: 'Facebook', icon: Globe },
  { key: 'youtube', label: 'YouTube', icon: Video },
  { key: 'instagram', label: 'Instagram', icon: Globe },
  { key: 'twitter', label: 'Twitter / X', icon: Globe },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone },
  { key: 'website', label: 'Site web', icon: ExternalLink },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PastorsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('pastors').select('*').order('sort_order');
      if (error) throw error;
      setPastors((data ?? []).map((p: any) => ({
        ...p,
        video_url: p.video_url || '',
        social_links: p.social_links || {},
        extended_bio: p.extended_bio || '',
        media_urls: p.media_urls || [],
        email: p.email || '',
        phone: p.phone || '',
      })));
    } catch {
      addToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  function startNew() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function startEdit(p: Pastor) {
    setForm({
      name: p.name, role: p.role, bio: p.bio, photo_url: p.photo_url, thought: p.thought,
      sort_order: p.sort_order, is_main: p.is_main, is_active: p.is_active,
      video_url: p.video_url, social_links: p.social_links, extended_bio: p.extended_bio,
      media_urls: p.media_urls, email: p.email, phone: p.phone,
    });
    setEditing(p.id);
    setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditing(null); setForm(EMPTY); setMediaUrlInput(''); }

  async function handleSave() {
    if (!form.name.trim() || !form.role.trim()) {
      addToast('Nom et rôle sont obligatoires', 'error'); return;
    }
    setSaving(true);
    try {
      const row = {
        ...form,
        social_links: form.social_links || {},
        media_urls: form.media_urls || [],
        updated_at: new Date().toISOString(),
      };
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
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce pasteur ?')) return;
    try {
      const { error } = await supabase.from('pastors').delete().eq('id', id);
      if (error) throw error;
      addToast('Pasteur supprimé', 'success');
      await load();
    } catch { addToast('Erreur de suppression', 'error'); }
  }

  async function toggleMain(id: string, isMain: boolean) {
    try {
      if (isMain) await supabase.from('pastors').update({ is_main: false }).eq('is_main', true);
      await supabase.from('pastors').update({ is_main: !isMain, updated_at: new Date().toISOString() }).eq('id', id);
      await load();
    } catch { addToast('Erreur', 'error'); }
  }

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setSocialField(key: keyof PastorSocialLinks, val: string) {
    setForm(f => ({ ...f, social_links: { ...f.social_links, [key]: val } }));
  }

  function addMediaUrl() {
    if (mediaUrlInput.trim()) {
      setForm(f => ({ ...f, media_urls: [...f.media_urls, mediaUrlInput.trim()] }));
      setMediaUrlInput('');
    }
  }

  function removeMediaUrl(idx: number) {
    setForm(f => ({ ...f, media_urls: f.media_urls.filter((_, i) => i !== idx) }));
  }

  if (loading) {
    return (<div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="flex gap-4 animate-pulse"><div className="h-24 w-24 rounded-2xl bg-white/5 shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 w-48 rounded bg-white/5" /><div className="h-3 w-32 rounded bg-white/5" /></div></div>))}</div>);
  }

  // ---- Render: Form -------------------------------------------------------

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-cream">{editing ? 'Modifier le pasteur' : 'Nouveau pasteur'}</h2>
          <button onClick={cancelForm} className="text-muted hover:text-cream transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          {/* Accordion header info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Nom complet *</label>
              <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Pst Josué Romain KAZADI" className="input-surface w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Rôle / Titre *</label>
              <input type="text" value={form.role} onChange={e => setField('role', e.target.value)} placeholder="Pasteur Principal — Fondateur" className="input-surface w-full" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</label>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@exemple.com" className="input-surface w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-1.5"><Phone className="h-3 w-3" /> Téléphone</label>
              <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+243 ..." className="input-surface w-full" />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Photo</label>
            <ImageUpload value={form.photo_url} onChange={(url) => setField('photo_url', url)} folder="pastors" />
          </div>

          {/* Bio (short) */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Biographie courte</label>
            <textarea value={form.bio} onChange={e => setField('bio', e.target.value)} rows={2} placeholder="Résumé en une phrase..." className="input-surface w-full resize-none" />
          </div>

          {/* Extended Bio (accordion content) */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Biographie détaillée (accordéon)</label>
            <textarea value={form.extended_bio} onChange={e => setField('extended_bio', e.target.value)} rows={5} placeholder="Biographie complète visible dans l'accordéon sur la page publique..." className="input-surface w-full resize-none" />
          </div>

          {/* Citation */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Citation / Pensée</label>
            <textarea value={form.thought} onChange={e => setField('thought', e.target.value)} rows={2} placeholder="La Parole de Dieu est notre boussole..." className="input-surface w-full resize-none" />
          </div>

          {/* Video URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-1.5"><Video className="h-3 w-3" /> Lien vidéo (YouTube, etc.)</label>
            <input type="url" value={form.video_url} onChange={e => setField('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." className="input-surface w-full" />
          </div>

          {/* Social Links */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Réseaux sociaux</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOCIAL_FIELDS.map(sf => (
                <div key={sf.key}>
                  <label className="mb-1 block text-[10px] text-muted">{sf.label}</label>
                  <input
                    type="url"
                    value={(form.social_links[sf.key] as string) || ''}
                    onChange={e => setSocialField(sf.key, e.target.value)}
                    placeholder={`https://${sf.key}.com/...`}
                    className="input-surface w-full px-4 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Media URLs */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-1.5"><Music className="h-3 w-3" /> Médias (audio, vidéos, liens)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={mediaUrlInput}
                onChange={e => setMediaUrlInput(e.target.value)}
                placeholder="https://... (audio, vidéo, article)"
                className="input-surface flex-1 px-4 py-2 text-sm"
                onKeyDown={e => e.key === 'Enter' && addMediaUrl()}
              />
              <button onClick={addMediaUrl} type="button" className="btn-gold px-3 py-2 text-sm">Ajouter</button>
            </div>
            {form.media_urls.length > 0 && (
              <div className="space-y-1">
                {form.media_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs">
                    <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                    <span className="text-cream/70 truncate flex-1">{url}</span>
                    <button onClick={() => removeMediaUrl(i)} className="text-muted hover:text-red-400 transition"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort / Main / Active */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted">Ordre</label>
              <input type="number" value={form.sort_order} onChange={e => setField('sort_order', Number(e.target.value))} className="input-surface w-full" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input type="checkbox" checked={form.is_main} onChange={e => setField('is_main', e.target.checked)} className="h-4 w-4 rounded border-line accent-evangile-600" />
                <span className="text-sm text-cream">Principal</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="h-4 w-4 rounded border-line accent-evangile-600" />
                <span className="text-sm text-cream">Actif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={cancelForm} className="px-4 py-2 rounded-lg border border-line text-sm text-muted hover:text-cream transition">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render: Accordion List ---------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">Équipe Pastorale</h2>
          <p className="text-sm text-muted mt-1">{pastors.length} pasteur(s) enregistré(s)</p>
        </div>
        {isFullAdmin && <button onClick={startNew} className="btn-gold flex items-center gap-2"><Plus className="h-4 w-4" /> Ajouter</button>}
      </div>

      {pastors.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Image className="mx-auto mb-4 h-10 w-10 text-muted/40" />
          <p className="text-muted">Aucun pasteur enregistré.</p>
          <p className="text-sm text-muted/60 mt-1">Cliquez sur "Ajouter" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastors.map((p) => {
            const isExpanded = expandedId === p.id;
            const socials = p.social_links || {};
            const hasDetails = p.extended_bio || p.video_url || p.thought ||
              Object.values(socials).some(Boolean) || (p.media_urls && p.media_urls.length > 0);

            return (
              <div key={p.id} className="glass rounded-2xl overflow-hidden transition-all duration-200 hover:bg-white/[0.02]">
                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {/* Photo */}
                  <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-muted/30">✝</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-base font-semibold text-cream truncate">{p.name}</h3>
                      {p.is_main && (
                        <span className="shrink-0 rounded-full bg-accent-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-400">Principal</span>
                      )}
                      {!p.is_active && (
                        <span className="shrink-0 rounded-full bg-ember-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ember-400">Inactif</span>
                      )}
                    </div>
                    <p className="text-sm text-accent-400 truncate">{p.role}</p>
                    {p.bio && <p className="text-xs text-muted mt-1 line-clamp-1">{p.bio}</p>}
                    {/* Social links inline */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {socials.facebook && <span className="text-[10px] text-blue-400">Facebook</span>}
                      {socials.youtube && <span className="text-[10px] text-red-400">YouTube</span>}
                      {socials.instagram && <span className="text-[10px] text-pink-400">Instagram</span>}
                      {socials.whatsapp && <span className="text-[10px] text-green-400">WhatsApp</span>}
                      {p.video_url && <span className="text-[10px] text-purple-400">Vidéo</span>}
                      {p.media_urls?.length > 0 && <span className="text-[10px] text-cyan-400">{p.media_urls.length} média(s)</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isFullAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); toggleMain(p.id, p.is_main); }} className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${p.is_main ? 'text-accent-400' : 'text-muted hover:text-cream'}`} title={p.is_main ? 'Retirer principal' : 'Définir principal'}>
                      {p.is_main ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                    </button>
                    )}
                    {isFullAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-cream transition"><Edit3 className="h-4 w-4" /></button>
                    )}
                    {isFullAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-ember-400 transition"><Trash2 className="h-4 w-4" /></button>
                    )}
                    {hasDetails && (
                      isExpanded ? <ChevronDown className="h-4 w-4 text-muted ml-1" /> : <ChevronRight className="h-4 w-4 text-muted ml-1" />
                    )}
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && hasDetails && (
                  <div className="border-t border-line p-5 space-y-4 bg-white/[0.01]">
                    {/* Extended Bio */}
                    {p.extended_bio && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Biographie</h4>
                        <div className="prose prose-sm prose-invert max-w-none">
                          <p className="text-sm text-cream/80 leading-relaxed whitespace-pre-wrap">{p.extended_bio}</p>
                        </div>
                      </div>
                    )}

                    {/* Thought */}
                    {p.thought && (
                      <div className="rounded-xl bg-accent-400/5 border-l-2 border-accent-400/30 p-4">
                        <p className="text-sm text-cream/80 italic">"{p.thought}"</p>
                        <p className="text-[10px] text-accent-400 mt-2">— {p.name}</p>
                      </div>
                    )}

                    {/* Video */}
                    {p.video_url && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5"><Video className="h-3 w-3" /> Vidéo</h4>
                        <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30 transition">
                          <ExternalLink className="h-4 w-4" /> Regarder la vidéo
                        </a>
                      </div>
                    )}

                    {/* Social Links Grid */}
                    {Object.values(socials).some(Boolean) && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5"><Globe className="h-3 w-3" /> Réseaux sociaux</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SOCIAL_FIELDS.map(sf => {
                            const url = socials[sf.key];
                            if (!url) return null;
                            return (
                              <a key={sf.key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-cream/70 hover:bg-white/10 transition">
                                <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                                <span className="truncate">{sf.label}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Media URLs */}
                    {p.media_urls && p.media_urls.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5"><Music className="h-3 w-3" /> Médias</h4>
                        <div className="space-y-1">
                          {p.media_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-cream/70 hover:bg-white/10 transition">
                              <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    {(p.email || p.phone) && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Contact</h4>
                        <div className="flex gap-4">
                          {p.email && (
                            <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-xs text-cream/70 hover:text-accent-400 transition">
                              <Mail className="h-3 w-3" /> {p.email}
                            </a>
                          )}
                          {p.phone && (
                            <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-xs text-cream/70 hover:text-accent-400 transition">
                              <Phone className="h-3 w-3" /> {p.phone}
                            </a>
                          )}
                        </div>
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
  );
}