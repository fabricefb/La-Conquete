import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import {
  Calendar, Plus, Send, Eye, Trash2, ChevronUp, ChevronDown,
  Copy, MessageSquare, CheckCircle, Clock, AlertCircle,
  Loader2, X, RefreshCw, Church, Mic, User, Info,
  AlertTriangle, Timer, Play,
} from '../../../lib/icons';
import type {
  WorshipService, WorshipServiceType, WorshipServiceStatus,
  WorshipOratorForm, WorshipOratorPoint, WorshipOrderItem,
  WorshipOrderItemType, WorshipFormLink,
} from '../../../types';

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { key: 'cultes', label: 'Cultes', Icon: Church },
  { key: 'formulaires', label: 'Formulaires', Icon: Mic },
  { key: 'ordre', label: 'Ordre du culte', Icon: User },
] as const;
type SubTab = typeof SUB_TABS[number]['key'];

const SERVICE_TYPE_LABELS: Record<WorshipServiceType, string> = {
  dimanche: 'Dimanche', midis: 'Midi', veille: 'Veill\u00e9e',
  special: 'Sp\u00e9cial', jeune: 'Je\u00fbne', autre: 'Autre',
};

const STATUS_CONFIG: Record<WorshipServiceStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-500/20 text-gray-300' },
  planned: { label: 'Planifi\u00e9', color: 'bg-blue-500/20 text-blue-300' },
  orator_submitted: { label: 'Orateur OK', color: 'bg-amber-500/20 text-amber-300' },
  president_submitted: { label: 'Pr\u00e9sident OK', color: 'bg-purple-500/20 text-purple-300' },
  completed: { label: 'Complet', color: 'bg-green-500/20 text-green-300' },
  cancelled: { label: 'Annul\u00e9', color: 'bg-red-500/20 text-red-300' },
};

const ORDER_ITEM_TYPES: { value: WorshipOrderItemType; label: string }[] = [
  { value: 'louange', label: 'Louange' },
  { value: 'adoration', label: 'Adoration' },
  { value: 'offrande', label: 'Offrande' },
  { value: 'communique', label: 'Communiqu\u00e9' },
  { value: 'predication', label: 'Pr\u00e9dication' },
  { value: 'temoignage', label: 'T\u00e9moignages' },
  { value: 'sainte_cene', label: 'Sainte C\u00e8ne' },
  { value: 'priere_nouveaux', label: 'Pri\u00e8re nouveaux' },
  { value: 'accueil_invites', label: 'Accueil invit\u00e9s' },
  { value: 'intervention_speciale', label: 'Intervention sp\u00e9ciale' },
  { value: 'priere_finale', label: 'Pri\u00e8re finale' },
  { value: 'autre', label: 'Autre' },
];

