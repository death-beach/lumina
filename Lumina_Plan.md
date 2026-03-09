# ✦ LUMINA

### _A Visual Album Player for Independent Artists_

> Lumina is a standalone, one-deploy digital experience that turns a musician's album into a cinematic, interactive journey — combining buttery-smooth audio playback, per-track reactive 3D visuals or baked music videos, timed lyrics, and an integrated merch store. It's not a streaming app. It's a _world_. Artists sell access to their world. You sell the ability to build that world for them.

---

## 1. Product Vision & Name

**Name: Lumina** ✓ — Keep it. It evokes light, luminescence, emotional radiance, and visuals. It's short, memorable, domain-friendly, and doesn't belong to any existing major service.

**Tagline:** _"Your music. A world of its own."_

**What it is:** A deployable Next.js web app that an independent artist or band customizes via a single config file, deploys to their own Vercel + custom domain in minutes, and uses as their premium album experience — replacing the typical link-in-bio with something breathtaking.

---

## 2. Tech Stack

| Layer           | Choice                                                          | Why                                                             |
| --------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Framework       | **Next.js 15** (App Router)                                     | RSC, streaming, image optimization, zero-config Vercel deploy   |
| Language        | **TypeScript** (strict)                                         | Type-safe config, zero ambiguity for contributors               |
| Styling         | **Tailwind CSS v4** + **CSS custom properties**                 | Utility-first, theme-aware, tiny bundle                         |
| Animation       | **Framer Motion 11**                                            | Industry-standard smooth transitions and gesture support        |
| 3D / Visualizer | **Three.js** + **@react-three/fiber** + **@react-three/drei**   | Best-in-class WebGL abstraction, declarative React-friendly API |
| Audio Engine    | **Howler.js** (wrapped in a custom hook)                        | Reliable cross-browser playback, sprites, seek, volume          |
| Audio Analysis  | **Web Audio API** (native, no library)                          | Real-time FFT analysis to drive visualizer — no extra bundle    |
| Store           | **Stripe Payment Links** (static URLs in config)                | No backend, no keys, zero security risk                         |
| State           | **Zustand**                                                     | Minimal, fast, no boilerplate — replaces Context + useReducer   |
| Fonts           | **Variable fonts via next/font** (e.g., Inter + custom display) | Zero layout shift, optimal loading                              |
| Video           | **HTML5 `<video>` element** (native, no library)                | MP4 playback is native — no overhead                            |
| Deployment      | **Vercel**                                                      | One-click, CDN, automatic SSL, domain routing                   |
| Linting         | **ESLint + Prettier**                                           | Consistency                                                     |

**No Prisma, no database, no auth, no backend. 100% static + client-side.**

---

## 3. High-Level Architecture

### Folder Structure

