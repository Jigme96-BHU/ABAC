"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

/** Next.js holds the outgoing page on screen, frozen, with no feedback at
 *  all, until the target page's data is ready — then swaps straight to it.
 *  This bar gives the click itself immediate feedback, so the wait reads as
 *  "loading" instead of "did that even register?"
 *
 *  State lives at module scope, not in the component, and the click
 *  listener is attached once for the page's lifetime rather than per
 *  mount: React remounts this component around navigations (it's rendered
 *  alongside the route-dependent Suspense tree), which would otherwise
 *  wipe out a pending timer before its 150ms delay elapsed. */
const SHOW_DELAY_MS = 150; // skip the bar entirely for fast navigations
const FINISH_MS = 200;
const SAFETY_TIMEOUT_MS = 8000; // force-clear if a navigation never resolves

type Phase = "idle" | "loading" | "done";

let phase: Phase = "idle";
let showTimer: ReturnType<typeof setTimeout> | undefined;
let safetyTimer: ReturnType<typeof setTimeout> | undefined;
let doneTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function clearAllTimers() {
  if (showTimer) clearTimeout(showTimer);
  if (safetyTimer) clearTimeout(safetyTimer);
  if (doneTimer) clearTimeout(doneTimer);
}

function setPhase(next: Phase) {
  phase = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return phase;
}

function getServerSnapshot(): Phase {
  return "idle";
}

function markRouteCommitted() {
  clearAllTimers();
  if (phase === "idle") return;
  setPhase("done");
  doneTimer = setTimeout(() => setPhase("idle"), FINISH_MS);
}

declare global {
  interface Window {
    __routeProgressInit?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__routeProgressInit) {
  window.__routeProgressInit = true;
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // Only same-origin route changes go through the router — everything
      // else (external links, mailto:, tel:) genuinely leaves the page, so
      // a loading bar for it would be misleading.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearAllTimers();
      showTimer = setTimeout(() => setPhase("loading"), SHOW_DELAY_MS);
      safetyTimer = setTimeout(() => setPhase("idle"), SAFETY_TIMEOUT_MS);
    },
    true,
  );
}

export default function RouteProgress() {
  const pathname = usePathname();
  const currentPhase = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    markRouteCommitted();
  }, [pathname]);

  return <div className={`route-progress route-progress-${currentPhase}`} aria-hidden="true" />;
}
