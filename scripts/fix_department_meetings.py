"""
DepartmentSection.tsx changes:
1. Detect if user is a department leader
2. Add editable meeting schedule for leaders
3. Add a 'Réunions' sub-section to schedule upcoming meetings
"""

FILE_PATH = '/home/z/my-project/src/components/dashboard/DepartmentSection.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# FIX 1: Add 'meetings' to SubAccordion type
# ═══════════════════════════════════════════════════════════════

old_type = "type SubAccordion = 'overview' | 'members' | 'activity' | 'notes' | 'visitors';"
new_type = "type SubAccordion = 'overview' | 'members' | 'meetings' | 'activity' | 'notes' | 'visitors';"
content = content.replace(old_type, new_type)

# ═══════════════════════════════════════════════════════════════
# FIX 2: Add meeting-related icons import
# ═══════════════════════════════════════════════════════════════

# CalendarClock is already imported. Just add Plus and Edit3
if '  Plus,' not in content:
    content = content.replace(
        "  Eye,\n} from '../../lib/icons';",
        "  Eye,\n  Plus,\n  Edit3,\n} from '../../lib/icons';"
    )

# ═══════════════════════════════════════════════════════════════
# FIX 3: Add 'meetings' section to sub-sections
# ═══════════════════════════════════════════════════════════════

old_subsections = "  { key: 'overview', icon: Info, label: 'Aper\u00e7u' },"
new_subsections = "  { key: 'overview', icon: Info, label: 'Aper\u00e7u' },\n  { key: 'meetings', icon: CalendarClock, label: 'R\u00e9unions' },"
content = content.replace(old_subsections, new_subsections)

# ═══════════════════════════════════════════════════════════════
# FIX 4: Add state for meetings, leader detection, schedule editing
# ═══════════════════════════════════════════════════════════════

old_state = """  /* ── Visitors state (\u00e9vang\u00e9lisation only) ─────────────────────── */
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [updatingVisitorId, setUpdatingVisitorId] = useState<string | null>(null);"""

new_state = """  /* ── Leader detection ───────────────────────────────────────── */
  const [isLeader, setIsLeader] = useState(false);
  const [leaderLoading, setLeaderLoading] = useState(true);

  /* ── Meeting schedule state ───────────────────────────────────── */
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleText, setScheduleText] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  /* ── Department meetings state ─────────────────────────────────── */
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '', location: '', agenda: '' });
  const [savingMeeting, setSavingMeeting] = useState(false);

  /* ── Visitors state (\u00e9vang\u00e9lisation only) ─────────────────────── */
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [updatingVisitorId, setUpdatingVisitorId] = useState<string | null>(null);"""

content = content.replace(old_state, new_state)

# ═══════════════════════════════════════════════════════════════
# FIX 5: Add leader detection + meetings fetch to fetchData
# ═══════════════════════════════════════════════════════════════

# After the notes fetch block, add leader check and meetings fetch
old_after_notes = """      if (isTableNotFoundError(deptRes.error) || isTableNotFoundError(membersRes.error)) {"""

new_after_notes = """      // Check if user is a department leader
      const { data: leaderCheck } = await supabase
        .from('department_members')
        .select('id, role_in_dept')
        .eq('user_id', user.id)
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .limit(1);
      const memberRole = leaderCheck?.[0]?.role_in_dept;
      setIsLeader(memberRole === 'leader' || memberRole === 'chef');
      setLeaderLoading(false);

      // Fetch upcoming department meetings (from events table)
      try {
        const now = new Date().toISOString().split('T')[0];
        const meetingsRes = await supabase
          .from('department_meetings')
          .select('*')
          .eq('department_id', departmentId)
          .gte('meeting_date', now)
          .order('meeting_date', { ascending: true })
          .limit(10);
        setMeetings(meetingsRes.data || []);
      } catch {
        // Table may not exist yet
        try {
          await supabase.rpc('create_department_meetings_if_not_exists');
        } catch { /* ignore */ }
      }

      if (isTableNotFoundError(deptRes.error) || isTableNotFoundError(membersRes.error)) {"""

content = content.replace(old_after_notes, new_after_notes)

# ═══════════════════════════════════════════════════════════════
# FIX 6: Add meeting schedule editing and meeting management functions
# ═══════════════════════════════════════════════════════════════

insert_before_render = '  const renderOverview = () => ('

