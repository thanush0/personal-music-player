# API Inconsistencies Analysis & Fix Strategy

## Executive Summary
The application has 4 major API contract issues causing unpredictable behavior:
1. **Lyrics endpoint returns 405 Method Not Allowed** despite being a valid GET endpoint
2. **Lyrics data exists but is inaccessible** - DB has lyrics but GET fails
3. **Playlist endpoint returns 404** when playlist metadata is queried but tracks exist
4. **Redundant stream requests** - Player requests same track multiple times unnecessarily

---

## ROOT CAUSE ANALYSIS

### 🔴 Issue #1: Lyrics GET Endpoint (405 Method Not Allowed)

**Current State:**
- Frontend calls: `GET /tracks/{trackId}/lyrics` (line 29 in `lyricsService.ts`)
- Backend has: `PUT /tracks/{track_id}/lyrics` (line 227 in `main.py`)
- Result: **405 Method Not Allowed** - FastAPI rejects GET requests

**Root Causes:**
1. **Missing GET endpoint** - Only `PUT` is defined, no `GET` handler
2. **Incomplete data access** - `GET /tracks/{trackId}` returns lyrics in response body, but frontend expects dedicated endpoint
3. **Inconsistent pattern** - Lyrics are embedded in track GET, but frontend tries to fetch separately

**Data Flow Issues:**
```
Frontend expectation:
  GET /tracks/{id}/lyrics → Text/JSON with lyrics content

Backend implementation:
  - Lyrics stored in DB (tracks.lyrics column)
  - Lyrics in filesystem (lyrics.lrc files)
  - GET /tracks/{id} includes lyrics in response
  - PUT /tracks/{id}/lyrics updates DB only
  - NO GET /tracks/{id}/lyrics endpoint exists
```

---

### 🔴 Issue #2: Lyrics DB/Filesystem Inconsistency

**Current State:**
- Some tracks have lyrics in DB but no lyrics.lrc file
- Some tracks have lyrics.lrc but it's not registered in DB
- Frontend gets "hasLyrics=false" despite DB having lyrics
- Logs show: "Lyrics already in database" but file lookup fails

**Root Causes:**
1. **Mixed storage** - DB and filesystem are separate sources of truth
2. **No coherent lookup** - GET /tracks/{id} checks:
   - If DB has lyrics, use it
   - Else check filesystem for .lrc file
   - Result: inconsistent state
3. **hasLyrics flag missing** - No field in TrackResponse to indicate lyrics exist
4. **YouTube downloads** - Save lyrics to both DB AND file, but not coordinated

**Data Flow:**
```
Current GET /tracks/{id} logic:
  1. Get track from DB
  2. IF track.lyrics is NULL:
       - Check folder for lyrics.lrc
       - Load from file if exists
       - Add to response
  3. ELSE:
       - Use track.lyrics from DB
  4. Return response WITHOUT "hasLyrics" flag
```

**Problem:** Frontend can't know if lyrics exist before making request. Gets 405 when trying GET /lyrics endpoint.

---

### 🔴 Issue #3: Playlist 404 on Metadata Query

**Current State:**
- `GET /playlists/{id}` → **404 Not Found**
- `GET /playlists/{id}/tracks` → **200 OK** with tracks
- `GET /playlists/{id}/followers/contains` → **200 OK**

**Root Causes:**
1. **Database method returns None** - `get_playlist()` in database.py returns None if query fails
2. **Null check too strict** - main.py line 529: `if not playlist: raise 404`
3. **Data exists but inaccessible** - Playlist record exists, but query fails mysteriously
4. **Alternative endpoint works** - `GET /playlists/{id}/tracks` fetches same data but via JOIN

**Code Analysis:**
```python
# main.py line 525-531
@app.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(playlist_id: str):
    playlist = db.get_playlist(playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist

# database.py line 407-432
def get_playlist(self, playlist_id: str) -> Optional[Dict]:
    cursor.execute("SELECT * FROM playlists WHERE id = ?", (playlist_id,))
    row = cursor.fetchone()
    
    if not row:
        return None  # ← This is returning None
    
    playlist = self._format_playlist_response(...)
    # ... fetch tracks and add to playlist dict ...
    return playlist
```

**Issue:** `get_playlist()` should always succeed if the playlist exists. The 404 suggests the playlist_id format or database lookup is failing. But `/playlists/{id}/tracks` works, which means:
- Either: Playlist exists but basic query fails
- Or: get_playlist() has a bug in formatting that causes exception

---

### 🟡 Issue #4: Redundant Stream Requests

**Current State:**
- Same track requested multiple times:
  - `/stream?quality=standard`
  - `/stream?quality=enhanced`
  - Repeated in quick succession
- Indicates: Player re-rendering or state loop

**Root Causes:**
1. **No request deduplication** - Player component re-renders and re-requests audio
2. **No quality preference persistence** - Every render tries both versions
3. **Frontend state management issue** - LocalPlayerContext or useEffect re-runs unnecessarily

---

## PROPOSED FIX STRATEGY

### ✅ Fix #1: Implement GET /tracks/{id}/lyrics Endpoint

