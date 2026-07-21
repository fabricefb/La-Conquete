#!/usr/bin/env python3
"""
Fix DashboardPage.tsx:
1. Filter accepted items from "Mes demandes et reponses"
2. Display approved testimonies with validator pastor name
"""

import re

FILE_PATH = '/home/z/my-project/src/pages/DashboardPage.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ═══════════════════════════════════════════════════════════════
# FIX 1: Filter accepted items from loadMyRequests
# ═══════════════════════════════════════════════════════════════

old_load_my_requests = """  const loadMyRequests = async () => {
    if (!user) return;
    setMyRequestsLoading(true);
    try {
      const [visitRes, prayerRes, deptRes] = await Promise.all([
        supabase.from('visit_requests').select('id, reason, status, created_at, response, responded_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('prayer_requests').select('id, content, status, created_at, visibility, is_confidential').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('department_requests').select('id, department_id, status, created_at, departments(name)').eq('user_id', user.id).neq('status', 'accepte').order('created_at', { ascending: false }).limit(5),
      ]);

      const items: any[] = [];
      (visitRes.data || []).forEach((r: any) => items.push({ type: 'visit', id: r.id, label: `Visite: ${r.reason || 'Demande pastorale'}`, status: r.status, date: r.created_at, response: r.response, responded_at: r.responded_at }));
      (prayerRes.data || []).forEach((r: any) => items.push({ type: 'prayer', id: r.id, label: r.content?.slice(0, 60) + '...', status: r.status, date: r.created_at, visibility: r.visibility }));
      (deptRes.data || []).forEach((r: any) => items.push({ type: 'department', id: r.id, label: `Departement: ${r.departments?.name || 'N/A'}`, status: r.status, date: r.created_at }));

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyRequests(items.slice(0, 8));
    } catch (err) {
      console.error('Load my requests error:', err);
    } finally {
      setMyRequestsLoading(false);
    }
  };"""

new_load_my_requests = """  const loadMyRequests = async () => {
    if (!user) return;
    setMyRequestsLoading(true);
    try {
      const [visitRes, prayerRes, deptRes] = await Promise.all([
        supabase.from('visit_requests').select('id, reason, status, created_at, response, responded_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('prayer_requests').select('id, content, status, created_at, visibility, is_confidential').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('department_requests').select('id, department_id, status, created_at, departments(name)').eq('user_id', user.id).neq('status', 'accepte').order('created_at', { ascending: false }).limit(10),
      ]);

      const ACCEPTED_STATUSES = ['accepte', 'accepted', 'termine', 'repondu', 'answered', 'traite', 'ferme'];
      const items: any[] = [];
      (visitRes.data || []).forEach((r: any) => {
        if (!ACCEPTED_STATUSES.includes(r.status)) {
          items.push({ type: 'visit', id: r.id, label: `Visite: ${r.reason || 'Demande pastorale'}`, status: r.status, date: r.created_at, response: r.response, responded_at: r.responded_at });
        }
      });
      (prayerRes.data || []).forEach((r: any) => {
        if (!ACCEPTED_STATUSES.includes(r.status)) {
          items.push({ type: 'prayer', id: r.id, label: r.content?.slice(0, 60) + '...', status: r.status, date: r.created_at, visibility: r.visibility });
        }
      });
      (deptRes.data || []).forEach((r: any) => {
        if (!ACCEPTED_STATUSES.includes(r.status)) {
          items.push({ type: 'department', id: r.id, label: `Departement: ${r.departments?.name || 'N/A'}`, status: r.status, date: r.created_at });
        }
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyRequests(items.slice(0, 8));
    } catch (err) {
      console.error('Load my requests error:', err);
    } finally {
      setMyRequestsLoading(false);
    }
  };"""

content = content.replace(old_load_my_requests, new_load_my_requests)

# ═══════════════════════════════════════════════════════════════
# FIX 2: Add state for user testimonies + fetch function
# ═══════════════════════════════════════════════════════════════

old_testimony_state = """  // ── Testimony state ───────────────────────────────────────────
  const [showTestimonyForm, setShowTestimonyForm] = useState(false);
  const [testimonyContent, setTestimonyContent] = useState('');
  const [testimonyCategory, setTestimonyCategory] = useState('general');
  const [testimonyAnonymous, setTestimonyAnonymous] = useState(false);
  const [testimonySubmitting, setTestimonySubmitting] = useState(false);
  const [testimonySubmitted, setTestimonySubmitted] = useState(false);"""

