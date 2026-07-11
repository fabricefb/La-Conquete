import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Image } from 'lucide-react';
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
  label = 'Upload Image',
  accept = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSizeMB = 5,
  folder = 'images',
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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

      // Generate a local data-URL preview so the user sees the image immediately
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setUploading(true);

      try {
        const publicUrl = await uploadFile(file, folder);
        setPreview(null); // no longer need local preview
        onChange(publicUrl);
        addToast('Image uploaded successfully', 'success');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
        setError(message);
        addToast(message, 'error');
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [accept, maxSizeMB, folder, onChange, addToast],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset the input so re-selecting the same file still fires the change event
      e.target.value = '';
    },
    [processFile],
  );

  const handleClick = useCallback(() => {
    if (!uploading) {
      inputRef.current?.click();
    }
  }, [uploading]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setPreview(null);
      onChange('');
      setError(null);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [uploading],
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-cream">{label}</label>
      )}

      {/* Current image preview */}
      {displayUrl && (
        <div className="relative group rounded-2xl overflow-hidden border border-line">
          <img
            src={displayUrl}
            alt={label}
            className="w-full h-48 object-cover"
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              aria-label="Remove image"
            >
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

      {/* Drop zone – hidden while showing an uploaded image (unless uploading) */}
      {(!displayUrl || uploading) && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center gap-3
            w-full min-h-[160px] cursor-pointer
            rounded-2xl border border-dashed border-line
            transition
            ${
              dragActive
                ? 'border-gold-400 bg-gold-400/5'
                : 'hover:border-gold-400/40'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept.join(',')}
            onChange={handleInputChange}
            className="hidden"
            aria-label={label}
          />

          {uploading ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
              <p className="text-muted text-sm">Uploading&hellip;</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                {displayUrl ? (
                  <Image size={24} className="text-gold-400" />
                ) : (
                  <Upload size={24} className="text-muted" />
                )}
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-muted text-sm">
                  Drag &amp; drop or <span className="text-gold-400 font-medium">browse</span>
                </p>
                <p className="text-muted/60 text-xs">
                  {accept.map((m) => m.split('/')[1].toUpperCase()).join(', ')} up to {maxSizeMB} MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Inline error */}
      {error && (
        <p className="text-red-500 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}