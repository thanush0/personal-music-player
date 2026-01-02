import os
import hashlib
from pathlib import Path
from typing import List, Optional
from mutagen import File as MutagenFile
from mutagen.id3 import ID3, APIC
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
from PIL import Image
import io


class MusicScanner:
    """Scans folders for music files and extracts metadata"""
    
    SUPPORTED_FORMATS = {'.mp3', '.flac', '.m4a', '.ogg', '.wav'}
    
    def __init__(self, database):
        self.db = database
        self.cover_folder = Path("./covers")
        self.cover_folder.mkdir(exist_ok=True)
    
    async def scan_folder(self, folder_path: str):
        """Recursively scan folder for music files"""
        folder = Path(folder_path)
        if not folder.exists():
            print(f"Music folder not found: {folder_path}")
            folder.mkdir(parents=True, exist_ok=True)
            return
        
        music_files = []
        for ext in self.SUPPORTED_FORMATS:
            music_files.extend(folder.rglob(f"*{ext}"))
        
        # CRITICAL FIX: Filter out enhanced versions - they should not be separate tracks
        standard_files = []
        enhanced_files = {}
        
        for file_path in music_files:
            if '_enhanced' in file_path.stem:
                # This is an enhanced version - extract the base name
                base_name = file_path.stem.replace('_enhanced', '')
                base_key = str(file_path.parent / base_name)
                enhanced_files[base_key] = file_path
            else:
                standard_files.append(file_path)
        
        print(f"Found {len(standard_files)} tracks ({len(enhanced_files)} with enhanced versions)")
        
        for file_path in standard_files:
            try:
                # Check if this track has an enhanced version
                base_key = str(file_path.parent / file_path.stem)
                enhanced_path = enhanced_files.get(base_key)
                await self.process_file(file_path, enhanced_path)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
    
    async def process_file(self, file_path: Path, enhanced_path: Optional[Path] = None):
        """Extract metadata and add to database"""
        try:
            audio = MutagenFile(str(file_path), easy=True)
            if audio is None:
                return
            
            # Extract metadata from tags
            title = self._get_tag(audio, 'title')
            artist = self._get_tag(audio, 'artist')
            album = self._get_tag(audio, 'album')
            
            # Smart fallback: Parse from filename if metadata is missing or looks like a channel name
            # Common patterns: "Artist - Title", "Artist - Title (Type)", "Title - Artist"
            filename = file_path.stem
            
            # If no title or artist, try to parse from filename
            if not title or not artist:
                parsed = self._parse_filename(filename)
                if not title:
                    title = parsed.get('title', filename)
                if not artist:
                    artist = parsed.get('artist', 'Unknown Artist')
            
            # Additional check: if artist looks like a channel/uploader name, try filename
            # Common YouTube/music video channel patterns
            channel_keywords = ['music', 'official', 'vevo', 'records', 'entertainment', 'media', 'channel', 'video', 'lyrics']
            if artist and any(keyword in artist.lower() for keyword in channel_keywords):
                parsed = self._parse_filename(filename)
                if parsed.get('artist'):
                    print(f"  ⚠ Replacing channel name '{artist}' with filename artist '{parsed['artist']}'")
                    artist = parsed['artist']
            
            # Final fallbacks
            if not title:
                title = filename
            if not artist:
                artist = 'Unknown Artist'
            if not album:
                album = 'Unknown Album'
            
            # Get additional metadata
            track_number = self._get_track_number(audio)
            year = self._get_year(audio)
            genre = self._get_tag(audio, 'genre')
            
            # Get duration in milliseconds
            duration_ms = int(audio.info.length * 1000) if hasattr(audio.info, 'length') else 0
            
            # Generate IDs
            track_id = self._generate_id(str(file_path))
            artist_id = self._generate_id(artist)
            album_id = self._generate_id(f"{artist}-{album}")
            
            # Extract album art
            image_path = await self._extract_album_art(file_path, album_id)
            
            # Check for lyrics file in same directory (lyrics.lrc)
            lyrics_content = None
            lyrics_file = file_path.parent / "lyrics.lrc"
            if lyrics_file.exists():
                try:
                    with open(lyrics_file, 'r', encoding='utf-8') as f:
                        lyrics_content = f.read()
                except Exception as e:
                    print(f"Error reading lyrics file: {e}")
            
            # Add to database with enhanced version info
            self.db.add_track(
                track_id=track_id,
                title=title,
                artist=artist,
                artist_id=artist_id,
                album=album,
                album_id=album_id,
                duration_ms=duration_ms,
                track_number=track_number,
                year=year,
                genre=genre,
                file_path=str(file_path),
                image_path=image_path,
                lyrics=lyrics_content
            )
            
            # Update enhanced version info if exists
            if enhanced_path and enhanced_path.exists():
                cursor = self.db.conn.cursor()
                cursor.execute("""
                    UPDATE tracks 
                    SET has_enhanced_version = 1,
                        enhanced_file_path = ?
                    WHERE id = ?
                """, (str(enhanced_path), track_id))
                self.db.conn.commit()
                print(f"  ✅ Track has enhanced version: {enhanced_path.name}")
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    def _get_tag(self, audio, tag_name: str) -> Optional[str]:
        """Safely get tag value"""
        try:
            value = audio.get(tag_name)
            if value:
                result = str(value[0]) if isinstance(value, list) else str(value)
                # Clean up empty or whitespace-only values
                return result.strip() if result.strip() else None
        except:
            pass
        return None
    
    def _parse_filename(self, filename: str) -> dict:
        """
        Parse artist and title from filename.
        Common patterns:
        - "Artist - Title"
        - "Artist - Title (Official Video)"
        - "Title - Artist"
        """
        result = {'artist': None, 'title': None}
        
        # Remove common suffixes
        clean_name = filename
        suffixes_to_remove = [
            '(Official Video)', '(Official Music Video)', '(Lyrics)', 
            '(Official Audio)', '(Audio)', '[Official Video]', '[Lyrics]',
            '(Lyric Video)', '(Music Video)', 'Official Video', 'Lyrics'
        ]
        for suffix in suffixes_to_remove:
            if suffix.lower() in clean_name.lower():
                # Find and remove (case-insensitive)
                idx = clean_name.lower().find(suffix.lower())
                clean_name = clean_name[:idx] + clean_name[idx + len(suffix):]
        
        clean_name = clean_name.strip()
        
        # Try to split by " - " (most common pattern)
        if ' - ' in clean_name:
            parts = clean_name.split(' - ', 1)
            if len(parts) == 2:
                # Could be "Artist - Title" or "Title - Artist"
                # Heuristic: if first part looks like an artist name (shorter, capitalized), use it
                part1, part2 = parts[0].strip(), parts[1].strip()
                
                # Check if part1 looks more like an artist (single word or short phrase)
                # Most artist names are 1-3 words
                part1_words = len(part1.split())
                part2_words = len(part2.split())
                
                if part1_words <= 3 and part1_words < part2_words:
                    result['artist'] = part1
                    result['title'] = part2
                else:
                    # Assume standard "Artist - Title" format
                    result['artist'] = part1
                    result['title'] = part2
        
        return result
    
    def _get_track_number(self, audio) -> Optional[int]:
        """Extract track number"""
        try:
            track = self._get_tag(audio, 'tracknumber')
            if track:
                # Handle "1/12" format
                return int(track.split('/')[0])
        except:
            pass
        return None
    
    def _get_year(self, audio) -> Optional[int]:
        """Extract year from date tag"""
        try:
            date = self._get_tag(audio, 'date')
            if date:
                return int(date[:4])
        except:
            pass
        return None
    
    def _generate_id(self, text: str) -> str:
        """Generate consistent ID from text"""
        return hashlib.md5(text.encode()).hexdigest()[:16]
    
    async def _extract_album_art(self, file_path: Path, album_id: str) -> Optional[str]:
        """Extract and save album artwork"""
        try:
            # Check if cover already exists
            cover_path = self.cover_folder / f"{album_id}.jpg"
            if cover_path.exists():
                return f"/covers/{album_id}.jpg"
            
            # Try to extract from file
            audio = MutagenFile(str(file_path))
            image_data = None
            
            if isinstance(audio, MP3):
                # MP3 with ID3 tags
                try:
                    tags = ID3(str(file_path))
                    for tag in tags.values():
                        if isinstance(tag, APIC):
                            image_data = tag.data
                            break
                except:
                    pass
            
            elif isinstance(audio, FLAC):
                # FLAC files
                if audio.pictures:
                    image_data = audio.pictures[0].data
            
            elif isinstance(audio, MP4):
                # M4A files
                if 'covr' in audio:
                    image_data = audio['covr'][0]
            
            if image_data:
                # Save image
                try:
                    img = Image.open(io.BytesIO(image_data))
                    # Resize to reasonable size
                    img.thumbnail((640, 640), Image.Resampling.LANCZOS)
                    img.save(cover_path, "JPEG", quality=85)
                    return f"/covers/{album_id}.jpg"
                except Exception as e:
                    print(f"Error saving album art: {e}")
            
        except Exception as e:
            print(f"Error extracting album art from {file_path}: {e}")
        
        return None
