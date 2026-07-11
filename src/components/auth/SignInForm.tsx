/* ═══════════════════════════════════════════════════════════════════
   Sign In Form — For existing members
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from '../../lib/icons';

interface SignInFormProps {
  onComplete?: () => void;
  onSwitchToSignup: () => void;
}

export function SignInForm({ onComplete, onSwitchToSignup }: SignInFormProps) {
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
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur de connexion.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-xl font-bold text-cream text-center mb-6">
        Connexion à votre compte
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Adresse email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" required
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Votre mot de passe" required
              className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-ember text-ink font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <><LogIn className="w-4 h-4" /> Se connecter</>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-white/40 mt-6">
        Pas encore de compte ?{' '}
        <button onClick={onSwitchToSignup} className="text-gold hover:underline font-medium">
          Créer un compte
        </button>
      </p>
    </div>
  );
}