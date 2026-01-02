import { Col, Row, Space } from 'antd';
import AlbumSongDetails from './Album';
import Lyrics from './Lyrics';
import { ExpandOutIcon } from '../Icons';
import VolumeControls from '../Layout/components/PlayingBar/Volume';
import ControlButtons from '../Layout/components/PlayingBar/ControlButtons';
import SongProgressBar from '../Layout/components/PlayingBar/SongProgressBar';

import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../Tooltip';
import { AddSongToLibraryButton } from '../Actions/AddSongToLibrary';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { spotifyActions } from '../../store/slices/spotify';

interface FullScreenPlayerProps {
  onExit: () => Promise<void>;
}

const ExpandOutButton: FC<FullScreenPlayerProps> = (props) => {
  const [t] = useTranslation(['playingBar']);
  return (
    <Tooltip title={t('Exit full screen')}>
      <button title={t('Exit full screen')} style={{ marginLeft: 20 }} onClick={props.onExit}>
        <ExpandOutIcon />
      </button>
    </Tooltip>
  );
};

const AddToLibrary = () => {
  const dispatch = useAppDispatch();
  const song = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );
  const isLiked = useAppSelector((state) => state.spotify.liked);

  const handleToggle = () => {
    dispatch(spotifyActions.setLiked({ liked: !isLiked }));
  };

  return (
    <AddSongToLibraryButton size={20} isSaved={isLiked} id={song?.id!} onToggle={handleToggle} />
  );
};

export const FullScreenPlayer: FC<FullScreenPlayerProps> = (props) => {
  return (
    <div className='Full-screen-page'>
      <div></div>
      <div className='fullscreen-content-wrapper'>
        <Row gutter={[16, 16]} justify='center' className='fullscreen-controls-container'>
          <Col xs={24} sm={24} md={24} lg={24} xl={24}>
            <AlbumSongDetails />
          </Col>
          <Col xs={24} sm={24} md={24} lg={24} xl={24}>
            <SongProgressBar />
          </Col>
          <Col xs={8} sm={8} md={8} lg={8} xl={8} className='fullscreen-action-left'>
            <AddToLibrary />
          </Col>
          <Col xs={8} sm={8} md={8} lg={8} xl={8} className='fullscreen-action-center'>
            <ControlButtons />
          </Col>
          <Col xs={8} sm={8} md={8} lg={8} xl={8} className='fullscreen-action-right'>
            <Space>
              <VolumeControls />
              <ExpandOutButton onExit={props.onExit} />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={24} lg={24} xl={24}>
            <Lyrics />
          </Col>
        </Row>
      </div>
    </div>
  );
};

FullScreenPlayer.displayName = 'FullScreenPlayer';
