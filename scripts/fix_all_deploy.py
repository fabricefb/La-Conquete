#!/usr/bin/env python3
"""
Master script: (1) Replace event cards on homepage, (2) Cursor/footer fixes,
(3) Mobile optimizations, (4) Build + Deploy.
"""
import re, subprocess, sys, os

BASE = '/home/z/my-project'

def fix_homepage_event_cards():
    """Replace the glass-card event cards with template-style event cards."""
    path = f'{BASE}/src/pages/HomePage.tsx'
    with open(path, 'r') as f:
        content = f.read()

    # Check if MapPin is already imported
    if 'MapPin' not in content:
        # Add MapPin to the icons import
        content = content.replace(
            '  Calendar,\n  Eye,',
            '  Calendar,\n  MapPin,\n  Eye,'
        )

    # The old event card block (lines 775-809 approximately)
    old_block = '''            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 3).map((evt, i) => (
                <RevealSection key={evt.id} className={`reveal-delay-${i + 1}`}>
                  <div className="glass-card group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1">
                    {evt.image_url && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={evt.image_url}
                          alt={evt.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-accent-400/20 border border-accent-400/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-300 backdrop-blur-sm">
                          <Calendar className="h-3 w-3" />
                          {evt.category}
                        </span>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(evt.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-cream leading-snug">{evt.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">{evt.description}</p>
                      <button onClick={() => onNavigate('events')} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors">
                        En savoir plus <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>'''

    new_block = '''            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 3).map((evt, i) => {
                const evtDate = new Date(evt.event_date);
                const dayNum = evtDate.getDate();
                const monthShort = evtDate.toLocaleDateString('fr-FR', { month: 'short' });
                const fullDate = evtDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                return (
                <RevealSection key={evt.id} className={`reveal-delay-${i + 1}`}>
                  <div className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20">
                    {/* Image section */}
                    {evt.image_url && (
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={evt.image_url}
                          alt={evt.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {/* Date badge - top left */}
                        <div className="absolute left-4 top-4 flex flex-col items-center justify-center rounded-xl bg-evangile-600 px-3 py-2 text-center shadow-lg">
                          <span className="block text-2xl font-bold leading-none text-white">{dayNum}</span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/80 mt-0.5">{monthShort}</span>
                        </div>
                        {/* Category badge - top right */}
                        <span className="absolute right-3 top-3 inline-flex items-center rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                          {evt.category}
                        </span>
                      </div>
                    )}
                    {/* Content section */}
                    <div className="p-5 sm:p-6">
                      <h3 className="font-serif text-lg font-semibold text-cream leading-snug group-hover:text-accent-300 transition-colors">
                        {evt.title}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        <li className="flex items-center gap-2 text-xs text-muted">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-accent-400/60" />
                          {fullDate}
                        </li>
                        {evt.location && (
                          <li className="flex items-center gap-2 text-xs text-muted">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-accent-400/60" />
                            {evt.location}
                          </li>
                        )}
                      </ul>
                      <button
                        onClick={() => onNavigate('events')}
                        className="btn-gold mt-5 text-xs px-5 py-2.5"
                      >
                        D\u00e9tails de l'\u00e9v\u00e9nement
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </RevealSection>
                );
              })}
            </div>'''

    if old_block in content:
        content = content.replace(old_block, new_block)
        print('  OK: Replaced event cards with template style')
    else:
        print('  SKIP: Event card block not found (may already be updated)')

    with open(path, 'w') as f:
        f.write(content)

