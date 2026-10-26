interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  DEPLOY_HOOK_URL?: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function readToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!env.DEPLOY_HOOK_URL) {
    return json(
      {
        error:
          "Le redéploiement automatique n'est pas configuré. Ajoutez la variable serveur DEPLOY_HOOK_URL dans Cloudflare Pages (Deploy hook du projet).",
      },
      503,
    );
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Variables Supabase serveur manquantes sur Cloudflare Pages.' }, 503);
  }

  const token = readToken(request);
  if (!token) return json({ error: 'Authentification requise.' }, 401);

  const authHeaders = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  };

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: authHeaders });
  if (!userResponse.ok) return json({ error: 'Session expirée. Reconnectez-vous.' }, 401);
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return json({ error: 'Session invalide.' }, 401);

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=is_admin,role_level&id=eq.${encodeURIComponent(user.id)}`,
    { headers: authHeaders },
  );
  if (!profileResponse.ok) return json({ error: 'Profil administrateur illisible.' }, 403);

  const rows = (await profileResponse.json()) as Array<{ is_admin?: boolean; role_level?: number }>;
  const profile = rows[0];
  if (!profile?.is_admin && (profile?.role_level ?? 0) < 5) {
    return json({ error: 'Seul un administrateur peut lancer un redéploiement.' }, 403);
  }

  const hookResponse = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!hookResponse.ok) {
    return json({ error: `Le deploy hook a répondu ${hookResponse.status}.` }, 502);
  }

  return json({
    ok: true,
    message: 'Redéploiement lancé. Le site sera à jour dans quelques minutes.',
    requestedAt: new Date().toISOString(),
  });
}
