import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Church, Loader2, CheckCircle, AlertCircle, Plus, Trash2,
  ChevronUp, ChevronDown, Send, BookOpen, Mic, User,
  Info, ArrowLeft, AlertTriangle, Clock, MessageSquare, Eye,
} from '../lib/icons';
import { BIBLE_BOOKS, ORDER_ITEM_TYPES, SERVICE_TYPE_LABELS, WORSHIP_TYPE_CONFIGS, isTableNotFoundError, formatDate, formatTime, getDeadlineInfo } from '../components/admin/tabs/PlanificationTab';
import { openWhatsApp } from '../lib/whatsapp';
import type {
  WorshipFormLink, WorshipService, WorshipOratorForm, WorshipOratorPoint,
  WorshipOrderItem, WorshipOrderItemType,
} from '../types';

const FORM_LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuHDznVSbj77TcRuf-r0to8rCYGPa9lZ75G4Zm7hbC__8gp8d56nTozKyHZyybWU9xdaBURMxftyiZF-i4Zdp8XT_bJYNT-WVQWu3r32FHqxjRzt9cCMpPuHJJZryUrKgHbCiFJYnLg0boUgp8ATuXf_zhlyEhW-QlPQVcfIXjf8lrX2G3JGtujmvo3YKp_c94RqPQf5g8LvIBM1zRCErGSOVjRIw8SQ4aH3aliCJ-EOhKBq-PO5S3pZoaMuTk7u2iKCU';

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const ORATOR_POINT_FIELDS = { title: '', description: '' };
const DEFAULT_ORDER_ITEM = (pos: number): Omit<WorshipOrderItem, 'id' | 'service_id' | 'created_at'> => ({
  item_type: 'louange', custom_label: '', notes: '', duration_minutes: 10, position: pos,
});

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

interface CulteFormPageProps {
  token: string;
}

