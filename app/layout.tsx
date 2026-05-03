import type { Metadata, Viewport } from "next";
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
    // PWA-style meta for iOS "Add to Home Screen" full-screen experience
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
    },
  };
}

// Proper viewport settings so iOS Safari scales correctly and doesn't
// shrink content when the address bar shows/hides.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Prevents iOS from zooming on input focus
  maximumScale: 1,
  // interactive-widget=resizes-content tells Android Chrome to resize the
  // viewport rather than overlapping it with the virtual keyboard.
  interactiveWidget: "resizes-content",
};

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
