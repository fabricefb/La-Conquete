#!/usr/bin/env python3
"""Fix PlanificationTab.tsx:
1. Add service selector dropdown to Formulaires tab
2. Add service selector dropdown to Ordre du culte tab
3. Rename AdminOratorForm/AdminOrderForm refs to match existing imports
"""

import re

filepath = 'src/components/admin/tabs/PlanificationTab.tsx'
content = open(filepath, 'r', encoding='utf-8').read()

# ============================================================
# FIX 1: renderFormulaires - replace the early returns with selector
# ============================================================

old_render_form_start = 'const renderFormulaires = () => {'
idx_form = content.find(old_render_form_start)
if idx_form == -1:
    print("ERROR: renderFormulaires not found")
    exit(1)

# Find the end of renderFormulaires - look for the next const render
idx_next = content.find('\n  const renderOrdre', idx_form)
if idx_next == -1:
    # Try different pattern
    idx_next = content.find('\n  const renderCreateModal', idx_form)
if idx_next == -1:
    print("ERROR: Could not find end of renderFormulaires")
    exit(1)

old_form_func = content[idx_form:idx_next]

new_form_func = '''const renderFormulaires = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-cream">Formulaire Orateur</h3>
          <select
            value={selectedServiceId || ""}
            onChange={e => { if (e.target.value) fetchOratorForm(e.target.value); }}
            className="input-surface rounded-lg px-3 py-2 text-sm text-cream min-w-[220px]"
          >
            <option value="">-- Choisir un culte --</option>
            {services.map(svc => (
              <option key={svc.id} value={svc.id}>
                {formatDate(svc.date)} {formatTime(svc.time)} \u2014 {SERVICE_TYPE_LABELS[svc.type] ?? svc.type}{svc.orator_name ? ` (${svc.orator_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        {!selectedServiceId && (
          <div className="glass-card rounded-xl p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-muted">S\u00e9lectionnez un culte ci-dessus pour voir le formulaire orateur</p>
          </div>
        )}

        {selectedServiceId && !oratorForm && (
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-muted">Aucun formulaire orateur soumis pour ce culte</p>
            <p className="text-xs text-muted mt-1">Le lien n\\'a pas encore \u00e9t\u00e9 rempli par l\\'orateur.</p>
          </div>
        )}

        {oratorForm && (
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
                    <p className="text-sm text-cream/80">{oratorForm.bible_book} {oratorForm.bible_chapter || ""}:{oratorForm.bible_verses || ""}</p>
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
        )}
      </div>
    );
  };

'''

content = content[:idx_form] + new_form_func + content[idx_next:]
print("OK: renderFormulaires replaced")

# ============================================================
# FIX 2: renderOrdre - same pattern
# ============================================================

old_render_ordre_start = 'const renderOrdre = () => {'
idx_ordre = content.find(old_render_ordre_start)
if idx_ordre == -1:
    print("ERROR: renderOrdre not found")
    exit(1)

# Find end of renderOrdre - look for "Create Service Modal" comment
idx_next2 = content.find('\n  const renderCreateModal', idx_ordre)
if idx_next2 == -1:
    print("ERROR: Could not find end of renderOrdre")
    exit(1)

new_ordre_func = '''const renderOrdre = () => {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-cream">Ordre du culte</h3>
          <select
            value={selectedServiceForOrder || ""}
            onChange={e => { if (e.target.value) fetchOrderItems(e.target.value); }}
            className="input-surface rounded-lg px-3 py-2 text-sm text-cream min-w-[220px]"
          >
            <option value="">-- Choisir un culte --</option>
            {services.map(svc => (
              <option key={svc.id} value={svc.id}>
                {formatDate(svc.date)} {formatTime(svc.time)} \u2014 {SERVICE_TYPE_LABELS[svc.type] ?? svc.type}{svc.president_name ? ` (${svc.president_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        {!selectedServiceForOrder && (
          <div className="glass-card rounded-xl p-8 text-center">
            <Clock className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-muted">S\u00e9lectionnez un culte ci-dessus pour voir l\\'ordre du culte</p>
          </div>
        )}

        {selectedServiceForOrder && orderItems.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-muted">Aucun ordre du culte d\u00e9fini pour ce culte</p>
            <p className="text-xs text-muted mt-1">Le pr\u00e9sident n\\'a pas encore rempli le formulaire.</p>
          </div>
        )}

        {selectedServiceForOrder && orderItems.length > 0 && (() => {
          const totalMinutes = orderItems.reduce((s, i) => s + (i.duration_minutes || 0), 0);
          return (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Dur\u00e9e totale estim\u00e9e: {totalMinutes} min</span>
              </div>
              <div className="glass-card rounded-xl divide-y divide-line/20 overflow-hidden">
                {orderItems.sort((a, b) => a.position - b.position).map((item, idx) => {
                  const typeLabel = ORDER_ITEM_TYPES.find(t => t.value === item.item_type)?.label || item.item_type;
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
            </>
          );
        })()}
      </div>
    );
  };

'''

content = content[:idx_ordre] + new_ordre_func + content[idx_next2:]
print("OK: renderOrdre replaced")

# Write back
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! New file length: {len(content)} chars")