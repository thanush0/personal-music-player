# Now Playing Experience Audit

## 🔍 ISSUES IDENTIFIED

### CRITICAL ISSUES

#### 1. Lyrics Endpoint Returns 405 (GET not allowed)
**Status:** BLOCKING
**Location:** Frontend: ExpandedPlayer.tsx:137, SmoothLyrics.tsx:48
**Symptom:** Users see "Lyrics not available" even when lyrics.lrc exists
**Root Cause:** Backend /tracks/{id}/lyrics endpoint doesn't support GET method
**Frontend Code:**
```typescript
const res = await axios.get(`${API_URL}/tracks/${trackId}/lyrics`, { validateStatus: () => true });
```
**Current Behavior:** Returns 405, treated as no lyrics
**Required Fix:** Backend must enable GET /tracks/{id}/lyrics endpoint to return LRC text

---

#### 2. Canvas Video Endpoint Not Verified
**Status:** BLOCKING
**Location:** ExpandedPlayer.tsx:124, Canvas.tsx
**Symptom:** Canvas might fail silently or return 404
**Root Cause:** No verification that /tracks/{id}/animated-cover endpoint exists or returns 200
**Current Behavior:**
```typescript
setAnimatedCoverUrl(`${API_URL}/tracks/${currentTrack.id}/animated-cover`);
// Canvas component tries to load, fails silently on 404
```
**Required Fix:** Verify canvasFile field in metadata.json AND endpoint returns 200 before showing

---

#### 3. Quality Switching Calls window.location.reload()
**Status:** BREAKING UX
**Location:** AudioEnhancementControl.tsx:61, 77
**Symptom:** Clicking "Enhanced Audio" reloads entire page, loses playback position
**Code:**
```typescript
window.location.reload();  // Line 61, 77
```
**Impact:** User can't use enhanced audio without losing playback state
**Required Fix:** Use localPlayerService.switchQuality() WITHOUT reload

---

#### 4. Duplicate Playback Controls
**Status:** UX CLUTTER
**Location:** 
- ExpandedPlayer.tsx: Full playback controls (play, pause, next, prev, seek)
- PlayingBar.tsx: Duplicate controls in mini-player
- AudioEnhancementControl.tsx: Quality switching in mini-player
**Symptom:** Same controls appear in both expanded and mini-player
**Impact:** Confusing UX, redundant controls
**Required Fix:** Hide mini-player when expanded player is open

---

### HIGH PRIORITY ISSUES

#### 5. Metadata Fields Not Validated
**Status:** DATA FLOW ISSUE
**Location:** localPlayerService.ts:158-187, ExpandedPlayer.tsx:114-124
**Issue:** 
- Frontend assumes metadata.json has: canvasFile, hasLyrics, lyricsType, coverFile, availableQualities
- No validation that these fields exist
- Fallback logic exists but might not cover all cases
**Code:**
```typescript
const normalized = {
  canvasUrl: fullTrack.canvasFile ? `${API_URL}/tracks/${id}/animated-cover` : ...,
  hasLyrics: !!fullTrack.hasLyrics,
  lyricsUrl: fullTrack.hasLyrics ? `${API_URL}/tracks/${id}/lyrics` : undefined,
};
```
**Required Fix:** 
- Verify backend metadata.json consistently includes all required fields
- Add defensive checks in frontend

---

#### 6. Two Separate Lyrics Fetches (Duplication)
**Status:** PERFORMANCE / DATA FLOW
**Location:** ExpandedPlayer.tsx:127-161 AND SmoothLyrics.tsx:34-77
**Issue:** 
- ExpandedPlayer fetches lyrics and caches in its own Map
- SmoothLyrics also fetches lyrics and caches separately
- Two independent requests for same lyrics on track change
**Impact:** 
- Redundant network requests
- 405 error shown twice in console
- Lyrics loaded twice unnecessarily
**Required Fix:** 
- Centralize lyrics fetching (localPlayerService OR Redux store)
- Share cache across all components
- Fetch once, use everywhere

---

#### 7. Cover URL Construction Inconsistent
**Status:** DATA FLOW ISSUE
**Location:** ExpandedPlayer.tsx:117-120, localPlayerService.ts:182
**Code:**
```typescript
// ExpandedPlayer
if (trackWithAssets.cover_url) {
  setCoverUrl(trackWithAssets.cover_url);
} else {
  setCoverUrl(`${API_URL}/tracks/${currentTrack.id}/cover`);
}

// localPlayerService
coverUrl: `${API_URL}/tracks/${id}/cover`,
```
**Issue:** Different logic for cover URL in different places
**Required Fix:** Standardize to always use backend endpoint `/tracks/{id}/cover`

---

#### 8. Quality Switching Doesn't Preserve Position/State
**Status:** UX ISSUE
**Location:** AudioEnhancementControl.tsx:83-97, localPlayerService.ts:237-265
**Code:**
```typescript
// Frontend tries to switch
const { localPlayerService } = await import('../../../../services/localPlayer');
await localPlayerService.switchQuality(newState ? 'enhanced' : 'standard');

// But then page reloads (line 61, 77)
```
**Issue:**
- localPlayerService.switchQuality() exists and preserves position
- But AudioEnhancementControl calls window.location.reload() anyway
- Even if it didn't, quality switch is in mini-player not expanded player
**Required Fix:** 
- Remove window.location.reload()
- Ensure localPlayerService.switchQuality() is used
- Test that position/pause state preserved

