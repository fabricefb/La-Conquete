import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Image, Link } from 'lucide-react';
import { validateFile, uploadFile } from '../../lib/storage';
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
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const displayUrl = preview ?? value ?? null;

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

      // Preview local
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

  const handleApplyUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError("L'URL doit commencer par http:// ou https://");
      return;
    }
    setError(null);
    setUrlInput('');
    setUrlMode(false);
    onChange(url);
    addToast('Image URL appliquée', 'success');
  }, [urlInput, onChange, addToast]);

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

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="text-sm font-medium text-cream">{label}</label>}

      {/* Preview */}
      {displayUrl && (
        <div className="relative group rounded-2xl overflow-hidden border border-line">
          <img src={displayUrl} alt={label} className="w-full h-48 object-cover" />
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

      {/* Upload zone + URL toggle */}
      {(!displayUrl || uploading) && (
        <div className="flex flex-col gap-3">
          {!urlMode ? (
            <>
              {/* Drag & Drop / Browse */}
              <div
                role="button" tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); inputRef.current?.click(); } }}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center gap-3 w-full min-h-[140px] cursor-pointer rounded-2xl border border-dashed border-line transition ${
                  dragActive ? 'border-gold-400 bg-gold-400/5' : 'hover:border-gold-400/40'
                }`}>
                <input ref={inputRef} type="file" accept={accept.join(',')} onChange={handleInputChange} className="hidden" aria-label={label} />
                {uploading ? (
                  <>
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
                    <p className="text-muted text-sm">Envoi en cours...</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <Upload size={24} className="text-muted" />
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <p className="text-muted text-sm">
                        Glissez-déposez ou <span className="text-gold-400 font-medium">parcourir</span>
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

              {/* URL mode toggle */}
              <button type="button" onClick={() => setUrlMode(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm text-muted hover:border-gold-400/40 hover:text-gold-400 transition-colors">
                <Link size={16} />
                Coller un lien URL d'image
              </button>
            </>
          ) : (
            /* URL input mode */
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleApplyUrl(); }}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full rounded-xl border border-line bg-bg pl-10 pr-4 py-3 text-sm text-cream placeholder:text-muted/50 focus:border-gold-400/50 focus:outline-none transition-colors"
                  />
                </div>
                <button type="button" onClick={handleApplyUrl}
                  className="btn-gold px-4 py-3 text-sm whitespace-nowrap">
                  Appliquer
                </button>
              </div>
              <button type="button" onClick={() => { setUrlMode(false); setError(null); }}
                className="text-xs text-muted/60 hover:text-muted transition-colors self-start">
                ← Retour à l'envoi de fichier
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
    </div>
  );
}