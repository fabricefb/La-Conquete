#!/usr/bin/env python3
"""Fix regenerated link expiration: when form_deadline_at is null, use now + 7 days."""

FILE = '/home/z/my-project/src/components/admin/tabs/PlanificationTab.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old = """      const svc = services.find(s => s.id === serviceId);
      const expiresAt = svc?.form_deadline_at || null;"""

new = """      const svc = services.find(s => s.id === serviceId);
      // Ensure at least 7 days from now (matches WhatsApp message)
      let expiresAt = svc?.form_deadline_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      if (new Date(expiresAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000) {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }"""

if old in content:
    content = content.replace(old, new)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Regenerated link expiration fixed')
else:
    print('ERROR: old text not found')
