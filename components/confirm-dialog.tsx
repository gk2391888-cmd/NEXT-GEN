'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive actions (red confirm button). */
  tone?: 'primary' | 'danger';
  /** Make the student type this word before the confirm button works. */
  requireText?: string;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * The app's own confirm dialog, in place of window.confirm/prompt, so it looks
 * like the rest of NEXT GEN on every device. Render `dialog` once and await `confirm()`.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending ? <ConfirmDialog {...pending} onClose={close} /> : null;
  return { confirm, dialog };
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', requireText, onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const [typed, setTyped] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase();

  useEffect(() => {
    (inputRef.current ?? cancelRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <form
        className="card modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? 'confirm-message' : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onClose(true);
        }}
      >
        <h3 id="confirm-title">{title}</h3>
        {message && <p id="confirm-message" className="mt-sm">{message}</p>}
        {requireText && (
          <div className="field mt-lg mb-0">
            <label className="field-label" htmlFor="confirm-text">Type {requireText} to confirm</label>
            <input id="confirm-text" ref={inputRef} className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
        )}
        <div className="btn-group justify-end mt-xl">
          <button type="button" ref={cancelRef} className="btn btn-secondary" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button className={`btn ${tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`} disabled={!ready}>{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
