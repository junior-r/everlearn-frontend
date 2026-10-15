"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  /** Called when the dialog is dismissed: Escape, a click on the backdrop, or the parent closing it. */
  onClose(): void;
  /** The buttons that answer the dialog, the safest one first. */
  children: ReactNode;
}

/**
 * A modal question over the page, on the browser's own `<dialog>`: it traps
 * focus, closes on Escape and gives focus back to whatever opened it.
 */
export function Dialog({ isOpen, title, description, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (isOpen && !dialog?.open) {
      dialog?.showModal();
    } else if (!isOpen && dialog?.open) {
      dialog.close();
    }
  }, [isOpen]);

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    // The dialog element itself is only hit outside its padded content: on the backdrop
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={closeOnBackdrop}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-foreground shadow-card backdrop:bg-ink/70 open:animate-rise"
    >
      <div className="flex flex-col gap-2 p-6">
        <h2 id={titleId} className="font-display text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">{children}</div>
      </div>
    </dialog>
  );
}