new_testimony_state = """  // ── Testimony state ───────────────────────────────────────────
  const [showTestimonyForm, setShowTestimonyForm] = useState(false);
  const [testimonyContent, setTestimonyContent] = useState('');
  const [testimonyCategory, setTestimonyCategory] = useState('general');
  const [testimonyAnonymous, setTestimonyAnonymous] = useState(false);
  const [testimonySubmitting, setTestimonySubmitting] = useState(false);
  const [testimonySubmitted, setTestimonySubmitted] = useState(false);
  const [userTestimonies, setUserTestimonies] = useState<any[]>([]);"""

content = content.replace(old_testimony_state, new_testimony_state)

# ═══════════════════════════════════════════════════════════════
# FIX 3: Add fetch user testimonies after handleSubmitTestimony
# ═══════════════════════════════════════════════════════════════

old_after_testimony_submit = """  const TESTIMONY_CATEGORIES = ["""

new_after_testimony_submit = """  const fetchUserTestimonies = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('member_testimonies')
        .select('id, content, category, is_anonymous, status, published_at, created_at, reviewed_by, reviewer_profiles:user_profiles!reviewed_by(full_name, role_level)')
        .eq('user_id', user.id)
        .in('status', ['published', 'approved'])
        .order('published_at', { ascending: false })
        .limit(10);
      setUserTestimonies(data || []);
    } catch {
      console.error('Error fetching user testimonies');
    }
  }, [user]);

  useEffect(() => { fetchUserTestimonies(); }, [fetchUserTestimonies]);

  const TESTIMONY_CATEGORIES = ["""

content = content.replace(old_after_testimony_submit, new_after_testimony_submit)

# ═══════════════════════════════════════════════════════════════
# FIX 4: Update handleSubmitTestimony to refresh testimonies
# ═══════════════════════════════════════════════════════════════

old_submit_testimony = """      addToast('Temoignage soumis ! Il sera publie apres examen.', 'success');
      setTestimonyContent('');
      setTestimonyCategory('general');
      setTestimonyAnonymous(false);
      setTestimonySubmitted(true);
      setShowTestimonyForm(false);"""

# Use ASCII-safe version for matching (the file may have accented chars)
# Let's find the pattern differently
import unicodedata
def normalize(s):
    return unicodedata.normalize('NFC', s)

# Try the exact match first
if old_submit_testimony in content:
    content = content.replace(old_submit_testimony, 
      """      addToast('Temoignage soumis ! Il sera publie apres examen.', 'success');
      setTestimonyContent('');
      setTestimonyCategory('general');
      setTestimonyAnonymous(false);
      setTestimonySubmitted(true);
      setShowTestimonyForm(false);
      fetchUserTestimonies();""")
else:
    # Try finding by context
    idx = content.find('setTestimonySubmitted(true)')
    if idx != -1:
        # Find the next line
        next_newline = content.index('\n', idx)
        content = content[:next_newline] + '\n      fetchUserTestimonies();' + content[next_newline:]
        print("Inserted fetchUserTestimonies() call after setTestimonySubmitted(true)")

# Also reset testimonySubmitted after some time
old_reset_testimony = """                    <button onClick={() => setTestimonySubmitted(false)} className="btn-ghost text-sm px-4 py-2 mt-4">
                      Partager un autre temoignage
                    </button>"""

new_reset_testimony = """                    <button onClick={() => { setTestimonySubmitted(false); fetchUserTestimonies(); }} className="btn-ghost text-sm px-4 py-2 mt-4">
                      Partager un autre temoignage
                    </button>"""

if old_reset_testimony in content:
    content = content.replace(old_reset_testimony, new_reset_testimony)
else:
    # Find it by searching for the pattern
    idx = content.find("setTestimonySubmitted(false)")
    if idx != -1:
        # Check if there's already a fetchUserTestimonies call
        line_start = content.rfind('\n', 0, idx)
        line_end = content.find('\n', idx)
        line = content[line_start:line_end]
        if 'fetchUserTestimonies' not in line:
            content = content[:line_start] + line.replace(
                'setTestimonySubmitted(false)}',
                '{ setTestimonySubmitted(false); fetchUserTestimonies(); }'
            ) + content[line_end:]
            print("Updated Partager un autre temoignage button")

# ═══════════════════════════════════════════════════════════════
# FIX 5: Replace the testimony section to show approved testimonies
# ═══════════════════════════════════════════════════════════════

