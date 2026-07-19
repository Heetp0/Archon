"""
test_performance.py — Phase 9 regression benchmarks.
Run: pytest daemon/tests/test_performance.py -v
"""
import time
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from caching_layer import SemanticCache

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _elapsed(fn, *args, **kwargs):
    """Return (result, seconds_elapsed) for a sync call."""
    t0 = time.perf_counter()
    r = fn(*args, **kwargs)
    return r, time.perf_counter() - t0


async def _async_elapsed(coro):
    """Return (result, seconds_elapsed) for an awaitable."""
    t0 = time.perf_counter()
    r = await coro
    return r, time.perf_counter() - t0


# ─────────────────────────────────────────────────────────────
# 1. Cache: cold-miss vs warm-hit latency
# ─────────────────────────────────────────────────────────────

class TestCachePerformance:
    """SemanticCache should serve warm hits in < 5 ms."""

    @pytest.fixture(autouse=True)
    def cache(self):
        self.cache = SemanticCache(max_size=100, ttl_seconds=60)

    def test_warm_hit_is_fast(self):
        key = "What is the lift equation?"
        value = "L = C_L * 0.5 * rho * V^2 * S"

        # Warm the cache
        self.cache.put(key, value)

        # Measure warm hit
        _, elapsed = _elapsed(self.cache.get, key)
        assert elapsed < 0.005, (
            f"Warm cache hit took {elapsed*1000:.2f}ms — should be < 5ms"
        )

    def test_cold_miss_returns_none(self):
        result = self.cache.get("non-existent-query-xyz")
        assert result is None

    def test_cache_evicts_on_ttl(self):
        import time
        tiny_ttl = SemanticCache(max_size=10, ttl_seconds=0.01)
        tiny_ttl.put("key", "value")
        time.sleep(0.05)
        assert tiny_ttl.get("key") is None


# ─────────────────────────────────────────────────────────────
# 2. Auth: JWT encode/decode throughput
# ─────────────────────────────────────────────────────────────

class TestAuthPerformance:
    """JWT round-trip should complete in < 50 ms."""

    def test_jwt_roundtrip_latency(self):
        from auth_service import AuthService
        svc = AuthService(secret="test_secret_key_32_bytes_minimum!!")

        user_data = {"user_id": "perf-test-user", "username": "perf"}
        token = svc.create_access_token(user_data)

        _, elapsed = _elapsed(svc.verify_token, token)
        assert elapsed < 0.05, (
            f"JWT verify took {elapsed*1000:.2f}ms — should be < 50ms"
        )

    def test_jwt_throughput_100_ops(self):
        from auth_service import AuthService
        svc = AuthService(secret="test_secret_key_32_bytes_minimum!!")

        t0 = time.perf_counter()
        for i in range(100):
            token = svc.create_access_token({"user_id": f"u{i}", "username": f"user{i}"})
            svc.verify_token(token)
        elapsed = time.perf_counter() - t0

        assert elapsed < 2.0, (
            f"100 JWT round-trips took {elapsed:.2f}s — should be < 2s"
        )


# ─────────────────────────────────────────────────────────────
# 3. Circuit Breaker: state transition timing
# ─────────────────────────────────────────────────────────────

class TestCircuitBreakerPerformance:
    """Circuit breaker overhead must not exceed 1 ms per call."""

    @pytest.fixture(autouse=True)
    def breaker(self):
        from circuit_breaker import CircuitBreaker
        self.cb = CircuitBreaker(failure_threshold=5, recovery_timeout=1.0)

    def test_closed_state_overhead(self):
        """Overhead in closed state should be negligible."""
        call_count = [0]

        def fast_fn():
            call_count[0] += 1
            return "ok"

        t0 = time.perf_counter()
        for _ in range(1000):
            self.cb.call(fast_fn)
        elapsed = time.perf_counter() - t0

        assert elapsed < 0.1, (
            f"1000 CB calls in closed state took {elapsed*1000:.0f}ms — expected < 100ms"
        )
        assert call_count[0] == 1000


# ─────────────────────────────────────────────────────────────
# 4. Backup: snapshot creation for small data directory
# ─────────────────────────────────────────────────────────────

class TestBackupPerformance:
    """Backup of an empty data dir should complete in < 2s."""

    def test_backup_empty_dir_completes_fast(self, tmp_path):
        from backup_scheduler import BackupScheduler
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "placeholder.txt").write_text("archon test data")

        backup_dir = tmp_path / "backups"
        backup_dir.mkdir()

        sched = BackupScheduler(
            data_dir=str(data_dir),
            backup_dir=str(backup_dir),
            retention_days=1,
        )

        _, elapsed = _elapsed(sched.run_backup)
        assert elapsed < 2.0, (
            f"Backup of tiny dir took {elapsed:.2f}s — should be < 2s"
        )


# ─────────────────────────────────────────────────────────────
# 5. Quota Enforcer: check overhead
# ─────────────────────────────────────────────────────────────

class TestQuotaEnforcerPerformance:
    """Quota check should be sub-millisecond."""

    def test_quota_check_latency(self):
        from quota_enforcer import QuotaEnforcer
        qe = QuotaEnforcer(storage_limit_mb=1024, query_limit_per_hour=1000)

        _, elapsed = _elapsed(qe.check_query_quota, "test_user")
        assert elapsed < 0.001, (
            f"Quota check took {elapsed*1000:.2f}ms — should be < 1ms"
        )
