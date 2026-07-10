import { useState, type FormEvent } from 'react';
import { Lock, Mail, Church, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setSigning(true);
    try {
      await signIn(email.trim(), password);
      addToast('Connexion réussie', 'success');
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setSigning(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg text-cream px-4 py-12">
      <div className="glass w-full max-w-md rounded-2xl p-8 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Church className="w-14 h-14 text-gold-400 mb-4" aria-hidden="true" />
          <h1 className="font-serif text-3xl font-bold text-cream tracking-tight">
            Administration
          </h1>
          <p className="mt-2 text-sm text-cream/60 text-center">
            Connectez-vous pour accéder au back-office
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email field */}
          <div>
            <label htmlFor="admin-email" className="sr-only">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Adresse e-mail"
                aria-invalid={error ? true : undefined}
                className={`w-full pl-11 pr-4 py-3 rounded-lg bg-white/5 border text-cream placeholder-cream/30 outline-none transition-colors focus:ring-2 focus:ring-gold-400/50 ${
                  error
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-white/10 focus:border-gold-400/60'
                }`}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="admin-password" className="sr-only">
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Mot de passe"
                aria-invalid={error ? true : undefined}
                className={`w-full pl-11 pr-12 py-3 rounded-lg bg-white/5 border text-cream placeholder-cream/30 outline-none transition-colors focus:ring-2 focus:ring-gold-400/50 ${
                  error
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-white/10 focus:border-gold-400/60'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70 transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-400 text-sm text-center" role="alert">
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={signing}
            className="btn-gold w-full py-3 rounded-lg font-semibold text-bg flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>Connexion en cours…</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}