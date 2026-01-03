# Full Project Audit Findings

## Overview
This document outlines all issues discovered during a comprehensive audit of the personal music player application.

---

## 🔴 CRITICAL ISSUES

### 1. Data Flow Misalignment: Track Deduplication Not Implemented
**Status:** CRITICAL - Breaks core UX
**Location:** Store slices (profile, home, yourLibrary), UI components
**Problem:**
- Backend stores both `track.flac` and `track_enhanced.flac` in metadata
- Frontend treats them as separate tracks in all lists (Liked Songs, Library, Search, Home)
- Users see duplicate entries: "Song Title" appears twice (once per quality)
- Enhanced audio should be a quality option, NOT a separate track

**Impact:**
- Home page shows 2 cards per song
- Library duplicate entries confuse users
- Search results inflated with duplicates

**Root Cause:**
- No deduplication logic at fetch boundaries
- Components render items directly from Redux state
- Track ID derivation inconsistent (some use `id`, some use `trackId`)

**Required Fix:**
- Implement dedupeTracks(items) utility at reducer level
- Merge by baseId (strip `_enhanced` suffix or use logical ID)
- Attach `has_enhanced_version` flag to merged track
- Apply dedup at: home.ts, profile.ts, yourLibrary.ts, search.ts

---

### 2. Now Playing Page: Canvas & Lyrics Not Loading Consistently
**Status:** CRITICAL - Core feature broken
**Location:** src/components/ExpandedPlayer/ExpandedPlayer.tsx, Canvas.tsx
**Problem:**
- Canvas video fails silently (404 on /tracks/{id}/animated-cover)
- Lyrics endpoint returns 405 (GET not allowed)
- UI shows "Lyrics not available" even when lyrics.lrc exists
- Cover image sometimes fails to load

**Impact:**
- Now Playing view is incomplete/broken
- Users can't see visualizations
- Can't read synced lyrics

**Root Cause:**
- Metadata.json fields (canvasFile, lyricsFile, hasLyrics) not verified in metadata endpoint
- Endpoint /tracks/{id}/lyrics doesn't support GET method
- Cover URL construction not consistent with backend

**Required Fix:**
- Backend: Enable GET /tracks/{id}/lyrics endpoint
- Ensure metadata.json sets canvasFile, hasLyrics, lyricsFile correctly
- Frontend canvas/lyrics: Add proper error boundaries with fallbacks
- Verify cover endpoint returns 200 before rendering

---

### 3. Expanded Player Mounts/Unmounts Excessively
**Status:** HIGH - Performance & UX
**Location:** src/components/ExpandedPlayer/ExpandedPlayer.tsx
**Problem:**
- Component remounts when track changes (loses scroll position, canvas state)
- Canvas video restarts from beginning
- Lyrics re-parse unnecessarily (expensive on large LRC files)

**Impact:**
- Jarring transitions when skipping tracks
- Video loops reset instead of continuing
- Performance degradation on long sessions

**Root Cause:**
- Missing memoization on component
- Keys not stable (using index instead of trackId)
- No persistent cache for lyrics across tracks

**Required Fix:**
- Wrap ExpandedPlayer with memo()
- Use trackId as key, never index
- Implement track-level caching for lyrics
- Prevent canvas video remount on quality switch

---

### 4. Quality Switching Not Seamless
**Status:** HIGH - Feature incomplete
**Location:** src/components/Layout/components/PlayingBar/AudioEnhancementControl.tsx
**Problem:**
- Clicking "Enhanced Audio" button may restart playback
- Canvas/lyrics reload unnecessarily
- Play position may reset

**Impact:**
- Jarring UX when switching quality
- Users avoid using enhanced audio option

**Root Cause:**
- Quality switch triggers full track reload
- No stream-only URL update without remount

**Required Fix:**
- Only update audio stream URL (localPlayerService.switchQuality)
- Preserve position and play state
- Don't remount canvas or refetch lyrics

---

### 5. Home Page Missing Sections & Layout Issues
**Status:** HIGH - UX incomplete
**Location:** src/pages/Home/
**Problem:**
- No "Continue Listening" (recently played with resume)
- No "Recently Added" section (YouTube downloads)
- No "Most Played" ranking
- No horizontal scroll rows (all vertical grids)
- Missing "Quick Filters" (lyrics, canvas, enhanced, favorites)
- No "Artist Spotlight"
- No "Library Shortcuts" (All Songs, Albums, Artists, Favorites, Downloads)

**Impact:**
- Home page feels generic and unfinished
- Users can't quickly access library shortcuts
- No visual hierarchy or premium feel

**Root Cause:**
- Incomplete implementation of Home page design
- Using only existing sections without new ones

