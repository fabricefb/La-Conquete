import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import ImageUpload from './ImageUpload';

/* Liste de photos séparées par des virgules (diaporamas). On ajoute et on
   retire une entrée sans jamais réécrire toute la valeur : un collage dans un
   champ texte effaçait les autres photos. */
export function ImageListField({
  value,
  onChange,
  folder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  folder: string;
  disabled?: boolean;
}) {
  const urls = value.split(',').map((url) => url.trim()).filter(Boolean);
  const [adding, setAdding] = useState(false);

  const replace = (index: number, url: string) => {
    const next = [...urls];
    if (!url) next.splice(index, 1);
    else next[index] = url;
    onChange(next.join(','));
  };

  const remove = (index: number) => {
    const next = [...urls];
    next.splice(index, 1);
    onChange(next.join(','));
  };

  return (
    <div className="space-y-3">
      {urls.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-4 text-xs text-muted/70">
          Aucune photo. La photo de fond seule sera affichée.
        </p>
      )}

      {urls.map((url, index) => (
        <div key={`${url}-${index}`} className="rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex items-start gap-3">
            <img
              src={url}
              alt={`Photo ${index + 1}`}
              className="h-20 w-32 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Photo {index + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="flex items-center gap-1 text-[10px] text-muted transition-colors hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                    Retirer
                  </button>
                )}
              </div>
              <ImageUpload
                value={url}
                onChange={(next) => replace(index, next)}
                label=""
                folder={folder}
                compact
                allowReplace
                hideDropzone
              />
            </div>
          </div>
        </div>
      ))}

      {!disabled &&
        (adding ? (
          <div className="rounded-xl border border-line bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Nouvelle photo
              </span>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[10px] text-muted hover:text-cream"
              >
                Fermer
              </button>
            </div>
            <ImageUpload
              value=""
              onChange={(url) => {
                if (!url) return;
                onChange([...urls, url].join(','));
                setAdding(false);
              }}
              label=""
              folder={folder}
              compact
              allowReplace
              hideDropzone
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-2.5 text-xs text-muted transition-colors hover:border-amber-500/40 hover:text-amber-400"
          >
            <ImagePlus className="h-4 w-4" />
            Ajouter une photo
          </button>
        ))}
    </div>
  );
}
