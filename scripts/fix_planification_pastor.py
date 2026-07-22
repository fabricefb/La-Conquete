#!/usr/bin/env python3
"""
PlanificationTab.tsx changes:
1. Allow pastors (role_level >= 4) to see and modify forms
2. Add inline editing for orator forms
"""

FILE_PATH = '/home/z/my-project/src/components/admin/tabs/PlanificationTab.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# FIX 1: Add pastor role to canPlan
# ═══════════════════════════════════════════════════════════════

old_can_plan = """    const isPrincipalPastor = profile?.is_principal_pastor === true;
  const canPlan = isFullAdmin || isDeptLeader || isPrincipalPastor;"""

new_can_plan = """    const isPrincipalPastor = profile?.is_principal_pastor === true;
  const isPastor = (profile?.role_level ?? 0) >= 4;
  const canPlan = isFullAdmin || isDeptLeader || isPrincipalPastor || isPastor;
  const canEditForm = isFullAdmin || isDeptLeader || isPrincipalPastor || isPastor;"""

content = content.replace(old_can_plan, new_can_plan)

# ═══════════════════════════════════════════════════════════════
# FIX 2: Add editing state for orator form
# ═══════════════════════════════════════════════════════════════

# Add state after the form state declarations
old_form_state = """  /* ── State: Formulaires ── */
  const [oratorForm, setOratorForm] = useState<WorshipOratorForm | null>(null);
  const [oratorPoints, setOratorPoints] = useState<WorshipOratorPoint[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);"""

new_form_state = """  /* ── State: Formulaires ── */
  const [oratorForm, setOratorForm] = useState<WorshipOratorForm | null>(null);
  const [oratorPoints, setOratorPoints] = useState<WorshipOratorPoint[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});"""

content = content.replace(old_form_state, new_form_state)

# ═══════════════════════════════════════════════════════════════
# FIX 3: Add handleSaveForm function before the renderCultes
# ═══════════════════════════════════════════════════════════════

insert_before = "  const renderCultes = () => {"

save_form_function = """  /* ── Save edited orator form ── */
  const handleSaveForm = async () => {
    if (!oratorForm || !selectedServiceId) return;
    try {
      const { error } = await supabase.from('worship_orator_forms').update({
        theme: editFormData.theme ?? oratorForm.theme,
        sub_theme: editFormData.sub_theme ?? oratorForm.sub_theme,
        bible_book: editFormData.bible_book ?? oratorForm.bible_book,
        bible_chapter: editFormData.bible_chapter ?? oratorForm.bible_chapter,
        bible_verses: editFormData.bible_verses ?? oratorForm.bible_verses,
        summary: editFormData.summary ?? oratorForm.summary,
        remarks: editFormData.remarks ?? oratorForm.remarks,
      }).eq('id', oratorForm.id);
      if (error) throw error;

      // Update points if changed
      if (editFormData.points && Array.isArray(editFormData.points)) {
        for (const pt of editFormData.points) {
          await supabase.from('worship_orator_points').update({
            title: pt.title,
            description: pt.description || null,
          }).eq('id', pt.id);
        }
      }

      addToast({ type: 'success', message: 'Formulaire mis \u00e0 jour' });
      setEditingForm(false);
      fetchOratorForm(selectedServiceId);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Erreur de sauvegarde' });
    }
  };

  const handleStartEditing = () => {
    if (!oratorForm) return;
    setEditFormData({
      theme: oratorForm.theme,
      sub_theme: oratorForm.sub_theme || '',
      bible_book: oratorForm.bible_book || '',
      bible_chapter: oratorForm.bible_chapter || '',
      bible_verses: oratorForm.bible_verses || '',
      summary: oratorForm.summary || '',
      remarks: oratorForm.remarks || '',
      points: oratorPoints.map(p => ({ id: p.id, title: p.title, description: p.description || '' })),
    });
    setEditingForm(true);
  };

  """

idx = content.find(insert_before)
if idx != -1:
    content = content[:idx] + save_form_function + content[idx:]
    print("Inserted handleSaveForm and handleStartEditing")
