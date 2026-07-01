import subprocess
import asyncio
import os
import json

class VaultGraphService:
    def __init__(self, vault_path: str, output_dir: str):
        self.vault_path = vault_path
        self.output_dir = output_dir   # graphify-out/
        os.makedirs(self.output_dir, exist_ok=True)

    async def build_graph(self, update_only: bool = True):
        """Run graphify on the vault. --update mode only re-processes changed files."""
        # The command to execute graphifyy
        flag = '--update' if update_only else ''
        # Use 'graphify' or 'python -m graphify' depending on how it's installed
        cmd = f'graphify "{self.vault_path}" {flag} --output "{self.output_dir}"'
        
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE, 
                stderr=asyncio.subprocess.STDOUT
            )
            async for line in proc.stdout:
                yield line.decode()         # stream build progress
            await proc.wait()
        except Exception as e:
            yield f'Error executing Graphify: {str(e)}\n'

    def get_graph_json(self) -> dict:
        """Load graph.json for structural queries (node/edge traversal)."""
        path = os.path.join(self.output_dir, 'graph.json')
        if os.path.exists(path):
            try:
                with open(path, encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def get_insights(self) -> str:
        """Return GRAPH_REPORT.md content for the Dashboard insight card."""
        path = os.path.join(self.output_dir, 'GRAPH_REPORT.md')
        if os.path.exists(path):
            try:
                with open(path, encoding='utf-8') as f:
                    return f.read()
            except Exception:
                return ''
        return 'No report generated yet. Run graph build first.'