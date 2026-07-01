import logging
logger = logging.getLogger(__name__)

import os
import json
import asyncio

class ECCBridge:
    def __init__(self, ecc_path: str):
        self.ecc_path = ecc_path   # path to ecc/ directory

    def list_skills(self) -> list[dict]:
        """Scan ecc/skills/ and return skill metadata list."""
        skills = []
        skills_dir = os.path.join(self.ecc_path, 'skills')
        if os.path.isdir(skills_dir):
            for name in os.listdir(skills_dir):
                md_path = os.path.join(skills_dir, name, 'SKILL.md')
                if os.path.exists(md_path):
                    skills.append({'name': name, 'path': md_path})
        return skills

    def get_rules(self, language: str) -> str:
        """Load language-specific rules (e.g. 'python' -> ecc/rules/python/)."""
        rules_dir = os.path.join(self.ecc_path, 'rules', language)
        content = []
        if os.path.isdir(rules_dir):
            for f in os.listdir(rules_dir):
                filepath = os.path.join(rules_dir, f)
                if os.path.isfile(filepath):
                    try:
                        with open(filepath, encoding='utf-8') as fp:
                            content.append(fp.read())
                    except Exception as e:
                        logger.warning(f"Handled exception: {e}")
        return '\n\n'.join(content)

    async def run_agentshield(self, command: str) -> dict:
        """Run AgentShield security scan on a proposed shell command before execution."""
        # AgentShield CLI installed via: npm install -g ecc-agentshield
        try:
            proc = await asyncio.create_subprocess_shell(
                f'npx ecc-agentshield scan "{command}"',
                stdout=asyncio.subprocess.PIPE, 
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                try:
                    result = json.loads(stdout.decode())
                    return {
                        'safe': result.get('safe', False),
                        'risk': result.get('risk', 'unknown'),
                        'details': result.get('details', '')
                    }
                except Exception as e:
                    logger.warning(f"Handled exception: {e}")
            # Fallback to standard check if npm package fails/not found
            return self._local_heuristic_scan(command)
        except Exception:
            return self._local_heuristic_scan(command)

    def _local_heuristic_scan(self, command: str) -> dict:
        # Fallback simple scan to ensure we always have security scans
        blocked_keywords = ['rm -rf', 'format c:', 'del /f /s /q', 'mkfs', 'drop database', 'drop table']
        command_lower = command.lower()
        for keyword in blocked_keywords:
            if keyword in command_lower:
                return {
                    'safe': False,
                    'risk': 'high',
                    'details': f'Command blocked by local heuristics (matches: {keyword})'
                }
        return {
            'safe': True,
            'risk': 'none',
            'details': 'Passed local security heuristics'
        }