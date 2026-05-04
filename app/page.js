"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { categories, navLinks } from "../data/siteData";

const heroImage = "/images/main_pic.jpg";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHeroUi, setShowHeroUi] = useState(true);

  useEffect(() => {
    const onScroll = () => setShowHeroUi(window.scrollY < 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="home-two-state">
      <section
        className="home-hero-screen"
        style={{ "--hero-image": `url(${heroImage})` }}
        aria-label="Golden Horse hero image"
      >
        <header
          className={`home-hero-top-bar ${showHeroUi ? "is-visible" : "is-hidden"}`}
          aria-label="Site header"
        >
          <div className="home-hero-top-bar-inner">
            <Link href="/" className="home-hero-logo" aria-label="The Golden Horse">
              <img src="/images/gh_logo-2x.png" alt="The Golden Horse" />
            </Link>
            <button
              type="button"
              className="home-hero-burger"
              aria-label="Open menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </header>

        {menuOpen && (
          <nav className="home-hero-menu">
            <button
              type="button"
              className="home-hero-menu-close"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <span />
              <span />
            </button>
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </section>

      {!menuOpen && (
        <section className="home-info-screen">
          <div className="home-info-content">
            <div className="home-info-main">
              <div className="free-ai-wrapper">
                <h1 className="free-ai-title">FREE OF AI ART</h1>
              </div>
              <div className="home-info-divider" />

              <nav className="home-inline-menu" aria-label="Artwork categories">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={
                      cat === "Painting"
                        ? "/artworks/painting"
                        : cat === "Photography"
                          ? "/artworks/photography"
                          : cat === "Sculpture"
                            ? "/artworks/sculpture"
                            : cat === "Porcelain"
                              ? "/artworks/porcelain"
                          : cat === "Jewelry Art"
                            ? "/artworks/jewelry"
                              : cat === "Publishing"
                                ? "/artworks/publishing"
                            : "/artworks"
                    }
                  >
                    {cat}
                  </Link>
                ))}
              </nav>
            </div>

            <footer className="home-info-footer">
              <Link href="/privacy">Privacy Policy</Link>
              <button
                type="button"
                className="home-info-footer-button"
                onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
              >
                Manage Cookies
              </button>
              <span>Copyright © 2026 The Golden Horse</span>
              <span>Site by Veronika Belousova</span>
            </footer>
          </div>
        </section>
      )}
    </div>
  );
}
