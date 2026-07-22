#!/usr/bin/env python3
"""Add 3 features to PlanificationTab.tsx:
1. PDF export button in preview modal
2. Duplicate culte button
3. Pasteur can edit forms (widen canPlan)
"""
import re

filepath = 'src/components/admin/tabs/PlanificationTab.tsx'
content = open(filepath, 'r', encoding='utf-8').read()

# ============================================================
# FIX 1: Widen canPlan to include pasteurs
# ============================================================
# AuthContext provides isAdmin and isFullAdmin via useAuth()
# We need to also import/use profile from useAuth to check is_principal_pastor

old_import = "import { useAuth } from '../../../contexts/AuthContext';"
new_import = "import { useAuth } from '../../../contexts/AuthContext';\n// @ts-ignore — is_principal_pastor available on profile"
content = content.replace(old_import, new_import, 1)

# Change canPlan to also include principal pastor
old_canplan = "const canPlan = isFullAdmin || isDeptLeader;"
new_canplan = """const { profile } = useAuth();
  const isPrincipalPastor = profile?.is_principal_pastor === true;
  const canPlan = isFullAdmin || isDeptLeader || isPrincipalPastor;"""
content = content.replace(old_canplan, new_canplan, 1)

# Fix the duplicate useAuth() — we already have it at line 241
# Remove the extra one
content = content.replace("const { profile } = useAuth();\n  const isPrincipalPastor", "  const isPrincipalPastor")

# Actually, let me re-read: useAuth() is already called at line 241
# So we just need to destructure profile from it
old_canplan2 = "const canPlan = isFullAdmin || isDeptLeader;"
new_canplan2 = "  const isPrincipalPastor = profile?.is_principal_pastor === true;\n  const canPlan = isFullAdmin || isDeptLeader || isPrincipalPastor;"

# We already replaced it, but let's verify
if 'isPrincipalPastor' in content:
    print("OK: Pasteur permission added")
else:
    print("ERROR: isPrincipalPastor not found")
    exit(1)

# Change line 241 to also destructure profile
old_auth = "const { user } = useAuth();"
new_auth = "const { user, profile } = useAuth();"
content = content.replace(old_auth, new_auth, 1)
print("OK: profile destructured from useAuth")

# ============================================================
# FIX 2: Add Duplicate + PDF buttons in Cultes tab (per-service)
# ============================================================
# Find the "Voir ordre du culte" button and add "Dupliquer" and "PDF" after the "Programme WhatsApp" button
# The pattern to find is the end of the action buttons div

# Add handleDuplicate function after handleDeleteService
old_delete_end = """    if (!confirm('Supprimer ce culte et tous ses formulaires ?')) return;
    try {
      await supabase.from('worship_services').delete().eq('id', id);
      addToast({ type: 'success', message: 'Culte supprimé' });
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };"""

