#!/usr/bin/env python3
"""Fix SiteHeader: drawer z-index, animation, body scroll."""

FILE = '/home/z/my-project/src/components/SiteHeader.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Drawer z-index: z-50 -> z-[60]
content = content.replace(
    'fixed inset-0 z-50 flex flex-col bg-bg xl:hidden',
    'fixed inset-0 z-[60] flex flex-col bg-bg xl:hidden drawer-enter'
)
print('1. Drawer z-index z-[60] + drawer-enter animation added')

# 2. Drawer backdrop z-index
content = content.replace(
    'fixed inset-0 bg-black/50 z-40',
    'fixed inset-0 bg-black/50 z-[55]'
)
print('2. Drawer backdrop z-[55]')

# 3. User card overflow fix
content = content.replace(
    'flex items-center gap-3 rounded-2xl border ... p-4 mb-2',
    'flex items-center gap-3 rounded-2xl border p-4 mb-2 overflow-hidden'
)

# Try the exact string
old_user_card = 'rounded-2xl border border-line p-4 mb-2'
new_user_card = 'rounded-2xl border border-line p-4 mb-2 overflow-hidden'
if old_user_card in content:
    content = content.replace(old_user_card, new_user_card)
    print('3. User card overflow-hidden added')
else:
    print('3. User card: exact string not found, trying alternate')
    # Find the user card div pattern
    import re
    matches = list(re.finditer(r'rounded-2xl border.*?p-4 mb-2', content))
    for m in matches:
        if 'overflow' not in m.group():
            content = content[:m.start()] + m.group().replace('mb-2', 'mb-2 overflow-hidden') + content[m.end():]
            print('3. User card overflow-hidden added (regex)')
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print('SiteHeader fixes applied')
