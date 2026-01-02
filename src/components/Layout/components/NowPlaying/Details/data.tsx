import { Col, Row } from 'antd';
import React, { type FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../../../store/store';

interface NowPlayingCardProps {
  title: string;
  albumId: string;
  extra?: any;
  children?: any;
  image?: string;
  imageTitle?: string;
  subtitle?: string | ReactNode;
}

export const NowPlayingCard: FC<NowPlayingCardProps> = (props) => {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = React.useState(props.image);
  const { useAppSelector } = require('../../../../../store/store');
  
  const currentTrack = useAppSelector(
    (state: any) => state.spotify.state?.track_window?.current_track
  );
  
  // Try to load cover.jpg from track's folder if available
  React.useEffect(() => {
    const loadCover = async () => {
      if (!currentTrack?.id) {
        setCoverImage(props.image);
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:8000/tracks/${currentTrack.id}/cover`, {
          method: 'HEAD'
        });
        
        if (response.ok) {
          setCoverImage(`http://localhost:8000/tracks/${currentTrack.id}/cover`);
          return;
        }
      } catch (error) {
        console.error('Error loading cover:', error);
      }
      setCoverImage(props.image);
    };
    
    loadCover();
  }, [props.image, currentTrack?.id]);
  
  return (
    <div className='playing-now-card'>
      {coverImage ? (
        <div
          onClick={() => navigate(`/album/${props.albumId}`)}
          className='playing-now-card-image'
          style={{
            cursor: 'pointer',
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 50%), url("${coverImage}")`,
          }}
        >
          <div className='playing-now-card-image-text'>
            <div data-encore-id='text'>
              <div>{props.imageTitle}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className='playing-now-card-text'>
        <Row align='middle' justify='space-between'>
          <Col span={props.extra ? 20 : 24}>
            <div
              className='playing-now-card-title'
              style={props.image ? undefined : { marginTop: 10 }}
            >
              {props.title}
            </div>
            <div className='playing-now-card-subtitle'>{props.subtitle}</div>
          </Col>
          {props.extra ? (
            <Col span={2} style={{ textAlign: 'right' }}>
              {props.extra}
            </Col>
          ) : null}
        </Row>
        {props.children ? <div className='playing-now-card-body'>{props.children}</div> : null}
      </div>
    </div>
  );
};