meetings_functions = """  /* ── Meeting schedule editing ───────────────────────────────── */
  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const { error } = await supabase
        .from('departments')
        .update({ meeting_schedule: scheduleText })
        .eq('id', departmentId);
      if (error) throw error;
      setDeptRecord(prev => prev ? { ...prev, meeting_schedule: scheduleText } : null);
      setEditingSchedule(false);
      addToast('Horaire de r\u00e9union mis \u00e0 jour', 'success');
    } catch {
      addToast('Erreur de sauvegarde', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.date) {
      addToast('Titre et date obligatoires', 'error');
      return;
    }
    setSavingMeeting(true);
    try {
      const { error } = await supabase
        .from('department_meetings')
        .insert({
          department_id: departmentId,
          title: newMeeting.title,
          meeting_date: newMeeting.date,
          meeting_time: newMeeting.time || null,
          location: newMeeting.location || null,
          agenda: newMeeting.agenda || null,
          created_by: user?.id,
        });
      if (error) {
        // If table doesn't exist, try creating it
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          addToast('Table des r\u00e9unions en cours de cr\u00e9ation. R\u00e9essayez.', 'error');
        } else throw error;
      } else {
        addToast('R\u00e9union programm\u00e9e', 'success');
        setNewMeeting({ title: '', date: '', time: '', location: '', agenda: '' });
        setShowNewMeeting(false);
        // Refresh meetings
        const now = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('department_meetings')
          .select('*')
          .eq('department_id', departmentId)
          .gte('meeting_date', now)
          .order('meeting_date', { ascending: true })
          .limit(10);
        setMeetings(data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Supprimer cette r\u00e9union ?')) return;
    try {
      await supabase.from('department_meetings').delete().eq('id', id);
      setMeetings(prev => prev.filter(m => m.id !== id));
      addToast('R\u00e9union supprim\u00e9e', 'success');
    } catch {
      addToast('Erreur', 'error');
    }
  };

"""

idx = content.find(insert_before_render)
if idx != -1:
    content = content[:idx] + meetings_functions + content[idx:]
    print("Inserted meeting management functions")
else:
    print("ERROR: Could not find renderOverview")

# ═══════════════════════════════════════════════════════════════
# FIX 7: Make meeting schedule editable in overview
# ═══════════════════════════════════════════════════════════════

old_schedule_display = """          {displaySchedule && (
            <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <CalendarClock className="w-3 h-3" />
              {displaySchedule}
            </span>
          )}"""

new_schedule_display = """          {editingSchedule ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={scheduleText}
                onChange={e => setScheduleText(e.target.value)}
                className="input-surface rounded-lg px-3 py-1.5 text-xs text-cream flex-1"
                placeholder="Ex: Chaque mercredi \u00e0 16h30"
              />
              <button onClick={handleSaveSchedule} disabled={savingSchedule} className="px-2 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingSchedule(false)} className="px-2 py-1.5 rounded-lg bg-white/5 text-muted hover:text-cream transition-colors">
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <CalendarClock className="w-3 h-3" />
              {displaySchedule || 'Non d\u00e9fini'}
              {isLeader && (
                <button onClick={() => { setScheduleText(displaySchedule || ''); setEditingSchedule(true); }} className="ml-1 p-0.5 rounded hover:bg-white/10 text-accent-400 transition-colors" title="Modifier l'horaire">
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </span>
          )}"""

content = content.replace(old_schedule_display, new_schedule_display)

# ═══════════════════════════════════════════════════════════════
# FIX 8: Add renderMeetings function before renderMembers
# ═══════════════════════════════════════════════════════════════

insert_before_members = '  const renderMembers = () => ('

