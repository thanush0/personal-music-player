"""
Offline Audio Enhancement using FFmpeg
Applies Dolby Atmos-style effects without Web Audio API issues
"""

import subprocess
import os
from pathlib import Path
from typing import Optional, Dict, Literal
import logging

logger = logging.getLogger(__name__)

EnhancementPreset = Literal["atmos", "bass_boost", "clarity", "balanced", "custom"]


class AudioEnhancer:
    """Offline audio enhancement using FFmpeg"""
    
    def __init__(self):
        self.verify_ffmpeg()
    
    def verify_ffmpeg(self) -> bool:
        """Check if FFmpeg is installed"""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                logger.info("FFmpeg is available")
                return True
            else:
                logger.error("FFmpeg not found")
                return False
        except Exception as e:
            logger.error(f"FFmpeg check failed: {e}")
            return False
    
    def get_preset_filters(self, preset: EnhancementPreset) -> str:
        """
        Get FFmpeg audio filter chain for each preset
        
        Filter explanations:
        - bass=g=X: Bass boost (X dB gain at low frequencies)
        - treble=g=X: Treble boost (X dB gain at high frequencies)
        - equalizer: Parametric EQ for specific frequency ranges
        - extrastereo: Stereo widening (m=multiplier, 0-10)
        - compand: Dynamic range compression
        - loudnorm: EBU R128 loudness normalization
        - asubboost: Subwoofer bass enhancement
        """
        
        presets = {
            "atmos": (
                # Dolby Atmos-style: Wide soundstage, enhanced bass, clear highs
                "bass=g=6:f=100:w=0.5,"  # +6dB bass boost at 100Hz
                "equalizer=f=250:width_type=h:width=200:g=3,"  # Mid-bass presence
                "equalizer=f=2500:width_type=h:width=1000:g=4,"  # Clarity (vocals)
                "treble=g=3:f=8000,"  # +3dB treble for sparkle
                "extrastereo=m=2.5,"  # Wide stereo image
                "asubboost=cutoff=60:slope=1:delay=10,"  # Deep bass enhancement
                "compand=attacks=0.3:decays=0.8:points=-80/-80|-45/-45|-27/-25|0/-7|20/-7,"  # Compression
                "loudnorm=I=-16:TP=-1.5:LRA=11"  # Loudness normalization
            ),
            
            "bass_boost": (
                # Heavy bass for EDM, Hip-Hop
                "bass=g=8:f=80:w=0.6,"  # +8dB bass boost
                "asubboost=cutoff=50:slope=1.5:delay=15,"  # Subwoofer enhancement
                "equalizer=f=150:width_type=h:width=100:g=5,"  # Mid-bass punch
                "compand=attacks=0.2:decays=0.6:points=-80/-80|-45/-45|-20/-15|0/-5|20/-5,"  # Tight compression
                "loudnorm=I=-14:TP=-1:LRA=7"  # Louder normalization
            ),
            
            "clarity": (
                # Enhanced vocals and instrument separation
                "equalizer=f=200:width_type=h:width=150:g=-2,"  # Reduce mud
                "equalizer=f=1000:width_type=h:width=800:g=3,"  # Presence boost
                "equalizer=f=3000:width_type=h:width=1500:g=5,"  # Vocal clarity
                "equalizer=f=8000:width_type=h:width=3000:g=2,"  # Air/sparkle
                "compand=attacks=0.4:decays=1.0:points=-80/-80|-45/-45|-30/-28|0/-8|20/-8,"  # Gentle compression
                "loudnorm=I=-16:TP=-1.5:LRA=12"  # Dynamic normalization
            ),
            
            "balanced": (
                # Subtle enhancement for all genres
                "bass=g=4:f=100,"  # Moderate bass boost
                "equalizer=f=2500:width_type=h:width=1000:g=2,"  # Slight clarity
                "treble=g=2:f=8000,"  # Gentle treble
                "extrastereo=m=1.5,"  # Subtle stereo widening
                "compand=attacks=0.5:decays=1.0:points=-80/-80|-45/-45|-30/-27|0/-10|20/-10,"  # Light compression
                "loudnorm=I=-16:TP=-1.5:LRA=13"  # Standard normalization
            ),
            
            "custom": (
                # User-definable preset (can be customized later)
                "bass=g=5:f=100,"
                "treble=g=2:f=8000,"
                "extrastereo=m=2,"
                "loudnorm=I=-16:TP=-1.5:LRA=11"
            )
        }
        
        return presets.get(preset, presets["balanced"])
    
    def enhance_audio(
        self,
        input_file: str,
        output_file: str,
        preset: EnhancementPreset = "atmos",
        bitrate: str = "320k",
        sample_rate: int = 48000
    ) -> bool:
        """
        Apply audio enhancement using FFmpeg
        
        Args:
            input_file: Path to source audio file
            output_file: Path for enhanced output file
            preset: Enhancement preset to apply
            bitrate: Output bitrate (default 320k for high quality)
            sample_rate: Output sample rate in Hz (default 48000)
            
        Returns:
            bool: True if successful, False otherwise
        """
        
        if not os.path.exists(input_file):
            logger.error(f"Input file not found: {input_file}")
            return False
        
        # Get audio filter chain for preset
        audio_filters = self.get_preset_filters(preset)
        
        # Build FFmpeg command
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', input_file,  # Input file
            '-af', audio_filters,  # Apply audio filters
            '-ar', str(sample_rate),  # Sample rate
            '-b:a', bitrate,  # Bitrate
            '-y',  # Overwrite output file
            output_file
        ]
        
        try:
            logger.info(f"Enhancing audio: {input_file} -> {output_file} (preset: {preset})")
            
            # Run FFmpeg
            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                logger.info(f"Enhancement successful: {output_file}")
                return True
            else:
                logger.error(f"FFmpeg failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error(f"Enhancement timeout for {input_file}")
            return False
        except Exception as e:
            logger.error(f"Enhancement error: {e}")
            return False
    
    def get_audio_info(self, file_path: str) -> Optional[Dict]:
        """Get audio file information using ffprobe"""
        try:
            result = subprocess.run(
                [
                    'ffprobe',
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_format',
                    '-show_streams',
                    file_path
                ],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                import json
                return json.loads(result.stdout)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get audio info: {e}")
            return None
    
    def estimate_processing_time(self, file_path: str) -> float:
        """
        Estimate processing time in seconds based on file duration
        Typically FFmpeg processes at 10-20x real-time speed
        """
        info = self.get_audio_info(file_path)
        if info and 'format' in info and 'duration' in info['format']:
            duration = float(info['format']['duration'])
            # Estimate: duration / 15 (assuming 15x speed)
            return duration / 15.0
        return 10.0  # Default estimate


# Global instance
audio_enhancer = AudioEnhancer()
