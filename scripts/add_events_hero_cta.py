#!/usr/bin/env python3
"""Add CTA fields (cta_text, cta_url) to events hero in ContentsTab."""

FILE = '/home/z/my-project/src/components/admin/tabs/ContentsTab.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Old events hero section
old_events_hero = '''  events: {
    hero: [
      { field_key: 'bg_image', label: 'Image de fond (hero)', type: 'image_url', value: '' },
      { field_key: 'badge', label: 'Badge', type: 'text', value: 'Calendrier' },
      { field_key: 'title', label: 'Titre', type: 'text', value: '\u00c9v\u00e9nements' },
      { field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },
    ],'''

# With accented chars
old_events_hero2 = '  events: {\n    hero: ['

# Find the events hero block more precisely
import re

# Match from 'events: {' to the next section
pattern = r"(  events: \{\n    hero: \[\n      \{ field_key: 'bg_image', label: 'Image de fond \(hero\)', type: 'image_url', value: '' \},\n      \{ field_key: 'badge', label: 'Badge', type: 'text', value: '[^']*' \},\n      \{ field_key: 'title', label: 'Titre', type: 'text', value: '[^']*' \},\n      \{ field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' \},\n    \],)"

match = re.search(pattern, content)
if not match:
    print('Trying broader search...')
    # Try to find the section by simpler markers
    start = content.index('events: {')
    hero_start = content.index('hero: [', start)
    # Find the end of the hero array
    bracket_count = 0
    hero_end = hero_start
    for i in range(hero_start, len(content)):
        if content[i] == '[': bracket_count += 1
        elif content[i] == ']': bracket_count -= 1
        if bracket_count == 0:
            hero_end = i + 1
            break
    
    old_hero = content[hero_start:hero_end]
    print(f'Found hero array: {repr(old_hero[:100])}...')
    
    new_hero = old_hero.replace(
        "{ field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },",
        "{ field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },\n      { field_key: 'cta_text', label: 'Texte du bouton CTA', type: 'text', value: 'Voir tous les \u00e9v\u00e9nements' },\n      { field_key: 'cta_url', label: 'Lien du bouton CTA', type: 'text', value: '#upcoming' },"
    )
    content = content[:hero_start] + new_hero + content[hero_end:]
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: CTA fields added to events hero')
else:
    new_block = match.group(1).replace(
        "{ field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },",
        "{ field_key: 'subtitle', label: 'Sous-titre', type: 'text', value: '' },\n      { field_key: 'cta_text', label: 'Texte du bouton CTA', type: 'text', value: '' },\n      { field_key: 'cta_url', label: 'Lien du bouton CTA', type: 'text', value: '' },"
    )
    content = content[:match.start()] + new_block + content[match.end():]
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: CTA fields added to events hero (regex)')
