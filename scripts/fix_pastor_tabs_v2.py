#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix pastor tabs: use ALLOWED (whitelist) approach.
"""

BASE = '/home/z/my-project/src'
path = BASE + '/components/admin/AdminLayout.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace HIDDEN_TABS_FOR_PASTOR with ALLOWED_TABS_FOR_PASTOR
old_set = '''// Onglets masqués pour le pasteur principal (consultation uniquement)
const HIDDEN_TABS_FOR_PASTOR = new Set<AdminTab>([
  'theme', 'settings',
  'pipeline', 'onboarding', 'protocol', 'creneaux',
]);'''

new_set = '''// Onglets autorisés pour les pasteurs (liste blanche)
const ALLOWED_TABS_FOR_PASTOR = new Set<AdminTab>([
  'homepage_builder', 'guide',
  'predications', 'audio', 'testimonials', 'messages',
  'annonces', 'communiques', 'emissions',
  'creneaux', 'media_communication',
  'pipeline', 'onboarding', 'protocol', 'evangelism',
]);'''

if old_set in content:
    content = content.replace(old_set, new_set)
    print('  OK: Replaced HIDDEN with ALLOWED set')
else:
    # Try reading the actual lines to debug
    for i, line in enumerate(content.split('\n')):
        if 'HIDDEN_TABS_FOR_PASTOR' in line:
            print(f'  Found HIDDEN_TABS_FOR_PASTOR at line {i+1}')
            # Show surrounding context
            lines = content.split('\n')
            for j in range(max(0,i-1), min(len(lines), i+6)):
                print(f'    {j+1}: {repr(lines[j])}')
    print('  Trying direct line-based replacement...')
    
    lines = content.split('\n')
    new_lines = []
    i = 0
    replaced = False
    while i < len(lines):
        if 'HIDDEN_TABS_FOR_PASTOR' in lines[i] and 'const ' in lines[i]:
            # Found the declaration, replace the whole block
            new_lines.append('// Onglets autorisés pour les pasteurs (liste blanche)')
            new_lines.append('const ALLOWED_TABS_FOR_PASTOR = new Set<AdminTab>([')
            new_lines.append("  'homepage_builder', 'guide',")
            new_lines.append("  'predications', 'audio', 'testimonials', 'messages',")
            new_lines.append("  'annonces', 'communiques', 'emissions',")
            new_lines.append("  'creneaux', 'media_communication',")
            new_lines.append("  'pipeline', 'onboarding', 'protocol', 'evangelism',")
            new_lines.append(']);')
            # Skip the old block lines
            while i < len(lines) and ']);' not in lines[i]:
                i += 1
            i += 1  # skip the ]);
            replaced = True
        else:
            new_lines.append(lines[i])
            i += 1
    
    if replaced:
        content = '\n'.join(new_lines)
        print('  OK: Replaced via line-based approach')
    else:
        print('  FAIL: Could not find HIDDEN_TABS_FOR_PASTOR')

# Step 2: Replace the filtering logic
old_logic = '''  // Filtrer les onglets selon le rôle
  let hiddenTabs = new Set<AdminTab>();
  if (isPrincipalPastor) {
    hiddenTabs = HIDDEN_TABS_FOR_PASTOR;
  } else if (!isFullAdmin && userRoleLevel >= 4) {
    hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;
  } else if (!isFullAdmin) {
    hiddenTabs = HIDDEN_TABS_FOR_PASTOR;
  }

  const visibleGroups = hiddenTabs.size === 0 ? tabGroups : tabGroups.map(g => ({
    ...g,
    tabs: g.tabs.filter(t => !hiddenTabs.has(t.id)),
  })).filter(g => g.tabs.length > 0);'''

new_logic = '''  // Filtrer les onglets selon le rôle
  let allowedTabs: Set<AdminTab> | null = null;
  let hiddenTabs = new Set<AdminTab>();
  if (isPrincipalPastor || (!isFullAdmin && userRoleLevel >= 5)) {
    allowedTabs = ALLOWED_TABS_FOR_PASTOR;
  } else if (!isFullAdmin && userRoleLevel >= 4) {
    hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;
  } else if (!isFullAdmin) {
    allowedTabs = ALLOWED_TABS_FOR_PASTOR;
  }

  const visibleGroups = (allowedTabs === null && hiddenTabs.size === 0) ? tabGroups
    : tabGroups.map(g => ({
      ...g,
      tabs: g.tabs.filter(t =>
        (allowedTabs === null || allowedTabs.has(t.id)) && !hiddenTabs.has(t.id)
      ),
    })).filter(g => g.tabs.length > 0);'''

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    print('  OK: Updated filtering logic')
else:
    print('  Filtering logic not matched, trying line-based...')
    lines = content.split('\n')
    new_lines = []
    i = 0
    replaced = False
    while i < len(lines):
        if 'Filtrer les onglets' in lines[i]:
            # Replace the entire logic block
            new_lines.append('  // Filtrer les onglets selon le r\u00f4le')
            new_lines.append('  let allowedTabs: Set<AdminTab> | null = null;')
            new_lines.append('  let hiddenTabs = new Set<AdminTab>();')
            new_lines.append('  if (isPrincipalPastor || (!isFullAdmin && userRoleLevel >= 5)) {')
            new_lines.append('    allowedTabs = ALLOWED_TABS_FOR_PASTOR;')
            new_lines.append('  } else if (!isFullAdmin && userRoleLevel >= 4) {')
            new_lines.append('    hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;')
            new_lines.append('  } else if (!isFullAdmin) {')
            new_lines.append('    allowedTabs = ALLOWED_TABS_FOR_PASTOR;')
            new_lines.append('  }')
            new_lines.append('')
            new_lines.append('  const visibleGroups = (allowedTabs === null && hiddenTabs.size === 0) ? tabGroups')
            new_lines.append('    : tabGroups.map(g => ({')
            new_lines.append('      ...g,')
            new_lines.append("      tabs: g.tabs.filter(t =>")
            new_lines.append('        (allowedTabs === null || allowedTabs.has(t.id)) && !hiddenTabs.has(t.id)')
            new_lines.append('      ),')
            new_lines.append("    })).filter(g => g.tabs.length > 0);")
            # Skip old lines until we find the visibleGroups line
            while i < len(lines) and 'visibleGroups' not in lines[i]:
                i += 1
            # Skip the old visibleGroups block (3 lines typically)
            skip_count = 0
            while i < len(lines) and skip_count < 4:
                if lines[i].strip().endswith('});'):
                    i += 1
                    break
                i += 1
                skip_count += 1
            replaced = True
        else:
            new_lines.append(lines[i])
            i += 1
    if replaced:
        content = '\n'.join(new_lines)
        print('  OK: Replaced filtering logic via line-based approach')
    else:
        print('  FAIL: Could not replace filtering logic')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone')
