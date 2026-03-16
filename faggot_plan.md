# Lumina Completion Plan

**Rule: One step at a time. One file per step. Test after every step. Do not proceed until test passes.**

---

## Test Reset System

Before each test, you need to know exactly what state to restore. Use this reference.

### Reset Script

Run this to wipe all test data and restore `lumina.config.ts` to the known-good baseline:

```bash
npm run reset-test
```

This script (added in `scripts/reset-test.mjs`, run via `npm run reset-test`) does:

- Resets `lumina.config.ts` to baseline (2 audio tracks, track-01 has timed lyrics, track-02 has no lyrics)
- Removes any `.lrc` files from `public/lyrics/` EXCEPT `track1.lrc` (the real one)
- Removes any test MP4s from `public/videos/`
- Does NOT touch `public/tracks/` (your audio files stay)

### Baseline State (what "clean" looks like)

```
lumina.config.ts:
  track-01: audio, src: /tracks/track1.mp3, lyrics: { type: "timed", src: "/lyrics/track1.lrc" }
  track-02: audio, src: /tracks/track2.mp3, no lyrics

public/lyrics/:
  track1.lrc  ← the real timed lyrics file, DO NOT DELETE

public/tracks/:
  track1.mp3
  track2.mp3

public/videos/:
  (empty)
```

### Manual Reset (if you prefer)

1. `git checkout lumina.config.ts` — restores config to last commit
2. Delete any test `.lrc` files: `rm public/lyrics/track2.lrc` (keep track1.lrc)
3. Delete any test videos: `rm public/videos/*.mp4`

---

## Item 1 — Lyrics: Full support (timed + static) + smart setup script

### Step 1.1 — `hooks/useLyrics.ts`

What changes:

- Add `type: "static"` handling: split `lyrics.text` by `\n`, return as `LrcLine[]` with `time: 0`
- Add `isStatic: boolean` to the hook's return value
- Timed LRC fetch logic stays exactly as-is

✅ **TEST:**

```bash
npm run dev
```

- App loads in browser
- No console errors
- Play track-01 — timed lyrics scroll in sync with music as before

🔄 **RESET AFTER TEST:** Nothing to reset — this test makes no config changes.

---

### Step 1.2 — `components/player/LyricsPanel.tsx`

What changes:

- If `isStatic === true`: render ALL lines in a scrollable div. No windowing. No activeIndex.
- If `isStatic === false`: existing timed karaoke view is completely unchanged

✅ **TEST:**

1. Open `lumina.config.ts`, add to track-02:
   ```ts
   lyrics: {
     type: "static",
     text: "Line one\nLine two\nLine three\nLine four\nLine five",
   },
   ```
2. `npm run dev`
3. Play track-02 — lyrics panel shows all 5 lines in a scrollable list
4. Play track-01 — timed karaoke still scrolls in sync

🔄 **RESET AFTER TEST:**

- Remove the `lyrics` block you added to track-02 in `lumina.config.ts`
- OR run `npm run reset-test`

---

### Step 1.3 — `scripts/setup.mjs`

What changes:

- For each track, ask: "Does this track have lyrics? (y/N)"
- If yes: "Paste your lyrics below. Press Enter twice when done."
- Collect multiline input until user hits Enter twice in a row
- Auto-detect: scan pasted text for `[00:00.00]` timestamp pattern
  - Timestamps found → save `.lrc` file to `public/lyrics/trackN.lrc`, write `type: "timed", src: "/lyrics/trackN.lrc"` in config
  - No timestamps → write `type: "static", text: "..."` inline in config
- Remove old "lyrics filename" prompt entirely
- For each track, also ask: "Is this track a music video? (y/N)"
  - If yes: ask "Video filename (e.g. track1.mp4)" — skip audio `src`, write `visual: { type: "video", src: "/videos/trackN.mp4", loop: false }`
  - If no: existing audio track flow unchanged

✅ **TEST — Static lyrics:**

```bash
npm run setup
```

- Enter artist: `Test Artist`
- Enter 1 track named `Test Track`
- Is this a music video? `n`
- Does it have lyrics? `y`
- Paste: `First verse here` then hit Enter twice
- Check `lumina.config.ts` — should have `lyrics: { type: "static", text: "First verse here" }`

✅ **TEST — Timed lyrics:**

```bash
npm run reset-test
npm run setup
```

- Enter artist: `Test Artist`
- Enter 1 track named `Test Track`
- Is this a music video? `n`
- Does it have lyrics? `y`
- Paste:
  ```
  [00:01.00]First line
  [00:04.00]Second line
  ```
  Then hit Enter twice
- Check `lumina.config.ts` — should have `lyrics: { type: "timed", src: "/lyrics/track1.lrc" }`
- Check `public/lyrics/track1.lrc` — file should exist with pasted content

