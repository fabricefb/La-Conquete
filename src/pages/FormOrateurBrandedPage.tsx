import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { openWhatsApp } from '../lib/whatsapp';
import type { WorshipFormLink, WorshipService } from '../types';

const LOGO_URL = 'https://la-conquete.pages.dev/logo-conquete.png';
const CHURCH_PHOTO = 'https://la-conquete.pages.dev/church-photo-2.jpg';
const CHURCH_NAME = 'Eglise Evang\u00e9lique La Conqu\u00eate';
const CHURCH_PHOTO = 'https://la-conquete.pages.dev/church-photo-2.jpg';

/* CSS keyframes injected once */
const ANIM_STYLE_ID = 'form-orateur-anim-style';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes fo-fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fo-fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes fo-scaleIn { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
    @keyframes fo-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes fo-pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(212,168,67,.15)} 50%{box-shadow:0 0 40px rgba(212,168,67,.3)} }
    @keyframes fo-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes fo-slideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fo-borderGlow { 0%,100%{border-color:rgba(212,168,67,.25)} 50%{border-color:rgba(212,168,67,.5)} }
    .fo-fade-up { animation: fo-fadeUp .7s cubic-bezier(.22,1,.36,1) both; }
    .fo-fade-in { animation: fo-fadeIn .6s ease both; }
    .fo-scale-in { animation: fo-scaleIn .5s cubic-bezier(.22,1,.36,1) both; }
    .fo-float { animation: fo-float 4s ease-in-out infinite; }
    .fo-slide-down { animation: fo-slideDown .5s ease both; }
    .fo-stagger-1 { animation-delay: .08s; }
    .fo-stagger-2 { animation-delay: .16s; }
    .fo-stagger-3 { animation-delay: .24s; }
    .fo-stagger-4 { animation-delay: .32s; }
    .fo-stagger-5 { animation-delay: .40s; }
    .fo-stagger-6 { animation-delay: .48s; }
    .fo-stagger-7 { animation-delay: .56s; }
    .fo-stagger-8 { animation-delay: .64s; }
    .fo-input-focus { transition: all .25s cubic-bezier(.22,1,.36,1); }
    .fo-input-focus:focus { border-color: rgba(212,168,67,.5) !important; box-shadow: 0 0 0 3px rgba(212,168,67,.1); }
    .fo-btn-press { transition: all .2s cubic-bezier(.22,1,.36,1); }
    .fo-btn-press:active { transform: scale(.97); }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════════
   Branded Orator Form Page — accessible via #/form-orateur/{token}
   L'orateur ouvre le lien, remplit le formulaire en ligne,
   et les donn\u00e9es sont envoy\u00e9es directement \u00e0 Supabase.
   ═══════════════════════════════════════════════════════════════════ */

interface Props { token: string; }

/* ── Helpers ── */
function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['janvier','f\u00e9vrier','mars','avril','mai','juin','juillet','ao\u00fbt','septembre','octobre','novembre','d\u00e9cembre'];
  const weekdays = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const date = new Date(y, m - 1, d);
  return `${weekdays[date.getDay()]} ${d} ${months[m - 1]} ${y}`;
}

