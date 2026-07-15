/* ═══════════════════════════════════════════════════════════════════
   Sign In Form — Accepte téléphone OU email
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, Phone } from '../../lib/icons';

interface SignInFormProps {
  onComplete?: () => void;
  onSwitchToSignup: () => void;
  onForgotPassword?: () => void;
}

/** Détecte si l'entrée ressemble à un numéro de téléphone */
function looksLikePhone(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  return digits.length >= 9 && !input.includes('@');
}

/** Convertit un numéro de téléphone en email fictif pour la recherche */
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@lc.app`;
}

export function SignInForm({ onComplete, onSwitchToSignup, onForgotPassword }: SignInFormProps) {
  const { signIn } = useAuth();
  const { addToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      addToast('Veuillez remplir tous les champs.', 'error');
      return;
    }
    setLoading(true);
    try {
      let emailToUse = identifier.trim();

      // Si c'est un numéro de téléphone, chercher l'email correspondant dans user_profiles
      if (looksLikePhone(identifier)) {
        const phoneDigits = identifier.replace(/\D/g, '');
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('email, phone')
          .or(`phone.ilike.%${phoneDigits}%,phone.ilike.%${identifier.trim()}%`)
          .limit(1);

        if (profileData && profileData.length > 0) {
          emailToUse = profileData[0].email;
        } else {
          // Essayer avec l'email auto-généré
          emailToUse = phoneToEmail(identifier);
        }
      }

      await signIn(emailToUse, password);
      addToast('Connexion réussie !', 'success');
      onComplete?.();
    } catch (err: any) {
      const msg = err?.message || 'Erreur de connexion.';
      if (msg.includes('Invalid login') || msg.includes('invalid credentials')) {
        addToast('Téléphone/email ou mot de passe incorrect.', 'error');
      } else if (msg.includes('Email not confirmed')) {
        addToast('Veuillez confirmer votre email avant de vous connecter.', 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const isPhone = looksLikePhone(identifier);

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="auth-text-heading text-xl font-bold text-center mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Connexion à votre compte
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="auth-label block text-sm font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
            Téléphone ou email
          </label>
          <div className="relative">
            {isPhone
              ? <Phone className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              : <Mail className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
            }
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="+243 8XX XXX XXX ou email"
              required
              className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <p className="auth-text-muted text-xs mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Entrez votre numéro de téléphone ou votre adresse email
          </p>
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