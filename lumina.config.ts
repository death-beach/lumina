// lumina.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// This is the only file you need to edit to configure your Lumina experience.
// Everything else is handled automatically.
// ─────────────────────────────────────────────────────────────────────────────

import type { LuminaConfig } from "@/lib/config";

const config: LuminaConfig = {
  artist: {
    name: "Death Beach", // enter artist name here
    bio: "Ethereal dream-pop from the Pacific Northwest.",
    logo: "/artwork/logo.png",           // optional — shown in top-left
    socials: {
      instagram: "https://instagram.com/auroraveil",
      spotify: "https://open.spotify.com/artist/...",
      bandcamp: "https://auroraveil.bandcamp.com",
    },
  },

  album: {
    title: "Glass Meridian",
    artwork: "/artwork/cover.jpg",       // 1:1 ratio, min 800×800px
    releaseDate: "2025-03-08",
    description:
      "A journey through light and frequency. Eight tracks recorded live in an abandoned lighthouse.",
  },

  theme: {
    accentColor: "#a78bfa",              // violet — drives highlights, controls, buttons
    backgroundColor: "#080810",          // near-black — fallback when no visual
    blurIntensity: "medium",             // "low" | "medium" | "high" — glass panel blur
    fontDisplay: "inter",                // "inter" | "playfair" | "space-grotesk"
  },

  tracks: [
    {
      id: "track-01",
      title: "Drunk On The Mike",
      duration: 180,                     // seconds (update with actual duration)
      src: "/tracks/track1.mp3",
      artwork: "/artwork/track1.jpg",    // optional
      visual: {
        type: "reactive",
        scene: "particles",
      },
    },
    {
      id: "track-02",
      title: "Your Second Track",
      duration: 200,                     // seconds (update with actual duration)
      src: "/tracks/track2.mp3",
      artwork: "/artwork/track2.jpg",    // optional
      visual: {
        type: "reactive",
        scene: "waveform",
      },
    },
  ],

  store: {
    enabled: true,
    headline: "Take a piece home.",
    subheading: "Every purchase supports independent music directly.",
    products: [
      {
        id: "vinyl",
        name: "Glass Meridian — Deluxe Vinyl",
        description: "180g pressing. Full-color gatefold sleeve. Limited to 300 copies.",
        price: "$38",
        image: "/artwork/vinyl.jpg",
        stripeLink: "https://buy.stripe.com/test_xxxxxxxxxxxx",
        type: "physical",
        badge: "Limited Edition",
      },
      {
        id: "digital-flac",
        name: "Lossless Album Download",
        description: "All 8 tracks in FLAC + WAV. Instant delivery via email.",
        price: "$12",
        image: "/artwork/cover.jpg",
        stripeLink: "https://buy.stripe.com/test_yyyyyyyyyyyy",
        type: "digital",
      },
    ],
  },

  features: {
    showLyrics: true,
    showStore: true,
    showPlaylist: true,
    allowShuffle: true,
    autoplayNext: true,
    showArtistBio: true,              // shows bio in a collapsible info panel
  },
};

export default config;