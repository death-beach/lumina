# Mobile_Broken.md

**Status: RESOLVED (within web-platform limits)**
**Date last updated: 2026-05-03**

> Read this file end-to-end before making _any_ mobile-related changes. It exists
> to prevent another expensive cycle of guessing and re-instrumenting the same
> three files. The architecture decisions below are deliberate; do not "improve"
> them without first confirming the new behaviour on a real iPhone in Safari.

---

## TL;DR

| Symptom                                          | Cause                                                                                                                                     | Fix applied                                                                                                                                     | Status                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| No audio on first mobile tap                     | `imperativePlay` was registered inside Howler's `onload` callback, so it was still `null` when the user tapped (decode is slow on phones) | Register `imperativePlay` synchronously **immediately after `new Howl(...)`** — Howler queues plays issued before decode completes              | ✅ Fixed                              |
| `Howler.ctx?.resume()` was a no-op on first tap  | `Howler.ctx` doesn't exist until Howler is touched at least once; on a fresh page it's `null` when the user taps the play button          | Lazy-init Howler's context in `handlePlayPause` via `Howler.volume(Howler.volume())` before calling `.resume()`                                 | ✅ Fixed                              |
| Top URL bar visible on mobile                    | Mobile browsers only retract chrome when the page is taller than the viewport AND a scroll has occurred                                   | `html { height: 110vh; overflow: hidden }` + `window.scrollTo(0, 1)` triggered on load + orientationchange + first touch                        | ✅ Fixed (Android & iPhone landscape) |
| Bottom Safari toolbar visible on iPhone portrait | **Apple platform restriction.** The bottom toolbar in iPhone Safari is not removable from a regular browser tab via any web API.          | None possible at the website level. The only paths are PWA install (ruled out by product) or a native app wrapper (out of scope).               | ⚠️ Not fixable in a browser tab       |
| Fullscreen button missing on iPhone              | `document.fullscreenEnabled` is false on iPhone Safari for arbitrary DOM elements (Apple restriction)                                     | Button hidden via `isFullscreenSupported` check. No popups, no prompts, no install suggestions. Desktop & Android still get the working button. | ✅ Intentional                        |

---

## How the audio path works now (do not break this)

The mobile audio policy is: `AudioContext.resume()` and the _first_ `audioNode.start()` must occur **synchronously inside a user gesture's call stack**. Any React `setState` → `useEffect` hop exits that call stack and the browser silently blocks audio.

The current code threads the gesture all the way through to Howler:

```
User tap on play button
  └── Controls.handlePlayPause()      [synchronous]
        ├── Howler.volume(Howler.volume())   ← lazy-init Howler.ctx if null
        ├── Howler.ctx.resume()              ← unlock AudioContext (sync)
        ├── imperativePlay()                 ← calls howl.play() directly
        │     │
        │     └── howl is the active Howl instance, registered into the store
        │         immediately after `new Howl(...)` in useAudio.ts —
        │         BEFORE decode finishes. Howler queues plays made pre-decode
        │         and starts them once the file is ready.
        └── setIsPlaying(true)               ← React state sync (cosmetic)

After React re-renders:
  AudioEngine effect sees isPlaying=true → calls play(),
  but useAudio.play() guards with `!howl.playing()`, so it's a no-op
  (the howl is already playing from the imperative call above).
```

### Files involved

- `hooks/useAudio.ts` — Owns the Howl. Registers `imperativePlay` **synchronously after `new Howl(...)`**, _not_ inside `onload`. Also wires the analyser to `Howler.masterGain` non-destructively.
- `components/player/Controls.tsx` — `handlePlayPause` performs the three synchronous steps above. **Order matters; do not reorder.**
- `store/playerStore.ts` — Holds the `imperativePlay` slot (`(() => void) | null`).
- `components/player/AudioEngine.tsx` — React-state-driven sync layer. Cosmetic / safety net only; the real first-play happens via `imperativePlay`.
- `components/player/PlayerShell.tsx` — Mounts a passive `touchstart`/`click` listener that resumes `Howler.ctx` if it ever re-suspends (e.g. after a phone call). Belt-and-suspenders only.

### Things that will silently re-break audio if you do them

