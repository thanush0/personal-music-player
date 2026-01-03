# 🚀 Quick Test - Get Your Music Player Running Now!

## Current Situation
✅ All code is working correctly  
❌ No music files in library yet  

## 3-Minute Quick Test

### Option 1: Download a Song from YouTube (Easiest)

```powershell
# 1. Start the backend
cd backend
python main.py
```

In a new terminal:
```powershell
# 2. Download a song (replace with any YouTube URL)
curl -X POST "http://localhost:8000/download/youtube" `
  -H "Content-Type: application/json" `
  -d '{\"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\", \"format\": \"flac\", \"quality\": \"best\"}'
```

This will automatically:
- Download audio as FLAC
- Fetch lyrics from Genius
- Generate canvas video
- Create proper folder structure
- Add to database

### Option 2: Use Existing Music File

```powershell
# 1. Create test folder
New-Item -ItemType Directory -Path "music_library\Test Artist\Test Album" -Force

# 2. Copy any music file you have (MP3, FLAC, M4A, etc.)
Copy-Item "C:\path\to\your\song.mp3" "music_library\Test Artist\Test Album\Test Song.mp3"

# 3. Start backend (it will auto-scan)
cd backend
python main.py
```

You should see:
```
Scanning music library at: ./music_library
Found 1 tracks (0 with enhanced versions)
Music library scan complete!
```

### Option 3: Create a Test Structure Manually

```powershell
# Run this PowerShell script to create a test structure
$testFolder = "music_library\Example Artist\Example Album"
New-Item -ItemType Directory -Path $testFolder -Force

# Create a placeholder text file explaining what to do
@"
INSTRUCTIONS:
1. Place your audio files here (MP3, FLAC, M4A, etc.)
2. Optionally add:
   - cover.jpg (album artwork)
   - canvas.mp4 (vertical video, 9:16 ratio)
   - lyrics.lrc (synchronized lyrics)
3. Restart the backend: cd backend && python main.py
"@ | Out-File "$testFolder\README.txt"

Write-Host "✅ Created: $testFolder"
Write-Host "📝 Next: Add your music files to this folder"
```

---

## Starting the Application

Once you have at least one music file:

### Terminal 1: Backend
```powershell
cd backend
python main.py
```

Expected output:
```
INFO:     Started server process
INFO:     Waiting for application startup.
Scanning music library at: ./music_library
Found X tracks (Y with enhanced versions)
Music library scan complete!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Frontend
```powershell
npm start
```

Expected output:
```
Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
```

---

## Testing Features

### 1. Basic Playback
- Open http://localhost:3000
- You should see your song(s) listed
- Click a song → It plays! 🎵

### 2. Canvas Video (if you added canvas.mp4)
- Click a song with canvas.mp4 in its folder
- Now Playing screen shows vertical video background
- Video loops seamlessly

### 3. Lyrics (if you added lyrics.lrc)
- Click a song with lyrics.lrc
- Lyrics panel appears on the right
- Lyrics scroll as the song plays

### 4. Enhanced Audio
- Click "Enhance Audio" button in Now Playing
- Backend generates enhanced version using FFmpeg
- Toggle between Standard/Enhanced quality

---

## Troubleshooting

### "No tracks found"
**Fix:** Make sure you have audio files in `music_library/Artist/Album/` structure

### "Backend won't start"
**Fix:** Install requirements:
```powershell
cd backend
pip install -r requirements.txt
```

### "Frontend won't start"
**Fix:** Install dependencies:
```powershell
npm install
```

### "Canvas not showing"
**Reasons:**
1. No `canvas.mp4` file in track folder → **This is OK, cover.jpg will show instead**
2. Video format incompatible → Regenerate with FFmpeg
3. File named wrong → Must be exactly `canvas.mp4` or `animated_cover.mp4`

### "Lyrics not showing"
**Reasons:**
1. No `lyrics.lrc` file → **This is OK, lyrics are optional**
2. Wrong encoding → Must be UTF-8
3. Invalid format → Check LRC syntax

---

## Example: Download a Real Song

Here's a complete example using the YouTube downloader:

```powershell
# 1. Start backend
cd backend
python main.py
```

In another terminal:
```powershell
# 2. Download "End of Beginning" by Djo
curl -X POST "http://localhost:8000/download/youtube" `
  -H "Content-Type: application/json" `
  -d '{\"url\": \"https://www.youtube.com/watch?v=V_-4yLCqyQ4\"}'
```

Wait for download to complete (~30 seconds), then:

```powershell
# 3. Check what was created
Get-ChildItem -Path "music_library" -Recurse
```

You should see:
```
music_library/
└── Djo/
    └── YouTube Downloads/
        ├── End of Beginning.flac
        ├── cover.jpg
        ├── canvas.mp4
        └── lyrics.lrc
```

Now refresh the frontend → Song appears → Click it → Everything works! 🎉

---

## What You'll See When It Works

### Home Screen
- List of all your songs
- Album artwork
- Artist names
- Play buttons

### Now Playing Screen
- **Large album artwork OR canvas video** (if available)
- Song title and artist
- Playback controls (play, pause, next, previous)
- Progress bar
- Volume slider
- **Lyrics panel** (if available)
- **Enhanced Audio toggle** (if generated)

### Spotify-Style Canvas
- Vertical video playing in background
- Muted, looping seamlessly
- Fades nicely with UI elements
- Fallback to album artwork if no video

---

## Next Steps

1. ✅ **Add music files** to `music_library/`
2. ✅ **Start backend** (`cd backend && python main.py`)
3. ✅ **Start frontend** (`npm start`)
4. ✅ **Enjoy your music!** 🎵

For more details:
- **Setup Guide:** See `SETUP_INSTRUCTIONS.md`
- **Code Verification:** See `DIAGNOSIS_AND_SOLUTION.md`
- **YouTube Downloader API:** See `backend/README.md`

---

**Your music player is ready - just add music and go!** 🚀