```
lumina/
├── app/
│   ├── layout.tsx               ← Root layout (SEO meta, fonts, global CSS)
│   ├── page.tsx                 ← Main experience entry (RSC shell)
│   ├── opengraph-image.tsx      ← Dynamic OG image for social sharing
│   └── setup/
│       └── page.tsx             ← Optional /setup config helper UI
│
├── components/
│   ├── player/
│   │   ├── PlayerShell.tsx      ← Full-screen wrapper, orchestrates all layers
│   │   ├── AudioEngine.tsx      ← Howler.js hook consumer, exposes controls
│   │   ├── VideoEngine.tsx      ← HTML5 video controller for MP4 tracks
│   │   ├── PlaylistRail.tsx     ← Side/bottom track list with thumbnails
│   │   ├── Controls.tsx         ← Play/pause/seek/volume/next/prev
│   │   ├── TrackInfo.tsx        ← Artist, track name, album, animated in
│   │   └── LyricsPanel.tsx      ← Timed (WebVTT) or static lyrics overlay
│   │
│   ├── visualizer/
│   │   ├── VisualizerManager.tsx ← Picks 3D vs. Video based on track config
│   │   ├── ReactiveCanvas.tsx    ← Three.js + Web Audio API particle scene
│   │   ├── VideoBackground.tsx   ← Full-screen looping MP4 layer
│   │   └── scenes/
│   │       ├── ParticleField.tsx ← Default reactive particle scene
│   │       ├── WaveformRing.tsx  ← Alternate waveform-based 3D scene
│   │       └── NebulaDrift.tsx   ← Ambient slow-motion particle nebula
│   │
│   ├── store/
│   │   ├── StoreDrawer.tsx      ← Slide-in merch/digital store panel
│   │   ├── ProductCard.tsx      ← Individual product with Stripe link CTA
│   │   └── StoreButton.tsx      ← Floating trigger button
│   │
│   ├── ui/
│   │   ├── GlassPanel.tsx       ← Reusable frosted-glass card
│   │   ├── IconButton.tsx       ← Accessible icon wrapper
│   │   ├── ProgressBar.tsx      ← Smooth seek bar with buffering indicator
│   │   └── Transition.tsx       ← Shared page/track fade transition wrapper
│   │
│   └── setup/
│       └── ConfigWizard.tsx     ← Multi-step form that generates lumina.config.ts
│
├── hooks/
│   ├── useAudio.ts              ← Howler.js wrapper: play, pause, seek, analyze
│   ├── useVisualizer.ts         ← Connects Web Audio API to Three.js uniforms
│   ├── usePlaylist.ts           ← Track sequencing, shuffle, repeat logic
│   └── useTheme.ts              ← Reads palette from config, injects CSS vars
│
├── store/
│   └── playerStore.ts           ← Zustand store: current track, play state, volume
│
├── lib/
│   ├── config.ts                ← Imports + validates lumina.config.ts
│   └── utils.ts                 ← Shared utility functions
│
├── public/
│   ├── tracks/                  ← Audio files (MP3/FLAC)
│   ├── videos/                  ← Music video MP4s
│   ├── artwork/                 ← Per-track artwork and album cover
│   └── lyrics/                  ← .vtt files for timed lyrics
│
├── lumina.config.ts             ← ⭐ THE SINGLE CONFIG FILE
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md                    ← Full musician-friendly setup guide
```

### Component Hierarchy (Runtime)

```
<PlayerShell>          ← manages layout, keyboard shortcuts, gesture zones
  <VisualizerManager>  ← full-screen layer (ReactiveCanvas OR VideoBackground)
  <TrackInfo>          ← top-left: album, artist, track name
  <LyricsPanel>        ← center or right overlay (optional)
  <Controls>           ← bottom: progress, play/pause, volume, playlist toggle
  <PlaylistRail>       ← side drawer: all tracks, active highlight
  <StoreButton>        ← floating CTA
  <StoreDrawer>        ← slides in from right, product cards
```

### State Management (Zustand)

```typescript
// store/playerStore.ts
{
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number; // 0–1
  progress: number; // 0–1
  isMuted: boolean;
  isPlaylistOpen: boolean;
  isStoreOpen: boolean;
  isLyricsVisible: boolean;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
}
```

---

## 4. Configuration System

### The Golden Rule

One file. One object. An artist (or you on their behalf) edits `lumina.config.ts` and _nothing else changes._

```typescript
// lumina.config.ts — THE COMPLETE SAMPLE (Section 11 below)
```

**Config sections:**

1. **`artist`** — name, bio, social links, logo
2. **`album`** — title, artwork, release date, description
3. **`theme`** — accent color, background color, font choice, blur intensity
4. **`tracks[]`** — the heart of the config (see Visualizer System)
5. **`store`** — enabled flag, headline, array of products
6. **`features`** — toggle: lyrics, store, playlist, shuffle, autoplay

**Validation:** `lib/config.ts` runs a lightweight Zod schema validation at build time — if the config is malformed, Next.js build will fail with a clear, human-readable error message.

---

## 5. Visualizer System

### The Core Abstraction

Every track in the config has a `visual` field. It is exactly one of two shapes:

```typescript
type TrackVisual =
  | {
      type: "reactive";
      scene: "particles" | "waveform" | "nebula";
      colorOverride?: string;
    }
  | { type: "video"; src: string; loop?: boolean };
```

`VisualizerManager.tsx` reads the current track's `visual` field from the Zustand store and renders either `<ReactiveCanvas>` or `<VideoBackground>`. On track change, Framer Motion handles a cross-fade between the two layers (opacity transition, ~600ms).

### Reactive 3D Visualizer (Three.js)

**Architecture:**

- Web Audio API `AnalyserNode` samples FFT data every animation frame (Float32Array, 512 bins)
- Data passed via a shared ref (no React re-render) directly into Three.js shader uniforms
- Three scenes are available (more can be added as simple `.tsx` files):
  - **ParticleField** — 10,000 instanced points that pulse in amplitude and drift outward. Bass frequencies control radius expansion, mids control vertical drift, highs cause color temperature shift.
  - **WaveformRing** — 512-point ring geometry that deforms to the real-time waveform. Elegant, minimal.
  - **NebulaDrift** — Slow volumetric particle cloud that subtly responds to beat onsets. Great for ambient tracks.

