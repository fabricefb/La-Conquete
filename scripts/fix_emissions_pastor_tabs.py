#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix: (1) Emissions NOT NULL on schedule + thumbnail_url
     (2) Pastor tabs - whitelist approach (only show allowed tabs)
     (3) Better audio upload error messages
"""
import re

BASE = '/home/z/my-project/src'

def fix_emissions_not_null():
    path = BASE + '/components/admin/tabs/EmissionsTab.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    fixes = []
    
    # Fix schedule: send empty string instead of null
    old_schedule = 'schedule: form.schedule.trim() || null,'
    new_schedule = "schedule: form.schedule.trim() || '',"
    if old_schedule in content:
        content = content.replace(old_schedule, new_schedule)
        fixes.append('schedule: null -> empty string')
    
    # Fix thumbnail_url: send empty string instead of null
    old_thumb = 'thumbnail_url: form.thumbnail_url?.trim() || null,'
    new_thumb = "thumbnail_url: form.thumbnail_url?.trim() || '',"
    if old_thumb in content:
        content = content.replace(old_thumb, new_thumb)
        fixes.append('thumbnail_url: null -> empty string')
    
    # Also fix video_url and host to avoid similar issues
    old_video = 'video_url: form.video_url?.trim() || null,'
    new_video = "video_url: form.video_url?.trim() || '',"
    if old_video in content:
        content = content.replace(old_video, new_video)
        fixes.append('video_url: null -> empty string')
    
    old_host = 'host: form.host.trim() || null,'
    new_host = "host: form.host.trim() || '',"
    if old_host in content:
        content = content.replace(old_host, new_host)
        fixes.append('host: null -> empty string')
    
    if fixes:
        with open(path, 'w') as f:
            f.write(content)
        print('  EmissionsTab fixes: ' + ', '.join(fixes))
    else:
        print('  EmissionsTab: already fixed')

def fix_pastor_tabs():
    """
    Change pastor permissions from HIDDEN to ALLOWED approach.
    Pastors should ONLY see these tabs:
    - homepage_builder (Page d'accueil), guide (Guide)
    - predications (Predications), audio (Audio)
    - testimonials (Temoignages), messages (Messages)
    - annonces (Annonces), communiques (Communiques)
    - emissions (Emissions)
    - creneaux (Creneaux)
    - media_communication (Media & Communication)
    - pipeline (Pipeline Ame), onboarding (Onboarding)
    - protocol (Protocole), evangelism (Evangelisation)
    """
    path = BASE + '/components/admin/AdminLayout.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # New allowed tabs for pastors
    old_hidden_pastor = '''// Onglets masques pour le pasteur principal (consultation uniquement)
const HIDDEN_TABS_FOR_PASTOR = new Set<AdminTab>([
  'theme', 'settings',
  'pipeline', 'onboarding', 'protocol', 'creneaux',
]);'''
    
    new_allowed_pastor = '''// Onglets autorises pour les pasteurs (liste blanche)
const ALLOWED_TABS_FOR_PASTOR = new Set<AdminTab>([
  'homepage_builder', 'guide',
  'predications', 'audio', 'testimonials', 'messages',
  'annonces', 'communiques', 'emissions',
  'creneaux', 'media_communication',
  'pipeline', 'onboarding', 'protocol', 'evangelism',
]);'''
    
    if old_hidden_pastor in content:
        content = content.replace(old_hidden_pastor, new_allowed_pastor)
        print('  Replaced HIDDEN_TABS_FOR_PASTOR with ALLOWED_TABS_FOR_PASTOR')
    else:
        print('  SKIP: HIDDEN_TABS_FOR_PASTOR not found (may be already updated)')
    
    # Now update the filtering logic to use ALLOWED instead of HIDDEN
    # Old logic:
    #   if (isPrincipalPastor) hiddenTabs = HIDDEN_TABS_FOR_PASTOR;
    #   else if (!isFullAdmin && userRoleLevel >= 4) hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;
    #   else if (!isFullAdmin) hiddenTabs = HIDDEN_TABS_FOR_PASTOR;
    #
    # New logic: pastors use ALLOWED, level4 uses HIDDEN
    
    old_logic = '''  // Filtrer les onglets selon le role
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
    
    new_logic = '''  // Filtrer les onglets selon le role
  let allowedTabs: Set<AdminTab> | null = null; // null = all allowed
  let hiddenTabs = new Set<AdminTab>();

  if (isPrincipalPastor || (!isFullAdmin && userRoleLevel >= 5)) {
    // Pasteurs: liste blanche stricte
    allowedTabs = ALLOWED_TABS_FOR_PASTOR;
  } else if (!isFullAdmin && userRoleLevel >= 4) {
    // Niveau 4 (diacres, collaborateurs): cache certains onglets sensibles
    hiddenTabs = HIDDEN_TABS_FOR_LEVEL4;
  } else if (!isFullAdmin) {
    // Autres non-admin: meme traitement que pasteur
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
        print('  Updated tab filtering logic for pastors')
    else:
        print('  SKIP: Tab filtering logic not found')
    
    with open(path, 'w') as f:
        f.write(content)

def fix_audio_upload_error():
    """Improve audio upload error message to include the actual error."""
    path = BASE + '/components/admin/tabs/AudioTab.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # Improve error message to include actual error details
    old_err = '''        if (uploadError) {
          addToast("Erreur lors de l'upload du fichier audio", 'error');'''
    
    new_err = '''        if (uploadError) {
          addToast("Erreur upload audio: " + uploadError.message, 'error');'''
    
    if old_err in content:
        content = content.replace(old_err, new_err)
        print('  AudioTab: Improved upload error message')
    else:
        print('  AudioTab: already fixed or pattern not found')
    
    with open(path, 'w') as f:
        f.write(content)

if __name__ == '__main__':
    print('=== Fix 1: Emissions NOT NULL ===')
    fix_emissions_not_null()
    
    print('\n=== Fix 2: Pastor tab permissions ===')
    fix_pastor_tabs()
    
    print('\n=== Fix 3: Audio upload error ===')
    fix_audio_upload_error()
    
    print('\n=== ALL DONE ===')