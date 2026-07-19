from abc import ABC, abstractmethod
from typing import Callable, Any, Coroutine

class BaseAgent(ABC):
    @abstractmethod
    async def run(self, payload: dict, send_token_callback: Callable[[str, Any], Coroutine[Any, Any, None]]) -> dict:
        """
        Runs the agent engine.
        payload: The request payload from the frontend.
        send_token_callback: Async callback function to stream events/tokens back:
                             await send_token_callback(event_type, payload_data)
        Returns the final dictionary.
        """
        pass
