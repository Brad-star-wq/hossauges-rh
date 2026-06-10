import type { Metadata } from "next";
import "./globals.css";
import { fontDisplay, fontBody, fontMono } from "./fonts";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

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
      <body className="flex min-h-full flex-col font-body">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
