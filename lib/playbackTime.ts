// lib/playbackTime.ts
// ─────────────────────────────────────────────────────────────────────────────
// Module-scoped, mutable reference shared between `useAudio` (writer) and
// `useAudioData` (reader).
//
// Why a singleton ref instead of React state or a Zustand store:
//   - The visualizer reads this every animation frame (~60 fps). React state
//     would force a re-render on each update; Zustand subscriptions would do
//     the same.  A plain mutable ref is updated and read with zero React
//     overhead, which keeps the visualizer animation smooth.
//   - There is exactly one playing track at any time, so a singleton is fine.
// ─────────────────────────────────────────────────────────────────────────────

export const playbackTime = {
  /** Current audio playback position, in seconds. Updated by useAudio. */
  current: 0,
  /** Total duration of the currently-loaded track, in seconds (0 until ready). */
  duration: 0,
};
