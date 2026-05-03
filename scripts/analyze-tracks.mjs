#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Lumina Audio Analyzer
// ─────────────────────────────────────────────────────────────────────────────
//
// Reads every MP3 in /public/tracks/, computes per-frame frequency-band data
// matching what the live Web Audio AnalyserNode would produce, and writes a
// compact binary file alongside each MP3 (e.g. `Grateful.mp3.frames.bin`).
//
// The visualizer hooks (useAudioData) load this file at runtime and feed the
// data to the visualizer scenes — identical output to the live analyser, but
// works on iPhone Safari with the silent switch on, because audio is now
// played through the HTML <audio> element (Media bucket on iOS) instead of
// Web Audio (Ringer bucket).
//
// Runs automatically:
//   - In the Vercel build pipeline (via the `prebuild` npm script)
//   - At the end of `npm run setup` (so local dev works the moment files land)
//
// Re-runs are idempotent: if a `.frames.bin` is newer than its `.mp3`, the
// track is skipped. Delete the .bin to force re-analysis.
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import audioDecode from "audio-decode";
import FFT from "fft.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TRACKS_DIR = join(ROOT, "public/tracks");

// ── Analysis parameters ──────────────────────────────────────────────────────
// These values are chosen to match what useAudio's live AnalyserNode produced
// before the iOS silent-switch fix, so the visualizers behave identically.
const FFT_SIZE = 512;          // matches analyser.fftSize
const N_OUT_BINS = 128;        // we store 128 bins per frame (covers 0–11 kHz
//                                at 44.1 kHz; the band split in
//                                lib/audioAnalysis.ts only reads up to bin 116)
const FRAME_FPS = 30;          // matches the throttle in useAudioData
const SMOOTHING = 0.7;         // matches analyser.smoothingTimeConstant
const MIN_DB = -100;           // matches analyser.minDecibels (default)
const MAX_DB = -30;            // matches analyser.maxDecibels (default)

// Hann window — applied per-frame before FFT to reduce spectral leakage.
const hann = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
  hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
}

// ── Header format (16 bytes) ─────────────────────────────────────────────────
// Bytes 0–3   : Magic "LFFT"
// Byte 4      : Version (1)
// Byte 5      : Bins per frame
// Byte 6      : FPS
// Byte 7      : Reserved (0)
// Bytes 8–11  : Total frames (uint32 LE)
// Bytes 12–15 : Sample rate (uint32 LE)
// Then        : N_OUT_BINS × totalFrames bytes of frame data
const HEADER_SIZE = 16;

// ─────────────────────────────────────────────────────────────────────────────

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function isUpToDate(mp3Path, binPath) {
  if (!(await fileExists(binPath))) return false;
  const [mp3Stat, binStat] = await Promise.all([stat(mp3Path), stat(binPath)]);
  return binStat.mtimeMs >= mp3Stat.mtimeMs;
}

