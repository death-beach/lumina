#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Lumina Setup Wizard
// Run with: npm run setup
// ─────────────────────────────────────────────────────────────────────────────

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { execSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const rl = readline.createInterface({ input, output });

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

function print(msg = "") {
  console.log(msg);
}

function header(msg) {
  print(`\n${BOLD}${CYAN}${msg}${RESET}`);
}

function success(msg) {
  print(`${GREEN}✓ ${msg}${RESET}`);
}

function warn(msg) {
  print(`${YELLOW}⚠  ${msg}${RESET}`);
}

function dim(msg) {
  print(`${DIM}${msg}${RESET}`);
}

async function ask(question, fallback = "") {
  const hint = fallback ? ` ${DIM}(${fallback})${RESET}` : "";
  const answer = await rl.question(`  ${question}${hint}: `);
  return answer.trim() || fallback;
}

async function askYesNo(question, defaultYes = false) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await rl.question(`  ${question} ${DIM}(${hint})${RESET}: `);
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return defaultYes;
  return normalized === "y" || normalized === "yes";
}

// ─────────────────────────────────────────────────────────────────────────────

print("");
print(`${BOLD}${CYAN}╔══════════════════════════════════════╗${RESET}`);
print(`${BOLD}${CYAN}║       Welcome to Lumina Setup        ║${RESET}`);
print(`${BOLD}${CYAN}╚══════════════════════════════════════╝${RESET}`);
print("");
dim("This will configure your visualizer. Takes about 60 seconds.");
print("");

// ── Artist name ──────────────────────────────────────────────────────────────
header("Artist");
const artistName = await ask("Your artist name");

if (!artistName) {
  warn("Artist name is required. Please run npm run setup again.");
  rl.close();
  process.exit(1);
}

// ── Album title (optional) ────────────────────────────────────────────────────
header("Album (optional)");
dim("  If you're releasing a full album, enter its title. Otherwise press Enter to skip.");
const albumTitle = await ask("Album title", "");

// ── Tracks ────────────────────────────────────────────────────────────────────
header("Tracks");
const trackCountStr = await ask("How many tracks?", "1");
const trackCount = Math.max(1, Math.min(50, parseInt(trackCountStr, 10) || 1));

const trackNames = [];
for (let i = 1; i <= trackCount; i++) {
  const name = await ask(`Track ${i} name`);
  trackNames.push(name || `Track ${i}`);
}

// ── File naming instructions ──────────────────────────────────────────────────
print("");
print(`${BOLD}────────────────────────────────────────────────────────${RESET}`);
header("Next: Add your MP3 files");
print("");
print("  Drop your tracks into the  public/tracks/  folder and name them:");
print("");

for (let i = 0; i < trackNames.length; i++) {
  print(`    ${CYAN}public/tracks/track${i + 1}.mp3${RESET}  →  ${BOLD}${trackNames[i]}${RESET}`);
}

print("");
warn("The order above must match the order you entered your track names.");
print(`${BOLD}────────────────────────────────────────────────────────${RESET}`);

// ── Wait for confirmation ─────────────────────────────────────────────────────
print("");
await askYesNo("Done adding your MP3 files?", true);

// ── Build config ──────────────────────────────────────────────────────────────
const tracks = trackNames.map((title, i) => ({
  id: `track-${String(i + 1).padStart(2, "0")}`,
  title,
  src: `/tracks/track${i + 1}.mp3`,
}));

const configContent = generateConfig({ artistName, albumTitle, tracks });

const configPath = join(ROOT, "lumina.config.ts");
writeFileSync(configPath, configContent, "utf-8");

print("");
success("lumina.config.ts saved.");

// ── Deploy ────────────────────────────────────────────────────────────────────
print("");
header("Deploy to Vercel");
dim("  Run this command to save your changes and trigger a Vercel deploy:");
print("");
print(`  ${BOLD}${CYAN}git add . && git commit -m "my tracks" && git push${RESET}`);
print("");

const shouldDeploy = await askYesNo("Run this now?", false);

if (shouldDeploy) {
  print("");
  print("  Deploying...");
  try {
    execSync('git add . && git commit -m "my tracks" && git push', {
      cwd: ROOT,
      stdio: "inherit",
    });
    print("");
    success("Pushed! Vercel will deploy automatically.");
  } catch {
    warn("Git push failed. You may need to run the command manually.");
    print(`  ${CYAN}git add . && git commit -m "my tracks" && git push${RESET}`);
  }
} else {
  print("  When you're ready, run:");
  print(`  ${BOLD}${CYAN}git add . && git commit -m "my tracks" && git push${RESET}`);
}

print("");
success("Setup complete. Enjoy Lumina!");
print("");

rl.close();

// ─────────────────────────────────────────────────────────────────────────────
// Config generator
// ─────────────────────────────────────────────────────────────────────────────

function generateConfig({ artistName, albumTitle, tracks }) {
  const hasAlbum = albumTitle && albumTitle.trim().length > 0;

  const tracksCode = tracks
    .map(
      (t, i) => `    {
      id: "${t.id}",
      title: "${escStr(t.title)}",
      src: "${t.src}",
      visual: {
        type: "reactive",
        scene: "particles",
      },
    }${i < tracks.length - 1 ? "," : ""}`
    )
    .join("\n");

  const albumBlock = hasAlbum
    ? `
  album: {
    title: "${escStr(albumTitle)}",
  },`
    : `
  album: null,`;

  return `// lumina.config.ts
// Generated by npm run setup — edit freely.

import type { LuminaConfig } from "@/lib/config";

const config: LuminaConfig = {
  artist: {
    name: "${escStr(artistName)}",
  },
${albumBlock}

  theme: {
    accentColor: "#a78bfa",
    backgroundColor: "#080810",
    blurIntensity: "medium",
    fontDisplay: "inter",
  },

  tracks: [
${tracksCode}
  ],

  features: {
    showPlaylist: true,
    autoplayNext: true,
  },
};

export default config;
`;
}

function escStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