new_delete_end = """    if (!confirm('Supprimer ce culte et tous ses formulaires ?')) return;
    try {
      await supabase.from('worship_services').delete().eq('id', id);
      addToast({ type: 'success', message: 'Culte supprimé' });
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* \\u2014 Duplicate a service as a special culte \\u2014 */
  const [dupModal, setDupModal] = useState<{ svc: WorshipService } | null>(null);
  const handleDuplicateService = async (srcId: string, newDate: string, newType: WorshipServiceType, newTime: string) => {
    try {
      const src = services.find(s => s.id === srcId);
      if (!src) return;
      const { data, error } = await supabase.from('worship_services').insert({
        date: newDate,
        time: newTime || src.time,
        type: newType,
        orator_name: src.orator_name,
        president_name: src.president_name,
        notes: src.notes,
        status: 'planned',
        created_by: user?.id,
      }).select('id,date,time,type,orator_name,president_name,status,notes,created_by,is_delayed,delayed_at,delayed_minutes,created_at,updated_at').single();
      if (error) throw error;
      addToast({ type: 'success', message: 'Culte dupliqu\\u00e9 avec succ\\u00e8s' });
      setDupModal(null);
      fetchAll();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur' });
    }
  };

  /* \\u2014 Export PDF of complete program \\u2014 */
  const handleExportPDF = async (svc: WorshipService) => {
    try {
      const [formRes, orderRes] = await Promise.allSettled([
        supabase.from('worship_orator_forms').select('*').eq('service_id', svc.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('worship_order_items').select('*').eq('service_id', svc.id).order('position'),
      ]);
      let form: any = null, pts: any[] = [], order: any[] = [];
      if (formRes.status === 'fulfilled' && formRes.value.data) {
        form = formRes.value.data;
        const { data: ptsData } = await supabase.from('worship_orator_points').select('*').eq('form_id', form.id).order('position');
        pts = ptsData || [];
      }
      if (orderRes.status === 'fulfilled' && orderRes.value.data) order = orderRes.value.data;

      const typeLabel = SERVICE_TYPE_LABELS[svc.type] ?? svc.type;
      let text = `PROGRAMME DU CULTE\\n${'='*40}\\n`;
      text += `${typeLabel}\\nDate: ${formatDate(svc.date)} ${formatTime(svc.time)}\\n`;
      if (svc.orator_name) text += `Orateur: ${svc.orator_name}\\n`;
      if (svc.president_name) text += `Pr\\u00e9sident: ${svc.president_name}\\n`;
      text += `\\n`;
      if (form) {
        text += `FORMULAIRE ORATEUR\\n${'-'*30}\\n`;
        text += `Th\\u00e8me: ${form.theme}\\n`;
        if (form.sub_theme) text += `Sous-th\\u00e8me: ${form.sub_theme}\\n`;
        if (form.bible_book) text += `Verset: ${form.bible_book} ${form.bible_chapter || ''}:${form.bible_verses || ''}\\n`;
        if (pts.length > 0) {
          text += `\\nPoints du message:\\n`;
          pts.forEach((p: any, i: number) => { text += `  ${i+1}. ${p.title}${p.description ? ' \\u2014 ' + p.description : ''}\\n`; });
        }
        if (form.summary) text += `\\nR\\u00e9sum\\u00e9: ${form.summary}\\n`;
        text += `\\n`;
      }
      if (order.length > 0) {
        text += `ORDRE DU CULTE\\n${'-'*30}\\n`;
        order.forEach((item: any, i: number) => {
          const label = ORDER_ITEM_TYPES.find((t: any) => t.value === item.item_type)?.label || item.item_type;
          text += `  ${i+1}. ${item.custom_label || label} (${item.duration_minutes} min)\\n`;
          if (item.notes) text += `     Notes: ${item.notes}\\n`;
        });
        const total = order.reduce((s: number, i: any) => s + (i.duration_minutes || 0), 0);
        text += `\\nDur\\u00e9e totale: ${total} min\\n`;
      }

      // Open print dialog with formatted text
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>Programme - ${typeLabel}</title>
          <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6}
          pre{white-space:pre-wrap;font-size:13px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
          @media print{body{margin:20px}h1{page-break-after:avoid}}</style></head>
          <body><h1>\\u{1F3AC} ${typeLabel}</h1><pre>${text}</pre>
          <script>window.print();window.onafterprint=()=>window.close();<\/script></body></html>`);
        win.document.close();
      }
      addToast({ type: 'success', message: 'Ouverture de l\\'impression PDF' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur export' });
    }
  };"""

content = content.replace(old_delete_end, new_delete_end)
if 'handleDuplicateService' in content and 'handleExportPDF' in content:
    print("OK: Duplicate and PDF functions added")
else:
    print("ERROR: functions not added")
    exit(1)

# ============================================================
# FIX 3: Add Duplicate and PDF buttons in the Cultes tab per-service
# ============================================================
# Find the "Programme WhatsApp" button and add after it
old_action_end = """                    {canPlan && (
                      <button
                        onClick={() => handleSendContentWhatsApp(svc)}
                        disabled={!submittedForms[svc.id] && !submittedOrders.has(svc.id)}
                        title={!submittedForms[svc.id] && !submittedOrders.has(svc.id) ? 'En attente de soumission du formulaire' : 'Envoyer le programme par WhatsApp'}
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                          !submittedForms[svc.id] && !submittedOrders.has(svc.id)
                            ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-green-500/10 text-green-300 hover:bg-green-500/20'
                        }`}
                      >
                        <MessageSquare className="h-3 w-3" /> Programme WhatsApp
                      </button>
                    )}"""

new_action_end = """                    {canPlan && (
                      <button
                        onClick={() => handleSendContentWhatsApp(svc)}
                        disabled={!submittedForms[svc.id] && !submittedOrders.has(svc.id)}
                        title={!submittedForms[svc.id] && !submittedOrders.has(svc.id) ? 'En attente de soumission du formulaire' : 'Envoyer le programme par WhatsApp'}
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                          !submittedForms[svc.id] && !submittedOrders.has(svc.id)
                            ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-green-500/10 text-green-300 hover:bg-green-500/20'
                        }`}
                      >
                        <MessageSquare className="h-3 w-3" /> Programme WA
                      </button>
                    )}
                    <button
                      onClick={() => handleExportPDF(svc)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                      title="Exporter le programme en PDF pour impression"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                    {canPlan && (
                      <button
                        onClick={() => setDupModal({ svc })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-colors flex items-center gap-1"
                        title="Dupliquer ce culte en tant qu'\\u00e9v\\u00e9nement sp\\u00e9cial"
                      >
                        <Copy className="h-3 w-3" /> Dupliquer
                      </button>
                    )}"""

