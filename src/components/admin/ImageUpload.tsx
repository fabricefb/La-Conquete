import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Image, Link, Cloud, HardDrive } from 'lucide-react';
import { validateFile, uploadFile, readFileAsDataUrl } from '../../lib/storage';
import { isR2Url } from '../../lib/r2';
import { useToast } from '../../contexts/ToastContext';

type StorageBackend = 'supabase' | 'r2' | 'url';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string[];
  maxSizeMB?: number;
  folder?: string;
  className?: string;
  /** Force default mode: 'r2' shows URL paste first, 'supabase' shows file upload first */
  defaultMode?: StorageBackend;
  /** Show backend selector tabs (supabase / r2-url) */
  showBackendToggle?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  accept = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSizeMB = 5,
  folder = 'images',
  className = '',
  defaultMode,
  showBackendToggle = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [activeBackend, setActiveBackend] = useState<StorageBackend>(defaultMode ?? 'r2');

  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const displayUrl = preview ?? value ?? null;

  // ─── File upload (Supabase or R2 Worker) ─────────────────────

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setPreview(null);

      const validationError = validateFile(file, { accept, maxSizeMB });
      if (validationError) {
        setError(validationError);
        addToast(validationError, 'error');
        return;
      }

      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        const backend = activeBackend === 'r2' ? 'r2' : 'supabase';
        const publicUrl = await uploadFile(file, folder, undefined, backend);
        setPreview(null);
        onChange(publicUrl);

        if (isR2Url(publicUrl)) {
          addToast('Image envoyée sur R2 avec succès', 'success');
        } else {
          addToast('Image envoyée avec succès', 'success');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Échec de l'envoi de l'image.";
        setError(message);
        addToast(message, 'error');
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [accept, maxSizeMB, folder, onChange, addToast, activeBackend],
  );

  // ─── URL paste (R2 link, or any public URL) ──────────────────

  const handleApplyUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError("L'URL doit commencer par http:// ou https://");
      return;
    }
    setError(null);
    setUrlInput('');
    onChange(url);

    if (isR2Url(url)) {
      addToast('Image R2 appliquée avec succès', 'success');
    } else {
      addToast('Image URL appliquée', 'success');
    }
  }, [urlInput, onChange, addToast]);

  // ─── Drag & Drop ─────────────────────────────────────────────

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleClick = useCallback(() => { if (!uploading) inputRef.current?.click(); }, [uploading]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setPreview(null); onChange(''); setError(null);
  }, [onChange]);

  // ─── Detect current value backend ────────────────────────────

  const currentBackend = value ? (isR2Url(value) ? 'r2' : 'url') : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-cream">{label}</label>}

      {/* ═══ PREVIEW ═══ */}
      {displayUrl && (
        <div className="relative group rounded-2xl overflow-hidden border border-line">
          <img src={displayUrl} alt={label} className="w-full h-48 object-cover" />
          {/* Backend badge */}
          {currentBackend && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
              {currentBackend === 'r2' ? (
                <Cloud size={12} className="text-orange-400" />
              ) : (
                <HardDrive size={12} className="text-blue-400" />
              )}
              <span className="text-[10px] font-medium text-white/80">
                {currentBackend === 'r2' ? 'R2' : 'URL'}
              </span>
            </div>
          )}
          {!uploading && (
            <button type="button" onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              aria-label="Supprimer l'image">
              <X size={16} />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
      )}

      {/* ═══ UPLOAD CONTROLS ═══ */}
      {(!displayUrl || uploading) && (
        <div className="flex flex-col gap-3">

          {/* ── Backend toggle tabs ── */}
          {showBackendToggle && (
            <div className="flex rounded-xl border border-line overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveBackend('r2')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeBackend === 'r2'
                    ? 'bg-evangile-600/20 text-evangile-500 border-b-2 border-evangile-500'
                    : 'text-muted hover:text-cream hover:bg-white/5'
                }`}
              >
                <Cloud size={16} />
                Lien R2 / URL
              </button>
              <button
                type="button"
                onClick={() => setActiveBackend('supabase')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeBackend === 'supabase'
                    ? 'bg-evangile-600/20 text-evangile-500 border-b-2 border-evangile-500'
                    : 'text-muted hover:text-cream hover:bg-white/5'
                }`}
              >
                <Upload size={16} />
                Envoyer un fichier
              </button>
            </div>
          )}

          {/* ── R2 URL mode (default) ── */}
          {activeBackend === 'r2' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Cloud size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyUrl(); }}
                    placeholder="https://pub-bucket.r2.dev/hero/image.jpg"
                    className="w-full rounded-xl border border-line bg-bg pl-10 pr-4 py-3 text-sm text-cream placeholder:text-muted/50 focus:border-evangile-600/50 focus:outline-none transition-colors"
                  />
                </div>
                <button type="button" onClick={handleApplyUrl}
                  className="btn-gold px-4 py-3 text-sm whitespace-nowrap">
                  Appliquer
                </button>
              </div>
              <p className="text-[11px] text-muted/50 leading-relaxed">
                Collez le lien public de votre image depuis Cloudflare R2, ou toute autre URL d'image publique.
                Pour uploader sur R2, allez dans le <strong>Dashboard Cloudflare → R2</strong>, uploadez votre fichier, puis copiez le lien public.
              </p>
            </div>
          )}

          {/* ── File upload mode (Supabase) ── */}
          {activeBackend === 'supabase' && (
            <>
              {/* Drag & Drop / Browse */}
              <div
                role="button" tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); inputRef.current?.click(); } }}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center gap-3 w-full min-h-[140px] cursor-pointer rounded-2xl border border-dashed border-line transition ${
                  dragActive ? 'border-evangile-600 bg-evangile-600/5' : 'hover:border-evangile-600/40'
                }`}>
                <input ref={inputRef} type="file" accept={accept.join(',')} onChange={handleInputChange} className="hidden" aria-label={label} />
                {uploading ? (
                  <>
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-evangile-600 border-t-transparent" />
                    <p className="text-muted text-sm">Envoi en cours...</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <Upload size={24} className="text-muted" />
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <p className="text-muted text-sm">
                        Glissez-déposez ou <span className="text-evangile-500 font-medium">parcourir</span>
                      </p>
                      <p className="text-muted/60 text-xs">
                        {accept.map(m => m.split('/')[1].toUpperCase()).join(', ')} — max {maxSizeMB} Mo
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Separator OR */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-line" />
                <span className="text-muted/40 text-xs uppercase tracking-wider">ou</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              {/* URL paste fallback */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyUrl(); }}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full rounded-xl border border-line bg-bg pl-10 pr-4 py-3 text-sm text-cream placeholder:text-muted/50 focus:border-evangile-600/50 focus:outline-none transition-colors"
                  />
                </div>
                <button type="button" onClick={handleApplyUrl}
                  className="btn-gold px-4 py-3 text-sm whitespace-nowrap">
                  Appliquer
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
    </div>
  );
}