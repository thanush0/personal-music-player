# Canvas Setup for Your File Structure

## ✅ Current Understanding

Your music files are stored like this:
```
C:\Users\thanu\Music\
├── Djo - End Of Beginning (Lyrics).flac
├── Djo - End Of Beginning (Lyrics).mp3
├── why mona - Wannabe (Lyrics).m4a
└── ... (other tracks)
```

**Note**: Your earlier example showed a different structure (`C:\Djo\End of Beginning\`), but your actual files are in the flat structure above.

## 🎯 How to Add Canvas to Your Tracks

For Canvas to work, you need to place `canvas.mp4` in the **same folder** as your audio files.

### Option 1: Same folder as audio file (Flat structure)

```
C:\Users\thanu\Music\
├── Djo - End Of Beginning (Lyrics).flac
├── canvas.mp4                    ← Add this for ALL tracks in folder
└── cover.jpg                     ← Add this for ALL tracks in folder
```

**⚠️ Problem**: This only works if you have ONE canvas for ALL tracks in that folder.

### Option 2: Organize into subfolders (Recommended)

Move your tracks into artist/album folders:

```
C:\Users\thanu\Music\
├── Djo\
│   └── End of Beginning\
│       ├── End of Beginning.flac
│       ├── canvas.mp4              ← Specific to this track
│       ├── cover.jpg               ← Specific to this track
│       └── lyrics.lrc
│
└── why mona\
    └── Wannabe\
        ├── Wannabe.m4a
        ├── canvas.mp4              ← Specific to this track
        └── cover.jpg               ← Specific to this track
```

## 🚀 Quick Test Setup

### Step 1: Create a test folder structure

For testing, let's organize ONE track properly:

```bash
# Create folder for one song
mkdir "C:\Users\thanu\Music\Djo - End Of Beginning"

# Move the audio file
move "C:\Users\thanu\Music\Djo - End Of Beginning (Lyrics).flac" "C:\Users\thanu\Music\Djo - End Of Beginning\"

# Now add Canvas video
# (You'll need to create or copy canvas.mp4 to this folder)
```

### Step 2: Add Canvas video

```bash
cd "C:\Users\thanu\Music\Djo - End Of Beginning"

# Create a simple 10-second Canvas from an image
# (You need FFmpeg installed)
ffmpeg -loop 1 -i cover.jpg \
  -vf "zoompan=z='min(zoom+0.0015,1.5)':d=250:s=720x720:fps=25" \
  -t 10 -c:v libx264 -preset fast -crf 20 \
  -pix_fmt yuv420p -an canvas.mp4
```

### Step 3: Final structure

```
C:\Users\thanu\Music\Djo - End Of Beginning\
├── Djo - End Of Beginning (Lyrics).flac   ← Your audio
├── canvas.mp4                              ← Canvas video (NEW)
└── cover.jpg                               ← Album art
```

### Step 4: Rescan library

Restart your backend to scan the new structure:
```bash
cd backend
python main.py
```

### Step 5: Test in UI

1. Start frontend: `npm start`
2. Find "Djo - End Of Beginning"
3. Click it
4. Canvas should play! 🎉

## 🎬 Creating Canvas Videos

### If you have cover.jpg:

```bash
# Simple zoom effect (10 seconds)
ffmpeg -loop 1 -i cover.jpg \
  -vf "zoompan=z='min(zoom+0.0015,1.5)':d=250:s=720x720:fps=25" \
  -t 10 -c:v libx264 -preset fast -crf 20 \
  -pix_fmt yuv420p -an canvas.mp4
```

### If you need to extract cover from audio:

```bash
# Extract cover from FLAC
ffmpeg -i "Djo - End Of Beginning (Lyrics).flac" -an -vcodec copy cover.jpg

# Then create Canvas from extracted cover
ffmpeg -loop 1 -i cover.jpg \
  -vf "zoompan=z='min(zoom+0.0015,1.5)':d=250:s=720x720:fps=25" \
  -t 10 -c:v libx264 -preset fast -crf 20 \
  -pix_fmt yuv420p -an canvas.mp4
```

## 📝 Recommended File Organization

For best Canvas experience, organize your music like this:

```
C:\Users\thanu\Music\
├── Artist 1\
│   ├── Album 1\
│   │   ├── Track 1.flac
│   │   ├── canvas.mp4        ← Unique per track
│   │   ├── cover.jpg
│   │   └── lyrics.lrc
│   └── Album 2\
│       ├── Track 2.flac
│       ├── canvas.mp4        ← Different Canvas
│       └── cover.jpg
│
└── Artist 2\
    └── Song\
        ├── song.flac
        ├── canvas.mp4
        └── cover.jpg
```

## ⚡ Quick Canvas Batch Script

If you want to create Canvas for all your tracks:

```powershell
# PowerShell script to create Canvas for all tracks
Get-ChildItem "C:\Users\thanu\Music" -Filter "*.flac" | ForEach-Object {
    $folder = $_.DirectoryName
    $coverPath = Join-Path $folder "cover.jpg"
    $canvasPath = Join-Path $folder "canvas.mp4"
    
    # Extract cover if it doesn't exist
    if (-not (Test-Path $coverPath)) {
        ffmpeg -i $_.FullName -an -vcodec copy $coverPath
    }
    
    # Create Canvas if it doesn't exist
    if (-not (Test-Path $canvasPath) -and (Test-Path $coverPath)) {
        ffmpeg -loop 1 -i $coverPath `
          -vf "zoompan=z='min(zoom+0.0015,1.5)':d=250:s=720x720:fps=25" `
          -t 10 -c:v libx264 -preset fast -crf 20 `
          -pix_fmt yuv420p -an $canvasPath
    }
}
```

## 🎯 Summary

### Current Status:
- ✅ Backend supports `canvas.mp4` naming
- ✅ Backend checks same folder as audio file
- ✅ Frontend Canvas component ready

### What You Need to Do:
1. **Organize one track into a folder** (test)
2. **Add canvas.mp4 to that folder**
3. **Restart backend** to rescan
4. **Test in UI**
5. **Repeat for other tracks** if it works!

### File Naming Support:
- ✅ `canvas.mp4` (your preference)
- ✅ `animated_cover.mp4` (fallback)
- ✅ `cover.jpg` (static fallback)

---

**Ready to test?** 

Pick your favorite track, organize it into a folder, add a Canvas video, and see it play in Now Playing! 🚀
