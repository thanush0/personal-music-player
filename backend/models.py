from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Track(BaseModel):
    id: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    album: str
    album_id: Optional[str] = None
    duration_ms: int
    track_number: Optional[int] = None
    year: Optional[int] = None
    genre: Optional[str] = None
    file_path: str
    is_saved: bool = False
    has_enhanced_version: bool = False
    enhanced_file_path: Optional[str] = None
    enhancement_preset: Optional[str] = None
    enhanced_at: Optional[datetime] = None


class TrackResponse(BaseModel):
    id: str
    name: str  # For compatibility with Spotify API structure
    duration_ms: int
    track_number: Optional[int] = None
    artists: List[dict]  # [{"id": "...", "name": "..."}]
    album: dict  # {"id": "...", "name": "...", "images": [...]}
    uri: str  # Spotify-style URI like "local:track:id"
    is_saved: bool = False
    has_enhanced_version: bool = False
    enhanced_file_path: Optional[str] = None
    enhancement_preset: Optional[str] = None


class Album(BaseModel):
    id: str
    name: str
    artist: str
    artist_id: Optional[str] = None
    year: Optional[int] = None
    total_tracks: int = 0
    image_path: Optional[str] = None
    is_saved: bool = False


class AlbumResponse(BaseModel):
    id: str
    name: str
    artists: List[dict]  # [{"id": "...", "name": "..."}]
    release_date: Optional[str] = None
    total_tracks: int
    images: List[dict]  # [{"url": "...", "height": 640, "width": 640}]
    tracks: Optional[List[TrackResponse]] = None
    is_saved: bool = False


class Artist(BaseModel):
    id: str
    name: str
    total_albums: int = 0
    total_tracks: int = 0
    image_path: Optional[str] = None


class ArtistResponse(BaseModel):
    id: str
    name: str
    images: List[dict]  # [{"url": "...", "height": 640, "width": 640}]
    followers: Optional[dict] = {"total": 0}
    genres: List[str] = []


class Playlist(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    track_count: int = 0
    image_path: Optional[str] = None


class PlaylistResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    images: List[dict]  # [{"url": "..."}]
    tracks: Optional[dict] = None  # {"total": int, "items": [...]}
    owner: dict = {"display_name": "You"}
    public: bool = True
