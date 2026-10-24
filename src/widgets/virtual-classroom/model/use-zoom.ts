"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { isZoomed, NO_ZOOM, panZoom, stepZoom, zoomTo, type Point, type Size, type Zoom } from "../lib/zoom";

// How much one notch of Ctrl + wheel (or a trackpad pinch) zooms
const WHEEL_SENSITIVITY = 0.01;

function geometry(element: HTMLElement): { size: Size; center: Point } {
  const box = element.getBoundingClientRect();
  return {
    size: { width: box.width, height: box.height },
    center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
  };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// The tile's own buttons keep their clicks; only the video itself is dragged or pinched
const isOnControl = (event: { target: EventTarget }) =>
  event.target instanceof Element && event.target.closest("button, [role=menu]") !== null;

/**
 * The viewer's zoom on one tile: buttons, Ctrl + wheel or a trackpad pinch,
 * a two-finger pinch, a double click, and dragging once zoomed in. It goes
 * back to 100% whenever the tile stops allowing it. `area` is the tile it zooms in.
 */
export function useZoom<Area extends HTMLElement>(area: RefObject<Area | null>, isEnabled: boolean) {
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const [wasEnabled, setWasEnabled] = useState(isEnabled);
  if (wasEnabled !== isEnabled) {
    setWasEnabled(isEnabled);
    setZoom(NO_ZOOM);
  }

  // Native and not passive, so Ctrl + wheel zooms the video instead of the whole page
  useEffect(() => {
    const element = area.current;
    if (!element || !isEnabled) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const { size, center } = geometry(element);
      const focus = { x: event.clientX - center.x, y: event.clientY - center.y };
      setZoom((current) => zoomTo(current, current.scale * Math.exp(-event.deltaY * WHEEL_SENSITIVITY), size, focus));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [area, isEnabled]);

  function onPointerDown(event: ReactPointerEvent<Area>) {
    if (!isEnabled || (event.pointerType === "mouse" && event.button !== 0) || isOnControl(event)) {
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: distance(a, b), scale: zoom.scale };
    }
  }

  function onPointerMove(event: ReactPointerEvent<Area>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) {
      return;
    }
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    const { size, center } = geometry(event.currentTarget);
    const start = pinch.current;
    if (start && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const focus = { x: (a.x + b.x) / 2 - center.x, y: (a.y + b.y) / 2 - center.y };
      setZoom((current) => zoomTo(current, (start.scale * distance(a, b)) / Math.max(start.distance, 1), size, focus));
    } else if (pointers.current.size === 1) {
      setZoom((current) => (isZoomed(current) ? panZoom(current, point.x - previous.x, point.y - previous.y, size) : current));
    }
  }

  function onPointerEnd(event: ReactPointerEvent<Area>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    }
  }

  function onDoubleClick(event: ReactMouseEvent<Area>) {
    if (!isEnabled || isOnControl(event)) {
      return;
    }
    const { size, center } = geometry(event.currentTarget);
    const focus = { x: event.clientX - center.x, y: event.clientY - center.y };
    setZoom((current) => (isZoomed(current) ? NO_ZOOM : zoomTo(current, 2, size, focus)));
  }

  const step = (direction: 1 | -1) => {
    const element = area.current;
    if (element) {
      setZoom((current) => stepZoom(current, direction, geometry(element).size));
    }
  };

  const zoomed = isEnabled && isZoomed(zoom);
  // Zoomed in, one finger moves the video; at 100% it scrolls the page as usual, and two fingers always pinch
  const style: CSSProperties = { touchAction: zoomed ? "none" : "pan-x pan-y" };
  return {
    zoom: isEnabled ? zoom : NO_ZOOM,
    isZoomed: zoomed,
    style,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onDoubleClick,
    },
    zoomIn: () => step(1),
    zoomOut: () => step(-1),
    reset: () => setZoom(NO_ZOOM),
  };
}
