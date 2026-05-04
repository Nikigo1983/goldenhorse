"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Header from "./Header";

export default function Chrome({ children }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return children;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
