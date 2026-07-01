from typing import Optional
import os
import re
import asyncio
import sys
sys.path.append(os.path.dirname(__file__))
import config
from ecc_bridge import ECCBridge

class SecureShellRunner:
    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = os.path.abspath(workspace_root or config.WORKSPACE_ROOT)
        ecc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ecc'))
        self.ecc = ECCBridge(ecc_path)

    def is_path_safe(self, path: str, cwd: str) -> bool:
        """Verify that path is inside the allowed workspace_root sandbox."""
        resolved = os.path.abspath(os.path.join(cwd, path))
        # Check if drives are different on Windows
        root_drive, _ = os.path.splitdrive(self.workspace_root)
        res_drive, _ = os.path.splitdrive(resolved)
        if root_drive.lower() != res_drive.lower():
            return False
        try:
            common = os.path.commonpath([self.workspace_root, resolved])
            return common == self.workspace_root
        except ValueError:
            return False

    def check_sandbox(self, command: str, cwd: str) -> tuple[bool, str]:
        """Extract and verify paths in command, blocking directory escapes."""
        # Check if cwd is inside the workspace
        if not self.is_path_safe(".", cwd):
            return False, f'Current working directory outside sandbox blocked: {cwd}'

        # Find potential path patterns (Windows drive letters or absolute/relative paths)
        # Look for patterns like C:\path or D:\path or ..\ or ../
        if '..' in command:
            # Basic traversal check
            resolved_cwd = os.path.abspath(cwd)
            # Check if traversing up goes outside sandbox
            # We can extract relative path elements
            parts = re.findall(r'(\.\.(?:[\\/][^\s"\']*)?)', command)
            for p in parts:
                if not self.is_path_safe(p, cwd):
                    return False, f'Directory traversal escape blocked: {p}'
        
        # Check for absolute windows paths and root-relative paths
        abs_paths = re.findall(r'([a-zA-Z]:[\\/][^\s"\']*|\\[^\s"\']*)', command)
        for path in abs_paths:
            if not self.is_path_safe(path, cwd):
                return False, f'Access to absolute path outside sandbox blocked: {path}'
                
        # Block environment variables that might expand to paths outside sandbox
        if '$env:' in command or '%' in command:
            return False, 'Environment variable expansion in paths is blocked for sandbox safety'
                
        return True, 'Passed sandbox check'

    async def run(self, command: str, cwd: str) -> dict:
        """Scan command via AgentShield + Sandbox checks, and execute securely."""
        # 1. Sandbox checks
        sandbox_ok, reason = self.check_sandbox(command, cwd)
        if not sandbox_ok:
            return {
                'success': False,
                'safe': False,
                'risk': 'high',
                'details': reason,
                'stdout': '',
                'stderr': reason
            }
            
        # 2. AgentShield scan check
        scan = await self.ecc.run_agentshield(command)
        if not scan.get('safe', False):
            return {
                'success': False,
                'safe': False,
                'risk': scan.get('risk', 'high'),
                'details': f'AgentShield scan blocked command: {scan.get("details", "")}',
                'stdout': '',
                'stderr': f'Blocked by AgentShield: {scan.get("details", "")}'
            }
            
        # 3. Execute safely
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            return {
                'success': proc.returncode == 0,
                'safe': True,
                'risk': 'none',
                'details': 'Executed successfully',
                'stdout': stdout.decode(errors='ignore'),
                'stderr': stderr.decode(errors='ignore')
            }
        except Exception as e:
            return {
                'success': False,
                'safe': True,
                'risk': 'none',
                'details': f'Execution failed: {str(e)}',
                'stdout': '',
                'stderr': str(e)
            }