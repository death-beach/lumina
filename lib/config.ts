import { z } from "zod";

// ── Artist ────────────────────────────────────────────────────────────────────
const ArtistSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
  logo: z.string().optional(),
  socials: z
    .object({
      instagram: z.string().optional(),
      spotify: z.string().optional(),
      bandcamp: z.string().optional(),
    })
    .optional(),
});

// ── Album (entirely optional) ─────────────────────────────────────────────────
const AlbumSchema = z
  .object({
    title: z.string().min(1),
    artwork: z.string().optional(),
    releaseDate: z.string().optional(),
    description: z.string().optional(),
  })
  .nullable()
  .optional();

// ── Theme ─────────────────────────────────────────────────────────────────────
const ThemeSchema = z
  .object({
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    blurIntensity: z.enum(["low", "medium", "high"]).optional(),
    fontDisplay: z.enum(["inter", "playfair", "space-grotesk"]).optional(),
  })
  .optional();

// ── Visuals ───────────────────────────────────────────────────────────────────
const ReactiveVisualSchema = z.object({
  type: z.literal("reactive"),
  scene: z.enum(["particles", "tesseract", "pillar", "sloworbit", "animal", "flower", "mandala", "auroraplanet"]).optional(),
  colorOverride: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const VideoVisualSchema = z.object({
  type: z.literal("video"),
  src: z.string().min(1),
  loop: z.boolean().optional(),
});

const VisualSchema = z.union([ReactiveVisualSchema, VideoVisualSchema]);

// ── Lyrics ────────────────────────────────────────────────────────────────────
const LyricsSchema = z
  .union([
    z.object({ type: z.literal("timed"), src: z.string().min(1) }),
    z.object({ type: z.literal("static"), text: z.string().min(1) }),
  ])
  .optional();

// ── Track ─────────────────────────────────────────────────────────────────────
const TrackSchema = z.discriminatedUnion("visual.type", [
  // Audio track (reactive visual)
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    src: z.string().min(1), // required for audio tracks
    duration: z.number().optional(),
    artwork: z.string().optional(),
    visual: ReactiveVisualSchema,
    lyrics: LyricsSchema,
  }),
  // Video track (video visual)
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    src: z.string().optional(), // optional for video tracks (src lives in visual.src)
    duration: z.number().optional(),
    artwork: z.string().optional(),
    visual: VideoVisualSchema,
    lyrics: LyricsSchema,
  }),
]);

// ── Store (entirely optional) ─────────────────────────────────────────────────
const StoreSchema = z
  .object({
    enabled: z.boolean().optional(),
    headline: z.string().optional(),
    subheading: z.string().optional(),
    products: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.string().min(1),
          image: z.string().optional(),
          stripeLink: z.string().optional(),
          type: z.enum(["physical", "digital"]).optional(),
          badge: z.string().optional(),
        })
      )
      .optional(),
  })
  .optional();

// ── Features (all optional, default false) ────────────────────────────────────
const FeaturesSchema = z
  .object({
    showLyrics: z.boolean().optional(),
    showStore: z.boolean().optional(),
    showPlaylist: z.boolean().optional(),
    allowShuffle: z.boolean().optional(),
    autoplayNext: z.boolean().optional(),
    showArtistBio: z.boolean().optional(),
  })
  .optional();

// ── Main config ───────────────────────────────────────────────────────────────
export const LuminaConfigSchema = z.object({
  artist: ArtistSchema,
  album: AlbumSchema,
  theme: ThemeSchema,
  tracks: z.array(TrackSchema).min(1),
  store: StoreSchema,
  storeUrl: z.string().url().optional(),
  features: FeaturesSchema,
});

// Type inference
export type LuminaConfig = z.infer<typeof LuminaConfigSchema>;

// Validation function
export function validateConfig(config: unknown): LuminaConfig {
  return LuminaConfigSchema.parse(config);
}

// Default config (used as fallback / dev reference)
export const defaultConfig: LuminaConfig = {
  artist: {
    name: "Aurora Veil",
  },
  album: {
    title: "Glass Meridian",
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
      title: "Your First Track",
      src: "/tracks/track1.mp3",
      visual: {
        type: "reactive",
        scene: "particles",
      },
    },
  ],
  features: {
    showPlaylist: true,
    autoplayNext: true,
  },
};
