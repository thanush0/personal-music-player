import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Switch, Select, Button, Input, message, Divider, Space } from 'antd';
import { 
  SettingOutlined, 
  AudioOutlined, 
  DownloadOutlined,
  DatabaseOutlined,
  SoundOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import './styles.scss';

const { Option } = Select;

const Settings = () => {
  const navigate = useNavigate();
  
  // Settings state
  const [audioQuality, setAudioQuality] = useState(localStorage.getItem('audioQuality') || 'high');
  const [autoPlay, setAutoPlay] = useState(localStorage.getItem('autoPlay') === 'true');
  const [crossfade, setCrossfade] = useState(parseInt(localStorage.getItem('crossfade') || '0'));
  const [normalizeVolume, setNormalizeVolume] = useState(localStorage.getItem('normalizeVolume') === 'true');
  const [showUnavailable, setShowUnavailable] = useState(localStorage.getItem('showUnavailable') === 'true');
  const [downloadFormat, setDownloadFormat] = useState(localStorage.getItem('downloadFormat') || 'mp3');
  const [downloadQuality, setDownloadQuality] = useState(localStorage.getItem('downloadQuality') || 'best');
  const [autoFetchLyrics, setAutoFetchLyrics] = useState(localStorage.getItem('autoFetchLyrics') === 'true');
  const [enableRecommendations, setEnableRecommendations] = useState(localStorage.getItem('enableRecommendations') !== 'false');

  const handleSave = () => {
    localStorage.setItem('audioQuality', audioQuality);
    localStorage.setItem('autoPlay', autoPlay.toString());
    localStorage.setItem('crossfade', crossfade.toString());
    localStorage.setItem('normalizeVolume', normalizeVolume.toString());
    localStorage.setItem('showUnavailable', showUnavailable.toString());
    localStorage.setItem('downloadFormat', downloadFormat);
    localStorage.setItem('downloadQuality', downloadQuality);
    localStorage.setItem('autoFetchLyrics', autoFetchLyrics.toString());
    localStorage.setItem('enableRecommendations', enableRecommendations.toString());
    
    message.success('Settings saved successfully!');
  };

  const handleRescanLibrary = async () => {
    try {
      message.loading('Rescanning library...', 0);
      const response = await fetch('http://localhost:8000/admin/rescan', {
        method: 'POST',
      });
      
      if (response.ok) {
        message.destroy();
        message.success('Library rescanned successfully!');
      } else {
        message.destroy();
        message.error('Failed to rescan library');
      }
    } catch (error) {
      message.destroy();
      message.error('Backend server not available');
      console.error('Rescan error:', error);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Button 
          type="text" 
          onClick={() => navigate(-1)}
          style={{ marginRight: '16px' }}
        >
          ← Back
        </Button>
        <h1>
          <SettingOutlined /> Settings
        </h1>
      </div>

      <div className="settings-content">
        {/* Playback Settings */}
        <Card title={<><SoundOutlined /> Playback</>} className="settings-card">
          <div className="setting-item">
            <div className="setting-info">
              <h3>Audio Quality</h3>
              <p>Select streaming quality for music playback</p>
            </div>
            <Select 
              value={audioQuality} 
              onChange={setAudioQuality}
              style={{ width: 150 }}
            >
              <Option value="low">Low (96 kbps)</Option>
              <Option value="normal">Normal (160 kbps)</Option>
              <Option value="high">High (320 kbps)</Option>
            </Select>
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Autoplay</h3>
              <p>Play similar songs when your music ends</p>
            </div>
            <Switch checked={autoPlay} onChange={setAutoPlay} />
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Crossfade</h3>
              <p>Smooth transitions between songs (seconds)</p>
            </div>
            <Select 
              value={crossfade} 
              onChange={setCrossfade}
              style={{ width: 150 }}
            >
              <Option value={0}>Off</Option>
              <Option value={2}>2 seconds</Option>
              <Option value={5}>5 seconds</Option>
              <Option value={10}>10 seconds</Option>
            </Select>
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Normalize Volume</h3>
              <p>Set the same volume level for all songs</p>
            </div>
            <Switch checked={normalizeVolume} onChange={setNormalizeVolume} />
          </div>
        </Card>

        {/* Download Settings */}
        <Card title={<><DownloadOutlined /> YouTube Downloads</>} className="settings-card">
          <div className="setting-item">
            <div className="setting-info">
              <h3>Download Format</h3>
              <p>Preferred audio format for downloads</p>
            </div>
            <Select 
              value={downloadFormat} 
              onChange={setDownloadFormat}
              style={{ width: 150 }}
            >
              <Option value="mp3">MP3</Option>
              <Option value="flac">FLAC</Option>
              <Option value="m4a">M4A</Option>
              <Option value="ogg">OGG</Option>
              <Option value="wav">WAV</Option>
            </Select>
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Download Quality</h3>
              <p>Audio quality for downloaded files</p>
            </div>
            <Select 
              value={downloadQuality} 
              onChange={setDownloadQuality}
              style={{ width: 150 }}
            >
              <Option value="best">Best</Option>
              <Option value="320">320 kbps</Option>
              <Option value="256">256 kbps</Option>
              <Option value="192">192 kbps</Option>
              <Option value="128">128 kbps</Option>
            </Select>
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Auto-fetch Lyrics</h3>
              <p>Automatically download lyrics when adding songs</p>
            </div>
            <Switch checked={autoFetchLyrics} onChange={setAutoFetchLyrics} />
          </div>
        </Card>

        {/* Library Settings */}
        <Card title={<><DatabaseOutlined /> Library</>} className="settings-card">
          <div className="setting-item">
            <div className="setting-info">
              <h3>Show Unavailable Songs</h3>
              <p>Display songs that are not available on disk</p>
            </div>
            <Switch checked={showUnavailable} onChange={setShowUnavailable} />
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Enable Recommendations</h3>
              <p>Show song recommendations based on your library</p>
            </div>
            <Switch checked={enableRecommendations} onChange={setEnableRecommendations} />
          </div>

          <Divider />

          <div className="setting-item">
            <div className="setting-info">
              <h3>Rescan Library</h3>
              <p>Manually scan for new music files</p>
            </div>
            <Button onClick={handleRescanLibrary}>
              <AudioOutlined /> Rescan Now
            </Button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="settings-actions">
          <Button type="primary" size="large" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
