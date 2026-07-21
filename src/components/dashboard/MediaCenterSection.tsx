import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Calendar, Users, Mic, MonitorPlay, Clock, AlertTriangle, Loader2,
  Info, Timer, ChevronDown, ChevronUp, BookOpen, Eye, Send, Copy,
  RefreshCw, MessageSquare, CheckCircle, Plus, Trash2, Edit3, X, Save,
} from '../../lib/icons';
import {
  WORSHIP_TYPE_CONFIGS, SERVICE_TYPE_LABELS, STATUS_CONFIG,
  isTableNotFoundError, formatDate, formatTime, getDeadlineInfo, ORDER_ITEM_TYPES,
  enrichServicesWithDeadlines, BIBLE_BOOKS,
} from '../admin/tabs/PlanificationTab';
import type { WorshipService, WorshipOratorForm, WorshipOratorPoint, WorshipOrderItem, WorshipFormLink, WorshipOrderItemType } from '../../types';
import { openWhatsApp } from '../../lib/whatsapp';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const WEEKLY_TYPES = [
  'enseignement_priere', 'jeune_priere', 'jeune_gen_espoir', 'adoration_louange',
] as const;

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function DeadlineChip({ deadlineAt }: { deadlineAt: string | null }) {
  if (!deadlineAt) return null;
  const info = getDeadlineInfo(deadlineAt);
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${info.cls}`}>
      <Timer className="h-2.5 w-2.5" />
      {info.label}
    </span>
  );
}

/** Inline orator form for admin direct submission */
function AdminOratorForm({
  service, existingForm, onSubmit, onCancel,
}: {
  service: WorshipService;
  existingForm: WorshipOratorForm | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(existingForm?.orator_name || service.orator_name || '');
  const [theme, setTheme] = useState(existingForm?.theme || '');
  const [subTheme, setSubTheme] = useState(existingForm?.sub_theme || '');
  const [bibleBook, setBibleBook] = useState(existingForm?.bible_book || '');
  const [bibleChapter, setBibleChapter] = useState(existingForm?.bible_chapter || '');
  const [bibleVerses, setBibleVerses] = useState(existingForm?.bible_verses || '');
  const [summary, setSummary] = useState(existingForm?.summary || '');
  const [remarks, setRemarks] = useState(existingForm?.remarks || '');
  const [points, setPoints] = useState(
    existingForm ? [] : [{ title: '', description: '' }]
  );

  const handleSave = async () => {
    if (!name.trim() || !theme.trim()) {
      addToast({ type: 'error', message: 'Nom de l\'orateur et thème sont requis.' });
      return;
    }
    setSaving(true);
    try {
      // Upsert orator form
      const formData = {
        service_id: service.id,
        orator_name: name.trim(),
        theme: theme.trim(),
        sub_theme: subTheme.trim() || null,
        bible_book: bibleBook || null,
        bible_chapter: bibleChapter || null,
        bible_verses: bibleVerses || null,
        summary: summary.trim() || null,
        remarks: remarks.trim() || null,
        status: 'submitted',
      };

      let formId = existingForm?.id;
      if (existingForm) {
        const { error } = await supabase.from('worship_orator_forms').update(formData).eq('id', existingForm.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('worship_orator_forms').insert({ ...formData, submitted_at: new Date().toISOString() }).select().single();
        if (error) throw error;
        formId = data?.id;
      }

      // Save points (only for new submissions, existing points were loaded from DB)
      if (formId && points.length > 0) {
        const validPoints = points.filter(p => p.title.trim());
        if (validPoints.length > 0) {
          await supabase.from('worship_orator_points').delete().eq('form_id', formId);
          const { error: ptErr } = await supabase.from('worship_orator_points').insert(
            validPoints.map((p, i) => ({ form_id: formId, title: p.title.trim(), description: p.description.trim() || null, position: i }))
          );
          if (ptErr) console.error('Points error:', ptErr);
        }
      }

      // Update service status
      await supabase.from('worship_services').update({ status: 'orator_submitted', orator_name: name.trim() }).eq('id', service.id);

      addToast({ type: 'success', message: 'Formulaire orateur enregistré avec succès !' });
      onSubmit();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  const addPoint = () => setPoints([...points, { title: '', description: '' }]);
  const removePoint = (i: number) => setPoints(points.filter((_, idx) => idx !== i));
  const updatePoint = (i: number, field: 'title' | 'description', value: string) => {
    const updated = [...points];
    updated[i][field] = value;
    setPoints(updated);
  };

  const inputCls = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-cream placeholder-muted/50 focus:outline-none focus:border-accent-400/40 focus:ring-1 focus:ring-accent-400/20 transition-colors';
  const labelCls = 'block text-[11px] font-medium text-muted mb-1';

  return (
    <div className="bg-amber-500/5 rounded-lg p-3.5 border border-amber-500/15 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">Remplir le formulaire orateur</p>
        <button onClick={onCancel} className="text-muted hover:text-cream transition-colors"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div><label className={labelCls}>Nom de l'orateur *</label><input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Nom de l'orateur" /></div>
        <div><label className={labelCls}>Thème *</label><input className={inputCls} value={theme} onChange={e => setTheme(e.target.value)} placeholder="Thème du message" /></div>
        <div><label className={labelCls}>Sous-thème</label><input className={inputCls} value={subTheme} onChange={e => setSubTheme(e.target.value)} placeholder="Sous-thème (optionnel)" /></div>
        <div className="flex gap-2">
          <div className="flex-1"><label className={labelCls}>Livre biblique</label><select className={inputCls} value={bibleBook} onChange={e => setBibleBook(e.target.value)}>
            <option value="">-- Livre --</option>
            {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select></div>
          <div className="w-20"><label className={labelCls}>Chap.</label><input className={inputCls} value={bibleChapter} onChange={e => setBibleChapter(e.target.value)} placeholder="10" /></div>
          <div className="w-20"><label className={labelCls}>Verset</label><input className={inputCls} value={bibleVerses} onChange={e => setBibleVerses(e.target.value)} placeholder="1-5" /></div>
        </div>
      </div>

      {/* Points du message */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Points du message</label>
          <button onClick={addPoint} type="button" className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"><Plus className="h-3 w-3" /> Ajouter</button>
        </div>
        <div className="space-y-2">
          {points.map((pt, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[10px] text-muted mt-2.5 w-4 shrink-0">{i + 1}.</span>
              <input className={`${inputCls} flex-1`} value={pt.title} onChange={e => updatePoint(i, 'title', e.target.value)} placeholder="Titre du point" />
              <input className={`${inputCls} flex-1`} value={pt.description} onChange={e => updatePoint(i, 'description', e.target.value)} placeholder="Description" />
              <button onClick={() => removePoint(i)} type="button" className="text-red-400/60 hover:text-red-400 mt-2.5"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div><label className={labelCls}>Résumé</label><textarea className={`${inputCls} min-h-[60px] resize-y`} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Résumé du message..." /></div>
      <div><label className={labelCls}>Remarques</label><textarea className={`${inputCls} min-h-[40px] resize-y`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarques pour le département média..." /></div>

      <button onClick={handleSave} disabled={saving || !name.trim() || !theme.trim()} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-colors disabled:opacity-40 border border-amber-500/20">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {existingForm ? 'Mettre à jour le formulaire' : 'Enregistrer le formulaire orateur'}
      </button>
    </div>
  );
}

/** Inline president order form for admin direct submission */
function AdminOrderForm({
  service, existingItems, onSubmit, onCancel,
}: {
  service: WorshipService;
  existingItems: WorshipOrderItem[];
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [presName, setPresName] = useState(service.president_name || '');
  const [items, setItems] = useState<Omit<WorshipOrderItem, 'id' | 'service_id' | 'created_at'>[]>(
    existingItems.length > 0
      ? existingItems.map((it, i) => ({ item_type: it.item_type, custom_label: it.custom_label || '', notes: it.notes || '', duration_minutes: it.duration_minutes, position: i }))
      : [{ item_type: 'louange' as WorshipOrderItemType, custom_label: '', notes: '', duration_minutes: 10, position: 0 }]
  );

  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };
  const addItem = () => setItems([...items, { item_type: 'louange', custom_label: '', notes: '', duration_minutes: 10, position: items.length }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, position: idx })));
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const updated = [...items];
    [updated[i], updated[j]] = [updated[j], updated[i]];
    setItems(updated.map((it, idx) => ({ ...it, position: idx })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing items
      await supabase.from('worship_order_items').delete().eq('service_id', service.id);

      // Insert new items
      if (items.length > 0) {
        const { error } = await supabase.from('worship_order_items').insert(
          items.map(it => ({ ...it, service_id: service.id }))
        );
        if (error) throw error;
      }

      // Update service
      await supabase.from('worship_services').update({ status: 'president_submitted', president_name: presName.trim() || null }).eq('id', service.id);

      addToast({ type: 'success', message: 'Ordre du culte enregistré avec succès !' });
      onSubmit();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  const totalMin = items.reduce((s, i) => s + (i.duration_minutes || 0), 0);
  const inputCls = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-cream placeholder-muted/50 focus:outline-none focus:border-purple-400/40 focus:ring-1 focus:ring-purple-400/20 transition-colors';

  return (
    <div className="bg-purple-500/5 rounded-lg p-3.5 border border-purple-500/15 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider">Remplir l'ordre du culte</p>
        <button onClick={onCancel} className="text-muted hover:text-cream transition-colors"><X className="h-4 w-4" /></button>
      </div>

      <div><label className="block text-[11px] font-medium text-muted mb-1">Nom du président</label><input className={inputCls} value={presName} onChange={e => setPresName(e.target.value)} placeholder="Nom du président" /></div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center bg-white/[0.02] rounded-lg p-2 border border-white/5">
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-muted hover:text-cream disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
              <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-muted hover:text-cream disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
            </div>
            <span className="text-[10px] text-muted w-4 shrink-0">{i + 1}</span>
            <select className={`${inputCls} w-32 shrink-0`} value={item.item_type} onChange={e => updateItem(i, 'item_type', e.target.value)}>
              {ORDER_ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {item.item_type === 'autre' && (
              <input className={`${inputCls} flex-1 min-w-0`} value={item.custom_label} onChange={e => updateItem(i, 'custom_label', e.target.value)} placeholder="Label personnalisé" />
            )}
            <input type="number" min={1} className={`${inputCls} w-16 shrink-0 text-center`} value={item.duration_minutes} onChange={e => updateItem(i, 'duration_minutes', parseInt(e.target.value) || 1)} />
            <span className="text-[10px] text-muted shrink-0">min</span>
            <button onClick={() => removeItem(i)} type="button" className="text-red-400/60 hover:text-red-400 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addItem} type="button" className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"><Plus className="h-3 w-3" /> Ajouter un élément</button>
        <span className="text-[11px] text-muted">Durée totale : <strong className="text-cream">{totalMin} min</strong></span>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium transition-colors disabled:opacity-40 border border-purple-500/20">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer l'ordre du culte
      </button>
    </div>
  );
}

/** A single, compact service row with ALL actions visible */
function ServiceRow({
  service,
  oratorForm,
  oratorPoints,
  orderItems,
  oratorLink,
  presidentLink,
  onGenerateLink,
  onRefresh,
}: {
  service: WorshipService;
  oratorForm: WorshipOratorForm | null;
  oratorPoints: WorshipOratorPoint[];
  orderItems: WorshipOrderItem[];
  oratorLink: WorshipFormLink | undefined;
  presidentLink: WorshipFormLink | undefined;
  onGenerateLink: (serviceId: string, linkType: 'orator' | 'president', name?: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [editOrator, setEditOrator] = useState(false);
  const [editOrder, setEditOrder] = useState(false);
  const typeCfg = WORSHIP_TYPE_CONFIGS[service.type];
  const accentColor = typeCfg?.color ?? 'text-cream';
  const typeLabel = SERVICE_TYPE_LABELS[service.type] ?? service.type;
  const hasContent = !!oratorForm || orderItems.length > 0;

  const copyLink = async (token: string, label: string) => {
    try {
      await navigator.clipboard.writeText(`${BASE_URL}/#/form-culte/${token}`);
    } catch { /* clipboard unavailable */ }
  };

  const sendLinkWA = (link: WorshipFormLink) => {
    const formType = link.link_type === 'orator' ? 'orateur' : 'président';
    const message = `Bonjour ${link.recipient_name || ''},\n\nVoici le lien pour remplir le formulaire ${formType} du culte du ${formatDate(service.date)} :\n\n${BASE_URL}/#/form-culte/${link.token}\n\nCe lien expire dans 7 jours.`;
    openWhatsApp(link.recipient_phone, message);
    supabase.from('worship_form_links').update({ sent_at: new Date().toISOString() }).eq('id', link.id).then(() => {}).catch(() => {});
  };

  const sendProgramWA = () => {
    let message = '';
    if (oratorForm) {
      message += `*FORMULAIRE ORATEUR*\n`;
      message += `Culte: ${formatDate(service.date)} ${formatTime(service.time)}\n`;
      message += `Type: ${typeLabel}\n\n`;
      message += `*Orateur:* ${oratorForm.orator_name || service.orator_name || '-'}\n`;
      message += `*Thème:* ${oratorForm.theme || '-'}\n`;
      if (oratorForm.sub_theme) message += `*Sous-thème:* ${oratorForm.sub_theme}\n`;
      if (oratorForm.bible_book && oratorForm.bible_chapter && oratorForm.bible_verses)
        message += `*Verset:* ${oratorForm.bible_book} ${oratorForm.bible_chapter}:${oratorForm.bible_verses}\n`;
      if (oratorPoints.length > 0) {
        message += `\n*Points du message:*\n`;
        oratorPoints.forEach((p, i) => {
          message += `${i + 1}. ${p.title}`;
          if (p.description) message += ` — ${p.description}`;
          message += '\n';
        });
      }
    }
    if (orderItems.length > 0) {
      if (message) message += '\n';
      message += `*ORDRE DU CULTE*\n`;
      message += `Président: ${service.president_name || '-'}\n\n`;
      orderItems.forEach((item, i) => {
        const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
        message += `${i + 1}. ${item.custom_label || label} (${item.duration_minutes} min)\n`;
        if (item.notes) message += `   Notes: ${item.notes}\n`;
      });
      const total = orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);
      message += `\n*Durée totale:* ${total} min`;
    }
    if (!message) return;
    setSending(true);
    openWhatsApp(null, message);
    setTimeout(() => setSending(false), 1500);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-colors hover:bg-white/[0.04]">
      {/* ── Header: type + date/time + status ── */}
      <div className="p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${accentColor.replace('text-', 'bg-').replace('300', '400')}`} />
            <h4 className={`text-sm font-semibold truncate ${accentColor}`}>{typeLabel}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {service.is_delayed && service.delayed_minutes > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> +{service.delayed_minutes} min
              </span>
            )}
            {service.form_deadline_at && <DeadlineChip deadlineAt={service.form_deadline_at} />}
            <StatusBadge status={service.status} />
          </div>
        </div>

        {/* Date / time / people */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(service.date)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(service.time)}{typeCfg?.endTime ? `–${typeCfg.endTime}` : ''}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-accent-400/5 border border-accent-400/10 px-3 py-2">
            <Mic className={`h-4 w-4 shrink-0 ${accentColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted">Orateur</p>
              <p className={`text-sm font-medium truncate ${oratorForm ? 'text-green-300' : accentColor}`}>
                {service.orator_name ?? 'En attente'}
              </p>
            </div>
            {oratorForm && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
            <button onClick={() => setEditOrator(!editOrator)} className="ml-auto p-1 rounded-md hover:bg-white/10 text-muted hover:text-amber-300 transition-colors shrink-0" title="Remplir directement le formulaire orateur">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-purple-500/5 border border-purple-500/10 px-3 py-2">
            <Users className="h-4 w-4 text-purple-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted">Président</p>
              <p className={`text-sm font-medium truncate ${orderItems.length > 0 ? 'text-green-300' : 'text-purple-300'}`}>
                {service.president_name ?? 'En attente'}
              </p>
            </div>
            {orderItems.length > 0 && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
            <button onClick={() => setEditOrder(!editOrder)} className="ml-auto p-1 rounded-md hover:bg-white/10 text-muted hover:text-purple-300 transition-colors shrink-0" title="Remplir directement l'ordre du culte">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Quick actions — always visible ── */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {/* Orator link actions */}
          {oratorLink ? (
            <>
              <button onClick={() => copyLink(oratorLink.token, 'orateur')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-cream text-[11px] transition-colors border border-white/10" title="Copier le lien orateur">
                <Copy className="h-3 w-3" /> Lien orateur
              </button>
              <button onClick={() => sendLinkWA(oratorLink)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 text-[11px] transition-colors border border-green-500/15" title="Envoyer par WhatsApp">
                <Send className="h-3 w-3" /> WA orateur
              </button>
            </>
          ) : (
            <button onClick={() => onGenerateLink(service.id, 'orator', service.orator_name || undefined)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] transition-colors border border-amber-500/15" title="Générer le lien orateur">
              <RefreshCw className="h-3 w-3" /> Créer lien orateur
            </button>
          )}

          {/* President link actions */}
          {presidentLink ? (
            <>
              <button onClick={() => copyLink(presidentLink.token, 'président')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-cream text-[11px] transition-colors border border-white/10" title="Copier le lien président">
                <Copy className="h-3 w-3" /> Lien président
              </button>
              <button onClick={() => sendLinkWA(presidentLink)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 text-[11px] transition-colors border border-green-500/15" title="Envoyer par WhatsApp">
                <Send className="h-3 w-3" /> WA président
              </button>
            </>
          ) : (
            <button onClick={() => onGenerateLink(service.id, 'president', service.president_name || undefined)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] transition-colors border border-purple-500/15" title="Générer le lien président">
              <RefreshCw className="h-3 w-3" /> Créer lien président
            </button>
          )}

          {/* Send full program via WhatsApp */}
          {hasContent && (
            <button
              onClick={sendProgramWA}
              disabled={sending}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] transition-colors border border-emerald-500/15 disabled:opacity-50"
              title="Envoyer le programme complet par WhatsApp"
            >
              <MessageSquare className="h-3 w-3" /> {sending ? 'Envoi...' : 'Programme WA'}
            </button>
          )}

          {/* Preview form */}
          <button onClick={() => window.open(`/#/form-culte/${oratorLink?.token || presidentLink?.token}`, '_blank')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] transition-colors border border-blue-500/15" title="Prévisualiser le formulaire" disabled={!oratorLink && !presidentLink}>
            <Eye className="h-3 w-3" /> Aperçu
          </button>
        </div>

        {/* Expand toggle for form details */}
        {(oratorForm || orderItems.length > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-[11px] text-accent-400 hover:text-accent-300 transition-colors w-full justify-center pt-0.5"
          >
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Masquer le détail' : 'Voir le contenu du formulaire'}
          </button>
        )}
      </div>

      {/* ── Admin inline: Orator form ── */}
      {editOrator && (
        <div className="border-t border-amber-500/15 px-3.5 sm:px-4 py-3 bg-amber-500/[0.02]">
          <AdminOratorForm
            service={service}
            existingForm={oratorForm}
            onSubmit={() => { setEditOrator(false); onRefresh(); }}
            onCancel={() => setEditOrator(false)}
          />
        </div>
      )}

      {/* ── Admin inline: President order form ── */}
      {editOrder && (
        <div className="border-t border-purple-500/15 px-3.5 sm:px-4 py-3 bg-purple-500/[0.02]">
          <AdminOrderForm
            service={service}
            existingItems={orderItems}
            onSubmit={() => { setEditOrder(false); onRefresh(); }}
            onCancel={() => setEditOrder(false)}
          />
        </div>
      )}

      {/* ── Expanded: form content (read-only view) ── */}
      {expanded && !editOrator && !editOrder && (
        <div className="border-t border-white/5 px-3.5 sm:px-4 py-3 space-y-3 bg-white/[0.02]">
          {oratorForm && (
            <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10 space-y-1.5">
              <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Formulaire Orateur</p>
              <p className="text-sm font-medium text-cream">{oratorForm.theme}</p>
              {oratorForm.sub_theme && <p className="text-xs text-cream/70">Sous-thème : {oratorForm.sub_theme}</p>}
              {oratorForm.bible_book && oratorForm.bible_chapter && oratorForm.bible_verses && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {oratorForm.bible_book} {oratorForm.bible_chapter}:{oratorForm.bible_verses}
                </p>
              )}
              {oratorPoints.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {oratorPoints.map(p => (
                    <li key={p.id} className="text-[11px] text-muted">
                      <span className="text-cream/80 font-medium">{p.title}</span>
                      {p.description && <span className="ml-1">— {p.description}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {orderItems.length > 0 && (
            <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/10 space-y-1.5">
              <p className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">Ordre du Culte</p>
              {orderItems.map((item, i) => {
                const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
                return (
                  <div key={item.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-cream/80"><span className="text-muted mr-1">{i + 1}.</span>{item.custom_label || label}</span>
                    <span className="text-muted">{item.duration_minutes} min</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted pt-1 border-t border-purple-500/10">
                Durée totale : {orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0)} min
              </p>
            </div>
          )}

          {!oratorForm && orderItems.length === 0 && (
            <div className="text-center py-3">
              <Info className="h-5 w-5 text-muted/40 mx-auto mb-1.5" />
              <p className="text-xs text-muted">Aucun formulaire soumis pour ce culte</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component — Centre Média et Communication
// ---------------------------------------------------------------------------

export function MediaCenterSection({ accentColor }: { accentColor?: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [services, setServices] = useState<WorshipService[]>([]);
  const [oratorForms, setOratorForms] = useState<Record<string, { form: WorshipOratorForm; points: WorshipOratorPoint[] }>>({});
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, WorshipOrderItem[]>>({});
  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // ── Department communications inbox ──
  const [deptMessages, setDeptMessages] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch — optimized: batch links, parallel forms/orders per service
  // -----------------------------------------------------------------------
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('worship_services')
        .select('id,date,time,type,orator_name,president_name,status,notes,created_by,is_delayed,delayed_at,delayed_minutes,created_at,updated_at')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        if (isTableNotFoundError(error)) { setTableMissing(true); }
        else { addToast?.({ type: 'error', message: 'Impossible de charger le programme.' }); }
        setServices([]);
        return;
      }

      const svcs = enrichServicesWithDeadlines((data ?? []) as WorshipService[]);
      setServices(svcs);

      // Batch: fetch ALL links at once
      const [linksRes] = await Promise.allSettled([
        supabase.from('worship_form_links').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      const allLinks = (linksRes.status === 'fulfilled' && linksRes.value.data) ? (linksRes.value.data as WorshipFormLink[]) : [];
      setFormLinks(allLinks);

      // Parallel: fetch forms + orders for ALL services at once (batch by service ids)
      if (svcs.length > 0) {
        const svcIds = svcs.map(s => s.id);

        const [formsRes, ordersRes, pointsRes] = await Promise.allSettled([
          supabase.from('worship_orator_forms').select('*').in('service_id', svcIds),
          supabase.from('worship_order_items').select('*').in('service_id', svcIds).order('position'),
          supabase.from('worship_orator_points').select('*'),
        ]);

        const forms = (formsRes.status === 'fulfilled' && formsRes.value.data) ? (formsRes.value.data as WorshipOratorForm[]) : [];
        const orders = (ordersRes.status === 'fulfilled' && ordersRes.value.data) ? (ordersRes.value.data as WorshipOrderItem[]) : [];
        const allPoints = (pointsRes.status === 'fulfilled' && pointsRes.value.data) ? (pointsRes.value.data as WorshipOratorPoint[]) : [];

        // Map forms by service_id
        const formsByService: Record<string, WorshipOratorForm> = {};
        forms.forEach(f => { formsByService[f.service_id] = f; });

        // Map points by form_id
        const pointsByForm: Record<string, WorshipOratorPoint[]> = {};
        allPoints.forEach(p => {
          if (!pointsByForm[p.form_id]) pointsByForm[p.form_id] = [];
          pointsByForm[p.form_id].push(p);
        });

        // Build oratorForms map
        const newOratorForms: Record<string, { form: WorshipOratorForm; points: WorshipOratorPoint[] }> = {};
        svcs.forEach(svc => {
          const form = formsByService[svc.id];
          if (form) {
            newOratorForms[svc.id] = {
              form,
              points: (pointsByForm[form.id] || []).sort((a, b) => a.position - b.position),
            };
          }
        });
        setOratorForms(newOratorForms);

        // Build orderItems map
        const newOrderItems: Record<string, WorshipOrderItem[]> = {};
        orders.forEach(item => {
          if (!newOrderItems[item.service_id]) newOrderItems[item.service_id] = [];
          newOrderItems[item.service_id].push(item);
        });
        setOrderItemsMap(newOrderItems);
      }
    } catch (err) {
      console.error('[MediaCenter] unexpected error:', err);
      addToast?.({ type: 'error', message: 'Erreur lors du chargement du programme.' });
      setServices([]);
    } finally {
      setLoading(false);
    }

    // Fetch department communications sent to media/communication
    try {
      const { data: commData } = await supabase
        .from('department_communications')
        .select('id, title, content, priority, sender_dept:departments!sender_department_id(name), created_at, is_read')
        .order('created_at', { ascending: false })
        .limit(20);
      setDeptMessages(commData || []);
    } catch {
      // Table may not exist yet - that's OK
    }
  }, [addToast]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // -----------------------------------------------------------------------
  // Generate link
  // -----------------------------------------------------------------------
  const handleGenerateLink = async (serviceId: string, linkType: 'orator' | 'president', name?: string) => {
    try {
      const token = generateToken();
      // Supprimer d'abord tout lien existant pour ce service/type, puis inserer
      await supabase.from('worship_form_links').delete().eq('service_id', serviceId).eq('link_type', linkType);
      const { error } = await supabase.from('worship_form_links').insert({
        service_id: serviceId, link_type: linkType, token,
        recipient_name: name || null, recipient_phone: null,
        is_used: false, sent_at: null,
      });

      if (error) throw error;
      addToast?.({ type: 'success', message: `Lien ${linkType === 'orator' ? 'orateur' : 'président'} généré` });
      fetchServices(); // refresh to pick up new link
    } catch (err: any) {
      addToast?.({ type: 'error', message: err.message || 'Erreur lors de la génération du lien' });
    }
  };

  // -----------------------------------------------------------------------
  // Group services
  // -----------------------------------------------------------------------
  const weeklyServices = services.filter(s => (WEEKLY_TYPES as readonly string[]).includes(s.type));
  const specialServices = services.filter(s => !(WEEKLY_TYPES as readonly string[]).includes(s.type));

  const groupedWeekly = WEEKLY_TYPES
    .map(type => ({ type, label: SERVICE_TYPE_LABELS[type] ?? type, items: weeklyServices.filter(s => s.type === type) }))
    .filter(g => g.items.length > 0);

  const specialTypes = Array.from(new Set(specialServices.map(s => s.type)));
  const groupedSpecial = specialTypes
    .map(type => ({ type, label: SERVICE_TYPE_LABELS[type] ?? type, items: specialServices.filter(s => s.type === type) }));

  const linksForService = (svcId: string, type: 'orator' | 'president') =>
    formLinks.find(l => l.service_id === svcId && l.link_type === type);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Chargement du programme…</span>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Info className="h-6 w-6" />
        <span className="text-sm">Module en cours de configuration</span>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-muted">
        <Calendar className="h-8 w-8 opacity-40" />
        <span className="text-sm">Aucun culte à venir</span>
        <span className="text-xs text-muted/60">Les prochaines planifications apparaîtront ici.</span>
      </div>
    );
  }

  const renderGroup = (group: { type: string; label: string; items: WorshipService[] }) => (
    <div key={group.type} className="space-y-2.5">
      <div className="flex items-center gap-2 pt-1">
        <span className={`inline-block h-2 w-2 rounded-full ${WORSHIP_TYPE_CONFIGS[group.type]?.color.replace('text-', 'bg-').replace('300', '400') ?? 'bg-cream'}`} />
        <span className={`text-xs font-medium uppercase tracking-wider ${WORSHIP_TYPE_CONFIGS[group.type]?.color ?? 'text-cream'}`}>{group.label}</span>
        <span className="text-[10px] text-muted">{group.items.length} culte{group.items.length > 1 ? 's' : ''}</span>
      </div>
      {group.items.map(svc => (
        <ServiceRow
          key={svc.id}
          service={svc}
          oratorForm={oratorForms[svc.id]?.form ?? null}
          oratorPoints={oratorForms[svc.id]?.points ?? []}
          orderItems={orderItemsMap[svc.id] ?? []}
          oratorLink={linksForService(svc.id, 'orator')}
          presidentLink={linksForService(svc.id, 'president')}
          onGenerateLink={handleGenerateLink}
          onRefresh={fetchServices}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MonitorPlay className={`h-5 w-5 ${accentColor ?? 'text-cream'}`} />
        <h3 className="text-base font-semibold text-cream">Centre Média et Communication</h3>
        <span className="text-[10px] text-muted ml-1">Planification complète des cultes</span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Cultes à venir', value: services.length, icon: Calendar, color: 'text-blue-400' },
          { label: 'Formulaires remplis', value: Object.keys(oratorForms).length, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Ordres créés', value: Object.keys(orderItemsMap).filter(k => orderItemsMap[k].length > 0).length, icon: BookOpen, color: 'text-purple-400' },
          { label: 'Liens générés', value: formLinks.length, icon: Send, color: 'text-amber-400' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <stat.icon className={`h-4 w-4 ${stat.color} shrink-0`} />
            <div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly programme */}
      {groupedWeekly.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cream/60" />
            <span className="text-sm font-medium text-cream/80">Programme hebdomadaire</span>
          </div>
          {groupedWeekly.map(renderGroup)}
        </div>
      )}

      {/* Special events */}
      {groupedSpecial.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-cream/60" />
            <span className="text-sm font-medium text-cream/80">Événements spéciaux</span>
          </div>
          {groupedSpecial.map(renderGroup)}
        </div>
      )}

      {/* Department Communications Inbox */}
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInbox(!showInbox)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4.5 w-4.5 text-cyan-400" />
            <span className="text-sm font-medium text-cream">Communications des d\u00e9partements</span>
            {deptMessages.filter(m => !m.is_read).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                {deptMessages.filter(m => !m.is_read).length} nouveau{deptMessages.filter(m => !m.is_read).length > 1 ? 'x' : ''}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${showInbox ? 'rotate-180' : ''}`} />
        </button>
        {showInbox && (
          <div className="border-t border-line/30 p-4 space-y-3 max-h-96 overflow-y-auto">
            {deptMessages.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted/40" />
                <p className="text-muted text-sm">Aucune communication re\u00e7ue</p>
                <p className="text-muted/60 text-xs mt-1">Les messages des autres d\u00e9partements appara\u00eetront ici.</p>
              </div>
            ) : (
              deptMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 border transition-colors ${!msg.is_read ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/2 border-line/20'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {!msg.is_read && <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />}
                      <p className="text-sm font-medium text-cream">{msg.title}</p>
                    </div>
                    <span className="text-[10px] text-muted shrink-0">
                      {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {msg.sender_dept && (
                    <p className="text-[10px] text-cyan-400/70 mb-1">De: {msg.sender_dept.name}</p>
                  )}
                  <p className="text-xs text-cream/70 line-clamp-3">{msg.content}</p>
                  {msg.priority === 'urgent' && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-red-400 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Urgent
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}