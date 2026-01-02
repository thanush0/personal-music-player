# 🎵 Welcome to Personal Music Player!

## What is this?

This is a **Personal Music Player** - a beautiful, full-featured web application for playing your own music files locally. No subscriptions, no accounts, no cloud services needed!

## ✨ What You Get

- 🎧 **Beautiful Spotify-like interface** for your local music
- 🎵 **Play MP3, FLAC, M4A, OGG, and WAV** files
- 📁 **Automatic organization** by artist and album
- 🎨 **Album artwork** extracted from your files
- 🔍 **Fast search** across your entire library
- 📝 **Create playlists** and manage your collection
- ❤️ **Like/save** your favorite tracks
- 🎚️ **Full playback controls** - shuffle, repeat, queue, etc.

## 🚀 Get Started in 3 Steps

### 1️⃣ Install & Configure Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```
Edit `.env` and set: `MUSIC_FOLDER=/path/to/your/music`

### 2️⃣ Start Backend
```bash
python main.py
```

### 3️⃣ Install & Start Frontend (new terminal)
```bash
cd ..  # back to project root
npm install
cp .env.example .env
npm start
```

**That's it!** Open http://localhost:3000 in your browser.

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide ⚡
- **[README_SETUP.md](README_SETUP.md)** - Detailed setup with troubleshooting 🔧
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - How to test everything works ✅
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Technical details on Spotify → Local conversion 🔄

## 🎯 Quick Tips

- **Supported formats:** MP3, FLAC, M4A, OGG, WAV
- **Organize your music:** Use `Artist/Album/` folder structure
- **Album art:** Embedded in files or `cover.jpg` in album folder
- **Rescan library:** Restart backend or call `/admin/rescan` endpoint
- **API docs:** http://localhost:8000/docs

## ⚡ Minimum Requirements

- **Backend:** Python 3.8+, pip
- **Frontend:** Node.js 18+, npm
- **Music:** A few songs to get started!

## 🆘 Need Help?

1. Check [README_SETUP.md](README_SETUP.md) for detailed instructions
2. See [TESTING_GUIDE.md](TESTING_GUIDE.md) for troubleshooting
3. Check backend logs for scanning issues
4. Check browser console for frontend errors

## 🎉 Features at a Glance

| Feature | Status |
|---------|--------|
| Play local music files | ✅ |
| Browse by tracks/albums/artists | ✅ |
| Search entire library | ✅ |
| Create & manage playlists | ✅ |
| Like/save tracks & albums | ✅ |
| Queue management | ✅ |
| Shuffle & repeat modes | ✅ |
| Album artwork display | ✅ |
| Responsive mobile UI | ✅ |
| No authentication needed | ✅ |

## 🔒 Privacy

- **100% local** - your music never leaves your computer
- **No tracking** - no analytics, no telemetry
- **No accounts** - no login required
- **Your data** - all metadata stored in local SQLite database

---

## Ready to Start? 

👉 Follow the **3 steps above** or read [QUICKSTART.md](QUICKSTART.md)

Enjoy your music! 🎵
