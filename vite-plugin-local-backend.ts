import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { fetchYoutubeFeed } from './shared/youtube-feed';

const PREFIX = '/__local-admin';
const STATE_LIMIT = 40 * 1024 * 1024;
const UPLOAD_LIMIT = 12 * 1024 * 1024;
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function isLoopback(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new Error('Fichier ou données trop volumineux.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function safeSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80) || 'fichier';
}

function safeFolder(value: string): string {
  return value
    .split('/')
    .filter(Boolean)
    .slice(0, 2)
    .map(safeSegment)
    .join('/');
}

function extensionFor(fileName: string, mime: string): string {
  const fromName = path.extname(fileName).toLowerCase();
  if (MIME[fromName]) return fromName;
  const found = Object.entries(MIME).find(([, type]) => type === mime);
  return found?.[0] ?? '.jpg';
}

export function localBackendPlugin(): Plugin {
  let dataDir = '';
  let stateFile = '';
  let uploadsDir = '';

  function ensureDirs() {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    if (!isLoopback(req)) {
      sendJson(res, 403, { error: 'Back-office local accessible uniquement depuis cet ordinateur.' });
      return;
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) || '/' : url.pathname;

    if (route === '/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, mode: 'local' });
      return;
    }

    if (route === '/state' && req.method === 'GET') {
      try {
        ensureDirs();
        if (!fs.existsSync(stateFile)) {
          sendJson(res, 200, {});
          return;
        }
        const raw = await fs.promises.readFile(stateFile, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(raw || '{}');
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : 'Lecture impossible.' });
      }
      return;
    }

    if (route === '/state' && req.method === 'PUT') {
      try {
        ensureDirs();
        const body = await readBody(req, STATE_LIMIT);
        const text = body.toString('utf8');
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          sendJson(res, 400, { error: 'État invalide.' });
          return;
        }
        const temp = `${stateFile}.tmp`;
        await fs.promises.writeFile(temp, JSON.stringify(parsed), 'utf8');
        await fs.promises.rename(temp, stateFile);
        sendJson(res, 200, { ok: true, bytes: Buffer.byteLength(text), updated_at: new Date().toISOString() });
      } catch (error) {
        sendJson(res, 400, { error: error instanceof Error ? error.message : 'Écriture impossible.' });
      }
      return;
    }

    if (route === '/upload' && req.method === 'POST') {
      try {
        const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
        if (!mime.startsWith('image/')) {
          sendJson(res, 415, { error: 'Seules les images sont acceptées.' });
          return;
        }
        const folder = safeFolder(url.searchParams.get('folder') ?? 'images');
        const requestedName = decodeURIComponent(url.searchParams.get('name') ?? 'image');
        const ext = extensionFor(requestedName, mime);
        const base = safeSegment(path.basename(requestedName, path.extname(requestedName)));
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`;
        const targetDir = path.join(uploadsDir, folder);
        fs.mkdirSync(targetDir, { recursive: true });
        const body = await readBody(req, UPLOAD_LIMIT);
        if (body.length === 0) {
          sendJson(res, 400, { error: 'Fichier vide.' });
          return;
        }
        await fs.promises.writeFile(path.join(targetDir, fileName), body);
        const publicPath = `${PREFIX}/uploads/${folder ? `${folder}/` : ''}${fileName}`;
        sendJson(res, 201, {
          url: publicPath,
          path: `${folder ? `${folder}/` : ''}${fileName}`,
          bytes: body.length,
        });
      } catch (error) {
        sendJson(res, 400, { error: error instanceof Error ? error.message : 'Envoi impossible.' });
      }
      return;
    }

    if (route.startsWith('/uploads/') && req.method === 'GET') {
      try {
        const relative = decodeURIComponent(route.slice('/uploads/'.length));
        const resolved = path.resolve(uploadsDir, relative);
        if (!resolved.startsWith(path.resolve(uploadsDir) + path.sep)) {
          sendJson(res, 403, { error: 'Chemin interdit.' });
          return;
        }
        const stat = await fs.promises.stat(resolved);
        if (!stat.isFile()) {
          sendJson(res, 404, { error: 'Fichier introuvable.' });
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        fs.createReadStream(resolved).pipe(res);
      } catch {
        sendJson(res, 404, { error: 'Fichier introuvable.' });
      }
      return;
    }

    sendJson(res, 404, { error: 'Route locale inconnue.' });
  }

  return {
    name: 'la-conquete-local-backend',
    apply: 'serve',
    configResolved(config) {
      dataDir = path.join(config.root, '.local-admin');
      stateFile = path.join(dataDir, 'state.json');
      uploadsDir = path.join(dataDir, 'uploads');
      ensureDirs();
    },
    configureServer(server) {
      server.middlewares.use(PREFIX, (req, res) => {
        void handle(req, res);
      });

      /* Parité locale avec la Pages Function /api/youtube-feed :
         le flux RSS est récupéré côté serveur, sans CORS. */
      server.middlewares.use('/api/youtube-feed', (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Méthode non autorisée.' });
          return;
        }
        fetchYoutubeFeed()
          .then((videos) => {
            sendJson(res, 200, {
              videos,
              syncedAt: new Date().toISOString(),
              source: 'youtube-live',
            });
          })
          .catch((error: unknown) => {
            sendJson(res, 502, {
              error: error instanceof Error ? error.message : 'Flux YouTube indisponible.',
              videos: [],
            });
          });
      });

      server.middlewares.use('/api/redeploy', (req, res) => {
        sendJson(res, 501, {
          error:
            "Le redéploiement est disponible uniquement sur le site déployé, une fois DEPLOY_HOOK_URL configuré. En local, les vidéos se rafraîchissent sans redéploiement.",
        });
      });

      server.httpServer?.once('listening', () => {
        server.config.logger.info('  ➜  Back-office local : données dans .local-admin/ (accessible depuis localhost uniquement)');
      });
    },
  };
}
