import { supabase } from './supabase';

const STORAGE_BUCKET = 'media';

/**
 * Upload a file to Supabase Storage bucket "media".
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File,
  path?: string,
  _onProgress?: (percent: number) => void,
): Promise<string> {
  // Ensure bucket exists (non-breaking if it does)
  const { error: bucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg'],
  });
  // Ignore "already exists" error
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.warn('Bucket creation skipped:', bucketError.message);
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = path
    ? `${path}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(publicUrl: string): Promise<void> {
  // Extract path from public URL
  try {
    const url = new URL(publicUrl);
    // URL pattern: .../storage/v1/object/public/media/path/file.ext
    const parts = url.pathname.split('/');
    const bucketIdx = parts.indexOf(STORAGE_BUCKET);
    if (bucketIdx === -1) return;
    const filePath = parts.slice(bucketIdx + 1).join('/');
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  } catch {
    // Silently ignore URL parsing errors
  }
}

/**
 * Read a file as data URL (for previews).
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file type and size.
 */
export function validateFile(
  file: File,
  options?: { maxSizeMB?: number; accept?: string[] },
): string | null {
  const maxSizeMB = options?.maxSizeMB ?? 10;
  const accept = options?.accept ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (file.size > maxSizeMB * 1024 * 1024) {
    return `Le fichier est trop volumineux (max ${maxSizeMB} Mo).`;
  }

  if (!accept.includes(file.type)) {
    return `Type de fichier non autorisé. Formats acceptés : ${accept.join(', ')}`;
  }

  return null;
}