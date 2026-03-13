// lib/audioAnalysis.ts
// Shared frequency-band analysis utilities for all Lumina visualizers.
//
// Assumes fftSize = 512 → 256 frequency bins at ~43 Hz/bin (44 100 Hz sample rate).
//
// Band map:
//   Bass   bins  0–6    →   0–275 Hz     (kick, sub-bass)
//   Mids   bins  7–81   → 320–3 500 Hz   (vocals, snare, guitars)
//   Highs  bins 82–116  →  3.5–20 kHz    (cymbals, air, sibilance)

// ── Primitive helpers ─────────────────────────────────────────────────────────

/** Peak value across a bin range, normalised to [0, 1]. */
export function binPeak(data: Uint8Array | null, lo: number, hi: number): number {
  if (!data) return 0;
  let peak = 0;
  const end = Math.min(hi, data.length - 1);
  for (let i = lo; i <= end; i++) if (data[i] > peak) peak = data[i];
  return peak / 255;
}

/** Average value across a bin range, normalised to [0, 1]. */
export function binAvg(data: Uint8Array | null, lo: number, hi: number): number {
  if (!data) return 0;
  const end = Math.min(hi, data.length - 1);
  let sum = 0;
  for (let i = lo; i <= end; i++) sum += data[i];
  return sum / (end - lo + 1) / 255;
}

/**
 * Weighted energy across multiple sub-ranges with crossover rolloff.
 * Returns 0 if the result falls below `noiseFloor` (hard gate).
 *
 * @param ranges  Array of [startBin, endBin, weight] tuples.
 * @param noiseFloor  Fractional threshold below which output is clamped to 0.
 */
export function weightedBandEnergy(
  data: Uint8Array | null,
  ranges: [number, number, number][],
  noiseFloor: number,
): number {
  if (!data) return 0;
  let totalEnergy = 0;
  let totalWeight = 0;

  for (const [start, end, weight] of ranges) {
    const actualEnd = Math.min(end, data.length - 1);
    for (let i = start; i <= actualEnd; i++) {
      totalEnergy += (data[i] / 255) * weight;
      totalWeight += weight;
    }
  }

  const avg = totalEnergy / totalWeight;
  return avg > noiseFloor ? avg : 0;
}

// ── Canonical three-band split ────────────────────────────────────────────────

export interface ThreeBands {
  /** 0–275 Hz  — kick / sub-bass.  [0, 1] */
  bass: number;
  /** 320–3 500 Hz — vocals / snare.  [0, 1] */
  mids: number;
  /** 3.5–20 kHz — cymbals / air.  [0, 1] */
  highs: number;
}

/**
 * Convenience function that returns all three normalised band energies in one
 * call.  Uses the same crossover rolloff weights as SongSingularity so every
 * visualizer reacts identically to the same audio material.
 */
export function getThreeBands(data: Uint8Array | null): ThreeBands {
  const bass = weightedBandEnergy(
    data,
    [
      [0, 3, 1.0],  // full bass
      [4, 6, 0.2],  // rolloff to mids
    ],
    0.08,           // noise floor — ignore room noise / very quiet passages
  );

  const mids = weightedBandEnergy(
    data,
    [
      [7,  10, 0.3],  // rolloff from bass
      [11, 75, 1.0],  // full mids
      [76, 81, 0.3],  // rolloff to highs
    ],
    0.10,
  );

  const highs = weightedBandEnergy(
    data,
    [
      [82,  84, 0.3],  // rolloff from mids
      [85, 116, 1.0],  // full highs
    ],
    0.12,
  );

  return { bass, mids, highs };
}
