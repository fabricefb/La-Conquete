#!/usr/bin/env python3

FILE = '/home/z/my-project/src/pages/EventsPage.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Hero title: add mobile responsive font
old = 'text-headline-xl mb-6'
new = 'text-3xl sm:text-4xl md:text-headline-xl mb-4 sm:mb-6'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('1. Hero title responsive')

# 2. Hero subtitle responsive
old = 'text-body-lg text-sky-100 max-w-xl mb-8 leading-relaxed'
new = 'text-base sm:text-body-lg text-sky-100 max-w-xl mb-6 sm:mb-8 leading-relaxed'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('2. Hero subtitle responsive')

# 3. Bento grid: single col on mobile
old = 'grid grid-cols-2 gap-4'
new = 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print('3. Bento grid responsive')

# 4. Bento card: reduce aspect on mobile
content = content.replace('aspect-square', 'aspect-[4/3] sm:aspect-square')
changes += 1
print('4. Bento card aspect responsive')

# 5. Bento day number: responsive
content = content.replace('text-headline-xl font-bold text-accent-500 font-playfair', 'text-4xl sm:text-headline-xl font-bold text-accent-500 font-playfair')
changes += 1
print('5. Bento day number responsive')

# 6. Sticky filter: horizontal scroll on mobile
old_filters = '''flex flex-wrap items-center gap-2"'''
new_filters = '''flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-x-hide px-0"'''
if old_filters in content:
    content = content.replace(old_filters, new_filters, 1)
    changes += 1
    print('6. Filter bar horizontal scroll on mobile')

# 7. Category pill: bigger touch target
old_pill = 'px-5 py-2 rounded-full'
new_pill = 'px-4 py-2.5 sm:px-5 sm:py-2 rounded-full whitespace-nowrap'
if old_pill in content:
    content = content.replace(old_pill, new_pill)
    changes += 1
    print('7. Category pill touch targets')

# 8. Event card image height responsive
content = content.replace('h-64', 'h-48 sm:h-64')
changes += 1
print('8. Event card image height responsive')

# 9. Featured title responsive
old_feat_title = 'text-2xl md:text-3xl'
new_feat_title = 'text-xl sm:text-2xl md:text-3xl'
if old_feat_title in content:
    content = content.replace(old_feat_title, new_feat_title, 1)
    changes += 1
    print('9. Featured title responsive')

# 10. Date badge text responsive
content = content.replace('text-headline-md text-white', 'text-xl sm:text-headline-md text-white')
changes += 1
print('10. Date badge responsive')

# 11. Card padding responsive
content = content.replace('p-8 rounded-xl', 'p-5 sm:p-8 rounded-xl')
changes += 1
print('11. Card padding responsive')

# 12. Past-event month text
content = content.replace("text-[9px]", 'text-[10px]')
changes += 1
print('12. Past-event month text 10px')

# 13. Past-event category text
content = content.replace("text-[10px] font-bold uppercase tracking-widest text-white/70", 'text-[11px] font-bold uppercase tracking-widest text-white/70')
changes += 1
print('13. Past-event category text 11px')

# 14. Section headings responsive
content = content.replace('text-3xl md:text-4xl', 'text-2xl sm:text-3xl md:text-4xl')
changes += 1
print('14. Section headings responsive')

content = content.replace('text-2xl md:text-3xl', 'text-xl sm:text-2xl md:text-3xl')
changes += 1
print('15. Sub-section headings responsive')

# 16. Skeleton padding
content = content.replace('p-8 rounded-2xl', 'p-5 sm:p-8 rounded-2xl')
changes += 1
print('16. Skeleton padding responsive')

# 17. Hero meta: stack on mobile
old_meta = 'flex flex-wrap gap-4'
new_meta = 'flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4'
if old_meta in content:
    content = content.replace(old_meta, new_meta, 1)
    changes += 1
    print('17. Hero meta stack on mobile')

# 18. Prochain culte bar: justify start on mobile
old_bar = 'flex items-center justify-between'
new_bar = 'flex items-center justify-start sm:justify-between'
if old_bar in content:
    content = content.replace(old_bar, new_bar, 1)
    changes += 1
    print('18. Prochain culte bar mobile layout')

# 19. Newsletter section padding
content = content.replace('py-20', 'py-12 sm:py-16 md:py-20')
changes += 1
print('19. Newsletter padding responsive')

# 20. Empty state padding
content = content.replace('py-20 text-center', 'py-12 sm:py-20 text-center')
changes += 1
print('20. Empty state padding responsive')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nEventsPage: {changes} mobile fixes applied')
