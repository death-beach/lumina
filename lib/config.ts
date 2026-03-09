import { z } from "zod";

// Artist schema
const ArtistSchema = z.object({
  name: z.string().min(1),
  bio: z.string().min(1),
  logo: z.string().optional(),
  socials: z.object({
    instagram: z.string().url().optional(),
    spotify: z.string().url().optional(),
    bandcamp: z.string().url().optional(),
  }).optional(),
});

// Album schema
const AlbumSchema = z.object({
  title: z.string().min(1),
  artwork: z.string().min(1),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
});

// Theme schema
const ThemeSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  blurIntensity: z.enum(["low", "medium", "high"]),
  fontDisplay: z.enum(["inter", "playfair", "space-grotesk"]),
});

// Visual schemas
const ReactiveVisualSchema = z.object({
  type: z.literal("reactive"),
  scene: z.enum(["particles", "waveform", "nebula"]),
  colorOverride: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const VideoVisualSchema = z.object({
  type: z.literal("video"),
  src: z.string().min(1),
  loop: z.boolean().optional(),
});

const VisualSchema = z.union([ReactiveVisualSchema, VideoVisualSchema]);

// Lyrics schemas
const TimedLyricsSchema = z.object({
  type: z.literal("timed"),
  src: z.string().min(1),
});

const StaticLyricsSchema = z.object({
  type: z.literal("static"),
  text: z.string().min(1),
});

const LyricsSchema = z.union([TimedLyricsSchema, StaticLyricsSchema]);

// Track schema
const TrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  duration: z.number().positive(),
  src: z.string().min(1),
  artwork: z.string().optional(),
  visual: VisualSchema,
  lyrics: LyricsSchema.optional(),
});

// Store product schema
const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  image: z.string().min(1),
  stripeLink: z.string().url(),
  type: z.enum(["physical", "digital"]),
  badge: z.string().optional(),
});

// Store schema
const StoreSchema = z.object({
  enabled: z.boolean(),
  headline: z.string().min(1),
  subheading: z.string().min(1),
  products: z.array(ProductSchema).min(1),
});

// Features schema
const FeaturesSchema = z.object({
  showLyrics: z.boolean(),
  showStore: z.boolean(),
  showPlaylist: z.boolean(),
  allowShuffle: z.boolean(),
  autoplayNext: z.boolean(),
  showArtistBio: z.boolean(),
});

// Main config schema
export const LuminaConfigSchema = z.object({
  artist: ArtistSchema,
  album: AlbumSchema,
  theme: ThemeSchema,
  tracks: z.array(TrackSchema).min(1),
  store: StoreSchema,
  features: FeaturesSchema,
});

// Type inference
export type LuminaConfig = z.infer<typeof LuminaConfigSchema>;

// Validation function
export function validateConfig(config: unknown): LuminaConfig {
  return LuminaConfigSchema.parse(config);
}

// Default config for development
export const defaultConfig: LuminaConfig = {
  artist: {
    name: "Aurora Veil",
    bio: "Ethereal dream-pop from the Pacific Northwest.",
    logo: "/artwork/logo.svg",
    socials: {
      instagram: "https://instagram.com/auroraveil",
      spotify: "https://open.spotify.com/artist/...",
      bandcamp: "https://auroraveil.bandcamp.com",
    },
  },
  album: {
    title: "Glass Meridian",
    artwork: "/artwork/cover.jpg",
    releaseDate: "2025-03-08",
    description: "A journey through light and frequency. Eight tracks recorded live in an abandoned lighthouse.",
  },
  theme: {
    accentColor: "#a78bfa",
    backgroundColor: "#080810",
    blurIntensity: "medium",
    fontDisplay: "inter",
  },
  tracks: [
    {
      id: "track-01",
      title: "Glass Meridian",
      duration: 237,
      src: "/tracks/01-glass-meridian.mp3",
      artwork: "/artwork/track-01.jpg",
      visual: {
        type: "reactive",
        scene: "particles",
      },
      lyrics: {
        type: "timed",
        src: "/lyrics/01-glass-meridian.vtt",
      },
    },
  ],
  store: {
    enabled: true,
    headline: "Support the art",
    subheading: "Every purchase goes directly to us",
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
    ],
  },
  features: {
    showLyrics: true,
    showStore: true,
    showPlaylist: true,
    allowShuffle: true,
    autoplayNext: true,
    showArtistBio: true,
  },
};