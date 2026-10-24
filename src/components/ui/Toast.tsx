import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

/* ───── Types ───── */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

/* ───── Styling ───── */

const typeClasses: Record<ToastType, string> = {
  success: 'bg-mint-pale border-mint text-forest',
  error: 'bg-rose-light/30 border-rose text-rose',
  info: 'bg-paleblue-light border-paleblue text-teal',
  warning: 'bg-amber-warm border-amber text-amber',
};

const typeIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

/* ───── Context ───── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/* ───── Provider ───── */

let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto-dismiss after 4 seconds
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={`
                pointer-events-auto flex items-start gap-2.5
                border rounded-xl px-4 py-3 shadow-lg
                min-w-[280px] max-w-sm text-sm font-medium
                ${typeClasses[t.type]}
              `}
            >
              <span className="shrink-0 mt-0.5">{typeIcons[t.type]}</span>
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-0.5 rounded-md hover:bg-black/10 transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';
