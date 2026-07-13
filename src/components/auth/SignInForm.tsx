/* ═══════════════════════════════════════════════════════════════════
   Sign In Form — For existing members
   High-contrast, theme-aware via CSS classes
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from '../../lib/icons';

interface SignInFormProps {
  onComplete?: () => void;
  onSwitchToSignup: () => void;
  onForgotPassword?: () => void;
}

export function SignInForm({ onComplete, onSwitchToSignup, onForgotPassword }: SignInFormProps) {
  const { signIn } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Veuillez remplir tous les champs.', 'error');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      addToast('Connexion réussie !', 'success');
      onComplete?.();
    } catch (err: any) {
      const msg = err?.message || 'Erreur de connexion.';
      if (msg.includes('Invalid login') || msg.includes('invalid credentials')) {
        addToast('Email ou mot de passe incorrect.', 'error');
      } else if (msg.includes('Email not confirmed')) {
        addToast('Veuillez confirmer votre email avant de vous connecter.', 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="auth-text-heading text-xl font-bold text-center mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Connexion à votre compte
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
            Adresse email
          </label>
          <div className="relative">
            <Mail className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" required
              className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ fontFamily: "'Inter', sans-serif" }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="auth-label block text-sm font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
              Mot de passe
            </label>
            {onForgotPassword && (
              <button type="button" onClick={onForgotPassword}
                className="auth-text-link text-xs font-medium transition-colors cursor-pointer">
                Mot de passe oublié ?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Votre mot de passe" required
              className="auth-input w-full pl-11 pr-12 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ fontFamily: "'Inter', sans-serif" }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="auth-icon absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 mt-2
            bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl
            hover:from-red-600 hover:to-red-700 active:scale-[0.98]
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-red-500/20 text-sm cursor-pointer"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <><LogIn className="w-4 h-4" /> Se connecter</>
          )}
        </button>
      </form>

      <p className="auth-text-muted text-center text-sm mt-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        Pas encore de compte ?{' '}
        <button onClick={onSwitchToSignup} className="auth-text-link font-medium transition-colors cursor-pointer">
          Créer un compte
        </button>
      </p>
    </div>
  );
}