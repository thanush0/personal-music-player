import { FC, memo, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { uiActions } from '../../store/slices/ui';
import { spotifyActions } from '../../store/slices/spotify';
import { AddSongToLibraryButton } from '../Actions/AddSongToLibrary';
import { Link } from 'react-router-dom';
import { TrackActionsWrapper } from '../Actions/TrackActions';
import { ArtistActionsWrapper } from '../Actions/ArtistActions';
import { playerService } from '../../services/player';
import { Canvas } from './Canvas';
import { fetchLyrics, parseLyrics } from '../../utils/lyricsService';
import './ExpandedPlayer.scss';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ExpandedPlayer: FC = memo(() => {
  const dispatch = useAppDispatch();
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  // State from Redux
  const isOpen = useAppSelector((state) => state.ui.expandedPlayerOpen);
  const currentTrack = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track
  );
  const playbackState = useAppSelector((state) => state.spotify.state);
  const isLiked = useAppSelector((state) => state.spotify.liked);

  // Asset state
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [animatedCoverUrl, setAnimatedCoverUrl] = useState<string | null>(null);
  const [parsedLyrics, setParsedLyrics] = useState<Array<{ time: number; text: string }> | null>(null);

  // Close handlers
  const handleClose = () => {
    dispatch(uiActions.closeExpandedPlayer());
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Keyboard handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, handleClose]);

  // Playback controls
  const handlePlayPause = async () => {
    if (!playbackState) return;
    if (playbackState.paused) {
      await playerService.startPlayback();
    } else {
      await playerService.pausePlayback();
    }
  };

  const handleNext = async () => {
    await playerService.nextTrack();
  };

  const handlePrevious = async () => {
    await playerService.previousTrack();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playbackState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const position = Math.floor(percent * playbackState.duration);
    playerService.seekToPosition(position);
  };

  const handleToggleLike = () => {
    dispatch(spotifyActions.setLiked({ liked: !isLiked }));
  };

  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Load assets when track changes
  useEffect(() => {
    if (!currentTrack?.id) {
      setCoverUrl('/images/playlist.png');
      setAnimatedCoverUrl(null);
      setParsedLyrics(null);
      return;
    }

    // Cover: always use backend cover endpoint
    setCoverUrl(`${API_URL}/tracks/${currentTrack.id}/cover`);

    // Canvas: always derived endpoint; Canvas will fallback if video fails
    setAnimatedCoverUrl(`${API_URL}/tracks/${currentTrack.id}/animated-cover`);

    // Lyrics: fetch from centralized service (prevents duplication with SmoothLyrics)
    const loadLyrics = async () => {
      const trackId = currentTrack.id as string;
      const text = await fetchLyrics(trackId);
      const parsed = parseLyrics(text);
      setParsedLyrics(parsed.length > 0 ? parsed : null);
    };

    loadLyrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);


  // Auto-scroll lyrics based on timestamp
  useEffect(() => {
    if (!parsedLyrics || !playbackState || !lyricsContainerRef.current) return;

    const currentTime = playbackState.position;
    
    // Find current lyric by timestamp
    const lyricIndex = parsedLyrics.findIndex((line, i) => {
      const nextLine = parsedLyrics[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });
    
    if (lyricIndex !== -1 && lyricIndex !== currentLyricIndex) {
      setCurrentLyricIndex(lyricIndex);
      
      // Scroll to current lyric
      const lyricElements = lyricsContainerRef.current.querySelectorAll('.lyric-line');
      if (lyricElements[lyricIndex]) {
        lyricElements[lyricIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackState?.position, parsedLyrics, currentLyricIndex, playbackState]);

  if (!isOpen || !currentTrack) return null;

  const trackName = currentTrack.name;
  const albumName = currentTrack.album?.name;

  const progress = playbackState
    ? (playbackState.position / playbackState.duration) * 100
    : 0;
  const currentTime = playbackState ? playbackState.position : 0;
  const totalTime = playbackState ? playbackState.duration : 0;
  const isPaused = playbackState?.paused ?? true;

  return (
    <div 
      className="expanded-player-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing"
    >
      <div className="expanded-player-container">
        {/* Close Button */}
        <button
          className="expanded-player-close"
          onClick={handleClose}
          aria-label="Close Now Playing"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        <div className="expanded-player-content">
          {/* Canvas - Spotify-style visual experience */}
          <div className="album-art-section">
            <div className="album-art-wrapper">
              <Canvas
                trackId={currentTrack.id!}
                animatedCoverUrl={animatedCoverUrl}
                staticCoverUrl={coverUrl}
                albumName={albumName}
              />
            </div>
          </div>

          {/* Track Info Section */}
          <div className="track-info-section">
            <TrackActionsWrapper
              saved={isLiked}
              track={currentTrack}
              trigger={['contextMenu']}
              onSavedToggle={handleToggleLike}
            >
              <h1 className="track-title">{trackName}</h1>
            </TrackActionsWrapper>

            <div className="track-artists">
              {currentTrack.artists.map((artist, i) => (
                <span key={artist.uri}>
                  <ArtistActionsWrapper artist={artist} trigger={['contextMenu']}>
                    <Link to={`/artist/${artist.uri.split(':').reverse()[0]}`} className="artist-link">
                      {artist.name}
                    </Link>
                  </ArtistActionsWrapper>
                  {i < currentTrack.artists.length - 1 && ', '}
                </span>
              ))}
            </div>

            {albumName && (
              <div className="track-album">{albumName}</div>
            )}

            <div className="track-actions">
              <AddSongToLibraryButton
                size={24}
                isSaved={isLiked}
                id={currentTrack.id!}
                onToggle={handleToggleLike}
              />
            </div>
          </div>

          {/* Lyrics Section */}
          {parsedLyrics ? (
            <div className="lyrics-section">
              <h2 className="lyrics-title">Lyrics</h2>
              <div className="lyrics-container" ref={lyricsContainerRef}>
                {parsedLyrics.map((line, index: number) => (
                  <div
                    key={index}
                    className={`lyric-line ${index === currentLyricIndex ? 'active' : ''} ${
                      index < currentLyricIndex ? 'past' : ''
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="lyrics-section">
              <div className="no-lyrics">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                <p>Lyrics not available</p>
              </div>
            </div>
          )}

          {/* Playback Controls Section */}
          <div className="playback-controls-section">
            {/* Progress Bar */}
            <div className="progress-section">
              <span className="time-label">{formatTime(currentTime)}</span>
              <div className="progress-bar-container" onClick={handleSeek}>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
                    <div className="progress-bar-handle" />
                  </div>
                </div>
              </div>
              <span className="time-label">{formatTime(totalTime)}</span>
            </div>

            {/* Control Buttons */}
            <div className="control-buttons">
              <button
                className="control-button"
                onClick={handlePrevious}
                aria-label="Previous track"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                className="control-button play-button"
                onClick={handlePlayPause}
                aria-label={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                )}
              </button>

              <button
                className="control-button"
                onClick={handleNext}
                aria-label="Next track"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ExpandedPlayer as typeof ExpandedPlayer;