**Backend Changes (main.py):**
```python
@app.get("/tracks/{track_id}/lyrics")
async def get_track_lyrics(track_id: str):
    """Get lyrics for a track - returns plain text LRC format"""
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Use lyrics from response (which already has fallback logic)
    lyrics = track.get("lyrics")
    
    if not lyrics:
        raise HTTPException(status_code=404, detail="Lyrics not available")
    
    # Return as plain text with proper Content-Type
    return Response(
        content=lyrics,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": "inline"}
    )
```

**Why This Works:**
- GET /tracks/{id} already loads lyrics from DB or filesystem
- This endpoint just returns the lyrics content
- Consistent with frontend expectations
- Simple, clean, no duplication

---

### ✅ Fix #2: Add hasLyrics Field to TrackResponse

**Changes:**
1. Add `has_lyrics: bool` to TrackResponse model (models.py)
2. Compute during formatting: `has_lyrics = bool(track.get("lyrics"))`
3. Frontend can now check without making separate request

---

### ✅ Fix #3: Add explicit GET endpoint for lyrics availability

**Backend Changes:**
```python
@app.head("/tracks/{track_id}/lyrics")
async def check_track_lyrics(track_id: str):
    """Check if lyrics exist without downloading content"""
    track = db.get_track(track_id)
    if not track or not track.get("lyrics"):
        raise HTTPException(status_code=404, detail="Lyrics not available")
    return Response(status_code=200)
```

---

### ✅ Fix #4: Debug & Fix Playlist 404

**Investigation Steps:**
1. Add logging to `get_playlist()` to see what's failing
2. Check if playlist_id format is issue
3. Verify database has playlists
4. Test direct SQL query

**Likely Fix:**
- Ensure `get_playlist()` doesn't throw exception
- Add try/except wrapper
- Verify row factory works correctly

---

### ✅ Fix #5: Coherent Lyrics Source of Truth

**Policy:**
- **Database is primary source** (has all metadata)
- **Filesystem (.lrc files) is fallback** (for legacy or manual adds)
- **GET /tracks/{id} loads both** with policy: DB > Filesystem
- **PUT /tracks/{id}/lyrics updates BOTH**
  - Update DB `lyrics` column
  - Write to folder/lyrics.lrc file
  
**Benefit:** Consistent state everywhere

---

### ✅ Fix #6: Stream Request Deduplication

**Backend:**
```python
# Already has quality parameter
@app.get("/tracks/{track_id}/stream")
async def stream_track(track_id: str, quality: str = Query("standard", ...)):
    # Determine file once based on quality
    # No redundant requests needed
```

**Frontend (LocalPlayerContext):**
- Cache audio element per quality level
- Don't re-create audio on every render
- Use persistent playback state
- Avoid re-requesting in useEffect dependency arrays

---

## API CONTRACT (Post-Fix)

### Tracks
```
GET  /tracks                          → List[TrackResponse]
GET  /tracks/{id}                     → TrackResponse (includes lyrics if available)
GET  /tracks/{id}/lyrics              → Plain text or 404
HEAD /tracks/{id}/lyrics              → 200 if lyrics exist, 404 otherwise
PUT  /tracks/{id}/lyrics              → {message: "..."}
GET  /tracks/{id}/stream              → Audio file (quality=standard|enhanced)
GET  /tracks/{id}/cover               → Image file
GET  /tracks/{id}/animated-cover      → Video file
```

### Playlists
```
GET    /playlists                     → List[PlaylistResponse]
GET    /playlists/{id}                → PlaylistResponse (with tracks)
GET    /playlists/{id}/tracks         → Paginated tracks (alternative)
POST   /playlists                     → PlaylistResponse
PUT    /playlists/{id}                → {message: "..."}
DELETE /playlists/{id}                → {message: "..."}
POST   /playlists/{id}/tracks         → {message: "..."}
DELETE /playlists/{id}/tracks/{track} → {message: "..."}
```

---

## IMPLEMENTATION ORDER

1. ✅ Add `GET /tracks/{id}/lyrics` endpoint
2. ✅ Add `HEAD /tracks/{id}/lyrics` endpoint
3. ✅ Add `has_lyrics` field to TrackResponse
4. ✅ Debug and fix playlist 404 issue
5. ✅ Update PUT /lyrics to write both DB and file
6. ✅ Test with frontend
7. ✅ Profile stream requests and fix redundancy

---

## TESTING STRATEGY

### Unit Tests
- Lyrics endpoint returns correct content type
- Lyrics endpoint 404 when no lyrics
- has_lyrics flag is accurate
- Playlist endpoint always succeeds if record exists

### Integration Tests
- Frontend can fetch lyrics without 405
- Playlist page loads without errors
- Stream requests are not redundant

### Manual Tests
- Download YouTube song with lyrics
- Verify lyrics in DB and file
- Verify GET /lyrics works
- Play track and check stream requests

---

## CONSTRAINTS SATISFIED
✅ No UI redesign
✅ No feature removal
✅ No fake data
✅ Fix contracts, not symptoms
✅ Backend-first solution
✅ Minimal frontend changes
✅ Production-grade consistency
