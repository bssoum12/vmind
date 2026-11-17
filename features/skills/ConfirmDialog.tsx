import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'warn' | 'danger';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (answer: boolean) => void;
}

const TONES = {
  warn: { color: '#F5A524', border: 'rgba(245,165,36,0.35)', fill: 'rgba(245,165,36,0.12)' },
  danger: { color: '#FF4757', border: 'rgba(255,71,87,0.35)', fill: 'rgba(255,71,87,0.12)' },
};

// French puts a space before ? ! : ; » and after «: a non-breaking one keeps the sign on the word's line
const keepFrenchPunctuation = (text: string) => text.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');

/**
 * The app's own confirmation window, in place of the browser's.
 * `confirm` resolves to true on the main button, false on Annuler, Escape or a click outside.
 */
export function useConfirmDialog(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  const answer = useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending]
  );

  useEffect(() => {
    if (!pending) return;
    confirmButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        answer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [pending, answer]);

  if (!pending || typeof window === 'undefined') return [confirm, null];

  const tone = TONES[pending.tone ?? 'warn'];
  const dialog = createPortal(
    // React events cross portals, so clicks here must not reach the window that opened the dialog
    <div
      onClick={(e) => {
        e.stopPropagation();
        answer(false);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(2, 6, 18, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="vmind-confirm-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(160deg, rgba(14, 23, 42, 0.97) 0%, rgba(6, 14, 26, 0.99) 100%)',
          border: `1px solid ${tone.border}`,
          borderRadius: '16px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8)',
          padding: '1.4rem',
          color: '#F0F4F8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.9rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: tone.fill,
              border: `1px solid ${tone.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} color={tone.color} />
          </div>
          <h3 id="vmind-confirm-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {pending.title}
          </h3>
        </div>
        <div style={{ fontSize: '0.86rem', color: '#CBD5E1', lineHeight: 1.55, marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>
          {typeof pending.message === 'string' ? keepFrenchPunctuation(pending.message) : pending.message}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => answer(false)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#F0F4F8',
              fontSize: '0.83rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {pending.cancelLabel ?? 'Annuler'}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => answer(true)}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '10px',
              border: `1px solid ${tone.border}`,
              background: tone.fill,
              color: tone.color,
              fontSize: '0.83rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {pending.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
  return [confirm, dialog];
}
