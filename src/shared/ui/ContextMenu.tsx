"use client";

import type { Icon } from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/shared/lib/cn";

export interface MenuAction {
  id: string;
  label: string;
  icon: Icon;
  /** Marks an action that removes or ends something. */
  isDanger?: boolean;
  /** Marks the option in use, in a menu that chooses one of several. */
  isCurrent?: boolean;
  onSelect(): void;
}

/** Where a menu opens, in viewport coordinates. `id` changes on every opening. */
export interface MenuAnchor {
  id: number;
  x: number;
  y: number;
  /** The menu ends at `y` instead of starting there: for a button at the bottom of the screen. */
  isAbove: boolean;
}

const EDGE_GAP = 8;

/**
 * State of one context menu. `openAtPointer` goes on `onContextMenu` (right
 * click, long press, the keyboard's menu key); `openBelow` and `openAbove` on a button's `onClick`.
 */
export function useContextMenu() {
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const openings = useRef(0);

  const openAt = useCallback((x: number, y: number, isAbove = false) => {
    openings.current += 1;
    setAnchor({ id: openings.current, x, y, isAbove });
  }, []);
  const openAtPointer = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      const box = event.currentTarget.getBoundingClientRect();
      // Opened from the keyboard there is no pointer: the menu goes over the element instead
      const hasPointer = event.clientX !== 0 || event.clientY !== 0;
      openAt(hasPointer ? event.clientX : box.left + EDGE_GAP, hasPointer ? event.clientY : box.top + EDGE_GAP);
    },
    [openAt],
  );
  const openBelow = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      openAt(box.left, box.bottom + EDGE_GAP / 2);
    },
    [openAt],
  );
  const openAbove = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      openAt(box.left, box.top - EDGE_GAP, true);
    },
    [openAt],
  );
  const close = useCallback(() => setAnchor(null), []);

  return { anchor, openAtPointer, openBelow, openAbove, close };
}

interface ContextMenuProps {
  /** What the menu acts on, for assistive technology. */
  label: string;
  actions: MenuAction[];
  anchor: MenuAnchor | null;
  onClose(): void;
}

/** The actions available on one thing, opened next to it. Renders nothing while closed or empty. */
export function ContextMenu({ label, actions, anchor, onClose }: ContextMenuProps) {
  if (!anchor || actions.length === 0) {
    return null;
  }
  // Keyed by the opening, so reopening elsewhere never reuses a popover the browser is closing
  return <OpenMenu key={anchor.id} label={label} actions={actions} anchor={anchor} onClose={onClose} />;
}

function OpenMenu({ label, actions, anchor, onClose }: ContextMenuProps & { anchor: MenuAnchor }) {
  const ref = useRef<HTMLDivElement>(null);

  // The browser's popover gives the top layer, Escape, closing on an outside click and focus return
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) {
      return;
    }
    menu.showPopover();
    const { width, height } = menu.getBoundingClientRect();
    const left = Math.max(EDGE_GAP, Math.min(anchor.x, window.innerWidth - width - EDGE_GAP));
    const wanted = anchor.isAbove ? anchor.y - height : anchor.y;
    const top = Math.max(EDGE_GAP, Math.min(wanted, window.innerHeight - height - EDGE_GAP));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [anchor]);

  useEffect(() => {
    const menu = ref.current;
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === "closed") {
        onClose();
      }
    };
    menu?.addEventListener("toggle", onToggle);
    return () => menu?.removeEventListener("toggle", onToggle);
  }, [onClose]);

  function hide() {
    if (ref.current?.matches(":popover-open")) {
      ref.current.hidePopover();
    }
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const targets: Record<string, number> = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    if (event.key in targets) {
      event.preventDefault();
      items[targets[event.key]]?.focus();
    } else if (event.key === "Tab") {
      hide();
    }
  }

  return (
    <div
      ref={ref}
      popover="auto"
      role="menu"
      aria-label={label}
      onKeyDown={moveFocus}
      style={{ left: anchor.x, top: anchor.y }}
      className="fixed inset-auto m-0 min-w-52 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5 text-foreground shadow-card open:flex"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          role="menuitem"
          aria-current={action.isCurrent || undefined}
          tabIndex={-1}
          onClick={() => {
            // Closed first, so focus returns to the page before the action moves it elsewhere
            hide();
            action.onSelect();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium outline-none transition-colors duration-100",
            action.isDanger
              ? "text-danger hover:bg-danger-surface focus-visible:bg-danger-surface"
              : "hover:bg-surface-muted focus-visible:bg-brand-soft",
            action.isCurrent && "text-brand",
          )}
        >
          <action.icon aria-hidden weight="bold" className="size-4 shrink-0" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