**Performance:** Uses `InstancedMesh` (not individual objects), `useFrame` from R3F (no `requestAnimationFrame` re-renders React), and `dpr={[1, 2]}` cap for mobile. On low-end devices, particle count auto-scales via a performance monitor hook.

### Video Tracks

- `<VideoBackground>` renders a `<video>` element with `autoPlay`, `loop`, `muted` (because it has baked-in audio)
- The Howler.js audio engine is **bypassed** for video tracks — the video element's native audio is used
- This means no Web Audio API analysis for video tracks (no visualizer on top)
- Framer Motion cross-fades between the static gradient background and the video element

---

## 6. Playback Engine

### The Split Architecture

```
Track type: "audio"                   Track type: "video"
─────────────────────────────────     ──────────────────────────────────
Howler.js plays MP3/FLAC              HTML5 <video> plays MP4
Web Audio API AnalyserNode active     Analyser bypassed
Three.js visualizer scene rendered    Three.js scene hidden/unmounted
Progress from Howler's seek()         Progress from video.currentTime
```

### `useAudio.ts` Hook

Wraps Howler.js and exposes:

```typescript
{
  play, pause, seek, setVolume, mute,
  duration, currentTime,           // reactive via polling (100ms interval)
  analyserNode,                    // WebAudioAPI node for visualizer
}
```

**Cross-browser note:** Howler.js handles Safari's autoplay restrictions gracefully (requires user gesture → we enforce play only starts on first tap/click).

### Track Transitions

On `nextTrack()` or `prevTrack()`:

1. Framer Motion fades out current visualizer (300ms)
2. Howler stops (audio) OR video.pause() + video.src = '' (video)
3. Zustand updates `currentTrackIndex`
4. New track's visual loads and fades in (300ms)
5. New audio/video begins playing
6. `TrackInfo` animates in with new track metadata

### Preloading

- Audio tracks: Howler preloads the _next_ track in the playlist when current track reaches 80% progress
- Video tracks: Next video src is set and `preload="metadata"` is added to an off-screen `<video>` element

---

## 7. Store Integration

### Design Philosophy

No backend. No Stripe secret keys. No checkout sessions to manage. Stripe Payment Links are static URLs — they work forever, from anywhere, with no server.

### Config Shape

```typescript
store: {
  enabled: true,
  headline: "Support the art",
  subheading: "Every purchase goes directly to us",
  products: [
    {
      id: "vinyl-1",
      name: "Deluxe Vinyl",
      description: "180g pressing, full color sleeve",
      price: "$38",
      image: "/artwork/vinyl.jpg",
      stripeLink: "https://buy.stripe.com/xxxxxxxxxxxx",
      type: "physical",
      badge: "Limited",        // optional
    },
    {
      id: "digital-1",
      name: "Lossless Album Download",
      description: "FLAC + WAV, all tracks",
      price: "$12",
      image: "/artwork/digital.jpg",
      stripeLink: "https://buy.stripe.com/yyyyyyyyyyyy",
      type: "digital",
    },
  ],
}
```

### UI

- A floating pill button `"Shop"` appears at a tasteful position (bottom-right by default, configurable)
- Tapping it slides open a `<StoreDrawer>` from the right (Framer Motion `x` animation)
- Products display as glass-panel cards: image, name, price, description, type badge
- CTA button: `"Get it — $38"` → opens Stripe Payment Link in new tab
- Drawer can be closed with Escape key, backdrop click, or the close button

---

## 8. Deployment & Distribution

### One-Click Vercel Flow

```
1. Artist forks repo (or you hand them a private copy)
2. Artist edits lumina.config.ts (or uses /setup UI)
3. Drops audio/video/artwork into /public/
4. Connects repo to Vercel (import project)
5. Clicks Deploy → live in ~90 seconds
6. Adds custom domain in Vercel dashboard → SSL automatic
```

### README for Musicians (Outline)

