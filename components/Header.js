"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navLinks } from "../data/siteData";

function headerNavLinkClass(pathname, href) {
  if (href === "/") return pathname === "/" ? "is-active" : "";
  return pathname.startsWith(href) ? "is-active" : "";
}

export default function Header() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const HIDE_AFTER = 20;

    const onScroll = () => {
      if (ticking.current) {
        return;
      }
      ticking.current = true;
      window.requestAnimationFrame(() => {
        setHidden(window.scrollY >= HIDE_AFTER);
        ticking.current = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const barState = hidden && !open ? "is-hidden" : "is-visible";

  return (
    <header className={`site-header ${barState}`}>
      <div className="site-header-inner">
        <Link href="/" className="logo-wrap" onClick={() => setOpen(false)}>
          <img src="/images/gh_logo-2x.png" alt="The Golden Horse" className="logo" />
        </Link>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <nav className="home-hero-menu site-overlay-menu">
          <button
            type="button"
            className="home-hero-menu-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <span />
            <span />
          </button>
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={headerNavLinkClass(pathname, item.href)}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
