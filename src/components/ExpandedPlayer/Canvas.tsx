import { FC, useEffect, useRef, useState } from 'react';
import './Canvas.scss';

interface CanvasProps {
  trackId: string;
  animatedCoverUrl: string | null;
  staticCoverUrl: string;
  albumName?: string;
}

/**
 * Canvas component - Spotify-style looping visual for Now Playing
 * 
 * Priority:
 * 1. animated_cover.mp4 (looping video)
 * 2. animated_cover.webm (fallback video format)
 * 3. cover.jpg (static image fallback)
 * 
 * Performance:
 * - Only re-renders when trackId changes
 * - Respects prefers-reduced-motion
 * - Smooth fade-in transitions
 * - Error handling with automatic fallback
 */
export const Canvas: FC<CanvasProps> = ({ 
  trackId, 
  animatedCoverUrl, 
  staticCoverUrl, 
  albumName 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);

  // Detect prefers-reduced-motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Reset state when track changes
  useEffect(() => {
    setVideoError(false);
    setIsVideoLoaded(false);
    setShowVideo(false);

    // Only show video if:
    // 1. Animated cover URL exists
    // 2. User doesn't prefer reduced motion
    if (animatedCoverUrl && !prefersReducedMotion) {
      setShowVideo(true);
    }
  }, [trackId, animatedCoverUrl, prefersReducedMotion]);

  // Handle video load success
  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true') {
          console.warn('Canvas autoplay failed:', error);
        }
      });
    }
  };

  // Handle video error - fallback to static image
  const handleVideoError = () => {
    if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true') {
      console.warn('Canvas video failed to load, falling back to static cover');
    }
    setVideoError(true);
    setShowVideo(false);
  };

  // Determine what to render
  const shouldRenderVideo = showVideo && !videoError && animatedCoverUrl;

  return (
    <div className="canvas-container">
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          key={trackId} // Force remount on track change
          className={`canvas-video ${isVideoLoaded ? 'canvas-loaded' : ''}`}
          src={animatedCoverUrl || undefined}
          poster={staticCoverUrl || undefined}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
          aria-label={`Visual for ${albumName || 'current track'}`}
        />
      ) : (
        staticCoverUrl && (
          <img
            key={trackId} // Force remount on track change
            className="canvas-image canvas-loaded"
            src={staticCoverUrl}
            alt={`${albumName || 'Album'} artwork`}
            loading="eager"
          />
        )
      )}
    </div>
  );
};
