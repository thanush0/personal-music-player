import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Services
import { userService } from '../../services/users';
import { albumsService } from '../../services/albums';
import { artistService } from '../../services/artist';
import { playerService } from '../../services/player';
import { playlistService } from '../../services/playlists';

// Interfaces
import type { RootState } from '../store';
import type { Track } from '../../interfaces/track';
import type { Album } from '../../interfaces/albums';
import type { Artist } from '../../interfaces/artist';
import type { Playlist } from '../../interfaces/playlists';
import type { PlayHistoryObject } from '../../interfaces/player';
import { categoriesService } from '../../services/categories';

// Utils
import { groupBy, uniq, uniqBy } from 'lodash';

// Constants
import { MADE_FOR_YOU_URI, RANKING_URI, TRENDING_URI } from '../../constants/spotify';

const initialState: {
  topTracks: Track[];
  newReleases: Album[];
  madeForYou: Playlist[];
  featurePlaylists: Playlist[];
  rankings: Playlist[];
  trending: Playlist[];
  recentlyPlayed: (Track | Artist | Album)[];
  section: 'ALL' | 'MUSIC' | 'PODCAST';
} = {
  trending: [],
  rankings: [],
  topTracks: [],
  section: 'ALL',
  madeForYou: [],
  newReleases: [],
  recentlyPlayed: [],
  featurePlaylists: [],
};

export const fetchMadeForYou = createAsyncThunk('home/fetchMadeForYou', async () => {
  try {
    const response = await categoriesService.fetchCategoryPlaylists(MADE_FOR_YOU_URI, { limit: 50 });
    return response.data.playlists.items || [];
  } catch (error) {
    console.log('Error fetching made for you:', error);
    return [];
  }
});

export const fetchRanking = createAsyncThunk('home/fetchRanking', async () => {
  try {
    const response = await categoriesService.fetchCategoryPlaylists(RANKING_URI, { limit: 10 });
    return response.data.playlists.items || [];
  } catch (error) {
    console.log('Error fetching rankings:', error);
    return [];
  }
});

export const fetchTrending = createAsyncThunk('home/fetchTrending', async () => {
  try {
    const response = await categoriesService.fetchCategoryPlaylists(TRENDING_URI, { limit: 10 });
    return response.data.playlists.items || [];
  } catch (error) {
    console.log('Error fetching trending:', error);
    return [];
  }
});

export const fetchNewReleases = createAsyncThunk('home/fetchNewReleases', async () => {
  try {
    const response = await albumsService.fetchNewRelases({ limit: 10 });
    return response.data.albums.items || [];
  } catch (error) {
    console.log('Error fetching new releases:', error);
    return [];
  }
});

export const fetchTopTracks = createAsyncThunk('home/fetchTopTracks', async () => {
  try {
    const response = await userService.fetchTopTracks({ limit: 8, timeRange: 'short_term' });
    return response.data.items || [];
  } catch (error) {
    console.log('Error fetching top tracks:', error);
    return [];
  }
});

export const fetchRecentlyPlayed = createAsyncThunk('home/fetchRecentlyPlayed', async () => {
  try {
    const response = await playerService.getRecentlyPlayed({ limit: 50 });

    // Check if response has items
    if (!response.items || response.items.length === 0) {
      return [];
    }

    const items = response.items as PlayHistoryObject[];

    const groupedItems = groupBy(
      items.filter((item) => item.context && ['artist', 'playlist', 'album'].includes(item.context.type)),
      (item) => item.context!.type
    );

    const artistsTracks = groupedItems['artist'] || [];
    const albumsTracks = groupedItems['album'] || [];

    const artistsIds = uniq(
      artistsTracks
        .filter((item) => item.context?.uri)
        .map((item) => item.context!.uri.split(':')[2])
        .filter(Boolean)
    );
    const albumsIds = uniq(
      albumsTracks
        .filter((item) => item.context?.uri)
        .map((item) => item.context!.uri.split(':')[2])
        .filter(Boolean)
    );

    const promises = [
      artistsIds.length
        ? artistService.fetchArtists(artistsIds)
        : Promise.resolve({ data: { artists: [] } }),
      albumsIds.length
        ? albumsService.fetchAlbums(albumsIds)
        : Promise.resolve({ data: { albums: [] } }),
    ];

    const [artistsResponse, albumsResponse] = await Promise.all(promises);

    // @ts-ignore
    const artists: Artist[] = artistsResponse.data.artists;

    // @ts-ignore
    const albums: Album[] = albumsResponse.data.albums;

    const tracks = items.map((item) => {
      if (item.context?.type === 'artist' && item.context.uri) {
        const artistId = item.context.uri.split(':')[2];
        return artists.find((artist) => artist.id === artistId);
      }

      if (item.context?.type === 'album' && item.context.uri) {
        const albumId = item.context.uri.split(':')[2];
        return albums.find((album) => album.id === albumId);
      }

      return item.track;
    }).filter(Boolean);

    return uniqBy(tracks, 'id');
  } catch (error) {
    console.log(error);
    return [];
  }
});

export const fecthFeaturedPlaylists = createAsyncThunk(
  'home/fecthFeaturedPlaylists',
  async (_, { getState }) => {
    try {
      const state = getState() as RootState;
      const response = await playlistService.getFeaturedPlaylists({
        limit: 10,
        locale: state.language.language === 'es' ? 'es_AR' : undefined,
      });
      return response.data.playlists.items || [];
    } catch (error) {
      console.log('Error fetching featured playlists:', error);
      return [];
    }
  }
);

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setSection(state, action: PayloadAction<'ALL' | 'MUSIC' | 'PODCAST'>) {
      state.section = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNewReleases.fulfilled, (state, action) => {
      state.newReleases = action.payload as any as any[];
    });
    builder.addCase(fetchTopTracks.fulfilled, (state, action) => {
      state.topTracks = action.payload;
    });
    builder.addCase(fecthFeaturedPlaylists.fulfilled, (state, action) => {
      state.featurePlaylists = action.payload;
    });
    builder.addCase(fetchMadeForYou.fulfilled, (state, action) => {
      state.madeForYou = action.payload;
    });
    builder.addCase(fetchRecentlyPlayed.fulfilled, (state, action) => {
      state.recentlyPlayed = action.payload.filter((item): item is Track | Artist | Album => item !== undefined);
    });
    builder.addCase(fetchRanking.fulfilled, (state, action) => {
      state.rankings = action.payload;
    });
    builder.addCase(fetchTrending.fulfilled, (state, action) => {
      state.trending = action.payload;
    });
  },
});

export const homeActions = {
  ...homeSlice.actions,
  fetchRanking,
  fetchTrending,
  fetchTopTracks,
  fetchMadeForYou,
  fetchNewReleases,
  fetchRecentlyPlayed,
  fecthFeaturedPlaylists,
};

export default homeSlice.reducer;
