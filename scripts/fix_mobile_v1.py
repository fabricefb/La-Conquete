#!/usr/bin/env python3
"""Comprehensive mobile responsiveness fixes - Phase 1."""

# 1. Fix index.html viewport
html_path = '/home/z/my-project/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()
html = html.replace(
    'content="width=device-width, initial-scale=1.0"',
    'content="width=device-width, initial-scale=1.0, viewport-fit=cover"'
)
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
print('1. index.html: viewport-fit=cover added')

# 2. Fix MobileNav: safe-area, touch targets, label size, z-index
nav_path = '/home/z/my-project/src/components/MobileNav.tsx'
with open(nav_path, 'r', encoding='utf-8') as f:
    nav = f.read()

old_nav = '<nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around glass px-2 xl:hidden">'
new_nav = '<nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around glass px-2 xl:hidden pb-[max(0px,env(safe-area-inset-bottom))]">'
nav = nav.replace(old_nav, new_nav)

old_btn = 'className={`relative flex flex-col items-center gap-0.5 transition-all duration-300 ${isActive ? \'text-accent-300\' : \'text-muted\'}`}'
new_btn = 'className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] transition-all duration-300 ${isActive ? \'text-accent-300\' : \'text-muted\'}`}'
nav = nav.replace(old_btn, new_btn)

old_label = 'text-[9px] font-semibold uppercase tracking-tight'
new_label = 'text-[10px] font-semibold uppercase tracking-tight'
nav = nav.replace(old_label, new_label)

with open(nav_path, 'w', encoding='utf-8') as f:
    f.write(nav)
print('2. MobileNav: safe-area, touch targets, label 10px, z-40')

# 3. Fix index.css: add mobile bottom padding utility and more mobile optimizations
css_path = '/home/z/my-project/src/index.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

mobile_additions = '''
  /* ─── Mobile bottom padding (for fixed MobileNav) ─── */
  .mobile-bottom-pad {
    padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
  }
  @media (min-width: 1280px) {
    .mobile-bottom-pad { padding-bottom: 0; }
  }

  /* ─── Mobile section padding reduction ─── */
  @media (max-width: 768px) {
    .py-responsive { padding-top: 4rem; padding-bottom: 4rem; }
  }
  @media (min-width: 769px) {
    .py-responsive { padding-top: 6rem; padding-bottom: 6rem; }
  }

  /* ─── Touch-friendly hover fallback ─── */
  @media (hover: none) and (pointer: coarse) {
    .hover-show { opacity: 1 !important; transform: none !important; }
    .group:hover .group-hover-show-mobile { opacity: 1 !important; transform: translateY(0) !important; }
  }

  /* ─── Horizontal scroll hide scrollbar ─── */
  .scrollbar-x-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-x-hide::-webkit-scrollbar { display: none; }

  /* ─── Drawer animation ─── */
  .drawer-enter { animation: drawerSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
  @keyframes drawerSlideIn { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }

  /* ─── Hide particles on mobile (perf) ─── */
  @media (max-width: 768px) {
    .mobile-hide-particle { display: none !important; }
  }
'''

# Insert before the PWA section
anchor = '/* ═══════════════════════════════════════════════════════════════════════\n   8. PWA'
if anchor in css:
    css = css.replace(anchor, mobile_additions + '\n' + anchor)
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css)
    print('3. index.css: mobile utilities added')
else:
    print('ERROR: CSS anchor not found')
