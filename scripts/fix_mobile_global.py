#!/usr/bin/env python3
"""Fix global mobile issues across multiple pages."""

import re, os, glob

# 1. Fix TopBar: EN DIRECT button touch target
topbar = '/home/z/my-project/src/components/home/TopBar.tsx'
with open(topbar, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the countdown pills and don button bigger on mobile
content = content.replace('text-[10px] font-bold', 'text-[10px] sm:text-[11px] font-bold')
content = content.replace('px-1 py-0.5 rounded', 'px-2 sm:px-2.5 py-1 sm:py-1 rounded min-h-[32px] sm:min-h-0 flex items-center')

with open(topbar, 'w', encoding='utf-8') as f:
    f.write(content)
print('1. TopBar: touch targets improved')

# 2. Add mobile-bottom-pad to pages that render MobileNav
# Pages that include <MobileNav /> at the bottom need padding for the fixed bar
pages_with_nav = [
    '/home/z/my-project/src/pages/HomePage.tsx',
    '/home/z/my-project/src/pages/EventsPage.tsx',
    '/home/z/my-project/src/pages/JeunessePage.tsx',
    '/home/z/my-project/src/pages/AboutPage.tsx',
    '/home/z/my-project/src/pages/ContactPage.tsx',
    '/home/z/my-project/src/pages/DonsPage.tsx',
    '/home/z/my-project/src/pages/BlogPage.tsx',
    '/home/z/my-project/src/pages/MediaPage.tsx',
    '/home/z/my-project/src/pages/PredicationsPage.tsx',
    '/home/z/my-project/src/pages/EmissionsPage.tsx',
    '/home/z/my-project/src/pages/PasteursPage.tsx',
    '/home/z/my-project/src/pages/EnseignementsPage.tsx',
    '/home/z/my-project/src/pages/DepartmentsPage.tsx',
    '/home/z/my-project/src/pages/VisionPage.tsx',
    '/home/z/my-project/src/pages/MinisteresPage.tsx',
    '/home/z/my-project/src/pages/AnnoncesPage.tsx',
    '/home/z/my-project/src/pages/CommuniquesPage.tsx',
    '/home/z/my-project/src/pages/EvangelisationPage.tsx',
    '/home/z/my-project/src/pages/ExtensionsPage.tsx',
    '/home/z/my-project/src/pages/PastoralPage.tsx',
    '/home/z/my-project/src/pages/CommunicationPage.tsx',
]

# Find the last </section> or </div> before closing, add mobile-bottom-pad before it
fixed_pages = 0
for page_path in pages_with_nav:
    if not os.path.exists(page_path):
        continue
    with open(page_path, 'r', encoding='utf-8') as f:
        pc = f.read()

    # Check if it has MobileNav
    if 'MobileNav' not in pc:
        continue

    # Check if it already has mobile-bottom-pad
    if 'mobile-bottom-pad' in pc:
        continue

    # Find the last </section> before </div> at the end
    # Add pb-20 xl:pb-0 to the outermost container
    if 'min-h-screen">' in pc:
        pc = pc.replace('min-h-screen">', 'min-h-screen mobile-bottom-pad">', 1)
        fixed_pages += 1

    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(pc)

print(f'2. mobile-bottom-pad added to {fixed_pages} pages')

# 3. Fix TestimonialsCarousel dots touch target
carousel = '/home/z/my-project/src/components/home/TestimonialsCarousel.tsx'
with open(carousel, 'r', encoding='utf-8') as f:
    content = f.read()

# Find dot buttons and add min sizing
content = content.replace('w-2 h-2 rounded-full', 'w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full')

with open(carousel, 'w', encoding='utf-8') as f:
    f.write(content)
print('3. TestimonialsCarousel dots slightly larger')

# 4. Fix event-card CSS for mobile
with open('/home/z/my-project/src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

mobile_card_css = '''
  @media (max-width: 640px) {
    .event-card__image { height: 180px; }
    .event-card__content { padding: 16px; }
    .event-card__title { font-size: 1rem; }
    .event-card__meta li { font-size: 12px; }
    .event-card__date { font-size: 11px; padding: 4px 10px; top: 10px; left: 10px; }
    .event-card__category { font-size: 9px; padding: 3px 8px; top: 10px; right: 10px; }
    .cherito-btn { padding: 8px 16px; font-size: 12px; }
  }
'''

if '@media (max-width: 640px)' not in css or '.event-card__image' not in css.split('@media (max-width: 640px)')[-1] if '@media (max-width: 640px)' in css else True:
    # Add before the PWA section
    anchor = '/* ═══════════════════════════════════════════════════════════════════════\n   8. PWA'
    if anchor in css:
        css = css.replace(anchor, mobile_card_css + '\n' + anchor)
        with open('/home/z/my-project/src/index.css', 'w', encoding='utf-8') as f:
            f.write(css)
        print('4. Event card mobile CSS added')
    else:
        print('4. CSS anchor not found')
