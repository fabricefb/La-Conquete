import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { openWhatsApp } from '../lib/whatsapp';
import type { WorshipFormLink, WorshipService } from '../types';

const LOGO_URL = 'https://la-conquete.pages.dev/logo-conquete.png';
const CHURCH_NAME = 'Église Évangélique La Conquête';

/* ═══════════════════════════════════════════════════════════════════
   Branded Orator Form Page — accessible via #/form-orateur/{token}
   L'orateur ouvre le lien, remplit le formulaire en ligne,
   et les données sont envoyées directement à Supabase.
   ═══════════════════════════════════════════════════════════════════ */

interface Props { token: string; }

/* ── Helpers ── */
function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const weekdays = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const date = new Date(y, m - 1, d);
  return `${weekdays[date.getDay()]} ${d} ${months[m - 1]} ${y}`;
}

export function FormOrateurBrandedPage({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [link, setLink] = useState<WorshipFormLink | null>(null);
  const [service, setService] = useState<WorshipService | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [theme, setTheme] = useState('');
  const [subTheme, setSubTheme] = useState('');
  const [verses, setVerses] = useState(['', '', '', '']);
  const [points, setPoints] = useState<{ title: string; description: string }[]>([{ title: '', description: '' }]);
  const [summary, setSummary] = useState('');
  const [remarks, setRemarks] = useState('');

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        setError('Ce lien a expiré. Contactez le département média.');
        setLoading(false);
        return;
      }

      setLink(linkData as WorshipFormLink);

      const { data: svcData } = await supabase
        .from('worship_services')
        .select('id,date,time,type,orator_name,president_name,status')
        .eq('id', linkData.service_id)
        .single();

      if (svcData) {
        setService(svcData as WorshipService);
        // Pre-fill name if available
        if (svcData.orator_name) {
          const parts = svcData.orator_name.split(' ');
          if (parts.length > 1) {
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          } else {
            setLastName(svcData.orator_name);
          }
        }
      } else {
        setError('Service introuvable.');
        setLoading(false);
        return;
      }

      // Load existing form data if already submitted
      const { data: formData } = await supabase
        .from('worship_orator_forms')
        .select('*')
        .eq('service_id', linkData.service_id)
        .maybeSingle();

      if (formData) {
        if (formData.orator_name) {
          const parts = formData.orator_name.split(' ');
          if (parts.length > 1) {
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          } else {
            setLastName(formData.orator_name);
          }
        }
        setTheme(formData.theme || '');
        setSubTheme(formData.sub_theme || '');
        if (formData.bible_book) {
          const v = [formData.bible_book, formData.bible_chapter, formData.bible_verses].filter(Boolean).join(' ');
          setVerses(prev => {
            const next = [...prev];
            next[0] = v;
            return next;
          });
        }
        setSummary(formData.summary || '');
        setRemarks(formData.remarks || '');

        // Load existing points
        const { data: ptsData } = await supabase
          .from('worship_orator_points')
          .select('*')
          .eq('form_id', formData.id)
          .order('position');

        if (ptsData && ptsData.length > 0) {
          setPoints(ptsData.map((p: any) => ({ title: p.title || '', description: p.description || '' })));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Points management ── */
  const addPoint = () => setPoints([...points, { title: '', description: '' }]);
  const removePoint = (idx: number) => {
    if (points.length <= 1) return;
    setPoints(points.filter((_, i) => i !== idx));
  };
  const updatePoint = (idx: number, field: 'title' | 'description', value: string) => {
    const updated = [...points];
    updated[idx] = { ...updated[idx], [field]: value };
    setPoints(updated);
  };
  const updateVerse = (idx: number, value: string) => {
    const updated = [...verses];
    updated[idx] = value;
    setVerses(updated);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    const oratorName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!oratorName || !theme.trim()) {
      setError('Le nom et le thème sont obligatoires.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Parse first verse for bible_book, bible_chapter, bible_verses
      let bible_book: string | null = null;
      let bible_chapter: string | null = null;
      let bible_verses: string | null = null;
      const firstVerse = verses.find(v => v.trim());
      if (firstVerse) {
        const match = firstVerse.match(/^(.+?)\s+(\d+)(?::([\d\-]+))?$/);
        if (match) {
          bible_book = match[1].trim();
          bible_chapter = match[2];
          bible_verses = match[3] || '';
        } else {
          bible_book = firstVerse.trim();
        }
      }

      // 1. Upsert orator form
      const { data: formData, error: formErr } = await supabase
        .from('worship_orator_forms')
        .upsert({
          service_id: link!.service_id,
          orator_name: oratorName,
          theme: theme.trim(),
          sub_theme: subTheme.trim() || null,
          bible_book,
          bible_chapter,
          bible_verses,
          summary: summary.trim() || null,
          remarks: remarks.trim() || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (formErr) throw formErr;

      // 2. Delete old points and insert new ones
      if (formData.id) {
        await supabase.from('worship_orator_points').delete().eq('form_id', formData.id);

        const ptsToInsert = points
          .filter(p => p.title.trim())
          .map((p, i) => ({
            form_id: formData.id,
            title: p.title.trim(),
            description: p.description.trim() || null,
            position: i,
          }));

        if (ptsToInsert.length > 0) {
          await supabase.from('worship_orator_points').insert(ptsToInsert);
        }
      }

      // 3. Update service status
      await supabase.from('worship_services').update({
        status: 'orator_submitted',
        orator_name: oratorName,
      }).eq('id', link!.service_id);

      // 4. Mark link as used
      await supabase.from('worship_form_links').update({ is_used: true }).eq('id', link!.id);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission. Utilisez le bouton WhatsApp comme alternative.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── WhatsApp fallback ── */
  const sendViaWhatsApp = () => {
    const oratorName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!oratorName || !theme.trim()) {
      setError('Remplissez au moins le nom et le thème.');
      return;
    }

    const dateStr = service ? formatDateFr(service.date) : '';
    const timeStr = service?.time || '';

    let msg = `*FORMULAIRE ORATEUR*\n`;
    msg += `Culte: ${dateStr} ${timeStr}\n`;
    msg += `Type: ${service?.type || ''}\n\n`;
    msg += `*Orateur:* ${oratorName}\n`;
    msg += `*Thème:* ${theme.trim()}\n`;
    if (subTheme.trim()) msg += `*Sous-thème:* ${subTheme.trim()}\n`;

    const filledVerses = verses.filter(v => v.trim());
    if (filledVerses.length > 0) {
      msg += `\n*Versets bibliques:*\n`;
      filledVerses.forEach((v, i) => { msg += `${i + 1}. ${v}\n`; });
    }

    const filledPoints = points.filter(p => p.title.trim());
    if (filledPoints.length > 0) {
      msg += `\n*Grands points du message:*\n`;
      filledPoints.forEach((p, i) => {
        msg += `${i + 1}. ${p.title}`;
        if (p.description) msg += ` — ${p.description}`;
        msg += '\n';
      });
    }

    if (summary.trim()) msg += `\n*Résumé:*\n${summary.trim()}\n`;
    if (remarks.trim()) msg += `\n*Remarques:* ${remarks.trim()}\n`;

    openWhatsApp(null, msg);
  };

  /* ═══════════════════════════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060D1D' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
          <p className="text-sm" style={{ color: '#A0AAC3' }}>Chargement du formulaire…</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     ERROR
     ═══════════════════════════════════════════════════════════════ */
  if (error && !link) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#060D1D' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(227,34,31,0.12)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#F7F3EE' }}>Erreur</h2>
          <p className="text-sm" style={{ color: '#A0AAC3' }}>{error}</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     SUCCESS
     ═══════════════════════════════════════════════════════════════ */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'rgba(6,13,29,0.95)' }}>
        <div className="text-center max-w-md w-full p-10 rounded-2xl" style={{ background: '#0F2147', border: '1px solid rgba(37,211,102,0.2)' }}>
          <div className="w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-5" style={{ width: 72, height: 72, background: 'rgba(37,211,102,0.12)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Formulaire envoyé !</h2>
          <p className="text-sm mb-1" style={{ color: '#A0AAC3', lineHeight: 1.6 }}>
            Merci ! Votre formulaire a été soumis avec succès au département de média de la {CHURCH_NAME}.
          </p>
          <p className="text-xs mt-4" style={{ color: 'rgba(160,170,195,0.6)' }}>Vous pouvez fermer cette page.</p>
        </div>
      </div>
    );
  }

  const dateStr = service ? formatDateFr(service.date) : '';
  const timeStr = service?.time || '';

  /* ═══════════════════════════════════════════════════════════════
     FORM
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: '#060D1D', color: '#F7F3EE', fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #0F2147 0%, #1a2d5a 100%)', borderBottom: '3px solid #D4A843', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={LOGO_URL} alt={CHURCH_NAME} className="rounded-full object-contain" style={{ width: 48, height: 48, border: '2px solid rgba(212,168,67,0.3)', background: 'rgba(255,255,255,0.05)', padding: 3 }} />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Formulaire Orateur</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs lowercase tracking-wide" style={{ color: 'rgba(247,243,238,0.5)', fontWeight: 500 }}>{CHURCH_NAME}</span>
              <span style={{ color: 'rgba(247,243,238,0.2)' }}>·</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </div>
          </div>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.25)', color: '#D4A843' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {dateStr}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-2xl mx-auto px-4 py-6" style={{ paddingBottom: 110 }}>

        {/* Welcome banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: 'rgba(106,150,232,0.08)', border: '1px solid rgba(106,150,232,0.15)' }}>
          <img src={LOGO_URL} alt="" className="rounded-full object-contain shrink-0 mt-0.5" style={{ width: 36, height: 36, border: '1px solid rgba(106,150,232,0.2)', background: 'rgba(255,255,255,0.05)', padding: 3 }} />
          <div className="text-sm" style={{ color: 'rgba(247,243,238,0.8)', lineHeight: 1.6 }}>
            <strong className="block text-sm mb-0.5" style={{ color: '#F7F3EE' }}>Merci de visiter notre plateforme</strong>
            Remplissez les informations ci-dessous pour préparer votre message. Vous n'avez pas besoin de compte — soumettez simplement le formulaire.
          </div>
        </div>

        {/* Service info */}
        {service && (
          <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(106,150,232,0.08)', border: '1px solid rgba(106,150,232,0.15)' }}>
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A96E8" strokeWidth="2"><path d="m18 2 4 4-4 4"/><path d="m18 6H5a2 2 0 0 0-2 2v1a6 6 0 0 0 6 6h0a6 6 0 0 1 6 6v1"/></svg>
              <span className="text-sm font-semibold" style={{ color: '#6A96E8' }}>{dateStr} — {timeStr}</span>
            </div>
            <p className="text-xs ml-6" style={{ color: '#A0AAC3' }}>{service.type}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl mb-4 flex items-center gap-2 text-xs" style={{ background: 'rgba(227,34,31,0.1)', border: '1px solid rgba(227,34,31,0.2)', color: '#f87171' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>

          {/* Section title */}
          <div className="flex items-center gap-2.5 mb-6">
            <div style={{ width: 4, height: 24, background: '#D4A843', borderRadius: 2 }} />
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Informations du message</h2>
          </div>

          {/* Nom (2 champs) */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#F7F3EE' }}>
              Nom de l'orateur <span style={{ color: '#E3221F' }}>*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Prénom" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
              />
              <input
                type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Nom de famille" required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
              />
            </div>
          </div>

          {/* Thème */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#F7F3EE' }}>
              Thème principal <span style={{ color: '#E3221F' }}>*</span>
            </label>
            <input
              type="text" value={theme} onChange={e => setTheme(e.target.value)}
              placeholder="Le thème de votre message" required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
            />
          </div>

          {/* Sous-thème */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#F7F3EE' }}>
              Sous-thème <span className="font-normal" style={{ color: '#A0AAC3' }}>(optionnel)</span>
            </label>
            <input
              type="text" value={subTheme} onChange={e => setSubTheme(e.target.value)}
              placeholder="Sous-thème ou angle spécifique"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
            />
          </div>

          {/* 4 Versets bibliques */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#F7F3EE' }}>
              Versets bibliques <span className="font-normal" style={{ color: '#A0AAC3' }}>(optionnel)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verses.map((v, i) => (
                <div key={i} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(212,168,67,0.12)', color: '#D4A843' }}>
                    {i + 1}
                  </span>
                  <input
                    type="text" value={v} onChange={e => updateVerse(i, e.target.value)}
                    placeholder={`Ex: Jean ${3 + i}:${16 + i * 3}`}
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Grands points */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-3" style={{ color: '#F7F3EE' }}>
              Les grands points du message
            </label>
            <div className="space-y-3">
              {points.map((pt, idx) => (
                <div key={idx} className="relative rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {points.length > 1 && (
                    <button
                      type="button" onClick={() => removePoint(idx)}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all"
                      style={{ background: 'rgba(227,34,31,0.08)', color: 'rgba(227,34,31,0.6)', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(227,34,31,0.15)'; (e.target as HTMLElement).style.color = '#E3221F'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(227,34,31,0.08)'; (e.target as HTMLElement).style.color = 'rgba(227,34,31,0.6)'; }}
                    >
                      ×
                    </button>
                  )}
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(106,150,232,0.12)', color: '#6A96E8' }}>
                      {idx + 1}
                    </span>
                    <input
                      type="text" value={pt.title} onChange={e => updatePoint(idx, 'title', e.target.value)}
                      placeholder="Titre du point"
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
                    />
                  </div>
                  <textarea
                    value={pt.description} onChange={e => updatePoint(idx, 'description', e.target.value)}
                    placeholder="Description / sous-points (optionnel)"
                    rows={2}
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
                  />
                </div>
              ))}
            </div>
            <button
              type="button" onClick={addPoint}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'none', border: '1px dashed rgba(106,150,232,0.3)', color: '#6A96E8', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter un point
            </button>
          </div>

          {/* Résumé */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#F7F3EE' }}>
              Résumé du message <span className="font-normal" style={{ color: '#A0AAC3' }}>(optionnel)</span>
            </label>
            <textarea
              value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="Un résumé de votre message pour l'équipe média…"
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-y"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE', minHeight: 100 }}
            />
          </div>

          {/* Remarques */}
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#F7F3EE' }}>
              Remarques / avis <span className="font-normal" style={{ color: '#A0AAC3' }}>(optionnel)</span>
            </label>
            <textarea
              value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Informations complémentaires pour le département média…"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-y"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#F7F3EE' }}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="text-center pt-8 mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold" style={{ color: '#D4A843' }}>Département de Média et Communication</p>
          <p className="text-xs mt-1" style={{ color: '#A0AAC3' }}>&copy; {new Date().getFullYear()} {CHURCH_NAME} — Tous droits réservés</p>
        </div>
      </div>

      {/* ── STICKY ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'rgba(6,13,29,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          {/* WhatsApp */}
          <button
            type="button" onClick={sendViaWhatsApp}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)', color: '#25D366', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>

          {/* Submit */}
          <button
            type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{
              background: submitting ? '#b8942f' : 'linear-gradient(135deg, #D4A843 0%, #c49a3a 100%)',
              color: '#0F2147',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Confirmer et envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}