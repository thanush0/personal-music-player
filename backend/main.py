from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from typing import List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import uvicorn

from music_scanner import MusicScanner
from database import Database
from models import Track, Album, Artist, Playlist, TrackResponse, AlbumResponse, ArtistResponse, PlaylistResponse
from youtube_downloader import YouTubeDownloader
from audio_enhancer import audio_enhancer

load_dotenv()

# MUSIC_FOLDER and initialization
MUSIC_FOLDER = os.getenv("MUSIC_FOLDER", "./music_library")
db = Database()
scanner = MusicScanner(db)
youtube_downloader = YouTubeDownloader(MUSIC_FOLDER)

# Lifespan event handler (replaces on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.init_db()
    print(f"Scanning music library at: {MUSIC_FOLDER}")
    await scanner.scan_folder(MUSIC_FOLDER)
    print("Music library scan complete!")
    yield
    # Shutdown (if needed)
    pass

app = FastAPI(
    title="Personal Music Player API", 
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize cover folder
COVER_FOLDER = Path("./covers")
COVER_FOLDER.mkdir(exist_ok=True)

# Mount static files for album covers with CORS headers
from fastapi.middleware.cors import CORSMiddleware as _CORS

@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/covers/") or request.url.path.startswith("/images/"):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

app.mount("/covers", StaticFiles(directory=str(COVER_FOLDER)), name="covers")

# Mount public images folder for placeholder images
PUBLIC_IMAGES = Path("../public/images")
if PUBLIC_IMAGES.exists():
    app.mount("/images", StaticFiles(directory=str(PUBLIC_IMAGES)), name="images")


# Startup is now handled by lifespan context manager below


@app.get("/")
async def root():
    return {"message": "Personal Music Player API", "version": "1.0.0"}


# ==================== TRACKS ====================
@app.get("/tracks", response_model=List[TrackResponse])
async def get_tracks(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None
):
    """Get all tracks with pagination and optional search"""
    tracks = db.get_tracks(limit=limit, offset=offset, search=search)
    return tracks


@app.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(track_id: str):
    """Get specific track by ID with all media asset paths"""
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Add paths to cover, lyrics, and animated cover based on file location
    file_path = Path(track.get("file_path", ""))
    if file_path.exists():
        folder = file_path.parent
        
        # Check for cover.jpg
        cover_file = folder / "cover.jpg"
        if cover_file.exists():
            track["cover_url"] = f"http://localhost:8000/tracks/{track_id}/cover"
        
        # Check for animated_cover.mp4
        animated_cover = folder / "animated_cover.mp4"
        if animated_cover.exists():
            track["animated_cover_url"] = f"http://localhost:8000/tracks/{track_id}/animated-cover"
        
        # Lyrics are already in the track data from database
    
    return track


@app.get("/tracks/{track_id}/stream")
async def stream_track(track_id: str, quality: str = Query("standard", pattern="^(standard|enhanced)$")):
    """Stream audio file - supports quality switching between standard and enhanced"""
    track = db.get_track(track_id)
    if not track or not track.get("file_path"):
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Determine which audio file to stream
    file_path = Path(track["file_path"])
    
    if quality == "enhanced" and track.get("has_enhanced_version"):
        enhanced_path = track.get("enhanced_file_path")
        if enhanced_path and Path(enhanced_path).exists():
            file_path = Path(enhanced_path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    # Safely encode filename for Content-Disposition header
    safe_filename = file_path.name.encode('ascii', 'ignore').decode('ascii')
    if not safe_filename:
        safe_filename = "audio" + file_path.suffix
    
    return FileResponse(
        file_path,
        media_type="audio/mpeg",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{safe_filename}"'
        }
    )


@app.get("/tracks/{track_id}/cover")
async def get_track_cover(track_id: str):
    """Get cover image for a track"""
    track = db.get_track(track_id)
    if not track or not track.get("file_path"):
        raise HTTPException(status_code=404, detail="Track not found")
    
    file_path = Path(track["file_path"])
    cover_file = file_path.parent / "cover.jpg"
    
    if not cover_file.exists():
        # Fallback to album art from database
        if track.get("image_path"):
            return FileResponse(f".{track['image_path']}")
        raise HTTPException(status_code=404, detail="Cover image not found")
    
    return FileResponse(cover_file, media_type="image/jpeg")


@app.get("/tracks/{track_id}/animated-cover")
async def get_track_animated_cover(track_id: str):
    """Get animated cover (video thumbnail) for a track"""
    track = db.get_track(track_id)
    if not track or not track.get("file_path"):
        raise HTTPException(status_code=404, detail="Track not found")
    
    file_path = Path(track["file_path"])
    animated_cover = file_path.parent / "animated_cover.mp4"
    
    if not animated_cover.exists():
        raise HTTPException(status_code=404, detail="Animated cover not found")
    
    return FileResponse(animated_cover, media_type="video/mp4")


@app.put("/tracks/{track_id}/lyrics")
async def update_track_lyrics(track_id: str, request: dict):
    """Update lyrics for a track"""
    lyrics = request.get("lyrics", "")
    cursor = db.conn.cursor()
    cursor.execute("UPDATE tracks SET lyrics = ? WHERE id = ?", (lyrics, track_id))
    db.conn.commit()
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Track not found")
    
    return {"message": "Lyrics updated successfully"}


# ==================== AUDIO ENHANCEMENT ====================
@app.post("/tracks/{track_id}/enhance")
async def enhance_track(
    track_id: str,
    preset: str = Query("atmos", pattern="^(atmos|bass_boost|clarity|balanced|custom)$")
):
    """
    Generate enhanced version of a track using offline FFmpeg processing
    
    Presets:
    - atmos: Dolby Atmos-style (wide soundstage, bass, clarity)
    - bass_boost: Heavy bass for EDM/Hip-Hop
    - clarity: Enhanced vocals and instrument separation
    - balanced: Subtle enhancement for all genres
    - custom: User-definable preset
    """
    from pathlib import Path
    from datetime import datetime
    
    # Get track info
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    file_path = Path(track["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    # Check if already enhanced with this preset
    cursor = db.conn.cursor()
    cursor.execute(
        "SELECT enhanced_file_path, enhancement_preset FROM tracks WHERE id = ?",
        (track_id,)
    )
    row = cursor.fetchone()
    
    if row and row[0] and row[1] == preset:
        enhanced_path = Path(row[0])
        if enhanced_path.exists():
            return {
                "message": "Track already enhanced with this preset",
                "preset": preset,
                "enhanced_file_path": str(enhanced_path),
                "already_exists": True
            }
    
    # Generate enhanced filename
    enhanced_filename = f"{file_path.stem}_enhanced_{preset}{file_path.suffix}"
    enhanced_filepath = file_path.parent / enhanced_filename
    
    # Run FFmpeg enhancement
    success = audio_enhancer.enhance_audio(
        input_file=str(file_path),
        output_file=str(enhanced_filepath),
        preset=preset,
        bitrate="320k",
        sample_rate=48000
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Audio enhancement failed")
    
    # Update database
    cursor.execute("""
        UPDATE tracks 
        SET has_enhanced_version = 1,
            enhanced_file_path = ?,
            enhanced_at = ?,
            enhancement_preset = ?
        WHERE id = ?
    """, (str(enhanced_filepath), datetime.now(), preset, track_id))
    db.conn.commit()
    
    return {
        "message": "Track enhanced successfully",
        "preset": preset,
        "enhanced_file_path": str(enhanced_filepath),
        "original_file_path": str(file_path),
        "already_exists": False
    }


@app.delete("/tracks/{track_id}/enhanced")
async def delete_enhanced_version(track_id: str):
    """Remove enhanced version of a track"""
    from pathlib import Path
    
    cursor = db.conn.cursor()
    cursor.execute("SELECT enhanced_file_path FROM tracks WHERE id = ?", (track_id,))
    row = cursor.fetchone()
    
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="No enhanced version found")
    
    enhanced_path = Path(row[0])
    
    # Delete enhanced file
    try:
        if enhanced_path.exists():
            enhanced_path.unlink()
    except Exception as e:
        print(f"Error deleting enhanced file: {e}")
    
    # Update database
    cursor.execute("""
        UPDATE tracks 
        SET has_enhanced_version = 0,
            enhanced_file_path = NULL,
            enhanced_at = NULL,
            enhancement_preset = NULL
        WHERE id = ?
    """, (track_id,))
    db.conn.commit()
    
    return {"message": "Enhanced version deleted"}


@app.get("/tracks/{track_id}/versions")
async def get_track_versions(track_id: str):
    """Get available versions (original and enhanced) of a track"""
    from pathlib import Path
    
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    cursor = db.conn.cursor()
    cursor.execute("""
        SELECT has_enhanced_version, enhanced_file_path, enhanced_at, enhancement_preset
        FROM tracks WHERE id = ?
    """, (track_id,))
    row = cursor.fetchone()
    
    versions = {
        "original": {
            "file_path": track["file_path"],
            "exists": Path(track["file_path"]).exists()
        }
    }
    
    if row and row[0] and row[1]:
        enhanced_path = Path(row[1])
        versions["enhanced"] = {
            "file_path": str(enhanced_path),
            "exists": enhanced_path.exists(),
            "preset": row[3],
            "created_at": row[2]
        }
    
    return versions


@app.get("/tracks/{track_id}/stream/enhanced")
async def stream_enhanced_track(track_id: str):
    """Stream enhanced version of a track"""
    from pathlib import Path
    
    cursor = db.conn.cursor()
    cursor.execute("SELECT enhanced_file_path FROM tracks WHERE id = ?", (track_id,))
    row = cursor.fetchone()
    
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="No enhanced version found")
    
    enhanced_path = Path(row[0])
    if not enhanced_path.exists():
        raise HTTPException(status_code=404, detail="Enhanced audio file not found")
    
    safe_filename = enhanced_path.name.encode('ascii', 'ignore').decode('ascii')
    if not safe_filename:
        safe_filename = "audio_enhanced" + enhanced_path.suffix
    
    return FileResponse(
        enhanced_path,
        media_type="audio/mpeg",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{safe_filename}"'
        }
    )


@app.post("/enhance-batch")
async def enhance_tracks_batch(
    track_ids: List[str],
    preset: str = Query("atmos", pattern="^(atmos|bass_boost|clarity|balanced|custom)$")
):
    """Enhance multiple tracks in batch"""
    results = []
    
    for track_id in track_ids:
        try:
            result = await enhance_track(track_id, preset)
            results.append({
                "track_id": track_id,
                "success": True,
                "result": result
            })
        except Exception as e:
            results.append({
                "track_id": track_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "total": len(track_ids),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results
    }


# ==================== ALBUMS ====================
@app.get("/albums", response_model=List[AlbumResponse])
async def get_albums(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None
):
    """Get all albums with pagination"""
    albums = db.get_albums(limit=limit, offset=offset, search=search)
    return albums


@app.get("/albums/{album_id}", response_model=AlbumResponse)
async def get_album(album_id: str):
    """Get specific album with tracks"""
    album = db.get_album(album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album


@app.get("/albums/{album_id}/tracks", response_model=List[TrackResponse])
async def get_album_tracks(album_id: str):
    """Get all tracks from an album"""
    tracks = db.get_album_tracks(album_id)
    return tracks


# ==================== ARTISTS ====================
@app.get("/artists", response_model=List[ArtistResponse])
async def get_artists(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None
):
    """Get all artists with pagination"""
    artists = db.get_artists(limit=limit, offset=offset, search=search)
    return artists


@app.get("/artists/{artist_id}", response_model=ArtistResponse)
async def get_artist(artist_id: str):
    """Get specific artist details"""
    artist = db.get_artist(artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return artist


@app.get("/artists/{artist_id}/albums", response_model=List[AlbumResponse])
async def get_artist_albums(artist_id: str):
    """Get all albums by an artist"""
    albums = db.get_artist_albums(artist_id)
    return albums


@app.get("/artists/{artist_id}/tracks", response_model=List[TrackResponse])
async def get_artist_tracks(artist_id: str, limit: int = 10):
    """Get top tracks by an artist"""
    tracks = db.get_artist_tracks(artist_id, limit=limit)
    return tracks


# ==================== PLAYLISTS ====================
@app.get("/playlists", response_model=List[PlaylistResponse])
async def get_playlists():
    """Get all playlists"""
    playlists = db.get_playlists()
    return playlists


@app.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(playlist_id: str):
    """Get specific playlist with tracks"""
    playlist = db.get_playlist(playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


@app.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(name: str, description: Optional[str] = None):
    """Create a new playlist"""
    playlist = db.create_playlist(name, description)
    return playlist


@app.put("/playlists/{playlist_id}")
async def update_playlist(
    playlist_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None
):
    """Update playlist details"""
    success = db.update_playlist(playlist_id, name, description)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Playlist updated successfully"}


@app.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist"""
    success = db.delete_playlist(playlist_id)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Playlist deleted successfully"}


@app.post("/playlists/{playlist_id}/tracks")
async def add_track_to_playlist(playlist_id: str, track_id: str):
    """Add a track to playlist"""
    success = db.add_track_to_playlist(playlist_id, track_id)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist or track not found")
    return {"message": "Track added to playlist"}


@app.delete("/playlists/{playlist_id}/tracks/{track_id}")
async def remove_track_from_playlist(playlist_id: str, track_id: str):
    """Remove a track from playlist"""
    success = db.remove_track_from_playlist(playlist_id, track_id)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist or track not found")
    return {"message": "Track removed from playlist"}


# ==================== SEARCH ====================
@app.get("/search")
async def search_all(q: str, limit: int = 20):
    """Search across tracks, albums, and artists"""
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query too short")
    
    results = {
        "tracks": db.get_tracks(limit=limit, search=q),
        "albums": db.get_albums(limit=limit, search=q),
        "artists": db.get_artists(limit=limit, search=q),
    }
    return results


# ==================== LIBRARY ====================
@app.get("/library/tracks", response_model=List[TrackResponse])
async def get_saved_tracks():
    """Get user's saved/liked tracks"""
    tracks = db.get_saved_tracks()
    return tracks


@app.put("/library/tracks/{track_id}")
async def save_track(track_id: str):
    """Save/like a track"""
    success = db.save_track(track_id)
    if not success:
        raise HTTPException(status_code=404, detail="Track not found")
    return {"message": "Track saved"}


@app.put("/me/tracks")
async def save_tracks_bulk(request: dict):
    """Save multiple tracks (Spotify compatibility endpoint)"""
    try:
        ids = request.get("ids", [])
        for track_id in ids:
            db.save_track(track_id)
        return {"message": "Tracks saved"}
    except Exception as e:
        print(f"Error saving tracks: {e}")
        raise HTTPException(status_code=500, detail="Failed to save tracks")


@app.delete("/me/tracks")
async def delete_tracks_bulk(request: dict):
    """Remove multiple tracks (Spotify compatibility endpoint)"""
    try:
        ids = request.get("ids", [])
        for track_id in ids:
            db.unsave_track(track_id)
        return {"message": "Tracks removed"}
    except Exception as e:
        print(f"Error removing tracks: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove tracks")


@app.delete("/library/tracks/{track_id}")
async def unsave_track(track_id: str):
    """Remove track from saved"""
    success = db.unsave_track(track_id)
    if not success:
        raise HTTPException(status_code=404, detail="Track not found")
    return {"message": "Track removed from library"}


@app.get("/library/albums", response_model=List[AlbumResponse])
async def get_saved_albums():
    """Get user's saved albums"""
    albums = db.get_saved_albums()
    return albums


@app.put("/library/albums/{album_id}")
async def save_album(album_id: str):
    """Save an album to library"""
    success = db.save_album(album_id)
    if not success:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": "Album saved"}


@app.delete("/library/albums/{album_id}")
async def unsave_album(album_id: str):
    """Remove album from library"""
    success = db.unsave_album(album_id)
    if not success:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": "Album removed from library"}


@app.put("/me/albums")
async def save_albums_bulk(request: dict):
    """Save multiple albums (Spotify compatibility endpoint)"""
    try:
        ids = request.get("ids", [])
        for album_id in ids:
            db.save_album(album_id)
        return {"message": "Albums saved"}
    except Exception as e:
        print(f"Error saving albums: {e}")
        raise HTTPException(status_code=500, detail="Failed to save albums")


@app.delete("/me/albums")
async def delete_albums_bulk(request: dict):
    """Remove multiple albums (Spotify compatibility endpoint)"""
    try:
        ids = request.get("ids", [])
        for album_id in ids:
            db.unsave_album(album_id)
        return {"message": "Albums removed"}
    except Exception as e:
        print(f"Error removing albums: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove albums")


# ==================== RECOMMENDATIONS ====================
@app.get("/recommendations", response_model=List[TrackResponse])
async def get_recommendations(
    seed_track: Optional[str] = None,
    seed_artist: Optional[str] = None,
    limit: int = 20
):
    """Get song recommendations based on seed track or artist"""
    recommendations = db.get_recommendations(
        track_id=seed_track,
        artist_id=seed_artist,
        limit=limit
    )
    return recommendations


# ==================== ADMIN ====================
@app.post("/admin/rescan")
async def rescan_library():
    """Manually trigger library rescan"""
    await scanner.scan_folder(MUSIC_FOLDER)
    return {"message": "Library rescan complete"}


@app.get("/admin/stats")
async def get_library_stats():
    """Get library statistics"""
    stats = db.get_stats()
    return stats


# ==================== YOUTUBE DOWNLOADER ====================
@app.post("/download/youtube/info")
async def get_youtube_info(url: str):
    """Get YouTube video information"""
    info = await youtube_downloader.get_video_info(url)
    if not info:
        raise HTTPException(status_code=400, detail="Could not fetch video info")
    return info


@app.post("/download/youtube")
async def download_youtube_audio(
    url: str,
    format: str = Query("mp3", pattern="^(mp3|flac|m4a|ogg|wav)$"),
    quality: str = Query("best", pattern="^(best|320|256|192|128)$")
):
    """Download audio from YouTube video"""
    
    # Get video info first (includes lyrics and metadata)
    info = await youtube_downloader.get_video_info(url)
    if not info:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    # Check for duplicates in database
    duration_ms = info.get('duration', 0) * 1000 if info.get('duration') else None
    existing_track = db.check_duplicate_track(
        title=info.get('title', ''),
        artist=info.get('artist', ''),
        duration_ms=duration_ms
    )
    
    if existing_track:
        return {
            "message": "Song already exists in library",
            "title": info['title'],
            "artist": info['artist'],
            "duplicate": True,
            "track_id": existing_track['id']
        }
    
    # Download audio
    filepath = await youtube_downloader.download_audio(url, format, quality)
    
    if not filepath:
        raise HTTPException(status_code=500, detail="Download failed")
    
    # Scan the new file into database with metadata
    from pathlib import Path
    import hashlib
    
    file_path_obj = Path(filepath)
    track_id = hashlib.md5(str(file_path_obj).encode()).hexdigest()[:16]
    artist_id = hashlib.md5(info['artist'].encode()).hexdigest()[:16]
    album_id = hashlib.md5(f"{info['artist']}-YouTube Downloads".encode()).hexdigest()[:16]
    
    # Add track with enhanced metadata
    db.add_track(
        track_id=track_id,
        title=info['title'],
        artist=info['artist'],
        artist_id=artist_id,
        album="YouTube Downloads",
        album_id=album_id,
        duration_ms=duration_ms or 0,
        track_number=None,
        year=None,
        genre="YouTube",
        file_path=str(file_path_obj),
        image_path=None,
        lyrics=info.get('lyrics')
    )
    
    return {
        "message": "Download complete",
        "title": info['title'],
        "artist": info['artist'],
        "filepath": filepath,
        "format": format,
        "lyrics_found": bool(info.get('lyrics')),
        "duplicate": False
    }


@app.post("/download/youtube/playlist")
async def download_youtube_playlist(
    url: str,
    format: str = Query("mp3", pattern="^(mp3|flac|m4a|ogg|wav)$"),
    quality: str = Query("best", pattern="^(best|320|256|192|128)$")
):
    """Download entire YouTube playlist"""
    
    filepaths = await youtube_downloader.download_playlist(url, format, quality)
    
    if not filepaths:
        raise HTTPException(status_code=500, detail="Playlist download failed")
    
    # Scan all new files
    from pathlib import Path
    for filepath in filepaths:
        await scanner.process_file(Path(filepath))
    
    return {
        "message": "Playlist download complete",
        "downloaded": len(filepaths),
        "files": filepaths
    }


# ==================== MOCK ENDPOINTS FOR SPOTIFY COMPATIBILITY ====================
@app.get("/browse/featured-playlists")
async def get_featured_playlists(limit: int = 10, locale: str = None):
    """Mock endpoint - returns user playlists"""
    try:
        playlists = db.get_playlists()
        return {"playlists": {"items": playlists[:limit]}}
    except Exception as e:
        print(f"Error in featured-playlists: {e}")
        return {"playlists": {"items": []}}


@app.get("/me/top/tracks")
async def get_top_tracks(limit: int = 8, timeRange: str = "short_term"):
    """Mock endpoint - returns tracks from library"""
    try:
        tracks = db.get_tracks(limit=limit)
        return {"items": tracks}
    except Exception as e:
        print(f"Error in top tracks: {e}")
        return {"items": []}


@app.get("/me/top/artists")
async def get_top_artists(limit: int = 8, timeRange: str = "short_term"):
    """Mock endpoint - returns artists from library"""
    try:
        artists = db.get_artists(limit=limit)
        return {"items": artists}
    except Exception as e:
        print(f"Error in top artists: {e}")
        return {"items": []}


@app.get("/browse/categories/{category_id}/playlists")
async def get_category_playlists(category_id: str, limit: int = 10):
    """Mock endpoint - returns playlists"""
    try:
        playlists = db.get_playlists()
        return {"playlists": {"items": playlists[:limit]}}
    except Exception as e:
        print(f"Error in category playlists: {e}")
        return {"playlists": {"items": []}}


@app.get("/browse/new-releases")
async def get_new_releases(limit: int = 10):
    """Mock endpoint - returns recent albums"""
    try:
        albums = db.get_albums(limit=limit)
        return {"albums": {"items": albums}}
    except Exception as e:
        print(f"Error in new releases: {e}")
        return {"albums": {"items": []}}


@app.get("/browse/categories")
async def get_categories(limit: int = 50):
    """Mock endpoint - returns empty categories"""
    return {"categories": {"items": []}}


@app.get("/browse/categories/{category_id}")
async def get_category(category_id: str):
    """Mock endpoint - returns mock category"""
    return {
        "id": category_id,
        "name": "Category",
        "icons": [],
        "href": ""
    }


@app.get("/me/following")
async def get_following(type: str = "artist", limit: int = 20):
    """Mock endpoint - returns followed artists"""
    try:
        if type == "artist":
            artists = db.get_artists(limit=limit)
            return {"artists": {"items": artists, "total": len(artists)}}
        return {"artists": {"items": [], "total": 0}}
    except Exception as e:
        print(f"Error in following: {e}")
        return {"artists": {"items": [], "total": 0}}


@app.get("/me/player/queue")
async def get_queue():
    """Mock endpoint - returns empty queue"""
    return {
        "currently_playing": None,
        "queue": []
    }


@app.get("/me/albums")
async def get_my_albums(limit: int = 50):
    """Get user's saved albums"""
    try:
        albums = db.get_saved_albums()
        return {"items": [{"album": album} for album in albums[:limit]]}
    except Exception as e:
        print(f"Error in my albums: {e}")
        return {"items": []}


@app.get("/me/playlists")
async def get_my_playlists(limit: int = 50):
    """Get user's playlists"""
    try:
        playlists = db.get_playlists()
        return {"items": playlists[:limit]}
    except Exception as e:
        print(f"Error in my playlists: {e}")
        return {"items": []}


@app.get("/me/tracks")
async def get_my_tracks(limit: int = 50):
    """Get user's saved tracks"""
    try:
        tracks = db.get_saved_tracks()
        return {"items": [{"track": track} for track in tracks[:limit]]}
    except Exception as e:
        print(f"Error in my tracks: {e}")
        return {"items": []}


@app.get("/me/tracks/contains")
async def check_saved_tracks(ids: str):
    """Check if tracks are saved"""
    try:
        track_ids = ids.split(',')
        # Check each track in database
        results = []
        for track_id in track_ids:
            track = db.get_track(track_id)
            results.append(track.get('is_saved', False) if track else False)
        return results
    except Exception as e:
        print(f"Error checking saved tracks: {e}")
        return [False] * len(ids.split(','))


@app.get("/playlists/{playlist_id}/tracks")
async def get_playlist_tracks_alt(playlist_id: str, limit: int = 50):
    """Alternative endpoint for playlist tracks"""
    try:
        playlist = db.get_playlist(playlist_id)
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        return playlist.get("tracks", {"items": []})
    except Exception as e:
        print(f"Error getting playlist tracks: {e}")
        return {"items": []}


@app.get("/playlists/{playlist_id}/followers/contains")
async def check_following_playlist(playlist_id: str):
    """Check if user follows playlist (always true for local playlists)"""
    return [True]


@app.put("/playlists/{playlist_id}/followers")
async def follow_playlist(playlist_id: str):
    """Follow a playlist (no-op for local playlists)"""
    return {"message": "Playlist followed"}


@app.delete("/playlists/{playlist_id}/followers")
async def unfollow_playlist(playlist_id: str):
    """Unfollow a playlist (no-op for local playlists)"""
    return {"message": "Playlist unfollowed"}


@app.get("/me/following/contains")
async def check_following(type: str = "artist", ids: str = ""):
    """Check if user follows artists/users"""
    try:
        if not ids:
            return []
        id_list = ids.split(',')
        # For local player, return false for all
        return [False] * len(id_list)
    except Exception as e:
        print(f"Error checking following: {e}")
        return []


@app.put("/me/following")
async def follow_artists_or_users(request: dict):
    """Follow artists or users (no-op for local player)"""
    artist_type = request.get("type", "artist")
    ids = request.get("ids", [])
    return {"message": f"Following {len(ids)} {artist_type}(s)"}


@app.delete("/me/following")
async def unfollow_artists_or_users(type: str = "artist", ids: str = ""):
    """Unfollow artists or users (no-op for local player)"""
    id_list = ids.split(',') if ids else []
    return {"message": f"Unfollowed {len(id_list)} {type}(s)"}


@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile"""
    if user_id == "local-user":
        return {
            "id": "local-user",
            "display_name": "Local User",
            "images": [],
            "followers": {"total": 0, "href": None},
            "external_urls": {"spotify": ""},
            "href": "",
            "type": "user",
            "uri": "local:user:local-user"
        }
    raise HTTPException(status_code=404, detail="User not found")


@app.get("/users/{user_id}/playlists")
async def get_user_playlists(user_id: str, limit: int = 10):
    """Get user's playlists"""
    try:
        playlists = db.get_playlists()
        return {"items": playlists[:limit]}
    except Exception as e:
        print(f"Error getting user playlists: {e}")
        return {"items": []}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
