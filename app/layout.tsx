import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import config from "@/lumina.config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${config.artist.name} — ${config.album?.title || ''}`,
    description: config.album?.description || `${config.artist.name}'s visual album experience`,
    openGraph: {
      title: `${config.artist.name} — ${config.album?.title || ''}`,
      description: config.album?.description || `${config.artist.name}'s visual album experience`,
      images: config.album?.artwork ? [{ url: config.album.artwork }] : [],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
