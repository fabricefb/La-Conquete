/* ═══════════════════════════════════════════════════════════════════
   Auth Modal — Sign In / Sign Up / Forgot Password overlay
   Accessible via #connexion or from any "Se connecter" button
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { X } from '../../lib/icons';
import { SignupForm } from './SignupForm';
import { SignInForm } from './SignInForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

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
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'success'>(initialView);

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
      {/* Backdrop — softer, less aggressive */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal — SOLID background for readability, theme-aware via CSS */}
      <div className="auth-modal relative w-full max-w-lg max-h-[90vh] overflow-y-auto border rounded-2xl p-8 shadow-2xl">

        {/* Close button */}
        <button
          onClick={onClose}
          className="auth-close absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-3">
            <span className="text-red-500 font-bold text-xl tracking-tight">LC</span>
          </div>
          <h2 className="text-2xl font-bold auth-text-heading" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            La Conquête
          </h2>
          <p className="auth-text-muted text-sm mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Église Évangélique La Conquête
          </p>
        </div>

        {/* Content */}
        {view === 'success' ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold auth-text-heading mb-2">Bienvenue !</h3>
            <p className="auth-text-muted">Vous allez être redirigé...</p>
          </div>
        ) : view === 'forgot' ? (
          <ForgotPasswordForm
            onBack={() => setView('login')}
            onSwitchToLogin={() => setView('login')}
          />
        ) : view === 'signup' ? (
          <SignupForm onComplete={handleSuccess} onSwitchToLogin={() => setView('login')} />
        ) : (
          <SignInForm
            onComplete={handleSuccess}
            onSwitchToSignup={() => setView('signup')}
            onForgotPassword={() => setView('forgot')}
          />
        )}
      </div>
    </div>
  );
}