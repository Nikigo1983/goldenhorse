"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Короткий кроссфейд при клиентской навигации Next.js:
 * по pointerdown на внутреннюю ссылку показываем лёгкий слой (flushSync — до смены маршрута),
 * после смены pathname — плавно убираем.
 */
export default function RouteTransitionOverlay() {
  const pathname = usePathname();
  const [phase, setPhase] = useState("idle");
  const prevPathname = useRef(null);
  const pendingCover = useRef(false);

  useLayoutEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname;
      return;
    }
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    if (typeof window !== "undefined") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch {
        window.scrollTo(0, 0);
      }
    }

    if (pendingCover.current) {
      pendingCover.current = false;
      setPhase("uncover");
      const id = window.setTimeout(() => setPhase("idle"), 300);
      return () => window.clearTimeout(id);
    }
  }, [pathname]);

  useEffect(() => {
    const isModifiedClick = (e) =>
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

    const sameDocumentHref = (a) => {
      try {
        const u = new URL(a.href, window.location.href);
        if (u.origin !== window.location.origin) return null;
        return `${u.pathname}${u.search}${u.hash}`;
      } catch {
        return null;
      }
    };

    const onPointerDown = (e) => {
      if (isModifiedClick(e)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = e.target;
      if (!(el instanceof Element)) return;
      const a = el.closest("a[href]");
      if (!a) return;
      if (a.getAttribute("target") === "_blank" || a.getAttribute("download")) return;
      const hrefAttr = a.getAttribute("href");
      if (
        !hrefAttr ||
        hrefAttr.startsWith("#") ||
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:")
      ) {
        return;
      }
      const next = sameDocumentHref(a);
      if (!next) return;
      const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === cur) return;

      pendingCover.current = true;
      flushSync(() => {
        setPhase("cover");
      });
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return (
    <div className={`route-trans-overlay route-trans-overlay--${phase}`} aria-hidden="true" />
  );
}
