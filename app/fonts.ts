import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";

// Display — condensed butcher-badge caps (eyebrows, headings).
// Google consolidated "Big Shoulders Display" into the "Big Shoulders" family.
// `Big Shoulders` isn't in next/font's metrics dataset, so its auto-generated
// (CLS-reducing) fallback can't be computed — that's the noisy build/dev warning.
// Opt out of the auto fallback and supply our own condensed system stack instead.
export const fontDisplay = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "sans-serif"],
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
