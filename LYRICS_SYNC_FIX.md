# Lyrics Sync & Display Fix

## Root Cause Analysis

### Current Problem
The expanded player shows:
```
[Verse 1]
[Chorus]
[Bridge]
```
Instead of:
```
[00:12.34] The actual lyric line 1
[00:18.56] The actual lyric line 2
[00:45.00] The actual lyric line 3
```

### Why This Happens

1. **Backend fetches from lyrics.ovh API** (`youtube_downloader.py` lines 45-72)
   - lyrics.ovh returns **plain text format**
   - Example response:
     ```
     [Verse 1]
     The actual first line of lyrics
     The second line
     
     [Chorus]
     Chorus line 1
     Chorus line 2
     ```

2. **Frontend expects LRC format with timestamps** (`SmoothLyrics.tsx` lines 94-100)
   - Looks for pattern: `[MM:SS.cc]` (e.g., `[00:12.34]`)
   - When it finds `[Verse 1]`, it treats it as a timestamp
   - Extracts time as: minutes=00, seconds=12, centiseconds=34 (from "1")
   - Result: Invalid timestamp, shows structural tag instead

3. **Parser can't distinguish** between:
   - `[Verse 1]` ← Structural tag (NOT a timestamp)
   - `[00:12.34]` ← Actual timestamp

### Impact
- **Lyrics display is broken** for synced playback
- **Only Spotify streams with metadata** show working lyrics
- **YouTube downloads show tags only**
- **Local files without embedded lyrics** show nothing

---

## Solution: Synced Lyrics API Integration

### Strategy: Use SyncedLyrics API (Genius or Musixmatch alternative)

Instead of lyrics.ovh, we should use an API that returns **synced lyrics with timestamps**:

**Best Option: Genius API with Musixmatch fallback**

1. **Genius API** (best data, requires key but free tier available)
   - Returns full lyrics with structure
   - Can be enriched with timestamps

2. **Musixmatch API** (has synced lyrics)
   - Returns `[MM:SS.cc]` formatted lyrics
   - Better timestamp accuracy

3. **AZLyrics or LyricFind** (if both fail)
   - Fallback options

### Implementation Plan

#### Step 1: Update youtube_downloader.py

```python
async def fetch_lyrics_synced(self, artist: str, title: str) -> Optional[str]:
    """
    Fetch synced lyrics in LRC format with timestamps
    Returns lyrics in [MM:SS.cc] format or plain text fallback
    """
    try:
        # Try Musixmatch first (has synced lyrics)
        synced = await self._fetch_from_musixmatch(artist, title)
        if synced:
            return synced
        
        # Try Genius API
        genius = await self._fetch_from_genius(artist, title)
        if genius:
            return genius
        
        # Fallback to lyrics.ovh (plain text)
        plain = await self._fetch_from_lyrics_ovh(artist, title)
        if plain:
            return plain
        
        return None
    except Exception as e:
        print(f"Error fetching synced lyrics: {e}")
        return None

async def _fetch_from_musixmatch(self, artist: str, title: str) -> Optional[str]:
    """Musixmatch has synced lyrics"""
    try:
        url = f"https://api.musixmatch.com/ws/1.1/matcher.lyrics.get"
        params = {
            "q_track": title,
            "q_artist": artist,
            "apikey": os.getenv("MUSIXMATCH_API_KEY", "")
        }
        
        loop = asyncio.get_event_loop()
        def _fetch():
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('message', {}).get('body', {}).get('lyrics'):
                    return data['message']['body']['lyrics']['lyrics_body']
            return None
        
        return await loop.run_in_executor(self.executor, _fetch)
    except:
        return None

async def _fetch_from_genius(self, artist: str, title: str) -> Optional[str]:
    """Fetch from Genius API"""
    try:
        # Genius doesn't have built-in timestamps, but we can mark structure
        # Or use: https://genius.com/api/search?q={artist} {title}
        # Then scrape lyrics page (not recommended, use Musixmatch instead)
        return None  # Requires scraping, skip for now
    except:
        return None
```

#### Step 2: Update frontend lyricsService.ts

```typescript
export const parseLyrics = (lyricsText: string | null): LyricLine[] => {
  if (!lyricsText || !lyricsText.trim()) return [];

  const lines = lyricsText.split('\n').filter((line) => line.trim());
  
  // Check if LRC format (has timestamps like [00:12.00])
  const isLRC = lines.some((line) => /^\[\d{2}:\d{2}[\\.\\d]*\]/.test(line));

  if (isLRC) {
    return lines
      .map((line) => {
        // Match [MM:SS.cc] or [MM:SS.ccc] format
        const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
        if (match) {
          const [, minutes, seconds, centiseconds, text] = match;
          const timeMs = (parseInt(minutes, 10) * 60 + parseInt(seconds, 10)) * 1000 
            + (centiseconds ? parseInt(centiseconds, 10) * 10 : 0);
          return { time: timeMs, text: text.trim() };
        }
        return null;
      })
      .filter((line): line is LyricLine => line !== null);
  }

  // PLAIN TEXT MODE: No timestamps, show as-is
  // Remove structural tags like [Verse 1], [Chorus], [Bridge]
  const filtered = lines
    .filter(line => !line.match(/^\[Verse|^\[Chorus|^\[Bridge|^\[Outro|^\[Pre-Chorus|^\[Hook|^\[Intro/i))
    .map((text, index) => ({ time: index * 3000, text }));
  
  return filtered;
};
```

