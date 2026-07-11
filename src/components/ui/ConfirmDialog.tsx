'use client';

import React, { useEffect, useState } from 'react';

export type ConfirmDialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type PendingConfirm = { opts: ConfirmDialogOptions; resolve: (value: boolean) => void };

let subscriber: ((pending: PendingConfirm) => void) | null = null;

/**
 * Abre o modal de confirmação GX e resolve com a escolha do usuário.
 * Se nenhum <ConfirmDialogHost /> estiver montado (ex.: SSR), resolve false.
 */
export function confirmDialog(opts: ConfirmDialogOptions): Promise<boolean> {
  if (!subscriber) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    subscriber?.({ opts, resolve });
  });
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    subscriber = (next) => {
      setPending((current) => {
        // Se já houver um diálogo aberto, o anterior é cancelado.
        current?.resolve(false);
        return next;
      });
    };
    return () => {
      subscriber = null;
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pending.resolve(false);
        setPending(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending]);

  if (!pending) return null;

  const { opts } = pending;
  const close = (value: boolean) => {
    pending.resolve(value);
    setPending(null);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        className="w-full max-w-md bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-3">
          {opts.title || 'Confirmação'}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line mb-6">{opts.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          {opts.danger ? (
            <button
              type="button"
              autoFocus
              onClick={() => close(true)}
              className="border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl px-4 py-2 text-sm font-bold transition-colors active:scale-[0.98]"
            >
              {opts.confirmLabel || 'Excluir'}
            </button>
          ) : (
            <button
              type="button"
              autoFocus
              onClick={() => close(true)}
              className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 text-sm shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
            >
              {opts.confirmLabel || 'Confirmar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