export function CulteFormPage({ token }: CulteFormPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Link & service data
  const [link, setLink] = useState<WorshipFormLink | null>(null);
  const [service, setService] = useState<WorshipService | null>(null);
  const [deadlineExpired, setDeadlineExpired] = useState(false);
  const [deadlineInfo, setDeadlineInfo] = useState<ReturnType<typeof getDeadlineInfo> | null>(null);

  // Orator form state
  const [oratorName, setOratorName] = useState('');
  const [theme, setTheme] = useState('');
  const [subTheme, setSubTheme] = useState('');
  const [bibleBook, setBibleBook] = useState('');
  const [bibleChapter, setBibleChapter] = useState('');
  const [bibleVerses, setBibleVerses] = useState('');
  const [summary, setSummary] = useState('');
  const [remarks, setRemarks] = useState('');
  const [points, setPoints] = useState<typeof ORATOR_POINT_FIELDS[]>([{ ...ORATOR_POINT_FIELDS }]);
  const [existingForm, setExistingForm] = useState<WorshipOratorForm | null>(null);
  const [existingPoints, setExistingPoints] = useState<WorshipOratorPoint[]>([]);

  // President order state
  const [presidentName, setPresidentName] = useState('');
  const [orderItems, setOrderItems] = useState<(typeof DEFAULT_ORDER_ITEM extends infer T ? T : never)[]>([DEFAULT_ORDER_ITEM(0)]);
  const [existingOrder, setExistingOrder] = useState<WorshipOrderItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isOrator = link?.link_type === 'orator';

  /* ── Send form content via WhatsApp ── */
  const sendViaWhatsApp = () => {
    const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
    let message = '';
    if (isOrator) {
      message = `*FORMULAIRE ORATEUR*\n`;
      message += `Culte: ${service ? formatDate(service.date) : ''} ${service ? formatTime(service.time) : ''}\n`;
      message += `Type: ${service ? (SERVICE_TYPE_LABELS[service.type] ?? service.type) : ''}\n\n`;
      message += `*Orateur:* ${oratorName || '-'}\n`;
      message += `*Thème:* ${theme || '-'}\n`;
      if (subTheme) message += `*Sous-thème:* ${subTheme}\n`;
      if (bibleBook) message += `*Verset:* ${bibleBook} ${bibleChapter || ''}:${bibleVerses || ''}\n`;
      if (points.some(p => p.title.trim())) {
        message += `\n*Points du message:*\n`;
        points.filter(p => p.title.trim()).forEach((p, i) => {
          message += `${i + 1}. ${p.title}`;
          if (p.description) message += ` — ${p.description}`;
          message += '\n';
        });
      }
      if (summary) message += `\n*Résumé:*\n${summary}\n`;
      if (remarks) message += `\n*Remarques:* ${remarks}\n`;
    } else {
      message = `*ORDRE DU CULTE*\n`;
      message += `Culte: ${service ? formatDate(service.date) : ''} ${service ? formatTime(service.time) : ''}\n`;
      message += `Type: ${service ? (SERVICE_TYPE_LABELS[service.type] ?? service.type) : ''}\n`;
      message += `Président: ${presidentName || '-'}\n\n`;
      orderItems.forEach((item, i) => {
        const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
        message += `${i + 1}. ${item.custom_label || label} (${item.duration_minutes} min)\n`;
        if (item.notes) message += `   Notes: ${item.notes}\n`;
      });
      const total = orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);
      message += `\n*Durée totale:* ${total} min`;
    }
    openWhatsApp(null, message);
  };

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get link by token
      const { data: linkData, error: linkErr } = await supabase
        .from('worship_form_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkErr || !linkData) {
        setError('Lien invalide ou introuvable.');
        setLoading(false);
        return;
      }

      // Check expiry
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        setError('Ce lien a expiré. Contactez le département média.');
        setLoading(false);
        return;
      }

      setLink(linkData as WorshipFormLink);

      // 2. Get service
      const { data: svcData } = await supabase
        .from('worship_services')
        .select('*')
        .eq('id', linkData.service_id)
        .single();

      if (svcData) {
        const svc = svcData as WorshipService;
        setService(svc);

        // Check 12h deadline
        if (svc.form_deadline_at) {
          const dlInfo = getDeadlineInfo(svc.form_deadline_at);
          setDeadlineInfo(dlInfo);
          if (dlInfo.isExpired) {
            setDeadlineExpired(true);
            setError(`La date limite pour soumettre ce formulaire est expirée (12h avant le culte).${svc.is_delayed ? ' Le culte est en retard, mais la deadline a déjà été repoussée.' : ''} Contactez le département média.`);
            setLoading(false);
            return;
          }
        }
      } else {
        setError('Service introuvable. Contactez le département média.');
        setLoading(false);
        return;
      }

      // 3. Load existing data based on type
      if (linkData.link_type === 'orator') {
        const { data: formData } = await supabase
          .from('worship_orator_forms')
          .select('*')
          .eq('service_id', linkData.service_id)
          .single();

        if (formData) {
          setExistingForm(formData as WorshipOratorForm);
          setOratorName(formData.orator_name || '');
          setTheme(formData.theme || '');
          setSubTheme(formData.sub_theme || '');
          setBibleBook(formData.bible_book || '');
          setBibleChapter(formData.bible_chapter || '');
          setBibleVerses(formData.bible_verses || '');
          setSummary(formData.summary || '');
          setRemarks(formData.remarks || '');

          // Load points
          const { data: ptsData } = await supabase
            .from('worship_orator_points')
            .select('*')
            .eq('form_id', formData.id)
            .order('position');

          if (ptsData && ptsData.length > 0) {
            const pts = ptsData as WorshipOratorPoint[];
            setExistingPoints(pts);
            setPoints(pts.map(p => ({ title: p.title, description: p.description || '' })));
          }
        } else {
          setOratorName(svcData?.orator_name || '');
        }
      } else {
        // President
        const { data: orderData } = await supabase
          .from('worship_order_items')
          .select('*')
          .eq('service_id', linkData.service_id)
          .order('position');

        if (orderData && orderData.length > 0) {
          const items = orderData as WorshipOrderItem[];
          setExistingOrder(items);
          setOrderItems(items.map(i => ({
            item_type: i.item_type,
            custom_label: i.custom_label || '',
            notes: i.notes || '',
            duration_minutes: i.duration_minutes,
            position: i.position,
          })));
        } else {
          setPresidentName(svcData?.president_name || '');
        }
      }
    } catch (err) {
      if (isTableNotFoundError(err)) {
        setError('Module en cours de configuration. Veuillez réessayer plus tard.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Submit orator form ── */
  const submitOratorForm = async () => {
    if (!link || !service) return;
    if (deadlineExpired) {
      setError('La date limite est expirée. Vous ne pouvez plus soumettre ce formulaire.');
      return;
    }
    if (!oratorName.trim() || !theme.trim()) {
      setError('Le nom et le thème sont obligatoires.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let formId = existingForm?.id;

      // Upsert orator form
      const { data: formData, error: formErr } = await supabase
        .from('worship_orator_forms')
        .upsert({
          id: formId || undefined,
          service_id: link.service_id,
          orator_name: oratorName.trim(),
          theme: theme.trim(),
          sub_theme: subTheme.trim() || null,
          bible_book: bibleBook || null,
          bible_chapter: bibleChapter || null,
          bible_verses: bibleVerses || null,
          summary: summary.trim() || null,
          remarks: remarks.trim() || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (formErr) throw formErr;
      formId = formData.id;

      // Delete old points
      if (existingForm) {
        await supabase.from('worship_orator_points').delete().eq('form_id', formId);
      }

      // Insert new points
      const ptsToInsert = points
        .filter(p => p.title.trim())
        .map((p, i) => ({
          form_id: formId,
          title: p.title.trim(),
          description: p.description.trim() || null,
          position: i,
        }));

      if (ptsToInsert.length > 0) {
        await supabase.from('worship_orator_points').insert(ptsToInsert);
      }

      // Update service status
      await supabase.from('worship_services').update({
        status: 'orator_submitted',
        orator_name: oratorName.trim(),
      }).eq('id', link.service_id);

      // Mark link as used
      await supabase.from('worship_form_links').update({ is_used: true }).eq('id', link.id);

      // Update local state (optimistic — no reload)
      setExistingForm({ ...formData, status: 'submitted', submitted_at: new Date().toISOString() } as WorshipOratorForm);
      setExistingPoints(ptsToInsert.map((p, i) => ({ id: `local_${i}`, form_id: formData.id, title: p.title, description: p.description || '', position: i, created_at: '' })) as WorshipOratorPoint[]);
      setSuccess(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Submit president form ── */
  const submitPresidentForm = async () => {
    if (!link || !service) return;
    if (deadlineExpired) {
      setError('La date limite est expirée. Vous ne pouvez plus soumettre ce formulaire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Delete old items
      await supabase.from('worship_order_items').delete().eq('service_id', link.service_id);

      // Insert new order
      const itemsToInsert = orderItems.map((item, i) => ({
        service_id: link.service_id,
        item_type: item.item_type,
        custom_label: item.custom_label.trim() || null,
        notes: item.notes.trim() || null,
        duration_minutes: item.duration_minutes || 10,
        position: i,
      }));

      if (itemsToInsert.length > 0) {
        await supabase.from('worship_order_items').insert(itemsToInsert);
      }

      // Update service status
      await supabase.from('worship_services').update({
        status: 'president_submitted',
        president_name: presidentName.trim() || service.president_name,
      }).eq('id', link.service_id);

      // Mark link as used
      await supabase.from('worship_form_links').update({ is_used: true }).eq('id', link.id);

      // Update local state (optimistic — no reload)
      const savedItems = itemsToInsert.map((item, i) => ({
        id: `local_${i}`,
        service_id: link.service_id,
        item_type: item.item_type,
        custom_label: item.custom_label,
        notes: item.notes,
        duration_minutes: item.duration_minutes,
        position: i,
        created_at: '',
      })) as WorshipOrderItem[];
      setExistingOrder(savedItems);
      setOrderItems(savedItems.map(i => ({
        item_type: i.item_type,
        custom_label: i.custom_label || '',
        notes: i.notes || '',
        duration_minutes: i.duration_minutes,
        position: i.position,
      })));
      setSuccess(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Point management ── */
  const addPoint = () => setPoints([...points, { ...ORATOR_POINT_FIELDS }]);
  const removePoint = (idx: number) => setPoints(points.filter((_, i) => i !== idx));
  const updatePoint = (idx: number, field: string, value: string) => {
    const updated = [...points];
    updated[idx] = { ...updated[idx], [field]: value };
    setPoints(updated);
  };

  /* ── Order item management ── */
  const addOrderItem = () => setOrderItems([...orderItems, DEFAULT_ORDER_ITEM(orderItems.length)]);
  const removeOrderItem = (idx: number) => setOrderItems(orderItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, position: i })));
  const updateOrderItem = (idx: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setOrderItems(updated);
  };
  const moveOrderItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= orderItems.length) return;
    const updated = [...orderItems];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setOrderItems(updated.map((item, i) => ({ ...item, position: i })));
  };

  /* ═══════════════════════════════════════════════════════════════
     Loading State
     ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
          <p className="text-sm text-muted">Chargement du formulaire…</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Shared Action Bar (visible in edit, preview, and after submission)
     ═══════════════════════════════════════════════════════════════ */
  const renderActionBar = () => {
    const isDisabled = submitting || !service || (isOrator ? (!oratorName.trim() || !theme.trim()) : orderItems.length === 0);
    return (
      <div className="sticky bottom-0 z-10 bg-bg/90 backdrop-blur-xl border-t border-line/30 pt-3 pb-4 -mx-4 px-4 mt-6">
        {success && (
          <div className="space-y-2 mb-3">
            <div className="rounded-xl p-3 flex items-center gap-2 text-xs bg-green-500/10 text-green-300 border border-green-500/20">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{isOrator ? 'Formulaire orateur soumis avec succès !' : 'Ordre du culte soumis avec succès !'}</span>
            </div>
            <p className="text-[10px] text-muted text-center">Redirection automatique dans 5 secondes…</p>
            <button
              onClick={() => { window.location.hash = '#home'; }}
              className="w-full py-2.5 text-xs font-medium text-center rounded-xl bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 transition-colors border border-accent-500/20"
            >
              Retourner sur le site
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)}
            className="flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 rounded-xl bg-white/5 text-cream hover:bg-white/10 transition-colors border border-line/30">
            <Eye className="h-4 w-4" />
            {showPreview ? 'Modifier' : 'Prévisualiser'}
          </button>
          <button onClick={sendViaWhatsApp}
            className="py-3.5 px-5 text-sm font-medium flex items-center justify-center gap-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors border border-green-500/30">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </button>
          <button
            onClick={isOrator ? submitOratorForm : submitPresidentForm}
            disabled={isDisabled}
            className="btn-gold flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 rounded-xl">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {success
              ? (isOrator ? 'Mettre à jour' : 'Mettre à jour')
              : (existingForm || existingOrder.length > 0
                ? (isOrator ? 'Mettre à jour et soumettre' : 'Mettre à jour l’ordre')
                : (isOrator ? 'Soumettre le formulaire' : 'Soumettre l’ordre du culte'))}
          </button>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Error State
     ═══════════════════════════════════════════════════════════════ */
  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-10 text-center max-w-md w-full">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-cream mb-2">Erreur</h2>
          <p className="text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Orator Form
     ═══════════════════════════════════════════════════════════════ */
  const renderOratorForm = () => (
    <div className="space-y-5">
      {/* Header info */}
      {service && (
        <div className="bg-accent-400/10 rounded-xl p-4 border border-accent-400/20">
          <div className="flex items-center gap-2 mb-1">
            <Church className="h-4 w-4 text-accent-400" />
            <span className="text-sm font-medium text-accent-400">
              {formatDate(service.date)} — {formatTime(service.time)}{WORSHIP_TYPE_CONFIGS[service.type]?.endTime ? `–${WORSHIP_TYPE_CONFIGS[service.type].endTime}` : ''}
            </span>
          </div>
          <p className="text-xs text-muted">{SERVICE_TYPE_LABELS[service.type]}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5">
          Nom de l'orateur <span className="text-red-400">*</span>
        </label>
        <input type="text" value={oratorName} onChange={e => setOratorName(e.target.value)}
          placeholder="Votre nom complet"
          className="input-surface w-full rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted/50" />
      </div>

      {/* Theme */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5">
          Thème principal <span className="text-red-400">*</span>
        </label>
        <input type="text" value={theme} onChange={e => setTheme(e.target.value)}
          placeholder="Le thème de votre message"
          className="input-surface w-full rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted/50" />
      </div>

      {/* Sub-theme */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5">Sous-thème (optionnel)</label>
        <input type="text" value={subTheme} onChange={e => setSubTheme(e.target.value)}
          placeholder="Sous-thème ou angle spécifique"
          className="input-surface w-full rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted/50" />
      </div>

      {/* Bible verse */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5 flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Verset biblique
        </label>
        <div className="grid grid-cols-6 gap-2">
          <div className="col-span-3">
            <select value={bibleBook} onChange={e => setBibleBook(e.target.value)}
              className="input-surface w-full rounded-xl px-3 py-3 text-sm text-cream">
              <option value="">Livre…</option>
              {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="col-span-1.5">
            <input type="text" value={bibleChapter} onChange={e => setBibleChapter(e.target.value)}
              placeholder="Chap." className="input-surface w-full rounded-xl px-3 py-3 text-sm text-cream placeholder:text-muted/50" />
          </div>
          <div className="col-span-1.5">
            <input type="text" value={bibleVerses} onChange={e => setBibleVerses(e.target.value)}
              placeholder="Verset" className="input-surface w-full rounded-xl px-3 py-3 text-sm text-cream placeholder:text-muted/50" />
          </div>
        </div>
      </div>

      {/* Points */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-cream">Grands points du message</label>
          <button onClick={addPoint} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {points.map((pt, idx) => (
            <div key={idx} className="bg-white/3 rounded-xl p-3 border border-line/20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{idx + 1}</span>
                <input type="text" value={pt.title} onChange={e => updatePoint(idx, 'title', e.target.value)}
                  placeholder="Titre du point"
                  className="input-surface flex-1 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted/50" />
                {points.length > 1 && (
                  <button onClick={() => removePoint(idx)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input type="text" value={pt.description} onChange={e => updatePoint(idx, 'description', e.target.value)}
                placeholder="Description / sous-points (optionnel)"
                className="input-surface w-full rounded-lg px-3 py-2 text-xs text-cream placeholder:text-muted/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5">Résumé du message (optionnel)</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
          placeholder="Un résumé de votre message pour l'équipe média…"
          className="input-surface w-full rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted/50 resize-none" />
      </div>

      {/* Remarks */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5">Remarques / avis (optionnel)</label>
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
          placeholder="Informations complémentaires pour le département média…"
          className="input-surface w-full rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted/50 resize-none" />
      </div>

    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     President Form (Reorderable Order)
     ═══════════════════════════════════════════════════════════════ */
  const renderPresidentForm = () => (
    <div className="space-y-5">
      {/* Header info */}
      {service && (
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Church className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">
              {formatDate(service.date)} — {formatTime(service.time)}{WORSHIP_TYPE_CONFIGS[service.type]?.endTime ? `–${WORSHIP_TYPE_CONFIGS[service.type].endTime}` : ''}
            </span>
          </div>
          <p className="text-xs text-muted">{SERVICE_TYPE_LABELS[service.type]}</p>
        </div>
      )}

      {/* President name */}
      <div>
        <label className="text-sm font-medium text-cream block mb-1.5">Votre nom</label>
        <input type="text" value={presidentName} onChange={e => setPresidentName(e.target.value)}
          placeholder="Nom du président de culte"
          className="input-surface w-full rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted/50" />
      </div>

      {/* Order items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-cream">Ordre du culte</label>
          <button onClick={addOrderItem} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Ajouter une étape
          </button>
        </div>

        <div className="space-y-2">
          {orderItems.map((item, idx) => {
            const typeLabel = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || '';
            return (
              <div key={idx} className="bg-white/3 rounded-xl p-3 border border-line/20 space-y-2">
                <div className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveOrderItem(idx, -1)} disabled={idx === 0}
                      className="p-0.5 rounded text-muted hover:text-cream disabled:opacity-30 transition-colors">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveOrderItem(idx, 1)} disabled={idx === orderItems.length - 1}
                      className="p-0.5 rounded text-muted hover:text-cream disabled:opacity-30 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/15 text-purple-400 text-xs font-bold shrink-0">{idx + 1}</span>

                  {/* Type selector */}
                  <select value={item.item_type} onChange={e => updateOrderItem(idx, 'item_type', e.target.value)}
                    className="input-surface flex-1 rounded-lg px-3 py-2 text-sm text-cream">
                    {ORDER_ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>

                  {/* Duration */}
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="number" value={item.duration_minutes} min={1} max={120}
                      onChange={e => updateOrderItem(idx, 'duration_minutes', parseInt(e.target.value) || 10)}
                      className="input-surface w-14 rounded-lg px-2 py-2 text-sm text-cream text-center" />
                    <span className="text-xs text-muted">min</span>
                  </div>

                  {/* Delete */}
                  {orderItems.length > 1 && (
                    <button onClick={() => removeOrderItem(idx)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Custom label (for "autre" type) */}
                {item.item_type === 'autre' && (
                  <input type="text" value={item.custom_label} onChange={e => updateOrderItem(idx, 'custom_label', e.target.value)}
                    placeholder="Précisez le type…"
                    className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted/50" />
                )}

                {/* Notes */}
                <input type="text" value={item.notes} onChange={e => updateOrderItem(idx, 'notes', e.target.value)}
                  placeholder="Notes ou détails (optionnel)"
                  className="input-surface w-full rounded-lg px-3 py-2 text-xs text-cream placeholder:text-muted/50" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Total duration */}
      <div className="bg-white/3 rounded-xl p-3 text-center">
        <span className="text-sm text-muted">Durée totale estimée : </span>
        <span className="text-sm font-medium text-cream">{orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0)} minutes</span>
      </div>

    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     Preview Render
     ═══════════════════════════════════════════════════════════════ */
  const renderPreview = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-4 w-4 text-accent-400" />
        <h2 className="text-base font-semibold text-cream">Prévisualisation</h2>
      </div>

      {isOrator ? (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Orateur</label>
              <p className="text-sm font-medium text-cream">{oratorName || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Thème principal</label>
              <p className="text-sm font-medium text-cream">{theme || '—'}</p>
            </div>
            {subTheme && (
              <div>
                <label className="text-xs text-muted block mb-1">Sous-thème</label>
                <p className="text-sm text-cream/80">{subTheme}</p>
              </div>
            )}
            {bibleBook && (
              <div>
                <label className="text-xs text-muted block mb-1">Verset biblique</label>
                <p className="text-sm text-cream/80">{bibleBook} {bibleChapter || ''}:{bibleVerses || ''}</p>
              </div>
            )}
          </div>
          {points.filter(p => p.title.trim()).length > 0 && (
            <div>
              <label className="text-xs text-muted block mb-2">Grands points du message</label>
              <div className="space-y-2">
                {points.filter(p => p.title.trim()).map((pt, i) => (
                  <div key={i} className="bg-white/3 rounded-lg p-3 border border-line/20">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-cream">{pt.title}</p>
                        {pt.description && <p className="text-xs text-muted mt-1">{pt.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary && (
            <div>
              <label className="text-xs text-muted block mb-1">Résumé du message</label>
              <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{summary}</p>
            </div>
          )}
          {remarks && (
            <div>
              <label className="text-xs text-muted block mb-1">Remarques</label>
              <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{remarks}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Président</label>
              <p className="text-sm font-medium text-cream">{presidentName || '—'}</p>
            </div>
          </div>
          <div className="divide-y divide-line/20">
            {orderItems.map((item, idx) => {
              const typeLabel = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
              return (
                <div key={idx} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/15 text-purple-400 text-xs font-bold shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cream">{item.custom_label || typeLabel}</p>
                    {item.notes && <p className="text-xs text-muted mt-0.5 truncate">{item.notes}</p>}
                  </div>
                  <span className="text-xs text-muted shrink-0">{item.duration_minutes} min</span>
                </div>
              );
            })}
          </div>
          <div className="bg-white/3 rounded-lg p-3 text-center">
            <span className="text-sm text-muted">Durée totale estimée : </span>
            <span className="text-sm font-medium text-cream">{orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0)} minutes</span>
          </div>
        </div>
      )}

    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     Main Render
     ═══════════════════════════════════════════════════════════════ */
  // Auto-redirect after successful submission
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      window.location.hash = '#home';
    }, 5000);
    return () => clearTimeout(timer);
  }, [success]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Branding header with logo */}
      <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-xl border-b border-line/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={FORM_LOGO} alt="La Conquête" className="h-9 w-9 rounded-full object-contain ring-2 ring-accent-500/30 bg-white/5 p-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-medium tracking-wide lowercase text-cream/50">église évangélique</span>
              <span className="text-cream/20">·</span>
              {isOrator ? <Mic className="h-3.5 w-3.5 text-amber-400" /> : <User className="h-3.5 w-3.5 text-purple-400" />}
            </div>
            <h1 className="text-sm font-semibold text-cream truncate">
              {isOrator ? 'Formulaire Orateur' : 'Formulaire Président de Culte'}
            </h1>
          </div>
          <span className="text-xs text-muted shrink-0">
            {service ? formatDate(service.date) : ''}
          </span>
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome banner — no account needed */}
        <div className="rounded-xl p-3.5 mb-5 flex items-start gap-3 bg-accent-400/8 text-cream/80 text-xs border border-accent-400/15">
          <img src={FORM_LOGO} alt="" className="h-8 w-8 rounded-full object-contain ring-1 ring-accent-500/20 bg-white/5 p-0.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-cream text-sm mb-0.5">
              Bienvenue — {isOrator ? 'Formulaire Orateur' : 'Formulaire Président'}
            </p>
            <p className="leading-relaxed">
              Vous n'avez pas besoin de compte pour remplir ce formulaire.
              Remplissez simplement les champs ci-dessous et appuyez sur Soumettre.
            </p>
          </div>
        </div>

        {/* Deadline warning banner */}
        {deadlineInfo && !deadlineExpired && deadlineInfo.hoursLeft < 6 && (
          <div className={`rounded-xl p-3 mb-4 flex items-start gap-2 text-xs border ${deadlineInfo.hoursLeft < 3 ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Attention : {deadlineInfo.label}</p>
              <p className="opacity-80 mt-0.5">Ce formulaire doit être soumis au plus tard 12 heures avant le culte.</p>
            </div>
          </div>
        )}
        {service?.is_delayed && !deadlineExpired && (
          <div className="bg-amber-500/10 rounded-xl p-3 mb-4 flex items-start gap-2 text-amber-300 text-xs border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Culte en retard de {service.delayed_minutes} minutes</p>
              <p className="opacity-80 mt-0.5">La deadline a été repoussée en conséquence.</p>
            </div>
          </div>
        )}

        {existingForm && isOrator && (
          <div className="bg-amber-500/10 rounded-xl p-3 mb-4 flex items-center gap-2 text-amber-300 text-xs border border-amber-500/20">
            <Info className="h-4 w-4 shrink-0" />
            Vous avez déjà soumis un formulaire. Modifiez et soumettez à nouveau pour mettre à jour.
          </div>
        )}
        {existingOrder.length > 0 && !isOrator && (
          <div className="bg-purple-500/10 rounded-xl p-3 mb-4 flex items-center gap-2 text-purple-300 text-xs border border-purple-500/20">
            <Info className="h-4 w-4 shrink-0" />
            Vous avez déjà soumis un ordre. Modifiez et soumettez à nouveau pour mettre à jour.
          </div>
        )}

        {showPreview ? renderPreview() : (isOrator ? renderOratorForm() : renderPresidentForm())}
        {renderActionBar()}
      </div>
    </div>
  );
}