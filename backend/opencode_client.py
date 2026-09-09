import os
import sys
import asyncio
import logging
from typing import AsyncGenerator, Optional

logger = logging.getLogger("opencode_client")

class OpenCodeClient:
    def __init__(self, workspace_root: Optional[str] = None):
        if workspace_root:
            self.workspace_root = workspace_root
        else:
            try:
                import config
                self.workspace_root = config.WORKSPACE_ROOT
            except ImportError:
                self.workspace_root = r"D:\The core"

    async def execute_task(self, prompt: str, subproject_path: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Executes a coding/refactoring task using the OpenCode CLI.
        Streams stdout/stderr back line-by-line.
        """
        target_dir = os.path.abspath(self.workspace_root)
        if subproject_path:
            resolved = os.path.abspath(os.path.join(self.workspace_root, subproject_path))
            if not resolved.startswith(target_dir):
                raise ValueError(f"Security error: path '{subproject_path}' traverses outside workspace root.")
            target_dir = resolved

        # On Windows, opencode is installed as a npm ps1 script, so running via powershell is robust
        safe_prompt = prompt.replace('"', '\\"')
        if sys.platform == "win32":
            cmd = f'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "opencode run \"{safe_prompt}\""'
        else:
            cmd = f'opencode run "{safe_prompt}"'

        logger.info(f"Running OpenCode task: {prompt} in {target_dir}")

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                cwd=target_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )

            # Read stdout line-by-line with timeout to prevent silent hangs
            try:
                while True:
                    # Timeout if no output for 60 seconds
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=60.0)
                    if not line:
                        break
                    yield line.decode(errors="ignore")
                
                # Wait for process to exit, with overall timeout
                await asyncio.wait_for(process.wait(), timeout=10.0)
            except asyncio.TimeoutError:
                logger.error("OpenCode task timed out.")
                try:
                    process.kill()
                except Exception:
                    pass
                yield "\n[ERROR] OpenCode execution timed out and was killed.\n"
            if process.returncode != 0:
                logger.error(f"OpenCode task failed with exit code: {process.returncode}")
                yield f"\n[ERROR] OpenCode exited with code {process.returncode}\n"

        except Exception as e:
            logger.error(f"Failed to execute OpenCode command: {str(e)}")
            yield f"\n[ERROR] Execution failed: {str(e)}\n"
