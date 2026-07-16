#!/usr/bin/env python3
"""Apply homepage changes: remove sections 2,5,9,11 and add map"""
import re

with open('/home/z/my-project/src/pages/HomePage.tsx', 'r') as f:
    content = f.read()

# 1. Remove Section 2 (Bible Verses) - from "SECTION 2: BIBLE" to "SECTION 3: THREE PILLARS"
content = re.sub(
    r'\{/\* ═══════ SECTION 2: BIBLE VERSES ═══════ \*/\}.*?(?=\{/\* ═══════ SECTION 3: THREE PILLARS)',
    '',
    content,
    flags=re.DOTALL
)

# Renumber sections after removal
content = content.replace('SECTION 3: THREE PILLARS', 'SECTION 2: THREE PILLARS')
content = content.replace('SECTION 4: WE ARE UNIQUE', 'SECTION 3: WE ARE UNIQUE')
content = content.replace('SECTION 6: BIBLICAL QUOTE', 'SECTION 4: BIBLICAL QUOTE')
content = content.replace('SECTION 7: PASTORAL TEAM', 'SECTION 5: PASTORAL TEAM')
content = content.replace('SECTION 8: TESTIMONIALS', 'SECTION 6: TESTIMONIALS')

# 2. Remove Section 9 (Actualités/Blog) - from "SECTION 9: BLOG" to "SECTION 10: CTA"
content = re.sub(
    r'\{/\* ═══════ SECTION 9: BLOG.*?SECTION 10: CTA FINAL ═══════ \*/\}',
    '{/* ═══════ SECTION 7: CTA FINAL ═══════ */}',
    content,
    flags=re.DOTALL
)

# 3. Remove Section 11 (Contact Strip) and replace with Map
old_contact = '''      {/* ═══════ SECTION 11: CONTACT STRIP ═══════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">'''

# Find the contact section and replace with map
contact_start = content.find('SECTION 11: CONTACT STRIP')
if contact_start == -1:
    # Try with renumbered section number (shouldn't happen but safety)
    contact_start = content.find('CONTACT STRIP')

if contact_start != -1:
    # Find the end of the section (before FOOTER)
    footer_start = content.find('{/* ═══════ FOOTER ═══════ */}', contact_start)
    if footer_start != -1:
        contact_section = content[contact_start:footer_start]
        # Get indentation
        indent = '      '
        map_section = f'''{indent}{{/* ═══════ SECTION 8: MAP ═══════ */}}
{indent}<section className="py-0">
{indent}  <iframe
{indent}    title="Localisation de l\\'Église Évangélique La Conquête"
{indent}    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15881.0!2d29.2223!3d-11.6602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1c6c1e4e5e5e5e5%3A0x5e5e5e5e5e5e5e5!2sLubumbashi!5e0!3m2!1sfr!2scd!4v1700000000000"
{indent}    width="100%"
{indent}    height="400"
{indent}    style={{ border: 0 }}
{indent}    allowFullScreen
{indent}    loading="lazy"
{indent}    referrerPolicy="no-referrer-when-downgrade"
{indent}    className="w-full"
{indent}  />
{indent}</section>
'''
        content = content[:contact_start] + map_section + content[footer_start:]

# 4. Remove "Explorer" section (Section 5 originally, now 4)
content = re.sub(
    r'\{/\* ═══════ SECTION 4: EXPLORER ═══════ \*/\}.*?(?=\{/\* ═══════ SECTION)',
    '',
    content,
    flags=re.DOTALL
)

# Renumber CTA and MAP after explorer removal
content = content.replace('SECTION 7: CTA FINAL', 'SECTION 6: CTA FINAL')
content = content.replace('SECTION 8: MAP', 'SECTION 7: MAP')

with open('/home/z/my-project/src/pages/HomePage.tsx', 'w') as f:
    f.write(content)

print("Done! Sections removed and map added.")