export function FormOrateurBrandedPage({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const [link, setLink] = useState<WorshipFormLink | null>(null);
  const [service, setService] = useState<WorshipService | null>(null);
  const [serviceNotes, setServiceNotes] = useState<string | null>(null);
  const [existingFormId, setExistingFormId] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

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
        setError('Ce lien a expir\u00e9. Contactez le d\u00e9partement m\u00e9dia.');
        setLoading(false);
        return;
      }

      setLink(linkData as WorshipFormLink);

      const { data: svcData } = await supabase
        .from('worship_services')
        .select('id,date,time,type,orator_name,president_name,status,notes')
        .eq('id', linkData.service_id)
        .single();

      if (svcData) {
        const safeSvc = {
          ...svcData,
          date: String(svcData.date ?? ''),
          time: String(svcData.time ?? ''),
          type: String(svcData.type ?? ''),
          orator_name: svcData.orator_name ? String(svcData.orator_name) : null,
          president_name: svcData.president_name ? String(svcData.president_name) : null,
          status: String(svcData.status ?? ''),
          notes: svcData.notes ? String(svcData.notes) : null,
        };
        setService(safeSvc as WorshipService);
        setServiceNotes(safeSvc.notes);
        const isPresident = linkData.link_type === 'president';
        const nameToPreFill = isPresident ? svcData.president_name : svcData.orator_name;
        if (nameToPreFill) {
          const parts = nameToPreFill.split(' ');
          if (parts.length > 1) {
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          } else {
            setLastName(nameToPreFill);
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
        setExistingFormId(formData.id);
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
          setVerses(prev => { const next = [...prev]; next[0] = v; return next; });
        }
        setSummary(formData.summary || '');
        setRemarks(formData.remarks || '');

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

  /* ── Loading timeout ── */
  useEffect(() => {
    const timer = setTimeout(() => { if (loading) setLoadTimedOut(true); }, 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Redirect after success ── */
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => { window.location.href = window.location.origin + '/'; }, 3000);
    return () => clearTimeout(timer);
  }, [success]);

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
      setError('Le nom et le th\u00e8me sont obligatoires.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
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

      const formPayload: Record<string, any> = {
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
      };
      if (existingFormId) { formPayload.id = existingFormId; }

      const { data: formData, error: formErr } = await supabase
        .from('worship_orator_forms')
        .upsert(formPayload, { onConflict: 'id' })
        .select()
        .single();

      if (formErr) throw formErr;

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

      await supabase.from('worship_services').update({
        status: 'orator_submitted',
        orator_name: oratorName,
      }).eq('id', link!.service_id);

      await supabase.from('worship_form_links').update({ is_used: true }).eq('id', link!.id);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la soumission. Utilisez le bouton WhatsApp comme alternative.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── WhatsApp fallback ── */
  const sendViaWhatsApp = () => {
    const oratorName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!oratorName || !theme.trim()) {
      setError('Remplissez au moins le nom et le th\u00e8me.');
      return;
    }
    const dateStr = service ? formatDateFr(service.date) : '';
    const timeStr = service?.time || '';

    let msg = `*FORMULAIRE ORATEUR*\n`;
    msg += `Culte: ${dateStr} ${timeStr}\n`;
    msg += `Type: ${service?.type || ''}\n\n`;
    msg += `*Orateur:* ${oratorName}\n`;
    msg += `*Th\u00e8me:* ${theme.trim()}\n`;
    if (subTheme.trim()) msg += `*Sous-th\u00e8me:* ${subTheme.trim()}\n`;

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
        if (p.description) msg += ` \u2014 ${p.description}`;
        msg += '\n';
      });
    }

    if (summary.trim()) msg += `\n*R\u00e9sum\u00e9:*\n${summary.trim()}\n`;
    if (remarks.trim()) msg += `\n*Remarques:* ${remarks.trim()}\n`;

    openWhatsApp(null, msg);
  };

  /* ═══════════════════════════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060D1D' }}>
        <div className="text-center fo-fade-in">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 fo-float" style={{ background: 'linear-gradient(135deg, rgba(212,168,67,.15), rgba(212,168,67,.05))', border: '1px solid rgba(212,168,67,.2)' }}>
            <img src={LOGO_URL} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#A0AAC3' }}>Chargement du formulaire\u2026</p>
          {loadTimedOut && (
            <div className="mt-4 fo-fade-up">
              <p className="text-xs mb-3" style={{ color: 'rgba(247,243,238,0.5)' }}>Le chargement est lent. V\u00e9rifiez votre connexion.</p>
              <button
                onClick={() => { setLoadTimedOut(false); loadData(); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold fo-btn-press"
                style={{ background: 'rgba(212,168,67,.15)', border: '1px solid rgba(212,168,67,.3)', color: '#D4A843', cursor: 'pointer' }}
              >
                R\u00e9essayer
              </button>
            </div>
          )}
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
        <div className="text-center max-w-md fo-scale-in">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(227,34,31,.1)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#F7F3EE', fontFamily: "'Playfair Display', serif" }}>Erreur</h2>
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#060D1D' }}>
        <div className="text-center max-w-md w-full p-10 rounded-3xl fo-scale-in" style={{ background: 'linear-gradient(145deg, #0F2147, #132a54)', border: '1px solid rgba(37,211,102,.2)' }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(37,211,102,.1)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Formulaire envoy\u00e9 !</h2>
          <p className="text-sm" style={{ color: '#A0AAC3', lineHeight: 1.7 }}>
            Merci ! Votre formulaire a \u00e9t\u00e9 soumis avec succ\u00e8s au d\u00e9partement de m\u00e9dia de la {CHURCH_NAME}.
          </p>
          <p className="text-xs mt-4" style={{ color: 'rgba(160,170,195,.5)' }}>Redirection vers la page d'accueil\u2026</p>
          <button
            onClick={() => { window.location.href = window.location.origin + '/'; }}
            className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold fo-btn-press"
            style={{ background: 'rgba(212,168,67,.12)', border: '1px solid rgba(212,168,67,.25)', color: '#D4A843', cursor: 'pointer' }}
          >
            Retour \u00e0 l'accueil
          </button>
        </div>
      </div>
    );
  }

  const safeService = service ? {
    ...service,
    date: typeof service.date === 'string' ? service.date : String(service.date ?? ''),
    time: typeof service.time === 'string' ? service.time : String(service.time ?? ''),
    type: typeof service.type === 'string' ? service.type : String(service.type ?? ''),
  } as WorshipService : null;

  const dateStr = safeService ? formatDateFr(safeService.date) : '';
  const timeStr = safeService?.time || '';
  const isPresident = link?.link_type === 'president';

  /* ═══════════════════════════════════════════════════════════════
     FORM RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: '#060D1D', color: '#F7F3EE', fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO BRANDING SECTION — Purely visual, NOT submitted with data
          ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        {/* Background image with overlay */}
        <div className="absolute inset-0 fo-fade-in">
          <img
            src={CHURCH_PHOTO}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(.35) saturate(1.2)' }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(6,13,29,.3) 0%, rgba(6,13,29,.6) 50%, #060D1D 100%)',
          }} />
          {/* Subtle animated accent lines */}
          <div className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(212,168,67,.03) 80px, rgba(212,168,67,.03) 81px)',
          }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4" style={{ paddingTop: 60, paddingBottom: 50 }}>
          {/* Logo with glow */}
          <div className="fo-fade-up fo-stagger-1" style={{ marginBottom: 20 }}>
            <div className="relative fo-float">
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 88,
                  height: 88,
                  background: 'linear-gradient(145deg, rgba(212,168,67,.18), rgba(212,168,67,.06))',
                  border: '2px solid rgba(212,168,67,.3)',
                  animation: 'fo-pulseGlow 3s ease-in-out infinite',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <img src={LOGO_URL} alt={CHURCH_NAME} style={{ width: 58, height: 58, objectFit: 'contain' }} />
              </div>
              {/* Corner accent dots */}
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: '#D4A843', opacity: .6 }} />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full" style={{ background: '#6A96E8', opacity: .5 }} />
            </div>
          </div>

          {/* Church name */}
          <h1
            className="fo-fade-up fo-stagger-2"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              fontWeight: 700,
              color: '#F7F3EE',
              letterSpacing: '-.01em',
              lineHeight: 1.2,
              marginBottom: 8,
              textShadow: '0 2px 20px rgba(0,0,0,.4)',
            }}
          >
            {CHURCH_NAME}
          </h1>

          {/* Divider line */}
          <div className="fo-fade-up fo-stagger-3 flex items-center gap-3" style={{ marginBottom: 12 }}>
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,67,.5))' }} />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#D4A843" style={{ opacity: .7 }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, rgba(212,168,67,.5), transparent)' }} />
          </div>

          {/* Form title */}
          <p
            className="fo-fade-up fo-stagger-3"
            style={{
              fontSize: '.85rem',
              fontWeight: 600,
              color: '#D4A843',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              marginBottom: 16,
              textShadow: '0 1px 10px rgba(0,0,0,.3)',
            }}
          >
            {isPresident ? 'Formulaire du Pr\u00e9sident de Culte' : "Formulaire de l'Orateur"}
          </p>

          {/* Service date badge */}
          {dateStr && (
            <div
              className="fo-fade-up fo-stagger-4 flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'rgba(247,243,238,.85)' }}>{dateStr}</span>
              {timeStr && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.2)' }}>&middot;</span>
                  <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'rgba(247,243,238,.85)' }}>{timeStr}</span>
                </>
              )}
              {safeService?.type && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.2)' }}>&middot;</span>
                  <span style={{ fontSize: '.75rem', color: '#6A96E8', fontWeight: 500 }}>{safeService.type}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom fade to content */}
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{
          background: 'linear-gradient(180deg, transparent, #060D1D)',
        }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FORM CONTENT
          ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-4" style={{ paddingBottom: 120, marginTop: -8 }}>

        {/* Deadline notice */}
        <div
          className="fo-fade-up fo-stagger-3 p-4 rounded-2xl mb-5 flex items-start gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(212,168,67,.08), rgba(212,168,67,.03))',
            border: '1px solid rgba(212,168,67,.15)',
            animation: 'fo-borderGlow 4s ease-in-out infinite',
          }}
        >
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,168,67,.12)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/></svg>
          </div>
          <div style={{ lineHeight: 1.7 }}>
            <span className="text-sm font-semibold" style={{ color: '#D4A843' }}>Important</span>
            <span className="text-sm" style={{ color: 'rgba(247,243,238,.75)' }}> \u2014 Ce formulaire doit \u00eatre rempli et envoy\u00e9 au moins </span>
            <span className="text-sm font-semibold" style={{ color: '#D4A843' }}>une heure avant le culte</span>
            <span className="text-sm" style={{ color: 'rgba(247,243,238,.75)' }}>, avec respect et diligence. Merci pour votre collaboration avec le d\u00e9partement de m\u00e9dia.</span>
          </div>
        </div>

        {/* Service notes from department */}
        {serviceNotes && (
          <div
            className="fo-fade-up fo-stagger-4 p-4 rounded-2xl mb-5"
            style={{
              background: 'rgba(106,150,232,.06)',
              border: '1px solid rgba(106,150,232,.12)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A96E8" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm font-semibold" style={{ color: '#6A96E8' }}>Message du d\u00e9partement</span>
            </div>
            <p className="text-sm pl-6" style={{ color: 'rgba(247,243,238,.8)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{serviceNotes}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="fo-slide-down p-3.5 rounded-2xl mb-4 flex items-center gap-2.5 text-sm" style={{ background: 'rgba(227,34,31,.08)', border: '1px solid rgba(227,34,31,.15)', color: '#f87171' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>

          {/* Section: Identity */}
          <div className="fo-fade-up fo-stagger-4 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,168,67,.15), rgba(212,168,67,.05))', border: '1px solid rgba(212,168,67,.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Identit\u00e9 de l'orateur</h2>
                <p className="text-xs" style={{ color: '#A0AAC3' }}>Votre nom tel qu'il appara\u00eetra sur le programme</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#A0AAC3' }}>
                  Pr\u00e9nom <span style={{ color: '#E3221F' }}>*</span>
                </label>
                <input
                  type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Ex: Jean" required
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none fo-input-focus"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#A0AAC3' }}>
                  Nom de famille <span style={{ color: '#E3221F' }}>*</span>
                </label>
                <input
                  type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Ex: Dupont" required
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none fo-input-focus"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
                />
              </div>
            </div>
          </div>

          {/* Section: Message Theme */}
          <div className="fo-fade-up fo-stagger-5 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(106,150,232,.15), rgba(106,150,232,.05))', border: '1px solid rgba(106,150,232,.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6A96E8" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Th\u00e8me du message</h2>
                <p className="text-xs" style={{ color: '#A0AAC3' }}>Le sujet central de votre pr\u00e9dication</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#A0AAC3' }}>
                Th\u00e8me principal <span style={{ color: '#E3221F' }}>*</span>
              </label>
              <input
                type="text" value={theme} onChange={e => setTheme(e.target.value)}
                placeholder="Ex: La puissance de la pri\u00e8re" required
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none fo-input-focus"
                style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#A0AAC3' }}>
                Sous-th\u00e8me <span className="font-normal" style={{ color: 'rgba(160,170,195,.5)' }}>(optionnel)</span>
              </label>
              <input
                type="text" value={subTheme} onChange={e => setSubTheme(e.target.value)}
                placeholder="Angle sp\u00e9cifique ou compl\u00e9ment"
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none fo-input-focus"
                style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
              />
            </div>
          </div>

          {/* Section: Bible Verses */}
          <div className="fo-fade-up fo-stagger-6 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(37,211,102,.15), rgba(37,211,102,.05))', border: '1px solid rgba(37,211,102,.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Versets bibliques</h2>
                <p className="text-xs" style={{ color: '#A0AAC3' }}>Les r\u00e9f\u00e9rences scripturaires de votre message</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verses.map((v, i) => (
                <div key={i} className="relative">
                  <span
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(212,168,67,.1)', color: '#D4A843', border: '1px solid rgba(212,168,67,.15)' }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text" value={v} onChange={e => updateVerse(i, e.target.value)}
                    placeholder={`Ex: Jean ${3 + i}:${16 + i * 3}`}
                    className="w-full rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none fo-input-focus"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section: Main Points */}
          <div className="fo-fade-up fo-stagger-7 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,.15), rgba(168,85,247,.05))', border: '1px solid rgba(168,85,247,.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Grands points du message</h2>
                <p className="text-xs" style={{ color: '#A0AAC3' }}>Structurez les parties cl\u00e9s de votre pr\u00e9dication</p>
              </div>
            </div>

            <div className="space-y-3">
              {points.map((pt, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl p-4 transition-all"
                  style={{
                    background: 'rgba(255,255,255,.02)',
                    border: '1px solid rgba(255,255,255,.07)',
                  }}
                >
                  {points.length > 1 && (
                    <button
                      type="button" onClick={() => removePoint(idx)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all fo-btn-press"
                      style={{ background: 'rgba(227,34,31,.06)', color: 'rgba(227,34,31,.5)', border: '1px solid rgba(227,34,31,.08)', cursor: 'pointer' }}
                    >
                      &times;
                    </button>
                  )}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'rgba(168,85,247,.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,.15)' }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      type="text" value={pt.title} onChange={e => updatePoint(idx, 'title', e.target.value)}
                      placeholder="Titre du point"
                      className="flex-1 rounded-xl px-4 py-3 text-sm outline-none fo-input-focus"
                      style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
                    />
                  </div>
                  <textarea
                    value={pt.description} onChange={e => updatePoint(idx, 'description', e.target.value)}
                    placeholder="Description / sous-points (optionnel)"
                    rows={2}
                    className="w-full rounded-xl px-4 py-3 text-xs outline-none fo-input-focus resize-none"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
                  />
                </div>
              ))}
            </div>
            <button
              type="button" onClick={addPoint}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all fo-btn-press"
              style={{ background: 'rgba(168,85,247,.06)', border: '1px dashed rgba(168,85,247,.25)', color: '#a855f7', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter un point
            </button>
          </div>

          {/* Section: Additional Info */}
          <div className="fo-fade-up fo-stagger-8 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(247,243,238,.08), rgba(247,243,238,.02))', border: '1px solid rgba(247,243,238,.1)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F7F3EE" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#F7F3EE' }}>Informations compl\u00e9mentaires</h2>
                <p className="text-xs" style={{ color: '#A0AAC3' }}>R\u00e9sum\u00e9 et remarques pour l'\u00e9quipe m\u00e9dia</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#A0AAC3' }}>
                R\u00e9sum\u00e9 du message <span className="font-normal" style={{ color: 'rgba(160,170,195,.5)' }}>(optionnel)</span>
              </label>
              <textarea
                value={summary} onChange={e => setSummary(e.target.value)}
                placeholder="Un r\u00e9sum\u00e9 de votre message pour l'\u00e9quipe m\u00e9dia..."
                rows={4}
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none fo-input-focus resize-y"
                style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE', minHeight: 100 }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#A0AAC3' }}>
                Remarques / avis <span className="font-normal" style={{ color: 'rgba(160,170,195,.5)' }}>(optionnel)</span>
              </label>
              <textarea
                value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Informations compl\u00e9mentaires pour le d\u00e9partement m\u00e9dia..."
                rows={3}
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none fo-input-focus resize-y"
                style={{ background: 'rgba(255,255,255,.04)', border: '1.5px solid rgba(255,255,255,.1)', color: '#F7F3EE' }}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center pt-8 mt-6 fo-fade-in" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div style={{ width: 24, height: 1, background: 'rgba(212,168,67,.3)' }} />
            <img src={LOGO_URL} alt="" style={{ width: 20, height: 20, objectFit: 'contain', opacity: .5 }} />
            <div style={{ width: 24, height: 1, background: 'rgba(212,168,67,.3)' }} />
          </div>
          <p className="text-xs font-semibold" style={{ color: '#D4A843' }}>D\u00e9partement de M\u00e9dia et Communication</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(160,170,195,.5)' }}>&copy; {new Date().getFullYear()} {CHURCH_NAME} \u2014 Tous droits r\u00e9serv\u00e9s</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          STICKY ACTION BAR
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 fo-fade-in"
        style={{
          background: 'rgba(6,13,29,.94)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          borderTop: '1px solid rgba(255,255,255,.06)',
          padding: '14px 16px',
        }}
      >
        <div className="max-w-2xl mx-auto flex gap-3">
          {/* WhatsApp button */}
          <button
            type="button" onClick={sendViaWhatsApp}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold fo-btn-press"
            style={{
              background: 'rgba(37,211,102,.1)',
              border: '1.5px solid rgba(37,211,102,.2)',
              color: '#25D366',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Submit button */}
          <button
            type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold fo-btn-press disabled:opacity-50"
            style={{
              background: submitting
                ? '#b8942f'
                : 'linear-gradient(135deg, #D4A843 0%, #c49a3a 50%, #b8922f 100%)',
              color: '#0F2147',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: submitting ? 'none' : '0 4px 20px rgba(212,168,67,.25)',
            }}
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Confirmer et envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
