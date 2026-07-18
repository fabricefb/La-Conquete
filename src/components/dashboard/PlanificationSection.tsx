import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Church, Calendar, Mic, User, ChevronDown,
  Loader2, Info, Clock, CheckCircle, AlertCircle, BookOpen,
  Send, Copy, Eye, AlertTriangle, Timer,
} from '../../lib/icons';
import { BIBLE_BOOKS, ORDER_ITEM_TYPES, SERVICE_TYPE_LABELS, STATUS_CONFIG, WORSHIP_TYPE_CONFIGS, isTableNotFoundError, formatDate, getDeadlineInfo } from '../admin/tabs/PlanificationTab';
import type {
  WorshipService, WorshipOratorForm, WorshipOratorPoint,
  WorshipOrderItem, WorshipFormLink,
} from '../../types';

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

type SubSection = 'prochains_cultes' | 'mes_formulaires' | 'mes_envois';

const SUB_SECTIONS: { key: SubSection; label: string; Icon: typeof Church }[] = [
  { key: 'prochains_cultes', label: 'Prochains cultes', Icon: Calendar },
  { key: 'mes_formulaires', label: 'Mes formulaires', Icon: Mic },
  { key: 'mes_envois', label: 'Mes envois WhatsApp', Icon: Send },
];

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

interface PlanificationSectionProps {
  accentColor?: string;
}

