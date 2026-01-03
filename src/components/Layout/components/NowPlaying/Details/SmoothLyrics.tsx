/**
 * SmoothLyrics Component
 * Displays lyrics with smooth auto-scrolling synchronized to playback
 * Similar to Spotify's lyrics feature
 */

import { memo, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../../../../store/store';
import { fetchLyrics, parseLyrics } from '../../../../../utils/lyricsService';
import './SmoothLyrics.scss';

interface LyricLine {
  text: string;
  index: number;
}

type LyricsType = 'synced' | 'plain' | 'none';

export const SmoothLyrics = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lyricsType, setLyricsType] = useState<LyricsType>('none');

  const song = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );

  const playbackState = useAppSelector((state) => state.spotify.state);
  const position = playbackState?.position || 0;
  const duration = playbackState?.duration || 1;

  // Fetch lyrics from centralized service (shared with ExpandedPlayer)
  useEffect(() => {
    const loadLyrics = async () => {
      if (!song?.id) return;

      setLoading(true);
      try {
        const text = await fetchLyrics(song.id);
        setLyrics(text);
        if (text) {
          // Detect if lyrics are synced (LRC format) or plain text
          const isSynced = /^\[\d{2}:\d{2}/.test(text);
          setLyricsType(isSynced ? 'synced' : 'plain');
          
          const lines = parseLrcToLines(text);
          setLyricLines(lines);
        } else {
          setLyricLines([]);
          setLyricsType('none');
        }
      } finally {
        setLoading(false);
      }
    };

    loadLyrics();
  }, [song?.id]);

  // Auto-scroll lyrics based on playback position (timestamp sync)
  useEffect(() => {
    if (!lyricLines.length || !containerRef.current) return;

    // Find the current line by comparing timestamps to current position
    let newLineIndex = 0;
    for (let i = 0; i < lyricLines.length; i++) {
      const next = lyricLines[i + 1];
      const current = lyricLines[i];
      const currentTime = getLineMs(current.text);
      const nextTime = next ? getLineMs(next.text) : Number.POSITIVE_INFINITY;
      if (position >= currentTime && position < nextTime) {
        newLineIndex = i;
        break;
      }
    }

    if (newLineIndex !== currentLineIndex) {
      setCurrentLineIndex(newLineIndex);
      const lineElement = containerRef.current.querySelector(
        `[data-line-index="${newLineIndex}"]`
      ) as HTMLElement;
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [position, lyricLines, currentLineIndex]);

  if (!song) return null;

  // Helpers
  const parseLrcToLines = (text: string): LyricLine[] => {
    // Split by lines, keep original with timestamps to compute ms later
    return text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, index) => ({ text: line, index }));
  };

  const getLineMs = (line: string): number => {
    const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?]/);
    if (!match) return Number.NEGATIVE_INFINITY;
    const m = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    const cs = match[3] ? parseInt(match[3].slice(0, 2), 10) : 0;
    return (m * 60 + s) * 1000 + cs * 10;
  };

  if (loading) {
    return (
      <div className="smooth-lyrics">
        <div className="smooth-lyrics-loading">
          <div className="spinner" />
          <p>Loading lyrics...</p>
        </div>
      </div>
    );
  }

  if (!lyrics || !lyricLines.length) {
    return (
      <div className="smooth-lyrics">
        <div className="smooth-lyrics-empty">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
          </svg>
          <p className="smooth-lyrics-empty-title">Lyrics not available</p>
          <p className="smooth-lyrics-empty-subtitle">
            Lyrics will appear here when available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="smooth-lyrics">
      {/* Lyrics type indicator */}
      <div className="smooth-lyrics-header">
        {lyricsType === 'synced' && (
          <span className="lyrics-badge synced" title="Synced with song">
            🎵 Synced
          </span>
        )}
        {lyricsType === 'plain' && (
          <span className="lyrics-badge plain" title="Plain text lyrics">
            📝 Plain Text
          </span>
        )}
      </div>
      
      <div className="smooth-lyrics-container" ref={containerRef}>
        <div className="smooth-lyrics-spacer" />
        {lyricLines.map((line, index) => (
          <div
            key={line.index}
            data-line-index={line.index}
            className={`smooth-lyrics-line ${
              index === currentLineIndex ? 'active' : ''
            } ${index < currentLineIndex ? 'past' : ''}`}
          >
            {line.text}
          </div>
        ))}
        <div className="smooth-lyrics-spacer" />
      </div>
    </div>
  );
});

SmoothLyrics.displayName = 'SmoothLyrics';
