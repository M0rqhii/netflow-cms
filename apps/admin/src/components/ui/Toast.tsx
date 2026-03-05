"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type Toast = { id: string; title?: string; message: string; tone?: 'info' | 'success' | 'warning' | 'error' };
type Ctx = { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; remove: (id: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

const toneConfig: Record<string, { bg: string; border: string; icon: string; bar: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
};

const ToastIcon = ({ tone }: { tone: string }) => {
  const cls = "w-4 h-4 flex-shrink-0";
  if (tone === 'success') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
  );
  if (tone === 'error') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
  );
  if (tone === 'warning') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
  );
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const remove = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeRef = useRef(remove);
  removeRef.current = remove;

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, ...t };
    setToasts((prev) => [...prev, toast]);
    const timeoutId = setTimeout(() => removeRef.current(id), 4000);
    timeoutsRef.current.set(id, timeoutId);
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-[72px] z-50 flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]"
        role="region"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const tone = t.tone || 'info';
          const config = toneConfig[tone];
          return (
            <div
              key={t.id}
              className={`rounded-xl border px-4 py-3 shadow-lg animate-slide-in-right relative overflow-hidden ${config.bg} ${config.border}`}
              role="status"
              aria-live={tone === 'error' ? 'assertive' : 'polite'}
            >
              <div className={`absolute bottom-0 left-0 h-0.5 ${config.bar}`} style={{ animation: 'toast-progress 4s linear forwards' }} />
              <div className="flex items-start gap-3">
                <span className={config.icon}>
                  <ToastIcon tone={tone} />
                </span>
                <div className="flex-1 min-w-0">
                  {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
                  <div className="text-sm text-foreground/80">{t.message}</div>
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5 -mr-1"
                  aria-label="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