else:
    print("ERROR: Could not find renderCultes")

# ═══════════════════════════════════════════════════════════════
# FIX 4: Add edit button and edit mode in renderFormulaires
# ═══════════════════════════════════════════════════════════════

# Add edit button next to the status badge
old_form_header = """            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cream">Formulaire Orateur</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oratorForm.status === 'submitted' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                {oratorForm.status === 'submitted' ? 'Soumis' : 'Brouillon'}
              </span>
            </div>"""

new_form_header = """            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cream">Formulaire Orateur</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${oratorForm.status === 'submitted' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                  {oratorForm.status === 'submitted' ? 'Soumis' : 'Brouillon'}
                </span>
                {canEditForm && !editingForm && (
                  <button onClick={handleStartEditing} className="px-3 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Modifier
                  </button>
                )}
                {editingForm && (
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveForm} className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Sauvegarder
                    </button>
                    <button onClick={() => setEditingForm(false)} className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-muted hover:text-cream transition-colors">
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>"""

content = content.replace(old_form_header, new_form_header)

# ═══════════════════════════════════════════════════════════════
# FIX 5: Make the form fields editable when editing
# ═══════════════════════════════════════════════════════════════

# Replace the orator form display section with editable version
old_orator_name = """                <div>
                  <label className="text-xs text-muted block mb-1">Orateur</label>
                  <p className="text-sm font-medium text-cream">{oratorForm.orator_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Th\u00e8me principal</label>
                  <p className="text-sm font-medium text-cream">{oratorForm.theme}</p>
                </div>"""

new_orator_name = """                <div>
                  <label className="text-xs text-muted block mb-1">Orateur</label>
                  <p className="text-sm font-medium text-cream">{oratorForm.orator_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Th\u00e8me principal</label>
                  {editingForm ? (
                    <input type="text" value={editFormData.theme || ''} onChange={e => setEditFormData({...editFormData, theme: e.target.value})} className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream" />
                  ) : (
                    <p className="text-sm font-medium text-cream">{oratorForm.theme}</p>
                  )}
                </div>"""

content = content.replace(old_orator_name, new_orator_name)

# Replace sub_theme
old_sub_theme = """                  {oratorForm.sub_theme && (
                  <div>
                    <label className="text-xs text-muted block mb-1">Sous-th\u00e8me</label>
                    <p className="text-sm text-cream/80">{oratorForm.sub_theme}</p>
                  </div>
                )}"""

new_sub_theme = """                  <div>
                    <label className="text-xs text-muted block mb-1">Sous-th\u00e8me</label>
                    {editingForm ? (
                      <input type="text" value={editFormData.sub_theme || ''} onChange={e => setEditFormData({...editFormData, sub_theme: e.target.value})} className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream" />
                    ) : (
                      <p className="text-sm text-cream/80">{oratorForm.sub_theme || '-'}</p>
                    )}
                  </div>"""

content = content.replace(old_sub_theme, new_sub_theme)

# Replace bible verse
old_bible = """                {oratorForm.bible_book && (
                  <div>
                    <label className="text-xs text-muted block mb-1">Verset biblique</label>
                    <p className="text-sm text-cream/80">{oratorForm.bible_book} {oratorForm.bible_chapter || ""}:{oratorForm.bible_verses || ""}</p>
                  </div>
                )}"""

new_bible = """                <div>
                    <label className="text-xs text-muted block mb-1">Verset biblique</label>
                    {editingForm ? (
                      <div className="flex gap-2">
                        <select value={editFormData.bible_book || ''} onChange={e => setEditFormData({...editFormData, bible_book: e.target.value})} className="input-surface rounded-lg px-3 py-2 text-sm text-cream flex-1">
                          <option value="">-- Livre --</option>
                          {BIBLE_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <input type="text" value={editFormData.bible_chapter || ''} onChange={e => setEditFormData({...editFormData, bible_chapter: e.target.value})} className="input-surface rounded-lg px-3 py-2 text-sm text-cream w-20" placeholder="Ch." />
                        <input type="text" value={editFormData.bible_verses || ''} onChange={e => setEditFormData({...editFormData, bible_verses: e.target.value})} className="input-surface rounded-lg px-3 py-2 text-sm text-cream w-20" placeholder="Vv." />
                      </div>
                    ) : (
                      <p className="text-sm text-cream/80">{oratorForm.bible_book ? `${oratorForm.bible_book} ${oratorForm.bible_chapter || ''}:${oratorForm.bible_verses || ''}` : '-'}</p>
                    )}
                  </div>"""

