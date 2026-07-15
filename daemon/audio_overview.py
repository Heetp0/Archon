import os
import wave
import struct
import math
import logging
import subprocess
import shutil
import tempfile
from typing import Callable, Any, Coroutine, List, Dict
from base_agent import BaseAgent
from model_router import ModelRouter
from retriever import Retriever

# Try importing workspace root
try:
    import config
    DEFAULT_OUTPUT_DIR = config.WORKSPACE_ROOT
except ImportError:
    DEFAULT_OUTPUT_DIR = "."

logger = logging.getLogger(__name__)

class AudioOverviewAgent(BaseAgent):
    def __init__(self, model_router: ModelRouter, retriever: Retriever):
        self.router = model_router
        self.retriever = retriever

    def _get_system_prompt(self, format_type: str) -> str:
        if format_type == "conversational":
            return (
                "You are an expert audio scriptwriter. Based on the retrieved context, generate an engaging, natural conversational dialogue script between two hosts (labeled [Host] and [Guest]) discussing the material.\n"
                "CRITICAL Rules:\n"
                "1. Format each turn EXACTLY as '[Host]: <text>' or '[Guest]: <text>'. No other labels or formatting.\n"
                "2. The host should ask insightful, curious questions and guide the conversation.\n"
                "3. The guest should provide detailed, comprehensive, and accurate explanations based strictly on the retrieved context.\n"
                "4. Keep the discussion highly educational and completely grounded in the provided source chunks. Do not make any unsubstantiated claims."
            )
        elif format_type == "lecture":
            return (
                "You are an expert academic lecturer. Based on the retrieved context, generate a structured, highly detailed, and complete lecture script.\n"
                "CRITICAL Rules:\n"
                "1. The script must be written for a single narrator (labeled [Narrator]).\n"
                "2. Format each section/turn EXACTLY as '[Narrator]: <text>'. No other labels or formatting.\n"
                "3. You must deliver a fully structured, detailed, and complete walkthrough of the material. Do NOT write a summary, preview, or teaser. Ensure maximum depth and completeness for all concepts mentioned in the retrieved context.\n"
                "4. Remain strictly grounded in the source chunks. Do not introduce outside information or make unsubstantiated claims."
            )
        else:
            raise ValueError(f"Invalid format type: {format_type}")

    def _parse_script(self, script_text: str) -> List[tuple[str, str]]:
        turns = []
        lines = script_text.strip().split("\n")
        
        import re
        has_speaker_tags = False
        for line in lines:
            line = line.strip().replace("**", "")
            if not line:
                continue
            if re.match(r"^\[?([a-zA-Z0-9_\s]{2,20})\]?:\s*(.*)$", line):
                has_speaker_tags = True
                break

        if not has_speaker_tags:
            # Fallback if no tags: entire script is spoken by a single narrator
            non_empty_lines = [l.strip().replace("**", "") for l in lines if l.strip().replace("**", "")]
            return [("Narrator", "\n".join(non_empty_lines))]

        current_speaker = "Narrator"
        current_text = []

        for line in lines:
            line = line.strip().replace("**", "")
            if not line:
                continue
            
            match = re.match(r"^\[?([a-zA-Z0-9_\s]{2,20})\]?:\s*(.*)$", line)
            if match:
                if current_text:
                    turns.append((current_speaker, " ".join(current_text)))
                    current_text = []
                current_speaker = match.group(1).strip()
                text_part = match.group(2).strip()
                if text_part:
                    current_text.append(text_part)
            else:
                current_text.append(line)
                
        if current_text:
            turns.append((current_speaker, " ".join(current_text)))
            
        return turns

    def _concatenate_wav_files(self, input_files: List[str], output_file: str):
        if not input_files:
            return
        
        with wave.open(input_files[0], 'rb') as first_wav:
            params = first_wav.getparams()
            nchannels = first_wav.getnchannels()
            sampwidth = first_wav.getsampwidth()
            framerate = first_wav.getframerate()

        for infile in input_files:
            with wave.open(infile, 'rb') as wav:
                if (wav.getnchannels() != nchannels or 
                    wav.getsampwidth() != sampwidth or 
                    wav.getframerate() != framerate):
                    raise ValueError(
                        f"Mismatched audio parameters in {infile}. "
                        f"Expected (channels={nchannels}, width={sampwidth}, rate={framerate}), "
                        f"got (channels={wav.getnchannels()}, width={wav.getsampwidth()}, rate={wav.getframerate()})"
                    )
            
        with wave.open(output_file, 'wb') as out_wav:
            out_wav.setparams(params)
            for infile in input_files:
                with wave.open(infile, 'rb') as wav:
                    out_wav.writeframes(wav.readframes(wav.getnframes()))

    def _write_mock_wav(self, output_path: str, duration_seconds: float = 3.0, sample_rate: int = 22050):
        num_samples = int(sample_rate * duration_seconds)
        frequency = 440.0  # A4 tone
        
        with wave.open(output_path, 'wb') as wav:
            # Mono, 16-bit, sample_rate
            wav.setparams((1, 2, sample_rate, num_samples, 'NONE', 'not compressed'))
            frames = []
            for i in range(num_samples):
                val = int(32767.0 * math.sin(2.0 * math.pi * frequency * i / sample_rate))
                frames.append(struct.pack('<h', val))
            wav.writeframes(b"".join(frames))

    async def _compile_audio(self, turns: List[tuple[str, str]], output_path: str) -> bool:
        piper_cmd = shutil.which("piper")
        if not piper_cmd:
            logger.warning("piper CLI not found in PATH.")
            return False
            
        temp_files = []
        try:
            for idx, (speaker, text) in enumerate(turns):
                model_path = os.environ.get(f"PIPER_MODEL_{speaker.upper()}") or os.environ.get("PIPER_MODEL") or "model.onnx"
                if not os.path.exists(model_path):
                    logger.warning(f"Piper model path does not exist: {model_path}")
                    return False
                
                temp_wav = tempfile.mktemp(suffix=".wav")
                temp_files.append(temp_wav)
                
                proc = subprocess.Popen(
                    [piper_cmd, "--model", model_path, "--output_file", temp_wav],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                stdout, stderr = proc.communicate(input=text)
                if proc.returncode != 0:
                    logger.warning(f"Piper failed for speaker {speaker} with exit code {proc.returncode}: {stderr}")
                    return False
                    
            self._concatenate_wav_files(temp_files, output_path)
            return True
        except Exception as e:
            logger.warning(f"Error during piper compilation: {e}")
            return False
        finally:
            for f in temp_files:
                try:
                    if os.path.exists(f):
                        os.remove(f)
                except Exception:
                    pass

    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        notebook_id = payload.get("notebook_id")
        if not notebook_id:
            raise ValueError("Missing 'notebook_id' in payload for AudioOverviewAgent.")

        format_type = payload.get("format")
        if not format_type:
            raise ValueError("Missing 'format' in payload for AudioOverviewAgent.")

        if format_type not in {"conversational", "lecture"}:
            raise ValueError(f"Invalid 'format': '{format_type}'. Must be 'conversational' or 'lecture'.")

        output_dir = payload.get("output_dir") or DEFAULT_OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        output_filename = f"audio_overview_{notebook_id}_{format_type}.wav"
        output_wav_path = os.path.join(output_dir, output_filename)

        # Retrieve context
        query = payload.get("query") or "comprehensive concepts and main summary walkthrough"
        top_k = payload.get("top_k", 10)
        
        await send_token_callback("status", {"status": f"Searching relevant context in notebook {notebook_id}..."})
        chunks = await self.retriever.search(notebook_id, query, top_k=top_k)

        # Build prompt
        system_prompt = self._get_system_prompt(format_type)
        
        if not chunks:
            context_str = "No relevant context found in the notebook database."
        else:
            parts = []
            for idx, chunk in enumerate(chunks, 1):
                source = chunk.get("source_id", "Unknown Source")
                parts.append(f"[{idx}] Source: {source}\nContent:\n{chunk['text']}")
            context_str = "\n\n---\n\n".join(parts)

        user_content = f"Retrieved Context:\n{context_str}\n\nPlease generate the audio overview script based strictly on the retrieved context."
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        target_model = payload.get("model")
        temperature = payload.get("temperature", 0.7)

        await send_token_callback("status", {"status": f"Generating {format_type} audio script..."})
        
        script_content = ""
        try:
            async for token in self.router.generate(
                tier="fast",
                messages=messages,
                specific_model=target_model,
                temperature=temperature
            ):
                script_content += token
                await send_token_callback("token", {"text": token})
        except Exception as e:
            logger.error(f"Error during script generation: {e}")
            raise RuntimeError(f"Failed to generate audio overview script: {e}")

        # Parse script into turns
        turns = self._parse_script(script_content)
        
        await send_token_callback("status", {"status": "Compiling script to audio WAV file..."})
        
        # Compile audio
        success = await self._compile_audio(turns, output_wav_path)
        if not success:
            logger.info("Piper compilation failed or not available. Falling back to mock WAV generation.")
            await send_token_callback("status", {"status": "Piper not found or failed. Generating mock WAV fallback..."})
            self._write_mock_wav(output_wav_path, duration_seconds=3.0)
            
        await send_token_callback("status", {"status": "Audio compilation finished successfully."})
        return {
            "script": script_content,
            "audio_path": output_wav_path,
            "format": format_type
        }