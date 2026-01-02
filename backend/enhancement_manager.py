"""
Enhancement Manager - Handles offline audio enhancement with standard structure
"""

from pathlib import Path
from typing import Optional, Dict
from datetime import datetime
import shutil

from storage_manager import StorageManager
from audio_enhancer import AudioEnhancer


class EnhancementManager:
    """Manages audio enhancement in standard song structure"""
    
    def __init__(self, storage_manager: StorageManager):
        self.storage = storage_manager
        self.enhancer = AudioEnhancer()
    
    async def enhance_track(
        self,
        artist: str,
        album: str,
        preset: str = 'atmos'
    ) -> Optional[Dict]:
        """
        Enhance a track and save as <Title>_enhanced.flac
        
        Args:
            artist: Artist name
            album: Album name
            preset: Enhancement preset
        
        Returns:
            Dict with enhanced file path and info
        """
        
        # Get song info
        song_info = self.storage.get_song_info(artist, album)
        if not song_info:
            return {'error': 'Song not found'}
        
        audio_path = song_info.get('audioPath')
        if not audio_path or not Path(audio_path).exists():
            return {'error': 'Audio file not found'}
        
        # Check if already enhanced with this preset
        metadata = self.storage.read_metadata(artist, album)
        if metadata and metadata.get('hasEnhancedVersion'):
            enhanced_path = song_info.get('enhancedAudioPath')
            if enhanced_path and Path(enhanced_path).exists():
                existing_preset = metadata.get('enhancementPreset')
                if existing_preset == preset:
                    return {
                        'message': 'Track already enhanced with this preset',
                        'preset': preset,
                        'enhanced_path': enhanced_path,
                        'already_exists': True
                    }
        
        print(f"Enhancing: {artist} - {metadata['title']} with {preset}")
        
        # Create output path
        title_normalized = self.storage.normalize_name(metadata['title'])
        audio_path_obj = Path(audio_path)
        enhanced_filename = f"{title_normalized}_enhanced{audio_path_obj.suffix}"
        
        folder = self.storage.get_song_folder(artist, album)
        enhanced_path = folder / enhanced_filename
        
        # Enhance audio
        success = self.enhancer.enhance_audio(
            input_path=str(audio_path),
            output_path=str(enhanced_path),
            preset=preset
        )
        
        if not success:
            return {'error': 'Enhancement failed'}
        
        # Update metadata.json
        self.storage.update_metadata(artist, album, {
            'hasEnhancedVersion': True,
            'enhancementPreset': preset,
            'enhancedAt': datetime.now().isoformat()
        })
        
        print(f"✅ Enhanced: {enhanced_path}")
        
        return {
            'message': 'Track enhanced successfully',
            'preset': preset,
            'enhanced_path': str(enhanced_path),
            'original_path': str(audio_path),
            'already_exists': False
        }
    
    def delete_enhanced_version(self, artist: str, album: str) -> bool:
        """
        Delete enhanced version of a track
        
        Returns:
            True if successful
        """
        song_info = self.storage.get_song_info(artist, album)
        if not song_info:
            return False
        
        enhanced_path = song_info.get('enhancedAudioPath')
        if not enhanced_path:
            return False
        
        enhanced_path_obj = Path(enhanced_path)
        
        # Delete file
        try:
            if enhanced_path_obj.exists():
                enhanced_path_obj.unlink()
        except Exception as e:
            print(f"Error deleting enhanced file: {e}")
            return False
        
        # Update metadata
        self.storage.update_metadata(artist, album, {
            'hasEnhancedVersion': False,
            'enhancementPreset': None,
            'enhancedAt': None
        })
        
        return True
    
    def get_versions(self, artist: str, album: str) -> Dict:
        """
        Get available versions (original and enhanced)
        
        Returns:
            Dict with version info
        """
        song_info = self.storage.get_song_info(artist, album)
        if not song_info:
            return {'error': 'Song not found'}
        
        versions = {
            'original': {
                'file_path': song_info.get('audioPath'),
                'exists': Path(song_info.get('audioPath', '')).exists() if song_info.get('audioPath') else False
            }
        }
        
        if song_info.get('hasEnhancedVersion'):
            enhanced_path = song_info.get('enhancedAudioPath')
            versions['enhanced'] = {
                'file_path': enhanced_path,
                'exists': Path(enhanced_path).exists() if enhanced_path else False,
                'preset': song_info.get('enhancementPreset'),
                'created_at': song_info.get('enhancedAt')
            }
        
        return versions