1. **Moving `registerImperativePlay` back inside `onload`.** Don't. The whole point is that it must be available _before_ the user can tap, and the user can tap before decode completes.
2. **Calling `Howler.masterGain.disconnect()` for the analyser tap.** This severs Howler's own routing to the speakers. Use `Howler.masterGain.connect(analyser)` (additive) only.
3. **Connecting the analyser to `ctx.destination`.** Howler already routes there; doing it again double-outputs everything and clips.
4. **Switching to `html5: true`.** Web Audio API mode (`html5: false`) is required for the analyser tap that drives visualizer reactivity. If you ever need to revisit this, the alternative is `MediaElementAudioSourceNode`, which has its own iOS gotchas (CORS-tainted streams cannot be analysed on iOS Safari).
5. **`await`-ing `Howler.ctx.resume()`** inside the click handler before calling `.play()`. The `await` exits the gesture scope. Fire-and-forget the resume; play synchronously.

---

## How the "no chrome" mobile behaviour works

The CSS:

```css
html {
  height: 110vh;
  overflow: hidden;
}
body {
  height: 100%;
  min-height: 100svh;
  overflow: hidden;
  overscroll-behavior: none;
}
```

The 110vh `<html>` plus the `scrollTo(0, 1)` calls in `PlayerShell.tsx` trigger browsers to retract their URL bar; `overflow: hidden` everywhere prevents the user from ever seeing a real scrollbar or pulling-to-refresh.

`overscroll-behavior: none` and `-webkit-overflow-scrolling: auto` on `<body>` kill the iOS rubber-band effect that would otherwise re-show the address bar on every touch.

`--app-height` is set in JS to `window.visualViewport.height` and the player container is `height: var(--app-height)`. This guarantees the visualizer fills the _currently visible_ viewport — when iOS's chrome does appear, the visualizer just gets shorter rather than being clipped behind a toolbar.

### What this gets you per platform

- **Desktop:** No visible effect. The fullscreen button works normally.
- **Android Chrome:** URL bar fully hidden after the first scroll-trigger. Fullscreen button works for true-fullscreen.
- **iPhone Safari landscape:** Address bar collapses to a compact pill. App fills the rest. No fullscreen button (API not supported by Apple).
- **iPhone Safari portrait:** Top bar minimised. **Bottom Safari toolbar remains visible** — Apple does not permit a website to hide it. App fills the space between the bars. No fullscreen button.

### What is not possible (please don't ask another AI to "fix" it)

- Hiding iPhone Safari's bottom toolbar from a regular browser tab. Apple does not allow this. There is no JavaScript, CSS, meta tag, or library trick that bypasses it. Spotify Web, SoundCloud, YouTube Music — none of them can do it either. Verified annually; still true.
- The only ways to make the iPhone show only the visualizer with no Safari UI are: (a) the user adds the site to their Home Screen and launches it from there, or (b) wrap the app in a native iOS shell (Capacitor, React Native, Swift). Both are platform-level solutions, not website code changes.

---

## Verifying on a real device

1. `npm run dev`, expose your dev server on the LAN, open it on your phone in Safari/Chrome.
2. **First-tap audio test:** Tap play _immediately_ when the page becomes interactive (don't wait). Audio should start within ~1–2 seconds (decode time on the phone). On iPhone the very first time may take 2–3 seconds; it's the device decoding the MP3, not a bug.
3. **Pause/resume test:** Tap pause, tap play again. Should be instant.
4. **Backgrounded test:** Lock the phone for 10 seconds, unlock, tap play. Should resume cleanly (the AudioContext-resume passive listener handles this).
5. **Track skip test:** Tap next track, tap play. Should play the new track.
6. **Orientation test:** Rotate the phone landscape/portrait. The visualizer should reflow to the new visible viewport. The address bar may flash briefly then retract.

If anything in (2)–(5) fails, check the browser console for `onplayerror` messages — `useAudio.ts`'s `onplayerror` handler does a context-resume + retry as a fallback for transient failures, and logs a `[Lumina]` warning when it fires.

---

_This document was generated to hand off to a new developer, then revised after the
single-pass fix on 2026-05-03. All code described is in the `main` branch._
