import type { Metadata } from "next";
import { Cormorant_Garamond, Cutive_Mono } from "next/font/google";
import "./globals.css";

// Editorial display serif — light weight / uppercase / tracking set in globals.css.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
  display: "swap",
});

// Typewriter monospace — used for body copy, eyebrows, UI labels, and buttons.
// Cutive Mono ships a single 400 weight (no bold).
const mono = Cutive_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "World Seek",
  description: "Hide somewhere in the world. Let your friends find you on Street View.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
