/* ═══════════════════════════════════════════════════════════════════
   Google OAuth — bouton partagé connexion / inscription
   Le numéro de téléphone reste obligatoire : il est demandé juste après
   la première connexion Google via l'onboarding.
   ═══════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Loader2 } from '../../lib/icons';

const FONT_BODY = { fontFamily: "'Poppins', sans-serif" };

interface GoogleAuthButtonProps {
  label?: string;
}

export function GoogleAuthButton({ label = 'Continuer avec Google' }: GoogleAuthButtonProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Permet de retrouver le tableau de bord au retour de Google.
      sessionStorage.setItem('lc_oauth_pending', '1');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) {
        sessionStorage.removeItem('lc_oauth_pending');
        const message = error.message || '';
        addToast(
          /not enabled|provider|unsupported/i.test(message)
            ? "La connexion Google n'est pas encore activée. Contactez l'administrateur du site."
            : message,
          'error',
        );
      }
    } catch {
      sessionStorage.removeItem('lc_oauth_pending');
      addToast('La connexion Google a échoué. Veuillez réessayer.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="auth-text-muted text-[11px] uppercase tracking-wider" style={FONT_BODY}>
          ou
        </span>
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="auth-tab flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        style={FONT_BODY}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z" />
          </svg>
        )}
        {loading ? 'Redirection…' : label}
      </button>

      <p className="auth-text-muted mt-2 text-center text-[11px]" style={FONT_BODY}>
        {label === 'Continuer avec Google'
          ? 'Votre numéro de téléphone sera demandé après la première connexion.'
          : 'Le numéro de téléphone sera complété juste après la création du compte.'}
      </p>
    </div>
  );
}
