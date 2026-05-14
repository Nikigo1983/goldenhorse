import { Nunito_Sans } from "next/font/google";
import { Montserrat } from "next/font/google";
import Chrome from "../components/Chrome";
import CookieBanner from "../components/CookieBanner";
import RouteTransitionOverlay from "../components/RouteTransitionOverlay";
import logo3 from "../logo3.jpg";
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  adjustFontFallback: false,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  adjustFontFallback: false,
});

export const metadata = {
  title: "The Golden Horse",
  description: "Dubai Art Gallery",
  icons: {
    icon: logo3.src,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${nunito.className} ${montserrat.variable}`}>
        <Chrome>
          <main className="page-wrap">{children}</main>
        </Chrome>
        <RouteTransitionOverlay />
        <CookieBanner />
      </body>
    </html>
  );
}
