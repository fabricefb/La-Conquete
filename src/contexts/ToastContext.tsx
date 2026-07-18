import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Toast, ToastType } from '../types';

// ─── Context shape ───────────────────────────────────────────────
interface ToastObject {
  type?: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  /** Supports both positional `(message, type?, duration?)` and object `({ type?, message, duration? })` forms */
  addToast: ((message: string, type?: ToastType, duration?: number) => void) & ((obj: ToastObject) => void);
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Style helpers ───────────────────────────────────────────────
const bgColors: Record<ToastType, string> = {
  success: '#16a34a',
  error: '#dc2626',
  info: '#2563eb',
};

const containerStyles: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 420,
  pointerEvents: 'none',
};

const toastBaseStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 18px',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  lineHeight: 1.4,
  fontFamily: 'inherit',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  pointerEvents: 'auto',
  transition: 'opacity 0.3s ease, transform 0.3s ease',
};

const dismissButtonStyles: React.CSSProperties = {
  flexShrink: 0,
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 0,
  marginLeft: 8,
  opacity: 0.8,
};

// ─── Single Toast Item ───────────────────────────────────────────
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

  // Auto-dismiss after duration
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [handleClose, toast.duration]);

  return (
    <div
      style={{
        ...toastBaseStyles,
        backgroundColor: bgColors[toast.type],
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100%)' : 'translateX(0)',
      }}
      role="alert"
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss notification"
        style={dismissButtonStyles}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (first: string | ToastObject, second?: ToastType, third?: number) => {
      let message: string;
      let type: ToastType = 'info';
      let duration: number | undefined;

      if (typeof first === 'object') {
        message = first.message;
        type = first.type ?? 'info';
        duration = first.duration;
      } else {
        message = first;
        type = second ?? 'info';
        duration = third;
      }

      const id = crypto.randomUUID();
      const newToast: Toast = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);
    },
    [],
  ) as ToastContextValue['addToast'];

  const value = useMemo<ToastContextValue>(
    () => ({ addToast, removeToast }),
    [addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={containerStyles}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}