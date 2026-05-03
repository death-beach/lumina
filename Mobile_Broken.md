# Mobile audio: fixed, end of saga.

## TL;DR

Audio now plays on iPhone Safari with the silent switch in either position,
behaves like Spotify / Apple Music, and the visualizer still reacts in
perfect sync with the music. Artists do not need to run any new commands.

## What was actually wrong

The whole iPhone-silent-switch issue had **one** root cause:

> Web Audio output on iOS is routed to the _Ringer_ volume bucket, which
> is silenced when the silent switch is on. HTML `<audio>` output is routed
> to the _Media_ bucket, which ignores the silent switch — exactly like every
> real music player.

The previous build wired audio through Web Audio so the visualizer could read
frequency data from a live `AnalyserNode`. That meant audio was permanently in
the wrong bucket on iOS. Every fix attempted before this one was working
_around_ that single architectural choice — `AudioContext.resume()` dances,
synchronous gesture-scope `imperativePlay` bridges, global touch listeners,
buffered HTML5 retries — none of which can move audio to the Media bucket.
Only switching to an HTML `<audio>` element does that.

## What changed

Audio path: now an HTML `<audio>` element (Howler `html5: true`).
Result: plays through the Media bucket on iOS. Done.

Visualizer data: precomputed at build time. A short Node script reads each
MP3, runs an FFT, applies the same smoothing & dB scaling that the live
Web Audio analyser would have, and writes a tiny `.frames.bin` next to the
MP3 (~150 KB per minute of audio). The browser fetches that file once, and
the visualizer reads the right frame for the current playback time.

Scenes are unchanged. They still receive a `Uint8Array` of the same shape as
`analyser.getByteFrequencyData()`. Indistinguishable on screen.

## Files in this fix

| File                                | What it does                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/analyze-tracks.mjs`        | New. Generates `.frames.bin` for every audio file in `public/tracks/`. Idempotent.                                                                                                       |
| `package.json`                      | New `prebuild` script (Vercel auto-runs the analyzer on every deploy) and `analyze` script (manual re-run). `audio-decode` and `fft.js` are devDependencies — never shipped to visitors. |
| `scripts/setup.mjs`                 | Runs the analyzer right after the artist confirms their files are in `public/tracks/`. Zero new artist-facing commands.                                                                  |
| `lib/playbackTime.ts`               | Tiny singleton ref shared between `useAudio` (writes) and `useAudioData` (reads). Avoids React re-renders on every animation frame.                                                      |
| `hooks/useAudio.ts`                 | Rewritten. `html5: true`. No analyser, no AudioContext, no imperative-play bridge. Same public API.                                                                                      |
| `hooks/useAudioData.ts`             | Rewritten. Reads `.frames.bin` and returns the right slice for the current playback time. Same `Uint8Array` return type.                                                                 |
| `components/player/Controls.tsx`    | Removed the `Howler.ctx.resume()` dance and `imperativePlay` call. Play/pause is now `setIsPlaying(!isPlaying)`.                                                                         |
| `components/player/PlayerShell.tsx` | Removed the global `unlockAudio` listener. There is no AudioContext to unlock.                                                                                                           |
| `store/playerStore.ts`              | Removed the dead `imperativePlay`, `audioContext`, and `analyserNode` slots.                                                                                                             |
| `.gitignore`                        | Ignores generated `.frames.bin` files (rebuilt on every deploy).                                                                                                                         |

## Cost in lines of code

The fix is a **net reduction**. We removed:

- ~30 lines of `Howler.ctx.resume()` / `imperativePlay` / unlock listener code
- The entire AnalyserNode wiring
- Three Zustand store slots and their setters

…and added a self-contained ~200-line analyzer script (off the hot path),
a 150-line `useAudioData` rewrite, and a 20-line `playbackTime` module.

The remaining player/control code is shorter and easier to follow than what
it replaced.

## What the artist sees

No change to the workflow:

```
git clone …
npm install
npm run setup       # ← analyzer now runs at the end of this
# drop MP3s in public/tracks/
git add . && git commit -m "my tracks" && git push
```

The Vercel deploy hits the `prebuild` step, regenerates `.frames.bin` files
from whatever audio is committed, then builds the site. If an artist edits an
MP3 locally and runs `npm run dev`, they can run `npm run analyze` to refresh
the data — though the analyzer is idempotent and `npm run setup` already
covers it.

## What works on iPhone now

| Behaviour                                        | Status |
| ------------------------------------------------ | ------ |
| Audio plays with silent switch ON (Media bucket) | ✓      |
| Audio plays with silent switch OFF               | ✓      |
| Visualizer reacts in time with the music         | ✓      |
| Tap play, scrub, skip, mute — all responsive     | ✓      |
| Track end auto-advances to the next track        | ✓      |
| Lyrics, fullscreen (where supported), playlist   | ✓      |

## Security / dependency hygiene

`audio-decode` brings in older transitive MP3-decoder dependencies that
trigger npm audit warnings. They are:

- **Build-time only** — sit in `devDependencies`, never bundled into the
  app, never run in a visitor's browser.
- **Inert in practice** — the exploit path requires processing a malicious
  audio file, and the only audio fed to the analyzer is the artist's own
  MP3s.

The only production-side audit findings remaining are pre-existing and
unrelated to this fix — a Next.js DoS advisory (fixed in 16.2.3) and a
PostCSS XSS advisory pulled in transitively by Next. Both are
auto-patchable:

```
npm audit fix      # bumps next + postcss to patched releases
```

That's a safe minor-version bump and orthogonal to mobile audio. If you
want a cleaner tree later, swap `audio-decode` for `mpg123-decoder`
(a single modern WASM package). Not necessary today.

## Why this is the last word on the topic

There is no universe where audio plays through the iOS Media bucket _and_
also flows through Web Audio's AnalyserNode — Apple does not allow it. Every
"both at once" approach circulating online (silent ghost `<audio>` elements,
touched-once unlock hacks, MediaElementAudioSourceNode tricks) all ultimately
route audio through Web Audio and end up in the Ringer bucket. The only
correct architecture for a music app on iOS is: HTML `<audio>` for sound,
precomputed (or separately captured) data for visualisation. That is what
Lumina does now.
