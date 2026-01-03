# 🎵 Local Music Player - Complete Setup Guide

## Current Status: ✅ Backend Ready | ⚠️ Music Library Empty

Your music player is **fully functional** - you just need to add music files!

---

## 📁 Required Folder Structure

The backend expects music files in this structure:

```
music_library/
├── Artist Name/
│   ├── Album Name/
│   │   ├── track.flac                  ✅ REQUIRED (main audio file)
│   │   ├── track_enhanced.flac         ⚠️ OPTIONAL (ignored in library view)
│   │   ├── cover.jpg                   ✅ RECOMMENDED (album artwork)
│   │   ├── canvas.mp4                  ✅ RECOMMENDED (Spotify-style video)
│   │   ├── lyrics.lrc                  ⚠️ OPTIONAL (synchronized lyrics)
│   │   └── metadata.json               ⚠️ OPTIONAL (track metadata)
```

### Example:
```
music_library/
├── Djo/
│   ├── DECIDE/
│   │   ├── End of Beginning.flac
│   │   ├── cover.jpg
│   │   ├── canvas.mp4
│   │   └── lyrics.lrc
├── The Weeknd/
│   ├── After Hours/
│   │   ├── Blinding Lights.flac
│   │   ├── cover.jpg
│   │   └── canvas.mp4
```

---

## 🚀 Quick Start Options

### Option 1: Use the YouTube Downloader (Built-in!)

The backend includes a **YouTube downloader** that automatically:
- Downloads audio in FLAC format
- Extracts metadata
- Fetches lyrics from Genius
- Generates canvas.mp4 video
- Organizes files correctly

**To use it:**

1. Start the backend:
   ```bash
   cd backend
   python main.py
   ```

2. Download a song via API:
   ```bash
   curl -X POST "http://localhost:8000/download/youtube" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
   ```

   Or use the frontend Download page (if implemented).

### Option 2: Copy Your Existing Music Files

1. Create folder structure:
   ```bash
   mkdir -p "music_library/Artist Name/Album Name"
   ```

2. Copy your FLAC/MP3 files:
   ```bash
   cp /path/to/your/music.flac "music_library/Artist Name/Album Name/"
   ```

3. Add album artwork (optional but recommended):
   ```bash
   cp /path/to/cover.jpg "music_library/Artist Name/Album Name/cover.jpg"
   ```

4. Add canvas video (optional - for Spotify-style experience):
   - Place a 9:16 vertical video as `canvas.mp4`
   - Or generate one using FFmpeg (see below)

---

## 🎨 Creating Canvas Videos (Spotify-Style)

Canvas videos are short (~8 second) vertical looping videos that play in the background.

### Method 1: Extract from YouTube Video

```bash
ffmpeg -i "input_video.mp4" -ss 00:01:00 -t 8 \
  -vf "crop=ih*9/16:ih,scale=720:1280" \
  -c:v libx264 -preset fast -crf 23 \
  -pix_fmt yuv420p -an "music_library/Artist/Album/canvas.mp4"
```

### Method 2: Use Existing Short Clips

Just ensure the video is:
- **Format:** MP4
- **Aspect ratio:** 9:16 (vertical)
- **Duration:** 5-15 seconds
- **No audio** (optional - audio is muted during playback)

---

## 🎤 Adding Lyrics

### Format: `.lrc` (Synchronized Lyrics)

```lrc
[00:12.00]First line of lyrics
[00:15.50]Second line of lyrics
[00:19.00]Third line of lyrics
```

### Where to Get Lyrics:
- Genius.com (built into YouTube downloader)
- LRCLIB.net
- Manual creation

---

## 🔄 How the Backend Works

### 1. **Automatic Scanning**

When you start the backend, it automatically:
- Scans `./music_library` folder
- Finds all `.flac`, `.mp3`, `.m4a`, `.ogg`, `.wav` files
- **Filters out** `*_enhanced.flac` files (these are quality variants, not separate tracks)
- Extracts metadata (title, artist, album, duration)
- Stores everything in `music_library.db` SQLite database