const BIBLE_BOOKS = [
  'Gen\u00e8se','Exode','L\u00e9vitique','Nombres','Deut\u00e9ronome',
  'Josu\u00e9','Juges','Ruth','1 Samuel','2 Samuel','1 Rois','2 Rois',
  '1 Chroniques','2 Chroniques','Esdras','N\u00e9h\u00e9mie','Esther','Job',
  'Psaumes','Proverbes','Eccl\u00e9siaste','Cantique des Cantiques',
  '\u00c9sa\u00efe','J\u00e9r\u00e9mie','Lamentations','\u00c9z\u00e9chiel','Daniel',
  'Os\u00e9e','Jo\u00ebl','Amos','Abdias','Jonas','Mich\u00e9e','Nahum',
  'Habakuk','Sophonie','Agg\u00e9e','Zacharie','Malachie',
  'Matthieu','Marc','Luc','Jean','Actes','Romains','1 Corinthiens',
  '2 Corinthiens','Galates','\u00c9ph\u00e9siens','Philippiens','Colossiens',
  '1 Thessaloniciens','2 Thessaloniciens','1 Timoth\u00e9e','2 Timoth\u00e9e',
  'Tite','Phil\u00e9mon','H\u00e9breux','Jacques','1 Pierre','2 Pierre',
  '1 Jean','2 Jean','3 Jean','Jude','Apocalypse',
];

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function isTableNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('42P01');
}

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── 12h Deadline helpers ── */
function getDeadlineInfo(deadlineStr: string): { label: string; cls: string; isExpired: boolean; hoursLeft: number } {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const hoursLeft = diffMs / (1000 * 60 * 60);
  const isExpired = diffMs <= 0;
  if (isExpired) {
    return { label: 'Expir\u00e9', cls: 'bg-red-500/20 text-red-400', isExpired: true, hoursLeft: 0 };
  }
  if (hoursLeft < 3) {
    return { label: `Urgent : ${Math.ceil(hoursLeft)}h restantes`, cls: 'bg-red-500/20 text-red-300', isExpired: false, hoursLeft };
  }
  if (hoursLeft < 6) {
    return { label: `${Math.ceil(hoursLeft)}h restantes`, cls: 'bg-amber-500/20 text-amber-300', isExpired: false, hoursLeft };
  }
  return { label: `${Math.ceil(hoursLeft)}h restantes`, cls: 'bg-emerald-500/20 text-emerald-300', isExpired: false, hoursLeft };
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function PlanificationTab() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();
  const [activeTab, setActiveTab] = useState<SubTab>('cultes');
  const [loading, setLoading] = useState(true);
  const [moduleError, setModuleError] = useState(false);

  /* ── State: Cultes ── */
  const [services, setServices] = useState<WorshipService[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  /* ── State: Formulaires ── */
  const [oratorForm, setOratorForm] = useState<WorshipOratorForm | null>(null);
  const [oratorPoints, setOratorPoints] = useState<WorshipOratorPoint[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  /* ── State: Ordre du culte ── */
  const [orderItems, setOrderItems] = useState<WorshipOrderItem[]>([]);
  const [selectedServiceForOrder, setSelectedServiceForOrder] = useState<string | null>(null);

  /* ── State: Form links ── */
  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setModuleError(false);
    try {
      const [svcRes, linksRes] = await Promise.allSettled([
        supabase.from('worship_services').select('*').order('date', { ascending: false }).limit(50),
        supabase.from('worship_form_links').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (svcRes.status === 'fulfilled' && svcRes.value.data) {
        setServices(svcRes.value.data as WorshipService[]);
      } else if (svcRes.status === 'rejected' && isTableNotFoundError(svcRes.reason)) {
        setModuleError(true);
      }

      if (linksRes.status === 'fulfilled' && linksRes.value.data) {
        setFormLinks(linksRes.value.data as WorshipFormLink[]);
      }
    } catch (err) {
      if (isTableNotFoundError(err)) { setModuleError(true); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Fetch orator form + points for a service ── */
  const fetchOratorForm = useCallback(async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    try {
      const [formRes, ptsRes] = await Promise.allSettled([
        supabase.from('worship_orator_forms').select('*').eq('service_id', serviceId).single(),
        supabase.from('worship_orator_points').select('*').eq('form_id', '').order('position'),
      ]);

      let formData: WorshipOratorForm | null = null;
      if (formRes.status === 'fulfilled' && formRes.value.data) {
        formData = formRes.value.data as WorshipOratorForm;
        if (ptsRes.status === 'fulfilled' && ptsRes.value.data) {
          const pts = (ptsRes.value.data as WorshipOratorPoint[]).filter(p => p.form_id === formData!.id);
          setOratorPoints(pts);
        }
      }
      setOratorForm(formData);
    } catch { /* empty */ }
  }, []);

  /* ── Fetch order items for a service ── */
  const fetchOrderItems = useCallback(async (serviceId: string) => {
    setSelectedServiceForOrder(serviceId);
    try {
      const { data } = await supabase.from('worship_order_items')
        .select('*').eq('service_id', serviceId).order('position');
      setOrderItems((data as WorshipOrderItem[]) || []);
    } catch { setOrderItems([]); }
  }, []);

  /* ── Create service ── */
  const handleCreateService = async (svc: {
    date: string; time: string; type: WorshipServiceType;
    orator_name: string; president_name: string; notes: string;
  }) => {
    try {
      const { data, error } = await supabase.from('worship_services').insert({
        ...svc, status: 'planned', created_by: user?.id,
      }).select().single();

      if (error) throw error;
      addToast({ type: 'success', message: 'Culte cr\u00e9\u00e9 avec succ\u00e8s' });

      // Auto-generate form links
      if (data) {
        const oratorToken = generateToken();
        const presidentToken = generateToken();
        await Promise.allSettled([
          supabase.from('worship_form_links').insert({
            service_id: data.id, link_type: 'orator', token: oratorToken,
            recipient_name: svc.orator_name || null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          supabase.from('worship_form_links').insert({
            service_id: data.id, link_type: 'president', token: presidentToken,
            recipient_name: svc.president_name || null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        ]);
      }

      setShowCreateModal(false);
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur lors de la cr\u00e9ation' });
    }
  };

  /* ── Generate/regenerate WhatsApp link ── */
  const handleGenerateLink = async (serviceId: string, linkType: 'orator' | 'president', recipientName?: string, recipientPhone?: string) => {
    try {
      const token = generateToken();
      const { error } = await supabase.from('worship_form_links').upsert({
        service_id: serviceId, link_type: linkType, token,
        recipient_name: recipientName || null,
        recipient_phone: recipientPhone || null,
        is_used: false, sent_at: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'service_id,link_type' });

      if (error) throw error;
      addToast({ type: 'success', message: 'Lien g\u00e9n\u00e9r\u00e9' });
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* ── Send WhatsApp ── */
  const handleSendWhatsApp = (link: WorshipFormLink) => {
    const formType = link.link_type === 'orator' ? 'orateur' : 'president';
    const url = `${BASE_URL}/#/form-culte/${link.token}`;
    const svc = services.find(s => s.id === link.service_id);
    const dateStr = svc ? formatDate(svc.date) : '';

    const message = `Bonjour ${link.recipient_name || ''},\n\nVoici le lien pour remplir le formulaire ${formType} du culte du ${dateStr} :\n\n${url}\n\nCe lien expire dans 7 jours.`;

    const phone = (link.recipient_phone || '').replace(/[^0-9]/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    // Mark as sent
    supabase.from('worship_form_links').update({ sent_at: new Date().toISOString() }).eq('id', link.id);
    window.open(waUrl, '_blank');
    addToast({ type: 'success', message: 'WhatsApp ouvert' });
  };

  /* ── Toggle delay on a service ── */
  const [delayModal, setDelayModal] = useState<{ serviceId: string; currentMinutes: number } | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(30);

  const handleToggleDelay = async (serviceId: string, enable: boolean, minutes?: number) => {
    try {
      if (enable) {
        await supabase.from('worship_services').update({
          is_delayed: true,
          delayed_at: new Date().toISOString(),
          delayed_minutes: minutes || 30,
        }).eq('id', serviceId);
        addToast({ type: 'success', message: `Culte signal\u00e9 en retard de ${minutes || 30} min \u2014 les liens sont repouss\u00e9s` });
      } else {
        await supabase.from('worship_services').update({
          is_delayed: false,
          delayed_at: null,
          delayed_minutes: 0,
        }).eq('id', serviceId);
        addToast({ type: 'success', message: 'Retard annul\u00e9 \u2014 les liens sont remis \u00e0 la deadline initiale' });
      }
      setDelayModal(null);
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* ── Delete service ── */
  const handleDeleteService = async (id: string) => {
    if (!confirm('Supprimer ce culte et tous ses formulaires ?')) return;
    try {
      await supabase.from('worship_services').delete().eq('id', id);
      addToast({ type: 'success', message: 'Culte supprim\u00e9' });
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* ── Copy link ── */
  const copyLink = (token: string) => {
    const url = `${BASE_URL}/#/form-culte/${token}`;
    navigator.clipboard.writeText(url);
    addToast({ type: 'success', message: 'Lien copi\u00e9' });
  };

  /* ═══════════════════════════════════════════════════════════════
     Module Error
     ═══════════════════════════════════════════════════════════════ */
  if (moduleError) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Info className="h-12 w-12 text-muted mx-auto mb-4" />
        <p className="font-serif text-xl font-semibold text-cream mb-2">Module en cours de configuration</p>
        <p className="text-sm text-muted mb-4">Les tables de planification de culte n'ont pas encore \u00e9t\u00e9 cr\u00e9\u00e9es dans la base de donn\u00e9es.</p>
        <p className="text-xs text-muted">Ex\u00e9cutez la migration SQL <code className="bg-white/5 px-2 py-0.5 rounded">worship_planning_migration.sql</code> dans Supabase.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Render: Cultes Tab
     ═══════════════════════════════════════════════════════════════ */
  const renderCultes = () => {
    const linksForService = (svcId: string, type: 'orator' | 'president') =>
      formLinks.filter(l => l.service_id === svcId && l.link_type === type);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cream">Planification des cultes</h3>
          {isFullAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="btn-gold text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nouveau culte
            </button>
          )}
        </div>

        {services.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Calendar className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-muted">Aucun culte planifi\u00e9</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(svc => {
              const oratorLinks = linksForService(svc.id, 'orator');
              const presidentLinks = linksForService(svc.id, 'president');
              const st = STATUS_CONFIG[svc.status];
              const deadlineInfo = svc.form_deadline_at ? getDeadlineInfo(svc.form_deadline_at) : null;

              return (
                <div key={svc.id} className={`glass-card rounded-xl p-4 space-y-3 ${svc.is_delayed ? 'ring-1 ring-red-500/30' : ''}`}>
                  {/* Header row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${svc.is_delayed ? 'bg-red-500/15' : 'bg-accent-400/10'}`}>
                        {svc.is_delayed
                          ? <AlertTriangle className="h-5 w-5 text-red-400" />
                          : <Church className="h-5 w-5 text-accent-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-cream">{formatDate(svc.date)} &mdash; {svc.time}</p>
                          {svc.is_delayed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              EN RETARD (+{svc.delayed_minutes || 0} min)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">{SERVICE_TYPE_LABELS[svc.type]} {svc.orator_name ? `\u00b7 Orateur: ${svc.orator_name}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 12h deadline badge */}
                      {deadlineInfo && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${deadlineInfo.cls}`}>
                          <Timer className="h-3 w-3" />
                          {deadlineInfo.label}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      {isFullAdmin && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setDelayModal({ serviceId: svc.id, currentMinutes: svc.delayed_minutes || 0 })}
                            className={`p-1.5 rounded-lg transition-colors ${svc.is_delayed ? 'hover:bg-red-500/10 text-red-400/70 hover:text-red-400' : 'hover:bg-amber-500/10 text-amber-400/70 hover:text-amber-400'}`}
                            title={svc.is_delayed ? 'G\u00e9rer le retard' : 'Signaler un retard'}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteService(svc.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {svc.president_name && (
                    <p className="text-sm text-cream/70">Pr\u00e9sident: {svc.president_name}</p>
                  )}

                  {/* Delay info bar */}
                  {svc.is_delayed && (
                    <div className="bg-red-500/8 rounded-lg px-3 py-2 border border-red-500/15 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-red-300 font-medium">Culte programm\u00e9 en retard de {svc.delayed_minutes || 0} minutes</p>
                        <p className="text-[10px] text-red-400/70">La deadline des formulaires a \u00e9t\u00e9 repouss\u00e9e automatiquement de {svc.delayed_minutes || 0} min. Les liens WhatsApp non utilis\u00e9s sont mis \u00e0 jour.</p>
                      </div>
                      {isFullAdmin && (
                        <button onClick={() => handleToggleDelay(svc.id, false)} className="text-[10px] px-2 py-1 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors shrink-0">
                          Annuler le retard
                        </button>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-line/30">
                    {/* Orator link */}
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-muted flex-1">Formulaire orateur</span>
                      {oratorLinks.length > 0 && oratorLinks[0] && (
                        <>
                          <button onClick={() => copyLink(oratorLinks[0].token)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Copier le lien">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleSendWhatsApp(oratorLinks[0])} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400/70 hover:text-green-400 transition-colors" title="Envoyer par WhatsApp">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => window.open(`/#/form-culte/${oratorLinks[0].token}`, '_blank')} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Ouvrir">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {isFullAdmin && (
                        <button onClick={() => handleGenerateLink(svc.id, 'orator', svc.orator_name || undefined)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="R\u00e9g\u00e9n\u00e9rer le lien">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* President link */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="text-xs text-muted flex-1">Formulaire pr\u00e9sident</span>
                      {presidentLinks.length > 0 && presidentLinks[0] && (
                        <>
                          <button onClick={() => copyLink(presidentLinks[0].token)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Copier le lien">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleSendWhatsApp(presidentLinks[0])} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400/70 hover:text-green-400 transition-colors" title="Envoyer par WhatsApp">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => window.open(`/#/form-culte/${presidentLinks[0].token}`, '_blank')} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="Ouvrir">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {isFullAdmin && (
                        <button onClick={() => handleGenerateLink(svc.id, 'president', svc.president_name || undefined)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors" title="R\u00e9g\u00e9n\u00e9rer le lien">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* View buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { fetchOratorForm(svc.id); setActiveTab('formulaires'); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                    >
                      <Eye className="h-3 w-3 inline mr-1" /> Voir formulaire orateur
                    </button>
                    <button
                      onClick={() => { fetchOrderItems(svc.id); setActiveTab('ordre'); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                    >
                      <Eye className="h-3 w-3 inline mr-1" /> Voir ordre du culte
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Render: Formulaires Tab (Read-only view of orator form)
     ═══════════════════════════════════════════════════════════════ */
  const renderFormulaires = () => {
    if (!selectedServiceId) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="text-muted">S\u00e9lectionnez un culte dans l'onglet "Cultes" pour voir le formulaire orateur</p>
        </div>
      );
    }

    if (!oratorForm) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-muted">Aucun formulaire orateur soumis pour ce culte</p>
          <p className="text-xs text-muted mt-1">Le lien n'a pas encore \u00e9t\u00e9 rempli par l'orateur.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cream">Formulaire Orateur</h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oratorForm.status === 'submitted' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
            {oratorForm.status === 'submitted' ? 'Soumis' : 'Brouillon'}
          </span>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted block mb-1">Orateur</label>
              <p className="text-sm font-medium text-cream">{oratorForm.orator_name}</p>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Th\u00e8me principal</label>
              <p className="text-sm font-medium text-cream">{oratorForm.theme}</p>
            </div>
            {oratorForm.sub_theme && (
              <div>
                <label className="text-xs text-muted block mb-1">Sous-th\u00e8me</label>
                <p className="text-sm text-cream/80">{oratorForm.sub_theme}</p>
              </div>
            )}
            {oratorForm.bible_book && (
              <div>
                <label className="text-xs text-muted block mb-1">Verset biblique</label>
                <p className="text-sm text-cream/80">{oratorForm.bible_book} {oratorForm.bible_chapter || ''}:{oratorForm.bible_verses || ''}</p>
              </div>
            )}
          </div>

            {oratorPoints.length > 0 && (
              <div>
                <label className="text-xs text-muted block mb-2">Grands points du message</label>
                <div className="space-y-2">
                  {oratorPoints.sort((a, b) => a.position - b.position).map((pt, i) => (
                    <div key={pt.id} className="bg-white/3 rounded-lg p-3 border border-line/20">
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

            {oratorForm.summary && (
              <div>
                <label className="text-xs text-muted block mb-1">R\u00e9sum\u00e9 du message</label>
                <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.summary}</p>
              </div>
            )}

            {oratorForm.remarks && (
              <div>
                <label className="text-xs text-muted block mb-1">Remarques</label>
                <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.remarks}</p>
              </div>
            )}

            {oratorForm.submitted_at && (
              <p className="text-xs text-muted text-right">Soumis le {new Date(oratorForm.submitted_at).toLocaleString('fr-FR')}</p>
            )}
          </div>
        </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Render: Ordre du Culte Tab
     ═══════════════════════════════════════════════════════════════ */
  const renderOrdre = () => {
    if (!selectedServiceForOrder) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <Clock className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="text-muted">S\u00e9lectionnez un culte dans l'onglet "Cultes" pour voir l'ordre du culte</p>
        </div>
      );
    }

    if (orderItems.length === 0) {
      return (
        <div className="glass-card rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-muted">Aucun ordre du culte d\u00e9fini pour ce culte</p>
          <p className="text-xs text-muted mt-1">Le pr\u00e9sident n'a pas encore rempli le formulaire.</p>
        </div>
      );
    }

    const totalMinutes = orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cream">Ordre du culte</h3>
          <span className="text-xs text-muted">Dur\u00e9e totale estim\u00e9e: {totalMinutes} min</span>
        </div>

        <div className="glass-card rounded-xl divide-y divide-line/20 overflow-hidden">
          {orderItems.sort((a, b) => a.position - b.position).map((item, idx) => {
            const typeLabel = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
            const isFirst = idx === 0;
            const isLast = idx === orderItems.length - 1;

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cream">{item.custom_label || typeLabel}</p>
                  {item.notes && <p className="text-xs text-muted mt-0.5 truncate">{item.notes}</p>}
                </div>
                <span className="text-xs text-muted shrink-0">{item.duration_minutes} min</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
     Create Service Modal
     ═══════════════════════════════════════════════════════════════ */
  const renderCreateModal = () => {
    if (!showCreateModal) return null;
    return <CreateServiceModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateService} />;
  };

  /* ═══════════════════════════════════════════════════════════════
     Main Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/3 rounded-xl p-1 overflow-x-auto">
        {SUB_TABS.map(tab => {
          const Icon = tab.Icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active ? 'bg-accent-400/15 text-accent-400' : 'text-muted hover:text-cream hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'cultes' && renderCultes()}
      {activeTab === 'formulaires' && renderFormulaires()}
      {activeTab === 'ordre' && renderOrdre()}

      {/* Create Modal */}
      {renderCreateModal()}

      {/* Delay Modal */}
      {delayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDelayModal(null)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-cream flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                {delayModal.currentMinutes > 0 ? 'Modifier le retard' : 'Signaler un retard'}
              </h3>
              <button onClick={() => setDelayModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted mb-4">
              Indiquez de combien de minutes le culte est en retard. La deadline des formulaires (12h avant le culte) sera repouss\u00e9e automatiquement. Les liens WhatsApp non utilis\u00e9s seront mis \u00e0 jour.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Dur\u00e9e du retard (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  value={delayMinutes}
                  onChange={e => setDelayMinutes(parseInt(e.target.value) || 30)}
                  className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleDelay(delayModal.serviceId, true, delayMinutes)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Confirmer le retard
                </button>
                {delayModal.currentMinutes > 0 && (
                  <button
                    onClick={() => handleToggleDelay(delayModal.serviceId, false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-muted hover:text-cream hover:bg-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Create Service Modal
   ═════════════════════════════════════════════════════════════════ */

function CreateServiceModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (svc: {
    date: string; time: string; type: WorshipServiceType;
    orator_name: string; president_name: string; notes: string;
  }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<WorshipServiceType>('dimanche');
  const [oratorName, setOratorName] = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!date) return;
    setSaving(true);
    await onSubmit({ date, time, type, orator_name: oratorName, president_name: presidentName, notes });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent-400" /> Nouveau culte
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Heure</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Type de culte</label>
            <select value={type} onChange={e => setType(e.target.value as WorshipServiceType)}
              className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream">
              {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Nom de l'orateur</label>
              <input type="text" value={oratorName} onChange={e => setOratorName(e.target.value)}
                placeholder="Ex: Pasteur Jean"
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted/50" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Nom du pr\u00e9sident</label>
              <input type="text" value={presidentName} onChange={e => setPresidentName(e.target.value)}
                placeholder="Ex: Fr\u00e8re Pierre"
                className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted/50" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Culte sp\u00e9cial, th\u00e8me de mois, etc."
              className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted/50 resize-none" />
          </div>

          <button onClick={handleSubmit} disabled={!date || saving}
            className="btn-gold w-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Cr\u00e9er le culte
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export for public form page
export { BIBLE_BOOKS, ORDER_ITEM_TYPES, SERVICE_TYPE_LABELS, STATUS_CONFIG, generateToken, isTableNotFoundError, formatDate, getDeadlineInfo };