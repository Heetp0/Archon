import os
import time
import logging
from typing import Dict, Any, List
try:
    from pydub import AudioSegment
except Exception:
    AudioSegment = None
try:
    import librosa
except Exception:
    librosa = None
try:
    import soundfile as sf
except Exception:
    sf = None
try:
    import noisereduce as nr
except Exception:
    nr = None
try:
    from groq import Groq
except Exception:
    Groq = None
import config

logger = logging.getLogger("audio_processor")

class AudioProcessor:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", config.GROQ_API_KEY)
        self.uploads_dir = os.path.join(config.WORKSPACE_ROOT, "uploads")
        os.makedirs(self.uploads_dir, exist_ok=True)

    def denoise_audio(self, input_path: str) -> str:
        """Denoise audio file using noisereduce and return path to denoised WAV file."""
        logger.info(f"Starting denoising for: {input_path}")
        
        # Determine extension
        _, ext = os.path.splitext(input_path.lower())
        
        # Load audio and convert to WAV if needed
        temp_wav_path = os.path.join(self.uploads_dir, f"temp_{int(time.time())}.wav")
        if ext != ".wav":
            logger.info(f"Converting {ext} to WAV format...")
            audio = AudioSegment.from_file(input_path)
            audio.export(temp_wav_path, format="wav")
            wav_path_to_load = temp_wav_path
        else:
            wav_path_to_load = input_path

        try:
            # Load with librosa
            logger.info("Loading audio into memory...")
            y, sr = librosa.load(wav_path_to_load, sr=None)
            
            # Reduce noise
            logger.info("Applying spectral noise reduction...")
            reduced_y = nr.reduce_noise(y=y, sr=sr)
            
            # Save denoised wav
            denoised_path = os.path.join(self.uploads_dir, f"denoised_{int(time.time())}.wav")
            sf.write(denoised_path, reduced_y, sr)
            logger.info(f"Denoised audio saved to: {denoised_path}")
            return denoised_path
        finally:
            # Clean up temp WAV if created
            if os.path.exists(temp_wav_path) and temp_wav_path != input_path:
                try:
                    os.remove(temp_wav_path)
                except Exception:
                    pass

    def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio using Groq Whisper Large v3 Turbo and return transcript + segments."""
        logger.info(f"Starting transcription using Groq for: {audio_path}")
        
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured in .env or config.py")

        client = Groq(api_key=self.groq_api_key)
        
        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                response_format="verbose_json",
                language="en",
                temperature=0.0
            )

        # Get response data
        # Depending on SDK, response might be a dict or a pydantic model
        if hasattr(response, "model_dump"):
            res_dict = response.model_dump()
        elif isinstance(response, dict):
            res_dict = response
        else:
            res_dict = dict(response)

        full_text = res_dict.get("text", "")
        segments = res_dict.get("segments", [])
        
        formatted_segments = []
        formatted_transcript_lines = []
        
        for seg in segments:
            start_sec = int(seg.get("start", 0))
            hours = start_sec // 3600
            minutes = (start_sec % 3600) // 60
            seconds = start_sec % 60
            timestamp_str = f"[{hours:02d}:{minutes:02d}:{seconds:02d}]"
            
            text = seg.get("text", "").strip()
            formatted_segments.append({
                "timestamp": timestamp_str,
                "text": text
            })
            formatted_transcript_lines.append(f"{timestamp_str} {text}")

        formatted_transcript = "\n".join(formatted_transcript_lines)
        
        return {
            "transcript": formatted_transcript or full_text,
            "raw_text": full_text,
            "segments": formatted_segments
        }

    async def process_lecture_audio(self, input_path: str, progress_callback = None) -> Dict[str, Any]:
        """Runs the E2E audio pipeline: denoise -> transcribe -> postprocess."""
        try:
            if progress_callback:
                await progress_callback("denoise", 10)
            
            # Step 1: Denoise
            # Run blocking task in executor
            loop = asyncio.get_event_loop()
            denoised_path = await loop.run_in_executor(None, self.denoise_audio, input_path)
            
            if progress_callback:
                await progress_callback("transcribe", 40)
            
            # Step 2: Transcribe
            transcription_result = await loop.run_in_executor(None, self.transcribe_audio, denoised_path)
            
            # Cleanup denoised audio file
            try:
                os.remove(denoised_path)
            except Exception:
                pass
                
            if progress_callback:
                await progress_callback("audio_done", 100)
                
            return transcription_result
        except Exception as e:
            logger.error(f"Error in AudioProcessor pipeline: {e}")
            raise
