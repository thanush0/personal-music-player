import { memo, useState, useEffect } from 'react';
import { useAppSelector } from '../../store/store';
import axios from '../../axios';

const Lyrics = memo(() => {
  const currentSong = useAppSelector(
    (state) => state.spotify.state?.track_window.current_track,
    (a, b) => a?.id === b?.id
  );

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLyrics = async () => {
      if (!currentSong?.id) {
        setLyrics(null);
        return;
      }

      setIsLoading(true);
      try {
        const response = await axios.get(`/tracks/${currentSong.id}`);
        setLyrics(response.data.lyrics || null);
      } catch (error) {
        console.error('Failed to fetch lyrics:', error);
        setLyrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [currentSong?.id]);

  if (!currentSong) return null;

  if (isLoading) {
    return (
      <div className='lyrics-container'>
        <div className='lyrics-loading'>Loading lyrics...</div>
      </div>
    );
  }

  if (!lyrics) {
    return (
      <div className='lyrics-container'>
        <div className='lyrics-empty'>
          <p>No lyrics available for this song</p>
          <p className='lyrics-hint'>Lyrics will be displayed here when available</p>
        </div>
      </div>
    );
  }

  return (
    <div className='lyrics-container'>
      <div className='lyrics-content'>
        {lyrics.split('\n').map((line, index) => (
          <p key={index} className='lyrics-line'>
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );
});

Lyrics.displayName = 'Lyrics';

export default Lyrics;
