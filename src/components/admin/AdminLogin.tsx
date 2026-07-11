import { useState, type FormEvent } from 'react';
import { Lock, Mail, Landmark, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

type Mode = 'login' | 'signup';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
        // 2. Create/update profile as admin (upsert handles both cases)
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            email: email.trim(),
            full_name: name.trim(),
            is_admin: true,
            onboarding_completed: true,
          }, { onConflict: 'id' });

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

  const inputClass = `w-full pl-11 pr-4 py-3 rounded-lg bg-white/5 border text-cream placeholder-cream/30 outline-none transition-colors focus:ring-2 focus:ring-gold-400/50 ${
    error
      ? 'border-red-500 focus:border-red-400'
      : 'border-white/10 focus:border-gold-400/60'
  }`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg text-cream px-4 py-12">
      <div className="glass w-full max-w-md rounded-2xl p-8 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Landmark className="w-14 h-14 text-gold-400 mb-4" aria-hidden="true" />
          <h1 className="font-serif text-3xl font-bold text-cream tracking-tight">
            Administration
          </h1>
          <p className="mt-2 text-sm text-cream/60 text-center">
            {mode === 'login'
              ? 'Connectez-vous pour accéder au back-office'
              : 'Créez votre compte administrateur'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} noValidate className="space-y-5">
          {/* Name field (signup only) */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="admin-name" className="sr-only">Nom complet</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none" aria-hidden="true" />
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
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none" aria-hidden="true" />
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
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none" aria-hidden="true" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70 transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm password (signup only) */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="admin-confirm" className="sr-only">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none" aria-hidden="true" />
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
            <p className="text-red-400 text-sm text-center" role="alert">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3 rounded-lg font-semibold text-bg flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>{mode === 'login' ? 'Connexion en cours…' : 'Création en cours…'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Se connecter' : 'Créer le compte admin'}</span>
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
            className="text-sm text-gold-400 hover:text-gold-300 transition-colors"
          >
            {mode === 'login'
              ? "Première fois ? Créer un compte admin"
              : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </main>
  );
}