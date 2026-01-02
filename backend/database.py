import sqlite3
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path


class Database:
    """SQLite database for music library"""
    
    def __init__(self, db_path: str = "./music_library.db"):
        self.db_path = db_path
        self.conn = None
    
    def init_db(self):
        """Initialize database with tables"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        
        cursor = self.conn.cursor()
        
        # Tracks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tracks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                artist_id TEXT,
                album TEXT NOT NULL,
                album_id TEXT,
                duration_ms INTEGER,
                track_number INTEGER,
                year INTEGER,
                genre TEXT,
                file_path TEXT UNIQUE NOT NULL,
                image_path TEXT,
                lyrics TEXT,
                is_saved INTEGER DEFAULT 0,
                play_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                has_enhanced_version INTEGER DEFAULT 0,
                enhanced_file_path TEXT,
                enhancement_preset TEXT,
                enhanced_at TIMESTAMP
            )
        """)
        
        # Albums table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS albums (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                artist TEXT NOT NULL,
                artist_id TEXT,
                year INTEGER,
                total_tracks INTEGER DEFAULT 0,
                image_path TEXT,
                is_saved INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Artists table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS artists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                total_albums INTEGER DEFAULT 0,
                total_tracks INTEGER DEFAULT 0,
                image_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Playlists table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS playlists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Playlist tracks junction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS playlist_tracks (
                playlist_id TEXT,
                track_id TEXT,
                position INTEGER,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (playlist_id, track_id),
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title)")
        
        self.conn.commit()
    
    def check_duplicate_track(self, title: str, artist: str, duration_ms: int = None) -> Optional[Dict]:
        """Check if track already exists in database"""
        cursor = self.conn.cursor()
        
        try:
            # Check by exact title and artist
            cursor.execute("""
                SELECT * FROM tracks 
                WHERE LOWER(title) = LOWER(?) AND LOWER(artist) = LOWER(?)
            """, (title.strip(), artist.strip()))
            
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
            
            # If duration provided, check with similar duration (within 5 seconds)
            if duration_ms:
                cursor.execute("""
                    SELECT * FROM tracks 
                    WHERE LOWER(title) = LOWER(?) 
                    AND LOWER(artist) = LOWER(?)
                    AND ABS(duration_ms - ?) < 5000
                """, (title.strip(), artist.strip(), duration_ms))
                
                row = cursor.fetchone()
                if row:
                    return self._row_to_dict(row)
            
            return None
            
        except Exception as e:
            print(f"Error checking duplicate: {e}")
            return None
    
    def add_track(self, track_id: str, title: str, artist: str, artist_id: str,
                  album: str, album_id: str, duration_ms: int, track_number: Optional[int],
                  year: Optional[int], genre: Optional[str], file_path: str,
                  image_path: Optional[str], lyrics: Optional[str] = None):
        """Add or update a track in the database"""
        cursor = self.conn.cursor()
        
        try:
            # Insert or update track
            cursor.execute("""
                INSERT OR REPLACE INTO tracks 
                (id, title, artist, artist_id, album, album_id, duration_ms, 
                 track_number, year, genre, file_path, image_path, lyrics)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (track_id, title, artist, artist_id, album, album_id, duration_ms,
                  track_number, year, genre, file_path, image_path, lyrics))
            
            # Update or insert artist
            cursor.execute("""
                INSERT OR IGNORE INTO artists (id, name, image_path)
                VALUES (?, ?, ?)
            """, (artist_id, artist, image_path))
            
            # Update or insert album
            cursor.execute("""
                INSERT OR IGNORE INTO albums (id, name, artist, artist_id, year, image_path)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (album_id, album, artist, artist_id, year, image_path))
            
            # Update album track count
            cursor.execute("""
                UPDATE albums SET total_tracks = (
                    SELECT COUNT(*) FROM tracks WHERE album_id = ?
                ) WHERE id = ?
            """, (album_id, album_id))
            
            # Update artist counts
            cursor.execute("""
                UPDATE artists SET 
                    total_tracks = (SELECT COUNT(*) FROM tracks WHERE artist_id = ?),
                    total_albums = (SELECT COUNT(DISTINCT album_id) FROM tracks WHERE artist_id = ?)
                WHERE id = ?
            """, (artist_id, artist_id, artist_id))
            
            self.conn.commit()
        except Exception as e:
            print(f"Error adding track {title}: {e}")
            self.conn.rollback()
    
    def _row_to_dict(self, row) -> Dict[str, Any]:
        """Convert sqlite3.Row to dict"""
        if row is None:
            return None
        return dict(zip(row.keys(), row))
    
    def get_tracks(self, limit: int = 50, offset: int = 0, search: Optional[str] = None, 
                   only_available: bool = True) -> List[Dict]:
        """Get tracks with pagination and search"""
        cursor = self.conn.cursor()
        
        # Base query - only show tracks that exist on disk
        base_conditions = []
        params = []
        
        if search:
            base_conditions.append("(title LIKE ? OR artist LIKE ? OR album LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
        # Build WHERE clause
        where_clause = " AND ".join(base_conditions) if base_conditions else "1=1"
        
        query = f"""
            SELECT * FROM tracks 
            WHERE {where_clause}
            ORDER BY title
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Filter out unavailable tracks if requested
        tracks = [self._format_track_response(self._row_to_dict(row)) for row in rows]
        
        if only_available:
            from pathlib import Path
            tracks = [t for t in tracks if t and Path(t.get('file_path', '')).exists()]
        
        return tracks
    
    def get_track(self, track_id: str) -> Optional[Dict]:
        """Get single track by ID"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM tracks WHERE id = ?", (track_id,))
        row = cursor.fetchone()
        return self._format_track_response(self._row_to_dict(row)) if row else None
    
    def _format_track_response(self, track: Dict) -> Dict:
        """Format track to match Spotify API structure"""
        if not track:
            return None
        
        # Use placeholder image if no album art exists
        image_url = f"http://localhost:8000{track['image_path']}" if track.get("image_path") else "http://localhost:8000/images/playlist.png"
        
        return {
            "id": track["id"],
            "name": track["title"],
            "duration_ms": track["duration_ms"],
            "track_number": track["track_number"],
            "artists": [{"id": track["artist_id"], "name": track["artist"], "uri": f"local:artist:{track['artist_id']}"}],
            "album": {
                "id": track["album_id"],
                "name": track["album"],
                "images": [{"url": image_url, "height": 640, "width": 640}],
                "uri": f"local:album:{track['album_id']}"
            },
            "is_saved": bool(track["is_saved"]),
            "uri": f"local:track:{track['id']}",
            "file_path": track["file_path"],
            "lyrics": track.get("lyrics"),
            "has_enhanced_version": bool(track.get("has_enhanced_version", 0)),
            "enhanced_file_path": track.get("enhanced_file_path"),
            "enhancement_preset": track.get("enhancement_preset")
        }
    
    def get_albums(self, limit: int = 50, offset: int = 0, search: Optional[str] = None) -> List[Dict]:
        """Get albums with pagination"""
        cursor = self.conn.cursor()
        
        if search:
            cursor.execute("""
                SELECT * FROM albums 
                WHERE name LIKE ? OR artist LIKE ?
                ORDER BY name
                LIMIT ? OFFSET ?
            """, (f"%{search}%", f"%{search}%", limit, offset))
        else:
            cursor.execute("""
                SELECT * FROM albums 
                ORDER BY name
                LIMIT ? OFFSET ?
            """, (limit, offset))
        
        rows = cursor.fetchall()
        return [self._format_album_response(self._row_to_dict(row)) for row in rows]
    
    def get_album(self, album_id: str) -> Optional[Dict]:
        """Get album with tracks"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM albums WHERE id = ?", (album_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        album = self._format_album_response(self._row_to_dict(row))
        album["tracks"] = self.get_album_tracks(album_id)
        return album
    
    def _format_album_response(self, album: Dict) -> Dict:
        """Format album to match Spotify API structure"""
        if not album:
            return None
        
        # Use placeholder image if no album art exists
        image_url = f"http://localhost:8000{album['image_path']}" if album.get("image_path") else "http://localhost:8000/images/playlist.png"
        
        return {
            "id": album["id"],
            "name": album["name"],
            "artists": [{"id": album["artist_id"], "name": album["artist"], "uri": f"local:artist:{album['artist_id']}"}],
            "release_date": str(album["year"]) if album.get("year") else None,
            "total_tracks": album["total_tracks"],
            "images": [{"url": image_url, "height": 640, "width": 640}],
            "is_saved": bool(album["is_saved"]),
            "uri": f"local:album:{album['id']}"
        }
    
    def get_album_tracks(self, album_id: str) -> List[Dict]:
        """Get all tracks from an album"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM tracks 
            WHERE album_id = ? 
            ORDER BY track_number, title
        """, (album_id,))
        rows = cursor.fetchall()
        return [self._format_track_response(self._row_to_dict(row)) for row in rows]
    
    def get_artists(self, limit: int = 50, offset: int = 0, search: Optional[str] = None) -> List[Dict]:
        """Get artists with pagination"""
        cursor = self.conn.cursor()
        
        if search:
            cursor.execute("""
                SELECT * FROM artists 
                WHERE name LIKE ?
                ORDER BY name
                LIMIT ? OFFSET ?
            """, (f"%{search}%", limit, offset))
        else:
            cursor.execute("""
                SELECT * FROM artists 
                ORDER BY name
                LIMIT ? OFFSET ?
            """, (limit, offset))
        
        rows = cursor.fetchall()
        return [self._format_artist_response(self._row_to_dict(row)) for row in rows]
    
    def get_artist(self, artist_id: str) -> Optional[Dict]:
        """Get artist details"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM artists WHERE id = ?", (artist_id,))
        row = cursor.fetchone()
        return self._format_artist_response(self._row_to_dict(row)) if row else None
    
    def _format_artist_response(self, artist: Dict) -> Dict:
        """Format artist to match Spotify API structure"""
        if not artist:
            return None
        
        # Use placeholder image if no artist image exists
        image_url = f"http://localhost:8000{artist['image_path']}" if artist.get("image_path") else "http://localhost:8000/images/artist.png"
        
        return {
            "id": artist["id"],
            "name": artist["name"],
            "images": [{"url": image_url, "height": 640, "width": 640}],
            "followers": {"total": 0},
            "genres": [],
            "uri": f"local:artist:{artist['id']}"
        }
    
    def get_artist_albums(self, artist_id: str) -> List[Dict]:
        """Get all albums by an artist"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM albums 
            WHERE artist_id = ? 
            ORDER BY year DESC, name
        """, (artist_id,))
        rows = cursor.fetchall()
        return [self._format_album_response(self._row_to_dict(row)) for row in rows]
    
    def get_artist_tracks(self, artist_id: str, limit: int = 10) -> List[Dict]:
        """Get top tracks by an artist"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM tracks 
            WHERE artist_id = ? 
            ORDER BY play_count DESC, title
            LIMIT ?
        """, (artist_id, limit))
        rows = cursor.fetchall()
        return [self._format_track_response(self._row_to_dict(row)) for row in rows]
    
    # Playlist operations
    def get_playlists(self) -> List[Dict]:
        """Get all playlists"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM playlists ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [self._format_playlist_response(self._row_to_dict(row)) for row in rows]
    
    def get_playlist(self, playlist_id: str) -> Optional[Dict]:
        """Get playlist with tracks"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM playlists WHERE id = ?", (playlist_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        playlist = self._format_playlist_response(self._row_to_dict(row))
        
        # Get tracks
        cursor.execute("""
            SELECT t.* FROM tracks t
            JOIN playlist_tracks pt ON t.id = pt.track_id
            WHERE pt.playlist_id = ?
            ORDER BY pt.position
        """, (playlist_id,))
        
        tracks = cursor.fetchall()
        playlist["tracks"] = {
            "total": len(tracks),
            "items": [{"track": self._format_track_response(self._row_to_dict(t))} for t in tracks]
        }
        
        return playlist
    
    def create_playlist(self, name: str, description: Optional[str] = None) -> Dict:
        """Create a new playlist"""
        import uuid
        playlist_id = str(uuid.uuid4())[:16]
        
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO playlists (id, name, description)
            VALUES (?, ?, ?)
        """, (playlist_id, name, description))
        self.conn.commit()
        
        return self.get_playlist(playlist_id)
    
    def update_playlist(self, playlist_id: str, name: Optional[str], description: Optional[str]) -> bool:
        """Update playlist details"""
        cursor = self.conn.cursor()
        
        if name:
            cursor.execute("UPDATE playlists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
                         (name, playlist_id))
        if description is not None:
            cursor.execute("UPDATE playlists SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", 
                         (description, playlist_id))
        
        self.conn.commit()
        return cursor.rowcount > 0
    
    def delete_playlist(self, playlist_id: str) -> bool:
        """Delete a playlist"""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM playlists WHERE id = ?", (playlist_id,))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def add_track_to_playlist(self, playlist_id: str, track_id: str) -> bool:
        """Add track to playlist"""
        cursor = self.conn.cursor()
        
        # Get current max position
        cursor.execute("SELECT MAX(position) FROM playlist_tracks WHERE playlist_id = ?", (playlist_id,))
        max_pos = cursor.fetchone()[0] or 0
        
        try:
            cursor.execute("""
                INSERT INTO playlist_tracks (playlist_id, track_id, position)
                VALUES (?, ?, ?)
            """, (playlist_id, track_id, max_pos + 1))
            
            cursor.execute("UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (playlist_id,))
            self.conn.commit()
            return True
        except:
            return False
    
    def remove_track_from_playlist(self, playlist_id: str, track_id: str) -> bool:
        """Remove track from playlist"""
        cursor = self.conn.cursor()
        cursor.execute("""
            DELETE FROM playlist_tracks 
            WHERE playlist_id = ? AND track_id = ?
        """, (playlist_id, track_id))
        
        cursor.execute("UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (playlist_id,))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def _format_playlist_response(self, playlist: Dict) -> Dict:
        """Format playlist to match Spotify API structure"""
        if not playlist:
            return None
        
        return {
            "id": playlist["id"],
            "name": playlist["name"],
            "description": playlist.get("description"),
            "images": [{"url": "http://localhost:8000/images/playlist.png"}],
            "owner": {"display_name": "You"},
            "public": True,
            "uri": f"local:playlist:{playlist['id']}"
        }
    
    # Library operations
    def save_track(self, track_id: str) -> bool:
        """Save/like a track"""
        cursor = self.conn.cursor()
        cursor.execute("UPDATE tracks SET is_saved = 1 WHERE id = ?", (track_id,))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def unsave_track(self, track_id: str) -> bool:
        """Remove track from saved"""
        cursor = self.conn.cursor()
        cursor.execute("UPDATE tracks SET is_saved = 0 WHERE id = ?", (track_id,))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def get_saved_tracks(self) -> List[Dict]:
        """Get all saved tracks"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM tracks WHERE is_saved = 1 ORDER BY title")
        rows = cursor.fetchall()
        return [self._format_track_response(self._row_to_dict(row)) for row in rows]
    
    def save_album(self, album_id: str) -> bool:
        """Save an album"""
        cursor = self.conn.cursor()
        cursor.execute("UPDATE albums SET is_saved = 1 WHERE id = ?", (album_id,))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def unsave_album(self, album_id: str) -> bool:
        """Remove album from saved"""
        cursor = self.conn.cursor()
        cursor.execute("UPDATE albums SET is_saved = 0 WHERE id = ?", (album_id,))
        self.conn.commit()
        return cursor.rowcount > 0
    
    def get_saved_albums(self) -> List[Dict]:
        """Get all saved albums"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM albums WHERE is_saved = 1 ORDER BY name")
        rows = cursor.fetchall()
        return [self._format_album_response(self._row_to_dict(row)) for row in rows]
    
    def get_stats(self) -> Dict:
        """Get library statistics"""
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM tracks")
        total_tracks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM albums")
        total_albums = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM artists")
        total_artists = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM playlists")
        total_playlists = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(duration_ms) FROM tracks")
        total_duration = cursor.fetchone()[0] or 0
        
        return {
            "total_tracks": total_tracks,
            "total_albums": total_albums,
            "total_artists": total_artists,
            "total_playlists": total_playlists,
            "total_duration_hours": round(total_duration / (1000 * 60 * 60), 2)
        }
    
    def get_recommendations(self, track_id: Optional[str] = None, artist_id: Optional[str] = None, 
                          limit: int = 20) -> List[Dict]:
        """Get song recommendations based on track or artist"""
        cursor = self.conn.cursor()
        
        try:
            if track_id:
                # Get the seed track
                track = self.get_track(track_id)
                if not track:
                    return []
                
                # Get artist_id and genre from the formatted track
                seed_artist_id = track['artists'][0]['id'] if track.get('artists') else None
                seed_genre = track.get('genre')
                seed_album_id = track['album']['id'] if track.get('album') else None
                
                # Recommend similar tracks: same artist, genre, or album
                cursor.execute("""
                    SELECT DISTINCT t.* FROM tracks t
                    WHERE t.id != ? 
                    AND (
                        t.artist_id = ? 
                        OR t.genre = ?
                        OR t.album_id = ?
                    )
                    ORDER BY RANDOM()
                    LIMIT ?
                """, (track_id, seed_artist_id, seed_genre, seed_album_id, limit))
                
            elif artist_id:
                # Recommend tracks from the artist and similar artists
                cursor.execute("""
                    SELECT * FROM tracks
                    WHERE artist_id = ?
                    ORDER BY play_count DESC, RANDOM()
                    LIMIT ?
                """, (artist_id, limit))
            
            else:
                # Random popular tracks if no seed provided
                cursor.execute("""
                    SELECT * FROM tracks
                    ORDER BY play_count DESC, RANDOM()
                    LIMIT ?
                """, (limit,))
            
            rows = cursor.fetchall()
            return [self._format_track_response(self._row_to_dict(row)) for row in rows]
            
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return []
