# Lumina

Lumina is a visual music player that turns your songs into immersive experiences. Upload your tracks, add lyrics, and create stunning visualizers that sync with your music in real-time. Use music videos for songs that have them.

## ⚡ Quick Start

1. **Get Lumina:** Clone from https://github.com/death-beach/lumina.git
2. **Run the setup wizard**
3. **Enter your artist name, song info, and lyrics**
4. **Add your music and video files**
5. **(Optional) Enter a link to your store**
6. **Deploy to Vercel**
7. **Enhance visuals**

## Before You Start

You'll need:

- **Your music files** (MP3s, MP4s for videos)
- **Track list**
- **Optional:** lyrics (timed or not), MP4 video files, store URL
- **Node.js 18 or higher** (free download from nodejs.org)
- **A GitHub account** (free)
- **A Vercel account** (free)
- **See Tips and Features section on using visualizer prompts**

## Setup Your Project

1. **Clone the repository:**

   ```bash
   git clone https://github.com/death-beach/lumina.git
   cd lumina
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the setup wizard:**

   ```bash
   npm run setup
   ```

   This will ask you for your artist name, album details, track names, and lyrics. **You can use any filenames for your music files** — the wizard will tell you exactly what to name each file.

4. **Add your music files:**
   - The setup wizard will open your `public/tracks/` folder automatically
   - Copy and paste your MP3 files into it — use the exact filenames you entered during setup

5. **Add lyrics (optional):**
   - For timed lyrics: The wizard auto-saves `.lrc` files to `public/lyrics/`
   - For simple lyrics: Just paste your lyrics in the wizard — no files needed

6. **Add music videos (optional):**
   - Place MP4 files in the `public/videos/` folder
   - Name them exactly as the setup wizard instructed

7. **Test locally:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 to see your visualizer!

**Made a mistake?** Just run `npm run setup` again — it's safe and will overwrite your config.

## Deploy to the Web

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "my tracks"
   git push
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your GitHub repository
   - Deploy!

3. **Add a custom domain (optional):**
   - In Vercel dashboard, go to your project settings
   - Add your domain under "Domains"

4. **Set up a subdomain (optional):**
   > Perfect for hosting your Lumina player at something like `album.yourname.com` or `music.yoursite.com`.
   - In your domain registrar (GoDaddy, Namecheap, Squarespace, etc.), go to your DNS settings
   - Add a **CNAME record** with:
     - **Name/Host:** `album` (or whatever prefix you want)
     - **Value/Target:** `cname.vercel-dns.com`
   - Back in Vercel, go to your project → Settings → Domains → Add Domain
   - Enter `album.yoursite.com` — Vercel will verify the CNAME and activate it
   - DNS changes can take a few minutes to a few hours to propagate

## Tips & Features

### Adding More Tracks and Fixing Mistakes

Run `npm run setup` again to add tracks or make changes. You'll re-enter all your tracks — this overwrites the config completely.

### Music Videos

The setup wizard will ask if each track is a music video. Video tracks don't need separate audio files.

### Lyrics

The setup wizard handles everything automatically:

- **Paste your lyrics** when asked — the wizard auto-detects if they have timestamps
- **Timed lyrics** (with `[00:15.30]` timestamps) get saved as `.lrc` files and sync with the music
- **Simple lyrics** (no timestamps) display as a scrollable list
- **No manual file handling needed** — just paste and go!

### Visualizers

Use docs/SceneCreationGuide.md to create stunning visulizers in the LLM of your choice. Gemini Pro or Claude or Grok recommended. Follow docs/Use_New_Visualizer_Inst.md to use your newly created visualizer for a song.

### Store Link

Add a `storeUrl` in your `lumina.config.ts` to link fans to your merch store. The 🛍️ button in the player will open it in a new tab.

### Customization

Edit `lumina.config.ts` to change colors, fonts, and visualizer scenes. No coding required!

## Support

If you run into issues, check that:

- Your MP3 files are in `public/tracks/`
- You have Node.js 18+

Enjoy your visual music experience! 🎵✨