**Required Fix:**
- Implement premium Home page layout with all required sections
- Add horizontal scroll containers
- Build new section components with proper data binding

---

## 🟠 HIGH PRIORITY ISSUES

### 6. Logging Pollution
**Status:** HIGH - Development UX
**Problem:**
- emitPlaybackState logs on every position update
- Debug logs from fetchFullTrack, currentTrack.set spam console
- Makes debugging harder
- No production guard

**Location:** src/services/localPlayer.ts
**Required Fix:**
- Gate all logs behind REACT_APP_DEBUG=true AND NODE_ENV=development
- Throttle playback logs to 2s or on track change only
- Remove debug snapshots from production

---

### 7. UI/UX Inconsistency Across Pages
**Status:** HIGH - Polish
**Problem:**
- Home page: large cards, minimal spacing
- Library page: dense lists, no consistent card size
- Album page: different layout rules
- Artist page: inconsistent hover states
- Now Playing: cluttered with overlapping controls

**Location:** src/styles/, multiple component scss files
**Required Fix:**
- Establish design system (spacing, typography, hover states)
- Apply consistently across all pages
- Remove visual noise and clutter

---

### 8. Missing Error Boundaries
**Status:** MEDIUM - Reliability
**Problem:**
- If a section component throws, entire Home page crashes
- No graceful fallback
- Users see blank page instead of working sections

**Location:** src/pages/Home/
**Required Fix:**
- Wrap each section in error boundary
- Show error state or skip section gracefully

---

### 9. Broken TrackId/ID Consistency
**Status:** MEDIUM - Data flow
**Problem:**
- Some APIs return `id`, some return `trackId`
- Components assume different fields exist
- Keys in lists inconsistent
- Cover URLs sometimes use wrong ID field

**Location:** Multiple components and slices
**Required Fix:**
- Normalize all track objects to consistent shape
- Always use `trackId` internally (or `id` everywhere)
- Add type guards where shapes vary

---

### 10. Canvas Component Silent Failures
**Status:** MEDIUM - UX
**Location:** src/components/ExpandedPlayer/Canvas.tsx
**Problem:**
- If video fetch fails, no error logged
- Falls back to cover silently (good) but no debug info
- Makes troubleshooting impossible

**Required Fix:**
- Log canvas load errors (gated behind REACT_APP_DEBUG)
- Verify canvasFile exists before attempting fetch
- Add ARIA labels for screen readers

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. Performance: Memoization Gaps
**Status:** MEDIUM
**Location:** src/pages/Home/components/, src/components/Lists/
**Problem:**
- GridItemList and other list components not memoized
- Re-render on every parent update
- Heavy sort/filter operations not memoized

**Required Fix:**
- Wrap components with memo()
- Use useMemo for expensive selectors
- Lazy load images in lists

---

### 12. Mobile Responsiveness Issues
**Status:** MEDIUM
**Location:** Multiple pages
**Problem:**
- Horizontal scroll not accessible on mobile
- Touch gestures not intuitive
- Cards sometimes overflow on small screens

**Required Fix:**
- Test and refine mobile layout
- Ensure horizontal scroll works with touch
- Verify card sizing on mobile breakpoints

---

## 📋 SUMMARY TABLE

| Issue | Severity | Area | Impact |
|-------|----------|------|--------|
| Track Deduplication Missing | CRITICAL | Data Flow | UX broken (duplicates) |
| Canvas/Lyrics Not Loading | CRITICAL | Now Playing | Core feature broken |
| Excessive Remounts | HIGH | Performance | Jarring transitions |
| Quality Switch Jarring | HIGH | Playback | Feature avoidance |
| Home Page Incomplete | HIGH | UX/Design | Feels unfinished |
| Logging Pollution | HIGH | DX | Hard to debug |
| UI Inconsistency | HIGH | Polish | Not premium |
| No Error Boundaries | MEDIUM | Reliability | Crash risk |
| ID Field Inconsistency | MEDIUM | Data | Type safety issues |
| Canvas Silent Failures | MEDIUM | UX | Hard to debug |
| Memoization Gaps | MEDIUM | Performance | Re-render waste |
| Mobile Issues | MEDIUM | UX | Mobile broken |

---

## ✅ FIX PRIORITY ORDER

1. **Track Deduplication** (breaks core UX)
2. **Canvas/Lyrics Loading** (core Now Playing feature)
3. **Quality Switching** (seamless UX)
4. **Home Page Rebuild** (visual polish)
5. **Logging Cleanup** (development UX)
6. **UI Polish & Consistency** (premium feel)
7. **Error Boundaries** (reliability)
8. **Memoization** (performance)

---

## Next Steps
This audit will drive a systematic fix plan, starting with CRITICAL issues and working down to MEDIUM priority improvements.
