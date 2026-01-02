# 🚀 Quick Start Guide

Get your Personal Music Player running in 5 minutes!

## Step 1: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 2: Configure Music Folder

Create `.env` file in `backend/` folder:

```bash
cp .env.example .env
```

Edit the `.env` file:
```env
MUSIC_FOLDER=/path/to/your/music
```

**Examples:**
- Windows: `C:/Users/YourName/Music`
- Mac: `/Users/YourName/Music`
- Linux: `/home/username/Music`

## Step 3: Start Backend

```bash
python main.py
```

Wait for: "Music library scan complete!"

## Step 4: Setup Frontend

Open a **new terminal** in the project root:

```bash
npm install
cp .env.example .env
npm start
```

## Step 5: Open Browser

Navigate to: **http://localhost:3000**

## ✅ You're Done!

Your personal music player is now running!

## 🎵 What's Next?

- Browse your music library
- Create playlists
- Search for songs
- Enjoy your music!

## ❓ Need Help?

- **Detailed Setup:** [README_SETUP.md](README_SETUP.md)
- **Testing:** [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **API Docs:** http://localhost:8000/docs
