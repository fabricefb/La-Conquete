#!/usr/bin/env python3
"""
Mobile responsiveness optimization script for La Conquete website.
Applies all mobile fixes across all pages in one pass.
"""
import re

def apply_fixes():
    fixes_applied = []

    # ═══════════════════════════════════════════════════════════
    # 1. index.css — Global mobile optimizations
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/index.css', 'r') as f:
        css = f.read()

    # 1a. Responsive cutout mask for mobile
    if '@media (max-width: 640px)' not in css or 'cutout-mask' not in css.split('@media')[0].split('.cutout-mask')[0] if '.cutout-mask' in css else True:
        old_cutout = '.cutout-mask { clip-path: polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%); }'
        new_cutout = '''.cutout-mask { clip-path: polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%); }
  @media (max-width: 640px) {
    .cutout-mask { clip-path: polygon(0 0, 100% 0, 100% 92%, 96% 100%, 0 100%); }
  }'''
        if old_cutout in css:
            css = css.replace(old_cutout, new_cutout)
            fixes_applied.append('CSS: Responsive cutout mask on mobile')

    # 1b. Hide particles on mobile for performance
    if '.mobile-hide-particle' not in css:
        # Add after the existing mobile touch enhancements block
        mobile_block = '''  /* ─── Mobile touch enhancements ─── */
  @media (max-width: 768px) {'''
        new_particle_css = '''  /* ─── Mobile particle/performance optimizations ─── */
  .mobile-hide-particle { display: none; }
  @media (max-width: 768px) {
    .particle { display: none !important; }
    .parallax-layer-1, .parallax-layer-2 { transform: none !important; }
  }

  /* ─── Mobile touch enhancements ─── */
  @media (max-width: 768px) {'''
        if mobile_block in css:
            css = css.replace(mobile_block, new_particle_css)
            fixes_applied.append('CSS: Hide particles & disable parallax on mobile')

    # 1c. Add scrollbar-x-hide utility
    if '.scrollbar-x-hide' not in css:
        scrollbar_css = '''  /* ─── Horizontal scrollbar hide ─── */
  .scrollbar-x-hide::-webkit-scrollbar { display: none; }
  .scrollbar-x-hide { -ms-overflow-style: none; scrollbar-width: none; }

  /* ─── Mobile touch enhancements ─── */'''
        if '/* ─── Mobile touch enhancements ─── */' in css and scrollbar_css.split('/* ─── Mobile touch enhancements ─── */')[0] not in css:
            css = css.replace('  /* ─── Mobile touch enhancements ─── */', scrollbar_css)
            fixes_applied.append('CSS: scrollbar-x-hide utility')

    # 1d. Add global active:scale for touch feedback on cards
    if 'active:scale-95' not in css and '.glass-card:active' not in css:
        active_css = '''  /* ─── Mobile particle/performance optimizations ─── */'''
        touch_feedback = '''  /* ─── Touch feedback for cards ─── */
  @media (max-width: 768px) {
    .glass-card:active, .glass:active { transform: scale(0.98); transition: transform 0.1s; }
    .group:active { transform: scale(0.98); }
  }

  /* ─── Mobile particle/performance optimizations ─── */'''
        if active_css in css:
            css = css.replace(active_css, touch_feedback)
            fixes_applied.append('CSS: Touch feedback on glass cards')

    # 1e. Add 100dvh support
    if '100dvh' not in css:
        dvh_css = 'html { height: 100%; }'
        dvh_new = 'html { height: 100%; height: 100dvh; }\n  @supports not (height: 100dvh) { html { height: 100vh; } }'
        if dvh_css in css:
            css = css.replace(dvh_css, dvh_new)
            fixes_applied.append('CSS: 100dvh viewport support')

    with open('/home/z/my-project/src/index.css', 'w') as f:
        f.write(css)

    # ═══════════════════════════════════════════════════════════
    # 2. ContactPage.tsx — Missing mobile-bottom-pad + spacing + touch targets
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/ContactPage.tsx', 'r') as f:
        contact = f.read()

    # 2a. Add mobile-bottom-pad to root div
    contact = contact.replace(
        '<div className="min-h-screen bg-bg text-cream font-sans">',
        '<div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">'
    )
    fixes_applied.append('ContactPage: Added mobile-bottom-pad')

    # 2b. Reduce py-24 sections
    contact = contact.replace('className="py-24">', 'className="py-12 md:py-20 lg:py-24">')
    contact = contact.replace('className="py-24 bg-radial-primary">', 'className="py-12 md:py-20 lg:py-24 bg-radial-primary">')
    fixes_applied.append('ContactPage: Reduced section padding for mobile')

    # 2c. Reduce form container padding
    contact = contact.replace('className="glass rounded-4xl p-8">', 'className="glass rounded-4xl p-5 md:p-8">')
    fixes_applied.append('ContactPage: Reduced form padding on mobile')

    # 2d. Reduce map height
    contact = contact.replace('className="h-[500px]"', 'className="h-[300px] sm:h-[400px] md:h-[500px]"')
    fixes_applied.append('ContactPage: Responsive map height')

    # 2e. Enlarge visitor type buttons (touch target)
    contact = contact.replace(
        'className={`rounded-xl px-3 py-2.5 text-xs font-medium border transition-all ${',
        'className={`rounded-xl px-3 py-3 text-xs font-medium border transition-all ${'
    )
    fixes_applied.append('ContactPage: Enlarged visitor type touch targets')

    # 2f. Enlarge subject suggestion buttons (touch target)
    contact = contact.replace(
        'className={`rounded-lg px-3 py-1.5 text-[11px] font-medium border transition-all ${',
        'className={`rounded-lg px-3 py-2.5 text-xs font-medium border transition-all ${'
    )
    fixes_applied.append('ContactPage: Enlarged subject suggestion touch targets')

    # 2g. Reduce heading sizes
    contact = contact.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">Nos cultes</h2>',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">Nos cultes</h2>'
    )
    contact = contact.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">\n              Nos lieux de culte',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">\n              Nos lieux de culte'
    )
    fixes_applied.append('ContactPage: Scaled down headings for mobile')

    # 2h. Add active:scale-95 to service time cards
    contact = contact.replace(
        'className="glass rounded-3xl p-6 text-center transition-all duration-300 hover:scale-105">',
        'className="glass rounded-3xl p-6 text-center transition-all duration-300 hover:scale-105 active:scale-95">'
    )
    fixes_applied.append('ContactPage: Added active:scale-95 to service cards')

    with open('/home/z/my-project/src/pages/ContactPage.tsx', 'w') as f:
        f.write(contact)

    # ═══════════════════════════════════════════════════════════
    # 3. EventsPage.tsx — Custom classes + footer outside main
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/EventsPage.tsx', 'r') as f:
        events = f.read()

    # 3a. Fix py-xl -> real padding
    events = events.replace(
        'className="relative py-xl overflow-hidden bg-ink-700 text-white">',
        'className="relative py-12 md:py-16 overflow-hidden bg-ink-700 text-white">'
    )
    fixes_applied.append('EventsPage: Replaced py-xl with py-12 md:py-16')

    # 3b. Fix px-margin-mobile/md:px-margin-desktop -> real padding
    events = events.replace('px-margin-mobile md:px-margin-desktop', 'px-4 md:px-6 lg:px-8')
    fixes_applied.append('EventsPage: Replaced custom margin classes')

    # 3c. Fix empty state conflicting padding
    events = events.replace(
        'className="py-12 sm:py-16 md:py-12 sm:py-20 text-center text-muted">',
        'className="py-12 sm:py-16 md:py-20 text-center text-muted">'
    )
    fixes_applied.append('EventsPage: Fixed empty state padding conflict')

    # 3d. Add mobile-bottom-pad to root (footer is outside main)
    events = events.replace(
        '<div className="min-h-screen bg-bg text-cream font-sans">',
        '<div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">'
    )
    fixes_applied.append('EventsPage: Added mobile-bottom-pad to root')

    # 3e. Enlarge category filter touch targets
    events = events.replace(
        'className={`px-4 py-2.5 sm:px-5 sm:py-2 rounded-full',
        'className={`px-4 py-3 sm:px-5 sm:py-2.5 rounded-full'
    )
    fixes_applied.append('EventsPage: Enlarged filter pill touch targets')

    # 3f. Add scrollbar-x-hide to filter container
    events = events.replace(
        'className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-x-hide px-0">',
        'className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-x-hide px-0 scrollbar-none">'
    )
    fixes_applied.append('EventsPage: Added scrollbar-none to filters')

    with open('/home/z/my-project/src/pages/EventsPage.tsx', 'w') as f:
        f.write(events)

    # ═══════════════════════════════════════════════════════════
    # 4. HomePage.tsx — 100dvh, particles, spacing, hover content
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/HomePage.tsx', 'r') as f:
        home = f.read()

    # 4a. h-[100vh] -> h-[100dvh] for mobile browsers
    home = home.replace(
        'className="relative w-full h-[100vh] m-0 p-0 spirit-breath flex items-center justify-center overflow-hidden"',
        'className="relative w-full h-[100dvh] m-0 p-0 spirit-breath flex items-center justify-center overflow-hidden"'
    )
    fixes_applied.append('HomePage: 100vh -> 100dvh for mobile browsers')

    # 4b. Reduce pillars section padding
    home = home.replace(
        '<section className="py-24 bg-radial-primary" style={getSectionStyle(\'pillars\')}>',
        '<section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle(\'pillars\')}>'
    )
    fixes_applied.append('HomePage: Reduced pillars section padding')

    # 4c. Reduce explore section padding
    home = home.replace(
        '<section className="py-24 bg-radial-primary" style={getSectionStyle(\'explore\')}>',
        '<section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle(\'explore\')}>'
    )
    fixes_applied.append('HomePage: Reduced explore section padding')

    # 4d. Reduce news section padding
    home = home.replace(
        '<section className="py-24 bg-radial-primary" style={getSectionStyle(\'news\')}>',
        '<section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle(\'news\')}>'
    )
    fixes_applied.append('HomePage: Reduced news section padding')

    # 4e. Reduce testimonials section padding
    home = home.replace(
        '<section className="py-24 bg-radial-primary" style={getSectionStyle(\'testimonials\')}>',
        '<section className="py-12 md:py-20 lg:py-24 bg-radial-primary" style={getSectionStyle(\'testimonials\')}>'
    )
    fixes_applied.append('HomePage: Reduced testimonials section padding')

    # 4f. Reduce quote section padding
    home = home.replace(
        'className="py-28"\n        style={{ backgroundColor:',
        'className="py-16 md:py-24 lg:py-28"\n        style={{ backgroundColor:'
    )
    fixes_applied.append('HomePage: Reduced quote section padding')

    # 4g. Show "Decouvrir" text on mobile (always visible on touch devices)
    home = home.replace(
        'className="mt-2 flex items-center gap-2 text-sm text-accent-300 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 sm:translate-y-2 group-hover:translate-y-0">',
        'className="mt-2 flex items-center gap-2 text-sm text-accent-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0 transition-all duration-300">'
    )
    fixes_applied.append('HomePage: Show Decouvrir text on mobile (touch)')

    # 4h. Reduce map section height on mobile
    home = home.replace(
        'className="relative h-[400px] sm:h-[480px] md:h-[520px] overflow-hidden">',
        'className="relative h-[280px] sm:h-[400px] md:h-[480px] lg:h-[520px] overflow-hidden">'
    )
    fixes_applied.append('HomePage: Reduced map height on mobile')

    # 4i. Make stat items wrap on small screens
    home = home.replace(
        'className="flex justify-center gap-12"',
        'className="flex flex-wrap justify-center gap-6 sm:gap-12"'
    )
    fixes_applied.append('HomePage: Stat items now wrap on small screens')

    with open('/home/z/my-project/src/pages/HomePage.tsx', 'w') as f:
        f.write(home)

    # ═══════════════════════════════════════════════════════════
    # 5. AboutPage.tsx — Spacing, headings, images, touch targets
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/AboutPage.tsx', 'r') as f:
        about = f.read()

    # 5a. Vision & Mission section
    about = about.replace(
        '<section className="py-20 px-4">\n        <div className="mx-auto max-w-6xl">\n          <div className="grid items-center gap-12 lg:grid-cols-2">\n            {/* Vision */',
        '<section className="py-12 md:py-20 px-4">\n        <div className="mx-auto max-w-6xl">\n          <div className="grid items-center gap-12 lg:grid-cols-2">\n            {/* Vision */'
    )

    # 5b. Reduce card padding
    about = about.replace(
        'className="glass rounded-3xl p-8 bg-radial-primary">',
        'className="glass rounded-3xl p-5 md:p-8 bg-radial-primary">'
    )
    about = about.replace(
        'className="glass rounded-3xl p-8">\n                <div className="mb-4 flex items-center gap-3">\n                  <IconBox pageKey="about" elementId="mission-heart-icon"',
        'className="glass rounded-3xl p-5 md:p-8">\n                <div className="mb-4 flex items-center gap-3">\n                  <IconBox pageKey="about" elementId="mission-heart-icon"'
    )
    fixes_applied.append('AboutPage: Reduced card padding for mobile')

    # 5c. Pasteur principal section
    about = about.replace(
        '<section className="py-20 px-4 bg-radial-ember">',
        '<section className="py-12 md:py-20 px-4 bg-radial-ember">'
    )
    fixes_applied.append('AboutPage: Reduced pasteur section padding')

    # 5d. All remaining py-20 sections (pattern replacement)
    about = re.sub(
        r'<section className="py-20 px-4">',
        '<section className="py-12 md:py-20 px-4">',
        about
    )
    about = re.sub(
        r'<section className="py-20 px-4 bg-radial-primary">',
        '<section className="py-12 md:py-20 px-4 bg-radial-primary">',
        about
    )
    fixes_applied.append('AboutPage: Reduced all section padding')

    # 5e. Heading sizes - Notre Pasteur
    about = about.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">Notre Pasteur</h2>',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">Notre Pasteur</h2>'
    )

    # 5f. Equipe pastorale heading
    about = about.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">{getContent(cm, \'team\', \'title\',',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">{getContent(cm, \'team\', \'title\','
    )

    # 5g. Gallery heading
    about = about.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">Notre Galerie</h2>',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">Notre Galerie</h2>'
    )

    # 5h. Predications heading
    about = about.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">Predications</h2>',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">Predications</h2>'
    )

    # 5i. Giving heading
    about = about.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">{getContent(cm, \'giving\', \'heading_title\',',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">{getContent(cm, \'giving\', \'heading_title\','
    )

    # 5j. Contact strip heading
    about = about.replace(
        'className="mt-4 font-serif text-4xl font-semibold text-cream">SOYEZ LES BIENVENUS CHEZ VOUS</h2>',
        'className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-cream">SOYEZ LES BIENVENUS CHEZ VOUS</h2>'
    )
    fixes_applied.append('AboutPage: Scaled down all headings for mobile')

    # 5k. Image heights
    about = about.replace(
        'className="relative h-80 w-64 rounded-3xl object-cover shadow-2xl sm:h-96 sm:w-72"',
        'className="relative h-64 w-56 rounded-3xl object-cover shadow-2xl sm:h-80 sm:w-64 md:h-96 md:w-72"'
    )
    about = about.replace(
        '<div className="h-64 overflow-hidden">\n                    <img src={member.photo_url',
        '<div className="h-48 sm:h-64 overflow-hidden">\n                    <img src={member.photo_url'
    )
    about = about.replace(
        'className="h-56 w-full object-cover transition-transform duration-500 hover:scale-105"',
        'className="h-40 sm:h-56 w-full object-cover transition-transform duration-500 hover:scale-105"'
    )
    about = about.replace(
        '<div className="relative h-48 overflow-hidden">\n                    <img src={pred.img}',
        '<div className="relative h-36 sm:h-48 overflow-hidden">\n                    <img src={pred.img}'
    )
    fixes_applied.append('AboutPage: Responsive image heights')

    # 5l. Add active:scale-95 to contact strip cards
    about = about.replace(
        'className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105 block">',
        'className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105 active:scale-95 block">'
    )
    about = about.replace(
        'className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105">\n                    <IconBox pageKey="about" elementId={`contact-${label',
        'className="glass rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105 active:scale-95">\n                    <IconBox pageKey="about" elementId={`contact-${label'
    )
    fixes_applied.append('AboutPage: Added active:scale-95 to contact cards')

    with open('/home/z/my-project/src/pages/AboutPage.tsx', 'w') as f:
        f.write(about)

    # ═══════════════════════════════════════════════════════════
    # 6. JeunessePage.tsx — Spacing, gallery height
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/JeunessePage.tsx', 'r') as f:
        jeunesse = f.read()

    # 6a. All py-20 sections
    jeunesse = re.sub(
        r'className="py-20 lg:py-28 px-4',
        'className="py-12 md:py-20 lg:py-28 px-4',
        jeunesse
    )
    # Also py-20 px-4 (CTA)
    jeunesse = re.sub(
        r'className="py-20 px-4">',
        'className="py-12 md:py-20 px-4">',
        jeunesse
    )
    fixes_applied.append('JeunessePage: Reduced all section padding')

    # 6b. Gallery image heights
    jeunesse = jeunesse.replace(
        'className="h-52 w-full object-cover transition-transform duration-500 hover:scale-110"',
        'className="h-40 sm:h-52 w-full object-cover transition-transform duration-500 hover:scale-110"'
    )
    fixes_applied.append('JeunessePage: Responsive gallery image heights')

    with open('/home/z/my-project/src/pages/JeunessePage.tsx', 'w') as f:
        f.write(jeunesse)

    # ═══════════════════════════════════════════════════════════
    # 7. SiteFooter.tsx — Touch targets
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/components/SiteFooter.tsx', 'r') as f:
        footer = f.read()

    # 7a. Enlarge social link icons
    footer = footer.replace(
        'className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-400"',
        'className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-400"'
    )
    fixes_applied.append('SiteFooter: Enlarged social link touch targets')

    # 7b. Add padding to footer nav links for touch
    footer = footer.replace(
        'className="text-sm text-muted transition-colors duration-200 hover:text-cream">{link.label}</button>',
        'className="text-sm text-muted transition-colors duration-200 hover:text-cream py-1.5">{link.label}</button>'
    )
    fixes_applied.append('SiteFooter: Added padding to nav links')

    with open('/home/z/my-project/src/components/SiteFooter.tsx', 'w') as f:
        f.write(footer)

    # ═══════════════════════════════════════════════════════════
    # 8. UniversalHero.tsx — Reduce min-h and padding on mobile
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/components/UniversalHero.tsx', 'r') as f:
        hero = f.read()

    # 8a. Standard hero: reduce min-h on mobile
    hero = hero.replace(
        'className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">',
        'className="relative flex min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] items-center justify-center overflow-hidden">'
    )
    fixes_applied.append('UniversalHero: Responsive min-h for mobile')

    # 8b. Reduce padding inside standard hero
    hero = hero.replace(
        'className="relative z-10 mx-auto max-w-4xl px-4 py-24 pt-28 text-center">',
        'className="relative z-10 mx-auto max-w-4xl px-4 py-16 pt-24 sm:py-20 sm:pt-28 text-center">'
    )
    fixes_applied.append('UniversalHero: Reduced padding on mobile')

    # 8c. Reduce title size on mobile (standard hero)
    hero = hero.replace(
        'className="font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:text-6xl">',
        'className="font-serif text-3xl font-bold leading-tight text-cream sm:text-4xl md:text-5xl lg:text-6xl">'
    )
    fixes_applied.append('UniversalHero: Scaled down title on mobile')

    with open('/home/z/my-project/src/components/UniversalHero.tsx', 'w') as f:
        f.write(hero)

    # ═══════════════════════════════════════════════════════════
    # 9. MediaPage.tsx — Add mobile-bottom-pad
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/MediaPage.tsx', 'r') as f:
        media = f.read()

    media = media.replace(
        '<div className="min-h-screen bg-bg text-cream font-sans">',
        '<div className="min-h-screen bg-bg text-cream font-sans mobile-bottom-pad">'
    )
    media = media.replace(
        'className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">',
        'className="mx-auto max-w-7xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">'
    )
    fixes_applied.append('MediaPage: Added mobile-bottom-pad + reduced padding')

    with open('/home/z/my-project/src/pages/MediaPage.tsx', 'w') as f:
        f.write(media)

    # ═══════════════════════════════════════════════════════════
    # 10. ActivitiesPage.tsx — Reduce section padding
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/pages/ActivitiesPage.tsx', 'r') as f:
        activities = f.read()

    activities = re.sub(
        r'<section className="py-20 px-4">',
        '<section className="py-12 md:py-20 px-4">',
        activities
    )
    # Also in the loading skeleton
    activities = activities.replace(
        '<section className="py-20 px-4">\n          <div className="mx-auto max-w-6xl">\n            <div className="mb-3 h-8',
        '<section className="py-12 md:py-20 px-4">\n          <div className="mx-auto max-w-6xl">\n            <div className="mb-3 h-8'
    )
    fixes_applied.append('ActivitiesPage: Reduced section padding for mobile')

    # Also reduce the skeleton section padding
    activities = re.sub(
        r'<section className="py-20 px-4">\n\s*<div className="mx-auto max-w-4xl">\n\s*<div className="h-48 animate-pulse',
        '<section className="py-12 md:py-20 px-4">\n        <div className="mx-auto max-w-4xl">\n          <div className="h-48 animate-pulse',
        activities
    )

    with open('/home/z/my-project/src/pages/ActivitiesPage.tsx', 'w') as f:
        f.write(activities)

    # ═══════════════════════════════════════════════════════════
    # 11. SiteHeader.tsx — Show nav at lg instead of xl
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/src/components/SiteHeader.tsx', 'r') as f:
        header = f.read()

    # 11a. Desktop nav: xl:flex -> lg:flex
    header = header.replace(
        '<nav className="hidden items-center gap-0.5 xl:flex">',
        '<nav className="hidden items-center gap-0.5 lg:flex">'
    )

    # 11b. Hamburger menu: xl:hidden -> lg:hidden
    header = header.replace(
        'className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500 xl:hidden"\n            >\n              <Menu',
        'className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all duration-200 hover:border-accent-400/40 hover:text-accent-500 lg:hidden"\n            >\n              <Menu'
    )

    # 11c. Drawer: xl:hidden -> lg:hidden
    header = header.replace(
        'className="fixed inset-0 z-[60] flex flex-col bg-bg xl:hidden drawer-enter"',
        'className="fixed inset-0 z-[60] flex flex-col bg-bg lg:hidden drawer-enter"'
    )

    # 11d. Desktop separator: lg:block is already correct, keep it
    # 11e. Connexion text hidden xl:inline -> lg:inline
    header = header.replace(
        'className="hidden xl:inline">Connexion</span>',
        'className="hidden lg:inline">Connexion</span>'
    )

    fixes_applied.append('SiteHeader: Nav visible at lg (1024px) instead of xl (1280px)')

    with open('/home/z/my-project/src/components/SiteHeader.tsx', 'w') as f:
        f.write(header)

    # ═══════════════════════════════════════════════════════════
    # 12. index.html — Add dvh viewport-fit
    # ═══════════════════════════════════════════════════════════
    with open('/home/z/my-project/index.html', 'r') as f:
        html = f.read()

    # The viewport meta is already good with viewport-fit=cover
    # Just ensure theme-color is set for mobile browsers
    if 'theme-color' not in html:
        html = html.replace(
            '<meta name="viewport"',
            '<meta name="theme-color" content="#0f2147">\n    <meta name="viewport"'
        )
        fixes_applied.append('index.html: Added theme-color meta for mobile browsers')

    with open('/home/z/my-project/index.html', 'w') as f:
        f.write(html)

    # ═══════════════════════════════════════════════════════════
    # Print summary
    # ═══════════════════════════════════════════════════════════
    print(f'\n=== MOBILE OPTIMIZATION COMPLETE ===')
    print(f'Total fixes applied: {len(fixes_applied)}')
    print()
    for i, fix in enumerate(fixes_applied, 1):
        print(f'  {i:2d}. {fix}')
    print()

if __name__ == '__main__':
    apply_fixes()
