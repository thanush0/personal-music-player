/**
 * SmoothLyrics Component
 * Displays lyrics with smooth auto-scrolling synchronized to playback
 * Similar to Spotify's lyrics feature
 */

import { memo, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../../../../store/store';
import axios from '../../../../../axios';
import './SmoothLyrics.scss';

interface LyricLine {
  text: string;
  index: number;
}

export const SmoothLyrics = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const song = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );

  const playbackState = useAppSelector((state) => state.spotify.state);
  const position = playbackState?.position || 0;
  const duration = playbackState?.duration || 1;

  // Fetch lyrics when song changes
  useEffect(() => {
    const fetchLyrics = async () => {
      if (!song?.id) return;

      setLoading(true);
      try {
        const response = await axios.get(`/tracks/${song.id}`);
        const trackLyrics = response.data.lyrics;
        setLyrics(trackLyrics || null);

        if (trackLyrics) {
          // Parse lyrics into lines
          const lines = trackLyrics
            .split('\n')
            .filter((line: string) => line.trim())
            .map((text: string, index: number) => ({ text, index }));
          setLyricLines(lines);
        } else {
          setLyricLines([]);
        }
      } catch (error) {
        console.error('Failed to fetch lyrics:', error);
        setLyrics(null);
        setLyricLines([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [song?.id]);

  // Auto-scroll lyrics based on playback position
  useEffect(() => {
    if (!lyricLines.length || !containerRef.current) return;

    // Calculate which line should be highlighted based on progress
    const progress = position / duration;
    const targetLineIndex = Math.floor(progress * lyricLines.length);
    
    // Clamp to valid range
    const newLineIndex = Math.max(0, Math.min(targetLineIndex, lyricLines.length - 1));

    if (newLineIndex !== currentLineIndex) {
      setCurrentLineIndex(newLineIndex);

      // Scroll to the current line smoothly
      const lineElement = containerRef.current.querySelector(
        `[data-line-index="${newLineIndex}"]`
      ) as HTMLElement;

      if (lineElement) {
        lineElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [position, duration, lyricLines.length, currentLineIndex]);

  if (!song) return null;

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
          <p className="smooth-lyrics-empty-title">No lyrics available</p>
          <p className="smooth-lyrics-empty-subtitle">
            Lyrics will appear here when available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="smooth-lyrics">
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
