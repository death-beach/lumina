// lumina.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// This is the only file you need to edit to configure your Lumina experience.
// Everything else is handled automatically.
// ─────────────────────────────────────────────────────────────────────────────

import type { LuminaConfig } from "@/lib/config";

const config: LuminaConfig = {
  artist: {
    name: "Aurora Veil",
    bio: "Ethereal dream-pop from the Pacific Northwest.",
    logo: "/artwork/logo.svg",           // optional — shown in top-left
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
      title: "Glass Meridian",
      duration: 237,                     // seconds (for display before load)
      src: "/tracks/01-glass-meridian.mp3",
      artwork: "/artwork/track-01.jpg",  // optional per-track artwork
      visual: {
        type: "reactive",
        scene: "particles",              // "particles" | "waveform" | "nebula"
      },
      lyrics: {
        type: "timed",
        src: "/lyrics/01-glass-meridian.vtt",
      },
    },
    {
      id: "track-02",
      title: "Low Tide Frequency",
      duration: 198,
      src: "/tracks/02-low-tide.mp3",
      visual: {
        type: "video",
        src: "/videos/02-low-tide.mp4",  // MP4 with baked-in audio (replaces audio src)
        loop: true,
      },
      // no lyrics for this track
    },
    {
      id: "track-03",
      title: "Nautical Ghost",
      duration: 285,
      src: "/tracks/03-nautical-ghost.mp3",
      visual: {
        type: "reactive",
        scene: "waveform",
        colorOverride: "#38bdf8",        // overrides accentColor for this track only
      },
      lyrics: {
        type: "static",
        text: "These are static lyrics\nthat display as a single block of text.\nNo timing required.",
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