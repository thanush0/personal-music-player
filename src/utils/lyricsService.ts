/**
 * Centralized lyrics fetching and caching service
 * Prevents duplicate requests and shares cache across all components
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface LyricLine {
  time: number;
  text: string;
}

const lyricsCache = new Map<string, string>();
const parsedLyricsCache = new Map<string, LyricLine[]>();

/**
 * Fetch lyrics from backend and cache
 * Returns raw LRC text or null if not available
 */
export const fetchLyrics = async (trackId: string): Promise<string | null> => {
  if (!trackId) return null;

  // Check cache first
  if (lyricsCache.has(trackId)) {
    const cached = lyricsCache.get(trackId)!;
    return cached || null; // Return null if cached empty string
  }

  try {
    const res = await fetch(`${API_URL}/tracks/${trackId}/lyrics`, {
      method: 'GET',
      headers: { 'Accept': 'text/plain, application/json' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (res.status >= 200 && res.status < 300) {
      let text: string;
      const contentType = res.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Some backends wrap lyrics in JSON
        const data = await res.json();
        text = typeof data === 'string' ? data : data.lyrics || '';
      } else {
        // Plain text response
        text = await res.text();
      }

      if (text.trim()) {
        lyricsCache.set(trackId, text);
        if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true') {
          console.log(`[DEBUG] Fetched lyrics for ${trackId}: ${text.length} chars`);
        }
        return text;
      }
    }

    // Cache negative result to prevent repeated requests
    lyricsCache.set(trackId, '');
    return null;
  } catch (error: any) {
    // Cache negative result
    lyricsCache.set(trackId, '');
    if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true') {
      console.warn(`[DEBUG] Failed to fetch lyrics for ${trackId}:`, error?.message);
    }
    return null;
  }
};

/**
 * Parse LRC format lyrics into timestamped lines
 * Handles both LRC format [HH:MM:SS.cc] and plain text
 * Filters out structural tags like [Verse 1], [Chorus] etc.
 */
export const parseLyrics = (lyricsText: string | null): LyricLine[] => {
  if (!lyricsText || !lyricsText.trim()) return [];

  const lines = lyricsText.split('\n').filter((line) => line.trim());
  
  // Check if LRC format (has timestamps like [00:12.00])
  const isLRC = lines.some((line) => /^\[\d{2}:\d{2}[\.\d]*\]/.test(line));

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

  // Plain text mode: Filter structural tags and return without timestamps
  // Removes lines like [Verse 1], [Chorus], [Bridge], etc.
  const structuralTagPattern = /^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Hook|Interlude|Break|Breakdown|Fade|Refrain|Coda|Instrumental|Rap|Ad-Lib)/i;
  
  return lines
    .filter((line) => !structuralTagPattern.test(line.trim()))
    .map((text, index) => ({ time: index * 3000, text }));
};

/**
 * Get parsed lyrics (cached)
 */
export const getParsedLyrics = async (trackId: string): Promise<LyricLine[]> => {
  if (!trackId) return [];

  // Check parsed cache first
  if (parsedLyricsCache.has(trackId)) {
    return parsedLyricsCache.get(trackId)!;
  }

  // Fetch and parse
  const text = await fetchLyrics(trackId);
  const parsed = parseLyrics(text);
  parsedLyricsCache.set(trackId, parsed);

  return parsed;
};

/**
 * Clear caches (useful for testing or memory management)
 */
export const clearLyricsCache = () => {
  lyricsCache.clear();
  parsedLyricsCache.clear();
};

/**
 * Get cache stats (for debugging)
 */
export const getLyricsCacheStats = () => {
  return {
    cached: lyricsCache.size,
    parsed: parsedLyricsCache.size,
  };
};
