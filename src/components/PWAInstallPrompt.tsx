import { useEffect, useState, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'lc_pwa_dismissed';

export function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  /* ── Capture the deferred prompt ── */
  useEffect(() => {
    // Already dismissed?
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      // Small delay so the page settles before showing the banner
      setTimeout(() => {
        setAnimating(true);
        setVisible(true);
      }, 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Auto-hide on successful install
    const installedHandler = () => {
      setVisible(false);
      deferredPrompt.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  /* ── Dismiss ── */
  const handleDismiss = useCallback(() => {
    setAnimating(false);
    setTimeout(() => setVisible(false), 300); // match animation duration
    localStorage.setItem(STORAGE_KEY, '1');
  }, []);

  /* ── Trigger install ── */
  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      // `appinstalled` event will hide the banner
    } else {
      // User declined — still dismiss the banner so we don't re-prompt
      handleDismiss();
    }
    deferredPrompt.current = null;
  }, [handleDismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300 ${
        animating
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0'
      }`}
      aria-live="polite"
      role="dialog"
      aria-label="Installer l'application"
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-bg/95 backdrop-blur-xl border-t border-line/30 sm:border sm:border-line/30 shadow-2xl shadow-black/40 p-4 sm:p-5"
      >
        <div className="flex items-center gap-4">
          {/* Phone icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-accent-500/10 text-accent-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p className="text-cream font-semibold text-sm sm:text-base leading-snug">
              Installer l&apos;application
            </p>
            <p className="text-text-secondary text-xs sm:text-sm mt-0.5 leading-relaxed">
              Accès rapide depuis votre écran d&apos;accueil
            </p>
          </div>

          {/* Install button */}
          <button
            onClick={handleInstall}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 active:scale-95 text-white font-semibold text-sm transition-all duration-200 cursor-pointer"
          >
            Installer
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-cream hover:bg-white/5 transition-colors duration-200 cursor-pointer"
            aria-label="Fermer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}