---

### MEDIUM PRIORITY ISSUES

#### 9. No Error Boundary for Now Playing
**Status:** RELIABILITY
**Location:** ExpandedPlayer.tsx
**Issue:** If any component throws, entire expanded player crashes
**Required Fix:** Wrap in error boundary

---

#### 10. API URL Hardcoded in Multiple Places
**Status:** MAINTAINABILITY
**Locations:**
- ExpandedPlayer.tsx:13
- AudioEnhancementControl.tsx:38, 55, 74
- SmoothLyrics.tsx: uses relative path /tracks/...
- VideoThumbnail.tsx: hardcoded http://localhost:8000
**Issue:** Inconsistent API URL handling
**Required Fix:** Use consistent API_URL from environment across all components

---

## 📋 DATA FLOW VERIFICATION

### Current Flow
```
1. User clicks song
2. playerService.startPlayback(track) called
3. localPlayerService.playTrack(track) executed
4. Backend /tracks/{id} fetched (metadata.json response)
5. Track normalized with:
   - canvasUrl: /tracks/{id}/animated-cover
   - coverUrl: /tracks/{id}/cover
   - hasLyrics: from metadata
   - availableQualities: from metadata
6. ExpandedPlayer opens, receives currentTrack from Redux (Spotify state)
7. Assets loaded separately:
   - Cover via endpoint
   - Canvas via endpoint
   - Lyrics via separate GET /tracks/{id}/lyrics

Problem: Steps 7 assume metadata fields are correct and endpoints exist
```

### Required Verification
- [ ] Metadata.json structure matches expected shape
- [ ] All required fields present: canvasFile, coverFile, hasLyrics, lyricsType, availableQualities
- [ ] Endpoints return correct status codes:
  - GET /tracks/{id}/cover → 200 + image
  - GET /tracks/{id}/animated-cover → 200 + video OR 404
  - GET /tracks/{id}/lyrics → 200 + text OR 404 (NOT 405)
  - GET /tracks/{id}/stream?quality=standard|enhanced → 200 + audio

---

## 🔧 REQUIRED FIXES (Priority Order)

### Must Fix (Blocking Now Playing)
1. **Enable GET /tracks/{id}/lyrics endpoint** (Backend)
2. **Remove window.location.reload() from AudioEnhancementControl** (Frontend)
3. **Centralize lyrics fetching** (Frontend)
4. **Verify canvas endpoint and metadata.canvasFile** (Backend + Frontend)

### Should Fix (High Priority)
5. Hide mini-player when expanded open
6. Verify all metadata fields present
7. Standardize API URL usage
8. Add error boundary to ExpandedPlayer

### Nice to Have
9. Cache shared across components
10. Consistent cover URL handling

---

## 🧪 TESTING CHECKLIST

```
Now Playing Experience Test:

CANVAS & COVER:
[ ] Song loads → cover image appears immediately
[ ] If canvas.mp4 exists → video plays (muted, looping)
[ ] If canvas missing → cover fallback works smoothly
[ ] prefers-reduced-motion respected

LYRICS:
[ ] Song with lyrics → lyrics appear and sync
[ ] Song without lyrics → "Lyrics not available" shows
[ ] Lyrics scroll with playback
[ ] No duplicate requests in Network tab

QUALITY SWITCHING:
[ ] Click "Enhanced Audio" → switches without reload
[ ] Position preserved during switch
[ ] Pause/play state preserved
[ ] Controls responsive (no lag)

PLAYBACK:
[ ] Play/pause works
[ ] Next/prev works
[ ] Seek works
[ ] Volume works
[ ] Repeat/shuffle works

MOBILE/ACCESSIBILITY:
[ ] Expanded player responsive
[ ] Controls accessible via keyboard
[ ] ARIA labels present
[ ] Touch-friendly button sizes
```

---

## 📊 ENDPOINT CONTRACT

**Backend must provide:**

```
GET /tracks/{id}
Response: metadata.json-backed track object
{
  trackId: string,
  title: string,
  artist: string,
  album: string,
  duration: number,
  canvasFile: string | null,  // "canvas.mp4" or null
  coverFile: string,           // "cover.jpg"
  hasLyrics: boolean,
  lyricsType: "lrc" | null,
  lyricsFile: string | null,
  availableQualities: ["standard"] | ["standard", "enhanced"],
  audioFiles: { standard: string, enhanced?: string }
}

GET /tracks/{id}/cover
Response: image/jpeg (200) or 404

GET /tracks/{id}/animated-cover
Response: video/mp4 (200) if canvasFile exists, else 404

GET /tracks/{id}/lyrics
Response: text/plain (200) with LRC content, NOT 405

GET /tracks/{id}/stream?quality=standard|enhanced
Response: audio/flac (200) with audio stream
```

---

**Last Updated:** 2025-01-03
**Status:** Ready for fixes
