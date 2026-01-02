/**
 * HTML5 Audio Player - Replacement for Spotify Web Playback SDK
 * Enhanced with Dolby Atmos-like 3D Spatial Audio
 */

import { getAudioEnhancer } from './audioEnhancer';

export class AudioPlayer {
  private audio: HTMLAudioElement;
  private currentTrackId: string | null = null;
  private onStateChange: ((state: any) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize audio enhancement
    this.initializeAudioEnhancement();
  }
  
  private initializeAudioEnhancement() {
    // OFFLINE ENHANCEMENT: Audio enhancement is now handled by the backend using FFmpeg
    // Enhanced audio files are pre-processed and stored permanently
    // No Web Audio API is used - only standard HTML5 audio playback
  }

  private setupEventListeners() {
    // Playback events
    this.audio.addEventListener('play', () => this.emitState());
    this.audio.addEventListener('pause', () => this.emitState());
    this.audio.addEventListener('ended', () => this.emitState());
    this.audio.addEventListener('timeupdate', () => this.emitState());
    this.audio.addEventListener('loadedmetadata', () => this.emitState());
    this.audio.addEventListener('volumechange', () => this.emitState());
    
    // Error handling
    this.audio.addEventListener('error', (e) => {
      const error = this.audio.error;
      let message = 'Playback error';
      
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            message = 'Playback aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            message = 'Network error';
            break;
          case error.MEDIA_ERR_DECODE:
            message = 'Decoding error';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Audio format not supported';
            break;
        }
      }
      
      if (this.onError) {
        this.onError(message);
      }
    });
  }

  private emitState() {
    if (this.onStateChange) {
      const state = this.getState();
      this.onStateChange(state);
    }
  }

  public getState() {
    return {
      paused: this.audio.paused,
      position: Math.floor(this.audio.currentTime * 1000), // milliseconds
      duration: Math.floor(this.audio.duration * 1000) || 0,
      volume: this.audio.volume,
      track_id: this.currentTrackId,
      loading: this.audio.readyState < 3,
    };
  }

  public async loadTrack(trackId: string, trackUrl: string): Promise<void> {
    this.currentTrackId = trackId;
    this.audio.src = trackUrl;
    this.audio.load();
    
    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = (e: Event) => {
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
        reject(new Error('Failed to load track'));
      };
      
      this.audio.addEventListener('canplay', onCanPlay, { once: true });
      this.audio.addEventListener('error', onError, { once: true });
    });
  }

  public async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      console.error('Play error:', error);
      if (this.onError) {
        this.onError('Failed to play audio');
      }
      throw error;
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public async togglePlay(): Promise<void> {
    if (this.audio.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  public seek(positionMs: number): void {
    this.audio.currentTime = positionMs / 1000;
  }

  public setVolume(volume: number): void {
    // Volume should be between 0 and 1
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.audio.volume;
  }

  public getCurrentTime(): number {
    return Math.floor(this.audio.currentTime * 1000);
  }

  public getDuration(): number {
    return Math.floor(this.audio.duration * 1000) || 0;
  }

  public isPaused(): boolean {
    return this.audio.paused;
  }

  public setOnStateChange(callback: (state: any) => void): void {
    this.onStateChange = callback;
  }

  public setOnError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }
}

// Singleton instance
let audioPlayerInstance: AudioPlayer | null = null;

export const getAudioPlayer = (): AudioPlayer => {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new AudioPlayer();
  }
  return audioPlayerInstance;
};
