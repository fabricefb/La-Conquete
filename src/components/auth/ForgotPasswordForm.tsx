/* ═══════════════════════════════════════════════════════════════════
   Forgot Password Form — Email + WhatsApp recovery
   High-contrast, theme-aware via CSS classes
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Phone, KeyRound, MessageCircle, ArrowLeft, Loader2, CheckCircle } from '../../lib/icons';

/* ─── Props ─────────────────────────────────────────────────── */
interface ForgotPasswordFormProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

/* ─── Recovery method tabs ─────────────────────────────────── */
type RecoveryMethod = 'email' | 'whatsapp';

/* ─── Shared style ──────────────────────────────────────────── */
const FONT_BODY = { fontFamily: "'Inter', sans-serif" };
const FONT_DISPLAY = { fontFamily: "'Cormorant Garamond', serif" };

/* ─── Admin WhatsApp number (configurable) ────────────────── */
const ADMIN_WHATSAPP = '243999071754';

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */
export function ForgotPasswordForm({ onBack, onSwitchToLogin }: ForgotPasswordFormProps) {
  const { addToast } = useToast();
  const [method, setMethod] = useState<RecoveryMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  /* ─── Send reset via email (Supabase built-in) ───────────── */
  const handleEmailReset = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('Veuillez entrer une adresse email valide.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}#connexion`,
      });

      if (error) {
        if (error.message.includes('User not found') || error.message.includes('not found')) {
          addToast('Aucun compte trouvé avec cette adresse email.', 'error');
        } else {
          addToast(error.message, 'error');
        }
        return;
      }

      setSent(true);
      addToast('Lien de réinitialisation envoyé par email !', 'success');
    } catch (err) {
      addToast("Erreur lors de l'envoi. Veuillez réessayer.", 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Send reset via WhatsApp (lookup email by phone) ────── */
  const handleWhatsAppReset = async () => {
    if (!phone || phone.length < 9) {
      addToast('Veuillez entrer un numéro de téléphone valide.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Look up the user's profile by phone number
      const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');

      const { data: profiles, error: lookupErr } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, phone')
        .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%+${cleanPhone}%,phone.ilike.%${phone}%`);

      if (lookupErr || !profiles || profiles.length === 0) {
        addToast('Aucun compte trouvé avec ce numéro.', 'error');
        return;
      }

      const profile = profiles[0] as any;
      const userEmail = profile.email;

      if (!userEmail) {
        addToast("Compte trouvé mais sans email associé. Contactez l'administrateur.", 'error');
        return;
      }

      // Send the Supabase reset email to the found email
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}${window.location.pathname}#connexion`,
      });

      if (resetErr) {
        addToast("Erreur lors de l'envoi du lien. Contactez l'administrateur via WhatsApp.", 'error');
        return;
      }

      setSent(true);
      addToast(`Lien envoyé à l'adresse ${userEmail} associée à ce numéro.`, 'success');
    } catch (err) {
      addToast('Erreur lors de la recherche. Veuillez réessayer.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Submit handler ──────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'email') {
      await handleEmailReset();
    } else {
      await handleWhatsAppReset();
    }
  };

  /* ─── Contact admin via WhatsApp ──────────────────────────── */
  const contactAdminWhatsApp = () => {
    const message = encodeURIComponent(
      "Bonjour, je n'arrive pas à récupérer mon mot de passe sur le site de La Conquête. Pouvez-vous m'aider ? Mon numéro : " + phone
    );
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${message}`, '_blank');
  };

  /* ─── Success state ──────────────────────────────────────── */
  if (sent) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        <h3 className="auth-text-heading text-xl font-bold mb-2" style={FONT_DISPLAY}>
          Lien envoyé !
        </h3>
        <p className="auth-text-muted text-sm mb-6 leading-relaxed" style={FONT_BODY}>
          {method === 'email'
            ? "Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour réinitialiser votre mot de passe."
            : "Un lien de réinitialisation a été envoyé à l'adresse email associée à votre numéro."}
        </p>

        <div className="auth-info-box border rounded-xl p-4 mb-6">
          <p className="auth-text-muted text-xs" style={FONT_BODY}>
            <strong className="auth-text-heading">Vérifiez aussi :</strong> le dossier spam ou courrier indésirable de votre boîte mail.
          </p>
        </div>

        <button onClick={onSwitchToLogin}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5
            bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl
            hover:from-red-600 hover:to-red-700 active:scale-[0.98]
            transition-all duration-200 shadow-lg shadow-red-500/20
            text-sm cursor-pointer" style={FONT_BODY}>
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      <button onClick={onBack}
        className="auth-text-muted flex items-center gap-1.5 text-sm hover:opacity-70
          transition-colors mb-4 cursor-pointer" style={FONT_BODY}>
        <ArrowLeft className="w-4 h-4" />
        Retour à la connexion
      </button>

      <h3 className="auth-text-heading text-xl font-bold text-center mb-2" style={FONT_DISPLAY}>
        Mot de passe oublié ?
      </h3>
      <p className="auth-text-muted text-sm text-center mb-6 leading-relaxed" style={FONT_BODY}>
        Choisissez comment recevoir votre lien de réinitialisation
      </p>

      {/* ── Method tabs ──────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium
            transition-all cursor-pointer ${
            method === 'email' ? 'auth-tab-active' : 'auth-tab hover:opacity-80'
          }`} style={FONT_BODY}>
          <Mail className="w-4 h-4" />
          Par email
        </button>
        <button
          type="button"
          onClick={() => setMethod('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium
            transition-all cursor-pointer ${
            method === 'whatsapp' ? 'auth-tab-active' : 'auth-tab hover:opacity-80'
          }`} style={FONT_BODY}>
          <MessageCircle className="w-4 h-4" />
          Par WhatsApp
        </button>
      </div>

      {/* ── Form ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {method === 'email' ? (
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>
              Adresse email de votre compte
            </label>
            <div className="relative">
              <Mail className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY}
              />
            </div>
            <p className="auth-text-muted text-xs mt-1.5" style={FONT_BODY}>
              Nous enverrons un lien de réinitialisation à cette adresse.
            </p>
          </div>
        ) : (
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+243 ..."
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY}
              />
            </div>
            <p className="auth-text-muted text-xs mt-1.5" style={FONT_BODY}>
              Nous chercherons votre compte et enverrons le lien à l'email associé.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 mt-2
            bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl
            hover:from-red-600 hover:to-red-700 active:scale-[0.98]
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-red-500/20
            text-sm cursor-pointer" style={FONT_BODY}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              {method === 'email' ? 'Envoyer le lien par email' : 'Recevoir le lien'}
            </>
          )}
        </button>
      </form>

      {/* ── Contact admin fallback ───────────────────────── */}
      {method === 'whatsapp' && (
        <div className="mt-6 pt-6 border-t border-white/10 auth-whatsapp-divider">
          <p className="auth-text-muted text-xs text-center mb-3" style={FONT_BODY}>
            Vous n'avez pas reçu le lien ? Contactez l'administrateur directement.
          </p>
          <button
            type="button"
            onClick={contactAdminWhatsApp}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border
              border-green-500/30 bg-green-500/5
              text-green-400 hover:bg-green-500/10
              transition-all text-sm font-medium cursor-pointer" style={FONT_BODY}>
            <MessageCircle className="w-4 h-4" />
            Contacter l'admin sur WhatsApp
          </button>
        </div>
      )}

      {/* ── Back to login ────────────────────────────────── */}
      <p className="auth-text-muted text-center text-sm mt-6" style={FONT_BODY}>
        Vous vous souvenez de votre mot de passe ?{' '}
        <button onClick={onSwitchToLogin} className="auth-text-link font-medium transition-colors cursor-pointer">
          Se connecter
        </button>
      </p>
    </div>
  );
}