#!/usr/bin/env python3
"""Add mobile-bottom-pad to all remaining pages with MobileNav."""

import glob, os

pages = glob.glob('/home/z/my-project/src/pages/*.tsx')
fixed = 0
for page_path in pages:
    with open(page_path, 'r', encoding='utf-8') as f:
        pc = f.read()
    if 'MobileNav' not in pc or 'mobile-bottom-pad' in pc:
        continue
    # Add to the outermost container
    patterns = [
        ('min-h-screen">', 'min-h-screen mobile-bottom-pad">'),
        ('min-h-screen className', 'className="mobile-bottom-pad min-h-screen'),
    ]
    for old, new in patterns:
        if old in pc:
            pc = pc.replace(old, new, 1)
            with open(page_path, 'w', encoding='utf-8') as f:
                f.write(pc)
            fixed += 1
            break

print(f'Added mobile-bottom-pad to {fixed} more pages')
