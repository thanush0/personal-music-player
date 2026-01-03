/**
 * VideoThumbnail Component
 * Displays animated thumbnail for the currently playing track
 * Similar to Spotify's Canvas feature
 */

import { memo, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../../../../store/store';
import './VideoThumbnail.scss';

export const VideoThumbnail = memo(() => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  const song = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );

  const isPlaying = useAppSelector(
    (state) => !state.spotify.state?.paused
  );

  useEffect(() => {
    if (!song?.id) return;

    // Check if there's an animated cover available
    const checkAnimatedCover = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/tracks/${song.id}/animated-cover`, {
          method: 'HEAD'
        });
        
        if (response.ok) {
          setHasVideo(true);
          if (videoRef.current) {
            videoRef.current.src = `${API_URL}/tracks/${song.id}/animated-cover`;
            videoRef.current.load();
          }
        } else {
          setHasVideo(false);
          // Use cover.jpg if available, otherwise fallback to album art
          const coverResponse = await fetch(`${API_URL}/tracks/${song.id}/cover`, {
            method: 'HEAD'
          });
          
          if (coverResponse.ok) {
            setImageUrl(`${API_URL}/tracks/${song.id}/cover`);
          } else {
            setImageUrl(song.album?.images?.[0]?.url || '');
          }
        }
      } catch (error) {
        console.error('Error checking media:', error);
        setHasVideo(false);
        setImageUrl(song.album?.images?.[0]?.url || '');
      }
    };

    checkAnimatedCover();
  }, [song?.id]);

  // Animate the canvas with album art
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const animate = () => {
        if (!isPlaying) return;

        // Apply animated effects to the image
        const time = Date.now() / 1000;
        
        // Clear and draw base image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle zoom and pan effect
        const scale = 1 + Math.sin(time * 0.5) * 0.02;
        const offsetX = Math.sin(time * 0.3) * 5;
        const offsetY = Math.cos(time * 0.3) * 5;
        
        ctx.save();
        ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();
        
        // Add gradient overlay for depth
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (isPlaying) {
          requestAnimationFrame(animate);
        }
      };
      
      if (isPlaying) {
        animate();
      } else {
        // Draw static image when paused
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
    
    img.src = imageUrl;
  }, [imageUrl, isPlaying]);

  if (!song) return null;

  return (
    <div className="video-thumbnail">
      <div className="video-thumbnail-container">
        {hasVideo ? (
          <video
            ref={videoRef}
            className="video-thumbnail-video"
            loop
            muted
            playsInline
            autoPlay={isPlaying}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="video-thumbnail-canvas"
            width={640}
            height={640}
          />
        )}
        
        {/* Overlay gradient for text readability */}
        <div className="video-thumbnail-overlay" />
      </div>
    </div>
  );
});

VideoThumbnail.displayName = 'VideoThumbnail';
