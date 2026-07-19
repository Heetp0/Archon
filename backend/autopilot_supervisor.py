import time
from typing import Dict, List, Any

class AutopilotSupervisor:
    def __init__(self, file_budget_mb: float = 50.0, token_budget: int = 50000):
        self.file_budget_bytes = file_budget_mb * 1024 * 1024
        self.token_budget = token_budget
        self.reset()

    def reset(self):
        self.heartbeats: Dict[str, float] = {}
        self.action_history: Dict[str, List[str]] = {}
        self.total_write_bytes: int = 0
        self.total_tokens: float = 0.0
        self.halted: bool = False
        self.halt_reason: str = ''

    def ping(self, agent_name: str):
        """Update heartbeat timestamp for a given agent."""
        self.heartbeats[agent_name] = time.time()

    def check_heartbeat(self, agent_name: str, max_gap: float = 30.0) -> bool:
        """Return False if agent has timed out since last heartbeat."""
        if agent_name not in self.heartbeats:
            return False
        gap = time.time() - self.heartbeats[agent_name]
        if gap > max_gap:
            self.halted = True
            self.halt_reason = f'Agent {agent_name} missed heartbeat check (gap: {gap:.1f}s)'
            return False
        return True

    def log_action(self, agent_name: str, action: str) -> bool:
        """Log action, check if same action has been repeated > 5 times consecutively."""
        if agent_name not in self.action_history:
            self.action_history[agent_name] = []
        
        history = self.action_history[agent_name]
        history.append(action)
        
        # Maintain window size
        if len(history) > 10:
            history.pop(0)
            
        # Check for consecutive loops
        if len(history) >= 6:
            last_6 = history[-6:]
            if len(set(last_6)) == 1:
                self.halted = True
                self.halt_reason = f'Infinite execution loop detected for agent {agent_name}: repeated "{action}"'
                return False
        return True

    def add_write_volume(self, bytes_count: int) -> bool:
        """Add bytes to write budget. Halt if budget exceeded."""
        self.total_write_bytes += bytes_count
        if self.total_write_bytes > self.file_budget_bytes:
            self.halted = True
            self.halt_reason = f'File write budget exceeded: {self.total_write_bytes / 1024 / 1024:.1f}MB / {self.file_budget_bytes / 1024 / 1024:.1f}MB'
            return False
        return True

    def add_tokens(self, token_count: float) -> bool:
        """Add tokens to budget. Halt if budget exceeded."""
        self.total_tokens += token_count
        if self.total_tokens > self.token_budget:
            self.halted = True
            self.halt_reason = f'Token budget exceeded: {int(self.total_tokens)} / {self.token_budget}'
            return False
        return True

    def is_halted(self) -> tuple[bool, str]:
        return self.halted, self.halt_reason