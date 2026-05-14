"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "Painting", href: "/artworks/painting" },
  { label: "Photography", href: "/artworks/photography" },
  { label: "Porcelain", href: "/artworks/porcelain" },
  { label: "Art Books", href: "/artworks/publishing" },
  { label: "Jewelry Art", href: "/artworks/jewelry" },
];

function linkClass(pathname, href) {
  if (pathname === href) return "is-active";
  if (pathname.startsWith(`${href}/`)) return "is-active";
  return "";
}

export default function ArtistsInlineNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="artists-inline-menu" aria-label="Artwork categories">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(pathname, item.href)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