### 2. **Asset Detection**

For each track, the backend checks the track's folder for:
- `cover.jpg` → Exposed as `/tracks/{id}/cover`
- `canvas.mp4` OR `animated_cover.mp4` → Exposed as `/tracks/{id}/animated-cover`
- `lyrics.lrc` → Loaded and included in track response

### 3. **No Duplicates**

- `*_enhanced.flac` files are NOT shown as separate tracks
- They're linked to the original track as a quality option
- UI shows: "🎵 Enhanced Audio Available"

---

## 🧪 Testing Your Setup

### 1. Check if Backend Sees Your Music

```bash
curl http://localhost:8000/tracks
```

Expected: List of tracks with metadata

### 2. Test Canvas Video

```bash
curl -I http://localhost:8000/tracks/{TRACK_ID}/animated-cover
```

Expected: `200 OK` if canvas.mp4 exists, `404` if missing

### 3. Test Lyrics

```bash
curl http://localhost:8000/tracks/{TRACK_ID}
```

Expected: Response includes `"lyrics": "..."` if lyrics.lrc exists

---

## 🐛 Troubleshooting

### Issue: "No tracks found"

**Cause:** Empty `music_library` folder or backend not running

**Solution:**
1. Add music files to `music_library/Artist/Album/`
2. Restart backend: `cd backend && python main.py`
3. Check logs for "Music library scan complete!"

### Issue: "Canvas video not showing"

**Causes:**
1. No `canvas.mp4` file in track folder
2. File named incorrectly (must be `canvas.mp4` or `animated_cover.mp4`)
3. Video format incompatible

**Solution:**
- Verify file exists: `ls "music_library/Artist/Album/canvas.mp4"`
- Check video format: `ffprobe canvas.mp4`
- Regenerate with correct settings (see "Creating Canvas Videos" above)

### Issue: "Lyrics not showing"

**Causes:**
1. No `lyrics.lrc` file
2. Incorrect encoding (must be UTF-8)
3. Invalid LRC format

**Solution:**
- Verify file exists and is UTF-8 encoded
- Test LRC format at: https://lrc-maker.github.io/

### Issue: "Duplicate tracks appearing"

**Cause:** Bug in music scanner (should already be fixed)

**Solution:**
- Check `music_scanner.py` lines 40-47 for enhanced file filtering
- Manually delete `music_library.db` and restart backend to rescan

---

## 📊 Database Location

All music metadata is stored in:
```
./music_library.db
```

To reset/rescan:
```bash
rm music_library.db
cd backend && python main.py
```

---

## 🎯 What's Already Implemented

✅ **Backend Features:**
- YouTube downloader with metadata extraction
- Canvas video support (canvas.mp4)
- Lyrics support (lyrics.lrc)
- Enhanced audio filtering (*_enhanced.flac hidden from library)
- Automatic library scanning
- RESTful API with Spotify-like structure

✅ **Frontend Features:**
- Spotify-style UI
- Now Playing view with Canvas/Cover display
- Lyrics viewer (SmoothLyrics component)
- Audio enhancement toggle
- Search, playlists, library management

---

## 🎬 Next Steps

1. **Add some music** to `music_library/Artist/Album/` folder
2. **Start backend:** `cd backend && python main.py`
3. **Start frontend:** `npm start`
4. **Open browser:** http://localhost:3000
5. **Click a song** to see the Now Playing view with canvas/lyrics!

---

## 💡 Pro Tips

1. **Canvas videos** make the experience feel like Spotify - highly recommended!
2. **Lyrics** sync with playback for a karaoke-style experience
3. **Enhanced audio** is generated on-demand - try the "Enhance" button in Now Playing
4. Use **YouTube downloader** for easiest setup - it handles everything automatically

---

Need help? Check the backend logs for detailed error messages.
