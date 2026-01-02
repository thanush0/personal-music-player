# Migration from Spotify to Local Music Player

## What Changed

This project has been converted from a Spotify Web Player to a Personal Music Player. Here's what changed:

## Architecture Changes

### Backend (NEW)
- **Added:** Python FastAPI backend (`/backend` folder)
- **Purpose:** Scans local music files and provides REST API
- **Database:** SQLite for storing music metadata
- **Features:** Music scanning, metadata extraction, album art extraction

### Frontend Changes

#### 1. **Authentication Removed**
- ❌ Removed: Spotify OAuth login flow
- ✅ Added: Mock user for local player
- **Files Changed:**
  - `src/services/auth.ts` - Returns mock user
  - `src/App.tsx` - Removed login redirect

#### 2. **API Integration**
- ❌ Removed: Spotify API calls (`https://api.spotify.com/v1`)
- ✅ Added: Local backend API (`http://localhost:8000`)
- **Files Changed:**
  - `src/axios.ts` - Points to local backend
  - All service files now use local endpoints

#### 3. **Audio Playback**
- ❌ Removed: Spotify Web Playback SDK
- ✅ Added: HTML5 Audio API
- **New Files:**
  - `src/utils/audioPlayer.ts` - HTML5 audio wrapper
  - `src/services/localPlayer.ts` - Player service
  - `src/utils/localPlayer/LocalPlayerProvider.tsx` - Player provider component
- **Removed Files:**
  - Spotify SDK script from `public/index.html`
  - `@types/spotify-web-playback-sdk` dependency

#### 4. **Player Service**
- **File:** `src/services/player.ts`
- **Changed:** All methods now use `localPlayerService` instead of Spotify API
- **Features Maintained:**
  - Play/Pause
  - Next/Previous
  - Seek
  - Volume Control
  - Shuffle/Repeat
  - Queue Management

#### 5. **Environment Variables**
- ❌ Removed:
  - `REACT_APP_SPOTIFY_CLIENT_ID`
  - `REACT_APP_SPOTIFY_REDIRECT_URL`
- ✅ Added:
  - `REACT_APP_API_URL` - Local backend URL

## Features Comparison

### ✅ Maintained Features
- Browse music library (tracks, albums, artists)
- Search functionality
- Playback controls (play, pause, next, previous)
- Volume control
- Shuffle and repeat modes
- Playlist creation and management
- Like/save tracks and albums
- Queue management
- Album artwork display
- Responsive UI

### ⚠️ Modified Features
- **User Profile:** Now uses mock local user
- **Device Switching:** Single local device only
- **Recently Played:** Currently returns empty (can be implemented with local storage)

### ❌ Removed Features
- Spotify Connect (device switching across Spotify ecosystem)
- Social features (following artists, seeing friends' activity)
- Spotify-specific features (podcasts, lyrics, etc.)
- Cross-device sync (unless you implement your own)

## Data Format Compatibility

The backend API responses are designed to match Spotify's API structure, so most frontend code works without changes:

### Track Object Example:
```json
{
  "id": "abc123",
  "name": "Song Title",
  "duration_ms": 240000,
  "artists": [{"id": "xyz", "name": "Artist Name"}],
  "album": {
    "id": "def456",
    "name": "Album Name",
    "images": [{"url": "http://localhost:8000/covers/abc.jpg"}]
  }
}
```

## File Structure

### New Backend Files:
```
backend/
├── main.py              # FastAPI application
├── database.py          # SQLite database operations
├── music_scanner.py     # Music file scanner
├── models.py            # Pydantic models
├── requirements.txt     # Python dependencies
├── .env                 # Configuration
└── README.md           # Backend documentation
```

### Modified Frontend Files:
```
src/
├── axios.ts                                    # Changed to local backend
├── App.tsx                                     # Removed Spotify login
├── services/
│   ├── auth.ts                                # Mock authentication
│   ├── player.ts                              # Local player integration
│   └── localPlayer.ts                         # NEW: Local player service
└── utils/
    ├── audioPlayer.ts                         # NEW: HTML5 audio wrapper
    └── localPlayer/
        └── LocalPlayerProvider.tsx            # NEW: Player provider
```

### Removed Frontend Code:
- `src/utils/spotify/webPlayback.tsx` - Spotify SDK wrapper
- `src/utils/spotify/login.ts` - Spotify OAuth (still exists but not used)
- Spotify SDK script from `public/index.html`

## Configuration Files

### Backend `.env`:
```env
MUSIC_FOLDER=/path/to/your/music
API_HOST=0.0.0.0
API_PORT=8000
```

### Frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:8000
```

## Development Workflow

### Before (Spotify):
1. Create Spotify App in Developer Dashboard
2. Get Client ID and Redirect URI
3. Configure OAuth
4. Run `npm start`
5. Login with Spotify Premium account

### After (Local Player):
1. Install Python dependencies
2. Configure music folder path
3. Start backend: `python backend/main.py`
4. Start frontend: `npm start`
5. No login required!

## API Endpoints Mapping

| Spotify API | Local Backend API | Status |
|-------------|-------------------|--------|
| `GET /me` | Mock user returned in code | ✅ |
| `GET /me/player` | `localPlayerService.getState()` | ✅ |
| `GET /me/tracks` | `GET /library/tracks` | ✅ |
| `GET /albums/{id}` | `GET /albums/{id}` | ✅ |
| `GET /artists/{id}` | `GET /artists/{id}` | ✅ |
| `GET /playlists/{id}` | `GET /playlists/{id}` | ✅ |
| `GET /search` | `GET /search?q={query}` | ✅ |
| `PUT /me/player/play` | `localPlayerService.play()` | ✅ |
| `PUT /me/player/pause` | `localPlayerService.pause()` | ✅ |

## Dependencies Changes

### Removed:
```json
"@types/spotify-web-playback-sdk": "^0.1.19"
```

### Added (Backend):
```
fastapi==0.104.1
uvicorn==0.24.0
mutagen==1.47.0
pillow==10.1.0
```

## Testing Changes

When testing the app:

1. **Backend First:** Ensure backend is running and has scanned your music
2. **API Test:** Visit `http://localhost:8000/docs` to test API
3. **Frontend Test:** Check browser console for any API errors
4. **Audio Test:** Try playing different file formats

## Migration Checklist

- [x] Backend API created
- [x] Music scanner implemented
- [x] Database setup
- [x] Frontend API calls redirected
- [x] Authentication removed
- [x] HTML5 audio player implemented
- [x] Player service updated
- [x] Spotify SDK removed
- [x] Environment variables updated
- [x] Package.json updated
- [ ] Testing with real music files
- [ ] Documentation completed

## Next Steps

1. Add your music files to the configured folder
2. Test playback with different formats
3. Create playlists
4. Customize the UI if desired
5. (Optional) Add authentication for multi-user support
6. (Optional) Add music upload functionality
7. (Optional) Implement recently played tracking
