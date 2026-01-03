# Now Playing - Quick Start Guide

## 🎯 What Changed

Frontend fixes applied to make Now Playing 100% reliable:
✅ Quality switching is now seamless (no page reload)
✅ Lyrics are fetched once and cached (no duplicates)
✅ Mini-player hides when expanded player is open
✅ Canvas falls back to cover gracefully
✅ All API URLs configurable via environment

---

## 🚀 How to Test

### 1. Start the app
```bash
npm start
```

### 2. Click on any song to open Now Playing
- Expanded player should open fullscreen
- Bottom mini-player should disappear
- Cover image should appear
- If canvas.mp4 exists, video plays (muted, looping)

### 3. Test Lyrics
- If lyrics.lrc exists → lyrics appear and scroll with playback
- If no lyrics → shows "Lyrics not available"
- **BLOCKED:** Backend /tracks/{id}/lyrics endpoint returns 405
  - To enable: Backend must implement GET /tracks/{id}/lyrics

### 4. Test Quality Switching
- Click "Enhanced Audio" in bottom player
- Audio switches to enhanced quality (if available)
- Playback position preserved
- **Improved:** No page reload anymore

### 5. Test Controls
- Play/pause works
- Next/prev works
- Seek on progress bar works
- Close with X button or Escape key works

### 6. Check Console
```bash
# Clean console (no spam)
npm start

# Debug mode (see what's happening)
REACT_APP_DEBUG=true npm start
```

---

## ⚠️ Known Issues (Backend-Dependent)

### Lyrics Return 405
**Problem:** GET /tracks/{id}/lyrics returns 405 (Method Not Allowed)
**Impact:** Lyrics show "not available" even when lyrics.lrc exists
**Solution:** Backend must enable GET endpoint

**Test:**
```bash
curl http://localhost:8000/tracks/{trackId}/lyrics
# Should return 200 + text, not 405
```

### Canvas Might Not Load
**Problem:** If canvas.mp4 doesn't exist or endpoint returns 404
**Impact:** Fallback to cover image (working correctly)
**Solution:** Verify canvas.mp4 in track folder

---

## 📋 Backend Contract (Endpoints)

For Now Playing to work perfectly, backend must provide:

```
GET /tracks/{id}
→ 200 + metadata.json fields

GET /tracks/{id}/cover
→ 200 + image/jpeg

GET /tracks/{id}/animated-cover
→ 200 + video/mp4 (if canvas.mp4 exists)
→ 404 (if not, frontend falls back to cover)

GET /tracks/{id}/lyrics ⚠️ BLOCKED (returns 405)
→ 200 + text/plain OR application/json

GET /tracks/{id}/stream?quality=standard|enhanced
→ 200 + audio/flac
```

---

## 🔧 Environment Variables

```bash
# Custom API URL
REACT_APP_API_URL=http://your-api:8000

# Debug mode (shows detailed logs)
REACT_APP_DEBUG=true

# Example
REACT_APP_DEBUG=true REACT_APP_API_URL=http://localhost:8000 npm start
```

---

## 📊 What Was Fixed

### Before
- Quality switch reloaded entire page (lost playback position)
- Lyrics fetched twice (duplicate requests)
- Mini-player and expanded player both showed controls (confusing)
- No shared cache between components

### After
- Quality switch is seamless (preserves position and state)
- Lyrics fetched once (shared cache)
- Only one set of controls visible at a time
- Centralized lyrics service eliminates duplication

---

## ✅ Verification Checklist

Run this to confirm everything works:

```
CANVAS:
[ ] Cover image loads immediately
[ ] Video plays if canvas.mp4 exists
[ ] Falls back to cover if missing
[ ] Video is muted and looping

LYRICS:
[ ] Network tab shows ONE /lyrics request (not two)
[ ] Lyrics sync with playback (timestamps match)
[ ] Shows "Lyrics not available" if no lyrics
[ ] No errors in console

QUALITY:
[ ] Click "Enhanced Audio"
[ ] Audio switches without reload
[ ] Position preserved
[ ] Play/pause state preserved

CONTROLS:
[ ] Play/pause works
[ ] Next/prev works
[ ] Seek works
[ ] Escape closes expanded player

UI:
[ ] Mini-player hidden when expanded open
[ ] Mini-player shows when expanded closes
[ ] No console errors
```

---

## 🐛 Troubleshooting

### Lyrics show "not available" even though they exist
**Cause:** Backend /tracks/{id}/lyrics returns 405
**Fix:** Backend must enable GET endpoint (implement it)

### Page reloads when switching quality
**Cause:** This should be fixed now
**Check:** Console for errors, Network tab for unexpected requests

### Duplicate lyrics requests in Network tab
**Cause:** This should be fixed now (centralized service)
**Check:** Clear cache (Ctrl+Shift+Delete) and retry

### Canvas video doesn't play
**Cause:** Could be missing canvas.mp4 or endpoint returns 404
**Check:** Browser console for errors, check track folder for canvas.mp4
**Fallback:** Cover image should appear instead (working correctly)

### API URL wrong
**Fix:** Set `REACT_APP_API_URL` environment variable
```bash
REACT_APP_API_URL=http://your-server:8000 npm start
```

---

## 📞 Next Steps

1. **Backend task:** Enable GET /tracks/{id}/lyrics endpoint
2. **Verify:** Run the checklist above
3. **Test:** Each checkbox should pass
4. **Report:** Any failures to help debug

---

**Status:** Frontend complete, awaiting backend lyrics endpoint
