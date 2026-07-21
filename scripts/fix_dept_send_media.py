"""
DepartmentSection.tsx: Add 'Send to Media' button for department leaders
"""

FILE_PATH = '/home/z/my-project/src/components/dashboard/DepartmentSection.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Add state for sending message to media
old_meeting_state_end = "  const [savingMeeting, setSavingMeeting] = useState(false);"

new_meeting_state_end = """  const [savingMeeting, setSavingMeeting] = useState(false);

  /* ── Send to Media state ──────────────────────────────────────── */
  const [showSendToMedia, setShowSendToMedia] = useState(false);
  const [mediaMsg, setMediaMsg] = useState({ title: '', content: '', priority: 'normal' as string });
  const [sendingMedia, setSendingMedia] = useState(false);"""

content = content.replace(old_meeting_state_end, new_meeting_state_end)

# Add sendToMedia function after handleDeleteMeeting
old_after_delete_meeting = "  const handleDeleteMeeting = async (id: string) => {"
# Find the end of handleDeleteMeeting
idx = content.find('const handleDeleteMeeting = async')
if idx == -1:
    print('ERROR: handleDeleteMeeting not found')
    exit(1)

# Find the closing brace of handleDeleteMeeting
brace_count = 0
start = content.index('{', idx)
for i in range(start, len(content)):
    if content[i] == '{': brace_count += 1
    elif content[i] == '}': brace_count -= 1
    if brace_count == 0:
        end_of_func = i + 1
        break

send_function = '''

  const handleSendToMedia = async () => {
    if (!mediaMsg.title.trim() || !mediaMsg.content.trim()) {
      addToast('Titre et contenu obligatoires', 'error');
      return;
    }
    setSendingMedia(true);
    try {
      // Find the media/communication department ID
      const { data: mediaDepts } = await supabase
        .from('departments')
        .select('id')
        .or('name.ilike.%m\u00e9dia%,name.ilike.%communication%,name.ilike.%planification%')
        .limit(1);

      if (!mediaDepts || mediaDepts.length === 0) {
        addToast('D\u00e9partement M\u00e9dia non trouv\u00e9', 'error');
        setSendingMedia(false);
        return;
      }

      const { error } = await supabase
        .from('department_communications')
        .insert({
          sender_department_id: departmentId,
          recipient_department_id: mediaDepts[0].id,
          title: mediaMsg.title.trim(),
          content: mediaMsg.content.trim(),
          priority: mediaMsg.priority,
        });

      if (error) {
        if error.message?.includes('does not exist') || error.code == '42P01': {
          addToast('Module de communication en cours de configuration', 'error');
        } else throw error;
      } else {
        addToast('Message envoy\u00e9 au d\u00e9partement M\u00e9dia', 'success');
        setMediaMsg({ title: '', content: '', priority: 'normal' });
        setShowSendToMedia(false);
      }
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    } finally {
      setSendingMedia(false);
    }
  };
'''

content = content[:end_of_func] + send_function + content[end_of_func:]

# Add a 'Send to Media' button at the end of renderMeetings
old_meetings_end = '''                {isLeader && (
                  <button onClick={() => handleDeleteMeeting(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </button>
                )}'''

# Actually, let me add the send-to-media section at the end of the renderMeetings function
# Find the closing of renderMeetings
idx_rm = content.find('  const renderMeetings = () => (')
if idx_rm == -1:
    print('ERROR: renderMeetings not found')
    exit(1)

# Find the closing of this function
brace_count = 0
start = content.index('(', idx_rm)
for i in range(start, len(content)):
    if content[i] == '(': brace_count += 1
    elif content[i] == ')': brace_count -= 1
    if brace_count == 0:
        # The next line should be ; or have the semicolon
        break

# Instead of trying to parse the JSX, let me add the send-to-media section
# right before the end of the meetings glass card (before the last </div>)
# Find the pattern: </div>\n    </div>\n  );\n\n  const renderMembers

marker = '  const renderMembers = () => ('
idx_members = content.find(marker)
if idx_members == -1:
    print('ERROR: renderMembers not found')
    exit(1)

# Insert before renderMembers
send_media_section = '''
  /* ── Send to Media Department ── */
  const renderSendToMedia = () => (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted font-medium uppercase tracking-wider">Envoyer au d\u00e9partement M\u00e9dia</p>
        <button
          onClick={() => setShowSendToMedia(!showSendToMedia)}
          className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
        >
          <Send className={`w-3 h-3`} /> {showSendToMedia ? 'Fermer' : 'Nouveau message'}
        </button>
      </div>
      <p className="text-xs text-muted">Envoyez des informations, annonces ou demandes au d\u00e9partement M\u00e9dia et Communication.</p>

      {showSendToMedia && (
        <div className="space-y-3 p-3 rounded-xl bg-white/3 border border-line/30">
          <input
            type="text"
            value={mediaMsg.title}
            onChange={e => setMediaMsg({ ...mediaMsg, title: e.target.value })}
            className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream"
            placeholder="Titre du message *"
          />
          <select
            value={mediaMsg.priority}
            onChange={e => setMediaMsg({ ...mediaMsg, priority: e.target.value })}
            className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream"
          >
            <option value="normal">Priorit\u00e9 normale</option>
            <option value="high">Priorit\u00e9 haute</option>
            <option value="urgent">Urgent</option>
          </select>
          <textarea
            value={mediaMsg.content}
            onChange={e => setMediaMsg({ ...mediaMsg, content: e.target.value })}
            className="input-surface w-full rounded-lg px-3 py-2 text-sm text-cream min-h-[80px] resize-y"
            placeholder="Contenu du message *"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSendToMedia}
              disabled={!mediaMsg.title.trim() || !mediaMsg.content.trim() || sendingMedia}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {sendingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Envoyer
            </button>
            <button
              onClick={() => { setShowSendToMedia(false); setMediaMsg({ title: '', content: '', priority: 'normal' }); }}
              className="px-4 py-2 rounded-lg text-sm text-muted hover:text-cream bg-white/5 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );

'''

content = content[:idx_members] + send_media_section + content[idx_members:]

# Add the renderSendToMedia call in the meetings section
# Add it at the end of renderMeetings, right before the closing div
# Find the last </div> in renderMeetings
old_meetings_close = '''      </div>
    </div>
  );

  const renderSendToMedia'''
new_meetings_close = '''        {isLeader && renderSendToMedia()}
      </div>
    </div>
  );

  const renderMembers'''

content = content.replace(old_meetings_close, new_meetings_close)

# Add 'Send' to the imports if not present
if 'Send,' not in content:
    content = content.replace(
        '  Phone,\n  MapPin,',
        '  Phone,\n  Send,\n  MapPin,'
    )

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print('DepartmentSection.tsx updated with Send to Media!')
print(f'File size: {len(content)} chars')
