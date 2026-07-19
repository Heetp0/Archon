import time
import logging
from typing import Callable, Any, Dict

logger = logging.getLogger("circuit_breaker")

class CircuitBreakerOpenException(Exception):
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout_sec: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.state = "CLOSED" # CLOSED, OPEN, HALF_OPEN
        self.failure_count = 0
        self.last_state_change = time.time()

    def record_success(self) -> None:
        self.failure_count = 0
        if self.state != "CLOSED":
            logger.info(f"Circuit breaker recovered. Moving state from {self.state} to CLOSED.")
            self.state = "CLOSED"
            self.last_state_change = time.time()

    def record_failure(self) -> None:
        self.failure_count += 1
        logger.warning(f"Recorded failure. Current failure count: {self.failure_count}/{self.failure_threshold}.")
        if self.failure_count >= self.failure_threshold and self.state != "OPEN":
            logger.error(f"Failure threshold reached. Tripping circuit breaker to OPEN state for {self.recovery_timeout_sec}s.")
            self.state = "OPEN"
            self.last_state_change = time.time()

    def check_state(self) -> None:
        """
        Verifies state. If OPEN and cooldown passed, transitions to HALF_OPEN to attempt a test request.
        If OPEN and cooldown not passed, raises CircuitBreakerOpenException.
        """
        now = time.time()
        if self.state == "OPEN":
            if now - self.last_state_change > self.recovery_timeout_sec:
                logger.info("Cooldown period ended. Moving circuit breaker to HALF_OPEN state.")
                self.state = "HALF_OPEN"
                self.last_state_change = now
            else:
                raise CircuitBreakerOpenException("Circuit breaker is currently OPEN. Request blocked.")

    async def call(self, func: Callable[..., Any], *args, **kwargs) -> Any:
        self.check_state()
        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise e

# Registry of circuit breakers for distinct services
circuit_breakers: Dict[str, CircuitBreaker] = {
    "myscript": CircuitBreaker(failure_threshold=5, recovery_timeout_sec=30.0),
    "llm_primary": CircuitBreaker(failure_threshold=3, recovery_timeout_sec=15.0),
    "lancedb": CircuitBreaker(failure_threshold=5, recovery_timeout_sec=10.0),
}
