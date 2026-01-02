# Personal Music Player - Setup Guide

This guide will help you set up and run the Personal Music Player on your local machine.

## 🎵 Overview

This is a full-featured personal music player that plays music files from your local computer. It's been converted from a Spotify client to a standalone local music player with:

- **Python FastAPI Backend** - Scans and serves your music library
- **React Frontend** - Beautiful UI for browsing and playing music
- **HTML5 Audio Player** - No external dependencies for playback

---

## 📋 Prerequisites

### Backend Requirements:
- **Python 3.8+** installed on your system
- **pip** (Python package manager)

### Frontend Requirements:
- **Node.js 18+** and npm installed

---

## 🚀 Quick Start

### Step 1: Setup the Backend

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create environment configuration:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file and set your music folder path:**
   ```env
   MUSIC_FOLDER=/path/to/your/music/library
   API_HOST=0.0.0.0
   API_PORT=8000
   ```

   **Example paths:**
   - Windows: `MUSIC_FOLDER=C:/Users/YourName/Music`
   - Mac/Linux: `MUSIC_FOLDER=/home/username/Music`

5. **Start the backend server:**
   ```bash
   python main.py
   ```

   The backend will:
   - Start on `http://localhost:8000`
   - Automatically scan your music folder
   - Extract metadata and album artwork
   - Create a SQLite database

   You should see output like:
   ```
   Scanning music library at: /path/to/your/music
   Found 1234 music files
   Music library scan complete!
   ```

6. **Verify the backend is running:**
   - Open `http://localhost:8000/docs` in your browser
   - You should see the API documentation

---

### Step 2: Setup the Frontend

1. **Open a new terminal and navigate to the project root:**
   ```bash
   cd ..  # Go back to project root
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Create environment configuration:**
   ```bash
   cp .env.example .env
   ```

4. **The `.env` file should contain:**
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```

5. **Start the frontend:**
   ```bash
   npm start
   ```

   The app will open in your browser at `http://localhost:3000`

---

## 🎵 Adding Music Files

### Supported Formats:
- MP3 (.mp3)
- FLAC (.flac)
- M4A/AAC (.m4a)
- OGG Vorbis (.ogg)
- WAV (.wav)

### Adding Music:

1. **Copy your music files** to the folder specified in `MUSIC_FOLDER`
2. **Trigger a rescan** by:
   - Restarting the backend server, OR
   - Calling the rescan endpoint: `POST http://localhost:8000/admin/rescan`

### Recommended Folder Structure:
```
Music/
├── Artist Name/
│   ├── Album Name/
│   │   ├── 01 - Track Name.mp3
│   │   ├── 02 - Track Name.mp3
│   │   └── cover.jpg
│   └── Another Album/
│       └── ...
└── Another Artist/
    └── ...
```

---

## 🎨 Features

### ✅ Working Features:
- **Browse Library** - View all tracks, albums, and artists
- **Search** - Full-text search across your music
- **Playback Controls** - Play, pause, next, previous, seek
- **Queue Management** - View and manage playback queue
- **Volume Control** - Adjust volume with slider
- **Shuffle & Repeat** - Shuffle mode and repeat options
- **Playlists** - Create and manage custom playlists
- **Library Management** - Save/like tracks and albums
- **Album Artwork** - Automatically extracted from music files
- **Responsive Design** - Works on desktop and mobile

### 🔄 Auto Features:
- **Metadata Extraction** - Title, artist, album, year, genre
- **Album Art Extraction** - From embedded ID3 tags
- **Track Organization** - Automatic grouping by artist/album

---

## 🛠️ Troubleshooting

### Backend Issues:

**"No music files found"**
- Check that `MUSIC_FOLDER` path is correct in `.env`
- Ensure music files are in supported formats
- Check file permissions

**"Module not found" errors**
- Run `pip install -r requirements.txt` again
- Try using a virtual environment:
  ```bash
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```

**Port 8000 already in use**
- Change port in `.env`: `API_PORT=8001`
- Update frontend `.env`: `REACT_APP_API_URL=http://localhost:8001`

### Frontend Issues:

**"Network Error" or "Cannot connect to backend"**
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings if using different ports
- Verify `REACT_APP_API_URL` in `.env`

**"Module not found" during npm install**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Port 3000 already in use**
- The app will prompt to use a different port
- Or set `PORT=3001` before running `npm start`

---

## 📊 API Documentation

Once the backend is running, visit:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Key Endpoints:

- `GET /tracks` - List all tracks
- `GET /albums` - List all albums
- `GET /artists` - List all artists
- `GET /tracks/{id}/stream` - Stream audio file
- `GET /search?q=query` - Search music
- `POST /playlists` - Create playlist
- `GET /library/tracks` - Get saved tracks

---

## 🔧 Advanced Configuration

### Backend Performance:

Edit `backend/main.py` to adjust:
- Pagination limits
- Search behavior
- Cache settings

### Database Location:

By default, the database is created in `backend/music_library.db`

To change location, modify `database.py`:
```python
db = Database(db_path="/your/custom/path/music.db")
```

### Album Art Storage:

Album artwork is stored in `backend/covers/`

---

## 🐳 Docker Support (Optional)

To run with Docker:

1. **Update docker-compose.yml** (see project root)
2. **Build and run:**
   ```bash
   docker-compose up --build
   ```

---

## 📝 Notes

- **First scan may take time** depending on library size
- **Metadata quality** depends on your music files' ID3 tags
- **No authentication** by default (add if deploying publicly)
- **Local only** - not designed for remote access without additional security

---

## 🆘 Getting Help

If you encounter issues:

1. Check backend logs in the terminal
2. Check browser console for frontend errors
3. Verify API is responding: `http://localhost:8000/admin/stats`
4. Ensure music files have proper metadata

---

## 🎉 Enjoy Your Music!

Once everything is running:
1. Browse your music library
2. Create playlists
3. Search for tracks
4. Enjoy your local music collection!
