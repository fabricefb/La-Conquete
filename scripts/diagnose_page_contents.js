// Diagnostic script: Check real state of page_contents in Supabase
// Usage: node scripts/diagnose_page_contents.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://snvmythqboaeakzcqkpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudm15dGhxYm9hZWFremNxa3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDM5MTQsImV4cCI6MjA5OTI3OTkxNH0.8b8PPB10DpPWZ_iDxtg2XbhFFo8IrS2-EdF26fQGYJ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== DIAGNOSTIC page_contents ===\n');

  // 1. Try to read all page_contents (SELECT with anon)
  console.log('1. LECTURE (anon key, SELECT):');
  const { data: allData, error: readErr } = await supabase
    .from('page_contents')
    .select('*')
    .limit(50);

  if (readErr) {
    console.log('   ERREUR LECTURE:', readErr.message);
    console.log('   Code:', readErr.code);
    console.log('   Details:', readErr.details);
    console.log('   Hint:', readErr.hint);
  } else {
    console.log(`   OK — ${allData?.length ?? 0} lignes trouvées`);
    if (allData && allData.length > 0) {
      console.log('   Colonnes retournées:', Object.keys(allData[0]).join(', '));
      console.log('   Premières lignes:');
      for (const row of allData.slice(0, 5)) {
        console.log(`     ${row.page}.${row.section_key}.${row.field_key} = "${row.value?.substring(0, 60)}" (is_active: ${row.is_active})`);
      }
    }
  }

  // 2. Try to read home page with is_active filter (how the frontend reads)
  console.log('\n2. LECTURE home page (is_active=true, comme le frontend):');
  const { data: homeData, error: homeErr } = await supabase
    .from('page_contents')
    .select('*')
    .eq('page', 'home')
    .eq('is_active', true)
    .order('sort_order');

  if (homeErr) {
    console.log('   ERREUR:', homeErr.message);
  } else {
    console.log(`   OK — ${homeData?.length ?? 0} lignes actives pour home`);
    for (const row of (homeData || [])) {
      console.log(`     ${row.section_key}.${row.field_key} = "${row.value?.substring(0, 80)}"`);
    }
  }

  // 3. Try UPDATE (anon, no auth — should fail with RLS)
  console.log('\n3. TEST UPDATE (anon, sans auth — vérifie RLS):');
  // First get an id
  const { data: oneRow } = await supabase
    .from('page_contents')
    .select('id')
    .eq('page', 'home')
    .eq('field_key', 'bg_image')
    .limit(1)
    .single();

  if (oneRow) {
    const { data: updateResult, error: updateErr } = await supabase
      .from('page_contents')
      .update({ value: 'TEST_UPDATE_FROM_DIAGNOSTIC', updated_at: new Date().toISOString() })
      .eq('id', oneRow.id)
      .select();

    if (updateErr) {
      console.log('   ERREUR UPDATE:', updateErr.message);
      console.log('   Code:', updateErr.code);
      if (updateErr.code === '42501') {
        console.log('   >> RLS BLOQUE L\'ÉCRITURE ! La politique content_admin_update exige auth.uid() + is_admin=true');
      }
    } else {
      console.log('   UPDATE OK — données:', JSON.stringify(updateResult));
      // Revert the test
      await supabase
        .from('page_contents')
        .update({ value: '', updated_at: new Date().toISOString() })
        .eq('id', oneRow.id);
    }
  } else {
    console.log('   Aucune ligne bg_image trouvée pour home — les seeds n\'existent pas!');
  }

  // 4. Check about page
  console.log('\n4. LECTURE about page:');
  const { data: aboutData, error: aboutErr } = await supabase
    .from('page_contents')
    .select('*')
    .eq('page', 'about')
    .order('sort_order');

  if (aboutErr) {
    console.log('   ERREUR:', aboutErr.message);
    if (aboutErr.code === '22P02' || aboutErr.message.includes('CHECK')) {
      console.log('   >> CHECK constraint bloque — la page "about" n\'est pas dans la liste autorisée!');
    }
  } else {
    console.log(`   OK — ${aboutData?.length ?? 0} lignes`);
  }

  // 5. Check if there's a column that doesn't exist
  console.log('\n5. TEST INSERT (vérifie si toutes les colonnes existent):');
  const { error: insertErr } = await supabase
    .from('page_contents')
    .insert({
      page: 'home',
      section_key: '_diagnostic_test',
      field_key: '_test',
      value: '',
      type: 'text',
      label: 'Test diagnostic',
      sort_order: 999,
      is_active: false,
    });

  if (insertErr) {
    console.log('   ERREUR INSERT:', insertErr.message);
    console.log('   Code:', insertErr.code);
    if (insertErr.code === '42703') {
      console.log('   >> COLONNE MANQUANTE dans la table!');
    } else if (insertErr.code === '42501') {
      console.log('   >> RLS BLOQUE — pas authentifié');
    } else if (insertErr.code === '23514') {
      console.log('   >> CHECK constraint violé (page pas dans la liste)');
    } else if (insertErr.message.includes('column') || insertErr.message.includes('relation')) {
      console.log('   >> Problème de schéma de table');
    }
  } else {
    console.log('   INSERT OK — nettoyeur...');
    // Clean up
    await supabase
      .from('page_contents')
      .delete()
      .eq('section_key', '_diagnostic_test')
      .eq('field_key', '_test');
  }

  console.log('\n=== FIN DIAGNOSTIC ===');
}

diagnose().catch(console.error);