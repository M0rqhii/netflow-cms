"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type Toast = { id: string; title?: string; message: string; tone?: 'info' | 'success' | 'warning' | 'error' };
type Ctx = { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; remove: (id: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const remove = useCallback((id: string) => {
    // Clear timeout if exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, ...t };
    setToasts((prev) => [...prev, toast]);
    
    // Set timeout and store reference for cleanup
    const timeoutId = setTimeout(() => remove(id), 3500);
    timeoutsRef.current.set(id, timeoutId);
  }, [remove]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-16 z-50 space-y-2" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          let border = 'border-gray-200';
          // Border color will be handled by CSS dark mode rules
          let toneColor = 'currentColor';
          if (t.tone === 'success') toneColor = 'var(--color-accent)';
          else if (t.tone === 'error') toneColor = '#ef4444';
          else if (t.tone === 'warning') toneColor = '#f59e0b';
          else toneColor = 'var(--color-primary)';
          return (
            <div key={t.id} className={`rounded-lg border px-4 py-3 shadow-md bg-card`} style={{ borderColor: 'rgba(0,0,0,0.08)' }} role="status">
              <div className="flex items-start gap-2">
                <span aria-hidden style={{ color: toneColor }}>
                  {t.tone === 'success' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
                  )}
                  {t.tone === 'error' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                  )}
                  {t.tone === 'warning' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  )}
                  {(!t.tone || t.tone === 'info') && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  )}
                </span>
                <div>
                  {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
                  <div className="text-sm">{t.message}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
