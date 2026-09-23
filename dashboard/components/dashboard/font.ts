import { Inter } from "next/font/google";

// SF Pro can't be bundled for the web (Apple's license limits it to Apple
// platforms), so the dashboard's stack asks for the system SF Pro first and
// falls back to Inter, which is drawn very close to it.
export const cdSans = Inter({ subsets: ["latin"], variable: "--font-cd-sans", display: "swap" });
