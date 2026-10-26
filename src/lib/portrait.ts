export type PreparedPortrait = { src: string; mode: 'cutout' | 'photo' };

const CACHE = new Map<string, Promise<PreparedPortrait>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function toBlobUrl(canvas: HTMLCanvasElement): Promise<string | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/webp', 0.92);
  });
}

/* Un PNG détouré arrive souvent avec de grandes marges transparentes : sans
   recadrage, le sujet paraît minuscule dans le bloc. On mesure le contour
   réel, on retire les marges et on renvoie un WebP transparent léger. */
export function preparePortrait(src: string): Promise<PreparedPortrait> {
  const cached = CACHE.get(src);
  if (cached) return cached;

  const job = (async (): Promise<PreparedPortrait> => {
    if (!/\.png(\?|$)/i.test(src)) return { src, mode: 'photo' };

    const img = await loadImage(src);
    if (!img) return { src, mode: 'photo' };

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return { src, mode: 'photo' };

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { src, mode: 'photo' };

    try {
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, w, h);
      const step = w * h > 3_000_000 ? 2 : 1;
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;
      let transparent = 0;
      let sampled = 0;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const alpha = data[(y * w + x) * 4 + 3];
          sampled += 1;
          if (alpha < 16) {
            transparent += 1;
            continue;
          }
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      // Sans vraie zone transparente, c'est une photo : on garde le fondu.
      if (maxX < minX || transparent / sampled < 0.02) return { src, mode: 'photo' };

      const pad = 6;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(w - 1, maxX + pad);
      maxY = Math.min(h - 1, maxY + pad);

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      const scale = Math.min(1, 1200 / cropW, 1200 / cropH);

      const out = document.createElement('canvas');
      out.width = Math.round(cropW * scale);
      out.height = Math.round(cropH * scale);
      const outCtx = out.getContext('2d');
      if (!outCtx) return { src, mode: 'cutout' };

      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, out.width, out.height);

      const url = await toBlobUrl(out);
      return { src: url ?? src, mode: 'cutout' };
    } catch {
      return { src, mode: 'photo' };
    }
  })();

  CACHE.set(src, job);
  return job;
}
