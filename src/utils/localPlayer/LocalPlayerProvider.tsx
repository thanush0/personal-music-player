/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, FC, memo } from 'react';
import { useAppDispatch } from '../../store/store';
import { spotifyActions } from '../../store/slices/spotify';
import { localPlayerService } from '../../services/localPlayer';
import { authActions } from '../../store/slices/auth';

export interface LocalPlayerProviderProps {
  onPlayerError: (message: string) => void;
  onPlayerLoading: () => void;
  onPlayerReady: () => void;
  children?: any;
}

const LocalPlayerProvider: FC<LocalPlayerProviderProps> = memo((props) => {
  const dispatch = useAppDispatch();
  const { onPlayerError, onPlayerLoading, onPlayerReady, children } = props;

  useEffect(() => {
    const initializePlayer = async () => {
      try {
        onPlayerLoading();

        // Setup playback state change listener
        localPlayerService.onPlaybackStateChange((state) => {
          // Convert local player state to Spotify-compatible format
          const spotifyState: Spotify.PlaybackState = {
            paused: !state.is_playing,
            position: state.position_ms,
            duration: state.duration_ms,
            track_window: {
              current_track: state.track,
              previous_tracks: [],
              next_tracks: [],
            },
            context: {
              uri: '',
              metadata: {} as any,
            },
            disallows: {
              pausing: false,
              peeking_next: false,
              peeking_prev: false,
              resuming: false,
              seeking: false,
              skipping_next: false,
              skipping_prev: false,
            },
            loading: false,
            timestamp: Date.now(),
            repeat_mode: 0,
            shuffle: false,
            restrictions: {
              disallow_pausing_reasons: [],
              disallow_peeking_next_reasons: [],
              disallow_peeking_prev_reasons: [],
              disallow_resuming_reasons: [],
              disallow_seeking_reasons: [],
              disallow_skipping_next_reasons: [],
              disallow_skipping_prev_reasons: [],
            },
            playback_id: '',
            playback_quality: 'high',
            playback_features: {
              hifi_status: 'none',
              playback_speed: {
                current: 1.0,
                selected: 1.0,
                restricted: false,
              },
              signal_ids: {},
            },
          } as any;

          dispatch(spotifyActions.setState({ state: spotifyState }));
        });

        // Set a mock device ID for compatibility
        dispatch(spotifyActions.setDeviceId({ deviceId: 'local-device' }));
        dispatch(spotifyActions.setActiveDevice({ activeDevice: 'local-device' }));

        // Mark player as loaded
        dispatch(authActions.setPlayerLoaded({ playerLoaded: true }));
        
        onPlayerReady();
      } catch (error) {
        console.error('Player initialization error:', error);
        onPlayerError('Failed to initialize audio player');
      }
    };

    initializePlayer();

    // Cleanup
    return () => {
      // No cleanup needed for HTML5 audio
    };
  }, [dispatch]);

  return <>{children}</>;
});

export default LocalPlayerProvider;
