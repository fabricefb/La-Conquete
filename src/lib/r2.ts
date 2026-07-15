/**
 * Cloudflare R2 Upload Service
 *
 * Since this is a static SPA on Cloudflare Pages, we can't call R2 directly
 * from the browser (no Workers binding). Instead, we use two approaches:
 *
 * 1. **Direct URL paste** — The admin pastes a public URL (R2 public link, or any URL).
 *    This is the PRIMARY method. The admin uploads images to R2 via the Cloudflare
 *    Dashboard (or any other tool), gets the public URL, and pastes it here.
 *
 * 2. **R2 Presigned URL upload** (if a Cloudflare Worker proxy is set up later).
 *    This file provides the infrastructure for that future enhancement.
 *
 * For now, the flow is:
 *   Admin → Cloudflare Dashboard → R2 bucket → Copy public URL → Paste in admin
 *   OR
 *   Admin → Upload file → gets stored in Supabase Storage → URL is returned
 *
 * The ImageUpload component supports BOTH methods side by side.
 */

// ─── R2 Public URL helper ───────────────────────────────────────

/**
 * Build a public R2 URL from bucket name and file path.
 * 
 * @param bucket - R2 bucket name (e.g., "la-conquete-images")
 * @param path - File path within the bucket (e.g., "hero/slide1.jpg")
 * @param customDomain - Optional custom domain (e.g., "images.laconquete.cd")
 * @returns Public URL to access the file
 */
export function buildR2Url(
  bucket: string,
  path: string,
  customDomain?: string,
): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  if (customDomain) {
    // Custom domain: https://images.laconquete.cd/hero/slide1.jpg
    return `https://${customDomain}/${cleanPath}`;
  }

  // Default R2 public URL format: https://<bucket>.<account-id>.r2.cloudflarestorage.com/<path>
  // Or via r2.dev subdomain if public access is enabled:
  return `https://pub-${bucket}.r2.dev/${cleanPath}`;
}

/**
 * Validate if a string looks like a valid R2 URL.
 */
export function isR2Url(url: string): boolean {
  return url.includes('.r2.dev/') || url.includes('.r2.cloudflarestorage.com/');
}

/**
 * Extract the file path from an R2 URL.
 * Returns null if the URL doesn't look like an R2 URL.
 */
export function extractR2Path(url: string): string | null {
  try {
    const parsed = new URL(url);
    // For r2.dev URLs: https://pub-bucket.r2.dev/path/to/file.jpg
    if (parsed.hostname.endsWith('.r2.dev')) {
      return parsed.pathname.slice(1); // Remove leading /
    }
    // For custom domain or cloudflarestorage.com
    if (parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
      const parts = parsed.pathname.split('/');
      // First part is the bucket name, rest is the path
      if (parts.length > 2) {
        return parts.slice(2).join('/');
      }
    }
    return parsed.pathname.slice(1) || null;
  } catch {
    return null;
  }
}

// ─── Presigned URL upload (for future Worker proxy) ────────────

/**
 * Upload a file to R2 via a presigned URL obtained from a Cloudflare Worker.
 * 
 * To enable this, you need to:
 * 1. Create a Cloudflare Worker that generates presigned R2 URLs
 * 2. Set VITE_R2_WORKER_URL in your environment variables
 * 3. The Worker should have R2 binding and return { uploadUrl, publicUrl }
 * 
 * @param file - File to upload
 * @param folder - Folder path within the bucket (e.g., "hero", "mega-menu")
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  file: File,
  folder: string = 'images',
): Promise<string> {
  const workerUrl = import.meta.env.VITE_R2_WORKER_URL;

  if (!workerUrl) {
    throw new Error(
      "Worker R2 non configuré. Collez directement l'URL de votre image R2, " +
      'ou configurez VITE_R2_WORKER_URL pour activer l\'upload direct.'
    );
  }

  // Step 1: Get presigned URL from Worker
  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const presignResponse = await fetch(`${workerUrl}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      contentType: file.type,
    }),
  });

  if (!presignResponse.ok) {
    throw new Error('Impossible d\'obtenir l\'URL d\'upload R2');
  }

  const { uploadUrl, publicUrl } = await presignResponse.json();

  // Step 2: Upload file directly to R2
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!uploadResponse.ok) {
    throw new Error('Échec de l\'upload vers R2');
  }

  return publicUrl;
}

// ─── R2 Bucket Configuration ────────────────────────────────────

/**
 * Suggested R2 bucket settings for the church website.
 * 
 * 1. Go to Cloudflare Dashboard → R2 → Create bucket
 * 2. Bucket name: "la-conquete-images" (or any name you prefer)
 * 3. Enable public access (R2.dev subdomain or custom domain)
 * 4. Optionally set up a custom domain like "images.laconquete.cd"
 * 
 * Recommended folder structure:
 *   hero/           - Homepage hero slideshow images
 *   mega-menu/      - Mega menu panel images
 *   pastors/        - Pastor profile photos
 *   events/         - Event cover images
 *   departments/    - Department images
 *   media/          - Media thumbnails
 *   testimonials/   - Testimonial photos
 *   about/          - About page images
 *   blog/           - Blog post images
 *   logo/           - Logo files
 */
export const R2_FOLDERS = {
  hero: 'hero',
  megaMenu: 'mega-menu',
  pastors: 'pastors',
  events: 'events',
  departments: 'departments',
  media: 'media',
  testimonials: 'testimonials',
  about: 'about',
  blog: 'blog',
  logo: 'logo',
} as const;

export type R2Folder = (typeof R2_FOLDERS)[keyof typeof R2_FOLDERS];