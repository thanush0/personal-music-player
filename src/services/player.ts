import axios from '../axios';
import { localPlayerService } from './localPlayer';
import type { Pagination } from '../interfaces/api';
import { Device } from '../interfaces/devices';
import type { PlayHistoryObject } from '../interfaces/player';

/**
 * @description Get information about the user's current playback state
 */
const fetchPlaybackState = async () => {
  const state = localPlayerService.getState();
  return state;
};

/**
 * @description Transfer playback to a new device (no-op for local player)
 */
const transferPlayback = async (deviceId: string) => {
  // No-op for local player since we only have one device
  return Promise.resolve();
};

/**
 * @description Get information about available devices
 */
const getAvailableDevices = async () => {
  // Return mock local device
  return {
    devices: [
      {
        id: 'local-device',
        name: 'Local Music Player',
        type: 'Computer',
        is_active: true,
        is_private_session: false,
        is_restricted: false,
        volume_percent: Math.floor(localPlayerService.getVolume() * 100),
      }
    ] as Device[]
  };
};

/**
 * @description Start or resume playback
 */
const startPlayback = async (
  body: { context_uri?: string; uris?: string[]; offset?: { position: number } } = {}
) => {
  if (body.uris && body.uris.length > 0) {
    // Extract track IDs and fetch tracks
    const trackIds = body.uris
      .filter(uri => uri && typeof uri === 'string') // Filter out undefined/null URIs
      .map(uri => uri.includes(':') ? uri.split(':').pop() : uri) // Handle both "spotify:track:id" and plain "id"
      .filter(Boolean);
    
    // Fetch tracks from backend
    const tracks = await Promise.all(
      trackIds.map(async (id) => {
        try {
          const response = await axios.get(`/tracks/${id}`);
          return response.data;
        } catch (error) {
          console.error(`Failed to fetch track ${id}:`, error);
          return null;
        }
      })
    );
    
    const validTracks = tracks.filter(Boolean);
    if (validTracks.length > 0) {
      await localPlayerService.play(validTracks);
    }
  } else {
    // Just resume
    await localPlayerService.play();
  }
};

/**
 * @description Pause playback
 */
const pausePlayback = async () => {
  await localPlayerService.pause();
};

/**
 * @description Skip to next track
 */
const nextTrack = async () => {
  await localPlayerService.next();
};

/**
 * @description Skip to previous track
 */
const previousTrack = async () => {
  await localPlayerService.previous();
};

/**
 * @description Seek to position in current track
 */
const seekToPosition = async (position_ms: number) => {
  localPlayerService.seek(position_ms);
};

/**
 * @description Set repeat mode
 */
const setRepeatMode = async (state: 'track' | 'context' | 'off') => {
  localPlayerService.setRepeat(state);
};

/**
 * @description Set volume (0-100)
 */
const setVolume = async (volume_percent: number) => {
  localPlayerService.setVolume(volume_percent / 100);
};

/**
 * @description Toggle shuffle
 */
const toggleShuffle = async (state: boolean) => {
  localPlayerService.setShuffle(state);
};

/**
 * @description Add track to queue
 */
const addToQueue = async (uri: string) => {
  if (!uri || typeof uri !== 'string') {
    console.error('Invalid URI provided to addToQueue:', uri);
    return;
  }
  
  // Handle both "spotify:track:id" and plain "id" formats
  const trackId = uri.includes(':') ? uri.split(':').pop() : uri;
  
  if (trackId) {
    try {
      const response = await axios.get(`/tracks/${trackId}`);
      localPlayerService.addToQueue(response.data);
    } catch (error) {
      console.error('Failed to add track to queue:', error);
    }
  }
};

/**
 * @description Get recently played tracks (mock for now)
 */
const getRecentlyPlayed = async (params: { limit?: number; after?: number; before?: number }) => {
  // For now, return empty - you can implement this later with local storage
  return {
    items: [],
    next: null,
    cursors: { after: '', before: '' },
    limit: params.limit || 20,
    href: '',
  };
};

export const playerService = {
  addToQueue,
  fetchPlaybackState,
  transferPlayback,
  startPlayback,
  pausePlayback,
  nextTrack,
  previousTrack,
  setRepeatMode,
  setVolume,
  toggleShuffle,
  seekToPosition,
  getRecentlyPlayed,
  getAvailableDevices,
};
