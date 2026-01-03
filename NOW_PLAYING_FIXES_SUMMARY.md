# Now Playing Experience - Fixes Applied

## ✅ FIXES COMPLETED (Frontend)

### 1. Removed Page Reload on Quality Switch ✓
**Status:** FIXED
**Files Modified:** `src/components/Layout/components/PlayingBar/AudioEnhancementControl.tsx`
**Changes:**
- Removed `window.location.reload()` from `handleEnhanceTrack()` (line 61)
- Removed `window.location.reload()` from `handleDeleteEnhanced()` (line 77)
- Quality switches now use `localPlayerService.switchQuality()` seamlessly
- Preserves playback position and state during quality switch

**Impact:** Users can toggle between standard/enhanced audio without jarring page reload

---

### 2. Centralized Lyrics Fetching ✓
**Status:** FIXED
**Files Created:** `src/utils/lyricsService.ts` (NEW)
**Files Modified:** 
- `src/components/ExpandedPlayer/ExpandedPlayer.tsx`
- `src/components/Layout/components/NowPlaying/Details/SmoothLyrics.tsx`

**Changes:**
- Created `lyricsService.ts` with:
  - `fetchLyrics(trackId)` - Shared cache, prevents duplicate requests
  - `parseLyrics(text)` - Unified LRC parser (handles [MM:SS.cc] format)
  - `getParsedLyrics(trackId)` - Parsed + cached results
- Updated ExpandedPlayer to use `fetchLyrics` + `parseLyrics`
- Updated SmoothLyrics to use same service
- Removed duplicate local caches in both components

**Impact:** 
- One lyrics request per track (not two)
- Shared cache across all components
- Both ExpandedPlayer and SmoothLyrics show consistent lyrics

---

### 3. Standardized API URL Handling ✓
**Status:** FIXED
**Files Modified:** `src/components/Layout/components/PlayingBar/AudioEnhancementControl.tsx`
**Changes:**
- Replaced hardcoded `http://localhost:8000` with `process.env.REACT_APP_API_URL || 'http://localhost:8000'`
- Applied to all axios calls in AudioEnhancementControl
- Consistent with ExpandedPlayer and other components

**Impact:** Supports custom API URLs via environment variable

---

### 4. Hide Mini-Player When Expanded Open ✓
**Status:** FIXED
**Files Modified:** `src/components/Layout/components/PlayingBar/index.tsx`
**Changes:**
- Added Redux selector for `state.ui.expandedPlayerOpen`
- Returns `null` when expanded player is active
- Prevents duplicate controls and UI clutter

**Impact:** Clean UI - only one set of controls visible at a time

---

### 5. Gate Enhancement Check Logs ✓
**Status:** FIXED
**Files Modified:** `src/components/Layout/components/PlayingBar/AudioEnhancementControl.tsx`
**Changes:**
- Wrapped error log in `checkEnhancedVersion()` with debug flag gate
- Silent fail for tracks without enhanced versions (not an error)
- Logs only appear when `REACT_APP_DEBUG=true`

**Impact:** Cleaner console, no spurious errors

---

## ⏳ FIXES PENDING (Backend)

### 1. Enable GET /tracks/{id}/lyrics Endpoint
**Status:** BACKEND REQUIRED
**Current Issue:** Returns 405 (Method Not Allowed)
**Frontend Impact:** Lyrics always show "Lyrics not available"
**Required Fix:** Backend must implement GET endpoint to return LRC text

**Backend Contract:**
```
GET /tracks/{trackId}/lyrics
Response: 200 + text/plain or application/json
Content: Raw LRC text or { lyrics: "..." }
```

---

### 2. Verify Metadata.json Fields
**Status:** BACKEND VERIFICATION
**Required Fields in metadata.json:**
- `trackId` (string)
- `title` (string)
- `artist` (string)
- `album` (string)
- `duration` (number - seconds)
- `canvasFile` (string | null) - "canvas.mp4" or null
- `coverFile` (string) - "cover.jpg"
- `hasLyrics` (boolean)
- `lyricsType` ("lrc" | null)
- `lyricsFile` (string | null)
- `availableQualities` (["standard"] | ["standard", "enhanced"])
- `audioFiles` ({ standard: "...", enhanced?: "..." })

**Current Issue:** Frontend may not receive all fields
**Required Action:** Audit one track's metadata.json to confirm all fields present

---

## 📊 DATA FLOW AFTER FIXES