content = content.replace(old_bible, new_bible)

# Replace summary
old_summary = """              {oratorForm.summary && (
                <div>
                  <label className="text-xs text-muted block mb-1">R\u00e9sum\u00e9 du message</label>
                  <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.summary}</p>
                </div>
              )}"""

new_summary = """              <div>
                  <label className="text-xs text-muted block mb-1">R\u00e9sum\u00e9 du message</label>
                  {editingForm ? (
                    <textarea value={editFormData.summary || ''} onChange={e => setEditFormData({...editFormData, summary: e.target.value})} className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream min-h-[100px] resize-y" />
                  ) : (
                    <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.summary || '-'}</p>
                  )}
                </div>"""

content = content.replace(old_summary, new_summary)

# Replace remarks
old_remarks = """              {oratorForm.remarks && (
                <div>
                  <label className="text-xs text-muted block mb-1">Remarques</label>
                  <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.remarks}</p>
                </div>
              )}"""

new_remarks = """              <div>
                  <label className="text-xs text-muted block mb-1">Remarques</label>
                  {editingForm ? (
                    <textarea value={editFormData.remarks || ''} onChange={e => setEditFormData({...editFormData, remarks: e.target.value})} className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream min-h-[60px] resize-y" />
                  ) : (
                    <p className="text-sm text-cream/80 whitespace-pre-wrap bg-white/3 rounded-lg p-3 border border-line/20">{oratorForm.remarks || '-'}</p>
                  )}
                </div>"""

content = content.replace(old_remarks, new_remarks)

# Replace orator points (make titles editable)
old_points_display = """                    {oratorPoints.sort((a, b) => a.position - b.position).map((pt, i) => (
                      <div key={pt.id} className="bg-white/3 rounded-lg p-3 border border-line/20">
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-cream">{pt.title}</p>
                            {pt.description && <p className="text-xs text-muted mt-1">{pt.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}"""

new_points_display = """                    {(editingForm ? (editFormData.points || oratorPoints) : oratorPoints).sort((a: any, b: any) => a.position - b.position).map((pt: any, i: number) => (
                      <div key={pt.id} className="bg-white/3 rounded-lg p-3 border border-line/20">
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-400/15 text-accent-400 text-xs font-bold shrink-0">{i + 1}</span>
                          <div className="flex-1">
                            {editingForm ? (
                              <input type="text" value={pt.title || ''} onChange={e => {
                                const pts = [...(editFormData.points || oratorPoints)];
                                const idx = pts.findIndex((p: any) => p.id === pt.id);
                                if (idx >= 0) { pts[idx] = { ...pts[idx], title: e.target.value }; setEditFormData({ ...editFormData, points: pts }); }
                              }} className="input-surface w-full rounded-lg px-3 py-1.5 text-sm text-cream mb-1" />
                            ) : (
                              <p className="text-sm font-medium text-cream">{pt.title}</p>
                            )}
                            {editingForm ? (
                              <input type="text" value={pt.description || ''} onChange={e => {
                                const pts = [...(editFormData.points || oratorPoints)];
                                const idx = pts.findIndex((p: any) => p.id === pt.id);
                                if (idx >= 0) { pts[idx] = { ...pts[idx], description: e.target.value }; setEditFormData({ ...editFormData, points: pts }); }
                              }} className="input-surface w-full rounded-lg px-3 py-1.5 text-xs text-cream" placeholder="Description..." />
                            ) : (
                              pt.description && <p className="text-xs text-muted mt-1">{pt.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}"""

content = content.replace(old_points_display, new_points_display)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("PlanificationTab.tsx updated successfully!")
print(f"File size: {len(content)} chars")