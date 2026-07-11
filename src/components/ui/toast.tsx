'use client';

import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; type: ToastType };

let pushToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;
let nextId = 1;

/** Mostra um toast GX no canto superior direito. No-op se o <ToastHost /> não estiver montado. */
export function showToast(message: string, type: ToastType = 'info') {
  pushToast?.({ message, type });
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200',
  error: 'bg-red-500/10 border-red-500/35 text-red-200',
  info: 'bg-sky-500/10 border-sky-400/35 text-sky-200',
};

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pushToast = ({ message, type }) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[220] flex flex-col items-end gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
          className={`pointer-events-auto cursor-pointer backdrop-blur-md border rounded-xl px-4 py-3 text-sm font-medium shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)] ${TOAST_STYLES[toast.type]}`}
          role="status"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
