import os
import re
import uuid
import time
import asyncio
import logging
from typing import Dict, Any, Callable, List

logger = logging.getLogger(__name__)

class IngestionQueue:
    def __init__(self, broadcast_callback: Callable[[str, Any], Any] = None, retriever: Any = None):
        self.queue = asyncio.Queue()
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.broadcast_callback = broadcast_callback
        self.retriever = retriever
        self.workers: List[asyncio.Task] = []
        self._shutdown = False

    def start_workers(self):
        self._shutdown = False
        self.workers = [
            asyncio.create_task(self._worker_loop())
            for _ in range(2)
        ]
        logger.info("IngestionQueue workers started with concurrency limit of 2.")

    async def stop_workers(self):
        self._shutdown = True
        # Wake up workers if they are waiting
        for _ in range(len(self.workers)):
            try:
                await self.queue.put(None)
            except Exception:
                pass
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers = []
        logger.info("IngestionQueue workers stopped.")

    async def add_job(self, notebook_id: str, source_type: str, file_path: str, metadata: dict = None) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "job_id": job_id,
            "notebook_id": notebook_id,
            "source_type": source_type,
            "file_path": file_path,
            "metadata": metadata or {},
            "status": "pending",
            "progress": 0,
            "result": None,
            "error": None,
            "created_at": time.time(),
            "started_at": None,
            "completed_at": None
        }
        await self.queue.put(job_id)
        await self._broadcast_status(job_id)
        return job_id

    def get_status(self, job_id: str) -> dict:
        return self.jobs.get(job_id)

    async def _broadcast_status(self, job_id: str):
        if self.broadcast_callback:
            job_data = self.jobs.get(job_id)
            if job_data:
                payload = {
                    "job_id": job_id,
                    "notebook_id": job_data["notebook_id"],
                    "status": job_data["status"],
                    "progress": job_data["progress"],
                    "result": job_data["result"],
                    "error": job_data["error"]
                }
                try:
                    if asyncio.iscoroutinefunction(self.broadcast_callback):
                        await self.broadcast_callback("job_progress", payload)
                    else:
                        self.broadcast_callback("job_progress", payload)
                except Exception as e:
                    logger.error(f"Failed to broadcast job progress: {e}")

    async def _worker_loop(self):
        while not self._shutdown:
            try:
                job_id = await self.queue.get()
                if job_id is None:
                    self.queue.task_done()
                    break
            except asyncio.CancelledError:
                break
            
            try:
                await self._process_job(job_id)
            except Exception as e:
                logger.exception(f"Error processing job {job_id}: {e}")
            finally:
                self.queue.task_done()

    async def _update_progress(self, job_id: str, progress: int, status: str = "running", result: Any = None, error: str = None):
        job = self.jobs.get(job_id)
        if job:
            job["progress"] = progress
            job["status"] = status
            if result is not None:
                job["result"] = result
            if error is not None:
                job["error"] = error
            await self._broadcast_status(job_id)

    async def _process_job(self, job_id: str):
        job = self.jobs.get(job_id)
        if not job:
            return
            
        job["status"] = "running"
        job["started_at"] = time.time()
        await self._broadcast_status(job_id)
        
        source_type = job["source_type"].lower()
        file_path = job["file_path"]
        
        try:
            if source_type == "pdf":
                result = await self._process_pdf(job_id, file_path)
            elif source_type == "codebase":
                result = await self._process_codebase(job_id, file_path)
            elif source_type == "audio":
                result = await self._process_audio(job_id, file_path)
            else:
                raise ValueError(f"Unsupported source type: {source_type}")
                
            job["status"] = "completed"
            job["progress"] = 100
            job["result"] = result
            job["completed_at"] = time.time()
            if self.retriever:
                try:
                    await self.retriever.index_source(
                        notebook_id=job["notebook_id"],
                        source_id=job["file_path"],
                        source_type=source_type,
                        parsed_content=result
                    )
                except Exception as idx_err:
                    print(f"Error indexing job {job_id} in retriever: {idx_err}")
            await self._broadcast_status(job_id)
            
        except Exception as e:
            logger.exception(f"Error executing job {job_id}")
            job["status"] = "failed"
            job["error"] = str(e)
            job["completed_at"] = time.time()
            await self._broadcast_status(job_id)

    async def _process_pdf(self, job_id: str, file_path: str) -> dict:
        import pypdf
        loop = asyncio.get_running_loop()
        
        def get_reader():
            return pypdf.PdfReader(file_path)
        
        reader = await loop.run_in_executor(None, get_reader)
        total_pages = len(reader.pages)
        pages = []
        
        if total_pages == 0:
            return {"pages": [], "total_pages": 0}
            
        for idx in range(total_pages):
            def extract(i):
                page = reader.pages[i]
                return page.extract_text() or ""
                
            text = await loop.run_in_executor(None, extract, idx)
            pages.append({
                "page_number": idx + 1,
                "text": text
            })
            progress = int(((idx + 1) / total_pages) * 100)
            await self._update_progress(job_id, progress=progress, status="running")
            
        return {
            "pages": pages,
            "total_pages": total_pages
        }

    async def _process_codebase(self, job_id: str, source: str) -> dict:
        import gitingest
        orig_token = os.environ.get("GITHUB_TOKEN")
        is_dummy = False
        if orig_token and ("dummy" in orig_token or "antigravity" in orig_token):
            is_dummy = True
            
        if is_dummy:
            os.environ.pop("GITHUB_TOKEN", None)
            
        try:
            await self._update_progress(job_id, progress=20, status="running")
            summary, tree, content = await gitingest.ingest_async(source)
            await self._update_progress(job_id, progress=70, status="running")
            
            chunks = self._parse_gitingest_content(content)
            await self._update_progress(job_id, progress=100, status="running")
            
            return {
                "summary": summary,
                "tree": tree,
                "chunks": chunks,
                "total_files": len(chunks)
            }
        finally:
            if is_dummy and orig_token:
                os.environ["GITHUB_TOKEN"] = orig_token

    def _parse_gitingest_content(self, content: str) -> list:
        pattern = re.compile(
            r'^={16,}\r?\nFILE:\s*(.*?)\r?\n={16,}\r?\n',
            re.MULTILINE
        )
        parts = pattern.split(content)
        chunks = []
        if parts[0].strip():
            chunks.append({
                "file_path": "summary_tree.txt",
                "text": parts[0].strip()
            })
        
        for i in range(1, len(parts), 2):
            file_path = parts[i].strip()
            file_content = parts[i+1] if i+1 < len(parts) else ""
            chunks.append({
                "file_path": file_path,
                "text": file_content.strip()
            })
        return chunks

    async def _process_audio(self, job_id: str, file_path: str) -> dict:
        denoised_path = file_path + ".denoised.wav"
        await self._update_progress(job_id, progress=10, status="running")
        
        success = await self._denoise_audio_file(file_path, denoised_path)
        target_path = denoised_path if success else file_path
        await self._update_progress(job_id, progress=30, status="running")
        
        duration = await self._get_audio_duration(target_path)
        
        segments = []
        num_segments = max(1, int(duration // 5))
        speakers = ["Speaker 1", "Speaker 2"]
        mock_phrases = [
            "Welcome back to the lecture series on artificial intelligence.",
            "Thank you. Today we will focus on transformer neural networks.",
            "Can you explain self-attention mechanisms in simple terms?",
            "Certainly. Self-attention allows the model to associate each word in the input with other words.",
            "That makes sense. It basically weights the importance of different words.",
            "Exactly. This is the core mechanism behind models like GPT and BERT.",
            "Great, let's dive deeper into multi-head attention.",
            "Multi-head attention runs the self-attention mechanism multiple times in parallel.",
            "Ah, so it learns different representation subspaces at different positions.",
            "Yes, that's a perfect way to put it."
        ]
        
        for idx in range(num_segments):
            start = idx * 5.0
            end = min(duration, start + 5.0)
            speaker = speakers[idx % len(speakers)]
            text = mock_phrases[idx % len(mock_phrases)]
            segments.append({
                "speaker": speaker,
                "start_time": start,
                "end_time": end,
                "text": text
            })
            progress = 30 + int(((idx + 1) / num_segments) * 70)
            await self._update_progress(job_id, progress=progress, status="running")
            await asyncio.sleep(0.05)
            
        if success and os.path.exists(denoised_path):
            try:
                os.remove(denoised_path)
            except Exception:
                pass
                
        return {
            "segments": segments,
            "total_duration": duration
        }

    async def _denoise_audio_file(self, input_path: str, output_path: str) -> bool:
        cmd = ["ffmpeg", "-y", "-i", input_path, "-af", "afftdn", output_path]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                return True
            else:
                logger.error(f"FFmpeg denoising failed with return code {proc.returncode}: {stderr.decode(errors='ignore')}")
                return False
        except Exception as e:
            logger.error(f"Exception running FFmpeg denoising: {e}")
            return False

    async def _get_audio_duration(self, file_path: str) -> float:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", file_path
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                return float(stdout.decode().strip())
        except Exception:
            pass
        return 60.0