import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PLACEMENT = {
  // centered card: confirmations
  center: {
    wrap: 'items-end justify-center p-4 sm:items-center',
    panel: 'w-full max-w-md rounded-md animate-pop-in',
  },
  // right-hand sheet: forms
  sheet: {
    wrap: 'justify-end',
    panel: 'h-full w-full max-w-xl animate-sheet-in sm:border-l',
  },
  // left-hand drawer: mobile navigation
  drawer: {
    wrap: 'justify-start',
    panel: 'h-full w-[85%] max-w-xs animate-drawer-in border-r',
  },
};

// Accessible modal: role="dialog", aria-modal, Escape to close, focus moved in, trapped, and restored on close.
export default function Dialog({ open, onClose, title, description, children, footer, placement = 'center', id, labelledBy }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;
  const layout = PLACEMENT[placement] || PLACEMENT.center;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex ${layout.wrap}`}>
      <div className="absolute inset-0 animate-fade-in bg-ink/40" onMouseDown={() => onClose?.()} aria-hidden="true" />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative flex flex-col overflow-hidden border-line bg-paper-raised shadow-[0_24px_60px_-20px_rgba(27,26,23,0.35)] focus:outline-none ${layout.panel}`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h2 id={titleId} className="font-display text-[28px] leading-tight text-ink">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 rounded p-2 text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink"
              aria-label="Close"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-line bg-paper px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