async function analyze(mp3Path) {
  const buf = await readFile(mp3Path);
  // audio-decode auto-detects format from the first bytes; no extension hint
  // needed. In Node it returns a plain `{ channelData, sampleRate }` object,
  // not a real AudioBuffer instance.
  const audioBuffer = await audioDecode(buf);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.channelData; // Float32Array[]
  const ch0 = channelData[0];
  const ch1 = channelData.length > 1 ? channelData[1] : null;

  // Mix to mono for analysis (matches what listeners hear via masterGain).
  const len = ch0.length;
  const samples = new Float32Array(len);
  if (ch1) {
    for (let i = 0; i < len; i++) samples[i] = (ch0[i] + ch1[i]) * 0.5;
  } else {
    samples.set(ch0);
  }

  const hop = Math.floor(sampleRate / FRAME_FPS);
  const totalFrames = Math.max(0, Math.floor((len - FFT_SIZE) / hop) + 1);

  const fft = new FFT(FFT_SIZE);
  const fftIn = fft.createComplexArray();
  const fftOut = fft.createComplexArray();

  // Persistent smoothing buffer — exponential smoothing matches Web Audio's
  // analyser.smoothingTimeConstant behaviour: smoothed = α·prev + (1−α)·mag.
  const smoothed = new Float32Array(FFT_SIZE / 2);

  const data = new Uint8Array(N_OUT_BINS * totalFrames);

  for (let f = 0; f < totalFrames; f++) {
    const off = f * hop;

    // Pack windowed samples into the complex input array (imag = 0).
    for (let i = 0; i < FFT_SIZE; i++) {
      fftIn[i * 2] = samples[off + i] * hann[i];
      fftIn[i * 2 + 1] = 0;
    }
    fft.transform(fftOut, fftIn);

    for (let bin = 0; bin < N_OUT_BINS; bin++) {
      const re = fftOut[bin * 2];
      const im = fftOut[bin * 2 + 1];
      // Magnitude, normalised by FFT size (matches Web Audio's internal
      // scaling closely enough for visualizer purposes).
      const mag = Math.sqrt(re * re + im * im) / FFT_SIZE;

      smoothed[bin] = SMOOTHING * smoothed[bin] + (1 - SMOOTHING) * mag;

      // Convert to dB and quantise to 0–255 the same way getByteFrequencyData
      // does. Magnitudes ≤ 0 map to 0 (no signal).
      const db =
        smoothed[bin] > 0 ? 20 * Math.log10(smoothed[bin]) : Number.NEGATIVE_INFINITY;
      const v = ((db - MIN_DB) / (MAX_DB - MIN_DB)) * 255;
      data[f * N_OUT_BINS + bin] = v < 0 ? 0 : v > 255 ? 255 : v | 0;
    }
  }

  // Build the file: 16-byte header + raw frame bytes.
  const out = Buffer.alloc(HEADER_SIZE + data.byteLength);
  out.write("LFFT", 0, "ascii");
  out.writeUInt8(1, 4);              // version
  out.writeUInt8(N_OUT_BINS, 5);     // bins per frame
  out.writeUInt8(FRAME_FPS, 6);      // fps
  out.writeUInt8(0, 7);              // reserved
  out.writeUInt32LE(totalFrames, 8); // frame count
  out.writeUInt32LE(sampleRate, 12); // sample rate
  Buffer.from(data.buffer).copy(out, HEADER_SIZE);

  return { out, totalFrames, sampleRate };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!(await fileExists(TRACKS_DIR))) {
    console.log("[lumina:analyze] No public/tracks/ directory — skipping.");
    return;
  }

  const entries = await readdir(TRACKS_DIR);
  const mp3s = entries.filter((n) => /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(n));

  if (mp3s.length === 0) {
    console.log("[lumina:analyze] No audio files in public/tracks/ — skipping.");
    return;
  }

  let analyzed = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of mp3s) {
    const mp3Path = join(TRACKS_DIR, name);
    const binPath = `${mp3Path}.frames.bin`;

    try {
      if (await isUpToDate(mp3Path, binPath)) {
        skipped++;
        continue;
      }

      const t0 = Date.now();
      const { out, totalFrames, sampleRate } = await analyze(mp3Path);
      await writeFile(binPath, out);
      const ms = Date.now() - t0;
      const sec = (totalFrames / FRAME_FPS).toFixed(1);
      const kb = (out.byteLength / 1024).toFixed(0);
      console.log(
        `[lumina:analyze] ✓ ${name} — ${sec}s @ ${sampleRate}Hz, ${totalFrames} frames, ${kb} KB (${ms} ms)`,
      );
      analyzed++;
    } catch (err) {
      failed++;
      console.error(`[lumina:analyze] ✗ ${name} — ${err?.message || err}`);
      // Don't fail the build for one bad track; the visualizer will fall back
      // to silence-pattern data and audio will still play.
    }
  }

  console.log(
    `[lumina:analyze] Done — ${analyzed} analyzed, ${skipped} up-to-date, ${failed} failed.`,
  );
}

main().catch((err) => {
  console.error("[lumina:analyze] Fatal error:", err);
  // Don't fail the build — see comment in the catch above.
  process.exit(0);
});