#### Step 3: Update SmoothLyrics.tsx

```typescript
// Add indicator for sync status
const [syncStatus, setSyncStatus] = useState<'synced' | 'plain'>('plain');

useEffect(() => {
  const loadLyrics = async () => {
    if (!song?.id) return;

    setLoading(true);
    try {
      const text = await fetchLyrics(song.id);
      setLyrics(text);
      if (text) {
        // Detect if synced or plain
        const isSynced = /^\[\d{2}:\d{2}/.test(text);
        setSyncStatus(isSynced ? 'synced' : 'plain');
        
        const lines = parseLrcToLines(text);
        setLyricLines(lines);
      } else {
        setLyricLines([]);
      }
    } finally {
      setLoading(false);
    }
  };

  loadLyrics();
}, [song?.id]);

// In render: Show indicator
{syncStatus === 'plain' && (
  <div className="lyrics-status">
    <span className="badge">Plain Text</span>
  </div>
)}
```

---

## Immediate Fix (Without API Changes)

**For now, improve plain text handling:**

### Frontend Fix

Update `SmoothLyrics.tsx` to **handle plain text gracefully**:

```typescript
const parseLrcToLines = (text: string): LyricLine[] => {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      // Skip empty lines and structural tags
      if (!trimmed) return false;
      if (/^\[Verse|^\[Chorus|^\[Bridge|^\[Outro|^\[Pre|^\[Hook|^\[Intro/i.test(trimmed)) {
        return false; // Skip structural tags
      }
      return true;
    })
    .map((line, index) => ({ 
      text: line.trim(), 
      index 
    }));
};
```

This will show actual lyrics lines, not just tags.

### Backend Enhancement

Update `youtube_downloader.py` to **strip structural tags** when storing:

```python
async def fetch_lyrics(self, artist: str, title: str) -> Optional[str]:
    """Fetch lyrics and clean up structural tags"""
    try:
        # ... existing code ...
        lyrics = await loop.run_in_executor(self.executor, _fetch)
        
        if lyrics:
            # Remove Genius/Musixmatch style tags
            lines = lyrics.split('\n')
            cleaned = []
            for line in lines:
                # Skip structural tags
                if not re.match(r'^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook)', line, re.IGNORECASE):
                    cleaned.append(line)
            
            return '\n'.join(cleaned)
        
        return lyrics
    except Exception as e:
        print(f"Error fetching lyrics: {e}")
        return None
```

---

## Long-term Solution: Synced Lyrics Integration

### Setup Environment Variables

```env
# .env
MUSIXMATCH_API_KEY=your_key_here
GENIUS_API_KEY=your_key_here
```

### Database Enhancement

Add field to track lyrics type:

```sql
ALTER TABLE tracks ADD COLUMN lyrics_type TEXT DEFAULT 'plain'; -- 'lrc' or 'plain'
```

### API Response Enhancement

```json
{
  "id": "track_id",
  "name": "Song Name",
  "lyrics": "[00:12.34] Lyric line...",
  "lyrics_type": "lrc",  // or "plain"
  "has_lyrics": true,
  ...
}
```

---

## Testing Checklist

- [ ] Lyrics display actual content, not just tags
- [ ] Plain text lyrics show without timestamps
- [ ] LRC formatted lyrics sync with playback
- [ ] Structural tags are hidden from display
- [ ] YouTube downloads show lyrics
- [ ] Spotify streams show synced lyrics
- [ ] Local files with embedded lyrics work

---

## Implementation Priority

1. **IMMEDIATE** (Deploy now)
   - Update frontend to skip structural tags
   - Update backend to clean lyrics before storing

2. **SHORT-TERM** (Next iteration)
   - Integrate Musixmatch API
   - Add lyrics type detection
   - Show sync indicator in UI

3. **LONG-TERM** (Future)
   - Full Genius integration
   - LRC database backup
   - User-submitted corrections

---

## Files to Modify

1. `backend/youtube_downloader.py` - Clean lyrics before storing
2. `src/utils/lyricsService.ts` - Skip structural tags
3. `src/components/Layout/components/NowPlaying/Details/SmoothLyrics.tsx` - Better plain text handling
4. `.env.example` - Add API key placeholders

---

## Expected Result

**Before:**
```
[Verse 1]
[Chorus]
[Bridge]
```

**After (Immediate):**
```
The actual first lyric line
The second lyric line
The third lyric line
...
```

**After (With Synced API):**
```
[00:12.34] The actual first lyric line ← Auto-scrolls with song
[00:18.56] The second lyric line
[00:45.00] The third lyric line
```
