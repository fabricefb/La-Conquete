#!/usr/bin/env python3
"""Update EventsPage hero to use bg_image from content admin and add CTA button."""

FILE = '/home/z/my-project/src/pages/EventsPage.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add cta_text and cta_url variables after heroSubtitle
old_hero_vars = """  const heroTitle = getContent(contentMap, 'hero', 'title', '\u00c9v\u00e9nements de la Saison de Conqu\u00eate');
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Rejoignez notre communaut\u00e9 dynamique pour des moments de transformation, de pri\u00e8re et de communion fraternelle \u00e0 Lubumbashi et dans toutes nos extensions.');"""

new_hero_vars = """  const heroTitle = getContent(contentMap, 'hero', 'title', '\u00c9v\u00e9nements de la Saison de Conqu\u00eate');
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Rejoignez notre communaut\u00e9 dynamique pour des moments de transformation, de pri\u00e8re et de communion fraternelle \u00e0 Lubumbashi et dans toutes nos extensions.');
  const heroBgImage = getContent(contentMap, 'hero', 'bg_image', '');
  const heroCtaText = getContent(contentMap, 'hero', 'cta_text', 'Voir tous les \u00e9v\u00e9nements');
  const heroCtaUrl = getContent(contentMap, 'hero', 'cta_url', '#upcoming');"""

if old_hero_vars in content:
    content = content.replace(old_hero_vars, new_hero_vars)
    print('Step 1: Added hero variables')
else:
    print('ERROR: hero variables not found')
    import sys; sys.exit(1)

# 2. Update hero section to use bg_image and add CTA button
# The hero section starts with the section tag and bg-ink-700
old_hero_section = '''        {/* ═══════ HERO — Bento Calendar Overview ═══════ */}
        <section className="relative py-xl overflow-hidden bg-ink-700 text-white">
          {/* Subtle decorative radial */}
          <div className="absolute inset-0 bg-radial-primary opacity-40" />
          <div className="relative z-10 px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left — Text */}
            <EvtReveal>
              <span className="inline-block px-3 py-1 bg-evangile-600 rounded text-[12px] font-bold tracking-widest uppercase mb-4">
                {getContent(contentMap, 'hero', 'badge', 'Agenda Spirituel')}
              </span>
              <h1 className="font-playfair text-headline-xl mb-6">{heroTitle}</h1>
              <p className="text-body-lg text-sky-100 max-w-xl mb-8 leading-relaxed">{heroSubtitle}</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-white/80">
                  <MS className="text-accent-500 text-[20px]">location_on</MS>
                  <span className="font-be-vn text-label-lg uppercase tracking-wide">Lubumbashi Main Campus</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <MS className="text-accent-500 text-[20px]">schedule</MS>
                  <span className="font-be-vn text-label-lg uppercase tracking-wide">Horaires GMT+2</span>
                </div>
              </div>
            </EvtReveal>'''

new_hero_section = '''        {/* ═══════ HERO — Bento Calendar Overview ═══════ */}
        <section className="relative py-xl overflow-hidden bg-ink-700 text-white">
          {/* Background image (from admin) */}
          {heroBgImage && (
            <div className="absolute inset-0 z-0">
              <img src={heroBgImage} alt="" className="w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-700/95 via-ink-700/80 to-ink-700/60" />
            </div>
          )}
          {/* Subtle decorative radial */}
          <div className="absolute inset-0 bg-radial-primary opacity-40" />
          <div className="relative z-10 px-margin-mobile md:px-margin-desktop max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left — Text */}
            <EvtReveal>
              <span className="inline-block px-3 py-1 bg-evangile-600 rounded text-[12px] font-bold tracking-widest uppercase mb-4">
                {getContent(contentMap, 'hero', 'badge', 'Agenda Spirituel')}
              </span>
              <h1 className="font-playfair text-headline-xl mb-6">{heroTitle}</h1>
              <p className="text-body-lg text-sky-100 max-w-xl mb-8 leading-relaxed">{heroSubtitle}</p>
              {(heroCtaText && heroCtaUrl) && (
                <a
                  href={heroCtaUrl}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-evangile-600 hover:bg-evangile-700 text-white rounded-xl font-bold text-label-lg uppercase tracking-wide transition-all duration-200 active:scale-95 shadow-lg shadow-evangile-600/30"
                >
                  {heroCtaText}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              )}
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 text-white/80">
                  <MS className="text-accent-500 text-[20px]">location_on</MS>
                  <span className="font-be-vn text-label-lg uppercase tracking-wide">Lubumbashi Main Campus</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <MS className="text-accent-500 text-[20px]">schedule</MS>
                  <span className="font-be-vn text-label-lg uppercase tracking-wide">Horaires GMT+2</span>
                </div>
              </div>
            </EvtReveal>'''

if old_hero_section in content:
    content = content.replace(old_hero_section, new_hero_section)
    print('Step 2: Hero section updated with bg_image + CTA')
else:
    print('ERROR: hero section not found, trying line-by-line approach')
    # Debug
    for i, line in enumerate(content.split('\n')):
        if 'Bento Calendar' in line or 'hero' in line.lower() and i > 105 and i < 140:
            print(f'  {i+1}: {repr(line[:80])}')
    import sys; sys.exit(1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL CHANGES APPLIED')
