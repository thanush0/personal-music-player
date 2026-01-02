import os
import yt_dlp
from pathlib import Path
from typing import Optional, Dict
import asyncio
from concurrent.futures import ThreadPoolExecutor
import re
import requests


class YouTubeDownloader:
    """Download audio from YouTube videos"""
    
    def __init__(self, output_folder: str):
        self.output_folder = Path(output_folder)
        self.output_folder.mkdir(parents=True, exist_ok=True)
        self.executor = ThreadPoolExecutor(max_workers=3)
    
    def _sanitize_filename(self, filename: str) -> str:
        """Remove invalid characters from filename"""
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '')
        return filename
    
    def _extract_artist_title(self, video_title: str) -> tuple[Optional[str], Optional[str]]:
        """Extract artist and title from video title"""
        # Common patterns: "Artist - Title", "Artist: Title", "Title by Artist"
        patterns = [
            r'^(.+?)\s*-\s*(.+)$',  # Artist - Title
            r'^(.+?)\s*:\s*(.+)$',  # Artist: Title
            r'^(.+?)\s*\|\s*(.+)$',  # Artist | Title
            r'^(.+)\s+by\s+(.+)$',  # Title by Artist (reversed)
        ]
        
        for i, pattern in enumerate(patterns):
            match = re.match(pattern, video_title, re.IGNORECASE)
            if match:
                if i == 3:  # "by Artist" pattern - swap order
                    return match.group(2).strip(), match.group(1).strip()
                return match.group(1).strip(), match.group(2).strip()
        
        # If no pattern matches, return None for artist and full title
        return None, video_title.strip()
    
    async def fetch_lyrics(self, artist: str, title: str) -> Optional[str]:
        """Fetch lyrics from various sources"""
        try:
            # Clean up artist and title
            artist = re.sub(r'\s*\(.*?\)\s*', '', artist).strip()  # Remove parentheses
            title = re.sub(r'\s*\(.*?\)\s*', '', title).strip()
            title = re.sub(r'\s*\[.*?\]\s*', '', title).strip()  # Remove brackets
            
            # Try lyrics.ovh API (free, no key required)
            loop = asyncio.get_event_loop()
            
            def _fetch():
                try:
                    url = f"https://api.lyrics.ovh/v1/{artist}/{title}"
                    response = requests.get(url, timeout=5)
                    if response.status_code == 200:
                        data = response.json()
                        return data.get('lyrics')
                except:
                    pass
                return None
            
            lyrics = await loop.run_in_executor(self.executor, _fetch)
            return lyrics
            
        except Exception as e:
            print(f"Error fetching lyrics: {e}")
            return None
    
    async def get_video_info(self, url: str) -> Optional[Dict]:
        """Get video information without downloading"""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            
            loop = asyncio.get_event_loop()
            
            def _get_info():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    return ydl.extract_info(url, download=False)
            
            info = await loop.run_in_executor(self.executor, _get_info)
            
            if info:
                # Extract artist and title from video title
                video_title = info.get('title', '')
                artist, title = self._extract_artist_title(video_title)
                
                # Try to fetch lyrics
                lyrics = None
                if artist and title:
                    lyrics = await self.fetch_lyrics(artist, title)
                
                return {
                    'id': info.get('id'),
                    'title': title or video_title,
                    'artist': artist or info.get('uploader', 'Unknown Artist'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader'),
                    'thumbnail': info.get('thumbnail'),
                    'description': info.get('description', ''),
                    'lyrics': lyrics,
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count', 0),
                }
            
        except Exception as e:
            print(f"Error getting video info: {e}")
            return None
    
    async def download_audio(
        self,
        url: str,
        format: str = 'mp3',
        quality: str = 'best',
        progress_callback=None
    ) -> Optional[str]:
        """
        Download audio from YouTube URL
        
        Args:
            url: YouTube video URL
            format: Output format (mp3, flac, m4a, ogg, wav)
            quality: Audio quality (best, 320, 256, 192, 128)
            progress_callback: Function to call with download progress
        
        Returns:
            Path to downloaded file or None if failed
        """
        
        try:
            # Quality settings
            quality_map = {
                'best': '0',  # Best available
                '320': '320',
                '256': '256',
                '192': '192',
                '128': '128',
            }
            
            audio_quality = quality_map.get(quality, '0')
            
            # Output template
            output_template = str(self.output_folder / '%(title)s.%(ext)s')
            
            # yt-dlp options
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'quiet': False,
                'no_warnings': False,
                'extract_audio': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': format,
                    'preferredquality': audio_quality,
                }],
                'postprocessor_args': [
                    '-ar', '48000',  # Sample rate
                ],
                'prefer_ffmpeg': True,
                'keepvideo': False,
            }
            
            # Add metadata
            if format in ['mp3', 'flac', 'm4a']:
                ydl_opts['postprocessors'].append({
                    'key': 'FFmpegMetadata',
                    'add_metadata': True,
                })
                
                # Embed thumbnail for supported formats
                if format in ['mp3', 'm4a']:
                    ydl_opts['postprocessors'].append({
                        'key': 'EmbedThumbnail',
                        'already_have_thumbnail': False,
                    })
                    ydl_opts['writethumbnail'] = True
            
            # Progress hook
            def progress_hook(d):
                if progress_callback and d['status'] == 'downloading':
                    progress = {
                        'status': 'downloading',
                        'downloaded_bytes': d.get('downloaded_bytes', 0),
                        'total_bytes': d.get('total_bytes', 0),
                        'speed': d.get('speed', 0),
                        'eta': d.get('eta', 0),
                    }
                    progress_callback(progress)
                elif progress_callback and d['status'] == 'finished':
                    progress_callback({'status': 'processing'})
            
            ydl_opts['progress_hooks'] = [progress_hook]
            
            # Download in thread pool
            loop = asyncio.get_event_loop()
            
            def _download():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    
                    # Get the actual filename
                    if info:
                        title = self._sanitize_filename(info['title'])
                        filename = f"{title}.{format}"
                        filepath = self.output_folder / filename
                        
                        # Sometimes yt-dlp uses a different name
                        if not filepath.exists():
                            # Find the downloaded file
                            for file in self.output_folder.glob(f"*{title}*.{format}"):
                                return str(file)
                        
                        return str(filepath)
                return None
            
            filepath = await loop.run_in_executor(self.executor, _download)
            
            return filepath
            
        except Exception as e:
            print(f"Error downloading audio: {e}")
            return None
    
    async def download_playlist(
        self,
        url: str,
        format: str = 'mp3',
        quality: str = 'best',
        progress_callback=None
    ) -> list:
        """
        Download entire playlist
        
        Returns:
            List of downloaded file paths
        """
        
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
            }
            
            loop = asyncio.get_event_loop()
            
            def _get_playlist():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    return ydl.extract_info(url, download=False)
            
            info = await loop.run_in_executor(self.executor, _get_playlist)
            
            if not info or 'entries' not in info:
                return []
            
            downloaded_files = []
            total = len(info['entries'])
            
            for idx, entry in enumerate(info['entries'], 1):
                if progress_callback:
                    progress_callback({
                        'status': 'downloading_playlist',
                        'current': idx,
                        'total': total,
                        'title': entry.get('title', ''),
                    })
                
                video_url = f"https://www.youtube.com/watch?v={entry['id']}"
                filepath = await self.download_audio(video_url, format, quality)
                
                if filepath:
                    downloaded_files.append(filepath)
            
            return downloaded_files
            
        except Exception as e:
            print(f"Error downloading playlist: {e}")
            return []
