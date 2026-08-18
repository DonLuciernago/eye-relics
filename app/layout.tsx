import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eye Relics",
  description: "A personal visual archive by Pablo Monti.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>{children}</Suspense>
        <footer className="fixed bottom-2 right-3 z-20 pointer-events-none text-[9px] tracking-[0.08em] text-black/25">
          Designed by Pablo Monti
        </footer>
      </body>
    </html>
  );
}
