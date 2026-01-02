"""
Storage Manager for Standard Song Structure
Handles file organization following: <LibraryRoot>/<Artist>/<Album>/<Assets>
"""

import os
import json
import shutil
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime
import hashlib
import re


class StorageManager:
    """Manages song storage following the standard structure"""
    
    def __init__(self, library_root: str):
        self.library_root = Path(library_root)
        self.library_root.mkdir(parents=True, exist_ok=True)
    
    def normalize_name(self, name: str) -> str:
        """
        Normalize artist/album names for folder structure
        - Remove invalid characters
        - Convert to safe filesystem names
        - Preserve readability
        """
        # Remove or replace invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '')
        
        # Replace multiple spaces with single space
        name = re.sub(r'\s+', ' ', name)
        
        # Trim whitespace
        name = name.strip()
        
        # Limit length to avoid path issues (255 chars is filesystem limit)
        if len(name) > 100:
            name = name[:100].strip()
        
        return name
    
    def get_song_folder(self, artist: str, album: str) -> Path:
        """
        Get the folder path for a song
        Returns: <LibraryRoot>/<Artist>/<Album>/
        """
        artist_normalized = self.normalize_name(artist)
        album_normalized = self.normalize_name(album)
        
        return self.library_root / artist_normalized / album_normalized
    
    def create_song_folder(self, artist: str, album: str) -> Path:
        """
        Create song folder if it doesn't exist
        Returns: Path to the song folder
        """
        folder = self.get_song_folder(artist, album)
        folder.mkdir(parents=True, exist_ok=True)
        return folder
    
    def get_asset_path(self, artist: str, album: str, asset_name: str) -> Path:
        """
        Get path to a specific asset in the song folder
        
        Args:
            artist: Artist name
            album: Album name
            asset_name: Asset filename (e.g., "Title.flac", "cover.jpg")
        
        Returns:
            Full path to the asset
        """
        folder = self.get_song_folder(artist, album)
        return folder / asset_name
    
    def save_metadata(
        self,
        artist: str,
        album: str,
        title: str,
        duration: int,
        source: str = "local",
        has_enhanced_version: bool = False,
        has_lyrics: bool = False,
        has_animated_cover: bool = False,
        additional_metadata: Optional[Dict] = None
    ) -> Path:
        """
        Save metadata.json for a song
        
        Returns:
            Path to metadata.json
        """
        folder = self.create_song_folder(artist, album)
        metadata_path = folder / "metadata.json"
        
        metadata = {
            "title": title,
            "artist": artist,
            "album": album,
            "duration": duration,
            "source": source,
            "hasEnhancedVersion": has_enhanced_version,
            "hasLyrics": has_lyrics,
            "hasAnimatedCover": has_animated_cover,
            "lastUpdated": datetime.now().isoformat()
        }
        
        # Add any additional metadata
        if additional_metadata:
            metadata.update(additional_metadata)
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        return metadata_path
    
    def read_metadata(self, artist: str, album: str) -> Optional[Dict]:
        """
        Read metadata.json from song folder
        
        Returns:
            Metadata dict or None if not found
        """
        metadata_path = self.get_asset_path(artist, album, "metadata.json")
        
        if not metadata_path.exists():
            return None
        
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading metadata: {e}")
            return None
    
    def update_metadata(
        self,
        artist: str,
        album: str,
        updates: Dict
    ) -> bool:
        """
        Update specific fields in metadata.json
        
        Args:
            artist: Artist name
            album: Album name
            updates: Dict of fields to update
        
        Returns:
            True if successful
        """
        metadata = self.read_metadata(artist, album)
        
        if metadata is None:
            return False
        
        metadata.update(updates)
        metadata["lastUpdated"] = datetime.now().isoformat()
        
        metadata_path = self.get_asset_path(artist, album, "metadata.json")
        
        try:
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error updating metadata: {e}")
            return False
    
    def organize_audio_file(
        self,
        source_path: Path,
        artist: str,
        album: str,
        title: str,
        is_enhanced: bool = False
    ) -> Path:
        """
        Move/copy audio file to standard location
        
        Args:
            source_path: Current file location
            artist: Artist name
            album: Album name
            title: Song title
            is_enhanced: Whether this is an enhanced version
        
        Returns:
            New path to the file
        """
        folder = self.create_song_folder(artist, album)
        
        # Determine filename
        title_normalized = self.normalize_name(title)
        extension = source_path.suffix
        
        if is_enhanced:
            filename = f"{title_normalized}_enhanced{extension}"
        else:
            filename = f"{title_normalized}{extension}"
        
        dest_path = folder / filename
        
        # Move or copy file
        if source_path != dest_path:
            if source_path.exists():
                shutil.move(str(source_path), str(dest_path))
        
        return dest_path
    
    def save_cover_art(
        self,
        source_path: Path,
        artist: str,
        album: str
    ) -> Path:
        """
        Save cover art as cover.jpg in song folder
        
        Returns:
            Path to saved cover art
        """
        folder = self.create_song_folder(artist, album)
        dest_path = folder / "cover.jpg"
        
        if source_path != dest_path and source_path.exists():
            shutil.copy2(str(source_path), str(dest_path))
        
        return dest_path
    
    def save_lyrics(
        self,
        lyrics_content: str,
        artist: str,
        album: str
    ) -> Path:
        """
        Save lyrics as lyrics.lrc in song folder
        
        Returns:
            Path to saved lyrics file
        """
        folder = self.create_song_folder(artist, album)
        lyrics_path = folder / "lyrics.lrc"
        
        with open(lyrics_path, 'w', encoding='utf-8') as f:
            f.write(lyrics_content)
        
        return lyrics_path
    
    def get_all_songs(self) -> List[Dict]:
        """
        Scan library and return all songs with metadata
        
        Returns:
            List of metadata dicts with file paths
        """
        songs = []
        
        # Walk through Artist/Album structure
        for artist_folder in self.library_root.iterdir():
            if not artist_folder.is_dir():
                continue
            
            for album_folder in artist_folder.iterdir():
                if not album_folder.is_dir():
                    continue
                
                metadata_path = album_folder / "metadata.json"
                
                if not metadata_path.exists():
                    continue
                
                try:
                    with open(metadata_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    # Add file paths
                    title_normalized = self.normalize_name(metadata['title'])
                    
                    # Find audio file (could be .mp3, .flac, etc.)
                    audio_files = list(album_folder.glob(f"{title_normalized}.*"))
                    audio_files = [f for f in audio_files if f.suffix in ['.mp3', '.flac', '.m4a', '.ogg', '.wav']]
                    
                    if audio_files:
                        metadata['filePath'] = str(audio_files[0])
                        metadata['folderPath'] = str(album_folder)
                        songs.append(metadata)
                
                except Exception as e:
                    print(f"Error reading metadata from {metadata_path}: {e}")
        
        return songs
    
    def get_song_info(self, artist: str, album: str) -> Optional[Dict]:
        """
        Get complete song information including all assets
        
        Returns:
            Dict with metadata and asset paths
        """
        metadata = self.read_metadata(artist, album)
        
        if not metadata:
            return None
        
        folder = self.get_song_folder(artist, album)
        
        # Find audio file
        title_normalized = self.normalize_name(metadata['title'])
        audio_files = list(folder.glob(f"{title_normalized}.*"))
        audio_files = [f for f in audio_files if f.suffix in ['.mp3', '.flac', '.m4a', '.ogg', '.wav']]
        
        enhanced_files = list(folder.glob(f"{title_normalized}_enhanced.*"))
        enhanced_files = [f for f in enhanced_files if f.suffix in ['.mp3', '.flac', '.m4a', '.ogg', '.wav']]
        
        info = metadata.copy()
        info.update({
            'folderPath': str(folder),
            'audioPath': str(audio_files[0]) if audio_files else None,
            'enhancedAudioPath': str(enhanced_files[0]) if enhanced_files else None,
            'coverPath': str(folder / "cover.jpg") if (folder / "cover.jpg").exists() else None,
            'lyricsPath': str(folder / "lyrics.lrc") if (folder / "lyrics.lrc").exists() else None,
            'animatedCoverPath': str(folder / "animated_cover.mp4") if (folder / "animated_cover.mp4").exists() else None,
        })
        
        return info
    
    def delete_song(self, artist: str, album: str) -> bool:
        """
        Delete entire song folder and all assets
        
        Returns:
            True if successful
        """
        folder = self.get_song_folder(artist, album)
        
        if not folder.exists():
            return False
        
        try:
            shutil.rmtree(str(folder))
            
            # Clean up empty parent folders
            artist_folder = folder.parent
            if artist_folder.exists() and not any(artist_folder.iterdir()):
                artist_folder.rmdir()
            
            return True
        except Exception as e:
            print(f"Error deleting song folder: {e}")
            return False
