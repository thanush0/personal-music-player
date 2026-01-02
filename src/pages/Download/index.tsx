import { useState } from 'react';
import { Button, Input, Select, Card, message, Progress, Typography, Space, Alert } from 'antd';
import { DownloadOutlined, YoutubeOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from '../../axios';
import './styles.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  uploader: string;
  thumbnail: string;
  description: string;
}

export const Download = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [progress, setProgress] = useState(0);

  const formatOptions = [
    { value: 'mp3', label: 'MP3 (Most Compatible)' },
    { value: 'flac', label: 'FLAC (Lossless)' },
    { value: 'm4a', label: 'M4A/AAC (High Quality)' },
    { value: 'ogg', label: 'OGG Vorbis' },
    { value: 'wav', label: 'WAV (Uncompressed)' },
  ];

  const qualityOptions = [
    { value: 'best', label: 'Best Available' },
    { value: '320', label: '320 kbps (High)' },
    { value: '256', label: '256 kbps (Good)' },
    { value: '192', label: '192 kbps (Medium)' },
    { value: '128', label: '128 kbps (Low)' },
  ];

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      message.warning('Please enter a YouTube URL');
      return;
    }

    setFetchingInfo(true);
    setVideoInfo(null);

    try {
      const response = await axios.post(`/download/youtube/info?url=${encodeURIComponent(url)}`);
      setVideoInfo(response.data);
      message.success('Video info fetched successfully');
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to fetch video info');
      console.error('Error fetching video info:', error);
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      message.warning('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const response = await axios.post(
        `/download/youtube?url=${encodeURIComponent(url)}&format=${format}&quality=${quality}`
      );

      message.success(`Downloaded: ${response.data.title}`);
      setProgress(100);
      
      // Clear form
      setTimeout(() => {
        setUrl('');
        setVideoInfo(null);
        setProgress(0);
      }, 2000);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Download failed');
      console.error('Download error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="download-page">
      <div className="download-container">
        <div className="download-header">
          <YoutubeOutlined className="youtube-icon" />
          <Title level={2}>Download Music from YouTube</Title>
          <Paragraph type="secondary">
            Convert and download YouTube videos as high-quality audio files
          </Paragraph>
        </div>

        <Card className="download-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className="input-section">
              <Text strong>YouTube URL</Text>
              <Input.Search
                size="large"
                placeholder="Paste YouTube video or playlist URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onSearch={fetchVideoInfo}
                enterButton="Get Info"
                loading={fetchingInfo}
                prefix={<YoutubeOutlined />}
              />
            </div>

            {videoInfo && (
              <Card className="video-info-card" size="small">
                <div className="video-info">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title}
                    className="video-thumbnail"
                  />
                  <div className="video-details">
                    <Title level={4}>{videoInfo.title}</Title>
                    <Text type="secondary">{videoInfo.uploader}</Text>
                    <br />
                    <Text type="secondary">
                      Duration: {formatDuration(videoInfo.duration)}
                    </Text>
                  </div>
                </div>
              </Card>
            )}

            <div className="options-section">
              <div className="option-group">
                <Text strong>Audio Format</Text>
                <Select
                  size="large"
                  value={format}
                  onChange={setFormat}
                  style={{ width: '100%' }}
                >
                  {formatOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="option-group">
                <Text strong>Quality</Text>
                <Select
                  size="large"
                  value={quality}
                  onChange={setQuality}
                  style={{ width: '100%' }}
                  disabled={format === 'flac' || format === 'wav'}
                >
                  {qualityOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            {loading && progress > 0 && (
              <Progress 
                percent={progress} 
                status={progress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            )}

            <Button
              type="primary"
              size="large"
              block
              icon={loading ? <LoadingOutlined /> : <DownloadOutlined />}
              onClick={handleDownload}
              loading={loading}
              disabled={!url.trim() || loading}
            >
              {loading ? 'Downloading...' : 'Download Audio'}
            </Button>

            <Alert
              message="Requirements"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>FFmpeg must be installed on your system</li>
                  <li>Downloads will be added to your music library automatically</li>
                  <li>Lossless formats (FLAC, WAV) provide best quality</li>
                  <li>MP3 is most compatible with all devices</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Space>
        </Card>

        <div className="features-section">
          <Title level={4}>Features</Title>
          <div className="features-grid">
            <div className="feature-item">
              <Text strong>🎵 Multiple Formats</Text>
              <Text type="secondary">MP3, FLAC, M4A, OGG, WAV</Text>
            </div>
            <div className="feature-item">
              <Text strong>🎚️ Quality Options</Text>
              <Text type="secondary">From 128kbps to lossless</Text>
            </div>
            <div className="feature-item">
              <Text strong>🎨 Metadata & Art</Text>
              <Text type="secondary">Automatic thumbnail embedding</Text>
            </div>
            <div className="feature-item">
              <Text strong>📚 Auto Import</Text>
              <Text type="secondary">Added to library instantly</Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Download;