def fix_cursor_mobile():
    """Hide typing-cursor on mobile + soften footer border."""
    path = f'{BASE}/src/index.css'
    with open(path, 'r') as f:
        css = f.read()

    fixes = []

    # 1. Hide typing cursor on mobile
    if 'Hide typing cursor on mobile' not in css:
        cursor_css = '''  /* ─── Hide typing cursor on mobile ─── */
  @media (max-width: 768px) {
    .typing-cursor::after { display: none; }
  }

'''
        # Insert before the PWA section
        pwa_marker = '/* ===='
        # Find a good insertion point - before the last major section
        # Use the particle optimization block as anchor
        particle_marker = '  /* --- Mobile particle/performance optimizations --- */'
        if particle_marker in css:
            css = css.replace(particle_marker, cursor_css + particle_marker)
            fixes.append('Hide typing-cursor on mobile')
        else:
            # Fallback: append before last closing brace
            css = css.rstrip() + '\n\n' + cursor_css
            fixes.append('Hide typing-cursor on mobile (appended)')

    # 2. Footer spacing - enhance footer-spacer
    if 'footer-spacer' not in css:
        spacer_css = '''  /* ─── Footer spacer ─── */
  .footer-spacer {
    height: 0;
  }
  @media (max-width: 768px) {
    .footer-spacer {
      height: 1rem;
    }
  }

'''
        css = css.rstrip() + '\n\n' + spacer_css
        fixes.append('Added footer-spacer CSS')

    # 3. Softer footer border on mobile
    if 'Softer footer border on mobile' not in css:
        border_css = '''  /* ─── Softer footer border on mobile ─── */
  @media (max-width: 768px) {
    footer, footer[class*="border"] {
      border-top-color: rgba(255, 255, 255, 0.04) !important;
    }
  }

'''
        css = css.rstrip() + '\n\n' + border_css
        fixes.append('Softer footer border on mobile')

    if fixes:
        with open(path, 'w') as f:
            f.write(css)
        for fix in fixes:
            print(f'  OK: {fix}')
    else:
        print('  SKIP: Cursor/footer CSS already applied')

def run_mobile_optimize():
    """Run the existing mobile_optimize.py script."""
    print('\n=== Running mobile_optimize.py ===')
    result = subprocess.run(
        ['python3', f'{BASE}/scripts/mobile_optimize.py'],
        capture_output=True, text=True, cwd=BASE
    )
    print(result.stdout)
    if result.stderr:
        print(f'  STDERR: {result.stderr[:500]}')
    return result.returncode == 0

def ensure_footer_spacer_pages():
    """Ensure footer-spacer div exists before SiteFooter on key pages."""
    import glob
    fixes = []
    for filepath in glob.glob(f'{BASE}/src/pages/*.tsx'):
        with open(filepath, 'r') as f:
            content = f.read()
        if 'SiteFooter' not in content or 'footer-spacer' in content:
            continue
        # Add footer-spacer div before SiteFooter
        content = content.replace(
            '      <SiteFooter',
            '      <div className="footer-spacer" />\n      <SiteFooter'
        )
        if 'footer-spacer' in content:
            fname = filepath.split('/')[-1]
            with open(filepath, 'w') as f:
                f.write(content)
            fixes.append(fname)
    if fixes:
        print(f'  OK: Added footer-spacer to: {", ".join(fixes)}')
    else:
        print('  SKIP: All pages already have footer-spacer')

def build():
    """Run npm build."""
    print('\n=== Building ===')
    result = subprocess.run(
        ['npm', 'run', 'build'],
        capture_output=True, text=True, cwd=BASE,
        timeout=120
    )
    if result.returncode == 0:
        print('  OK: Build successful')
        return True
    else:
        print(f'  FAIL: Build failed')
        print(result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout)
        print(result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr)
        return False

def deploy():
    """Git add, commit, push to trigger Cloudflare Pages deploy."""
    print('\n=== Deploying ===')
    subprocess.run(['git', 'add', '-A'], cwd=BASE)
    result = subprocess.run(
        ['git', 'commit', '-m', 'fix: event cards template style + cursor/footer mobile fixes + mobile optimizations'],
        capture_output=True, text=True, cwd=BASE
    )
    if 'nothing to commit' in result.stdout or 'nothing to commit' in result.stderr:
        print('  SKIP: Nothing to commit')
    else:
        print(f'  OK: {result.stdout.strip()}')

    result = subprocess.run(
        ['git', 'push', 'origin', 'main'],
        capture_output=True, text=True, cwd=BASE,
        timeout=60
    )
    if result.returncode == 0:
        print('  OK: Pushed to origin/main - Cloudflare Pages will auto-deploy')
        return True
    else:
        print(f'  FAIL: Push failed')
        print(result.stderr[:1000])
        return False

if __name__ == '__main__':
    print('=== STEP 1: Fix event cards on homepage ===')
    fix_homepage_event_cards()

    print('\n=== STEP 2: Cursor + footer CSS fixes ===')
    fix_cursor_mobile()

    print('\n=== STEP 3: Footer spacer on all pages ===')
    ensure_footer_spacer_pages()

    print('\n=== STEP 4: Mobile optimizations ===')
    run_mobile_optimize()

    print('\n=== STEP 5: Build ===')
    if build():
        print('\n=== STEP 6: Deploy ===')
        deploy()
    else:
        print('\nBuild failed - skipping deploy. Fix errors above.')
        sys.exit(1)

    print('\n=== ALL DONE ===')