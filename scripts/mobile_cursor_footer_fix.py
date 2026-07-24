#!/usr/bin/env python3
"""
Fix: (1) Cursor blinking on mobile, (2) Footer cutoff with last section.
Also runs the original mobile_optimize.py first.
"""
import re
import subprocess

def run_original():
    """Run the original mobile optimization script."""
    result = subprocess.run(
        ['python3', '/home/z/my-project/scripts/mobile_optimize.py'],
        capture_output=True, text=True, cwd='/home/z/my-project'
    )
    print(result.stdout)
    if result.stderr:
        print(f'STDERR: {result.stderr[:500]}')

def fix_cursor_and_footer():
    fixes = []

    # ═══════════════════════════════════════════════════════════
    # FIX 1: Hide typing-cursor on mobile (it looks broken)
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/index.css', 'r') as f:
        css = f.read()

    # Add mobile rule to hide typing cursor
    cursor_fix = '''  /* ─── Hide typing cursor on mobile ─── */
  @media (max-width: 768px) {
    .typing-cursor::after { display: none; }
  }

  /* ─── Smooth section-to-footer transition on mobile ─── */
  @media (max-width: 768px) {
    footer { margin-top: 0; }
  }'''

    # Insert before the PWA section at the end
    pwa_marker = '/* ═══════════════════════════════════════════════════════════\n   8. PWA'
    if 'Hide typing cursor on mobile' not in css:
        if pwa_marker in css:
            css = css.replace(pwa_marker, cursor_fix + '\n\n' + pwa_marker)
            fixes.append('CSS: Hide typing-cursor on mobile')
            fixes.append('CSS: Smooth section-footer transition on mobile')

    with open('/home/z/my-project/src/index.css', 'w') as f:
        f.write(css)

    # ═══════════════════════════════════════════════════════════
    # FIX 2: Add pb-8 before SiteFooter on all pages (prevent cutoff)
    # ═══════════════════════════════════════════════════════════
    import glob
    tsx_files = glob.glob('/home/z/my-project/src/pages/*.tsx')
    
    for filepath in tsx_files:
        with open(filepath, 'r') as f:
            content = f.read()
        
        if 'SiteFooter' not in content:
            continue
        
        modified = False
        
        # Pattern 1: <SiteFooter onNavigate=... /> (standalone, no preceding spacing)
        # We add a wrapper div with bottom spacing before the footer
        # But we need to be careful - only add if not already present
        
        # Check if there's already adequate spacing before SiteFooter
        # Look for the line(s) immediately before <SiteFooter
        lines = content.split('\n')
        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            new_lines.append(line)
            
            # Check if next non-empty line contains SiteFooter
            if '<SiteFooter' not in line:
                i += 1
                continue
                
            # This line has SiteFooter - check previous non-empty line for spacing
            # Look backwards for the previous non-empty, non-comment line
            prev_spacing = False
            for j in range(len(new_lines) - 2, -1, -1):
                prev = new_lines[j].strip()
                if not prev or prev.startswith('//') or prev.startswith('/*') or prev.startswith('*'):
                    continue
                # Check if it already has bottom padding or margin or is a section close
                if any(x in prev for x in ['</section>', '</div>', 'pb-', 'mb-', 'pt-']) or prev.endswith('>'):
                    prev_spacing = True
                break
            
            i += 1
        
        # Simpler approach: just ensure there's a spacer div before SiteFooter
        # Actually, the real issue is the footer's border-t creating a harsh line
        # and the last section's bg not extending smoothly into the footer
        
        # Better approach: Remove the harsh border-t from footer on mobile via CSS
        # Already handled above with the CSS fix
        
        # For pages WITHOUT mobile-bottom-pad, add it
        if 'mobile-bottom-pad' not in content and 'min-h-screen' in content:
            # Add mobile-bottom-pad to the root div
            content = content.replace(
                'className="min-h-screen bg-bg text-cream font-sans">',
                'className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">'
            )
            if content != content:  # This won't work as intended, let me fix
                pass
            # Re-read and check
            with open(filepath, 'r') as f:
                content = f.read()
            if 'mobile-bottom-pad' not in content and 'min-h-screen' in content:
                # Try pattern without text-cream
                content = content.replace(
                    'className="min-h-screen bg-bg text-cream font-sans">',
                    'className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">'
                )
                if 'mobile-bottom-pad' in content:
                    fname = filepath.split('/')[-1]
                    fixes.append(f'{fname}: Added mobile-bottom-pad')
                    modified = True
        
        if modified:
            with open(filepath, 'w') as f:
                f.write(content)

    # ═══════════════════════════════════════════════════════════
    # FIX 3: Ensure mobile-bottom-pad also covers footer height
    # The current padding is only for MobileNav (4rem).
    # On non-PWA mobile, footer is visible, so we need extra space.
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/index.css', 'r') as f:
        css = f.read()
    
    # Enhance mobile-bottom-pad to also account for footer on non-PWA mobile
    if '.mobile-bottom-pad' in css and 'mobile-footer-spacer' not in css:
        # The current rule:
        # .mobile-bottom-pad { padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px)); }
        # On non-standalone mobile (regular browser), footer is visible.
        # We need to NOT add extra space because the footer is inline (not fixed).
        # The real issue is that the last section's bottom padding is too small.
        # Let's just make the footer border-t softer on mobile.
        
        # Actually, let me add a spacer class for pages that need it
        spacer_css = '''  /* ─── Footer spacer for non-PWA mobile ─── */
  .footer-spacer {
    padding-bottom: 1rem;
  }
  @media (min-width: 1280px) {
    .footer-spacer { padding-bottom: 0; }
  }
'''
        
        if 'Footer spacer' not in css:
            css = css.replace(
                '  /* ─── Hide typing cursor on mobile ─── */',
                spacer_css + '  /* ─── Hide typing cursor on mobile ─── */'
            )
            fixes.append('CSS: Added footer-spacer utility')
    
    with open('/home/z/my-project/src/index.css', 'w') as f:
        f.write(css)

    # ═══════════════════════════════════════════════════════════
    # FIX 4: Make footer border-t softer/hidden on mobile
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/index.css', 'r') as f:
        css = f.read()
    
    if 'footer-border-soft' not in css:
        # Add a soft border override for mobile
        soft_border = '''  /* ─── Softer footer border on mobile ─── */
  @media (max-width: 768px) {
    .pwa-footer-hide { border-top-color: rgb(var(--border-subtle-rgb) / 0.04); }
  }
'''
        
        if 'Softer footer border' not in css:
            css = css.replace(
                '  /* ─── Hide typing cursor on mobile ─── */',
                soft_border + '  /* ─── Hide typing cursor on mobile ─── */'
            )
            fixes.append('CSS: Softer footer border on mobile')
    
    with open('/home/z/my-project/src/index.css', 'w') as f:
        f.write(css)

    # ═══════════════════════════════════════════════════════════
    # FIX 5: Add footer-spacer class before SiteFooter on key pages  
    # ═══════════════════════════════════════════════════════════
    key_pages = [
        '/home/z/my-project/src/pages/HomePage.tsx',
        '/home/z/my-project/src/pages/AboutPage.tsx',
        '/home/z/my-project/src/pages/ContactPage.tsx',
    ]
    
    for filepath in key_pages:
        with open(filepath, 'r') as f:
            content = f.read()
        
        if 'SiteFooter' not in content:
            continue
        
        # Add footer-spacer div before SiteFooter
        # Pattern: find <SiteFooter and add <div className="footer-spacer"> before it
        if 'footer-spacer' not in content:
            # Find the SiteFooter opening tag
            content = content.replace(
                '      <SiteFooter',
                '      <div className="footer-spacer" />\n      <SiteFooter'
            )
            if 'footer-spacer' in content:
                fname = filepath.split('/')[-1]
                fixes.append(f'{fname}: Added footer-spacer before SiteFooter')
                with open(filepath, 'w') as f:
                    f.write(content)

    print(f'\n=== CURSOR + FOOTER FIXES ===')
    print(f'Total additional fixes: {len(fixes)}')
    for i, fix in enumerate(fixes, 1):
        print(f'  {i}. {fix}')

if __name__ == '__main__':
    print('=== Running original mobile optimization script ===')
    run_original()
    print()
    print('=== Running cursor + footer fixes ===')
    fix_cursor_and_footer()
    print('\n=== ALL DONE ===')
