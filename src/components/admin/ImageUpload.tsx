import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Cloud, HardDrive, FolderOpen } from 'lucide-react';
import { validateFile, uploadFile } from '../../lib/storage';
import { isR2Url, R2_PUBLIC_BASE } from '../../lib/r2';
import { useToast } from '../../contexts/ToastContext';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string[];
  maxSizeMB?: number;
  folder?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  accept = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSizeMB = 5,
  folder = 'images',
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const displayUrl = preview ?? value ?? null;

  // ─── File upload ────────────────────────────────────────────

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

      // Local preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        const publicUrl = await uploadFile(file, folder);
        setPreview(null);
        onChange(publicUrl);
        addToast('Image envoyée avec succès', 'success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Échec de l'envoi de l'image.";
        setError(message);
        addToast(message, 'error');
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [accept, maxSizeMB, folder, onChange, addToast],
  );

  // ─── URL paste ──────────────────────────────────────────────

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
    addToast(isR2Url(url) ? 'Image R2 appliquée' : 'Image URL appliquée', 'success');
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

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleBrowseClick = useCallback(() => {
    if (!uploading) fileInputRef.current?.click();
  }, [uploading]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setPreview(null); onChange(''); setError(null);
  }, [onChange]);

  const currentBackend = value ? (isR2Url(value) ? 'r2' : 'url') : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-cream">{label}</label>}

      {/* ═══ PREVIEW ═══ */}
      {displayUrl && (
        <div className="relative group rounded-2xl overflow-hidden border border-line">
          <img src={displayUrl} alt={label} className="w-full h-48 object-cover" />
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

          {/* ── Hidden file input ── */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept.join(',')}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* ── Row 1: URL field + Parcourir button ── */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Cloud size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyUrl(); }}
                placeholder="Collez un lien R2 ou URL d'image..."
                className="w-full rounded-xl border border-line bg-bg pl-10 pr-4 py-3 text-sm text-cream placeholder:text-muted/50 focus:border-evangile-600/50 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={handleBrowseClick}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-4 py-3 text-sm font-medium text-cream hover:border-evangile-600/40 hover:bg-white/10 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              <FolderOpen size={16} />
              Parcourir
            </button>
            <button
              type="button"
              onClick={handleApplyUrl}
              disabled={!urlInput.trim()}
              className="btn-gold px-4 py-3 text-sm whitespace-nowrap disabled:opacity-40"
            >
              Appliquer
            </button>
          </div>

          {/* ── Drag & drop zone ── */}
          <div
            role="button" tabIndex={0}
            onClick={handleBrowseClick}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-2 w-full py-5 cursor-pointer rounded-2xl border-2 border-dashed border-line transition ${
              dragActive ? 'border-evangile-600 bg-evangile-600/5' : 'hover:border-evangile-600/40 hover:bg-white/[0.02]'
            }`}>
            {uploading ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-evangile-600 border-t-transparent" />
                <p className="text-muted text-sm">Envoi en cours...</p>
              </>
            ) : (
              <>
                <Upload size={20} className="text-muted/60" />
                  <p className="text-muted/60 text-xs">
                  ou glissez-déposez une image ici — {accept.map(m => m.split('/')[1].toUpperCase()).join(', ')} — max {maxSizeMB} Mo
                </p>
                <p className="text-[10px] text-muted/40 mt-0.5">
                  R2 : {R2_PUBLIC_BASE}/votre-dossier/image.jpg
                </p>
              </>
            )}
          </div>

        </div>
      )}

      {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
    </div>
  );
}