import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-tabular",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WIREPLAN — Plan your home. We calculate the wiring.",
  description:
    "WIREPLAN by Musotto Labs: Grundriss hochladen, Elektroplanung, Smart Home und Kabelrouting automatisch berechnen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full dark`}
    >
      <body className="min-h-full bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
