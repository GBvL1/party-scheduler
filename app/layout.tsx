import type { Metadata } from "next";
import { Stardos_Stencil } from "next/font/google";
import "./globals.css";

const stardosStencil = Stardos_Stencil({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RSA INITIERING",
  description: "RSA SER ALLT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={stardosStencil.variable}>
      <body className="min-h-screen bg-black text-white antialiased">
        <div className="scanlines" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />

        <div className="scanline-sweep" aria-hidden="true" />
        <div className="static-flash" aria-hidden="true" />

        {/* Fixed crosshair HUD — center of viewport */}
        <div
          className="crosshair-hud"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 9997,
          }}
          aria-hidden="true"
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="8" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/>
            <line x1="0"  y1="22" x2="12" y2="22" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/>
            <line x1="32" y1="22" x2="44" y2="22" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/>
            <line x1="22" y1="0"  x2="22" y2="12" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/>
            <line x1="22" y1="32" x2="22" y2="44" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8"/>
            <circle cx="22" cy="22" r="1" fill="rgba(255,255,255,0.35)"/>
          </svg>
        </div>

        {children}
      </body>
    </html>
  );
}