```markdown
# Lumina — Setup Guide

## What you need

- Your audio files (MP3 recommended, 192kbps+)
- Your artwork (JPG/PNG, 1920×1080 or square)
- Optional: music video MP4s, lyrics .vtt files
- A Stripe account (free) for the store

## Setup (20 minutes)

1. Open lumina.config.ts
2. Fill in your artist name, album title, and track list
3. Drop your files in /public/tracks/, /public/artwork/
4. Push to GitHub
5. Deploy on vercel.com (free tier works)

## Going Live

- Connect your custom domain in Vercel
- Share the link — that's it
```

### Custom Domain Support

Next.js + Vercel handle this natively. Artist just adds a CNAME in their DNS provider pointing to `cname.vercel-dns.com`.

---

## 9. Service Tiers & Pricing

| Tier               | Name          | Price         | What You Deliver                                                                                        |
| ------------------ | ------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| 🆓 **DIY**         | Open Source   | Free          | Public GitHub repo, README, MIT license                                                                 |
| 🎯 **Guided**      | Setup Session | **$149**      | 2-hour call: configure, upload files, deploy, connect domain                                            |
| ✨ **Full Custom** | Done-For-You  | **$499–$999** | You build everything: record/design custom visuals, configure all tracks, connect store, test, hand off |

**Upsells:**

- Additional custom Three.js visual scene: **+$199**
- Timed lyrics integration (you write the .vtt files): **+$75**
- Monthly "update pass" (1 track swap/season): **+$29/mo**

**Positioning note:** At $499, you're competing with _nothing_. There is no other service that gives an indie artist a cinematic personal web experience like this. The conversation is: "Your Spotify page looks like everyone else's. This is _yours._"

---

## 10. Complete Build Checklist

### ✅ DONE - Foundation (Days 1–2)

- [x] `npx create-next-app@latest lumina --typescript --tailwind --app` - Next.js 15 + App Router
- [x] Install core deps: `framer-motion`, `zustand`, `howler`, `@types/howler`, `three`, `@react-three/fiber`, `@react-three/drei`, `zod` - All installed via npm
- [x] Set up Tailwind v4 config, global CSS variables system - Custom theme with accent/background colors
- [x] Create `lumina.config.ts` with full schema and sample data - Zod-validated config object
- [x] Create `lib/config.ts` with Zod validation - Runtime config validation
- [x] Create Zustand `playerStore.ts` - Centralized state for playback, UI, audio analysis

### ✅ DONE - Playback Engine (Days 3–4)

- [x] Build `useAudio.ts` hook (Howler.js wrapper + Web Audio API analyser) - Custom hook with seek/play/pause
- [x] Build `usePlaylist.ts` (next/prev/shuffle/repeat logic) - Track navigation with hasNext/hasPrev
- [x] Build `VideoEngine.tsx` (HTML5 video controller) - Native video playback for MP4 tracks
- [x] Build `AudioEngine.tsx` (consumes `useAudio`, syncs to store) - Reacts to progress changes for seeking
- [x] Wire up progress tracking (100ms polling) - Real-time progress updates from Howler
- [x] Implement preloading for next track - Howler handles automatic preloading

### ✅ DONE - Controls & UI Shell (Days 4–5)

- [x] Build `PlayerShell.tsx` (full-screen layout grid) - Main layout orchestrator
- [x] Build `Controls.tsx` (play/pause, seek bar, volume, prev/next) - Interactive controls with progress bar
- [x] Build `ProgressBar.tsx` (smooth, draggable) - Integrated into Controls component
- [x] Build `TrackInfo.tsx` (animated in/out on track change) - Artist/album/track display
- [x] Build `PlaylistRail.tsx` (collapsible, scrollable, keyboard navigable) - Side drawer with track list
- [x] Keyboard shortcuts: Space (play/pause), ←/→ (seek), ↑/↓ (track) - Fixed usePlaylist hook issue

### ✅ DONE - Visualizer System (Days 5–7)

- [x] Build `VisualizerManager.tsx` (split logic) - Switches between reactive/video based on track config
- [x] Build `VideoBackground.tsx` (full-screen video layer) - MP4 playback with baked audio
- [x] Build `ReactiveCanvas.tsx` (R3F canvas setup with audio data connection) - Three.js canvas wrapper
- [x] Build `SongSingularity.tsx` scene (FFT-reactive particles/rings/core) - Main visualizer with frequency buckets
- [x] Implement smooth cross-fade transitions between visuals on track change - Framer Motion opacity transitions
- [x] Mobile performance: dpr cap, particle count scaling, reduced FFT bins on mobile - Adaptive rendering

### ✅ DONE - Audio Reactivity Fixes

