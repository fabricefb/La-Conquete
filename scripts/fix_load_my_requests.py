#!/usr/bin/env python3
"""Fix loadMyRequests to filter out accepted items."""
import re

FILE_PATH = '/home/z/my-project/src/pages/DashboardPage.tsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact block to replace using position-based approach
marker_start = "const items: any[] = [];\n      (visitRes.data || []).forEach((r: any) => items.push({ type: 'visit'"
marker_end = "setMyRequests(items.slice(0, 8));\n"

idx_start = content.find(marker_start)
idx_end = content.find(marker_end, idx_start)

if idx_start == -1 or idx_end == -1:
    print(f"ERROR: start={idx_start}, end={idx_end}")
    exit(1)

idx_end += len(marker_end)

# Extract the department label to preserve it
old_block = content[idx_start:idx_end]
dept_match = re.search(r"items\.push\(\{ type: 'department', id: r\.id, label: `([^`]+)`, status: r\.status, date: r\.created_at \}\);", old_block)
if dept_match:
    dept_label_code = f"label: `{dept_match.group(1)}`"
else:
    dept_label_code = "label: `Departement: ${r.departments?.name || 'N/A'}`"

new_block = f"""const ACCEPTED_STATUSES = ['accepte', 'accepted', 'termine', 'repondu', 'answered', 'traite', 'ferme'];
      const items: any[] = [];
      (visitRes.data || []).forEach((r: any) => {{
        if (!ACCEPTED_STATUSES.includes(r.status)) {{
          items.push({{ type: 'visit', id: r.id, label: `Visite: ${{r.reason || 'Demande pastorale'}}`, status: r.status, date: r.created_at, response: r.response, responded_at: r.responded_at }});
        }}
      }});
      (prayerRes.data || []).forEach((r: any) => {{
        if (!ACCEPTED_STATUSES.includes(r.status)) {{
          items.push({{ type: 'prayer', id: r.id, label: r.content?.slice(0, 60) + '...', status: r.status, date: r.created_at, visibility: r.visibility }});
        }}
      }});
      (deptRes.data || []).forEach((r: any) => {{
        if (!ACCEPTED_STATUSES.includes(r.status)) {{
          items.push({{ type: 'department', id: r.id, {dept_label_code}, status: r.status, date: r.created_at }});
        }}
      }});

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyRequests(items.slice(0, 8));
"""

content = content[:idx_start] + new_block + content[idx_end:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("loadMyRequests updated successfully!")