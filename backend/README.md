# Personal Music Player - Backend

FastAPI backend for the personal music player. Scans local music files and provides a REST API compatible with the Spotify Web API structure.

## Features

- 🎵 Automatic music library scanning (MP3, FLAC, M4A, OGG, WAV)
- 🎨 Album artwork extraction and serving
- 📊 Metadata extraction using Mutagen
- 🔍 Full-text search across tracks, albums, and artists
- 📝 Playlist management
- ❤️ Liked songs/albums library
- 🎯 Spotify API-compatible responses

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Music Folder

Create a `.env` file:

```bash
MUSIC_FOLDER=/path/to/your/music
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. Run the Server

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 4. API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Supported Audio Formats

- MP3 (.mp3)
- FLAC (.flac)
- M4A/AAC (.m4a)
- OGG Vorbis (.ogg)
- WAV (.wav)

## API Endpoints

### Tracks
- `GET /tracks` - List all tracks (with pagination & search)
- `GET /tracks/{track_id}` - Get track details
- `GET /tracks/{track_id}/stream` - Stream audio file

### Albums
- `GET /albums` - List all albums
- `GET /albums/{album_id}` - Get album details
- `GET /albums/{album_id}/tracks` - Get album tracks

### Artists
- `GET /artists` - List all artists
- `GET /artists/{artist_id}` - Get artist details
- `GET /artists/{artist_id}/albums` - Get artist albums
- `GET /artists/{artist_id}/tracks` - Get artist top tracks

### Playlists
- `GET /playlists` - List all playlists
- `GET /playlists/{playlist_id}` - Get playlist details
- `POST /playlists` - Create new playlist
- `PUT /playlists/{playlist_id}` - Update playlist
- `DELETE /playlists/{playlist_id}` - Delete playlist
- `POST /playlists/{playlist_id}/tracks` - Add track to playlist
- `DELETE /playlists/{playlist_id}/tracks/{track_id}` - Remove track

### Library
- `GET /library/tracks` - Get saved/liked tracks
- `PUT /library/tracks/{track_id}` - Save track
- `DELETE /library/tracks/{track_id}` - Remove track
- `GET /library/albums` - Get saved albums
- `PUT /library/albums/{album_id}` - Save album
- `DELETE /library/albums/{album_id}` - Remove album

### Search
- `GET /search?q={query}` - Search tracks, albums, and artists

### Admin
- `POST /admin/rescan` - Manually trigger library rescan
- `GET /admin/stats` - Get library statistics

## Database

Uses SQLite (`music_library.db`) to store:
- Track metadata
- Album information
- Artist details
- Playlists
- User preferences (saved tracks/albums)

## Directory Structure

```
backend/
├── main.py              # FastAPI application
├── database.py          # SQLite database operations
├── music_scanner.py     # Music file scanner & metadata extraction
├── models.py            # Pydantic models
├── requirements.txt     # Python dependencies
├── .env                 # Configuration (create from .env.example)
├── music_library.db     # SQLite database (auto-created)
└── covers/              # Extracted album artwork (auto-created)
```

## Notes

- The scanner runs automatically on startup
- Album artwork is extracted from audio file metadata
- All responses are formatted to match Spotify API structure for frontend compatibility
- Use `/admin/rescan` endpoint to refresh the library after adding new music files
