import { supabase } from './supabase';
import { uploadToR2, isR2Url, R2_FOLDERS } from './r2';

const STORAGE_BUCKET = 'media';

/** Supported upload backends */
export type StorageBackend = 'supabase' | 'r2' | 'url';

/**
 * Upload a file using the specified backend.
 *
 * - `supabase` (default): uploads to Supabase Storage bucket "media"
 * - `r2`: uploads via a Cloudflare Worker presigned URL (requires VITE_R2_WORKER_URL)
 * - `url`: not applicable for file uploads (use applyUrl directly)
 *
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File,
  path?: string,
  _onProgress?: (percent: number) => void,
  backend: StorageBackend = 'supabase',
): Promise<string> {
  // Try R2 first if requested
  if (backend === 'r2') {
    try {
      return await uploadToR2(file, path ?? R2_FOLDERS.hero);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload R2 échoué';
      // If R2 worker is not configured, fall back to Supabase
      if (message.includes('non configuré')) {
        console.warn('[storage] R2 Worker non configuré, fallback vers Supabase Storage');
        // Fall through to Supabase upload below
      } else {
        throw err;
      }
    }
  }

  // Default: Supabase Storage
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

  if (uploadError) {
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('storage resource not found')) {
      throw new Error(
        'Bucket "media" introuvable. Allez dans Supabase → Storage → Nouveau bucket → nom: media → Public: coché, puis réessayez.'
      );
    }
    throw new Error(`Upload échoué: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl;
}

/**
 * Delete a file from storage.
 * Supports both Supabase Storage URLs and logs a warning for R2 URLs
 * (R2 files must be deleted from the Cloudflare Dashboard or via API).
 */
export async function deleteFile(publicUrl: string): Promise<void> {
  if (!publicUrl) return;

  // R2 URLs cannot be deleted from the browser
  if (isR2Url(publicUrl)) {
    console.warn(
      '[storage] Les fichiers R2 doivent être supprimés depuis le Dashboard Cloudflare ' +
      'ou via l\'API R2. Le fichier reste sur R2 :',
      publicUrl,
    );
    return;
  }

  try {
    const url = new URL(publicUrl);
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