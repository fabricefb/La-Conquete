import { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone, X } from '../lib/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'lc_pwa_dismissed';

/* L'invite n'apparaît qu'une fois le premier écran dépassé : elle ne peut
   plus recouvrir les CTA du hero. */
const REVEAL_AFTER_VIEWPORT_RATIO = 0.9;

export function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    const reveal = () => {
      if (window.scrollY < window.innerHeight * REVEAL_AFTER_VIEWPORT_RATIO) return;
      setVisible(true);
      window.removeEventListener('scroll', reveal);
    };

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      window.addEventListener('scroll', reveal, { passive: true });
      reveal();
    };

    const handleInstalled = () => {
      setVisible(false);
      deferredPrompt.current = null;
      window.removeEventListener('scroll', reveal);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('scroll', reveal);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      handleDismiss();
    }
    deferredPrompt.current = null;
  }, [handleDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 left-4 z-[75] w-[calc(100%-5.5rem)] max-w-sm animate-fade-up sm:bottom-6 sm:left-8 sm:w-80"
      role="dialog"
      aria-live="polite"
      aria-label="Installer l'application"
    >
      <div className="border border-line bg-bg-card/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line text-evangile-500">
            <Smartphone className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-cream">Installer La Conquête</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Accès direct depuis l'écran d'accueil, sans passer par le navigateur.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer"
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-muted transition-colors hover:text-cream"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="btn-primary flex-1 px-4 py-2.5 text-[11px]"
          >
            Installer
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="border border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-white/25 hover:text-cream"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
