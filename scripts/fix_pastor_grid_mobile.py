#!/usr/bin/env python3
"""Fix pastor grid - bio visible on mobile touch devices."""

FILE = '/home/z/my-project/src/components/home/EnhancedPastorGrid.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Make bio overlay visible on touch devices
old = 'opacity-0 transition-opacity duration-300 group-hover:opacity-100'
new = 'opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover-show'
if old in content:
    content = content.replace(old, new)
    print('Pastor bio overlay: hover-show class added for touch devices')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
