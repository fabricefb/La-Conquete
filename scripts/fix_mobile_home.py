#!/usr/bin/env python3
"""Fix HomePage mobile responsiveness."""

FILE = '/home/z/my-project/src/pages/HomePage.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Hero title: responsive sizing
# Find the hero title and make it smaller on mobile
import re

# Hero title - look for the large title pattern
hero_patterns = [
    ('text-5xl md:text-7xl lg:text-8xl', 'text-4xl sm:text-5xl md:text-7xl lg:text-8xl'),
    ('text-5xl  md:text-7xl  lg:text-8xl', 'text-4xl sm:text-5xl md:text-7xl lg:text-8xl'),
]
for old, new in hero_patterns:
    if old in content:
        content = content.replace(old, new)
        changes += 1
        print(f'1. Hero title responsive')
        break

# 2. Pastor portrait height responsive
content = content.replace('h-[420px]', 'h-[280px] sm:h-[360px] md:h-[420px]')
changes += 1
print('2. Pastor portrait height responsive')

# 3. Pastor container height
content = content.replace('h-[460px]', 'h-[320px] sm:h-[400px] md:h-[460px]')
changes += 1
print('3. Pastor container height responsive')

# 4. Section py-24 -> responsive
# Count how many py-24 we have and replace them all
py_count = content.count('className="py-24"')
content = content.replace('className="py-24"', 'className="py-12 sm:py-16 md:py-24"')
changes += py_count
print(f'4. Section py-24 responsive ({py_count} occurrences)')

# 5. Section py-20 -> responsive
py20_count = content.count('className="py-20"')
content = content.replace('className="py-20"', 'className="py-10 sm:py-16 md:py-20"')
changes += py20_count
print(f'5. Section py-20 responsive ({py20_count} occurrences)')

# 6. Pillar card padding
content = content.replace('p-8 transition-all', 'p-5 sm:p-8 transition-all')
changes += 1
print('6. Pillar card padding responsive')

# 7. Explorer section - grid breakpoints
content = content.replace('grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5', 'grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5')
changes += 1
print('7. Explorer grid responsive')

# 8. Map section fixed height
content = content.replace('h-[520px]', 'h-[400px] sm:h-[480px] md:h-[520px]')
changes += 1
print('8. Map section height responsive')

# 9. Activity card hover text - make visible on mobile via CSS class
# Replace opacity-0 group-hover:opacity-100 with a mobile-friendly approach
# We add the hover-show class from CSS as fallback
old_hover = 'opacity-0 group-hover:opacity-100'
new_hover = 'opacity-0 sm:opacity-0 group-hover:opacity-100 hover-show'
if old_hover in content:
    content = content.replace(old_hover, new_hover)
    changes += 1
    print('9. Hover text visible on touch devices')

# 10. Translate hover for mobile
old_translate = 'translate-y-2 group-hover:translate-y-0'
new_translate = 'translate-y-2 sm:translate-y-2 group-hover:translate-y-0'
if old_translate in content:
    content = content.replace(old_translate, new_translate)
    changes += 1
    print('10. Hover translate mobile-safe')

# 11. Card h-64 responsive in explorer
content = content.replace('h-64', 'h-56 sm:h-64')
changes += 1
print('11. Explorer card h-56 on mobile')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nHomePage: {changes} mobile fixes applied')
