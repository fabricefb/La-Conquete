/* ═══════════════════════════════════════════════════════════════════
   Auth Modal — Sign In / Sign Up overlay
   Accessible via #connexion or from any "Se connecter" button
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { X } from '../../lib/icons';
import { SignupForm } from './SignupForm';
import { SignInForm } from './SignInForm';

/* ─── Props ─────────────────────────────────────────────────── */
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */
export function AuthModal({ isOpen, onClose, initialView = 'login' }: AuthModalProps) {
  const [view, setView] = useState<'login' | 'signup' | 'success'>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuccess = () => {
    setView('success');
    setTimeout(() => {
      onClose();
      setView(initialView);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-ink/95 border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 mb-3">
            <span className="text-gold font-bold text-lg">LC</span>
          </div>
          <h2 className="text-2xl font-bold text-cream">
            La Conquête
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Église Évangélique La Conquête
          </p>
        </div>

        {/* Content */}
        {view === 'success' ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-cream mb-2">Bienvenue !</h3>
            <p className="text-white/50">Vous allez être redirigé...</p>
          </div>
        ) : view === 'signup' ? (
          <SignupForm onComplete={handleSuccess} onSwitchToLogin={() => setView('login')} />
        ) : (
          <SignInForm onComplete={handleSuccess} onSwitchToSignup={() => setView('signup')} />
        )}
      </div>
    </div>
  );
}