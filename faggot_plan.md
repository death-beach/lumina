# Lumina Completion Plan

This document outlines the specific steps to complete the Lumina project based on the current state. These are the remaining tasks to make the project shippable as a forkable visual album player.

## TODO List

- [ ] **Lyrics: Add static lyrics support**
  - Update `hooks/useLyrics.ts`: Add handling for `type: "static"` by splitting `lyrics.text` into an array of lines and returning them as LrcLine objects (with no timestamps).
  - Update `components/player/LyricsPanel.tsx`: Add a check if lyrics are static; render all lines in a scrollable div instead of the timed karaoke view. Keep the timed view unchanged.

- [ ] **Video: Make track src optional for video tracks and add test track**
  - Update `lib/config.ts`: Modify TrackSchema to make `src` optional when `visual.type === "video"` (use z.discriminatedUnion or conditional validation).
  - Update `lumina.config.ts`: Add a new track-03 as a video track example, e.g.:
    ```
    {
      id: "track-03",
      title: "Video Test Track",
      visual: {
        type: "video",
        src: "/videos/test-video.mp4",
        loop: false,
      },
    }
    ```
    Note: User needs to place an actual MP4 in `public/videos/test-video.mp4` for testing.

- [ ] **Store: Add storeUrl and convert button to external link**
  - Update `lib/config.ts`: Add `storeUrl: z.string().url().optional()` to the main LuminaConfigSchema.
  - Update `lumina.config.ts`: Add `storeUrl: "https://example.com/store"` at the top level.
  - Update `components/player/PlayerShell.tsx`: Change the 🛍️ button's onClick to `window.open(config.storeUrl, '_blank')` if storeUrl exists. Remove the entire stub `<div>` for the store drawer at the bottom of the file.

- [ ] **SEO: Update metadata from config**
  - Update `app/layout.tsx`: Import the config from `lib/config.ts`, then set:
    ```
    title: `${config.artist.name} — ${config.album?.title || ''}`,
    description: config.album?.description || `${config.artist.name}'s visual album experience`,
    ```
    Add basic OG tags pulling from config (e.g., og:title, og:image if artwork exists).

- [ ] **README: Write real fork/deploy guide**
  - Overwrite `README.md` with a musician-friendly guide:
    - Intro to Lumina
    - Setup steps: clone repo, run `npm install`, edit lumina.config.ts, add files to /public/, run locally with `npm run dev`
    - Deployment: push to GitHub, import to Vercel, add custom domain
    - Customization tips: adding tracks, videos, lyrics, store URL

## Notes

- All changes are minimal and targeted to existing files.
- After these, test locally: `npm run dev`, verify lyrics (static and timed), video playback, store link, SEO tags in browser dev tools.
- If anything breaks, revert and debug.

This plan completes the project without adding new features.
