from PIL import Image
import os

src = '/home/z/my-project/public/pasteur-kazadi.jpg'
out_dir = '/home/z/my-project/public'

# Load and crop to square from center
img = Image.open(src)
w, h = img.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
img = img.crop((left, top, left + side, top + side))

# Generate favicon.ico (multi-size: 16, 32, 48)
sizes = [(16, 16), (32, 32), (48, 48)]
icons = [img.resize(s, Image.LANCZOS) for s in sizes]
icons[0].save(
    os.path.join(out_dir, 'favicon.ico'),
    format='ICO',
    sizes=[(s.width, s.height) for s in icons],
    append_images=icons[1:],
)

# Generate apple-touch-icon.png (180x180)
apple = img.resize((180, 180), Image.LANCZOS)
apple.save(os.path.join(out_dir, 'apple-touch-icon.png'))

# Generate PWA icons (192x192 and 512x512)
for size in [192, 512]:
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(out_dir, f'pwa-icon-{size}x{size}.png'))

print('All icons generated successfully')