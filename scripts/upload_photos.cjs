const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://snvmythqboaeakzcqkpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudm15dGhxYm9hZWFremNxa3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDM5MTQsImV4cCI6MjA5OTI3OTkxNH0.8b8PPB10DpPWZ_iDxtg2XbhFFo8IrS2-EdF26fQGYJ0';
// Set SUPABASE_SERVICE_ROLE_KEY env var to create the bucket automatically.
// Find it at: https://supabase.com/dashboard/project/snvmythqboaeakzcqkpy/settings/api
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
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

async function ensureBucket(supabase) {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets && buckets.some((b) => b.id === BUCKET)) {
    console.log(`✅ Bucket "${BUCKET}" already exists.`);
    return true;
  }

  // Try to create with service role key
  if (SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log(`📦 Creating bucket "${BUCKET}" with service role key...`);
    const { error } = await adminClient.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50 MB
    });
    if (error) {
      console.error(`❌ Failed to create bucket: ${error.message}`);
      return false;
    }
    console.log(`✅ Bucket "${BUCKET}" created.`);
    return true;
  }

  // Try to create with anon key (will likely fail)
  console.log(`📦 Attempting to create bucket "${BUCKET}" with anon key...`);
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 52428800,
  });
  if (error) {
    console.error(`❌ Bucket "${BUCKET}" does not exist and could not be created.`);
    console.error(`   Error: ${error.message}`);
    console.error(`\n   To fix this, run the following SQL in the Supabase SQL Editor:`);
    console.error(`   https://supabase.com/dashboard/project/snvmythqboaeakzcqkpy/sql/new`);
    console.error(`\n   Or set SUPABASE_SERVICE_ROLE_KEY env var and re-run.`);
    console.error(`   Migration file: supabase/migrations/20260712000000_create_media_bucket.sql`);
    return false;
  }
  console.log(`✅ Bucket "${BUCKET}" created.`);
  return true;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Ensure bucket exists
  const bucketReady = await ensureBucket(supabase);
  if (!bucketReady) {
    process.exit(1);
  }

  const urlMap = {};
  let success = 0;
  let failed = 0;

  for (const { src, dest } of files) {
    const filePath = path.join(UPLOAD_DIR, src);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${src}`);
      failed++;
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(src).slice(1).toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'image/jpeg';

    console.log(`⬆️  Uploading ${src} → ${dest} ...`);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(dest, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(dest);
    const publicUrl = urlData.publicUrl;
    urlMap[dest] = publicUrl;
    console.log(`   ✅ ${publicUrl}`);
    success++;
  }

  // Save JSON mapping
  const outputPath = path.join(UPLOAD_DIR, 'photo_urls.json');
  fs.writeFileSync(outputPath, JSON.stringify(urlMap, null, 2));
  console.log(`\n📄 URL mapping saved to ${outputPath}`);
  console.log(`\n📊 Results: ${success} uploaded, ${failed} failed (total: ${files.length})`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});