# Find the section after the testimony form that currently says "Aucun temoignage partage"
old_empty_testimony = """                ) : (
                  <div className="glass-card flex flex-col items-center justify-center py-10 text-center">
                    <Quote className="mb-3 h-10 w-10 text-accent-400/30" />
                    <p className="text-muted text-sm mb-1">Aucun temoignage partage</p>
                    <p className="text-xs text-muted/60">Partagez ce que Dieu a fait dans votre vie pour encourager l'eglise.</p>
                  </div>
                )}
              </section>
            </EvtReveal>"""

new_testimony_section = """                ) : userTestimonies.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-10 text-center">
                    <Quote className="mb-3 h-10 w-10 text-accent-400/30" />
                    <p className="text-muted text-sm mb-1">Aucun temoignage partage</p>
                    <p className="text-xs text-muted/60">Partagez ce que Dieu a fait dans votre vie pour encourager l'eglise.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTestimonies.map((t: any) => (
                      <div key={t.id} className="glass-card p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full bg-accent-400/10 text-accent-400 border border-accent-400/20`}>
                            {t.category === 'general' ? 'General' : t.category === 'guerison' ? 'Guerison' : t.category === 'finance' ? 'Finance' : t.category === 'miracle' ? 'Miracle' : t.category === 'salut' ? 'Salut' : t.category === 'famille' ? 'Famille' : t.category === 'delivrance' ? 'Delivrance' : 'Autre'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Publie</span>
                          </div>
                        </div>
                        <p className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap">{t.content}</p>
                        {t.reviewer_profiles && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                              <Shield className="h-3 w-3 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[11px] text-cream/70">
                                Valide par <span className="font-medium text-cream">{t.reviewer_profiles.full_name || 'Un pasteur'}</span>
                              </p>
                              <p className="text-[10px] text-muted/60">
                                {t.published_at ? new Date(t.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                              </p>
                            </div>
                          </div>
                        )}
                        {!t.is_anonymous && (
                          <p className="mt-2 text-[10px] text-muted/50">
                            Partage le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </EvtReveal>"""

# Find the pattern in the file - need to handle accented chars
# Search for the empty state div
pattern_empty = 'Aucun t\u00e9moignage partag\u00e9'
if pattern_empty in content:
    # Find the start of this block
    start_marker = ") : (\n"
    # Find the specific occurrence near the testimony section
    idx = content.find(pattern_empty)
    if idx != -1:
        # Find the start of the ternary expression
        # Go back to find ") : ("
        search_start = content.rfind(') : (', 0, idx)
        if search_start != -1:
            # Find the end - look for the closing of the section
            end_marker = '</section>\n            </EvtReveal>'
            end_idx = content.find(end_marker, idx)
            if end_idx != -1:
                end_idx += len(end_marker)
                old_block = content[search_start:end_idx]
                # Build new block
                # We need to rebuild from the ternary
                # The ternary is: testimonySubmitted ? (...) : showTestimonyForm ? (...) : (empty state)
                # We want to change the last part
                new_block = """) : userTestimonies.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-10 text-center">
                    <Quote className="mb-3 h-10 w-10 text-accent-400/30" />
                    <p className="text-muted text-sm mb-1">Aucun t\u00e9moignage partag\u00e9</p>
                    <p className="text-xs text-muted/60">Partagez ce que Dieu a fait dans votre vie pour encourager l'\u00e9glise.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTestimonies.map((t: any) => (
                      <div key={t.id} className="glass-card p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full bg-accent-400/10 text-accent-400 border border-accent-400/20`}>
                            {t.category === 'general' ? 'G\u00e9n\u00e9ral' : t.category === 'guerison' ? 'Gu\u00e9rison' : t.category === 'finance' ? 'Finance' : t.category === 'miracle' ? 'Miracle' : t.category === 'salut' ? 'Salut' : t.category === 'famille' ? 'Famille' : t.category === 'delivrance' ? 'D\u00e9livrance' : 'Autre'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Publi\u00e9</span>
                          </div>
                        </div>
                        <p className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap">{t.content}</p>
                        {t.reviewer_profiles && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                              <Shield className="h-3 w-3 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[11px] text-cream/70">
                                Valid\u00e9 par <span className="font-medium text-cream">{t.reviewer_profiles.full_name || 'Un pasteur'}</span>
                              </p>
                              <p className="text-[10px] text-muted/60">
                                {t.published_at ? new Date(t.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                              </p>
                            </div>
                          </div>
                        )}
                        {!t.is_anonymous && (
                          <p className="mt-2 text-[10px] text-muted/50">
                            Partag\u00e9 le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </EvtReveal>"""
                content = content[:search_start] + new_block + content[end_idx:]
                print("Replaced empty testimony section with approved testimonies list")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("DashboardPage.tsx updated successfully!")
print(f"File size: {len(content)} chars")