export function PlanificationSection({ accentColor }: PlanificationSectionProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const accent = accentColor || '#D4875A';

  const [openSections, setOpenSections] = useState<Set<SubSection>>(new Set(['prochains_cultes']));
  const [loading, setLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);

  /* ── Data ── */
  const [services, setServices] = useState<WorshipService[]>([]);
  const [oratorForms, setOratorForms] = useState<Record<string, { form: WorshipOratorForm; points: WorshipOratorPoint[] }>>({});
  const [orderItems, setOrderItems] = useState<Record<string, WorshipOrderItem[]>>({});
  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const toggleSection = (key: SubSection) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setModuleError(false);
    try {
      const [svcRes, linksRes] = await Promise.allSettled([
        supabase.from('worship_services').select('*').order('date', { ascending: true }).limit(20),
        supabase.from('worship_form_links').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      let svcs: WorshipService[] = [];
      if (svcRes.status === 'fulfilled' && svcRes.value.data) {
        svcs = (svcRes.value.data as WorshipService[]).filter(s => {
          const d = new Date(s.date);
          return d >= new Date(new Date().toDateString());
        });
        setServices(svcs);
      } else if (svcRes.status === 'rejected' && isTableNotFoundError(svcRes.reason)) {
        setModuleError(true);
      }

      if (linksRes.status === 'fulfilled' && linksRes.value.data) {
        setFormLinks(linksRes.value.data as WorshipFormLink[]);
      }

      // Fetch orator forms and order items for all services
      for (const svc of svcs) {
        const [formRes, orderRes] = await Promise.allSettled([
          supabase.from('worship_orator_forms').select('*').eq('service_id', svc.id).single(),
          supabase.from('worship_order_items').select('*').eq('service_id', svc.id).order('position'),
        ]);

        if (formRes.status === 'fulfilled' && formRes.value.data) {
          const form = formRes.value.data as WorshipOratorForm;
          const { data: ptsData } = await supabase.from('worship_orator_points').select('*').eq('form_id', form.id).order('position');
          setOratorForms(prev => ({
            ...prev,
            [svc.id]: { form, points: (ptsData as WorshipOratorPoint[]) || [] },
          }));
        }

        if (orderRes.status === 'fulfilled' && orderRes.value.data) {
          setOrderItems(prev => ({
            ...prev,
            [svc.id]: orderRes.value.data as WorshipOrderItem[],
          }));
        }
      }
    } catch (err) {
      if (isTableNotFoundError(err)) setModuleError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Helpers ── */
  const linksForService = (svcId: string, type: 'orator' | 'president') =>
    formLinks.filter(l => l.service_id === svcId && l.link_type === type);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/#/form-culte/${token}`);
    addToast({ type: 'success', message: 'Lien copi\u00e9' });
  };

  const openWhatsApp = (link: WorshipFormLink) => {
    const formType = link.link_type === 'orator' ? 'orateur' : 'pr\u00e9sident';
    const svc = services.find(s => s.id === link.service_id);
    const dateStr = svc ? formatDate(svc.date) : '';
    const message = `Bonjour ${link.recipient_name || ''},\n\nVoici le lien pour remplir le formulaire ${formType} du culte du ${dateStr} :\n\n${BASE_URL}/#/form-culte/${link.token}\n\nCe lien expire dans 7 jours.`;
    const phone = (link.recipient_phone || '').replace(/[^0-9]/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    supabase.from('worship_form_links').update({ sent_at: new Date().toISOString() }).eq('id', link.id);
  };

  /* ═══════════════════════════════════════════════════════════════
     Module Error
     ═══════════════════════════════════════════════════════════════ */
  if (moduleError) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <Info className="h-8 w-8 text-muted mx-auto mb-3" />
        <p className="text-sm text-muted">Module en cours de configuration</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Section Renderers
     ═══════════════════════════════════════════════════════════════ */

  const renderProchainsCultes = () => {
    if (services.length === 0) {
      return <p className="text-sm text-muted py-4 text-center">Aucun culte \u00e0 venir</p>;
    }
    return (
      <div className="space-y-2">
        {services.map(svc => {
          const st = STATUS_CONFIG[svc.status];
          const hasOratorForm = !!oratorForms[svc.id];
          const hasOrder = (orderItems[svc.id]?.length || 0) > 0;
          const dlInfo = svc.form_deadline_at ? getDeadlineInfo(svc.form_deadline_at) : null;

          return (
            <div key={svc.id} className={`bg-white/3 rounded-lg p-3 border ${svc.is_delayed ? 'border-red-500/25' : 'border-line/15'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-cream">{formatDate(svc.date)} &mdash; {svc.time}</p>
                  {svc.is_delayed && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      RETARD
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {dlInfo && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 ${dlInfo.cls}`}>
                      <Timer className="h-2.5 w-2.5" />
                      {dlInfo.label}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>{st.label}</span>
                </div>
              </div>
              <p className={`text-xs ${WORSHIP_TYPE_CONFIGS[svc.type]?.color || 'text-muted'}`}>{SERVICE_TYPE_LABELS[svc.type]} {svc.orator_name ? `\u00b7 ${svc.orator_name}` : ''}</p>
              <div className="flex gap-3 mt-2">
                <span className={`text-[10px] flex items-center gap-1 ${hasOratorForm ? 'text-green-400' : 'text-muted'}`}>
                  {hasOratorForm ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  Orateur
                </span>
                <span className={`text-[10px] flex items-center gap-1 ${hasOrder ? 'text-green-400' : 'text-muted'}`}>
                  {hasOrder ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  Ordre
                </span>
              </div>
              {/* WhatsApp actions for department members */}
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-line/20">
                {linksForService(svc.id, 'orator').map(link => (
                  <React.Fragment key={link.id}>
                    <button onClick={() => copyLink(link.token)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-muted hover:text-cream transition-colors" title="Copier lien orateur">
                      <Copy className="h-3 w-3" /><span className="text-[10px]">Orateur</span>
                    </button>
                    <button onClick={() => openWhatsApp(link)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 transition-colors" title="WhatsApp orateur">
                      <Send className="h-3 w-3" /><span className="text-[10px]">WA</span>
                    </button>
                  </React.Fragment>
                ))}
                {linksForService(svc.id, 'orator').length === 0 && (
                  <span className="text-[10px] text-muted/50 italic">Lien orateur non g\u00e9n\u00e9r\u00e9</span>
                )}
              </div>
              <div className="flex gap-1.5 mt-1">
                {linksForService(svc.id, 'president').map(link => (
                  <React.Fragment key={link.id}>
                    <button onClick={() => copyLink(link.token)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-muted hover:text-cream transition-colors" title="Copier lien pr\u00e9sident">
                      <Copy className="h-3 w-3" /><span className="text-[10px]">Pr\u00e9sident</span>
                    </button>
                    <button onClick={() => openWhatsApp(link)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400/70 hover:text-green-400 transition-colors" title="WhatsApp pr\u00e9sident">
                      <Send className="h-3 w-3" /><span className="text-[10px]">WA</span>
                    </button>
                  </React.Fragment>
                ))}
                {linksForService(svc.id, 'president').length === 0 && (
                  <span className="text-[10px] text-muted/50 italic">Lien pr\u00e9sident non g\u00e9n\u00e9r\u00e9</span>
                )}
              </div>
              {selectedServiceId === svc.id && (
                <div className="mt-3 pt-3 border-t border-line/20 space-y-2">
                  {/* Orator form preview */}
                  {oratorForms[svc.id] && (
                    <div className="bg-amber-500/5 rounded-lg p-2.5 border border-amber-500/10">
                      <p className="text-[10px] text-amber-400 font-medium mb-1">FORMULAIRE ORATEUR</p>
                      <p className="text-xs font-medium text-cream">{oratorForms[svc.id].form.theme}</p>
                      {oratorForms[svc.id].form.bible_book && (
                        <p className="text-[10px] text-muted mt-0.5">
                          <BookOpen className="h-3 w-3 inline mr-0.5" />
                          {oratorForms[svc.id].form.bible_book} {oratorForms[svc.id].form.bible_chapter}:{oratorForms[svc.id].form.bible_verses}
                        </p>
                      )}
                      {oratorForms[svc.id].points.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {oratorForms[svc.id].points.map(p => (
                            <li key={p.id} className="text-[10px] text-muted">\u2022 {p.title}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {/* Order preview */}
                  {orderItems[svc.id] && orderItems[svc.id].length > 0 && (
                    <div className="bg-purple-500/5 rounded-lg p-2.5 border border-purple-500/10">
                      <p className="text-[10px] text-purple-400 font-medium mb-1">ORDRE DU CULTE</p>
                      {orderItems[svc.id].map((item, i) => {
                        const label = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
                        return (
                          <p key={item.id} className="text-[10px] text-muted">
                            {i + 1}. {item.custom_label || label} ({item.duration_minutes} min)
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setSelectedServiceId(selectedServiceId === svc.id ? null : svc.id)}
                className="text-[10px] text-accent-400 hover:text-accent-300 mt-1.5 flex items-center gap-1 transition-colors">
                <Eye className="h-3 w-3" />
                {selectedServiceId === svc.id ? 'Masquer les d\u00e9tails' : 'Voir les d\u00e9tails'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMesFormulaires = () => (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-3">Les formulaires soumis par les orateurs et pr\u00e9sidents apparaissent ici une fois remplis.</p>
      {Object.entries(oratorForms).length === 0 && (
        <p className="text-sm text-muted py-4 text-center">Aucun formulaire soumis</p>
      )}
      {Object.entries(oratorForms).map(([svcId, { form, points }]) => {
        const svc = services.find(s => s.id === svcId);
        return (
          <div key={svcId} className="bg-white/3 rounded-lg p-3 border border-line/15">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-cream">{svc ? formatDate(svc.date) : 'Culte'}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${form.status === 'submitted' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                {form.status === 'submitted' ? 'Soumis' : 'Brouillon'}
              </span>
            </div>
            <p className="text-xs text-cream/80 mt-1"><strong>Th\u00e8me:</strong> {form.theme}</p>
            {form.sub_theme && <p className="text-[10px] text-muted">Sous-th\u00e8me: {form.sub_theme}</p>}
            {form.bible_book && <p className="text-[10px] text-muted">Verset: {form.bible_book} {form.bible_chapter}:{form.bible_verses}</p>}
            {points.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {points.map((p, i) => (
                  <p key={p.id} className="text-[10px] text-muted"><strong>{i + 1}.</strong> {p.title}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderMesEnvois = () => (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-3">Historique des liens de formulaires envoy\u00e9s par WhatsApp.</p>
      {formLinks.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">Aucun envoi</p>
      ) : (
        formLinks.slice(0, 15).map(link => {
          const svc = services.find(s => s.id === link.service_id);
          return (
            <div key={link.id} className="bg-white/3 rounded-lg p-3 border border-line/15 flex items-center gap-3">
              {link.link_type === 'orator'
                ? <Mic className="h-4 w-4 text-amber-400 shrink-0" />
                : <User className="h-4 w-4 text-purple-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-cream truncate">{link.recipient_name || (link.link_type === 'orator' ? 'Orateur' : 'Pr\u00e9sident')}</p>
                <p className="text-[10px] text-muted">{svc ? formatDate(svc.date) : ''} {link.sent_at ? `\u00b7 Envoy\u00e9` : `\u00b7 Non envoy\u00e9`}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => copyLink(link.token)} className="p-1 rounded hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Copier">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => openWhatsApp(link)} className="p-1 rounded hover:bg-green-500/10 text-green-400/70 hover:text-green-400 transition-colors" title="WhatsApp">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     Main Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-3">
      {SUB_SECTIONS.map(section => {
        const isOpen = openSections.has(section.key);
        const Icon = section.Icon;
        return (
          <div key={section.key} className="glass-card rounded-xl overflow-hidden">
            <button onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}15` }}>
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                </div>
                <span className="text-sm font-medium text-cream">{section.label}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-line/30">
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent-400" /></div>
                ) : (
                  <>
                    {section.key === 'prochains_cultes' && renderProchainsCultes()}
                    {section.key === 'mes_formulaires' && renderMesFormulaires()}
                    {section.key === 'mes_envois' && renderMesEnvois()}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}