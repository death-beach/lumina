// ── LRC Parser ────────────────────────────────────────────────────────────────
// Parses standard LRC lyric files into an array of timed lines.
//
// LRC format:
//   [mm:ss.xx]Lyric text here
//   [01:23.45]Another line
//
// Returns lines sorted by time ascending.

export interface LrcLine {
  time: number;   // seconds from start of track
  text: string;
}

const LINE_REGEX = /^\[(\d{1,2}):(\d{2})(?:[.:,](\d{1,3}))?\](.*)$/;

export function parseLrc(raw: string): LrcLine[] {
  const lines: LrcLine[] = [];

  for (const rawLine of raw.split("\n")) {
    const trimmed = rawLine.trim();
    const match = trimmed.match(LINE_REGEX);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centisStr = match[3] ?? "0";
    // Normalize centiseconds/milliseconds to a 0–1 fraction
    const frac = parseInt(centisStr, 10) / Math.pow(10, centisStr.length);
    const time = minutes * 60 + seconds + frac;
    const text = match[4].trim();

    // Skip metadata tags like [ar:Artist] etc. (they have text in the tag itself)
    if (text.length === 0 && trimmed.includes(":") && !trimmed.match(/^\[\d/)) continue;

    lines.push({ time, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Given a sorted array of LRC lines and the current playback time,
 * returns the index of the currently active line (-1 if before first line).
 */
export function getActiveLrcIndex(lines: LrcLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}
