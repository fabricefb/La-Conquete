// One-step script: Create bucket + Upload all photos
// Usage: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/setup_and_upload.cjs
//
// Get your service role key from:
// https://supabase.com/dashboard/project/snvmythqboaeakzcqkpy/settings/api
//
// OR run the SQL below in the Supabase SQL Editor first:
// https://supabase.com/dashboard/project/snvmythqboaeakzcqkpy/sql/new
//
//   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
//   VALUES ('media', 'media', true, 52428800, NULL)
//   ON CONFLICT (id) DO NOTHING;
//
// Then run: node scripts/upload_photos.cjs

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://snvmythqboaeakzcqkpy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudm15dGhxYm9hZWFremNxa3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDM5MTQsImV4cCI6MjA5OTI3OTkxNH0.8b8PPB10DpPWZ_iDxtg2XbhFFo8IrS2-EdF26fQGYJ0';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  console.error('\nGet it from: https://supabase.com/dashboard/project/snvmythqboaeakzcqkpy/settings/api');
  console.error('\nThen run:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/setup_and_upload.cjs');
  process.exit(1);
}

const BUCKET = 'media';
const UPLOAD_DIR = path.join(__dirname, '..', 'upload');

const files = [
  { src: 'Pasteur Romain KAZADI.jpg', dest: 'profiles/pasteur-roman-kazadi.jpg' },
  { src: 'THERESSE KQATEBA.jpg', dest: 'profiles/theresse-kqateba.jpg' },
  { src: 'MAURISSE ESOSA.jpg', dest: 'profiles/maurisse-esosa.jpg' },
  { src: 'MA FEMME.jpg', dest: 'profiles/ma-femme.jpg' },
  { src: 'PREDICQRION.jpg', dest: 'departments/predication.jpg' },
  { src: 'PRIERE.jpg', dest: 'departments/priere.jpg' },
  { src: 'BIBLE.jpg', dest: 'departments/bible.jpg' },
  { src: '616477668_122157885182662966_7392463897143338625_n.jpg', dest: 'profiles/member-1.jpg' },
  { src: '618971337_122158069466662966_4908217830014554749_n.jpg', dest: 'profiles/member-2.jpg' },
  { src: '692099029_122167711646662966_5935752633039400818_n.jpg', dest: 'profiles/member-3.jpg' },
];

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const client = createClient(SUPABASE_URL, ANON_KEY);

  // Step 1: Create bucket
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets && buckets.some(b => b.id === BUCKET);

  if (!exists) {
    console.log(`📦 Creating bucket "${BUCKET}"...`);
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 52428800,
    });
    if (error) {
      console.error(`❌ Failed to create bucket: ${error.message}`);
      process.exit(1);
    }
    console.log(`✅ Bucket "${BUCKET}" created.`);
  } else {
    console.log(`✅ Bucket "${BUCKET}" already exists.`);
  }

  // Step 2: Upload files
  const urlMap = {};
  let success = 0, failed = 0;

  for (const { src, dest } of files) {
    const filePath = path.join(UPLOAD_DIR, src);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${src}`);
      failed++;
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(src).slice(1).toLowerCase();
    const mimeTypes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    const contentType = mimeTypes[ext] || 'image/jpeg';

    console.log(`⬆️  Uploading ${src} → ${dest} ...`);

    const { error } = await client.storage.from(BUCKET).upload(dest, fileBuffer, { contentType, upsert: true });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
      continue;
    }

    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(dest);
    urlMap[dest] = urlData.publicUrl;
    console.log(`   ✅ ${urlData.publicUrl}`);
    success++;
  }

  // Step 3: Save URL mapping
  const outputPath = path.join(UPLOAD_DIR, 'photo_urls.json');
  fs.writeFileSync(outputPath, JSON.stringify(urlMap, null, 2));
  console.log(`\n📄 URL mapping saved to ${outputPath}`);
  console.log(`\n📊 Results: ${success} uploaded, ${failed} failed (total: ${files.length})`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });