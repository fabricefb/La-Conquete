#!/usr/bin/env python3
"""Fix form link expiration: ensure minimum 7 days from now."""

FILE = '/home/z/my-project/src/components/admin/tabs/PlanificationTab.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Old function
old_func = '''function computeFormDeadline(svc: { date: string; time: string | null; is_delayed: boolean; delayed_minutes: number }): string {
  const [y, m, d] = svc.date.split('-').map(Number);
  const tParts = (svc.time || '09:00').split(':').map(Number);
  const deadline = new Date(y, m - 1, d, tParts[0], tParts[1], 0, 0);
  deadline.setHours(deadline.getHours() - 12);
  if (svc.is_delayed && svc.delayed_minutes > 0) {
    deadline.setMinutes(deadline.getMinutes() + svc.delayed_minutes);
  }
  return deadline.toISOString();
}'''

new_func = '''function computeFormDeadline(svc: { date: string; time: string | null; is_delayed: boolean; delayed_minutes: number }): string {
  const [y, m, d] = svc.date.split('-').map(Number);
  const tParts = (svc.time || '09:00').split(':').map(Number);
  const deadline = new Date(y, m - 1, d, tParts[0], tParts[1], 0, 0);
  deadline.setHours(deadline.getHours() - 12);
  if (svc.is_delayed && svc.delayed_minutes > 0) {
    deadline.setMinutes(deadline.getMinutes() + svc.delayed_minutes);
  }
  // Ensure the link lasts at least 7 days from now (matches WhatsApp message)
  const minDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return deadline.getTime() < minDeadline.getTime() ? minDeadline.toISOString() : deadline.toISOString();
}'''

if old_func in content:
    content = content.replace(old_func, new_func)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: computeFormDeadline fixed - minimum 7 days')
else:
    print('ERROR: old function not found')
    import sys; sys.exit(1)
