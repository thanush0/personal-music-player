import React, { useState, useEffect } from 'react';
import { Tooltip } from '../../../Tooltip';
import { useAppSelector } from '../../../../store/store';
import axios from 'axios';
import './AudioEnhancementControl.scss';

interface EnhancementPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const PRESETS: EnhancementPreset[] = [
  { id: 'atmos', name: 'Dolby Atmos', icon: '🎵', description: 'Wide soundstage, enhanced bass & clarity' },
  { id: 'bass_boost', name: 'Bass Boost', icon: '🔊', description: 'Heavy bass for EDM/Hip-Hop' },
  { id: 'clarity', name: 'Clarity', icon: '✨', description: 'Enhanced vocals & instruments' },
  { id: 'balanced', name: 'Balanced', icon: '🎧', description: 'Subtle enhancement for all genres' },
];

const AudioEnhancementControl: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [hasEnhanced, setHasEnhanced] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<string>('atmos');
  
  const currentTrack = useAppSelector((state) => state.spotify.state?.track_window.current_track);

  useEffect(() => {
    // Check if current track has enhanced version
    if (currentTrack?.id) {
      checkEnhancedVersion(currentTrack.id);
    }
  }, [currentTrack?.id]);

  const checkEnhancedVersion = async (trackId: string) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${API_URL}/tracks/${trackId}/versions`);
      const hasEnhancedVersion = !!response.data.enhanced;
      setHasEnhanced(hasEnhancedVersion);
      if (hasEnhancedVersion) {
        setCurrentPreset(response.data.enhanced.preset || 'atmos');
      }
    } catch (error: any) {
      // Silently fail - not all tracks have enhanced versions
      if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true') {
        console.log('Enhanced version check:', error?.message || String(error));
      }
      setHasEnhanced(false);
    }
  };

  const handleEnhanceTrack = async (preset: string) => {
    if (!currentTrack?.id) return;
    
    setIsEnhancing(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      await axios.post(`${API_URL}/tracks/${currentTrack.id}/enhance?preset=${preset}`);
      setHasEnhanced(true);
      setCurrentPreset(preset);
      setUseEnhanced(true);
      
      // DO NOT reload - quality switching should be seamless
      // Enhanced audio will be available on next quality switch
    } catch (error) {
      console.error('Enhancement failed:', error);
      alert('Failed to enhance track. Make sure FFmpeg is installed on the backend.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDeleteEnhanced = async () => {
    if (!currentTrack?.id) return;
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      await axios.delete(`${API_URL}/tracks/${currentTrack.id}/enhanced`);
      setHasEnhanced(false);
      setUseEnhanced(false);
      
      // Switch back to standard quality without reload
      try {
        const { localPlayerService } = await import('../../../../services/localPlayer');
        await localPlayerService.switchQuality('standard');
      } catch (error) {
        console.error('Failed to switch to standard quality:', error);
      }
    } catch (error) {
      console.error('Failed to delete enhanced version:', error);
    }
  };

  const toggleUseEnhanced = async () => {
    if (hasEnhanced) {
      const newState = !useEnhanced;
      setUseEnhanced(newState);
      
      // Switch audio quality in the player
      try {
        const { localPlayerService } = await import('../../../../services/localPlayer');
        await localPlayerService.switchQuality(newState ? 'enhanced' : 'standard');
        console.log('Switched to', newState ? 'enhanced' : 'standard', 'audio');
      } catch (error) {
        console.error('Failed to switch quality:', error);
      }
    }
  };

  return (
    <div className="audio-enhancement-control">
      <Tooltip title={hasEnhanced && useEnhanced ? "Enhanced Audio" : "Audio Enhancement"}>
        <button
          className={`enhancement-button ${hasEnhanced && useEnhanced ? 'active' : ''}`}
          onClick={() => setShowPanel(!showPanel)}
          aria-label="Audio Enhancement"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L3 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 2.18l7 3.82v8c0 4.52-2.98 8.69-7 9.93-4.02-1.24-7-5.41-7-9.93V8l7-3.82zM12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/>
          </svg>
          {hasEnhanced && useEnhanced && <span className="enhancement-badge">✨</span>}
        </button>
      </Tooltip>

      {showPanel && (
        <div className="enhancement-panel">
          <div className="enhancement-panel-header">
            <h3>Audio Enhancement</h3>
            <button 
              className="close-button" 
              onClick={() => setShowPanel(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {!currentTrack && (
            <div className="no-track-message">
              <div className="no-track-icon">🎵</div>
              <p>Play a track to enhance it</p>
            </div>
          )}

          {currentTrack && (
            <>
              {hasEnhanced ? (
                <div className="enhanced-view">
                  <div className="status-card">
                    <div className="status-icon">✨</div>
                    <div className="status-content">
                      <h4>Enhanced Audio Active</h4>
                      <p className="preset-name">{PRESETS.find(p => p.id === currentPreset)?.name || currentPreset}</p>
                    </div>
                    <div className="status-indicator active"></div>
                  </div>

                  <div className="enhancement-toggle">
                    <label className="toggle-label">
                      <span className="toggle-text">
                        {useEnhanced ? 'Enhanced' : 'Original'}
                      </span>
                      <input
                        type="checkbox"
                        checked={useEnhanced}
                        onChange={toggleUseEnhanced}
                      />
                      <span className="toggle-switch"></span>
                    </label>
                  </div>

                  <button 
                    className="delete-button"
                    onClick={handleDeleteEnhanced}
                  >
                    <span className="delete-icon">🗑️</span>
                    <span>Remove Enhancement</span>
                  </button>
                </div>
              ) : (
                <div className="presets-view">
                  <div className="presets-header">
                    <h4>Choose Enhancement</h4>
                    <p>Transform your audio with professional presets</p>
                  </div>

                  <div className="presets-grid">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className={`preset-card ${isEnhancing ? 'disabled' : ''}`}
                        onClick={() => handleEnhanceTrack(preset.id)}
                        disabled={isEnhancing}
                      >
                        <div className="preset-icon">{preset.icon}</div>
                        <div className="preset-content">
                          <h5 className="preset-name">{preset.name}</h5>
                          <p className="preset-description">{preset.description}</p>
                        </div>
                        <div className="preset-arrow">→</div>
                      </button>
                    ))}
                  </div>

                  {isEnhancing && (
                    <div className="processing-overlay">
                      <div className="processing-card">
                        <div className="processing-spinner"></div>
                        <h4>Enhancing Audio</h4>
                        <p>This will take a moment...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioEnhancementControl;
