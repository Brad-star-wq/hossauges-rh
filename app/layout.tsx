import type { Metadata } from "next";
import "./globals.css";
import { fontDisplay, fontBody, fontMono } from "./fonts";

export const metadata: Metadata = {
  title: {
    template: "%s — Hossauges",
    default: "Hossauges — Small-batch sausage, Columbia SC",
  },
  description:
    "Small-batch custom sausage from Columbia, SC. New flavors drop weekly — reserve your packs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full`}
    >
      <body className="min-h-full font-body">{children}</body>
    </html>
  );
}
