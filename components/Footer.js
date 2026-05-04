"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <Link href="/privacy">Privacy Policy</Link>
      <span>|</span>
      <button
        type="button"
        className="site-footer-action"
        onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
      >
        Manage Cookies
      </button>
      <span>|</span>
      <span>Copyright © 2026 The Golden Horse</span>
      <span>|</span>
      <span>Site by Veronika Belousova</span>
      <span>|</span>
    </footer>
  );
}
