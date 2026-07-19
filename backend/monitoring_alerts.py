import logging
from collections import deque
from typing import Dict, Any

logger = logging.getLogger("monitoring_alerts")

class AlertManager:
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.request_history = deque(maxlen=window_size)
        self.fallback_history = deque(maxlen=window_size)
        
        # Baselines targets for alerts (ms)
        self.latency_targets = {
            "semantic_search": 100.0,
            "chat_latency": 2000.0,
            "dashboard_load": 2000.0,
            "quiz_validation": 1000.0,
            "analytics_aggregation": 2000.0
        }

    def record_request(self, status_code: int, operation: str, elapsed_ms: float) -> None:
        is_error = status_code >= 400
        self.request_history.append((operation, is_error, elapsed_ms))
        
        # Check error rate in the current window
        self.check_error_rates(operation)
        self.check_latency_degradation(operation, elapsed_ms)

    def record_fallback(self, operation: str, fallback_engine: str) -> None:
        self.fallback_history.append((operation, fallback_engine))
        
        # Check fallback rate
        self.check_fallback_rates(operation)

    def check_error_rates(self, operation: str) -> None:
        ops_requests = [r for r in self.request_history if r[0] == operation]
        if len(ops_requests) >= 20: # Minimum sample size
            errors = sum(1 for r in ops_requests if r[1])
            error_rate = errors / len(ops_requests)
            if error_rate > 0.05:
                logger.critical(
                    f"CRITICAL ALERT: Error rate for '{operation}' is {error_rate*100:.1f}%, "
                    f"exceeding the safety threshold of 5.0%!"
                )

    def check_latency_degradation(self, operation: str, current_ms: float) -> None:
        target = self.latency_targets.get(operation)
        if target:
            ops_requests = [r for r in self.request_history if r[0] == operation]
            if len(ops_requests) >= 10:
                p95_latency = float(sorted([r[2] for r in ops_requests])[int(len(ops_requests) * 0.95)])
                if p95_latency > target * 1.2:
                    logger.warning(
                        f"ALERT: P95 Latency for '{operation}' is {p95_latency:.1f}ms, "
                        f"degraded > 20% above the target of {target:.1f}ms!"
                    )

    def check_fallback_rates(self, operation: str) -> None:
        ops_fallbacks = [f for f in self.fallback_history if f[0] == operation]
        ops_requests = [r for r in self.request_history if r[0] == operation]
        
        if len(ops_requests) >= 20:
            fallback_ratio = len(ops_fallbacks) / len(ops_requests)
            if fallback_ratio > 0.50:
                logger.critical(
                    f"CRITICAL ALERT: Fallbacks triggered for '{operation}' in {fallback_ratio*100:.1f}% "
                    f"of cases, exceeding the threshold of 50.0%!"
                )

# Global alert manager instance
alert_manager = AlertManager()