✅ **TEST — Video track:**

```bash
npm run reset-test
npm run setup
```

- Enter 1 track named `Video Track`
- Is this a music video? `y`
- Video filename: `track1.mp4`
- Check `lumina.config.ts` — should have `visual: { type: "video", src: "/videos/track1.mp4" }` and NO `src` at track level

🔄 **RESET AFTER TEST:**

```bash
npm run reset-test
```

---

## Item 2 — Video: Make audio `src` optional for video tracks

### Step 2.1 — `lib/config.ts`

What changes:

- Make `src` optional when `visual.type === "video"` using conditional validation

✅ **TEST:**

```bash
npm run dev
```

- No TypeScript errors in terminal
- App loads in browser

🔄 **RESET AFTER TEST:** Nothing to reset.

---

### Step 2.2 — `lumina.config.ts`

What changes:

- Add track-03 as a video-only track: no audio `src`, `visual.type: "video"`, `visual.src: "/videos/test-video.mp4"`

✅ **TEST:**

```bash
npm run dev
```

- App loads, no errors
- Track-03 appears in playlist
- Clicking track-03: video player attempts to load (will show black — no MP4 yet, that's fine)
- No crash

🔄 **RESET AFTER TEST:**

```bash
npm run reset-test
```

(removes track-03 from config, clears videos folder)

---

## Item 3 — Store: Wire up storeUrl

### Step 3.1 — `lib/config.ts`

What changes:

- Add `storeUrl: z.string().url().optional()` to `LuminaConfigSchema`

✅ **TEST:**

```bash
npm run dev
```

- No TypeScript errors

🔄 **RESET AFTER TEST:** Nothing to reset.

---

### Step 3.2 — `lumina.config.ts`

What changes:

- Add `storeUrl: "https://example.com/store"` at the top level

✅ **TEST:**

```bash
npm run dev
```

- App loads, config validates, no errors

🔄 **RESET AFTER TEST:** Nothing to reset — keep `storeUrl` in config for next step.

---

### Step 3.3 — `components/player/PlayerShell.tsx`

What changes:

- Change 🛍️ button `onClick` to `window.open(config.storeUrl, '_blank')` — only if `storeUrl` is defined
- Remove the stub `<div>` store drawer placeholder at the bottom of the file

✅ **TEST:**

```bash
npm run dev
```

- Click 🛍️ button — new tab opens to `https://example.com/store`
- No drawer element visible in DOM (inspect with DevTools)

🔄 **RESET AFTER TEST:** Nothing to reset.

---

## Item 4 — SEO: Pull metadata from config

### Step 4.1 — `app/layout.tsx`

What changes:

- Import config
- Set `title` to `${config.artist.name} — ${config.album?.title || ''}`
- Set `description` to `config.album?.description` or fallback `${config.artist.name}'s visual album experience`
- Add `og:title`, `og:description`, `og:image` (album artwork if present in config)

✅ **TEST:**

```bash
npm run dev
```

- Browser tab shows: `Death Beach — Scorpian`
- DevTools → Elements → `<head>` — confirm `og:title`, `og:description` meta tags present

🔄 **RESET AFTER TEST:** Nothing to reset.

---

## Item 5 — README: Musician-friendly guide

### Step 5.1 — `README.md`

What changes:

- Replace entire file with a guide a non-technical musician can follow:
  - What Lumina is (2 sentences)
  - What you need: Node 18+, GitHub account, Vercel account (all free)
  - Setup: `git clone` → `npm install` → `npm run setup` → add files to `/public/` → `npm run dev`
  - Deploy: push to GitHub → import to Vercel → add custom domain
  - Tips: adding more tracks, using music videos, adding lyrics, adding a store link

✅ **TEST:**

- Read it out loud start to finish
- Ask: could a musician with zero coding experience follow every step?

🔄 **RESET AFTER TEST:** Nothing to reset.

---

## Completion Checklist

- [ ] Step 1.1 — `hooks/useLyrics.ts`
- [ ] Step 1.2 — `components/player/LyricsPanel.tsx`
- [ ] Step 1.3 — `scripts/setup.mjs`
- [ ] Step 2.1 — `lib/config.ts` (video src optional)
- [ ] Step 2.2 — `lumina.config.ts` (video track example)
- [ ] Step 3.1 — `lib/config.ts` (storeUrl field)
- [ ] Step 3.2 — `lumina.config.ts` (storeUrl value)
- [ ] Step 3.3 — `components/player/PlayerShell.tsx`
- [ ] Step 4.1 — `app/layout.tsx`
- [ ] Step 5.1 — `README.md`
- [ ] Create `scripts/reset-test.mjs` + add `npm run reset-test` to `package.json`
