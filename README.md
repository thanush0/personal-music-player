<div align="center">
<a align="center" href="https://spotify-react-web-client.onrender.com/" target="_blank" >
  <p align="center">
    <img src="https://github.com/user-attachments/assets/726763a6-094a-42cf-878c-1e7d47a2e597" style="height: 250px"/>
  </p>
</a>
</div>

<p align="center">

<img src="https://img.shields.io/badge/Spotify-1ED760?style=for-the-badge&logo=spotify&logoColor=white" alt="Spotify Badge">
<img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React Badge">
<img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="Typescript Badge">
<img src="https://img.shields.io/badge/redux-%23593d88.svg?style=for-the-badge&logo=redux&logoColor=white" alt="Redux Badge">

</p>

# 🎧 Personal Music Player

> [!IMPORTANT]
> A local music player converted from Spotify Web Client. Plays your own music files without requiring any external service or subscription.

![gif](https://github.com/user-attachments/assets/2077cdef-f3fa-49c9-a905-9cc9ab6629fb)

## 🚀 Features

⚡ **Local Music Playback**: Play your own music files (MP3, FLAC, M4A, OGG, WAV) using HTML5 Audio.

⚡ **Playback Controls**: Play, pause, next, previous, shuffle, and repeat functionalities.

⚡ **Music Library**: Browse and search your personal music collection by songs, artists, and albums.

⚡ **Playlists Management**: Create, edit, and delete personalized playlists from your library.

⚡ **Library Organization**: Automatically organized by artist and album with metadata extraction.

⚡ **Liked Songs**: Mark tracks as "liked" and access them in a dedicated view.

⚡ **Album Artwork**: Automatic extraction and display of embedded album art from your music files.

⚡ **Full-Text Search**: Search across track titles, artists, and albums instantly.

⚡ **Queue Management**: View and manage your playback queue in real-time.

## 🛠 Technologies Used

### Backend:
🎵 **Python FastAPI**: High-performance REST API for serving music library

🎵 **Mutagen**: Audio metadata extraction (ID3 tags, album art, etc.)

🎵 **SQLite**: Lightweight database for music metadata and playlists

🎵 **Pillow**: Image processing for album artwork

### Frontend:
🎵 **React 19**: Modern UI with reusable components

🎵 **Redux Toolkit**: Global state management

🎵 **TypeScript**: Type-safe development

🎵 **HTML5 Audio API**: Native browser audio playback

🎵 **Ant Design**: UI component library

## 📸 Screenshots

More in images [folder](https://github.com/francoborrelli/spotify-react-web-client/tree/main/images).

<div align="center">
    <table >
     <tr>
       <td>
         <img src="images/Home.png?raw=true 'Playlist'"/>
         <img src="images/CurrentDevices.png?raw=true 'Playlist'"/>
       </td>
        <td>
         <img src="images/NewPlaylist.png?raw=true 'Playlist'"/>
          <img src="images/browse.png?raw=true 'Playlist'"/>
       </td>
                 <td>
         <img src="images/Profile.png?raw=true 'Playlist'"/>
          <img src="images/playlist.png?raw=true 'Playlist'"/>
       </td>
     </tr>
    </table>
    </div>

## ⚙️ Installation & Setup

### Prerequisites:
- **Python 3.8+** and pip
- **Node.js 18+** and npm
- Your music files in MP3, FLAC, M4A, OGG, or WAV format

### Quick Start:

1. **Navigate to the project directory:**

   ```bash
   cd personal-music-player
   ```

2. **Setup Backend:**

   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   ```

   Edit `.env` and set your music folder:
   ```env
   MUSIC_FOLDER=/path/to/your/music
   ```

   Start the backend:
   ```bash
   python main.py
   ```

3. **Setup Frontend (in a new terminal):**

   ```bash
   cd ..  # Back to project root
   npm install
   cp .env.example .env
   ```

   The `.env` should contain:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   ```

   Start the frontend:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

5. **Add your music** to the folder specified in `MUSIC_FOLDER` and restart the backend or trigger a rescan via API.

📖 **Detailed Setup:** See [README_SETUP.md](README_SETUP.md) for comprehensive setup instructions and troubleshooting.

## 📚 Documentation

- **[README_SETUP.md](README_SETUP.md)** - Detailed setup guide with troubleshooting
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Details on conversion from Spotify to local player
- **[backend/README.md](backend/README.md)** - Backend API documentation

## 🎵 Supported Audio Formats

- **MP3** (.mp3) - Most common format
- **FLAC** (.flac) - Lossless audio
- **M4A/AAC** (.m4a) - Apple format
- **OGG Vorbis** (.ogg) - Open format
- **WAV** (.wav) - Uncompressed audio

## 🔧 Project Structure

```
├── backend/                 # Python FastAPI backend
│   ├── main.py             # API server
│   ├── database.py         # SQLite operations
│   ├── music_scanner.py    # File scanner
│   └── models.py           # Data models
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── store/             # Redux store
│   └── utils/             # Utilities
└── public/                # Static assets
```

## 🤝 Contributions

Contributions are welcome! If you have any suggestions or improvements, feel free to fork the repository, create a new branch, and submit a pull request.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
