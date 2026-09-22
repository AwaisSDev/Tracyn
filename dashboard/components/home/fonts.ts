import { Inter_Tight } from "next/font/google";

// A tight, Geist-like grotesk for the marketing pages (home and 404),
// heavy for the Notion-style headlines. Declared once so both pages share
// the same font files.
export const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-cv-sans",
  weight: ["400", "500", "600", "700"],
});
