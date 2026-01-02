import axios from '../axios';
import { getAudioPlayer } from '../utils/audioPlayer';

/**
 * Local music player service - replacement for Spotify player service
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface PlaybackState {
  is_playing: boolean;
  position_ms: number;
  duration_ms: number;
  track: any;
  volume: number;
}

class LocalPlayerService {
  private audioPlayer = getAudioPlayer();
  private currentTrack: any = null;
  private queue: any[] = [];
  private currentIndex: number = 0;
  private shuffle: boolean = false;
  private repeat: 'off' | 'context' | 'track' = 'off';
  private stateChangeCallback: ((state: PlaybackState) => void) | null = null;

  constructor() {
    // Setup audio player callbacks
    this.audioPlayer.setOnStateChange((state) => {
      this.emitPlaybackState();
      
      // Auto-play next track when current track ends
      if (!state.paused && state.position >= state.duration - 100 && state.duration > 0) {
        this.handleTrackEnd();
      }
    });

    this.audioPlayer.setOnError((error) => {
      console.error('Audio player error:', error);
    });
  }

  private handleTrackEnd() {
    if (this.repeat === 'track') {
      this.audioPlayer.seek(0);
      this.audioPlayer.play();
    } else {
      this.next();
    }
  }

  private emitPlaybackState() {
    if (this.stateChangeCallback && this.currentTrack) {
      const state = this.audioPlayer.getState();
      this.stateChangeCallback({
        is_playing: !state.paused,
        position_ms: state.position,
        duration_ms: state.duration,
        track: this.currentTrack,
        volume: state.volume,
      });
    }
  }

  public onPlaybackStateChange(callback: (state: PlaybackState) => void) {
    this.stateChangeCallback = callback;
  }

  public async play(trackOrContext?: any, contextUri?: string) {
    try {
      if (trackOrContext) {
        // Play specific track or context
        if (Array.isArray(trackOrContext)) {
          // Playing a list of tracks
          this.queue = trackOrContext;
          this.currentIndex = 0;
          await this.playTrackAtIndex(0);
        } else if (trackOrContext.id) {
          // Playing a single track
          await this.playTrack(trackOrContext);
        }
      } else {
        // Resume playback
        await this.audioPlayer.play();
      }
    } catch (error) {
      console.error('Play error:', error);
      throw error;
    }
  }

  private currentQuality: 'standard' | 'enhanced' = 'standard';
  
  public setQuality(quality: 'standard' | 'enhanced') {
    this.currentQuality = quality;
  }
  
  public getQuality(): 'standard' | 'enhanced' {
    return this.currentQuality;
  }

  private async playTrack(track: any) {
    // Fetch full track data with assets from backend
    try {
      const response = await axios.get(`${API_URL}/tracks/${track.id}`);
      const fullTrack = response.data;
      
      // Enrich track with asset URLs and metadata
      this.currentTrack = {
        ...track,
        // Add local asset URLs
        cover_url: fullTrack.cover_url || `${API_URL}/tracks/${track.id}/cover`,
        animated_cover_url: fullTrack.animated_cover_url || null,
        lyrics: fullTrack.lyrics || null,
        has_enhanced_version: fullTrack.has_enhanced_version || false,
        enhancement_preset: fullTrack.enhancement_preset || null,
      };
    } catch (error) {
      console.error('Failed to fetch full track metadata:', error);
      // Fall back to basic track data
      this.currentTrack = track;
    }
    
    // Use quality parameter in stream URL to support quality switching
    const streamUrl = `${API_URL}/tracks/${track.id}/stream?quality=${this.currentQuality}`;
    
    try {
      await this.audioPlayer.loadTrack(track.id, streamUrl);
      await this.audioPlayer.play();
      this.emitPlaybackState();
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  }
  
  public async switchQuality(quality: 'standard' | 'enhanced') {
    if (!this.currentTrack) return;
    
    const wasPlaying = !this.audioPlayer.getState().paused;
    const currentPosition = this.audioPlayer.getCurrentTime();
    
    // Update quality setting
    this.currentQuality = quality;
    
    // Reload track with new quality
    const streamUrl = `${API_URL}/tracks/${this.currentTrack.id}/stream?quality=${quality}`;
    
    try {
      await this.audioPlayer.loadTrack(this.currentTrack.id, streamUrl);
      
      // Restore position
      this.audioPlayer.seek(currentPosition);
      
      // Resume playback if it was playing
      if (wasPlaying) {
        await this.audioPlayer.play();
      }
      
      this.emitPlaybackState();
    } catch (error) {
      console.error('Error switching quality:', error);
      throw error;
    }
  }

  private async playTrackAtIndex(index: number) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      await this.playTrack(this.queue[index]);
    }
  }

  public async pause() {
    this.audioPlayer.pause();
    this.emitPlaybackState();
  }

  public async togglePlay() {
    await this.audioPlayer.togglePlay();
    this.emitPlaybackState();
  }

  public async next() {
    if (this.queue.length === 0) return;

    let nextIndex = this.currentIndex + 1;
    
    if (this.shuffle) {
      nextIndex = Math.floor(Math.random() * this.queue.length);
    }
    
    if (nextIndex >= this.queue.length) {
      if (this.repeat === 'context') {
        nextIndex = 0;
      } else {
        // End of queue
        this.pause();
        return;
      }
    }
    
    await this.playTrackAtIndex(nextIndex);
  }

  public async previous() {
    // If more than 3 seconds into the song, restart it
    if (this.audioPlayer.getCurrentTime() > 3000) {
      this.audioPlayer.seek(0);
      return;
    }

    if (this.queue.length === 0) return;

    let prevIndex = this.currentIndex - 1;
    
    if (prevIndex < 0) {
      if (this.repeat === 'context') {
        prevIndex = this.queue.length - 1;
      } else {
        // Go to start of current track
        this.audioPlayer.seek(0);
        return;
      }
    }
    
    await this.playTrackAtIndex(prevIndex);
  }

  public seek(positionMs: number) {
    this.audioPlayer.seek(positionMs);
    this.emitPlaybackState();
  }

  public setVolume(volume: number) {
    this.audioPlayer.setVolume(volume);
    this.emitPlaybackState();
  }

  public getVolume(): number {
    return this.audioPlayer.getVolume();
  }

  public setShuffle(enabled: boolean) {
    this.shuffle = enabled;
  }

  public setRepeat(mode: 'off' | 'context' | 'track') {
    this.repeat = mode;
  }

  public getState(): PlaybackState | null {
    if (!this.currentTrack) return null;
    
    const state = this.audioPlayer.getState();
    return {
      is_playing: !state.paused,
      position_ms: state.position,
      duration_ms: state.duration,
      track: this.currentTrack,
      volume: state.volume,
    };
  }

  public getCurrentTrack() {
    return this.currentTrack;
  }

  public getQueue() {
    return this.queue;
  }

  public setQueue(tracks: any[]) {
    this.queue = tracks;
  }

  public addToQueue(track: any) {
    this.queue.push(track);
  }
}

export const localPlayerService = new LocalPlayerService();
