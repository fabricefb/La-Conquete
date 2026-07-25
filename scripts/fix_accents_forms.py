#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix all backslash-uXXXX unicode escapes in source files.
Converts literal \\u00e9 etc to proper UTF-8 characters.
"""
import re
import glob

BASE = '/home/z/my-project/src'

PATTERN = re.compile(r'\\u([0-9a-fA-F]{4})')

def decode_unicode_escapes(text):
    def repl(m):
        return chr(int(m.group(1), 16))
    return PATTERN.sub(repl, text)

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = PATTERN.findall(content)
    if not matches:
        return 0
    
    new_content = decode_unicode_escapes(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return len(matches)

if __name__ == '__main__':
    files = [
        BASE + '/pages/FormOrateurBrandedPage.tsx',
        BASE + '/lib/orator-form-html.ts',
        BASE + '/components/admin/tabs/PlanificationTab.tsx',
        BASE + '/components/dashboard/MediaCenterSection.tsx',
    ]
    
    for pattern in ['**/*.tsx', '**/*.ts']:
        for fp in glob.glob(BASE + '/' + pattern, recursive=True):
            if fp not in files:
                files.append(fp)
    
    total = 0
    fixed_files = []
    for fp in files:
        count = fix_file(fp)
        if count > 0:
            total += count
            fixed_files.append((fp.replace(BASE + '/', ''), count))
    
    print('Fixed ' + str(total) + ' unicode escapes in ' + str(len(fixed_files)) + ' files:')
    for fname, count in fixed_files:
        print('  ' + fname + ': ' + str(count) + ' replacements')