```
User clicks song
    ↓
playerService.startPlayback(track)
    ↓
localPlayerService.playTrack(track)
    ↓
Fetch /tracks/{trackId} (metadata.json response)
    ↓
Normalize track:
  - coverUrl = /tracks/{trackId}/cover
  - canvasUrl = /tracks/{trackId}/animated-cover
  - hasLyrics = from metadata
  - availableQualities = from metadata
    ↓
ExpandedPlayer opens
    ↓
Load assets in parallel:
  - Cover via /tracks/{trackId}/cover
  - Canvas via /tracks/{trackId}/animated-cover
  - Lyrics via centralized lyricsService.fetchLyrics()
    ↓
Display Now Playing:
  - Canvas video (if exists) OR cover (fallback)
  - Track info (title, artist, album)
  - Lyrics (if available and endpoint enabled) OR "Lyrics not available"
  - Playback controls (no duplicates, mini-player hidden)
    ↓
Quality switching:
  - Click "Enhanced Audio"
  - localPlayerService.switchQuality('enhanced')
  - Audio stream URL changes
  - Position/state preserved
  - NO page reload
```

---

## 🧪 VERIFICATION CHECKLIST

### Canvas & Cover Loading
- [ ] Song loads → cover image appears
- [ ] Check Network tab → GET /tracks/{id}/cover returns 200
- [ ] If canvas.mp4 exists → video plays (muted, looping)
- [ ] Check Network tab → GET /tracks/{id}/animated-cover returns 200
- [ ] If canvas missing → cover fallback works smoothly
- [ ] prefers-reduced-motion is respected (video disabled in accessibility mode)

### Lyrics
- [ ] Backend enables GET /tracks/{id}/lyrics
- [ ] Song with lyrics → lyrics appear and sync with playback
- [ ] Check Network tab → Only ONE GET /tracks/{id}/lyrics request (not two)
- [ ] Lyrics scroll smoothly with LRC timestamps
- [ ] Song without lyrics → Shows "Lyrics not available" (not error)
- [ ] No duplicate requests in Network tab

### Quality Switching
- [ ] Song is playing
- [ ] Click "Enhanced Audio" button
- [ ] Audio switches to enhanced quality (if available)
- [ ] Playback position preserved
- [ ] No page reload
- [ ] Play/pause state preserved
- [ ] Canvas and lyrics remain visible (not hidden or reloaded)
- [ ] Click again to switch back to standard
- [ ] No jarring transitions

### Playback Controls
- [ ] Play/pause works in ExpandedPlayer
- [ ] Next/prev works
- [ ] Seek works (click on progress bar)
- [ ] Volume control works
- [ ] Repeat/shuffle toggles work (if present)

### UI/UX
- [ ] Expanded player opens when song clicked
- [ ] Mini-player is hidden (bottom player disappears)
- [ ] Close button works
- [ ] Keyboard Escape closes expanded player
- [ ] Backdrop click closes expanded player
- [ ] Controls responsive and clickable
- [ ] No console errors

### Console Logs
- [ ] Run app normally: console should be clean
- [ ] Run with `REACT_APP_DEBUG=true`: debug logs appear
- [ ] No "Lyrics not available" errors when lyrics endpoint enabled

---

## 🎯 IMMEDIATE NEXT STEPS

### Critical (Blocking Now Playing)
1. **Backend Task:** Enable GET /tracks/{id}/lyrics endpoint
   - Should return 200 + LRC text
   - Not 405
   - Test with: `curl http://localhost:8000/tracks/{trackId}/lyrics`

2. **Audit Task:** Verify one track's metadata.json includes all required fields
   - Especially: canvasFile, hasLyrics, lyricsType, availableQualities
   - Locate file at: `C:/[Artist]/[Album]/metadata.json`

### High Priority (Verify & Test)
3. **QA Task:** Run verification checklist above
4. **Frontend Task (if needed):** Add defensive checks if metadata fields missing

### Optional
5. Add error boundary to ExpandedPlayer
6. Add loading states while assets load

---

## 📋 BACKEND ENDPOINTS VERIFICATION

Test each endpoint:

```bash
# Get track metadata
curl http://localhost:8000/tracks/{trackId}

# Get cover image
curl http://localhost:8000/tracks/{trackId}/cover -I

# Get canvas video
curl http://localhost:8000/tracks/{trackId}/animated-cover -I

# Get lyrics (MUST be implemented)
curl http://localhost:8000/tracks/{trackId}/lyrics -I

# Get audio stream
curl http://localhost:8000/tracks/{trackId}/stream?quality=standard -I
curl http://localhost:8000/tracks/{trackId}/stream?quality=enhanced -I
```

All should return 200 (or 404 if resource doesn't exist, not 405).

---

## 📝 CODE CHANGES SUMMARY

| File | Change | Impact |
|------|--------|--------|
| AudioEnhancementControl.tsx | Removed `window.location.reload()` | Quality switch seamless |
| lyricsService.ts | NEW - Centralized lyrics | No duplicate requests |
| ExpandedPlayer.tsx | Use `lyricsService` | Shared cache |
| SmoothLyrics.tsx | Use `lyricsService` | Shared cache |
| PlayingBar/index.tsx | Hide when expanded open | Clean UI |

---

**Last Updated:** 2025-01-03
**Status:** Frontend fixes complete, awaiting backend verification

For detailed audit findings, see: `NOW_PLAYING_AUDIT.md`