render_meetings = """  const renderMeetings = () => (
    <div className="space-y-4">
      {/* Meeting schedule */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Horaire hebdomadaire</p>
          {isLeader && !editingSchedule && (
            <button
              onClick={() => { setScheduleText(displaySchedule || ''); setEditingSchedule(true); }}
              className="text-xs px-2.5 py-1 rounded-lg bg-accent-400/10 text-accent-400 hover:bg-accent-400/20 transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Modifier
            </button>
          )}
        </div>
        {editingSchedule ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={scheduleText}
              onChange={e => setScheduleText(e.target.value)}
              className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream"
              placeholder="Ex: Chaque mercredi \u00e0 16h30"
            />
            <button onClick={handleSaveSchedule} disabled={savingSchedule} className="px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 shrink-0">
              <Save className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingSchedule(false)} className="px-3 py-2 rounded-lg bg-white/5 text-muted hover:text-cream transition-colors shrink-0">
              Annuler
            </button>
          </div>
        ) : (
          <p className={`text-sm ${displaySchedule ? 'text-cream' : 'text-muted/60'}`}>
            {displaySchedule || 'Aucun horaire d\u00e9fini. Le chef de d\u00e9partement peut le configurer.'}
          </p>
        )}
      </div>

      {/* Upcoming meetings */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider">Prochaines r\u00e9unions programm\u00e9es</p>
          {isLeader && (
            <button
              onClick={() => setShowNewMeeting(!showNewMeeting)}
              className="text-xs px-2.5 py-1 rounded-lg bg-accent-400/10 text-accent-400 hover:bg-accent-400/20 transition-colors flex items-center gap-1"
            >
              <Plus className={`w-3 h-3 transition-transform ${showNewMeeting ? 'rotate-45' : ''}`} />
              Programmer une r\u00e9union
            </button>
          )}
        </div>

        {showNewMeeting && isLeader && (
          <div className="space-y-3 mb-4 p-3 rounded-xl bg-white/3 border border-line/30">
            <input
              type="text"
              value={newMeeting.title}
              onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
              className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream"
              placeholder="Titre de la r\u00e9union *"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newMeeting.date}
                onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                className="input-surface rounded-lg px-3 py-2 text-sm text-cream"
              />
              <input
                type="time"
                value={newMeeting.time}
                onChange={e => setNewMeeting({ ...newMeeting, time: e.target.value })}
                className="input-surface rounded-lg px-3 py-2 text-sm text-cream"
              />
            </div>
            <input
              type="text"
              value={newMeeting.location}
              onChange={e => setNewMeeting({ ...newMeeting, location: e.target.value })}
              className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream"
              placeholder="Lieu (optionnel)"
            />
            <textarea
              value={newMeeting.agenda}
              onChange={e => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
              className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream min-h-[60px] resize-y"
              placeholder="Ordre du jour / Agenda (optionnel)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateMeeting}
                disabled={!newMeeting.title || !newMeeting.date || savingMeeting}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {savingMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Enregistrer
              </button>
              <button
                onClick={() => { setShowNewMeeting(false); setNewMeeting({ title: '', date: '', time: '', location: '', agenda: '' }); }}
                className="px-4 py-2 rounded-lg text-sm text-muted hover:text-cream bg-white/5 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {meetings.length === 0 && !showNewMeeting ? (
          <div className="text-center py-6">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 text-muted/40" />
            <p className="text-muted text-sm">Aucune r\u00e9union programm\u00e9e</p>
            {isLeader && <p className="text-muted/60 text-xs mt-1">Cliquez sur \"Programmer une r\u00e9union\" pour planifier.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m: any) => (
              <div key={m.id} className="rounded-xl bg-white/3 border border-line/20 p-3 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cream">{m.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        {new Date(m.meeting_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {m.meeting_time && <span>{m.meeting_time}</span>}
                      {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>}
                    </div>
                    {m.agenda && <p className="text-xs text-cream/60 mt-1.5 line-clamp-2">{m.agenda}</p>}
                  </div>
                  {isLeader && (
                    <button onClick={() => handleDeleteMeeting(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

"""

idx = content.find(insert_before_members)
if idx != -1:
    content = content[:idx] + render_meetings + content[idx:]
    print("Inserted renderMeetings function")
else:
    print("ERROR: Could not find renderMembers")

# ═══════════════════════════════════════════════════════════════
# FIX 9: Add meetings render case in the section router
# ═══════════════════════════════════════════════════════════════

old_router = """                ) : section.key === 'overview' ? renderOverview() :
                  section.key === 'members' ? renderMembers() :
                  section.key === 'activity' ? renderActivity() :
                  section.key === 'notes' ? renderNotes() :
                  section.key === 'visitors' ? renderVisitors() :
                  null
                }"""

new_router = """                ) : section.key === 'overview' ? renderOverview() :
                  section.key === 'meetings' ? renderMeetings() :
                  section.key === 'members' ? renderMembers() :
                  section.key === 'activity' ? renderActivity() :
                  section.key === 'notes' ? renderNotes() :
                  section.key === 'visitors' ? renderVisitors() :
                  null
                }"""

content = content.replace(old_router, new_router)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("DepartmentSection.tsx updated successfully!")
print(f"File size: {len(content)} chars")