- [x] Fix audio distortion (removed double signal path) - AnalyserNode no longer connects to ctx.destination
- [x] Fix seek bar functionality - AudioEngine now listens to progress changes and calls seek()
- [x] Implement frequency buckets: bass→Core pulse, mids→Ring flash, highs→Particle speed - Weighted bin averaging with crossover rolloff
- [x] Add noise floor gates + crossover rolloff - Prevents bleed and false triggering

### NEXT - Lyrics & Store (Days 7–8)

- [ ] Build `LyricsPanel.tsx` (WebVTT parser + timed display OR static text)
- [ ] Build `StoreDrawer.tsx` + `ProductCard.tsx`
- [ ] Build `StoreButton.tsx` (floating trigger)
- [ ] Connect all store items to Stripe Payment Links
- [ ] Implement feature flags (toggle lyrics/store from config)

### NEXT - SEO & Static Fallback (Day 9)

- [ ] Root `layout.tsx` with full `<head>` meta (OG tags, Twitter card, description)
- [ ] `opengraph-image.tsx` — dynamic OG image using album art + artist name
- [ ] Static `<noscript>` fallback showing artist name, album, and track list
- [ ] `robots.txt` and `sitemap.xml` generation
- [ ] `next.config.ts` — image domains, headers, bundle analysis

### NEXT - /setup Config Wizard (Day 10)

- [ ] Multi-step form UI at `/setup`
- [ ] Steps: Artist Info → Album → Tracks (add/remove) → Theme → Store → Preview
- [ ] "Generate Config" button exports valid `lumina.config.ts` content to clipboard/download
- [ ] Hide /setup from production via env flag

### NEXT - Polish & QA (Days 11–14)

- [ ] Test on iPhone Safari, Android Chrome, Firefox, Edge
- [ ] Lighthouse audit: target 95+ Performance, 100 Accessibility
- [ ] Test all visualizer scenes with real audio
- [ ] Test video tracks (MP4) on all platforms
- [ ] Test Stripe Payment Links (complete a test purchase)
- [ ] Write README.md (musician-friendly)
- [ ] Set up Vercel project, test one-click deploy
- [ ] Record a 60-second demo video for the service landing page

---

## 11. Sample Config File

```typescript
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
    logo: "/artwork/logo.svg", // optional — shown in top-left
    socials: {
      instagram: "https://instagram.com/auroraveil",
      spotify: "https://open.spotify.com/artist/...",
      bandcamp: "https://auroraveil.bandcamp.com",
    },
  },

  album: {
    title: "Glass Meridian",
    artwork: "/artwork/cover.jpg", // 1:1 ratio, min 800×800px
    releaseDate: "2025-03-08",
    description:
      "A journey through light and frequency. Eight tracks recorded live in an abandoned lighthouse.",
  },

  theme: {
    accentColor: "#a78bfa", // violet — drives highlights, controls, buttons
    backgroundColor: "#080810", // near-black — fallback when no visual
    blurIntensity: "medium", // "low" | "medium" | "high" — glass panel blur
    fontDisplay: "inter", // "inter" | "playfair" | "space-grotesk"
  },

  tracks: [
    {
      id: "track-01",
      title: "Glass Meridian",
      duration: 237, // seconds (for display before load)
      src: "/tracks/01-glass-meridian.mp3",
      artwork: "/artwork/track-01.jpg", // optional per-track artwork
      visual: {
        type: "reactive",
        scene: "particles", // "particles" | "waveform" | "nebula"
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
        src: "/videos/02-low-tide.mp4", // MP4 with baked-in audio (replaces audio src)
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
        colorOverride: "#38bdf8", // overrides accentColor for this track only
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
        description:
          "180g pressing. Full-color gatefold sleeve. Limited to 300 copies.",
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
    showArtistBio: true, // shows bio in a collapsible info panel
  },
};

export default config;
```

---

## 12. Key UI Screens

