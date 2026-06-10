import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";

// Display — condensed butcher-badge caps (eyebrows, headings).
// Google consolidated "Big Shoulders Display" into the "Big Shoulders" family.
export const fontDisplay = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Body — sturdy workshop grotesque
export const fontBody = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// Utility — the "meat label" voice (prices, dates, pack counts)
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono",
  display: "swap",
});
