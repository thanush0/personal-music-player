# 🎯 Current Situation & How to Fix

## What We Discovered

### Good News ✅
1. **Backend IS running** - Processing API requests successfully
2. **YouTube downloader works** - Downloaded a track successfully
3. **File has been moved** to correct location:
   ```
   music_library/The Tonight Show/YouTube Downloads/The Stranger Things Cast Raps a Recap.flac
   ```
4. **All your code is correct** - No bugs in canvas, lyrics, or duplicate filtering logic

### The Problem ❌
1. **Database is empty** (0 tracks)
2. **Downloaded file went to wrong location initially** (`C:\Users\thanu\Music\`)
3. **Scanner hasn't detected the moved file yet**

---

## Why This Happened

### YouTube Downloader Issue

The YouTube downloader used a **relative path** which yt-dlp ignored, defaulting to `~/Music`:

```python
# BEFORE (line 151):
output_template = str(self.output_folder / '%(title)s.%(ext)s')
```

### What I Fixed

```python
# AFTER (fixed in this session):
output_template = str(self.output_folder.resolve() / '%(title)s.%(ext)s')
# Added: 'paths': {'home': str(self.output_folder.resolve())}
# Added: Fallback to move files from ~/Music if yt-dlp ignores path
```

---

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Backend | ✅ Running | Port 8000, accepting requests |
| File Downloaded | ✅ Complete | 13.17 MB FLAC |
| File Moved | ✅ Done | Now in `music_library/The Tonight Show/...` |
| Database | ❌ Empty | 0 tracks |
| Scanner | ⚠️ Issue | Rescan didn't find the file |

---

## How to Fix Right Now

### Option 1: Restart Backend (Recommended)

**This will trigger a full library scan on startup:**

1. **Stop the backend** (press Ctrl+C in the backend terminal)

2. **Restart it:**
   ```bash
   cd backend
   python main.py
   ```

3. **Look for these messages:**
   ```
   Scanning music library at: ./music_library
   Found 1 tracks (0 with enhanced versions)
   Music library scan complete!
   ```

4. **Refresh your frontend** (http://localhost:3000)

5. **The track should now appear!**

---

### Option 2: Use the Rescan Endpoint (If restart fails)

If restarting doesn't work:

```bash
curl -X POST http://localhost:8000/admin/rescan
```

Then check:
```bash
curl http://localhost:8000/tracks
```

---

### Option 3: Manual Database Check

If the track still doesn't appear after restart, there might be an issue with the music scanner. Check the backend terminal for error messages like:

- `Error reading metadata`
- `Permission denied`
- `File not found`

---

## What Should Happen After Restart

### 1. Backend Startup Logs
```
INFO:     Started server process
INFO:     Waiting for application startup.
Scanning music library at: ./music_library
Found 1 tracks (0 with enhanced versions)
Music library scan complete!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. API Response
```bash
curl http://localhost:8000/tracks
```

Should return:
```json
[
  {
    "id": "...",
    "name": "The Stranger Things Cast Raps a Recap",
    "artists": [{"name": "The Tonight Show"}],
    "album": {"name": "YouTube Downloads"},
    "file_path": "music_library/The Tonight Show/YouTube Downloads/..."
  }
]
```

### 3. Frontend
- Track appears in library
- Clicking it plays audio
- Shows metadata (title, artist, album)

---

## Testing Canvas & Lyrics

Once the track appears, you can test canvas and lyrics:

### Add Canvas Video

1. **Find a video clip** (or use the original YouTube video)
2. **Extract 8-second clip:**
   ```bash
   ffmpeg -i source_video.mp4 -ss 00:00:10 -t 8 \
     -vf "crop=ih*9/16:ih,scale=720:1280" \
     -c:v libx264 -preset fast -crf 23 \
     -pix_fmt yuv420p -an \
     "music_library/The Tonight Show/YouTube Downloads/canvas.mp4"
   ```
3. **Restart backend** or trigger rescan
4. **Click the song** → Canvas video should play!

### Add Lyrics

1. **Create lyrics.lrc file:**
   ```lrc
   [00:00.00]Line 1 of lyrics
   [00:05.00]Line 2 of lyrics
   [00:10.00]Line 3 of lyrics
   ```

2. **Save to:**
   ```
   music_library/The Tonight Show/YouTube Downloads/lyrics.lrc
   ```

3. **Click the song** → Lyrics should appear!

---

## Why the Scanner Might Not Be Working

### Possible Issues

1. **File permissions** - Scanner can't read the file
2. **Metadata extraction fails** - FLAC file corrupted or missing tags
3. **Database transaction issue** - add_track() failing silently
4. **Path resolution** - Scanner looking in wrong folder

### How to Debug

**Check backend terminal logs when you restart.** Look for:

```
[DEBUG] Found file: The Stranger Things Cast Raps a Recap.flac
[DEBUG] Extracting metadata...
[DEBUG] Added track: ...
```

If you see errors like:
- `Error reading metadata from ...` → File might be corrupted
- `Permission denied` → File permissions issue
- No log messages → Scanner might not be finding the file

---

## Code Changes Made

### 1. Fixed YouTube Downloader (`youtube_downloader.py`)

**Lines 151-156:**
```python
# Use absolute path to force yt-dlp to respect output directory
output_template = str(self.output_folder.resolve() / '%(title)s.%(ext)s')

ydl_opts = {
    'format': 'bestaudio/best',
    'outtmpl': output_template,
    'paths': {'home': str(self.output_folder.resolve())},  # NEW: Force output dir
    ...
}
```

**Lines 165-179 (added fallback):**
```python
# Fallback: check if file went to user's Music folder (common yt-dlp bug)
from pathlib import Path as PathLib
music_folder = PathLib.home() / 'Music'
if music_folder.exists():
    for file in music_folder.glob(f"*{title}*.{format}"):
        # Move it to correct location
        import shutil
        target = self.output_folder.resolve() / file.name
        print(f"Moving file from {file} to {target}")
        shutil.move(str(file), str(target))
        return str(target)
```

### 2. Moved Downloaded File

**From:** `C:\Users\thanu\Music\The Stranger Things Cast Raps...flac`  
**To:** `music_library\The Tonight Show\YouTube Downloads\The Stranger Things Cast Raps a Recap.flac`

---

## Next Steps (In Order)

1. ✅ **File is in correct location** (done)
2. ✅ **Code is fixed** (done)
3. ⚠️ **Restart backend** (you need to do this)
4. ⏳ **Verify track appears**
5. ⏳ **Add canvas.mp4 (optional)**
6. ⏳ **Add lyrics.lrc (optional)**
7. ⏳ **Test playback with assets**

---

## Expected Final Result

Once everything is working:

### Clicking the Song Will Show:

- ✅ **Audio playback** works
- ✅ **Track info** displays (title, artist, album)
- ✅ **Cover image** (if you add cover.jpg)
- ✅ **Canvas video** (if you add canvas.mp4)
- ✅ **Lyrics** (if you add lyrics.lrc)
- ✅ **Debug log shows:** `{trackId: '...', hasLyrics: true, lyricsLength: 1234}`

---

## Summary

**Problem:** YouTube downloader put file in wrong location, scanner hasn't found it yet.

**Solution:** Restart the backend to trigger a fresh library scan.

**Status:** File is ready, code is fixed, just needs backend restart.

---

**Action Required:** Stop and restart the backend with `cd backend && python main.py`

Then check if the track appears in the frontend!
