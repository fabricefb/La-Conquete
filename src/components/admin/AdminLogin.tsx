import { useState, type FormEvent } from 'react';
import { Lock, Mail, Eye, EyeOff, Loader2, UserPlus, AlertTriangle } from '../../lib/icons';
import { HardDrive } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase, isCloudConfigured } from '../../lib/supabase';
import { isLocalBackendAvailable } from '../../lib/localBackend';

type Mode = 'login' | 'signup';

export default function AdminLogin() {
  const { signIn, signInLocal } = useAuth();
  const { addToast } = useToast();
  const localAvailable = isLocalBackendAvailable();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      addToast('Connexion réussie', 'success');
    } catch (err: unknown) {
      let msg = 'Email ou mot de passe incorrect';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        msg = (err as any).message;
      }
      setError(msg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLogin = async () => {
    setError('');
    setLocalLoading(true);
    try {
      await signInLocal();
      addToast('Back-office local ouvert', 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir le mode local.");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit avoir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (authError) throw authError;

      // If email confirmation is required, user will be null but signup succeeds
      const userId = data.user?.id;
      const session = data.session;

      if (userId) {
        // 2. Create/update profile — tenter d'abord avec onboarding_completed
        const baseProfile: Record<string, any> = {
          id: userId,
          email: email.trim(),
          full_name: name.trim(),
          is_admin: false,
        };

        let profileErr: any = null;
        const { error: err1 } = await supabase
          .from('user_profiles')
          .upsert({ ...baseProfile, onboarding_completed: true }, { onConflict: 'id' });

        if (err1 && (err1.message.includes('does not exist') || err1.code === '42703')) {
          // Colonne onboarding_completed inexistante, réessayer sans
          const { error: err2 } = await supabase
            .from('user_profiles')
            .upsert(baseProfile, { onConflict: 'id' });
          profileErr = err2;
        } else {
          profileErr = err1;
        }

        if (profileErr) {
          console.error('Profile upsert error:', profileErr.message);
          // Non-blocking: profile will be auto-created on fetchProfile
        }
      }

      if (session) {
        // Auto-logged in (no email confirmation required)
        addToast('Compte admin créé avec succès !', 'success');
      } else {
        // Email confirmation required — user needs to confirm first
        addToast('Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.', 'success');
      }

      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      let msg = 'Erreur lors de la création du compte.';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        msg = (err as any).message;
      } else if (err && typeof err === 'object' && 'msg' in err && typeof (err as any).msg === 'string') {
        msg = (err as any).msg;
      } else if (typeof err === 'string') {
        msg = err;
      }
      setError(msg);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `input-surface w-full py-3 pl-11 pr-4 text-sm ${
    error ? '!border-red-500/70' : ''
  }`;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-12 text-cream">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative w-full max-w-[26rem]">
        {/* ─── Brand ─── */}
        <div className="flex flex-col items-center text-center">
          <span className="logo-plate">
            <img
              src="/logo-conquete.png"
              alt="Église Évangélique La Conquête"
              className="h-12 w-auto object-contain"
            />
          </span>
          <span className="section-label mt-5">Back-office</span>
          <h1 className="mt-2 font-hero text-4xl uppercase leading-none tracking-[0.03em] text-cream">
            Administration
          </h1>
          <div className="mt-4 h-px w-16 bg-evangile-600" />
          <p className="mt-4 text-xs text-muted">
            {localAvailable && !isCloudConfigured
              ? 'Mode local — les modifications restent sur cet ordinateur.'
              : mode === 'login'
                ? 'Connectez-vous pour gérer le site.'
                : 'Créez un compte administrateur.'}
          </p>
        </div>

        {/* ─── Card ─── */}
        <div className="panel mt-8 border-t-2 border-t-evangile-600 p-6 sm:p-8">
          {/* Mode local (développement) */}
          {localAvailable && (
            <div className="mb-6 border border-line border-l-2 border-l-evangile-600 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[rgb(var(--accent-red-rgb))]" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream">
                  Back-office local
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Sans connexion cloud. Les textes et photos restent dans{' '}
                <code className="bg-white/10 px-1 text-cream">.local-admin/</code> sur cet ordinateur.
              </p>
              <button
                type="button"
                onClick={() => void handleLocalLogin()}
                disabled={localLoading}
                className="btn-ghost mt-3 w-full py-2.5 text-[11px] uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {localLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {localLoading ? 'Ouverture…' : 'Entrer en mode local'}
              </button>
              {!isCloudConfigured && error && (
                <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>
              )}
            </div>
          )}

          {/* Aucun backend disponible */}
          {!isCloudConfigured && !localAvailable && (
            <div className="border border-red-500/40 bg-red-500/[0.06] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">
                    Connexion impossible
                  </p>
                  <p className="mt-2 text-xs leading-5 text-red-300/70">
                    Les variables <code className="bg-red-500/20 px-1 text-red-200">VITE_SUPABASE_URL</code> et{' '}
                    <code className="bg-red-500/20 px-1 text-red-200">VITE_SUPABASE_ANON_KEY</code> ne sont pas configurées.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-red-300/70">
                    Ajoutez-les dans <strong>Cloudflare Pages → Settings → Environment variables</strong> puis redéployez.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connexion cloud */}
          {isCloudConfigured && (
            <>
              <div className="mb-6 grid grid-cols-2 border-b border-line" role="tablist" aria-label="Mode d'accès">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`-mb-px border-b-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                    mode === 'login'
                      ? 'border-evangile-600 text-cream'
                      : 'border-transparent text-muted hover:text-cream'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  className={`-mb-px border-b-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                    mode === 'signup'
                      ? 'border-evangile-600 text-cream'
                      : 'border-transparent text-muted hover:text-cream'
                  }`}
                >
                  Créer un compte
                </button>
              </div>

              <form onSubmit={mode === 'login' ? handleLogin : handleSignup} noValidate className="space-y-4">
                {/* Name field (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="admin-name" className="sr-only">Nom complet</label>
                    <div className="relative">
                      <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" aria-hidden="true" />
                      <input
                        id="admin-name"
                        type="text"
                        required
                        placeholder="Nom complet"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label htmlFor="admin-email" className="sr-only">Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" aria-hidden="true" />
                    <input
                      id="admin-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Adresse e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="admin-password" className="sr-only">Mot de passe</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" aria-hidden="true" />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="Mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} !pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/60 transition-colors hover:text-cream"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      tabIndex={0}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="admin-confirm" className="sr-only">Confirmer le mot de passe</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" aria-hidden="true" />
                      <input
                        id="admin-confirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirmer le mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300" role="alert">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>{mode === 'login' ? 'Connexion en cours…' : 'Création en cours…'}</span>
                    </>
                  ) : (
                    <span>{mode === 'login' ? 'Se connecter' : 'Créer le compte'}</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-muted/60">
          Église Évangélique La Conquête
        </p>
      </div>
    </main>
  );
}