### Screen 1 — Main Player (Reactive Visual Track)

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]  Aurora Veil                          [ℹ] [♪] [🛍]  │  ← top bar, transparent
│                                                              │
│                                                              │
│           ≋ THREE.JS PARTICLE FIELD ≋                       │  ← full-screen, behind all
│           (10,000 particles reacting                        │
│            to the live audio FFT)                           │
│                                                              │
│                                                              │
│  Track 01 / 08          Glass Meridian      ♦ Glass Meridian │  ← track info, left
│  Aurora Veil            3:57                                 │
│                                                              │
│  ┌────────────────── LYRICS ──────────────────────────────┐  │
│  │  "We are the last light                                │  │  ← timed, center-right
│  │   before the shoreline breaks"                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ████████████████████░░░░░░░░░░░░░░░░░  2:14 / 3:57         │  ← seek bar
│                                                              │
│  [⏮]  [⏸]  [⏭]    ━━━━━●━━━  🔊  [☰ Playlist]  [⟳]        │  ← controls row
└─────────────────────────────────────────────────────────────┘
```

### Screen 2 — Playlist Rail Open (Side Drawer)

```
┌──────────────────────────────────────┬──────────────────────┐
│                                      │  PLAYLIST            │
│    THREE.JS SCENE                    │  ─────────────────── │
│    (slightly dimmed)                 │  ▶ 01  Glass Meridian│  ← active, highlighted
│                                      │    2:14 / 3:57       │
│                                      │  ── 02  Low Tide Freq│
│                                      │    3:18              │
│                                      │  ── 03  Nautical Gho │
│                                      │    4:45              │
│                                      │  ── 04  ...          │
│                                      │                      │
│                                      │  [×] Close           │
└──────────────────────────────────────┴──────────────────────┘
```

### Screen 3 — Store Drawer Open

```
┌──────────────────────────────────────┬──────────────────────┐
│                                      │  🛍 SHOP             │
│    THREE.JS SCENE                    │  Take a piece home.  │
│    (slightly dimmed, blurred)        │  ─────────────────── │
│                                      │  ┌────────────────┐  │
│                                      │  │ [VINYL IMAGE]  │  │
│                                      │  │ Deluxe Vinyl   │  │
│                                      │  │ $38 · Physical │  │
│                                      │  │ [Get it — $38] │  │
│                                      │  └────────────────┘  │
│                                      │  ┌────────────────┐  │
│                                      │  │ [COVER ART]    │  │
│                                      │  │ FLAC Download  │  │
│                                      │  │ $12 · Digital  │  │
│                                      │  │ [Get it — $12] │  │
│                                      │  └────────────────┘  │
└──────────────────────────────────────┴──────────────────────┘
```

### Screen 4 — Video Track Playing

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]  Aurora Veil                          [ℹ] [♪] [🛍]  │
│                                                              │
│                                                              │
│        ╔════════════ MP4 MUSIC VIDEO ════════════╗          │
│        ║                                        ║          │  ← full-screen video
│        ║   (baked-in cinematography from        ║          │
│        ║    the artist's video file)            ║          │
│        ║                                        ║          │
│        ╚════════════════════════════════════════╝          │
│                                                              │
│  Track 02 / 08          Low Tide Frequency                   │
│                                                              │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  1:02 / 3:18          │
│                                                              │
│  [⏮]  [⏸]  [⏭]    ━━━━━●━━━  🔊  [☰ Playlist]  [⟳]        │
└─────────────────────────────────────────────────────────────┘
```

### Screen 5 — /setup Config Wizard

```
┌─────────────────────────────────────────────────────────────┐
│  ✦ LUMINA SETUP                                             │
│                                                              │
│  Step 2 of 5: Your Album                                    │
│  ──────────────────────────                                  │
│                                                              │
│  Album Title      [Glass Meridian_____________________]     │
│  Release Date     [2025-03-08_________________________]     │
│  Description      [A journey through light and...____]     │
│  Cover Art        [📁 Upload cover.jpg] ✓ cover.jpg         │
│                                                              │
│  [← Back]                              [Next: Tracks →]    │
│                                                              │
│  ──────────────────────────────────────────────────────── │
│  💡 Tip: Use a 1:1 square image for best results           │
└─────────────────────────────────────────────────────────────┘
```

**To deploy to Vercel:**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `lumina` GitHub repo
3. Click Deploy (zero config needed — Next.js is auto-detected)
4. Live in ~90 seconds with a `lumina.vercel.app` URL
5. Add custom domain in Project Settings → Domains

---

## Summary

This is a **14-day solo build** that produces a genuinely unique, sellable product. The architecture is intentionally simple — no database, no auth, no backend — which means zero maintenance costs for you, and zero technical risk for the artist. The config file design is the secret weapon: it makes customization so approachable that a non-technical musician can do it themselves with the README, or pay you $149 for a 2-hour session.

**When you're ready to build, toggle to Act mode and I'll build the entire project file by file.**
