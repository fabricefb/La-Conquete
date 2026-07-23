#!/usr/bin/env python3
"""Fix JeunessePage event-cards for mobile."""

FILE = '/home/z/my-project/src/pages/JeunessePage.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Event card image height responsive
content = content.replace('height: 220px', 'height: 180px')
changes += 1
print('1. Event card image 180px')

# 2. Section padding responsive (py-24 -> py-16 on mobile)
content = content.replace('className="py-24"', 'className="py-12 sm:py-16 md:py-24"')
changes += 1
print('2. Section padding responsive')

# 3. Section heading responsive
content = content.replace('text-3xl md:text-4xl font-semibold text-center', 'text-2xl sm:text-3xl md:text-4xl font-semibold text-center')
changes += 1
print('3. Section headings responsive')

# 4. Event card content padding
# The CSS has 24px padding, that's fine for mobile

# 5. Grid gap responsive
content = content.replace('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8', 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 md:gap-8')
changes += 1
print('4. Grid gap responsive')

# 6. CTA button responsive
content = content.replace('cherito-btn cherito-btn--white', 'cherito-btn cherito-btn--white text-[12px] sm:text-[13px] px-5 sm:px-6 py-2.5 sm:py-3')
changes += 1
print('5. CTA button responsive')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'\nJeunessePage: {changes} mobile fixes applied')
