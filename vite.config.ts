import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localBackendPlugin } from './vite-plugin-local-backend';

// Les builds CI Cloudflare ne disposent pas du .env.production (non versionne).
// Les cles publiques de wrangler.toml [vars] servent alors de repli.
function wranglerVars(): Record<string, string> {
  try {
    const toml = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
    const vars: Record<string, string> = {};
    let inVars = false;
    for (const line of toml.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[')) {
        inVars = trimmed === '[vars]';
        continue;
      }
      if (!inVars || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      vars[trimmed.slice(0, index).trim()] = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
    return vars;
  } catch {
    return {};
  }
}

const publicVars = wranglerVars();
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  if (!process.env[key] && publicVars[key]) process.env[key] = publicVars[key];
}

export default defineConfig({
  plugins: [react(), localBackendPlugin()],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
        },
      },
    },
  },
});