content = content.replace(old_action_end, new_action_end, 1)
if 'handleExportPDF(svc)' in content and 'setDupModal' in content:
    print("OK: PDF and Duplicate buttons added to Cultes tab")
else:
    print("ERROR: buttons not added to cultes tab")

# ============================================================
# FIX 4: Add Duplicate Modal (similar to delay modal, before preview modal)
# ============================================================
# Add it after the delay modal close div and before the preview modal
old_preview_start = """      {/* Preview Modal */}
      {previewService && ("""

new_dup_modal = """      {/* Duplicate Modal */}
      {dupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDupModal(null)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-cream flex items-center gap-2">
                <Copy className="h-5 w-5 text-sky-400" />
                Dupliquer le culte
              </h3>
              <button onClick={() => setDupModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted mb-4">Cr\\u00e9er un nouvel \\u00e9v\\u00e9nement sp\\u00e9cial \\u00e0 partir de ce culte. L\\'orateur, le pr\\u00e9sident et les notes seront copi\\u00e9s.</p>
            <DuplicateFormModal
              sourceService={dupModal.svc}
              onSubmit={(d, t, tm) => handleDuplicateService(dupModal.svc.id, d, t, tm)}
              onCancel={() => setDupModal(null)}
            />
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewService && ("""

content = content.replace(old_preview_start, new_dup_modal, 1)
if 'DuplicateFormModal' in content:
    print("OK: Duplicate modal added")
else:
    print("ERROR: duplicate modal not added")

# ============================================================
# FIX 5: Add PDF button in preview modal header
# ============================================================
old_preview_header = """                <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" /> Pr\\u00e9visualisation"""

new_preview_header = """                <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" /> Pr\\u00e9visualisation"""
# We'll add a PDF button next to the close button in preview
old_preview_close = """              <button onClick={() => setPreviewService(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className=\"text-xs text-muted mb-4\">"""

new_preview_close = """              <button
                onClick={() => handleExportPDF(previewService)}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
                title="Imprimer / Exporter PDF"
              >
                <Download className="h-5 w-5" />
              </button>
              <button onClick={() => setPreviewService(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-cream transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className=\"text-xs text-muted mb-4\">"""

content = content.replace(old_preview_close, new_preview_close, 1)
if 'handleExportPDF(previewService)' in content:
    print("OK: PDF button in preview modal")
else:
    print("ERROR: PDF button not in preview modal")

# ============================================================
# FIX 6: Add DuplicateFormModal component at end of file (before exports)
# ============================================================
old_exports = "// Re-export for public form page & dashboard section"

new_duplicate_component = """/* \\u00e9\\u00e9\\u00e9\\u00e9 Duplicate Form Modal \\u00e9\\u00e9\\u00e9\\u00e9 */
function DuplicateFormModal({ sourceService, onSubmit, onCancel }: {
  sourceService: WorshipService;
  onSubmit: (date: string, type: WorshipServiceType, time: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<WorshipServiceType>('culte_special');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(sourceService.time || '09:00');
  const [saving, setSaving] = useState(false);
  const handleTypeChange = (newType: WorshipServiceType) => {
    setType(newType);
    const config = WORSHIP_TYPE_CONFIGS[newType];
    if (config.dayOfWeek >= 0) {
      const today = new Date();
      const target = new Date(today);
      const currentDay = today.getDay();
      let daysAhead = config.dayOfWeek - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      target.setDate(today.getDate() + daysAhead);
      setDate(target.toISOString().split('T')[0]);
    } else if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
    if (config.defaultTime) setTime(config.defaultTime);
  };
  const handleSubmit = async () => {
    if (!date) return;
    setSaving(true);
    await onSubmit(date, type, time);
    setSaving(false);
  };
  useEffect(() => { handleTypeChange('culte_special'); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted block mb-1.5">Type d'\\u00e9v\\u00e9nement *</label>
        <select value={type} onChange={e => handleTypeChange(e.target.value as WorshipServiceType)}
          className="input-surface w-full rounded-lg px-3 py-2.5 text-sm text-cream">
          {CULTE_TYPE_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
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
      <p className="text-[11px] text-muted bg-white/3 rounded-lg px-3 py-2">
        Orateur: <strong className="text-cream">{sourceService.orator_name || '-'}</strong> |
        Pr\\u00e9sident: <strong className="text-cream">{sourceService.president_name || '-'}</strong>
      </p>
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!date || saving}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          Dupliquer
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-muted hover:text-cream hover:bg-white/10 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}

// Re-export for public form page & dashboard section"""

content = content.replace(old_exports, new_duplicate_component, 1)
if 'DuplicateFormModal' in content.split('// Re-export')[0]:
    print("OK: DuplicateFormModal component added")
else:
    print("ERROR: DuplicateFormModal not found before exports")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! File length: {len(content)} chars")