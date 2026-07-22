"""
MediaCenterSection.tsx changes:
Add 'Department Communications Inbox' section showing messages from other departments
"""

FILE_PATH = '/home/z/my-project/src/components/dashboard/MediaCenterSection.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# FIX 1: Add state for department communications
# ═══════════════════════════════════════════════════════════════

old_state = """  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);"""

new_state = """  const [formLinks, setFormLinks] = useState<WorshipFormLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // ── Department communications inbox ──
  const [deptMessages, setDeptMessages] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(false);"""

content = content.replace(old_state, new_state)

# ═══════════════════════════════════════════════════════════════
# FIX 2: Add fetch for department communications in fetchServices
# ═══════════════════════════════════════════════════════════════

old_finally = """    } finally {
      setLoading(false);
    }
  }, [addToast]);"""

new_finally = """    } finally {
      setLoading(false);
    }

    // Fetch department communications sent to media/communication
    try {
      const { data: commData } = await supabase
        .from('department_communications')
        .select('id, title, content, priority, sender_dept:departments!sender_department_id(name), created_at, is_read')
        .order('created_at', { ascending: false })
        .limit(20);
      setDeptMessages(commData || []);
    } catch {
      // Table may not exist yet - that's OK
    }
  }, [addToast]);"""

content = content.replace(old_finally, new_finally)

# ═══════════════════════════════════════════════════════════════
# FIX 3: Add inbox section in the render output
# ═══════════════════════════════════════════════════════════════

old_special_events = """      {/* Special events */}
      {groupedSpecial.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-cream/60" />
            <span className="text-sm font-medium text-cream/80">\\u00c9v\\u00e9nements sp\\u00e9ciaux</span>
          </div>
          {groupedSpecial.map(renderGroup)}
        </div>
      )}
    </div>
  );
}"""

# Find the actual closing of the component
idx = content.find("}  // end of MediaCenterSection") 
if idx == -1:
    # Try finding the end of the return
    idx = content.rfind("  );\n}")
    
# Actually, let me find the end more precisely
# The last thing in the return is the special events section followed by </div>\n  );
# }
end_pattern = """      {/* Special events */}
      {groupedSpecial.length > 0 && ("""

idx = content.find(end_pattern)
if idx == -1:
    print("ERROR: Could not find special events section")
    exit(1)

# Find the closing of this section - it's the </div> at the end of the return
# Find the pattern: </div>\n  );\n}
search_from = idx
end_idx = content.find("\n    </div>\n  );\n}", search_from)
if end_idx == -1:
    # Try alternative
    end_idx = content.find("</div>\n  );\n}", search_from)

# Let me find the absolute end of the return block
# The return starts around line 782
# I'll insert before the final closing </div>
final_div = content.rfind("    </div>\n  );\n}", 0)
if final_div == -1:
    print("ERROR: Could not find end of return block")
    exit(1)

# Insert the inbox section before the final </div>
inbox_section = """
      {/* Department Communications Inbox */}
      <div className="glass-card rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInbox(!showInbox)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4.5 w-4.5 text-cyan-400" />
            <span className="text-sm font-medium text-cream">Communications des d\\u00e9partements</span>
            {deptMessages.filter(m => !m.is_read).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                {deptMessages.filter(m => !m.is_read).length} nouveau{x
                deptMessages.filter(m => !m.is_read).length > 1 ? 'x' : ''
                }
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${showInbox ? 'rotate-180' : ''}`} />
        </button>
        {showInbox && (
          <div className="border-t border-line/30 p-4 space-y-3 max-h-96 overflow-y-auto">
            {deptMessages.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted/40" />
                <p className="text-muted text-sm">Aucune communication re\\u00e7ue</p>
                <p className="text-muted/60 text-xs mt-1">Les messages des autres d\\u00e9partements appara\\u00eetront ici.</p>
              </div>
            ) : (
              deptMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 border transition-colors ${!msg.is_read ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/2 border-line/20'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {!msg.is_read && <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />}
                      <p className="text-sm font-medium text-cream">{msg.title}</p>
                    </div>
                    <span className="text-[10px] text-muted shrink-0">
                      {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {msg.sender_dept && (
                    <p className="text-[10px] text-cyan-400/70 mb-1">De: {msg.sender_dept.name}</p>
                  )}
                  <p className="text-xs text-cream/70 line-clamp-3">{msg.content}</p>
                  {msg.priority === 'urgent' && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-red-400 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Urgent
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
"""

# Insert before the final </div>
content = content[:final_div] + inbox_section + content[final_div:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("MediaCenterSection.tsx updated successfully!")
print(f"File size: {len(content)} chars")